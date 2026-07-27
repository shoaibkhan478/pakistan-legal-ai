// backend/src/services/limitationCalculator.js
//
// LIMITATION PERIOD CALCULATOR
//
// The single most dangerous everyday mistake in litigation practice isn't
// a bad argument — it's a missed filing deadline. Miss a limitation
// period and the case can be dismissed on a technicality before its
// merits are ever heard, no matter how strong it was. This module gives
// the AI a deterministic (non-LLM) way to flag that risk immediately,
// instead of it being something the model might casually forget to
// mention in an otherwise good analysis.
//
// ⚠️ CRITICAL — READ BEFORE RELYING ON THIS IN PRODUCTION
// The periods below are a REFERENCE STARTING POINT drawn from the
// Limitation Act 1908 (First Schedule) and commonly-cited procedural
// rules, current to this codebase's knowledge. Limitation law has
// province-specific amendments, court-specific practice directions, and
// judicially-created exceptions (Section 5 "sufficient cause" condonation,
// Section 14 exclusion of time in good-faith wrong-forum proceedings, etc.)
// that this simple day-count CANNOT capture. This tool computes a
// CANDIDATE deadline to flag urgency early — it is explicitly NOT a
// substitute for an advocate independently verifying the applicable
// article and any condonation/exclusion that may apply. Every output
// carries this caveat baked in; do not strip it out in the UI.
//
// Design: a lookup table + a pure date-math function, kept separate from
// any AI call so "is my deadline close?" never depends on model behavior.

// Article references are to the Limitation Act 1908, First Schedule,
// unless noted otherwise. periodDays is the LIMITATION PERIOD ITSELF, not
// a court-specific extension (e.g. CPC O.VIII R.1 written statement time
// is a procedural rule, not Schedule limitation, and is noted as such).
const LIMITATION_TABLE = {
  suit_recovery_of_money: {
    label: 'Suit for recovery of money (on a debt/agreement)',
    article: 'Article 113, Limitation Act 1908 (general suit on contract)',
    periodDays: 3 * 365,
    triggerDescription: 'the date the money became due / the cause of action arose',
  },
  suit_immovable_property_possession: {
    label: 'Suit for possession of immovable property',
    article: 'Article 142/144, Limitation Act 1908',
    periodDays: 12 * 365,
    triggerDescription: 'the date of dispossession or the date the adverse right accrued',
  },
  suit_specific_performance: {
    label: 'Suit for specific performance of a contract',
    article: 'Article 113, Limitation Act 1908 (or the date fixed in the contract, if any)',
    periodDays: 3 * 365,
    triggerDescription: 'the date fixed for performance, or if no date is fixed, the date the plaintiff has notice of refusal',
  },
  suit_damages_breach_of_contract: {
    label: 'Suit for damages for breach of contract',
    article: 'Article 115/116, Limitation Act 1908',
    periodDays: 3 * 365,
    triggerDescription: 'the date of the breach',
  },
  first_appeal_civil: {
    label: 'First appeal from a civil decree to the High Court',
    article: 'Article 156, Limitation Act 1908 (subject to O.XLI CPC and current High Court rules)',
    periodDays: 90,
    triggerDescription: 'the date of the decree appealed from',
  },
  appeal_from_order: {
    label: 'Appeal from an order (not a decree)',
    article: 'Article 158, Limitation Act 1908',
    periodDays: 30,
    triggerDescription: 'the date of the order appealed from',
  },
  civil_revision_115_cpc: {
    label: 'Civil revision under Section 115 CPC',
    article: 'Article 131, Limitation Act 1908 (commonly applied; verify current High Court rule)',
    periodDays: 90,
    triggerDescription: 'the date of the order sought to be revised',
  },
  written_statement_cpc: {
    label: 'Filing written statement (defence) in a civil suit',
    article: 'Order VIII Rule 1, CPC (procedural rule, NOT Limitation Act — court can extend for reasons recorded)',
    periodDays: 30,
    triggerDescription: 'the date of service of summons',
  },
  criminal_appeal_sessions_to_hc: {
    label: "Criminal appeal from Sessions Court conviction to High Court",
    article: 'Article 155/157, Limitation Act 1908 (varies by nature of sentence — verify)',
    periodDays: 30,
    triggerDescription: 'the date of the conviction/sentence order',
  },
  criminal_revision: {
    label: 'Criminal revision petition',
    article: 'No fixed Schedule limitation, but courts expect it filed without unexplained delay — commonly treated as ~90 days by practice; ALWAYS verify, do not rely on this figure alone',
    periodDays: 90,
    triggerDescription: 'the date of the order sought to be revised',
  },
  leave_to_appeal_supreme_court: {
    label: 'Petition for leave to appeal to the Supreme Court (civil)',
    article: 'Article 182/183, Limitation Act 1908 read with Supreme Court Rules',
    periodDays: 60,
    triggerDescription: 'the date of the High Court judgment/order',
  },
  constitutional_petition_199: {
    label: 'Constitutional petition under Article 199',
    article: 'No fixed limitation, but "laches" (unexplained delay) can defeat relief — file as soon as possible',
    periodDays: 90, // conservative internal flag only — NOT a statutory period
    triggerDescription: 'the date the cause of action / grievance arose',
  },
  bail_application: {
    label: 'Bail application (pre-arrest or post-arrest)',
    article: 'No limitation period — but urgency is case-critical (custody continues until decided)',
    periodDays: 0,
    triggerDescription: 'immediate — file as soon as the client is in custody or apprehends arrest',
  },
};

