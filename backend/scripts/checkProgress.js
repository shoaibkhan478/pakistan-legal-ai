const { pool } = require('../src/config/database');

pool.query("SELECT COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS seeded, COUNT(*) FILTER (WHERE embedding IS NULL) AS missing FROM legal_knowledge")
  .then(r => {
    console.log(r.rows[0]);
    pool.end();
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    pool.end();
  });