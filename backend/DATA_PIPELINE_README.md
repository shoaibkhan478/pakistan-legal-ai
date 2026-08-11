# Pakistan Legal AI — Data Pipeline Guide

Ye file batati hai ke legal data (Constitution, statutes, judgments) system mein
kaise aata hai, aur naya data add karne ka process kya hai. Isko `backend/`
folder mein rakhein (jaise `backend/DATA_PIPELINE_README.md`) taake future
maintenance aasan rahe.

---

## 1. Overall Pipeline

```
   [Official gov't PDFs]          [Manually sourced judgments]
           |                                  |
           v                                  v
  scripts/downloadLegalTexts.js      (manual download + rename)
           |                                  |
           +------------> court_decrees/ <----+
                                |
                                v
                  scripts/ingestLegalDocs.js
                  (parses, chunks, embeds via Gemini,
                   inserts into legal_knowledge table
                   with pgvector embeddings + full-text
                   search index)
                                |
                                v
                scripts/extractCaseCitations.js
                (scans judgments for Section/Article
                 references, links them in the
                 case_citations table)
                                |
                                v
                  scripts/checkKnowledgeBaseCoverage.js
                  (reports what's in the DB so far —
                   run this any time to see progress)
```

---

## 2. Adding more statutes (automated)

`scripts/downloadLegalTexts.js` downloads core statutes from **official
government sources only** (National Assembly, Ministry of Law, Punjab Govt
Law Portal, FMU). Currently covers:

- Constitution of Pakistan, 1973
- Pakistan Penal Code (PPC), 1860
- Code of Criminal Procedure (CrPC), 1898
- Code of Civil Procedure (CPC), 1908
- Qanun-e-Shahadat Order, 1984 (Law of Evidence)

Noted but not yet added (need a verified direct PDF link first — see comments
in the script): Contract Act 1872, Limitation Act 1908, Transfer of Property
Act 1882, West Pakistan Family Courts Act 1964.

To add more (Qanun-e-Shahadat Order, Contract Act, Companies Act, etc.):

1. Find the official PDF on a `.gov.pk` domain (National Assembly, Ministry
   of Law's `pakistancode.gov.pk`, or a provincial law portal like
   `punjabcode.punjab.gov.pk`).
2. Add an entry to the `FILES` array in `downloadLegalTexts.js`:
   ```js
   {
     label: 'Qanun-e-Shahadat Order, 1984',
     url: 'https://.../qso.pdf',
     filename: 'statute__qso__1984.pdf',
   },
   ```
3. Run `node scripts/downloadLegalTexts.js` again — it skips files already
   downloaded, so it's safe to re-run any time.

**Why not scrape everything automatically?** Some government sites
(`pakistancode.gov.pk` in particular) use unstable/obfuscated URLs that
change without notice, and court websites (Supreme Court, High Courts) use
bot-detection that blocks automated scraping outright. A small curated list
that you extend by hand is more reliable than a scraper that silently breaks.

---

## 3. Adding judgments (manual — by design)

Court judgment portals (Supreme Court, Lahore/Sindh/Peshawar/Balochistan High
Courts) are **not safe to scrape automatically** — they use search forms,
session cookies, and active bot-detection. The reliable workflow is:

1. Visit the relevant court's judgment search:
   - Supreme Court: `supremecourt.gov.pk/judgement-search/` or
     `supremecourt.gov.pk/latest-judgements/`
   - High Courts: each has its own judgments/case-search section
2. Search by citation, party name, or subject.
3. Download the PDF.
4. Rename to match the ingestion convention:
   ```
   judgment__<year>__<reporter>__<number>.pdf
   e.g. judgment__2023__SCMR__145.pdf
        judgment__PLD__2019__Lahore__220.pdf
   ```
5. Place it in `court_decrees/`.
6. Run `node scripts/ingestLegalDocs.js` — it will pick up new files.
7. Run `node scripts/extractCaseCitations.js` to link the judgment to the
   statute sections it cites.

If you regularly add judgments from one specific court, it's worth asking
for a dedicated helper script for that court's search form once its exact
structure is confirmed manually (I couldn't verify one live because the
Supreme Court site blocks automated requests, including from research
tools — this needs to be checked from a real browser session).

---

## 4. Checking progress

Run any time to see what's actually in the database:

```bash
node scripts/checkKnowledgeBaseCoverage.js
```

This reports:
- Total entries, broken down by type (constitution / statute / judgment)
- Which statutes are covered and how many sections each has
- How many entries are missing embeddings (these won't show up in AI search
  — usually means `ingestLegalDocs.js` needs to be re-run or hit an error
  partway through)
- How many citation links exist between judgments and statutes

If a column-name error appears, open the script's `CONFIG` section near the
top and match it to your actual `legal_knowledge` / `case_citations` schema.

---

## 5. Checking the whole system is actually working

Run any time something seems broken — this checks backend reachability,
backend-to-database connectivity, and frontend reachability in one go, and
tells you exactly which layer is failing instead of guessing:

```bash
BACKEND_URL=https://your-backend.up.railway.app \
FRONTEND_URL=https://your-frontend.vercel.app \
node scripts/checkSystemHealth.js
```

(Or edit the CONFIG section at the top of the script to hardcode your URLs
so you don't need to pass env vars each time.)

This would have immediately pinpointed the "frontend calling `/auth/register`
instead of `/api/v1/auth/register`" issue we hit during deployment, instead
of needing to manually inspect DevTools Network tab. Worth running after
every deployment.

---

## 6. Recommended order of operations for a fresh environment

```bash
# 1. Run migrations (only ones not already applied)
node scripts/runMigration.js 001_<filename>.sql
node scripts/runMigration.js 002_<filename>.sql
node scripts/runMigration.js 003_create_case_citations.sql

# 2. Download core statutes
node scripts/downloadLegalTexts.js

# 3. Ingest everything in court_decrees/
node scripts/ingestLegalDocs.js

# 4. Build the citation graph
node scripts/extractCaseCitations.js

# 5. Confirm what's actually loaded
node scripts/checkKnowledgeBaseCoverage.js

# 6. Confirm the whole live stack is healthy
node scripts/checkSystemHealth.js
```

---

## 7. Legal/ethical note

All automated downloads in `downloadLegalTexts.js` pull from official
Pakistani government sources that publish these texts specifically for
public access (e.g. the Ministry of Law's Pakistan Code portal states its
mission is "access to justice"). No paywalled, copyrighted commercial
reporter content (like PLD subscription content) is downloaded
automatically. If you add PLD or other subscription-based case law, ensure
you have a valid subscription/license to redistribute or use that content
in this way.
