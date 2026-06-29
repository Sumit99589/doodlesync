import * as Y from 'yjs';
import pool from './db.js';

/**
 * Active room tracking map.
 * Key: roomId (string)
 * Value: { ydoc: Y.Doc, isDirty: boolean, lastSaved: number, conns: Set<WebSocket>, saveTimer: NodeJS.Timeout | null }
 */
const activeRooms = new Map();

const SAVE_DEBOUNCE_MS = 5000;

/**
 * Get or create an in-memory room entry.
 * Loads existing Yjs state from DB if available.
 */
export async function getOrCreateRoom(roomId) {
  if (activeRooms.has(roomId)) {
    return activeRooms.get(roomId);
  }

  const ydoc = new Y.Doc();

  // Load persisted state from DB
  const result = await pool.query(
    'SELECT ydoc_state FROM rooms WHERE id = $1',
    [roomId]
  );

  if (result.rows[0]?.ydoc_state) {
    const state = new Uint8Array(result.rows[0].ydoc_state);
    Y.applyUpdate(ydoc, state);
    console.log(`[persistence] Loaded doc for room ${roomId} (${state.byteLength} bytes)`);
  }

  const room = {
    ydoc,
    isDirty: false,
    lastSaved: Date.now(),
    conns: new Set(),
    saveTimer: null,
  };

  // Listen for updates to mark dirty and schedule save
  ydoc.on('update', () => {
    room.isDirty = true;
    scheduleSave(roomId);
  });

  activeRooms.set(roomId, room);
  return room;
}

/**
 * Schedule a debounced save for a room.
 */
function scheduleSave(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  if (room.saveTimer) {
    clearTimeout(room.saveTimer);
  }

  room.saveTimer = setTimeout(() => {
    saveRoom(roomId);
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Persist a room's Yjs doc state to the database.
 */
async function saveRoom(roomId) {
  const room = activeRooms.get(roomId);
  if (!room || !room.isDirty) return;

  try {
    const state = Y.encodeStateAsUpdate(room.ydoc);
    await pool.query(
      'UPDATE rooms SET ydoc_state = $1, updated_at = now() WHERE id = $2',
      [Buffer.from(state), roomId]
    );
    room.isDirty = false;
    room.lastSaved = Date.now();
    console.log(`[persistence] Saved room ${roomId} (${state.byteLength} bytes)`);
  } catch (err) {
    console.error(`[persistence] Failed to save room ${roomId}:`, err.message);
  }
}

/**
 * Add a connection to a room.
 */
export function addConnection(roomId, ws) {
  const room = activeRooms.get(roomId);
  if (room) {
    room.conns.add(ws);
  }
}

/**
 * Remove a connection. If room is now empty, save immediately and clean up.
 */
export async function removeConnection(roomId, ws) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  room.conns.delete(ws);

  if (room.conns.size === 0) {
    // Last user left — save immediately and clean up
    if (room.saveTimer) {
      clearTimeout(room.saveTimer);
      room.saveTimer = null;
    }
    await saveRoom(roomId);
    room.ydoc.destroy();
    activeRooms.delete(roomId);
    console.log(`[persistence] Room ${roomId} emptied and cleaned up`);
  }
}

/**
 * Flush all dirty rooms to DB. Called on server shutdown.
 */
export async function flushAll() {
  const promises = [];
  for (const [roomId, room] of activeRooms) {
    if (room.isDirty) {
      promises.push(saveRoom(roomId));
    }
    if (room.saveTimer) {
      clearTimeout(room.saveTimer);
    }
  }
  await Promise.all(promises);
  console.log(`[persistence] Flushed ${promises.length} dirty room(s) to DB`);
}

/**
 * Get the active rooms map (for broadcasting, etc.)
 */
export function getActiveRooms() {
  return activeRooms;
}
