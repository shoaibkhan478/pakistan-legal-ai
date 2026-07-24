// backend/scripts/scrapePaklii.js
//
// PAKLII JUDGMENT SCRAPER
//
// Automates what backend/court_decrees/ currently does by hand: pulls real
// judgments from paklii.org (Pakistan's free Legal Information Institute —
// part of the WorldLII/CommonLII network) and feeds them through the SAME
// chunk -> embed -> insert pipeline as ingestLegalDocs.js (see
// backend/src/services/knowledgeIngest.js), so scraped judgments show up
// in retrieval/citation-verification exactly like the manually-added ones.
//
// ⚠️ IMPORTANT — READ BEFORE RUNNING
// This machine's sandbox cannot reach paklii.org (network egress is
// allowlisted to package registries + github only), so the CSS
// selectors/URL patterns below are written from the general structure
// common to LII-family sites (AustLII/SAFLII/PakLII all run the same
// underlying platform: a /cases/PK/{court}/{year}/ index of judgment
// pages, each page a plain HTML document with the citation/court/date
// near the top and the judgment body as the main text). VERIFY AND ADJUST
// the selectors in `parseListingPage` and `parseJudgmentPage` against the
// live site before your first real run — open a listing page and a
// judgment page in a browser, check the actual tag/class names, and
// update the two CSS selectors marked "ADJUST ME" below. Everything else
// (rate limiting, retry, dedupe, chunking, embedding, DB insert) is
// production-ready as-is.
//
// COURT CODES (PakLII convention — verify against paklii.org/databases.html):
//   PKSC   = Supreme Court of Pakistan
//   PKLHC  = Lahore High Court
//   PKSHC  = Sindh High Court
//   PKIHC  = Islamabad High Court
//   PKPHC  = Peshawar High Court
//   PKBHC  = Balochistan High Court
//
// USAGE:
//   node backend/scripts/scrapePaklii.js --court=PKSC --from=2023 --to=2024 --limit=50
//   node backend/scripts/scrapePaklii.js --court=PKLHC --from=2024 --to=2024 --limit=20 --dry-run
//
// FLAGS:
//   --court      required, one of the codes above
//   --from       start year (inclusive)
//   --to         end year (inclusive), defaults to --from
//   --limit      max number of judgments to ingest in this run (default 50)
//   --dry-run    parse and log what WOULD be ingested, without writing to the DB
//                or calling the embedding API — use this first to sanity-check
//                the selectors against a real run before spending API quota
//
// REQUIRES: npm install cheerio   (added to backend/package.json)

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const cheerio = require('cheerio');
const logger = require('../src/utils/logger');
const { ingestDocument } = require('../src/services/knowledgeIngest');
const { pool } = require('../src/config/database');

const BASE_URL = 'https://www.paklii.org';

// Be a polite, identifiable scraper: a real contact-able User-Agent, real
// delays between requests, and a low concurrency of 1 (sequential, not
// parallel) — this is a small free public-interest legal database, not a
// CDN, and hammering it risks getting the whole project IP-blocked.
const REQUEST_DELAY_MS = 2000;
const MAX_RETRIES = 3;
const USER_AGENT = 'PakistanLegalAI-Ingestor/1.0 (+https://github.com/shoaibkhan478/pakistan-legal-ai; educational/research use, low request rate)';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v === undefined ? true : v];
    })
  );
  if (!args.court) {
    console.error('Missing required --court=PKSC (or PKLHC, PKSHC, PKIHC, PKPHC, PKBHC).');
    process.exit(1);
  }
  const from = parseInt(args.from, 10) || new Date().getFullYear();
  return {
    court: args.court,
    from,
    to: parseInt(args.to, 10) || from,
    limit: parseInt(args.limit, 10) || 50,
    dryRun: Boolean(args['dry-run']),
  };
}

/**
 * Fetches a URL with retry + polite delay. Every single request (listing
 * pages AND judgment pages) goes through this so rate limiting/backoff is
 * never accidentally skipped for one code path.
 */
async function politeFetch(url) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sleep(REQUEST_DELAY_MS);
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) {
        // 404s etc. — don't retry, this URL just doesn't exist.
        return null;
      }
      return await res.text();
    } catch (err) {
      lastErr = err;
      const backoff = REQUEST_DELAY_MS * attempt * 2;
      logger.warn(`scrapePaklii: fetch failed for ${url} (attempt ${attempt}/${MAX_RETRIES}): ${err.message}. Backing off ${backoff}ms.`);
      await sleep(backoff);
    }
  }
  logger.error(`scrapePaklii: giving up on ${url} after ${MAX_RETRIES} attempts: ${lastErr?.message}`);
  return null;
}

/**
 * Parses a year-index/listing page for a given court into a list of
 * judgment page URLs + whatever title text is shown in the listing.
 *
 * ADJUST ME: verify the real listing URL pattern and the selector for each
 * judgment link against paklii.org before running. LII-family sites
 * typically list one <li><a href="123.html">Case Name [2024] PKSC 123</a></li>
 * per judgment inside a container like ul.results or div#content.
 */
function parseListingPage(html, court, year) {
  const $ = cheerio.load(html);
  const items = [];

  // ADJUST ME — selector for each judgment link in the listing.
  $('a[href$=".html"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (!href || !text) return;
    // Skip nav links (privacy policy, about, etc.) — real judgment links on
    // LII sites are relative paths like "123.html" inside a year folder.
    if (!/^\d+\.html$/.test(href.split('/').pop())) return;

    items.push({
      url: new URL(href, `${BASE_URL}/cases/PK/${court}/${year}/`).toString(),
      listingTitle: text,
    });
  });

  return items;
}

