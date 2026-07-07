// backend/scripts/runMigration.js
//
// Runs a single .sql file from backend/db/migrations against DATABASE_URL.
// Made because this project doesn't use a migration framework — migrations
// are plain .sql files meant to be run manually. This script lets you run
// one the same way you already run ingestLegalDocs.js (via Railway's
// Console tab), instead of needing separate psql/database GUI access.
//
// Usage:
//   node scripts/runMigration.js 002_switch_embedding_dimension_to_768.sql

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');

async function main() {
  const filename = process.argv[2];
  if (!filename) {
    console.error('Usage: node scripts/runMigration.js <migration-filename>.sql');
    process.exit(1);
  }

  const filePath = path.resolve(__dirname, '../db/migrations', filename);
  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  console.log(`Running migration: ${filename} ...`);
  try {
    await pool.query(sql);
    console.log('✔ Migration applied successfully.');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
