import pg from 'pg';

const client = new pg.Client({
  connectionString: 'postgresql://postgres:postgrespassword@localhost:5432/postgres',
});

async function setup() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  const res = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = 'canvas_db'"
  );

  if (res.rows.length === 0) {
    await client.query('CREATE DATABASE canvas_db');
    console.log('Created database: canvas_db');
  } else {
    console.log('Database canvas_db already exists');
  }

  await client.end();
  console.log('Done!');
}

setup().catch(err => { console.error(err); process.exit(1); });
