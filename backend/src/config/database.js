// backend/src/config/database.js
// Fix: DATABASE_URL ko priority di gayi hai. Agar wo set hai (Railway/Heroku/etc
// jaisi platforms yahi provide karti hain), to individual PGHOST/PGUSER/PGPASSWORD
// wagera env vars ko ignore kar dete hain — taake dono ka mismatch connection
// errors na de.

const { Pool } = require('pg');

function buildPoolConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return {
      connectionString,
      // Railway/Heroku Postgres SSL chahta hai; production mein enable, local dev mein optional.
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

pool.on('connect', () => {
  const usingUrl = Boolean(process.env.DATABASE_URL);
  console.log(
    `[db] Postgres pool connected (source: ${usingUrl ? 'DATABASE_URL' : 'individual PG* vars'})`
  );
});

module.exports = pool;
