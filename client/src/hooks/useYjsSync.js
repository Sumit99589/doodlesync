import { useEffect, useRef } from 'react';
import useCanvasStore from '../store/canvasStore';
import useRoomStore from '../store/roomStore';
import {
  initYjs,
  destroyYjs,
} from '../lib/yjs';

/**
 * Custom hook that bridges Yjs shared state ↔ Zustand stores.
 * - Observes the Y.Array and syncs element changes into canvasStore.
 * - Observes awareness and syncs connected users into roomStore.
 * - Tracks undo/redo availability.
 */
export function useYjsSync() {
  const { roomId, token, userName, sessionId, showToast } = useRoomStore();
  const setElements = useCanvasStore((s) => s.setElements);
  const setCanUndo = useCanvasStore((s) => s.setCanUndo);
  const setCanRedo = useCanvasStore((s) => s.setCanRedo);
  const setConnectedUsers = useRoomStore((s) => s.setConnectedUsers);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!roomId || !token || initializedRef.current) return;
    initializedRef.current = true;

    // Initialize Yjs
    const { elementsArray, awareness, undoManager } = initYjs(roomId, token, {
      name: userName,
      sessionId,
    });

    // Sync elements → Zustand on every Y.Array change
    const syncElements = () => {
      setElements(elementsArray.toArray());
    };

    elementsArray.observe(syncElements);

    // Initial sync
    syncElements();

    let previousUsers = [];

    // Sync awareness → Zustand (connected users)
    const syncAwareness = () => {
      const states = awareness.getStates();
      const users = [];
      states.forEach((state, clientId) => {
        if (state?.user) {
          users.push({
            clientId,
            ...state.user,
            cursor: state.cursor,
          });
        }
      });

      if (previousUsers.length > 0) {
        for (const prev of previousUsers) {
          if (prev.sessionId !== sessionId && !users.some((u) => u.sessionId === prev.sessionId)) {
            showToast(`${prev.name} left the room`, 'info');
          }
        }
      }

      previousUsers = users;
      setConnectedUsers(users);
    };

    awareness.on('change', syncAwareness);
    syncAwareness();

    // Track undo/redo state
    const updateUndoRedo = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };

    undoManager.on('stack-item-added', updateUndoRedo);
    undoManager.on('stack-item-popped', updateUndoRedo);

    // Cleanup
    return () => {
      initializedRef.current = false;
      elementsArray.unobserve(syncElements);
      awareness.off('change', syncAwareness);
      undoManager.off('stack-item-added', updateUndoRedo);
      undoManager.off('stack-item-popped', updateUndoRedo);
      destroyYjs();
    };
  }, [roomId, token]);
}
