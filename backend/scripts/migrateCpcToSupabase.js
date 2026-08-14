const { Pool } = require('pg');

// Local DB (source)
const localPool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'pakistan_legal_ai',
  user: 'postgres',
  password: 'p@k!$t@n1@',
  ssl: false,
});

// Supabase (destination)
const supabasePool = new Pool({
  connectionString: 'postgresql://postgres.dfageuffqcwqaweqwwwf:Alhumdulillah786@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('Fetching unique CPC rows from local DB...');
  // DISTINCT ON title keeps only the first occurrence of each duplicate title
  const { rows } = await localPool.query(`
    SELECT DISTINCT ON (title, statute_name, article_or_section)
      source_type, title, citation, court, judge_name, year, chapter,
      article_or_section, statute_name, full_text, ratio_decidendi,
      embedding, metadata
    FROM legal_knowledge
    WHERE statute_name = 'CPC'
    ORDER BY title, statute_name, article_or_section, id
  `);
  console.log(`Found ${rows.length} unique CPC rows to migrate.`);

  let inserted = 0, skipped = 0;
  for (const row of rows) {
    // Skip if this exact title already exists in Supabase (avoid re-inserting)
    const existing = await supabasePool.query(
      `SELECT 1 FROM legal_knowledge WHERE title = $1 AND statute_name = $2 LIMIT 1`,
      [row.title, row.statute_name]
    );
    if (existing.rowCount > 0) {
      skipped++;
      continue;
    }

    await supabasePool.query(
      `INSERT INTO legal_knowledge
        (source_type, title, citation, court, judge_name, year, chapter,
         article_or_section, statute_name, full_text, ratio_decidendi,
         embedding, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        row.source_type, row.title, row.citation, row.court, row.judge_name,
        row.year, row.chapter, row.article_or_section, row.statute_name,
        row.full_text, row.ratio_decidendi, row.embedding, row.metadata,
      ]
    );
    inserted++;
    if (inserted % 50 === 0) console.log(`  ...${inserted} inserted so far`);
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped (already existed): ${skipped}`);
  await localPool.end();
  await supabasePool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});