// backend/scripts/fetchAndSplitLawBook.js
//
// Downloads a full statute PDF from an official source and auto-splits it
// into one .txt file per Section — in the exact naming convention
// ingestLegalDocs.js expects (type__id1__id2.ext) — and writes them into
// court_decrees/, ready to ingest.
//
// WHY THIS EXISTS: copying 500+ PPC/CrPC sections by hand is slow and
// error-prone. This script does it deterministically from one official PDF,
// so every section's boundaries and numbering come straight from the
// government text instead of manual retyping.
//
// USAGE:
//   node backend/scripts/fetchAndSplitLawBook.js \
//     --url "https://sja.gos.pk/assets/Acts_Ordinances_Rules2/PPC.pdf" \
//     --statute PPC \
//     --out backend/court_decrees
//
//   node backend/scripts/fetchAndSplitLawBook.js \
//     --url "https://sja.gos.pk/assets/Acts_Ordinances_Rules2/CrPC.pdf" \
//     --statute CrPC \
//     --out backend/court_decrees
//
// REQUIRES:  npm install pdf-parse node-fetch
//
// IMPORTANT — READ BEFORE RELYING ON OUTPUT:
//   PDF-to-text extraction is not perfect (footnote markers, page numbers,
//   and multi-column layout can bleed into the body text — visible even in
//   the raw excerpt fetched earlier in this conversation). Treat this
//   script's output as a first draft:
//     1. Spot-check a handful of generated files against the source PDF.
//     2. Run scripts/ingestLegalDocs.js only after that check.
//     3. Keep the source_url in each file's header (added automatically
//        below) so every ingested row stays traceable to the official PDF,
//        per the provenance approach discussed earlier in this conversation.

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    out[args[i].replace(/^--/, '')] = args[i + 1];
  }
  if (!out.url || !out.statute) {
    console.error('Usage: node fetchAndSplitLawBook.js --url <pdf_url> --statute <PPC|CrPC|CPC|...> [--out <dir>]');
    process.exit(1);
  }
  out.out = out.out || path.resolve(__dirname, '../court_decrees');
  return out;
}

// Matches a Section header at the start of a line, e.g.:
//   "302. Punishment of qatl-e-amd ..."
//   "489F. Dishonestly issuing a cheque.-"
// Deliberately anchored to line-start + a following period, so it won't
// false-positive on section NUMBERS mentioned mid-sentence elsewhere
// (e.g. "...as provided in section 302 PPC..." does not start a line).
const SECTION_HEADER_RE = /^(\d{1,4}[A-Z]{0,2})\.\s+([A-Z][^.]{3,120}?)\.?\s*[-—.]?\s*$/;

function sanitizeForFilename(str) {
  return str
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

async function main() {
  const { url, statute, out } = parseArgs();

  // Lazy-required so the script gives a clear install hint if missing,
  // rather than an opaque MODULE_NOT_FOUND.
  let fetch, pdfParse;
  try {
    fetch = (await import('node-fetch')).default;
    pdfParse = require('pdf-parse');
  } catch (e) {
    console.error('Missing dependency. Run: npm install pdf-parse node-fetch');
    process.exit(1);
  }

  console.log(`Downloading ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  console.log('Extracting text from PDF...');
  const { text } = await pdfParse(buffer);

  // Drop the table-of-contents block before the Act body starts, so its
  // section-number lines (with trailing dot-leaders/page numbers) don't
  // get parsed as duplicate/garbled section bodies.
  const bodyStartMarker = text.search(/CHAPTER\s+I\b[\s\S]{0,200}INTRODUCTION/i);
  const body = bodyStartMarker > -1 ? text.slice(bodyStartMarker) : text;

  const lines = body.split('\n');
  const sections = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(SECTION_HEADER_RE);
    if (match) {
      if (current) sections.push(current);
      current = { number: match[1], title: match[2].trim(), body: [] };
    } else if (current && line) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  fs.mkdirSync(out, { recursive: true });

  let written = 0;
  for (const sec of sections) {
    // Skip clearly-bad parses (e.g. TOC leftovers with near-empty bodies)
    // rather than writing a near-blank "section" file that would pollute
    // ingestion — these need a human to fix from the source PDF anyway.
    if (sec.body.join(' ').length < 30) continue;

    const titleSlug = sanitizeForFilename(sec.title);
    const filename = `statute__${statute}__Section_${sec.number}__${titleSlug}.txt`;
    const filepath = path.join(out, filename);

    const fileContent =
      `[AUTO-EXTRACTED — verify against source before treating as authoritative]\n` +
      `Source: ${url}\n` +
      `Retrieved: ${new Date().toISOString().slice(0, 10)}\n\n` +
      `${statute} Section ${sec.number}: ${sec.title}\n\n` +
      sec.body.join('\n');

    fs.writeFileSync(filepath, fileContent, 'utf-8');
    written++;
  }

  console.log(`\n✔ Wrote ${written} section file(s) to ${out}`);
  console.log(`  (${sections.length - written} skipped as low-confidence parses — check manually if needed)`);
  console.log(`\nNext: spot-check a few files, then run scripts/ingestLegalDocs.js`);
}

main().catch((err) => {
  console.error('fetchAndSplitLawBook failed:', err);
  process.exit(1);
});
