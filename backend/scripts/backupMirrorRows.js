const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rows } = await p.query(
    `SELECT id, title, statute_name, article_or_section, full_text
     FROM legal_knowledge
     WHERE title ILIKE '%mirror%' OR statute_name ILIKE '%mirror%'`
  );

  const backupPath = path.resolve(__dirname, `../backups/mirror_rows_backup_${Date.now()}.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2), 'utf-8');

  console.log(`Backed up ${rows.length} rows to: ${backupPath}`);
  await p.end();
}

run();