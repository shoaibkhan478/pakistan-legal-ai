const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rows } = await p.query(`
    SELECT title, statute_name, article_or_section, COUNT(*) AS cnt
    FROM legal_knowledge
    GROUP BY title, statute_name, article_or_section
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 20
  `);
  console.log(`Found ${rows.length} duplicate groups (showing top 20).`);
  rows.forEach(r => console.log(`x${r.cnt} | ${r.title} | ${r.statute_name} | ${r.article_or_section}`));

  const { rows: totalDup } = await p.query(`
    SELECT COUNT(*) FROM (
      SELECT title, statute_name, article_or_section
      FROM legal_knowledge
      GROUP BY title, statute_name, article_or_section
      HAVING COUNT(*) > 1
    ) t
  `);
  console.log(`Total duplicate groups in whole table: ${totalDup[0].count}`);

  await p.end();
}

run();