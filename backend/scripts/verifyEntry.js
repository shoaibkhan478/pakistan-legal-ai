/**
 * verifyEntry.js
 *
 * Pulls the stored text for a specific law entry from legal_knowledge so you
 * can manually compare it against an official source (e.g. pakistancode.gov.pk)
 * to confirm accuracy.
 *
 * USAGE:
 *   node scripts/verifyEntry.js "302"
 *   node scripts/verifyEntry.js "10-A"
 *   node scripts/verifyEntry.js "crpc" "497"
 *
 * It searches id1/id2 (or title, if those columns don't match) for anything
 * containing your search term(s) and prints the full stored text of each
 * match, so you can read it side-by-side with an official source.
 */

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const searchTerm = process.argv[2];
const searchTerm2 = process.argv[3]; // optional second term (e.g. statute name + section)

if (!searchTerm) {
  console.error('Usage: node scripts/verifyEntry.js <search term> [second term]');
  console.error('Example: node scripts/verifyEntry.js "302"');
  console.error('Example: node scripts/verifyEntry.js "crpc" "497"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function findTextColumn() {
  // Try to figure out which column holds the actual law text, since we
  // don't know the exact schema. Common names: content, text, body, raw_text.
  const candidates = ['content', 'text', 'body', 'raw_text', 'full_text'];
  for (const col of candidates) {
    const { rows } = await pool.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'legal_knowledge' AND column_name = $1
       ) AS exists`,
      [col]
    );
    if (rows[0].exists) return col;
  }
  return null;
}

async function main() {
  const textCol = await findTextColumn();
  if (!textCol) {
    console.log(
      'Could not auto-detect the text column. Open this script and check the ' +
        '"candidates" list against your actual legal_knowledge schema, then add ' +
        'the correct column name.'
    );
    await pool.end();
    return;
  }

  console.log(`\nSearching for "${searchTerm}"${searchTerm2 ? ` + "${searchTerm2}"` : ''}...\n`);
  console.log(`(Using text column: "${textCol}")\n`);

  const params = searchTerm2 ? [`%${searchTerm}%`, `%${searchTerm2}%`] : [`%${searchTerm}%`];
  const whereClause = searchTerm2
    ? `(id1::text ILIKE $1 OR id2::text ILIKE $1 OR id2::text ILIKE $2 OR id1::text ILIKE $2)`
    : `(id1::text ILIKE $1 OR id2::text ILIKE $1)`;

  let rows;
  try {
    const result = await pool.query(
      `SELECT id1, id2, source_type, ${textCol} AS full_text
       FROM legal_knowledge
       WHERE ${whereClause}
       LIMIT 5`,
      params
    );
    rows = result.rows;
  } catch (err) {
    console.log('Query failed — your column names may differ from id1/id2/source_type.');
    console.log('Error:', err.message);
    await pool.end();
    return;
  }

  if (rows.length === 0) {
    console.log('No matching entries found. Try a different search term.');
    await pool.end();
    return;
  }

  rows.forEach((row, i) => {
    console.log('='.repeat(70));
    console.log(`Match ${i + 1}: [${row.source_type}] ${row.id1} — ${row.id2}`);
    console.log('='.repeat(70));
    console.log(row.full_text);
    console.log('');
  });

  console.log(`\nCompare the text above against an official source, e.g.:`);
  console.log(`  https://pakistancode.gov.pk (search for the section number)`);
  console.log(`  or the original PDF in court_decrees/\n`);

  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
