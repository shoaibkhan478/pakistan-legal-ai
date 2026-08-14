const { pool } = require('../src/config/database');

async function run() {
  const { rows } = await pool.query(`
    SELECT statute_name, COUNT(*) AS sections
    FROM legal_knowledge
    GROUP BY statute_name
    ORDER BY sections DESC
  `);
  console.log(`Total distinct statutes: ${rows.length}\n`);
  rows.forEach(r => console.log(`${r.statute_name || '(null)'} — ${r.sections} sections`));
  await pool.end();
}

run();