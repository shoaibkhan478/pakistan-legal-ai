const { Pool } = require('pg');
const { generateEmbedding } = require('../src/services/embeddingService');

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const query = "cheque dishonor ki saza kya hai";
  const vector = await generateEmbedding(query);
  const vectorLiteral = `[${vector.join(',')}]`;

  const { rows } = await p.query(
    `SELECT id, title, statute_name, article_or_section,
            1 - (embedding <=> $1::vector) AS similarity
     FROM legal_knowledge
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    [vectorLiteral]
  );

  rows.forEach(r => console.log(`${r.similarity.toFixed(3)} | ${r.title} (${r.statute_name} ${r.article_or_section})`));
  await p.end();
}

run();