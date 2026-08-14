const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
p.query("SELECT column_name FROM information_schema.columns WHERE table_name='legal_knowledge'")
  .then(r => {
    console.log(r.rows.map(x => x.column_name).join('\n'));
    p.end();
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    p.end();
  });