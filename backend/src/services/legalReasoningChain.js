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
// This is deliberately slower and more expensive (roughly 3N+2 model calls
// for N issues, vs. 1-2 calls today) — it's meant as an opt-in "deep
// analysis" mode, not a replacement for the fast path.

const logger = require('../utils/logger');
const { generateContent, parseJsonSafe } = require('./ai.service');
const { retrieveRelevantLaw } = require('./legalRetrievalService');
const { verifyCitations, summarizeVerification } = require('./citationVerifier');

const MAX_ISSUES = 4; // hard cap — keeps latency/cost bounded and forces the
                       // model to prioritize, rather than splitting into 10 trivial issues

/**
 * Runs one step of the chain: a focused JSON call with a given instruction.
 * Fails soft — if a single step errors out, we log it and return a fallback
 * rather than aborting the whole chain over one weak link.
 */
async function runStep(systemInstruction, userContent, fallback, maxTokens = 1024) {
  try {
    const result = await generateContent({
      contents: userContent,
      systemInstruction,
      jsonMode: true,
      maxTokens,
    });
    return { data: parseJsonSafe(result.text), tokens: result.tokens };
  } catch (error) {
    logger.warn(`legalReasoningChain: step failed, using fallback: ${error.message || error}`);
    return { data: fallback, tokens: 0 };
  }
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
// STEP 2 — Per-issue research (grounded in the local RAG law library)
// ------------------------------------------------------------------
async function researchIssue(issue, caseText) {
  const systemInstruction = `You are researching ONE specific legal issue for a Pakistani case, using only the material provided to you (your local law library, injected below) plus well-established law you're genuinely confident about. Do not analyze the facts yet — just establish what law applies.

ISSUE TO RESEARCH: "${issue.issue}" (area of law: ${issue.area_of_law})

STRICT RULE: never invent a section number or case citation. If you're not confident of the exact provision/citation, describe the legal principle without a specific number rather than guessing one.

Respond with ONLY JSON:
{ "key_authorities": string[], "key_points": string[] }
Where "key_authorities" are specific statutory provisions or case citations you are confident about (empty array if none), and "key_points" are the applicable legal principles in plain language.`;

  const fallback = { key_authorities: [], key_points: [] };
  const { data, tokens } = await runStep(
    systemInstruction,
    `CASE FACTS (for context only):\n${caseText.slice(0, 2000)}`,
    fallback,
    1024
  );
  return { data, tokens };
}

// ------------------------------------------------------------------
// STEP 3 — Dual-sided argument construction
// ------------------------------------------------------------------
async function buildArguments(issue, research, caseText) {
  const systemInstruction = `You are building BOTH sides of the argument on one legal issue, the way a senior advocate stress-tests a case before committing to a strategy — arguing against your own client first is how you find the weaknesses before the other side does.

ISSUE: "${issue.issue}"
RESEARCH ALREADY DONE:
- Key authorities: ${(research.key_authorities || []).join('; ') || 'none confirmed'}
- Key points: ${(research.key_points || []).join('; ') || 'none'}

Respond with ONLY JSON:
{ "supporting_arguments": string[], "opposing_arguments": string[] }
Where "supporting_arguments" favour the client/petitioner's position on this issue, and "opposing_arguments" are the strongest arguments the OTHER side could genuinely make — do not straw-man the opposing side, make it as strong as it would honestly be in court.`;

  const fallback = { supporting_arguments: [], opposing_arguments: [] };
  const { data, tokens } = await runStep(
    systemInstruction,
    `CASE FACTS:\n${caseText.slice(0, 3000)}`,
    fallback,
    1200
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

  const researchResult = await researchIssue(issue, caseText);
  tokens += researchResult.tokens;

  const argumentsResult = await buildArguments(issue, researchResult.data, caseText);
  tokens += argumentsResult.tokens;

  const rebuttalResult = await simulateRebuttal(issue, argumentsResult.data);
  tokens += rebuttalResult.tokens;

  return {
    id: issue.id,
    issue: issue.issue,
    area_of_law: issue.area_of_law,
    key_authorities: researchResult.data.key_authorities || [],
    key_points: researchResult.data.key_points || [],
    supporting_arguments: argumentsResult.data.supporting_arguments || [],
    opposing_arguments: argumentsResult.data.opposing_arguments || [],
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
