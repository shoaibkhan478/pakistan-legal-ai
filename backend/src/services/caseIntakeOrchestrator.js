// backend/src/services/caseIntakeOrchestrator.js
//
// AUTONOMOUS CASE INTAKE ORCHESTRATOR — "the senior advocate's brain"
//
// Every existing entry point (chat, /analysis, /drafts) makes the USER
// decide which mode fits their problem. A real senior advocate doesn't
// make a walk-in client pick "research mode" or "drafting mode" — the
// client just describes their problem, and the advocate figures out for
// themselves what needs to happen: is there an urgent deadline? does this
// need a full researched opinion, a drafted document, or both? This module
// is that decision-making layer, orchestrating the existing services
// (limitationCalculator, legalReasoningChain, classifyDraftType,
// generateDraft) instead of duplicating their logic.
//
// FLOW for one call to runCaseIntake(problemText, options):
//   1. Classify what kind of document (if any) this problem calls for
//      (reuses classifyDraftType — already built for /drafts).
//   2. Independently, deterministically check for a limitation-period
//      risk (reuses limitationCalculator — runs regardless of what step 1
//      finds, because a deadline risk matters even in a pure research
//      question, and must never depend on the AI "remembering" to check).
//   3. Always run the full deep reasoning chain (issue-spot -> argue both
//      sides -> rebuttal + cross-exam -> synthesis -> citation+freshness
//      verification) — this is "Senior Advocate Mode" by default here,
//      not opt-in, since intake is specifically for someone bringing a
//      real problem, not a quick factual question (that's what plain
//      chat is for).
//   4. If step 1 confidently found a draft type AND the problem gives
//      enough concrete facts to draft from (not just an abstract legal
//      question), generate the draft grounded in step 3's analysis.
//   5. Assemble one unified, prioritized result: limitation alert first
//      (if any — this can be life-or-death for the case), then the
//      analysis, then the draft (if produced), then explicit next steps.

const logger = require('../utils/logger');
const { classifyDraftType, generateDraft } = require('./ai.service');
const { runLegalReasoningChain } = require('./legalReasoningChain');
const { guessLimitationType, calculateDeadline, listLimitationTypes } = require('./limitationCalculator');

