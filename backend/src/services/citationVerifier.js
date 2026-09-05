// backend/src/services/citationVerifier.js
//
// CITATION GROUNDING VERIFIER
//
// The AI is already instructed never to invent a citation, and a
// "senior review" pass (seniorReviewPass in ai.service.js) has the model
// re-check its own draft for unsupported claims. Both of those are still
// just the same model marking its own homework.
//
// This module adds an independent, DETERMINISTIC (non-LLM, no extra API
// cost) check: for every citation the model says it relied on, does it
// actually appear in material we can verify is real — our local vetted
// law library, or the separate live-search research pass?
//
// It can't catch every possible hallucination (a fabricated citation could
// coincidentally reuse a real section number), but it catches the common,
// high-risk case that matters most in a legal tool: a citation that
// appears NOWHERE in the grounding material the model was given, meaning
// it was pulled purely from memory with nothing to check it against.
//
// Output is per-citation, not pass/fail for the whole analysis, so the
// frontend can render a trust signal next to each individual reference
// (e.g. a green "✓ verified against local library" vs. an amber
// "⚠ could not verify — check independently" badge) instead of a single
// blunt confidence score for the whole answer.
//
// UPGRADE (dotted-acronym fix + match-quality tiers):
//   1. BUG FIX — the previous normalize() stripped all punctuation before
//      tokenizing, so a citation written as "Cr.P.C" or "S. 497, Cr.P.C."
//      (both real, common ways Pakistani filings write these) shredded
//      into single-letter tokens ("cr", "p", "c") instead of the acronym
//      "crpc". A single-letter token never matches the acronyms regex
//      (which requires 2-6 letters), so the acronym signal was silently
//      lost and the citation could fail verification purely because of
//      how it was punctuated — nothing to do with whether it's real.
//      Fixed by collapsing dotted-letter runs (A.B.C. / A.B.C) into one
//      joined token BEFORE generic punctuation stripping.
//   2. MATCH-QUALITY TIERS — retrieveRelevantLaw()'s rows now carry
//      matchType ('vector' | 'keyword' | 'both' | 'citation_graph') and a
//      relevanceScore (see legalRetrievalService.js). A citation matched
//      against a row confirmed by BOTH vector and keyword search, or by
//      the citation graph, is a stronger signal than one that only
//      happened to share numbers with a single low-confidence vector hit.
//      verifyCitations() now surfaces that as matchQuality on
//      'verified_local' results, so a UI can visually distinguish "solidly
//      confirmed" from "matched, but only weakly."

const STOPWORDS = new Set([
  'the', 'of', 'a', 'an', 'in', 'on', 'for', 'and', 'or', 'to', 'v', 'vs', 'under',
]);

// Collapses a dotted-letter acronym run like "Cr.P.C." or "P.L.D" into a
// single joined token ("crpc", "pld") BEFORE punctuation is stripped
// generically. Requires at least 2 letter-groups so it doesn't accidentally
// eat an ordinary abbreviation like "S." on its own.
function collapseDottedAcronyms(str) {
  return (str || '').replace(
    /\b(?:[A-Za-z]\.){1,6}[A-Za-z]?\.?\B|\b(?:[A-Za-z]\.){2,6}/g,
    (match) => match.replace(/\./g, '')
  );
}

