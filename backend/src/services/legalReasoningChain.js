// backend/src/services/legalReasoningChain.js
//
// MULTI-STEP LEGAL REASONING CHAIN
//
// The existing analyzeFIR() etc. in ai.service.js are single-shot: facts in,
// one JSON verdict out (plus a self-review pass). That's fast, but it skips
// the actual thinking process a senior advocate goes through. This module
// replicates that process as a CHAIN of smaller, focused AI calls, each one
// building on the previous step's output — instead of asking one call to
// silently do issue-spotting, research, argument-weighing, and drafting all
// at once (which is exactly when models skip steps or blend things together).
//
// The chain, per issue found in the facts:
//   1. Issue spotting      — what are the distinct legal issues here?
//   2. Research             — what law/precedent actually applies to EACH issue?
//   3. Dual-sided argument  — build the strongest case for AND against, per issue
//   4. Rebuttal simulation  — what would opposing counsel argue back, and how
//                             do we answer that?
//   5. Strategy synthesis   — combine every issue's chain into one coherent
//                             final assessment + recommended strategy
//
// Each step is a separate, small, focused JSON call — easier for the model
// to do well, and easier for a human to audit (you can see exactly which
// step produced which claim, instead of one black-box paragraph).
//
// This is deliberately slower and more expensive (roughly 2N+2 model calls
// for N issues, run with limited parallelism, vs. 1-2 calls today) — it's
// meant as an opt-in "deep analysis" mode, not a replacement for the fast path.

const logger = require('../utils/logger');
const { generateContent, parseJsonSafe } = require('./ai.service');
const { retrieveRelevantLaw } = require('./legalRetrievalService');
const { verifyCitations, summarizeVerification } = require('./citationVerifier');

const MAX_ISSUES = 1; // reduced to the single most significant issue — on a
                       // 20/min free-tier quota, even 2 issues with retries
                       // can burn the ENTIRE minute's budget in one deep-
                       // analysis run by itself. This trades breadth (only
                       // the most important issue gets the full chain) for
                       // reliability. Raise once on a paid Gemini tier.

const MAX_RETRIES = 1; // lowered from 3 — each retry is another request
                        // against an already-scarce free-tier quota; better
                        // to fail one step fast to its fallback than burn
                        // 3x the requests and starve later steps in the
                        // same run. Raise once on a paid Gemini tier.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gemini's free tier is rate-limited (20 requests/minute at time of writing)
 * and a 5-step chain can easily burst past that in a few seconds. On a 429
 * quota error, Gemini's own error response tells us exactly how long to
 * wait (a RetryInfo.retryDelay field, e.g. "1.2s") — this parses that out
 * so we retry at the right moment instead of guessing.
 */
function parseRetryDelayMs(error) {
  try {
    const details = error?.details?.error?.details || [];
    const retryInfo = details.find((d) => d['@type']?.includes('RetryInfo'));
    const raw = retryInfo?.retryDelay; // e.g. "1.205373912s"
    if (raw) {
      const seconds = parseFloat(raw.replace('s', ''));
      if (!Number.isNaN(seconds)) return Math.ceil(seconds * 1000) + 250; // small buffer
    }
  } catch (_) { /* fall through to default backoff below */ }
  return null;
}

function isRateLimitError(error) {
  return error?.status === 429 || /quota|rate.?limit/i.test(error?.message || '');
}

/**
 * Runs one step of the chain: a focused JSON call with a given instruction.
 * Retries on rate-limit (429) errors — the dominant real-world failure mode
 * for a multi-call chain on Gemini's free tier — before finally falling
 * back, so a temporary quota blip doesn't silently degrade a whole analysis
 * to placeholder text.
 */