// Very deliberately conservative: only auto-extracts a date if it's
// unambiguous (ISO or DD-MM-YYYY / DD/MM/YYYY with a 4-digit year). A
// wrong guessed date feeding into a deadline calculation is worse than no
// date at all, so anything ambiguous is left for the user/frontend to
// supply explicitly via options.triggerDate instead of guessing.
function extractTriggerDate(text) {
  const isoMatch = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return isoMatch[0];

  const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

/**
 * Runs the limitation check deterministically — never depends on the AI
 * classification succeeding, since this is the single highest-consequence
 * check in the whole intake (a missed deadline can end a meritorious case
 * before it's ever heard).
 */
function runLimitationCheck(problemText, explicitTriggerDate, explicitCaseTypeKey) {
  const caseTypeKey = explicitCaseTypeKey || guessLimitationType(problemText);
  if (!caseTypeKey) {
    return { detected: false, availableTypes: listLimitationTypes() };
  }

  const triggerDate = explicitTriggerDate || extractTriggerDate(problemText);
  if (!triggerDate) {
    return {
      detected: true,
      caseTypeKey,
      needsTriggerDate: true,
      message: 'A limitation-sensitive matter was detected, but no clear trigger date (date of order/breach/dispossession etc.) was found in the text. Provide it explicitly to get an exact deadline.',
    };
  }

  const deadlineInfo = calculateDeadline(caseTypeKey, triggerDate);
  return { detected: true, caseTypeKey, needsTriggerDate: false, ...deadlineInfo };
}

/**
 * @param {string} problemText - the client's problem in their own words
 * @param {object} [options]
 * @param {string} [options.language] - 'english'|'urdu'|'roman_urdu'|'bilingual', for the draft if one is produced
 * @param {string} [options.triggerDate] - explicit limitation trigger date (YYYY-MM-DD), overrides auto-extraction
 * @param {string} [options.limitationCaseTypeKey] - explicit limitationCalculator key, overrides auto-guess
 * @param {boolean} [options.forceDraft] - generate a draft even if classification confidence is low
 * @param {boolean} [options.skipDraft] - never generate a draft, analysis only
 */
async function runCaseIntake(problemText, options = {}) {
  if (!problemText || !problemText.trim()) {
    throw new Error('runCaseIntake: problemText is required.');
  }

  let totalTokens = 0;

  // Step 1 + 2 run in parallel — classification is an AI call, the
  // limitation check is pure local computation, so there's no reason to
  // make one wait on the other.
  const [classificationResult, limitationCheck] = await Promise.all([
    classifyDraftType(problemText).catch((err) => {
      logger.warn('runCaseIntake: classifyDraftType failed, continuing analysis-only:', err.message || err);
      return { classification: { draft_type: null, confidence: 'low', reasoning: null, clarifying_question: null }, tokens: 0 };
    }),
    Promise.resolve(runLimitationCheck(problemText, options.triggerDate, options.limitationCaseTypeKey)),
  ]);
  totalTokens += classificationResult.tokens || 0;
  const classification = classificationResult.classification;

  // Step 3 — always run the deep reasoning chain. This is the core
  // "senior advocate thinking" step and everything else (the draft, the
  // next-steps list) is grounded in its output.
  const caseTypeLabel = classification?.draft_type
    ? `${classification.draft_type} — client consultation`
    : 'client consultation';
  const deepAnalysis = await runLegalReasoningChain(problemText, caseTypeLabel);
  totalTokens += deepAnalysis.tokens || 0;

  // Step 4 — decide autonomously whether to draft. Rule: only draft when
  // classification is confident AND not explicitly skipped. A low-
  // confidence guess turning into a full drafted court document without
  // the user confirming would be worse than just asking a clarifying
  // question — the classifier already gives us that question for free.
  let draft = null;
  const shouldDraft =
    !options.skipDraft &&
    classification?.draft_type &&
    (classification.confidence === 'high' || options.forceDraft);

  if (shouldDraft) {
    try {
      const draftResult = await generateDraft(classification.draft_type, problemText, options.language || 'english', deepAnalysis);
      totalTokens += draftResult.tokens || 0;
      draft = { draftType: classification.draft_type, content: draftResult.content };
    } catch (err) {
      logger.error('runCaseIntake: draft generation failed:', err.message || err);
    }
  }

  // Step 5 — assemble prioritized, actionable output.
  const nextSteps = [];
  if (limitationCheck.detected && limitationCheck.urgency === 'expired') {
    nextSteps.push('⚠️ The computed limitation period appears to have already EXPIRED — immediately check whether Section 5 condonation (sufficient cause) can be argued, and consult on this before anything else.');
  } else if (limitationCheck.detected && ['immediate', 'critical'].includes(limitationCheck.urgency)) {
    nextSteps.push(`⚠️ Urgent: ${limitationCheck.caseType || 'this matter'} has a filing deadline that is imminent — prioritize filing over further research.`);
  } else if (limitationCheck.detected && limitationCheck.needsTriggerDate) {
    nextSteps.push('Provide the exact trigger date (order date / breach date / dispossession date) so the filing deadline can be calculated precisely.');
  }
  if (!classification?.draft_type && classification?.clarifying_question) {
    nextSteps.push(`Clarify: ${classification.clarifying_question}`);
  }
  if (classification?.draft_type && !draft && !options.skipDraft) {
    nextSteps.push(`A ${classification.draft_type} may be appropriate here, but confidence was ${classification?.confidence || 'low'} — confirm the document type before drafting.`);
  }
  if (deepAnalysis.synthesis?.risk_factors?.length) {
    nextSteps.push(...deepAnalysis.synthesis.risk_factors.slice(0, 2).map((r) => `Risk to address: ${r}`));
  }

  return {
    classification,
    limitationCheck,
    deepAnalysis,
    draft,
    nextSteps,
    tokens: totalTokens,
  };
}

module.exports = { runCaseIntake, extractTriggerDate };