/**
 * Parses a single judgment page into structured fields + full text.
 *
 * ADJUST ME: verify these selectors against a real judgment page. The
 * fallback regex-based extraction (reused from ingestLegalDocs.js's
 * extractJudgmentMetadata-style heuristics) is there specifically so a
 * selector miss degrades to "less precise metadata" rather than a crash.
 */
function parseJudgmentPage(html, url) {
  const $ = cheerio.load(html);

  // ADJUST ME — main content container for the judgment body.
  const bodyEl = $('#content, .judgment-body, body').first();
  const fullText = bodyEl.text().replace(/\s+/g, ' ').trim();

  if (!fullText || fullText.length < 200) return null; // clearly not a judgment page

  const titleEl = $('title, h1, h2').first();
  const pageTitle = titleEl.text().trim();

  // Citation pattern: "[2024] PKSC 123" or "PLD 2024 SC 100" style.
  const citationMatch = fullText.match(/\[(19|20)\d{2}\]\s*PK[A-Z]{2,4}\s*\d+/) ||
    fullText.match(/PLD\s*(19|20)\d{2}\s*[A-Za-z]+\s*\d+/) ||
    fullText.match(/\b\d{4}\s*SCMR\s*\d+/);
  const courtMatch = fullText.match(/(Supreme Court of Pakistan|[A-Za-z\s]+High Court)/);
  const judgeMatch = fullText.match(/(?:Mr\.?\s*)?Justice\s+([A-Z][a-zA-Z.\s]+?)(?:,|\n|J\.)/);
  const yearMatch = fullText.match(/\b(19|20)\d{2}\b/);
  const ratioMatch = fullText.match(/(?:Held|HELD)[:\-]?\s*([\s\S]{0,800}?)(?:\.\s{2,}|\.\s*\d+\.)/);

  return {
    title: pageTitle || citationMatch?.[0] || 'Untitled Judgment',
    citation: citationMatch ? citationMatch[0] : null,
    court: courtMatch ? courtMatch[0] : null,
    judge_name: judgeMatch ? judgeMatch[1].trim() : null,
    year: yearMatch ? parseInt(yearMatch[0], 10) : null,
    ratio_decidendi: ratioMatch ? ratioMatch[1].trim() : null,
    full_text: fullText,
    source_url: url,
  };
}

async function scrapeYear(court, year, remainingLimit, dryRun) {
  const listingUrl = `${BASE_URL}/cases/PK/${court}/${year}/`; // ADJUST ME if paklii's real index URL differs
  console.log(`\nFetching listing: ${listingUrl}`);
  const listingHtml = await politeFetch(listingUrl);
  if (!listingHtml) {
    console.log(`  ↳ No listing found for ${court} ${year} (site may use a different URL pattern — check manually).`);
    return { processed: 0, inserted: 0, skipped: 0 };
  }

  const items = parseListingPage(listingHtml, court, year).slice(0, remainingLimit);
  console.log(`  ↳ Found ${items.length} judgment link(s) to process.`);

  let processed = 0, inserted = 0, skipped = 0;

  for (const item of items) {
    console.log(`  ↳ [${processed + 1}/${items.length}] ${item.listingTitle}`);
    const html = await politeFetch(item.url);
    if (!html) { processed++; continue; }

    const parsed = parseJudgmentPage(html, item.url);
    if (!parsed) {
      console.log(`     ✘ Could not parse judgment body, skipping.`);
      processed++;
      continue;
    }

    if (dryRun) {
      console.log(`     [dry-run] Would ingest: "${parsed.title}" (${parsed.citation || 'no citation found'}), ${parsed.full_text.length} chars`);
      processed++;
      continue;
    }

    try {
      const { skipped: wasSkipped, chunksInserted } = await ingestDocument({
        sourceId: item.url, // dedupe key — re-running the scraper won't re-embed the same judgment
        rawText: parsed.full_text,
        meta: {
          source_type: 'judgment',
          title: parsed.title,
          citation: parsed.citation,
        },
        extra: {
          court: parsed.court,
          judge_name: parsed.judge_name,
          year: parsed.year,
          ratio_decidendi: parsed.ratio_decidendi,
        },
        extraMetadata: { source_url: item.url, scraped_at: new Date().toISOString() },
      });

      if (wasSkipped) {
        console.log(`     ↳ SKIP (already ingested)`);
        skipped++;
      } else {
        console.log(`     ✔ Ingested (${chunksInserted} chunk(s))`);
        inserted++;
      }
    } catch (err) {
      console.error(`     ✘ FAILED to ingest ${item.url}: ${err.message}`);
    }

    processed++;
  }

  return { processed, inserted, skipped };
}

async function main() {
  const { court, from, to, limit, dryRun } = parseArgs();
  console.log(`PakLII scraper starting — court=${court}, years=${from}-${to}, limit=${limit}, dryRun=${dryRun}`);
  if (dryRun) console.log('DRY RUN: no database writes, no embedding API calls.\n');

  let remaining = limit;
  let totals = { processed: 0, inserted: 0, skipped: 0 };

  for (let year = from; year <= to && remaining > 0; year++) {
    const result = await scrapeYear(court, year, remaining, dryRun);
    totals.processed += result.processed;
    totals.inserted += result.inserted;
    totals.skipped += result.skipped;
    remaining -= result.processed;
  }

  console.log(`\nDone. Processed: ${totals.processed}, Ingested: ${totals.inserted}, Skipped (dupes/unparseable): ${totals.skipped}`);

  if (!dryRun && totals.inserted > 0) {
    console.log('Rebuilding vector index for optimal recall...');
    await pool.query('REINDEX INDEX idx_legal_knowledge_embedding');
  }
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal scraper error:', err);
  process.exit(1);
});
