const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rows } = await p.query(`
    SELECT SUM(cnt - 1) AS extra_rows
    FROM (
      SELECT COUNT(*) AS cnt
      FROM legal_knowledge
      GROUP BY title, statute_name, article_or_section
      HAVING COUNT(*) > 1
    ) t
  `);
  console.log(`Total EXTRA duplicate rows (removable, keeping 1 of each): ${rows[0].extra_rows}`);
  await p.end();
}

run();