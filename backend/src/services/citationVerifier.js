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

const STOPWORDS = new Set([
  'the', 'of', 'a', 'an', 'in', 'on', 'for', 'and', 'or', 'to', 'v', 'vs', 'under',
]);

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pulls the distinguishing tokens out of a citation string, e.g.
 * "Section 497 CrPC — bail in non-bailable offences" ->
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

/**
 * @param {string[]} legalReferences - e.g. ["Section 497 CrPC — bail in non-bailable offences", "PLD 2019 SC 1 — ..."]
 * @param {{constitution?: object[], statute?: object[], judgment?: object[]}} retrievedRows - raw output of legalRetrievalService.retrieveRelevantLaw()
 * @param {string} [liveSearchText] - raw text from fetchLiveCaseLawContext(), if that pass ran
 * @returns {Array<{citation: string, status: 'verified_local'|'verified_live'|'unverified', matchedSource?: string, reason?: string}>}
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
    // acronym also appears there — avoids e.g. matching "497 CrPC" against
    // a CPC row that happens to also mention "497".
    const localMatch = localHaystacks.find(({ text }) => {
      const numbersMatch = numbers.every((n) => text.includes(n));
      const acronymOk = acronyms.length === 0 || acronyms.some((a) => text.includes(a));
      return numbersMatch && acronymOk;
    });
    if (localMatch) {
      return {
        citation,
        status: 'verified_local',
        matchedSource: [localMatch.row.statute_name, localMatch.row.article_or_section, localMatch.row.citation]
          .filter(Boolean)
          .join(' — '),
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
