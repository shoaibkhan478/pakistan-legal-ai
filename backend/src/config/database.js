// backend/src/config/database.js
// Fix 1: DATABASE_URL ko priority di gayi hai (Railway/Heroku jaisi platforms yahi provide karti hain).
// Fix 2: connectDB() function export kiya gaya hai kyunke server.js isay call karta hai
//        (pehla patch sirf 'pool' export kar raha tha, isliye "connectDB is not a function" crash hua).

const { Pool } = require('pg');

function buildPoolConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return {
      connectionString,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      max: parseInt(process.env.PG_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  // Fallback: individual vars, sirf tab jab DATABASE_URL bilkul set na ho.
  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'pakistan_legal_ai',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
  process.exit(-1);
});

// server.js isay startup par call karta hai to verify DB connection before listening.
async function connectDB() {
  try {
    const client = await pool.connect();
    const usingUrl = Boolean(process.env.DATABASE_URL);
    console.log(
      `[db] Postgres connected successfully (source: ${usingUrl ? 'DATABASE_URL' : 'individual PG* vars'})`
    );
    client.release();
    return pool;
  } catch (err) {
    console.error('[db] Failed to connect to Postgres:', err.message);
    throw err;
  }
}

// Multiple export shapes taake jo bhi import style server.js use kare, chal jaye:
//   const pool = require('./database');
//   const { connectDB } = require('./database');
//   const db = require('./database'); db.connectDB();
module.exports = pool;
module.exports.pool = pool;
module.exports.connectDB = connectDB;
