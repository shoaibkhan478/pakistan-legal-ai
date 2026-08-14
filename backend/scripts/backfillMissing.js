const path = require('path');
const { Pool } = require('pg');
const { generateEmbedding } = require('../src/services/embeddingService');

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rows } = await p.query("SELECT id, title, statute_name, article_or_section, full_text FROM legal_knowledge WHERE embedding IS NULL");
  console.log(`Found ${rows.length} rows to backfill.`);

  for (const row of rows) {
    const text = [row.title, row.statute_name, row.article_or_section, row.full_text].filter(Boolean).join(' - ');
    try {
      const vector = await generateEmbedding(text);
      const vectorLiteral = `[${vector.join(',')}]`;
      await p.query('UPDATE legal_knowledge SET embedding = $1::vector WHERE id = $2', [vectorLiteral, row.id]);
      console.log(`OK: id ${row.id} - ${row.title}`);
    } catch (err) {
      console.error(`FAILED: id ${row.id} - ${row.title}: ${err.message}`);
    }
  }

  console.log('Backfill complete.');
  await p.end();
}

run();