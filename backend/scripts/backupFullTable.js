const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rows } = await p.query(`
    SELECT id, title, statute_name, article_or_section, full_text
    FROM legal_knowledge
    ORDER BY id
  `);
  const backupPath = path.resolve(__dirname, `../backups/full_table_backup_${Date.now()}.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2), 'utf-8');
  console.log(`Backed up ${rows.length} rows (without embeddings) to: ${backupPath}`);
  await p.end();
}

run();