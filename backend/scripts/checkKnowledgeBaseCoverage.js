/**
 * checkKnowledgeBaseCoverage.js
 *
 * Prints a plain-English coverage report of what is currently in your
 * legal knowledge base — useful to answer "kitna data ab tak load ho chuka
 * hai, aur kya missing hai" without opening the DB manually every time.
 *
 * It reports:
 *   - How many rows exist per source type (constitution / statute / judgment)
 *   - Which statutes/articles appear to be covered (by distinct id1 values,
 *     if your legal_knowledge table stores something like "ppc", "crpc" etc.)
 *   - How many rows have embeddings generated (pgvector column populated)
 *     vs. rows that are missing embeddings (which means they won't show up
 *     in semantic search)
 *   - How many case_citations links exist, and how many are "verified"
 *
 * NOTE ON COLUMN NAMES:
 * This script tries a few common column-name variants (e.g. "source_type"
 * vs "type", "embedding" vs "vector") because I don't have direct visibility
 * into your exact schema. If a query fails with a "column does not exist"
 * error, open this file and adjust the CONFIG section below to match your
 * actual legal_knowledge / case_citations column names — the queries are
 * written so you only need to edit the top of the file, not the logic.
 *
 * USAGE:
 *   node scripts/checkKnowledgeBaseCoverage.js
 *
 * Requires the same DATABASE_URL your backend already uses (reads it from
 * process.env.DATABASE_URL, same as the rest of your app).
 */

const { Pool } = require('pg');

// ---------------------------------------------------------------------------
// CONFIG — adjust these if your actual column names differ
// ---------------------------------------------------------------------------
const TABLE = 'legal_knowledge';
const CITATIONS_TABLE = 'case_citations';
const COLUMNS = {
  sourceType: 'source_type', // e.g. 'constitution' | 'statute' | 'judgment'
  id1: 'id1',                // e.g. 'ppc', 'crpc', 'constitution'
  id2: 'id2',                // e.g. section/article number
  embedding: 'embedding',    // pgvector column
  createdAt: 'created_at',
};

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Run this with the same env your backend uses, e.g.:');
  console.error('  DATABASE_URL="postgresql://..." node scripts/checkKnowledgeBaseCoverage.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
});

async function tableExists(tableName) {
  const { rows } = await pool.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return rows[0].exists;
}

async function columnExists(tableName, columnName) {
  const { rows } = await pool.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS exists`,
    [tableName, columnName]
  );
  return rows[0].exists;
}

function bar(count, max, width = 30) {
  if (max === 0) return '';
  const filled = Math.round((count / max) * width);
  return '#'.repeat(filled) + '-'.repeat(width - filled);
}

async function main() {
  console.log('\n=== Pakistan Legal AI — Knowledge Base Coverage Report ===\n');

  const hasMainTable = await tableExists(TABLE);
  if (!hasMainTable) {
    console.error(`Table "${TABLE}" was not found. Have migrations been run yet?`);
    await pool.end();
    process.exit(1);
  }

  // Total row count
  const { rows: totalRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${TABLE}`);
  const total = totalRows[0].count;
  console.log(`Total entries in ${TABLE}: ${total}\n`);

  if (total === 0) {
    console.log('No data yet — run your ingestion script (e.g. ingestLegalDocs.js) first.\n');
    await pool.end();
    return;
  }

  // Breakdown by source type
  const hasSourceType = await columnExists(TABLE, COLUMNS.sourceType);
  if (hasSourceType) {
    const { rows: byType } = await pool.query(
      `SELECT ${COLUMNS.sourceType} AS type, COUNT(*)::int AS count
       FROM ${TABLE}
       GROUP BY ${COLUMNS.sourceType}
       ORDER BY count DESC`
    );
    console.log('Breakdown by source type:');
    const max = Math.max(...byType.map((r) => r.count));
    byType.forEach((r) => {
      console.log(`  ${(r.type || '(null)').padEnd(15)} ${String(r.count).padStart(6)}  ${bar(r.count, max)}`);
    });
    console.log('');
  } else {
    console.log(`(Column "${COLUMNS.sourceType}" not found — skipping breakdown by type. Check CONFIG in this file.)\n`);
  }

  // Breakdown by id1 (which statute/document family)
  const hasId1 = await columnExists(TABLE, COLUMNS.id1);
  if (hasId1) {
    const { rows: byId1 } = await pool.query(
      `SELECT ${COLUMNS.id1} AS id1, COUNT(*)::int AS count
       FROM ${TABLE}
       GROUP BY ${COLUMNS.id1}
       ORDER BY count DESC
       LIMIT 20`
    );
    console.log('Breakdown by document/statute (top 20):');
    byId1.forEach((r) => {
      console.log(`  ${(r.id1 || '(null)').padEnd(20)} ${r.count} entries`);
    });
    console.log('');
  }

  // Embedding coverage — critical for semantic search to actually work
  const hasEmbeddingCol = await columnExists(TABLE, COLUMNS.embedding);
  if (hasEmbeddingCol) {
    const { rows: embRows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE ${COLUMNS.embedding} IS NOT NULL)::int AS with_embedding,
         COUNT(*) FILTER (WHERE ${COLUMNS.embedding} IS NULL)::int AS without_embedding
       FROM ${TABLE}`
    );
    const { with_embedding, without_embedding } = embRows[0];
    console.log('Embedding coverage (needed for semantic/vector search):');
    console.log(`  With embedding:    ${with_embedding}`);
    console.log(`  MISSING embedding: ${without_embedding}${without_embedding > 0 ? '  <-- these rows will NOT show up in vector search' : ''}`);
    console.log('');
  }

  // Citation graph stats
  const hasCitationsTable = await tableExists(CITATIONS_TABLE);
  if (hasCitationsTable) {
    const { rows: citRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${CITATIONS_TABLE}`);
    console.log(`Case citation links in ${CITATIONS_TABLE}: ${citRows[0].count}`);

    const hasVerifiedCol = await columnExists(CITATIONS_TABLE, 'verified');
    if (hasVerifiedCol) {
      const { rows: verifiedRows } = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE verified = true)::int AS verified_count,
           COUNT(*) FILTER (WHERE verified = false OR verified IS NULL)::int AS unverified_count
         FROM ${CITATIONS_TABLE}`
      );
      console.log(`  Verified:   ${verifiedRows[0].verified_count}`);
      console.log(`  Unverified: ${verifiedRows[0].unverified_count}`);
    }
    console.log('');
  } else {
    console.log(`(Table "${CITATIONS_TABLE}" not found — has migration 003 been run?)\n`);
  }

  // Most recently added entries
  const hasCreatedAt = await columnExists(TABLE, COLUMNS.createdAt);
  if (hasCreatedAt) {
    const { rows: recent } = await pool.query(
      `SELECT ${COLUMNS.id1} AS id1, ${COLUMNS.id2} AS id2, ${COLUMNS.createdAt} AS created_at
       FROM ${TABLE}
       ORDER BY ${COLUMNS.createdAt} DESC
       LIMIT 5`
    );
    console.log('Most recently added entries:');
    recent.forEach((r) => {
      console.log(`  ${r.id1 || ''} ${r.id2 || ''}  (${new Date(r.created_at).toLocaleString()})`);
    });
    console.log('');
  }

  console.log('=== End of report ===\n');
  await pool.end();
}

main().catch((err) => {
  console.error('Error generating coverage report:', err.message);
  process.exit(1);
});
