const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rows } = await p.query(
    `SELECT id, title, statute_name, article_or_section, LEFT(full_text, 200) AS preview
     FROM legal_knowledge
     WHERE title ILIKE '%mirror%' OR statute_name ILIKE '%mirror%'
     LIMIT 10`
  );
  console.log(`Found ${rows.length} mirror-like rows.`);
  rows.forEach(r => console.log(`ID ${r.id} | ${r.title} | ${r.statute_name} | ${r.article_or_section}\n  ${r.preview}\n`));

  const { rows: countRows } = await p.query(
    `SELECT COUNT(*) FROM legal_knowledge WHERE title ILIKE '%mirror%' OR statute_name ILIKE '%mirror%'`
  );
  console.log(`Total mirror-like rows in table: ${countRows[0].count}`);

  await p.end();
}

run();