/**
 * @returns list of { key, label } for every case type this calculator knows about
 * — used to build a dropdown / to let the classifier pick a key.
 */
function listLimitationTypes() {
  return Object.entries(LIMITATION_TABLE).map(([key, v]) => ({ key, label: v.label }));
}

/**
 * @param {string} caseTypeKey - one of the LIMITATION_TABLE keys
 * @param {string|Date} triggerDate - the date the limitation clock starts (e.g. date of order, date of breach)
 * @returns {object|null} deadline info, or null if caseTypeKey is unknown
 */
function calculateDeadline(caseTypeKey, triggerDate) {
  const entry = LIMITATION_TABLE[caseTypeKey];
  if (!entry) return null;

  const start = new Date(triggerDate);
  if (isNaN(start.getTime())) {
    return { error: 'invalid_trigger_date', ...entry };
  }

  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() + entry.periodDays);

  const now = new Date();
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let urgency;
  if (entry.periodDays === 0) urgency = 'immediate';
  else if (daysRemaining < 0) urgency = 'expired';
  else if (daysRemaining <= 7) urgency = 'critical';
  else if (daysRemaining <= 30) urgency = 'high';
  else if (daysRemaining <= 90) urgency = 'moderate';
  else urgency = 'low';

  return {
    caseType: entry.label,
    article: entry.article,
    triggerDescription: entry.triggerDescription,
    triggerDate: start.toISOString().slice(0, 10),
    periodDays: entry.periodDays,
    deadline: entry.periodDays === 0 ? null : deadline.toISOString().slice(0, 10),
    daysRemaining: entry.periodDays === 0 ? null : daysRemaining,
    urgency,
    disclaimer:
      'This is a computed reference deadline based on the standard limitation period only. It does NOT account for Section 5 condonation, Section 14 exclusion of time, province-specific amendments, or court-specific practice directions. An advocate must independently verify the applicable article and any exclusions before relying on this date.',
  };
}

/**
 * Best-effort guess at which LIMITATION_TABLE key fits a case description,
 * using simple keyword matching — deterministic, no AI call, so it never
 * adds latency/cost to the "is a deadline near?" check. Returns null if
 * nothing matches confidently; the caller should fall back to asking the
 * user to pick from listLimitationTypes() rather than guessing silently.
 */
function guessLimitationType(caseDescriptionText) {
  const text = (caseDescriptionText || '').toLowerCase();
  const rules = [
    [/bail/, 'bail_application'],
    [/written statement|defence|defense.{0,20}(file|filing)/, 'written_statement_cpc'],
    [/revision.{0,20}115|section 115|civil revision/, 'civil_revision_115_cpc'],
    [/criminal revision/, 'criminal_revision'],
    [/criminal appeal|appeal.{0,20}conviction|appeal.{0,20}sentence/, 'criminal_appeal_sessions_to_hc'],
    [/appeal.{0,20}(order|interlocutory)/, 'appeal_from_order'],
    [/first appeal|appeal.{0,20}decree|civil appeal/, 'first_appeal_civil'],
    [/leave to appeal|supreme court/, 'leave_to_appeal_supreme_court'],
    [/article 199|constitutional petition|writ petition/, 'constitutional_petition_199'],
    [/specific performance/, 'suit_specific_performance'],
    [/possession.{0,20}(property|land|house)/, 'suit_immovable_property_possession'],
    [/damages|breach of contract/, 'suit_damages_breach_of_contract'],
    [/recovery of money|recovery suit|loan.{0,20}(recover|due)/, 'suit_recovery_of_money'],
  ];
  for (const [pattern, key] of rules) {
    if (pattern.test(text)) return key;
  }
  return null;
}

module.exports = { LIMITATION_TABLE, listLimitationTypes, calculateDeadline, guessLimitationType };
