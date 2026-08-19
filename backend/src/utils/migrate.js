const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { pool, query } = require('../config/database');
const logger = require('./logger');

async function runMigrations() {
  console.log('--- Starting Pakistan Legal AI Database Migrations ---');
  try {
    // Ensure migrations table exists
    await query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (' +
      '  id SERIAL PRIMARY KEY,' +
      '  name VARCHAR(255) NOT NULL UNIQUE,' +
      '  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' +
      ');'
    );

    const migrationsDir = path.resolve(__dirname, '../../db/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found at ' + migrationsDir);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const alreadyApplied = await query(
        'SELECT id FROM schema_migrations WHERE name = $1',
        [file]
      );

      if (alreadyApplied.rows.length > 0) {
        console.log('[SKIP] ' + file + ' (already applied)');
        continue;
      }

      console.log('[APPLYING] ' + file + '...');
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log('[SUCCESS] ' + file + ' applied successfully.');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[ERROR] Failed to apply ' + file + ': ' + err.message);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log('--- All migrations finished successfully ---');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
