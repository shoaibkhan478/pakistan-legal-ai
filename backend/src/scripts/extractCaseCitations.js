// backend/scripts/extractCaseCitations.js
//
// STATUTE-TO-CASE LINKING — pass 2 of the pipeline.
//
// ingestLegalDocs.js only loads text into legal_knowledge. This script runs
// AFTER that: it scans every 'judgment' row's full_text, finds sentences
// that reference a Section/Article, resolves each reference against the
// existing 'statute'/'constitution' rows already in legal_knowledge, and
// records the link in case_citations (migration 003).
//
// Deterministic regex extraction (extraction_method='regex') on purpose,
// not an LLM call — for a citator, a false link is worse than a missed one,
// and regex on "Section 302 PPC" / "Article 199" patterns is both cheap and
// far more precise than an LLM guessing at citations. Anything the regex
// can't confidently resolve to an existing legal_knowledge row is still
// recorded (so no reference is silently thrown away) but left unresolved
// and low-confidence, for a human/ingestion pass to fix later.
//
// RUN (after ingestLegalDocs.js has populated legal_knowledge):
//   node backend/scripts/extractCaseCitations.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/database');

// Matches things like:
//   "Section 302 PPC" / "Section 302 of the PPC" / "S. 302 PPC" / "Sections 302 & 34 PPC"
//   "Article 199 of the Constitution" / "Article 199"
// Kept intentionally simple/explicit over a single mega-regex, so each
// pattern's intent stays readable and each can be tuned independently.
const CITATION_PATTERNS = [
  {
    regex: /\b(?:Section|Sections|S\.)\s?(\d+[A-Z]?)\s?(?:of the)?\s?(PPC|CrPC|CPC|Cr\.P\.C|C\.P\.C|Pakistan Penal Code|Code of Criminal Procedure|Code of Civil Procedure)\b/gi,
    build: (m) => ({ kind: 'statute', number: m[1], statuteRaw: m[2] }),
  },
  {
    regex: /\bArticle\s?(\d+[A-Z]?)\s?(?:of the)?\s?(Constitution)?\b/gi,
    build: (m) => ({ kind: 'constitution', number: m[1] }),
  },
];

const STATUTE_ALIASES = {
  'ppc': 'PPC', 'pakistan penal code': 'PPC',
  'crpc': 'CrPC', 'cr.p.c': 'CrPC', 'code of criminal procedure': 'CrPC',
  'cpc': 'CPC', 'c.p.c': 'CPC', 'code of civil procedure': 'CPC',
};

function normalizeStatuteName(raw) {
  if (!raw) return null;
  return STATUTE_ALIASES[raw.toLowerCase().trim()] || raw.trim();
}

/** Pulls a ~160-char window around the match for citation_context (auditability). */
function contextAround(text, index, length) {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + length + 100);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

/** Extracts raw citation references from one judgment's full_text. */
function extractReferences(fullText) {
  const found = [];
  for (const pattern of CITATION_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let m;
    while ((m = pattern.regex.exec(fullText)) !== null) {
      const parsed = pattern.build(m);
      found.push({
        raw: m[0].trim(),
        context: contextAround(fullText, m.index, m[0].length),
        ...parsed,
      });
    }
  }
  return found;
}

/**
 * Resolves an extracted reference against legal_knowledge. Statute refs
 * need BOTH the section number AND statute name to match confidently
 * (many statutes share section numbers) — if the statute name didn't
 * parse, we deliberately return null rather than guess.
 */
async function resolveProvision(ref) {
  if (ref.kind === 'statute') {
    const statuteName = normalizeStatuteName(ref.statuteRaw);
    if (!statuteName) return { row: null, confidence: 'low' };
    const result = await pool.query(
      `SELECT id FROM legal_knowledge
       WHERE source_type = 'statute'
         AND article_or_section ILIKE $1
         AND statute_name ILIKE $2
       LIMIT 1`,
      [`%${ref.number}%`, `%${statuteName}%`]
    );
    return { row: result.rows[0] || null, confidence: result.rows[0] ? 'high' : 'medium' };
  }
  if (ref.kind === 'constitution') {
    const result = await pool.query(
      `SELECT id FROM legal_knowledge
       WHERE source_type = 'constitution'
         AND article_or_section ILIKE $1
       LIMIT 1`,
      [`%${ref.number}%`]
    );
    return { row: result.rows[0] || null, confidence: result.rows[0] ? 'high' : 'medium' };
  }
  return { row: null, confidence: 'low' };
}

async function processJudgment(judgmentRow) {
  const refs = extractReferences(judgmentRow.full_text);
  if (refs.length === 0) return { inserted: 0, unresolved: 0 };

  let inserted = 0;
  let unresolved = 0;

  // De-dupe identical raw citation text within the same judgment before
  // hitting the DB (case_citations also enforces this via UNIQUE, but
  // skipping here avoids redundant resolveProvision() lookups).
  const seen = new Set();

  for (const ref of refs) {
    if (seen.has(ref.raw)) continue;
    seen.add(ref.raw);

    const { row, confidence } = await resolveProvision(ref);
    if (!row) unresolved++;

    try {
      await pool.query(
        `INSERT INTO case_citations
           (case_id, cited_provision_id, raw_citation_text, citation_context,
            extraction_method, confidence, verified)
         VALUES ($1, $2, $3, $4, 'regex', $5, FALSE)
         ON CONFLICT (case_id, raw_citation_text) DO NOTHING`,
        [judgmentRow.id, row ? row.id : null, ref.raw, ref.context, confidence]
      );
      inserted++;
    } catch (err) {
      console.error(`  ✗ Failed to insert citation "${ref.raw}" for case ${judgmentRow.id}:`, err.message);
    }
  }

  return { inserted, unresolved };
}

async function main() {
  console.log('Extracting statute/article citations from judgments...\n');

  const { rows: judgments } = await pool.query(
    `SELECT id, title, full_text FROM legal_knowledge WHERE source_type = 'judgment'`
  );

  if (judgments.length === 0) {
    console.log('No judgment rows found in legal_knowledge — ingest judgments first (ingestLegalDocs.js).');
    await pool.end();
    return;
  }

  let totalInserted = 0;
  let totalUnresolved = 0;

  for (const judgment of judgments) {
    const { inserted, unresolved } = await processJudgment(judgment);
    totalInserted += inserted;
    totalUnresolved += unresolved;
    console.log(`  [${judgment.id}] "${judgment.title}" → ${inserted} citation(s) found, ${unresolved} unresolved`);
  }

  console.log(`\n✔ Done. ${totalInserted} citation links processed across ${judgments.length} judgment(s).`);
  if (totalUnresolved > 0) {
    console.log(`  ⚠ ${totalUnresolved} reference(s) couldn't be matched to an existing statute/article row —`);
    console.log(`    these are still recorded (cited_provision_id = NULL) so nothing is lost; ingest the`);
    console.log(`    missing statute section, then re-run this script to backfill the link.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('extractCaseCitations failed:', err);
  process.exit(1);
});
