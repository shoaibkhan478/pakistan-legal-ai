// backend/src/services/precedentFreshnessService.js
//
// PRECEDENT FRESHNESS CHECK
//
// citationVerifier.js answers "does this citation exist in material we
// trust?" This module answers a different, equally important question:
// "even if it exists and is real, is it STILL good law?" — a citation can
// be 100% real and still be dangerous to rely on if a later judgment
// overruled or seriously doubted it. Reads from the case_treatment table
// (see backend/db/migrations/004_create_case_treatment.sql).
//
// Kept deliberately separate from citationVerifier.js: that module is
// pure/deterministic string-matching with no DB dependency, easy to unit
// test in isolation. This one needs a DB round-trip, so callers that only
// want the local/live match check can skip this and stay fast; callers
// doing a full "senior advocate" pass call both.

const { pool } = require('../config/database');

/**
 * @param {Array<{citation: string, status: string, matchedSource?: string}>} verifiedCitations
 *   - output of citationVerifier.verifyCitations(), so this only spends a
 *     DB lookup on citations that were already matched to a real row.
 * @returns {Promise<Array>} same array, each item augmented with a
 *   `freshness` field: 'not_checked' | 'clear' | 'caution' | 'overruled'
 */
async function checkPrecedentFreshness(verifiedCitations) {
  const toCheck = verifiedCitations.filter((c) => c.status === 'verified_local' && c.matchedSourceId);
  if (toCheck.length === 0) {
    return verifiedCitations.map((c) => ({ ...c, freshness: 'not_checked' }));
  }

  const ids = toCheck.map((c) => c.matchedSourceId);
  let treatmentRows = [];
  try {
    const result = await pool.query(
      `SELECT ct.treated_case_id, ct.treatment, ct.verified, lk.citation AS treating_citation, lk.title AS treating_title
       FROM case_treatment ct
       JOIN legal_knowledge lk ON lk.id = ct.treating_case_id
       WHERE ct.treated_case_id = ANY($1::bigint[])
         AND ct.treatment IN ('overruled', 'doubted', 'distinguished')`,
      [ids]
    );
    treatmentRows = result.rows;
  } catch (err) {
    // If case_treatment doesn't exist yet (migration not run) or the DB
    // call fails for any reason, degrade gracefully to "not_checked"
    // rather than blocking the whole analysis on this one extra signal.
    return verifiedCitations.map((c) => ({ ...c, freshness: 'not_checked' }));
  }

  const byTreatedId = new Map();
  for (const row of treatmentRows) {
    const list = byTreatedId.get(row.treated_case_id) || [];
    list.push(row);
    byTreatedId.set(row.treated_case_id, list);
  }

  return verifiedCitations.map((c) => {
    if (c.status !== 'verified_local' || !c.matchedSourceId) {
      return { ...c, freshness: 'not_checked' };
    }
    const treatments = byTreatedId.get(c.matchedSourceId);
    if (!treatments || treatments.length === 0) {
      return { ...c, freshness: 'clear' };
    }

    const overruled = treatments.find((t) => t.treatment === 'overruled');
    const doubted = treatments.find((t) => t.treatment === 'doubted' || t.treatment === 'distinguished');
    const worst = overruled || doubted;

    return {
      ...c,
      freshness: overruled ? 'overruled' : 'caution',
      freshnessDetail: {
        treatment: worst.treatment,
        by: worst.treating_citation || worst.treating_title,
        verified: worst.verified,
        note: worst.verified
          ? `Flagged as ${worst.treatment} by ${worst.treating_citation || worst.treating_title} — human-verified.`
          : `Possible ${worst.treatment} by ${worst.treating_citation || worst.treating_title} — NOT yet human-verified, confirm independently before relying on this.`,
      },
    };
  });
}

module.exports = { checkPrecedentFreshness };
