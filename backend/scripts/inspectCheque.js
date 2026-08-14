const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rows } = await p.query(`
    SELECT id, title, statute_name, article_or_section, full_text,
           (embedding IS NULL) AS no_embedding
    FROM legal_knowledge
    WHERE title ILIKE '%cheque%' OR full_text ILIKE '%cheque%'
  `);
  console.log(`Found ${rows.length} cheque-related rows.`);
  rows.forEach(r => console.log(`\nID ${r.id} | ${r.title} | ${r.statute_name} ${r.article_or_section} | no_embedding=${r.no_embedding}\n${r.full_text}`));
  await p.end();
}

run();