import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables. Check your .env file.');
}

/**
 * Join or create a room.
 * - If the room doesn't exist, create it with the hashed password.
 * - If it exists and the password matches, return a session token.
 * - If it exists and the password doesn't match, throw an error.
 */
export async function joinRoom(roomName, password, action) {
  const client = await pool.connect();
  try {
    const existing = await client.query(
      'SELECT id, password_hash FROM rooms WHERE name = $1',
      [roomName]
    );

    const exists = existing.rows.length > 0;

    if (action === 'create' && exists) {
      throw new Error('Room already exists');
    }
    if (action === 'join' && !exists) {
      throw new Error('Room does not exist');
    }

    if (exists) {
      // Room exists — verify password
      const room = existing.rows[0];
      const match = await bcrypt.compare(password, room.password_hash);
      if (!match) {
        throw new Error('Wrong password for this room');
      }
      const token = jwt.sign({ roomId: room.id, roomName }, JWT_SECRET, { expiresIn: '7d' });
      return { token, roomId: room.id };
    } else {
      // Room doesn't exist — create it
      const passwordHash = await bcrypt.hash(password, 1);
      const result = await client.query(
        'INSERT INTO rooms (name, password_hash) VALUES ($1, $2) RETURNING id',
        [roomName, passwordHash]
      );
      const roomId = result.rows[0].id;
      const token = jwt.sign({ roomId, roomName }, JWT_SECRET, { expiresIn: '7d' });
      return { token, roomId };
    }
  } finally {
    client.release();
  }
}

/**
 * Verify a session token and return the decoded payload.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Get room metadata by ID.
 */
export async function getRoomById(roomId) {
  const result = await pool.query(
    'SELECT id, name, created_at, updated_at FROM rooms WHERE id = $1',
    [roomId]
  );
  return result.rows[0] || null;
}

/**
 * Permanently delete a room by ID from the DB.
 */
export async function deleteRoom(roomId) {
  await pool.query('DELETE FROM rooms WHERE id = $1', [roomId]);
}