async function runStep(systemInstruction, userContent, fallback, maxTokens = 1024) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await generateContent({
        contents: userContent,
        systemInstruction,
        jsonMode: true,
        maxTokens,
      });
      // generateContent returns tokens as { input_tokens, output_tokens },
      // not a plain number — sum them here so every caller in this file can
      // just treat `tokens` as a number and add it up without re-deriving this.
      const tokenCount = (result.tokens?.input_tokens || 0) + (result.tokens?.output_tokens || 0);
      return { data: parseJsonSafe(result.text), tokens: tokenCount };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        // Rate-limit errors get Gemini's own suggested delay; anything else
        // (a blocked/safety response, truncated/malformed JSON, a transient
        // 5xx) still gets one retry with a short fixed backoff — these are
        // often transient too, and previously only 429s got a second try.
        const delay = isRateLimitError(error) ? (parseRetryDelayMs(error) || 1500 * (attempt + 1)) : 1000;
        logger.warn(`legalReasoningChain: step failed (${error?.message || error}), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }
      break; // retries exhausted — stop trying
    }
  }
  logger.warn(`legalReasoningChain: step failed after retries, using fallback: ${lastError?.message || lastError}`);
  return { data: fallback, tokens: 0 };
}

// ------------------------------------------------------------------
// STEP 1 — Issue spotting
// ------------------------------------------------------------------
async function spotIssues(caseText, caseTypeLabel) {
  const systemInstruction = `You are a senior Pakistani advocate doing the FIRST read of a new case: ${caseTypeLabel}. Your only job right now is to identify the distinct LEGAL ISSUES raised by the facts — not to analyze or argue them yet.

Rules:
- List at most ${MAX_ISSUES} issues, the most legally significant ones. Do not pad the list with minor/duplicate issues.
- Each issue should be a genuinely separate legal question (e.g. "is the offence bailable", "was the arrest procedurally valid", "is there a limitation bar" are different issues; don't split one issue into two phrasings of the same thing).
- Phrase each issue as a precise legal question, not a vague topic.

Respond with ONLY JSON:
{ "issues": [ { "id": "issue_1", "issue": string, "area_of_law": string } ] }`;

  const fallback = { issues: [{ id: 'issue_1', issue: 'Overall merits and bail prospects of the case', area_of_law: 'General' }] };
  const { data, tokens } = await runStep(systemInstruction, `CASE FACTS:\n${caseText.slice(0, 4000)}`, fallback, 1024);

  const issues = Array.isArray(data?.issues) && data.issues.length > 0 ? data.issues.slice(0, MAX_ISSUES) : fallback.issues;
  return { issues, tokens };
}

// ------------------------------------------------------------------
// STEP 2+3 (merged) — Research AND dual-sided argument construction in
// ONE call instead of two. Originally these were separate steps (cleaner
// separation of "what's the law" from "how does it apply"), but on
// Gemini's free tier, running 4 issues × 3 sequential calls each (14
// total round trips) pushed total wall-clock time past several minutes
// and tripped Railway's gateway timeout (502). Merging cuts per-issue
// round trips from 3 to 2 — still two genuinely separate reasoning
// steps (research feeds arguments), just in a single request instead
// of two, since the model can do both in one focused JSON call without
// meaningfully losing quality.
// ------------------------------------------------------------------
async function researchAndArgue(issue, caseText) {
  const systemInstruction = `You are researching and then arguing ONE specific legal issue for a Pakistani case, the way a senior advocate stress-tests a case before committing to a strategy.

ISSUE: "${issue.issue}" (area of law: ${issue.area_of_law})

Do this in order, in your head, then return only the final JSON:
1. Research: what law/precedent actually applies? Never invent a section number or case citation — if you're not confident of the exact provision/citation, describe the principle without a specific number rather than guessing one.
2. Argue BOTH sides using that research: the strongest case FOR the client's position, and the strongest case the OTHER side could genuinely make (don't straw-man the opposing side — make it as strong as it would honestly be in court).

Respond with ONLY JSON:
{
  "key_authorities": string[],
  "key_points": string[],
  "supporting_arguments": string[],
  "opposing_arguments": string[]
}`;

  const fallback = { key_authorities: [], key_points: [], supporting_arguments: [], opposing_arguments: [] };
  const { data, tokens } = await runStep(
    systemInstruction,
    `CASE FACTS:\n${caseText.slice(0, 3000)}`,
    fallback,
    1600
  );
  return { data, tokens };
}

// ------------------------------------------------------------------
// STEP 4 — Rebuttal simulation
// ------------------------------------------------------------------
async function simulateRebuttal(issue, argumentsResult) {
  const opposing = (argumentsResult.opposing_arguments || []).join('\n- ');
  if (!opposing) return { data: { rebuttal_points: [] }, tokens: 0 };

  const systemInstruction = `The opposing side has just raised these arguments on the issue "${issue.issue}":
- ${opposing}

You are responding on behalf of the client. For each opposing argument, give a specific rebuttal — not a generic dismissal. If an opposing argument is actually strong and can't be fully rebutted, say so honestly rather than forcing a weak counter-argument; overstating your position is worse than admitting a genuine weakness.

Respond with ONLY JSON:
{ "rebuttal_points": string[] }`;

  const fallback = { rebuttal_points: [] };
  const { data, tokens } = await runStep(systemInstruction, 'Provide the rebuttals as instructed.', fallback, 800);
  return { data, tokens };
}

// ------------------------------------------------------------------
// Runs the full per-issue sub-chain (steps 2-4), issues run in parallel,
// each issue's own steps run in sequence (each depends on the last).
// ------------------------------------------------------------------
async function runIssueChain(issue, caseText) {
  let tokens = 0;

  const researchArgsResult = await researchAndArgue(issue, caseText);
  tokens += researchArgsResult.tokens;

  const rebuttalResult = await simulateRebuttal(issue, researchArgsResult.data);
  tokens += rebuttalResult.tokens;

  return {
    id: issue.id,
    issue: issue.issue,
    area_of_law: issue.area_of_law,
    key_authorities: researchArgsResult.data.key_authorities || [],
    key_points: researchArgsResult.data.key_points || [],
    supporting_arguments: researchArgsResult.data.supporting_arguments || [],
    opposing_arguments: researchArgsResult.data.opposing_arguments || [],
    rebuttal_points: rebuttalResult.data.rebuttal_points || [],
    tokens,
  };
}

// ------------------------------------------------------------------
// STEP 5 — Strategy synthesis: combine every issue's chain into one
// coherent, final, client-facing assessment.
// ------------------------------------------------------------------
async function synthesizeStrategy(caseText, issueChains, caseTypeLabel) {
  const issuesSummary = issueChains
    .map((ic) => `ISSUE (${ic.id}): ${ic.issue}
  Authorities: ${ic.key_authorities.join('; ') || 'none confirmed'}
  Supporting: ${ic.supporting_arguments.join('; ') || 'none'}
  Opposing: ${ic.opposing_arguments.join('; ') || 'none'}
  Rebuttal: ${ic.rebuttal_points.join('; ') || 'none'}`)
    .join('\n\n');

  const systemInstruction = `You are the SENIOR advocate giving the final, client-facing assessment for this ${caseTypeLabel}, after your team has already researched and argued each issue below (both sides). Your job now is to weigh everything and give one coherent, honest strategic assessment — not to re-litigate each issue from scratch.

ISSUE-BY-ISSUE WORK ALREADY DONE:
${issuesSummary}

Respond with ONLY JSON:
{
  "case_theory": string,
  "issue_by_issue": [ { "issue": string, "conclusion": string } ],
  "overall_assessment": string,
  "strategy_recommendation": string,
  "risk_factors": string[],
  "legal_references": string[],
  "confidence_assessment": { "overall": "high"|"medium"|"low", "caveats": string[] }
}
Where "legal_references" is the deduplicated, consolidated list of every citation you're actually relying on across all issues (only ones you're confident are real), "risk_factors" are concrete things that could go against the client, and "confidence_assessment.overall" reflects how well-grounded this whole assessment is, not how favourable it is.`;

  const fallback = {
    case_theory: '',
    issue_by_issue: issueChains.map((ic) => ({ issue: ic.issue, conclusion: 'Synthesis step failed — see individual issue research above.' })),
    overall_assessment: 'Automated synthesis unavailable; review the individual issue analyses.',
    strategy_recommendation: '',
    risk_factors: [],
    legal_references: [...new Set(issueChains.flatMap((ic) => ic.key_authorities))],
    confidence_assessment: { overall: 'low', caveats: ['Synthesis step failed — treat this as raw research notes only.'] },
  };

  const { data, tokens } = await runStep(systemInstruction, `CASE FACTS:\n${caseText.slice(0, 4000)}`, fallback, 4096);
  return { data, tokens };
}

/**
 * Main entry point. Runs the full 5-step reasoning chain and returns a
 * complete, auditable result: every intermediate step is included (not just
 * the final answer), so the frontend/user can see the actual reasoning path
 * — which is itself valuable for a legal tool, since "why did it conclude
 * this" matters as much as the conclusion.
 *
 * @param {string} caseText - the FIR / notice / plaint / judgment text
 * @param {string} [caseTypeLabel] - short description for prompts, e.g. "FIR bail assessment"
 * @returns {Promise<{issue_chains: object[], synthesis: object, legal_references_verified: object[], verificationSummary: object, tokens: number}>}
 */
async function runLegalReasoningChain(caseText, caseTypeLabel = 'criminal case') {
  if (!caseText || !caseText.trim()) {
    throw new Error('runLegalReasoningChain: caseText is required.');
  }

  let totalTokens = 0;

  // Step 1
  const { issues, tokens: issueTokens } = await spotIssues(caseText, caseTypeLabel);
  totalTokens += issueTokens;

  // Steps 2-4, per issue, in parallel across issues
  // Issues run in parallel again — now that research+arguments are merged
  // into one call per issue (2 calls/issue instead of 3), a burst of
  // MAX_ISSUES(3) parallel calls stays comfortably under Gemini's
  // free-tier rate limit, and runStep's retry-with-backoff (above) is
  // still there as a safety net for any occasional 429. Running sequentially
  // was safer against bursts but pushed total wall-clock time past several
  // minutes for a 4-issue case, tripping Railway's gateway timeout — this
  // balances both concerns.
  const issueChains = await Promise.all(issues.map((issue) => runIssueChain(issue, caseText)));
  totalTokens += issueChains.reduce((sum, ic) => sum + ic.tokens, 0);

  // Step 5
  const { data: synthesis, tokens: synthesisTokens } = await synthesizeStrategy(caseText, issueChains, caseTypeLabel);
  totalTokens += synthesisTokens;

  // Independent citation grounding check (same deterministic verifier used
  // by the fast path) — applied to the FINAL consolidated reference list.
  let legal_references_verified = [];
  let verificationSummary = { verified_local: 0, verified_live: 0, unverified: 0, total: 0 };
  try {
    const references = Array.isArray(synthesis.legal_references) ? synthesis.legal_references : [];
    if (references.length > 0) {
      const retrievedRows = await retrieveRelevantLaw(caseText.slice(0, 2000));
      legal_references_verified = verifyCitations(references, retrievedRows, '');
      verificationSummary = summarizeVerification(legal_references_verified);
    }
  } catch (error) {
    logger.warn('runLegalReasoningChain: citation verification failed (continuing without it):', error.message || error);
  }

  // Strip internal per-issue token counts out of the public issue_chains
  // (they're only useful for the totalTokens rollup above).
  const cleanedIssueChains = issueChains.map(({ tokens, ...rest }) => rest);

  return {
    issue_chains: cleanedIssueChains,
    synthesis,
    legal_references_verified,
    verificationSummary,
    tokens: totalTokens,
  };
}

module.exports = { runLegalReasoningChain };
