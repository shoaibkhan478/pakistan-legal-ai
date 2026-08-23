const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const logger = require('../utils/logger');

function buildPoolConfig() {
  const connectionString = process.env.DATABASE_URL;
  const isProd = process.env.NODE_ENV === 'production';
  const ssl = process.env.DB_SSL === 'true' || isProd ? { rejectUnauthorized: false } : false;

  if (connectionString) {
    return {
      connectionString,
      ssl,
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || process.env.PG_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  return {
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
    database: process.env.DB_NAME || process.env.PGDATABASE || 'postgres',
    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    ssl,
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || process.env.PG_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  logger.error('Unexpected DB pool error:', err);
});

async function connectDB() {
  try {
    const client = await pool.connect();
    const usingUrl = Boolean(process.env.DATABASE_URL);
    logger.info(`Postgres connected successfully (source: ${usingUrl ? 'DATABASE_URL' : 'individual DB vars'})`);
    client.release();
    return pool;
  } catch (err) {
    logger.error('Failed to connect to Postgres:', err.message);
    throw err;
  }
}

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text: String(text).substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error:', { text: String(text).substring(0, 100), error: error.message });
    throw error;
  }
}

/**
 * Get a client from pool (for transactions)
 */
async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);

  const timeout = setTimeout(() => {
    logger.error('DB client checkout timeout - possible leak');
    logger.error(`Last query: ${client.lastQuery}`);
  }, 5000);

  client.query = (...args) => {
    client.lastQuery = args;
    return originalQuery(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = release;
    return release();
  };

  return client;
}

/**
 * Run a transaction
 * @param {Function} callback - async function receiving (client)
 */
async function withTransaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, connectDB, query, getClient, withTransaction };
module.exports.pool = pool;
module.exports.connectDB = connectDB;
module.exports.query = query;
module.exports.getClient = getClient;
module.exports.withTransaction = withTransaction;
