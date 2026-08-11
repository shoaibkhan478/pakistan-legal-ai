/**
 * downloadLegalTexts.js
 *
 * Bulk-downloads official Pakistani legal texts (Constitution, major statutes)
 * from public government websites into the court_decrees/ folder, using the
 * naming convention expected by scripts/ingestLegalDocs.js:
 *
 *      type__id1__id2.ext
 *
 * IMPORTANT — READ BEFORE RUNNING:
 * 1. This script only downloads from official/public government sources
 *    (na.gov.pk = National Assembly, pakistancode.gov.pk = Ministry of Law).
 *    These are published for public access, but government sites change
 *    their URLs periodically — if a download fails with 404, visit the
 *    source site, find the current PDF link, and update the entry below.
 * 2. This gives you the CORE statutes + Constitution only. Judgments (case
 *    law) are NOT bulk-scraped here because Supreme Court / High Court
 *    websites use paginated, JS-heavy, or session-based systems that are
 *    not safe to scrape automatically. Add judgment PDFs manually to
 *    court_decrees/ following the same naming convention, or see the
 *    companion note at the bottom of this file for how to add sources.
 * 3. Verify the naming convention matches your actual ingestLegalDocs.js
 *    parsing logic (type__id1__id2.ext). Adjust FILES[].filename below if
 *    your parser expects something different.
 * 4. Run this from the backend/ directory (or adjust OUTPUT_DIR below):
 *
 *      node scripts/downloadLegalTexts.js
 *
 * 5. After running, verify each PDF actually opened correctly (some .gov.pk
 *    links occasionally serve an HTML error page with a 200 status instead
 *    of a real 404 — the script does a basic content-type / size sanity
 *    check, but always spot check a few files yourself before ingesting).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const OUTPUT_DIR = path.join(__dirname, '..', 'court_decrees');

// ---------------------------------------------------------------------------
// Curated list of official / public-source documents.
// Add more entries here as you find them (statutes, ordinances, etc.)
// ---------------------------------------------------------------------------
const FILES = [
  {
    label: 'Constitution of Pakistan 1973 (as amended)',
    url: 'https://www.na.gov.pk/uploads/documents/1549886415_632.pdf',
    filename: 'constitution__pakistan__1973.pdf',
  },
  {
    label: 'Pakistan Penal Code (PPC), 1860',
    url: 'https://pakistancode.gov.pk/pdffiles/administratord5622ea3f15bfa00b17d2cf7770a8434.pdf',
    filename: 'statute__ppc__1860.pdf',
  },
  {
    label: 'Pakistan Penal Code (PPC) — mirror source (FMU)',
    url: 'https://www.fmu.gov.pk/docs/laws/Pakistan%20Penal%20Code.pdf',
    filename: 'statute__ppc__1860_mirror.pdf',
    optional: true, // skip if primary PPC download already succeeded
  },
  {
    label: 'Code of Criminal Procedure (CrPC), 1898',
    url: 'https://www.fmu.gov.pk/docs/laws/Code_of_criminal_procedure_1898.pdf',
    filename: 'statute__crpc__1898.pdf',
  },
  {
    label: 'Code of Criminal Procedure (CrPC) — mirror source (PakistanCode)',
    url: 'https://pakistancode.gov.pk/pdffiles/administrator7db1e56f0f1d39a6e67573ec6b0944e2.pdf',
    filename: 'statute__crpc__1898_mirror.pdf',
    optional: true,
  },
  {
    label: 'Code of Civil Procedure (CPC), 1908',
    url: 'https://punjabcode.punjab.gov.pk/uploads/articles/THE_CODE_OF_CIVIL_PROCEDURE,_1908.pdf',
    filename: 'statute__cpc__1908.pdf',
  },
  {
    label: 'Qanun-e-Shahadat Order, 1984 (Law of Evidence)',
    url: 'https://punjabcode.punjab.gov.pk/uploads/articles/qanun-e-shahadat-order-1984-doc-pdf.pdf',
    filename: 'statute__qso__1984.pdf',
  },
  {
    label: 'Qanun-e-Shahadat Order — mirror source (Punjab Police)',
    url: 'https://punjabpolice.gov.pk/system/files/qanun-e-shahadat-order-1984.pdf',
    filename: 'statute__qso__1984_mirror.pdf',
    optional: true,
  },
];

// ---------------------------------------------------------------------------
// NOT YET INCLUDED (verify a direct PDF link before adding):
//   - Contract Act, 1872        (see punjabcode.punjab.gov.pk/en/show_article/BjBVYVBvVGI-
//                                 for the article page — grab the "Download" PDF link
//                                 from there and add it here)
//   - Limitation Act, 1908
//   - Transfer of Property Act, 1882
//   - West Pakistan Family Courts Act, 1964
// Add these the same way as the others above once you have a confirmed,
// working direct PDF URL from an official .gov.pk source.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper: download a single file with redirect handling
// ---------------------------------------------------------------------------
function downloadFile(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      return reject(new Error('Too many redirects'));
    }

    const client = url.startsWith('https') ? https : http;

    const request = client.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: 'application/pdf,text/html,*/*',
        },
      },
      (response) => {
        // Follow redirects (301/302/303/307/308)
        if (
          [301, 302, 303, 307, 308].includes(response.statusCode) &&
          response.headers.location
        ) {
          response.resume(); // discard this response body
          const nextUrl = new URL(response.headers.location, url).toString();
          return resolve(downloadFile(nextUrl, destPath, redirectCount + 1));
        }

        if (response.statusCode !== 200) {
          response.resume();
          return reject(
            new Error(`HTTP ${response.statusCode} for ${url}`)
          );
        }

        const contentType = response.headers['content-type'] || '';
        const fileStream = fs.createWriteStream(destPath);
        let totalBytes = 0;

        response.on('data', (chunk) => {
          totalBytes += chunk.length;
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve({ totalBytes, contentType });
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }
    );

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy(new Error('Request timed out after 30s'));
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created folder: ${OUTPUT_DIR}`);
  }

  console.log(`\nDownloading ${FILES.length} legal document(s) into:\n  ${OUTPUT_DIR}\n`);

  const results = { success: [], failed: [], skipped: [] };

  for (const file of FILES) {
    const destPath = path.join(OUTPUT_DIR, file.filename);

    if (fs.existsSync(destPath)) {
      console.log(`SKIP   (already exists): ${file.filename}`);
      results.skipped.push(file.filename);
      continue;
    }

    process.stdout.write(`GET    ${file.label} ... `);

    try {
      const { totalBytes, contentType } = await downloadFile(file.url, destPath);

      // Basic sanity check: PDF should be reasonably sized and not HTML
      const looksLikeHtml =
        contentType.includes('text/html') ||
        (fs.existsSync(destPath) &&
          fs.readFileSync(destPath, { encoding: 'utf8', flag: 'r' }).slice(0, 20).includes('<!DOCTYPE'));

      if (totalBytes < 2000 || looksLikeHtml) {
        fs.unlinkSync(destPath);
        throw new Error(
          `Downloaded content looks invalid (size=${totalBytes} bytes, type=${contentType}). ` +
            `The source URL may have changed — check it manually in a browser.`
        );
      }

      console.log(`OK  (${(totalBytes / 1024).toFixed(0)} KB) -> ${file.filename}`);
      results.success.push(file.filename);
    } catch (err) {
      console.log(`FAILED`);
      console.log(`       Reason: ${err.message}`);
      if (file.optional) {
        console.log(`       (marked optional — continuing)`);
      }
      results.failed.push({ file: file.filename, reason: err.message, optional: !!file.optional });
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Downloaded: ${results.success.length}`);
  console.log(`Skipped (already present): ${results.skipped.length}`);
  console.log(`Failed: ${results.failed.filter((f) => !f.optional).length}`);
  if (results.failed.length) {
    console.log('\nFailed downloads (fix URLs manually if needed):');
    results.failed.forEach((f) =>
      console.log(`  - ${f.file}: ${f.reason}${f.optional ? ' [optional]' : ''}`)
    );
  }

  console.log(
    '\nNext step: run your ingestion pipeline, e.g.\n' +
      '  node scripts/ingestLegalDocs.js\n'
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/**
 * ---------------------------------------------------------------------------
 * ADDING JUDGMENTS (case law)
 * ---------------------------------------------------------------------------
 * Judgments are best added manually because court websites (Supreme Court
 * of Pakistan, Lahore High Court, Sindh High Court, etc.) publish them via
 * search portals rather than flat file listings. Recommended workflow:
 *
 * 1. Visit e.g. https://www.supremecourt.gov.pk/judgement-search/ or your
 *    relevant High Court's judgments section.
 * 2. Search for the case(s) you need (by citation, party name, or subject).
 * 3. Download the PDF.
 * 4. Rename it to match your convention, e.g.:
 *      judgment__2023__SCMR__145.pdf
 *      judgment__PLD__2019__Lahore__220.pdf
 * 5. Place it in court_decrees/ alongside these statute files.
 * 6. Re-run ingestLegalDocs.js — it will pick up new files.
 *
 * If you want, a semi-automated helper can be built for a SPECIFIC court's
 * search portal once you confirm which court(s) you need most (Supreme
 * Court, or a specific High Court), since each portal has a different URL
 * structure and will need its own scraper.
 */