function normalize(str) {
  return collapseDottedAcronyms(str)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pulls the distinguishing tokens out of a citation string, e.g.
 * "Section 497 Cr.P.C — bail in non-bailable offences" ->
 *   numbers: ['497'], acronyms: ['crpc']
 * Numbers (section/article numbers, report years) and short statute/report
 * acronyms (crpc, ppc, cpc, pld, scmr, clc...) carry almost all of the
 * identifying signal; generic legal-English words don't.
 */
function extractKeyTokens(citation) {
  const norm = normalize(citation);
  const tokens = norm.split(' ').filter((t) => t && !STOPWORDS.has(t));
  const numbers = tokens.filter((t) => /\d/.test(t));
  const acronyms = tokens.filter((t) => /^[a-z]{2,6}$/.test(t) && !/^\d+$/.test(t));
  return { numbers, acronyms };
}

function haystackFromRow(row) {
  return normalize(
    [row.statute_name, row.article_or_section, row.citation, row.title, (row.full_text || '').slice(0, 300)]
      .filter(Boolean)
      .join(' ')
  );
}

// A local match is "strong" if the row it matched was itself confirmed by
// more than one retrieval signal (both vector + keyword agreeing, or a
// citation-graph link) rather than a single, possibly-noisy source.
function matchQualityOf(row) {
  if (row.matchType === 'citation_graph') return 'strong';
  if (row.matchType === 'both') return 'strong';
  if (row.matchType === 'keyword') return 'medium';
  return 'weak'; // vector-only
}

/**
 * @param {string[]} legalReferences - e.g. ["Section 497 Cr.P.C — bail in non-bailable offences", "PLD 2019 SC 1 — ..."]
 * @param {{constitution?: object[], statute?: object[], judgment?: object[]}} retrievedRows - raw output of legalRetrievalService.retrieveRelevantLaw()
 * @param {string} [liveSearchText] - raw text from fetchLiveCaseLawContext(), if that pass ran
 * @returns {Array<{citation: string, status: 'verified_local'|'verified_live'|'unverified', matchedSource?: string, matchQuality?: 'strong'|'medium'|'weak', reason?: string}>}
 */
function verifyCitations(legalReferences, retrievedRows = {}, liveSearchText = '') {
  if (!Array.isArray(legalReferences) || legalReferences.length === 0) return [];

  const allRows = [
    ...(retrievedRows.constitution || []),
    ...(retrievedRows.statute || []),
    ...(retrievedRows.judgment || []),
  ];
  const localHaystacks = allRows.map((row) => ({ row, text: haystackFromRow(row) }));
  const liveHaystack = normalize(liveSearchText);

  return legalReferences.map((citation) => {
    const { numbers, acronyms } = extractKeyTokens(citation);

    // Can't reliably verify a purely descriptive reference with no
    // section/article number or statute acronym to anchor on.
    if (numbers.length === 0) {
      return { citation, status: 'unverified', reason: 'no_identifying_number' };
    }

    // "verified_local": every number token in the citation appears in the
    // same local library row, AND (if the citation names an acronym) that
    // acronym also appears there — avoids e.g. matching "497 Cr.P.C" against
    // a CPC row that happens to also mention "497". Among all rows that
    // satisfy this, prefer the one with the strongest retrieval signal
    // rather than just the first one found.
    const qualityRank = { strong: 0, medium: 1, weak: 2 };
    const candidates = localHaystacks.filter(({ text }) => {
      const numbersMatch = numbers.every((n) => text.includes(n));
      const acronymOk = acronyms.length === 0 || acronyms.some((a) => text.includes(a));
      return numbersMatch && acronymOk;
    });
    const localMatch = candidates.sort(
      (a, b) => qualityRank[matchQualityOf(a.row)] - qualityRank[matchQualityOf(b.row)]
    )[0];

    if (localMatch) {
      return {
        citation,
        status: 'verified_local',
        matchQuality: matchQualityOf(localMatch.row),
        matchedSource: [localMatch.row.statute_name, localMatch.row.article_or_section, localMatch.row.citation]
          .filter(Boolean)
          .join(' — '),
        matchedSourceId: localMatch.row.id,
      };
    }

    // Fall back to the live-search research pass. Still model output, but a
    // *separate*, web-grounded call — better signal than nothing, flagged
    // distinctly rather than trusted the same as the vetted local library.
    if (liveHaystack && numbers.every((n) => liveHaystack.includes(n))) {
      return { citation, status: 'verified_live' };
    }

    return { citation, status: 'unverified' };
  });
}

/**
 * Convenience rollup for a UI badge / confidence adjustment:
 * counts how many citations landed in each bucket.
 */
function summarizeVerification(verifiedList) {
  return verifiedList.reduce(
    (acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { verified_local: 0, verified_live: 0, unverified: 0, total: 0 }
  );
}

module.exports = { verifyCitations, summarizeVerification };
