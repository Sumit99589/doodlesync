import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        ydoc_state    BYTEA,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('[db] rooms table ready');
  } finally {
    client.release();
  }
}

export default pool;
