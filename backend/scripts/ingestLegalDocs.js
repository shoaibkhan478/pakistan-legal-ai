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
const { generateEmbedding } = require('../src/services/embeddingService');
// Reuse the same pool config as the running app (supports DATABASE_URL OR
// the discrete DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD vars) instead of
// a second pool that only understood DATABASE_URL.
const { pool } = require('../src/config/database');

const SOURCE_DIR = path.join(__dirname, '../court_decrees');
const CHUNK_SIZE = 1200;      // characters per chunk
const CHUNK_OVERLAP = 200;    // overlap to preserve context across chunk boundaries

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

// ---------- Chunking ----------
function chunkText(text) {
  const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end).trim());
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.length > 30); // drop near-empty trailing chunks
}

// ---------- Duplicate guard ----------
async function alreadyIngested(sourceFile) {
  const result = await pool.query(
    `SELECT 1 FROM legal_knowledge WHERE metadata->>'source_file' = $1 LIMIT 1`,
    [sourceFile]
  );
  return result.rowCount > 0;
}

// ---------- Insert ----------
async function insertChunk(meta, chunkText, chunkIndex, sourceFile, judgmentMeta = {}) {
  const embedding = await generateEmbedding(chunkText);
  const embeddingLiteral = `[${embedding.join(',')}]`;

  await pool.query(
    `INSERT INTO legal_knowledge
      (source_type, title, citation, court, judge_name, year, chapter,
       article_or_section, statute_name, full_text, ratio_decidendi,
       embedding, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      meta.source_type,
      meta.title,
      meta.citation || null,
      judgmentMeta.court || null,
      judgmentMeta.judge_name || null,
      judgmentMeta.year || null,
      meta.chapter || null,
      meta.article_or_section || null,
      meta.statute_name || null,
      chunkText,
      judgmentMeta.ratio_decidendi || null,
      embeddingLiteral,
      JSON.stringify({ source_file: sourceFile, chunk_index: chunkIndex }),
    ]
  );
}

// ---------- Process a single file ----------
async function ingestFile(filename) {
  const filePath = path.join(SOURCE_DIR, filename);

  if (await alreadyIngested(filename)) {
    console.log(`  ↳ SKIP (already ingested): ${filename}`);
    return;
  }

  console.log(`  ↳ Reading: ${filename}`);
  const rawText = await readFileContent(filePath);
  const meta = parseFilename(filename);

  const judgmentMeta = meta.source_type === 'judgment'
    ? extractJudgmentMetadata(rawText)
    : {};

  const chunks = chunkText(rawText);
  console.log(`  ↳ ${chunks.length} chunk(s) generated`);

  for (let i = 0; i < chunks.length; i++) {
    await insertChunk(meta, chunks[i], i, filename, judgmentMeta);
    process.stdout.write(`    seeded chunk ${i + 1}/${chunks.length}\r`);
  }
  console.log(`\n  ✔ Done: ${filename}`);
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
