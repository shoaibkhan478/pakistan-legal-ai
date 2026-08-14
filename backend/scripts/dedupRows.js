const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rowCount } = await p.query(`
    DELETE FROM legal_knowledge
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM legal_knowledge
      GROUP BY title, statute_name, article_or_section
    )
  `);
  console.log(`Deleted ${rowCount} duplicate rows.`);

  const { rows: remaining } = await p.query(`SELECT COUNT(*) FROM legal_knowledge`);
  console.log(`Remaining total rows: ${remaining[0].count}`);

  const { rows: missingEmb } = await p.query(`SELECT COUNT(*) FROM legal_knowledge WHERE embedding IS NULL`);
  console.log(`Rows with missing embeddings now: ${missingEmb[0].count}`);

  await p.end();
}

run();