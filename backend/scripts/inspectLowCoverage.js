const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rows } = await p.query(`
    SELECT id, title, statute_name, article_or_section, full_text
    FROM legal_knowledge
    WHERE statute_name ILIKE '%cpc%' OR statute_name ILIKE '%qso%'
    ORDER BY statute_name
  `);
  rows.forEach(r => console.log(`\nID ${r.id} | ${r.title} | ${r.statute_name} | ${r.article_or_section}\n${r.full_text}`));
  await p.end();
}

run();