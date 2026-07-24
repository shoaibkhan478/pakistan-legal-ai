// backend/scripts/ingestLegalDocs.js
//
// Reads .txt / .pdf / .docx files from backend/court_decrees/, parses them
// according to a filename convention, chunks the text, generates embeddings,
// and seeds the legal_knowledge table.
//
// FILENAME CONVENTION (rename source files accordingly):
//   constitution__Article_199__Right_to_Constitutional_Remedy.txt
//   statute__PPC__Section_302__Qatl-e-amd.txt
//   judgment__PLD_2012_SC_553__Benazir_Bhutto_v_Federation.pdf
//
// RUN:
//   node backend/scripts/ingestLegalDocs.js
//
// Requires (add to backend/package.json):
//   npm install pdf-parse mammoth pg openai dotenv

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
// Reuse the same pool config as the running app (supports DATABASE_URL OR
// the discrete DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD vars) instead of
// a second pool that only understood DATABASE_URL.
const { pool } = require('../src/config/database');
// Chunking/embedding/insert/dedupe logic now lives in one shared place
// (backend/src/services/knowledgeIngest.js) so this script and
// backend/scripts/scrapePaklii.js can never drift out of sync.
const { ingestDocument } = require('../src/services/knowledgeIngest');

const SOURCE_DIR = path.join(__dirname, '../court_decrees');

// ---------- File readers ----------
async function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.txt') return fs.readFileSync(filePath, 'utf-8');
  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

// ---------- Filename metadata parser ----------
// Expected: sourceType__identifier1__identifier2.ext
function parseFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  const parts = base.split('__');
  const sourceType = parts[0]; // 'constitution' | 'statute' | 'judgment'

  if (sourceType === 'constitution') {
    return {
      source_type: 'constitution',
      article_or_section: parts[1]?.replace(/_/g, ' '),
      title: parts[2]?.replace(/_/g, ' ') || 'Untitled Article',
    };
  }
  if (sourceType === 'statute') {
    return {
      source_type: 'statute',
      statute_name: parts[1]?.replace(/_/g, ' '),
      article_or_section: parts[2]?.replace(/_/g, ' '),
      title: parts[3]?.replace(/_/g, ' ') || `${parts[1]} ${parts[2]}`,
    };
  }
  if (sourceType === 'judgment') {
    return {
      source_type: 'judgment',
      citation: parts[1]?.replace(/_/g, ' '),
      title: parts[2]?.replace(/_/g, ' ') || 'Untitled Judgment',
    };
  }
  throw new Error(`Cannot determine source type from filename: ${filename}. Expected format: type__id__title.ext`);
}

// ---------- Judgment-specific extraction ----------
// Attempts to pull court, judge, and year out of the raw text using common
// patterns found in Pakistani judgment PDFs. Falls back gracefully if not found.
// IMPORTANT: this is a heuristic, not a guarantee — always spot-check a sample
// of ingested judgments before relying on them in production.
function extractJudgmentMetadata(text) {
  const courtMatch = text.match(/(Supreme Court of Pakistan|[A-Za-z\s]+High Court)/i);
  const judgeMatch = text.match(/(?:Mr\.?\s*)?Justice\s+([A-Z][a-zA-Z.\s]+?)(?:,|\n|J\.)/);
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const ratioMatch = text.match(/(?:Held|HELD|Ratio Decidendi)[:\-]?\s*([\s\S]{0,800}?)(?:\n\n|\.\s*\d+\.)/);

  return {
    court: courtMatch ? courtMatch[0] : null,
    judge_name: judgeMatch ? judgeMatch[1].trim() : null,
    year: yearMatch ? parseInt(yearMatch[0], 10) : null,
    ratio_decidendi: ratioMatch ? ratioMatch[1].trim() : null,
  };
}

// ---------- Process a single file ----------
async function ingestFile(filename) {
  const filePath = path.join(SOURCE_DIR, filename);

  console.log(`  ↳ Reading: ${filename}`);
  const rawText = await readFileContent(filePath);
  const meta = parseFilename(filename);

  const judgmentMeta = meta.source_type === 'judgment'
    ? extractJudgmentMetadata(rawText)
    : {};

  const { skipped, chunksInserted } = await ingestDocument({
    sourceId: filename,
    rawText,
    meta,
    extra: judgmentMeta,
  });

  if (skipped && chunksInserted === 0) {
    console.log(`  ↳ SKIP (already ingested or no usable text): ${filename}`);
    return;
  }
  console.log(`  ✔ Done: ${filename} (${chunksInserted} chunk(s) seeded)`);
}

// ---------- Main ----------
async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`);
    console.error(`Create it and drop your .txt / .pdf / .docx legal files inside.`);
    process.exit(1);
  }

  const files = fs.readdirSync(SOURCE_DIR).filter((f) =>
    ['.txt', '.pdf', '.docx'].includes(path.extname(f).toLowerCase())
  );

  if (files.length === 0) {
    console.log('No files found in court_decrees/. Nothing to ingest.');
    await pool.end();
    return;
  }

  console.log(`Found ${files.length} file(s) to process.\n`);

  for (const file of files) {
    try {
      console.log(`Processing: ${file}`);
      await ingestFile(file);
    } catch (err) {
      console.error(`  ✘ FAILED: ${file} — ${err.message}`);
    }
    console.log('');
  }

  console.log('Ingestion complete. Rebuilding vector index for optimal recall...');
  await pool.query('REINDEX INDEX idx_legal_knowledge_embedding');
  console.log('Done.');

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal ingestion error:', err);
  process.exit(1);
});
