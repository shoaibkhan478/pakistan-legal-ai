const { Pool } = require('pg');

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rowCount } = await p.query(
    `DELETE FROM legal_knowledge
     WHERE title ILIKE '%mirror%' OR statute_name ILIKE '%mirror%'`
  );

  console.log(`Deleted ${rowCount} mirror rows.`);

  const { rows: remaining } = await p.query(`SELECT COUNT(*) FROM legal_knowledge`);
  console.log(`Remaining total rows: ${remaining[0].count}`);

  await p.end();
}

run();