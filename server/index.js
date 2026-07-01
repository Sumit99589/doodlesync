import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { encoding, decoding, map } from 'lib0';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';

import { initDb } from './db.js';
import { joinRoom, verifyToken, getRoomById, deleteRoom } from './rooms.js';
import {
  getOrCreateRoom,
  addConnection,
  removeConnection,
  flushAll,
} from './persistence.js';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// ─── REST API ──────────────────────────────────────────────────────

app.post('/api/rooms/join', async (req, res) => {
  try {
    const { roomName, password, action } = req.body;
    if (!roomName || !password) {
      return res.status(400).json({ error: 'roomName and password are required' });
    }
    const result = await joinRoom(roomName, password, action);
    res.json(result);
  } catch (err) {
    if (
      err.message === 'Wrong password for this room' ||
      err.message === 'Room already exists' ||
      err.message === 'Room does not exist'
    ) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[api] join error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }
    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded || decoded.roomId !== req.params.roomId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const room = await getRoomById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    console.error('[api] room fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/rooms/:roomId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }
    const decoded = verifyToken(authHeader.slice(7));
    console.log('[DELETE] decoded:', decoded, 'params roomId:', req.params.roomId);
    if (!decoded || decoded.roomId !== req.params.roomId) {
      console.log('[DELETE] Verification failed:', !decoded ? 'no decoded' : `roomId mismatch: ${decoded.roomId} !== ${req.params.roomId}`);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const roomId = req.params.roomId;

    // Delete room from activeRooms map and close any active websocket connections
    const activeRooms = getActiveRooms();
    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);
      if (room.saveTimer) {
        clearTimeout(room.saveTimer);
      }
      for (const ws of room.conns) {
        ws.close(4000, 'Room deleted');
      }
      room.ydoc.destroy();
      activeRooms.delete(roomId);
    }

    // Delete from DB
    await deleteRoom(roomId);

    console.log(`[persistence] Room ${roomId} permanently deleted`);
    res.json({ success: true });
  } catch (err) {
    console.error('[api] room delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─── HTTP + WebSocket Server ───────────────────────────────────────

const server = http.createServer(app);

// Message types for the Yjs WebSocket protocol
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/collab') {
    const roomId = url.searchParams.get('room');
    const token = url.searchParams.get('token');

    if (!roomId || !token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.roomId !== roomId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.roomId = roomId;
      wss.emit('connection', ws, request);
    });
  } else {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
  }
});

wss.on('connection', async (ws) => {
  const roomId = ws.roomId;

  let room;
  try {
    room = await getOrCreateRoom(roomId);
  } catch (err) {
    console.error(`[ws] Failed to load room ${roomId}:`, err);
    ws.close();
    return;
  }

  addConnection(roomId, ws);

  const ydoc = room.ydoc;

  // Lazily bind document update broadcast to all other connections in this room
  if (!room.isSyncBound) {
    room.isSyncBound = true;
    room.ydoc.on('update', (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const msg = encoding.toUint8Array(encoder);

      for (const conn of room.conns) {
        if (conn !== origin && conn.readyState === 1) {
          conn.send(msg);
        }
      }
    });
  }

  // Lazily create awareness for the room
  if (!room.awareness) {
    room.awareness = new awarenessProtocol.Awareness(ydoc);
    room.awareness.on('update', ({ added, updated, removed }) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, changedClients)
      );
      const msg = encoding.toUint8Array(encoder);
      broadcastToRoom(roomId, msg, null);
    });
  }

  // Send sync step 1
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder, ydoc);
    ws.send(encoding.toUint8Array(encoder));
  }

  // Send current awareness state
  {
    const awarenessStates = room.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      ws.send(encoding.toUint8Array(encoder));
    }
  }

  ws.on('message', (data) => {
    try {
      const message = new Uint8Array(data);
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MSG_SYNC: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MSG_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, ydoc, ws);
          if (encoding.length(encoder) > 1) {
            ws.send(encoding.toUint8Array(encoder));
          }
          break;
        }
        case MSG_AWARENESS: {
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);
          break;
        }
      }
    } catch (err) {
      console.error('[ws] message error:', err);
    }
  });

  ws.on('close', () => {
    if (room.awareness) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        [ydoc.clientID],
        null
      );
    }
    removeConnection(roomId, ws);
  });
});

function broadcastToRoom(roomId, message, excludeWs) {
  const room = activeRoomsRef();
  const entry = room.get(roomId);
  if (!entry) return;
  for (const conn of entry.conns) {
    if (conn !== excludeWs && conn.readyState === 1) {
      conn.send(message);
    }
  }
}

// Import getter for the active rooms map
import { getActiveRooms } from './persistence.js';
function activeRoomsRef() {
  return getActiveRooms();
}

// ─── Graceful Shutdown ─────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[server] Received ${signal}. Flushing all rooms to DB...`);
  try {
    await flushAll();
  } catch (err) {
    console.error('[server] Error flushing rooms:', err);
  }
  console.log('[server] Shutdown complete.');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Start ─────────────────────────────────────────────────────────

async function main() {
  await initDb();
  server.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
    console.log(`[server] CORS origin: ${CLIENT_URL}`);
    console.log(`[server] WebSocket endpoint: ws://localhost:${PORT}/collab`);
  });
}

main().catch((err) => {
  console.error('[server] Fatal error:', err);
  process.exit(1);
});
