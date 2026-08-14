const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
p.query("SELECT id, title, statute_name, article_or_section FROM legal_knowledge WHERE embedding IS NULL ORDER BY title")
  .then(r => {
    console.log('Total missing:', r.rows.length);
    console.table(r.rows);
    p.end();
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    p.end();
  });