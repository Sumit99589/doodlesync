import * as Y from 'yjs';
import { encoding, decoding } from 'lib0';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import { getCursorColor } from '../constants';
import useRoomStore from '../store/roomStore';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

let ydoc = null;
let awareness = null;
let ws = null;
let elementsArray = null;
let undoManager = null;
let reconnectTimer = null;
export let yChatMessages = null;

const RECONNECT_DELAY = 2000;

/**
 * Initialize the Yjs document and WebSocket connection.
 */
export function initYjs(roomId, token, userState) {
  if (ydoc) {
    destroyYjs();
  }

  ydoc = new Y.Doc();
  elementsArray = ydoc.getArray('elements');
  yChatMessages = ydoc.getArray('chat');
  awareness = new awarenessProtocol.Awareness(ydoc);

  // Set up undo manager tracking the elements array
  undoManager = new Y.UndoManager(elementsArray, {
    trackedOrigins: new Set([null, ydoc.clientID]),
  });

  // Set local awareness state
  awareness.setLocalState({
    user: {
      name: userState.name,
      color: getCursorColor(ydoc.clientID),
      sessionId: userState.sessionId,
    },
    cursor: null,
  });

  // Connect WebSocket
  connectWs(roomId, token);

  return { ydoc, elementsArray, awareness, undoManager };
}

/**
 * Connect the WebSocket to the collab endpoint.
 */
function connectWs(roomId, token) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const url = `${protocol}//${host}/collab?room=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}`;

  ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    console.log('[yjs] WebSocket connected');

    // Send Sync Step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder, ydoc);
    ws.send(encoding.toUint8Array(encoder));

    // Re-broadcast awareness on reconnection
    if (awareness.getLocalState()) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, [ydoc.clientID])
      );
      ws.send(encoding.toUint8Array(awarenessEncoder));
    }
  };

  ws.onmessage = (event) => {
    const data = new Uint8Array(event.data);
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MSG_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, ydoc, 'remote');
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder));
        }
        break;
      }
      case MSG_AWARENESS: {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(awareness, update, null);
        break;
      }
    }
  };

  ws.onclose = (event) => {
    if (event.code === 4000) {
      console.log('[yjs] Room was deleted by owner. Kicking...');
      useRoomStore.getState().leaveRoom();
      return;
    }
    console.log('[yjs] WebSocket disconnected, reconnecting...');
    scheduleReconnect(roomId, token);
  };

  ws.onerror = (err) => {
    console.error('[yjs] WebSocket error:', err);
    ws.close();
  };

  // Listen for local Yjs updates and send to server
  ydoc.on('update', (update, origin) => {
    if (origin !== 'remote' && ws && ws.readyState === WebSocket.OPEN) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      ws.send(encoding.toUint8Array(encoder));
    }
  });

  // Listen for awareness updates and send to server
  awareness.on('update', ({ added, updated, removed }) => {
    const changedClients = added.concat(updated, removed);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      ws.send(encoding.toUint8Array(encoder));
    }
  });
}

function scheduleReconnect(roomId, token) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (ws?.readyState === WebSocket.CLOSED || ws?.readyState === undefined) {
      connectWs(roomId, token);
    }
  }, RECONNECT_DELAY);
}

/**
 * Update the local cursor position in awareness.
 */
export function updateCursor(x, y) {
  if (!awareness) return;
  const state = awareness.getLocalState();
  awareness.setLocalStateField('cursor', { x, y });
}

/**
 * Get current elements from the shared array.
 */
export function getElements() {
  if (!elementsArray) return [];
  return elementsArray.toArray();
}

/**
 * Get the shared Y.Array reference.
 */
export function getElementsArray() {
  return elementsArray;
}

/**
 * Get the shared chat Y.Array reference.
 */
export function getChatArray() {
  return yChatMessages;
}

/**
 * Get the awareness instance.
 */
export function getAwareness() {
  return awareness;
}

/**
 * Get the undo manager.
 */
export function getUndoManager() {
  return undoManager;
}

/**
 * Get the Y.Doc instance.
 */
export function getYDoc() {
  return ydoc;
}

/**
 * Clean up everything.
 */
export function destroyYjs() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null; // Prevent reconnect on intentional close
    ws.close();
    ws = null;
  }
  if (awareness) {
    awareness.destroy();
    awareness = null;
  }
  if (undoManager) {
    undoManager.destroy();
    undoManager = null;
  }
  if (ydoc) {
    ydoc.destroy();
    ydoc = null;
  }
  elementsArray = null;
  yChatMessages = null;
}
