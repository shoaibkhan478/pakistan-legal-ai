// backend/src/services/courtroomScriptService.js
//
// COURTROOM SCRIPT GENERATOR — "what a senior advocate actually does in
// court", produced as a usable package. A senior advocate's discipline goes
// beyond writing good speeches: they check whether the case is even
// maintainable before investing in the merits, they know which precedents
// actually BIND this court versus merely persuade it, they always carry a
// fallback position, and they rehearse the single sharpest thing opposing
// counsel will say before they ever hear it out loud. This version builds
// all of that into the chain, in the order a real advocate would reason
// through it.
//
// CHAIN (each step builds on real output from the ones before it):
//   0.  THRESHOLD CHECK        — maintainability, limitation, jurisdiction.
//                                 A senior advocate checks this BEFORE
//                                 investing in merits — a fatal threshold
//                                 defect can dispose of a matter regardless
//                                 of how strong the merits argument is.
//   1.  CASE THEORY             — coherent narrative + controlling law +
//                                 facts to establish/attack + an ALTERNATIVE
//                                 ("in the alternative") fallback position,
//                                 the way a senior advocate never argues a
//                                 single point of failure.
//   1b. CITATION CHECK          — deterministic check of every controlling-
//                                 law citation against the local law library
//                                 (reuses the same pipeline the analysis
//                                 features use) — a citation not checked
//                                 isn't one a senior advocate would rely on.
//   1c. PRECEDENT STRENGTH      — for citations that verified against a
//                                 real provision, pulls the actual judgments
//                                 on record that cite it (citation graph,
//                                 not a fresh search) and classifies each as
//                                 BINDING or merely PERSUASIVE on the
//                                 hearing's forum — Supreme Court judgments
//                                 bind everywhere; a High Court judgment
//                                 binds subordinate courts in its own
//                                 province but is only persuasive elsewhere.
//                                 Citing a merely-persuasive judgment as if
//                                 it controls the case is a rookie mistake a
//                                 senior advocate doesn't make.
//   1d. OPPOSING ARGUMENT       — the single strongest counter-argument
//       & REBUTTAL                opposing senior counsel is likely to make
//                                 against the whole case theory (not a
//                                 procedural objection — a substantive
//                                 argument), with a considered rebuttal
//                                 rehearsed in advance.
//   2.  OPENING STATEMENT
//   3.  EXAMINATION-IN-CHIEF
//   4.  CROSS-EXAMINATION
//   5.  RE-EXAMINATION
//   6.  ANTICIPATED OBJECTIONS  — evidentiary objections during questioning.
//   7.  BENCH QUERIES           — questions the judge is likely to ask.
//   8.  CLOSING ARGUMENTS       — now also argues the alternative position
//                                 and pre-empts the anticipated opposing
//                                 argument using the rebuttal already
//                                 prepared in step 1d.
//
// IMPORTANT, DELIBERATE DESIGN CHOICE — no fabricated witness answers:
// Examination-in-chief, cross-examination, and re-examination remain
// QUESTION LISTS with a short strategic note per question, never a scripted
// Q-and-A with invented answers. A real witness's actual answer can't be
// known in advance. Questions are ours to prepare; the witness's actual
// answers are not.

const logger = require('../utils/logger');
const { generateContent, parseJsonSafe } = require('./ai.service');
const { retrieveRelevantLawWithCitations, getRelatedCases } = require('./legalRetrievalService');
const { verifyCitations, summarizeVerification } = require('./citationVerifier');

const LANGUAGE_INSTRUCTIONS = {
  english: 'Write in formal legal English as used in Pakistani courts.',
  urdu: 'Write in formal legal Urdu (اردو رسم الخط) as used in Pakistani courts.',
  roman_urdu: 'Write in Roman Urdu.',
  bilingual: 'Write with English legal headings and Urdu explanatory text where natural.',
};

function languageInstruction(language) {
  return LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.english;
}

// Pakistani courts use different forms of address depending on forum —
// "My Lord" is Supreme Court / High Court convention; subordinate courts
// (Sessions, Magistrate, civil courts) are typically addressed as
// "Learned Judge" / "Honourable Court" / "Janab-e-Ali". Defaults to the
// subordinate-court form since most FIR/bail/civil-suit work in this app
// happens there, but respects an explicit forum if the user names one.
function addressForm(forum) {
  const f = (forum || '').toLowerCase();
  if (f.includes('supreme court') || f.includes('high court')) return '"My Lord"';
  return '"Learned Judge" / "Honourable Court"';
}

// Very rough province inference from a forum string (e.g. "Lahore High
// Court" -> Punjab), used only to decide whether a High Court judgment is
// binding (same province) or persuasive (different province / unspecified)
// on a subordinate forum. This is a heuristic for flagging, not a
// substitute for an advocate confirming precedent hierarchy properly.
const PROVINCE_HIGH_COURTS = {
  punjab: ['lahore high court'],
  sindh: ['sindh high court', 'karachi'],
  kpk: ['peshawar high court'],
  balochistan: ['balochistan high court', 'quetta'],
  islamabad: ['islamabad high court'],
};
function provinceOf(str) {
  const s = (str || '').toLowerCase();
  for (const [province, markers] of Object.entries(PROVINCE_HIGH_COURTS)) {
    if (markers.some((m) => s.includes(m))) return province;
  }
  return null;
}

/**
 * STEP 0 — Threshold check.
 * A senior advocate checks maintainability, limitation, and jurisdiction
 * BEFORE investing effort in the merits — a fatal threshold defect can
 * dispose of a matter regardless of how strong the substantive argument is.
 * This doesn't block the rest of the chain (the user may already know they
 * need the merits prep too, or may be preparing to argue maintainability
 * itself), but it's surfaced prominently so it isn't missed.
 */
async function assessThreshold({ caseFacts, caseType, role, forum }) {
  const systemInstruction = `You are a senior advocate doing the FIRST thing a senior advocate does before preparing a hearing on the merits: checking whether the matter is even properly before the court. You act for the "${role}" in a ${caseType} matter${forum ? ` before the ${forum}` : ''}.

Assess, based on the facts given, whether there are any THRESHOLD issues that could dispose of this matter before the merits are ever reached: limitation (is this filed within time, or is there a limitation defect?), maintainability (locus standi, proper forum, is there a bar such as an alternate remedy not exhausted, res judicata, etc.), and jurisdiction (is this the correct court/forum for this matter?).

Respond with ONLY a JSON object with exactly these keys:
{
  "maintainability_issues": array of objects, each {"issue": short name, "severity": "fatal" | "serious" | "minor", "assessment": one or two sentences on whether this actually applies here and why},
  "limitation_assessment": one or two sentences on limitation/timeliness, or "No limitation concern apparent from the facts given" if none,
  "jurisdiction_assessment": one or two sentences on whether the named/implied forum is correct,
  "proceed_recommendation": one sentence — either that the matter is fit to proceed on merits, or that a specific threshold objection should be raised/addressed first
}
Only flag issues that genuinely arise from the facts given — do not invent generic boilerplate concerns. If nothing threshold-level applies, say so plainly rather than manufacturing an issue.

CASE FACTS PROVIDED:
${caseFacts}`;

  const result = await generateContent({
    contents: 'Assess the threshold issues as instructed and return the JSON.',
    systemInstruction,
    jsonMode: true,
    maxTokens: 1536,
  });

  return { threshold: parseJsonSafe(result.text), tokens: result.tokens };
}

/**
 * STEP 1 — Case theory (now includes an alternative/fallback position).
 * Everything downstream is built on this, exactly the way a real advocate's
 * hearing prep starts with the theory of the case, not with drafting.
 */
async function buildCaseTheory({ caseFacts, caseType, role, forum }) {
  const systemInstruction = `You are a senior advocate of the Supreme Court of Pakistan preparing a matter for a court hearing. You act for the "${role}" in a ${caseType} matter${forum ? ` before the ${forum}` : ''}.

Before preparing anything for the actual hearing, work out the THEORY OF THE CASE the way a senior advocate does — the single coherent narrative that ties the facts and the law together in your client's favour. A senior advocate never rests everything on one argument succeeding, so also work out the fallback ("in the alternative") position to argue if the primary theory doesn't fully persuade the court.

Respond with ONLY a JSON object with exactly these keys:
{
  "case_theme": a one-sentence theme/theory that frames the whole case (the kind of line an advocate opens with),
  "controlling_law": array of the specific provisions/precedents that actually govern this matter (name the law and section/article, e.g. "Section 497, CrPC 1898"),
  "facts_to_establish": array of the specific factual points that must be proven/established for this side to win,
  "points_to_attack": array of specific weaknesses, gaps, or contradictions in the OPPOSING side's likely case,
  "weaknesses_to_preempt": array of the strongest points AGAINST this side's own position, and in one clause each, how to defuse them,
  "relief_sought": the specific relief/order/verdict this side is asking the court for,
  "alternative_position": the fallback legal argument to make IN THE ALTERNATIVE if the primary theory does not fully succeed — must be a genuinely distinct legal basis, not a restatement of the primary theory,
  "alternative_relief": the relief that would follow from the alternative position (may be lesser than the primary relief sought, e.g. reduced sentence instead of acquittal)
}

CASE FACTS PROVIDED:
${caseFacts}`;

  const result = await generateContent({
    contents: 'Build the case theory as instructed and return the JSON.',
    systemInstruction,
    jsonMode: true,
    groundingQuery: caseFacts.slice(0, 2000), // pull real statute/precedent text into this step
    maxTokens: 3072,
  });

  return { theory: parseJsonSafe(result.text), tokens: result.tokens };
}

/**
 * STEP 1b — Citation check (deterministic, no extra LLM cost).
 * Independently checks every citation the case theory says it's relying on
 * against the local vetted law library — the same grounding/verification
 * pipeline the FIR/notice/judgment analysis features already use.
 */
async function checkCitations(caseFacts, controllingLaw) {
  try {
    const retrievedRows = await retrieveRelevantLawWithCitations(caseFacts.slice(0, 2000));
    const verification = verifyCitations(controllingLaw || [], retrievedRows, '');
    return { verification, summary: summarizeVerification(verification) };
  } catch (err) {
    logger.error('courtroomScriptService: citation check failed (continuing without it):', err.message || err);
    return { verification: [], summary: null };
  }
}

/**
 * STEP 1c — Precedent binding-strength analysis (deterministic, uses the
 * real citation graph — case_citations table via getRelatedCases — not a
 * fresh search). For every controlling-law citation that verified against
 * an actual local provision, pulls the judgments genuinely on record as
 * citing it, and classifies each as BINDING or PERSUASIVE on the hearing's
 * forum. This is exactly the distinction a senior advocate draws before
 * ever standing up to argue a precedent controls the outcome: a Supreme
 * Court judgment binds every court in Pakistan; a High Court judgment
 * binds subordinate courts within its own province and is only persuasive
 * elsewhere; anything else cited is persuasive at best.
 */
async function analyzePrecedentStrength(citationVerification, forum) {
  const provisionIds = (citationVerification || [])
    .filter((v) => v.status === 'verified_local' && v.matchedSourceId)
    .map((v) => v.matchedSourceId);
  if (provisionIds.length === 0) return [];

  try {
    const relatedCases = await getRelatedCases(provisionIds, 6);
    const forumProvince = provinceOf(forum);
    const isSubordinateForum = !/high court|supreme court/i.test(forum || '');

    return relatedCases.map((c) => {
      const court = (c.court || '').toLowerCase();
      let bindingStatus;
      if (court.includes('supreme court')) {
        bindingStatus = 'binding'; // binds every court in Pakistan
      } else if (court.includes('high court')) {
        const caseProvince = provinceOf(c.court);
        bindingStatus = isSubordinateForum && caseProvince && caseProvince === forumProvince
          ? 'binding'
          : 'persuasive';
      } else {
        bindingStatus = 'persuasive';
      }
      return {
        title: c.title, citation: c.citation, court: c.court, year: c.year,
        bindingStatus,
        verified: c.verified,
        citationContext: c.citation_context,
      };
    });
  } catch (err) {
    logger.error('courtroomScriptService: precedent strength analysis failed (continuing without it):', err.message || err);
    return [];
  }
}

/**
 * STEP 1d — Opposing argument & rebuttal.
 * Not an evidentiary objection (that's step 6) — this is the single
 * strongest SUBSTANTIVE argument opposing senior counsel is likely to make
 * against the whole case theory, rehearsed with a considered rebuttal
 * before it's ever heard out loud in court.
 */
async function draftOpposingArgumentAndRebuttal({ theory, caseType, role }) {
  const systemInstruction = `You are acting as devil's advocate for a moment: imagine you are the OPPOSING senior counsel in this ${caseType} matter, arguing against the "${role}"'s case theory below. What is the single STRONGEST substantive legal argument you would make against it — not a procedural objection, a real argument on the merits that a skilled opponent would actually raise?

Case theory you are arguing against:
Theme: ${theory.case_theme}
Controlling law relied on: ${(theory.controlling_law || []).join('; ')}
Weaknesses already identified in this case: ${(theory.weaknesses_to_preempt || []).map((w) => (typeof w === 'string' ? w : JSON.stringify(w))).join('; ')}

Then, switching back to being senior counsel FOR the "${role}", give a considered rebuttal to that argument — not a superficial dismissal, but the specific legal/factual response that actually answers it.

Respond with ONLY a JSON object with exactly these keys:
{
  "opposing_argument": the strongest substantive counter-argument, stated the way opposing counsel would actually argue it,
  "rebuttal": the specific, considered response to that exact argument
}`;

  const result = await generateContent({
    contents: 'Produce the opposing argument and rebuttal as instructed and return the JSON.',
    systemInstruction,
    jsonMode: true,
    disableSearch: true,
    appendSources: false,
    maxTokens: 1536,
  });

  return { exchange: parseJsonSafe(result.text), tokens: result.tokens };
}

/**
 * STEP 2 — Opening statement.
 */
async function draftOpeningStatement({ theory, caseType, role, forum, language }) {
  const systemInstruction = `You are a senior advocate delivering an OPENING STATEMENT in a ${caseType} matter as counsel for the "${role}"${forum ? ` before the ${forum}` : ''}. Address the court as ${addressForm(forum)}.

An opening statement FRAMES the case for the court — it previews what the evidence will show and why the law favours this side. It does NOT argue the law in depth (that's for closing) and it does NOT ask questions (that's examination). Keep it persuasive but measured — overstating what the evidence will show damages credibility later.

Base it on this case theory already worked out:
Theme: ${theory.case_theme}
Facts to establish: ${(theory.facts_to_establish || []).join('; ')}
Controlling law: ${(theory.controlling_law || []).join('; ')}

${languageInstruction(language)}
Write the full opening statement as it would actually be delivered in court, with the proper form of address, a clear roadmap of what will be shown, and a closing line that sets up the rest of the hearing. Use [CLIENT NAME], [CASE NUMBER], [DATE] placeholders for specifics not given.`;

  const result = await generateContent({
    contents: 'Deliver the opening statement now, in full.',
    systemInstruction,
    disableSearch: true,
    appendSources: false,
    maxTokens: 2048,
  });

  return { text: result.text, tokens: result.tokens };
}

/**
 * STEP 3 — Examination-in-chief (own witnesses).
 * Question lists only — see file header for why answers are never scripted.
 */
async function draftExaminationInChief({ theory, witnesses, caseType, role, language }) {
  const witnessList = witnesses.length
    ? witnesses.map((w, i) => `${i + 1}. ${w}`).join('\n')
    : '1. [WITNESS NAME] — [brief description of who they are / what they saw]';

  const systemInstruction = `You are a senior advocate preparing EXAMINATION-IN-CHIEF questions for your OWN witnesses in a ${caseType} matter, acting for the "${role}".

Examination-in-chief uses open, NON-LEADING questions ("What did you see...", "What happened next...", never "Isn't it true that...") to let the witness build the favourable narrative in their own words, laid out chronologically and building toward the facts that must be established.

Case theory to build toward — facts to establish: ${(theory.facts_to_establish || []).join('; ')}

Witnesses to examine:
${witnessList}

For EACH witness, produce a numbered list of examination-in-chief questions. After each question, in brackets, note in a few words which fact it is meant to establish. Do NOT write or invent the witness's answers — only the questions and their purpose. Group questions under a clear heading with the witness's name.

${languageInstruction(language)}
Output ONLY the examination-in-chief script — no preamble.`;

  const result = await generateContent({
    contents: 'Prepare the examination-in-chief questions now, in full.',
    systemInstruction,
    disableSearch: true,
    appendSources: false,
    maxTokens: 3072,
  });

  return { text: result.text, tokens: result.tokens };
}

/**
 * STEP 4 — Cross-examination (opposing side's witnesses).
 * Question lists only — same reasoning as examination-in-chief.
 */
async function draftCrossExamination({ theory, opposingWitnesses, caseType, role, language }) {
  const witnessList = opposingWitnesses.length
    ? opposingWitnesses.map((w, i) => `${i + 1}. ${w}`).join('\n')
    : '1. [OPPOSING WITNESS NAME] — [brief description of who they are / what they are expected to testify]';

  const systemInstruction = `You are a senior advocate preparing CROSS-EXAMINATION questions for the OPPOSING side's witnesses in a ${caseType} matter, acting for the "${role}".

Cross-examination uses SHORT, LEADING, CLOSED questions that control the witness and test credibility ("You did not report this for three days, correct?" not "Why didn't you report it?"). The goal is to expose inconsistencies, elicit favourable admissions, and attack the points identified below — never to let the opposing witness re-narrate their story freely.

Points to attack in the opposing case: ${(theory.points_to_attack || []).join('; ')}

Opposing witnesses to cross-examine:
${witnessList}

For EACH witness, produce a numbered list of cross-examination questions, sequenced to build toward the key admission or contradiction rather than revealing the point too early. After each question, in brackets, note in a few words its strategic purpose (e.g. "[tests reliability of identification]"). Do NOT invent the witness's answers — only the questions and their purpose. Group questions under a clear heading with the witness's name.

${languageInstruction(language)}
Output ONLY the cross-examination script — no preamble.`;

  const result = await generateContent({
    contents: 'Prepare the cross-examination questions now, in full.',
    systemInstruction,
    disableSearch: true,
    appendSources: false,
    maxTokens: 3072,
  });

  return { text: result.text, tokens: result.tokens };
}

/**
 * STEP 5 — Re-examination (redirect), own witnesses.
 */
async function draftReExamination({ witnesses, crossExamination, caseType, role, language }) {
  const witnessList = witnesses.length
    ? witnesses.map((w, i) => `${i + 1}. ${w}`).join('\n')
    : '1. [WITNESS NAME]';

  const systemInstruction = `You are a senior advocate preparing RE-EXAMINATION (redirect) questions for your OWN witnesses in a ${caseType} matter, acting for the "${role}", immediately after the opposing side's cross-examination below.

Re-examination is NARROW by rule: it may only clarify or rehabilitate points that cross-examination actually raised — it is not a second examination-in-chief and must not introduce new matter. For each likely line of attack in the cross-examination below, prepare a short, targeted re-examination question that lets the witness clarify or explain it (e.g. explaining an apparent inconsistency, or context cross left out).

Witnesses:
${witnessList}

The cross-examination this re-examination must respond to:
${crossExamination}

For EACH witness, produce a short numbered list of re-examination questions, each tied (in brackets) to the specific cross-examination point it rehabilitates. Do NOT invent the witness's answers — only the questions and their purpose. If a witness's cross-examination raised nothing that needs rehabilitating, say so briefly instead of inventing questions.

${languageInstruction(language)}
Output ONLY the re-examination script — no preamble.`;

  const result = await generateContent({
    contents: 'Prepare the re-examination questions now, in full.',
    systemInstruction,
    disableSearch: true,
    appendSources: false,
    maxTokens: 2048,
  });

  return { text: result.text, tokens: result.tokens };
}

/**
 * STEP 6 — Anticipated objections and responses (evidentiary, procedural —
 * distinct from step 1d's substantive opposing argument).
 */
async function draftAnticipatedObjections({ examinationInChief, crossExamination, caseType, role }) {
  const systemInstruction = `You are a senior advocate preparing for a ${caseType} hearing as counsel for the "${role}". Review the examination-in-chief and cross-examination questions below and anticipate the OBJECTIONS opposing counsel is likely to raise against them (e.g. leading question in examination-in-chief, relevance, hearsay, assumes facts not in evidence, argumentative, asked and answered), and separately, objections THIS side should be ready to raise against the opposing side's questioning.

EXAMINATION-IN-CHIEF:
${examinationInChief}

CROSS-EXAMINATION:
${crossExamination}

Respond with ONLY a JSON object with exactly these keys:
{
  "objections_we_may_face": array of objects, each {"question_context": short quote/paraphrase of which question is vulnerable, "likely_objection": the specific objection ground, "our_response": how to respond or rephrase to overcome it},
  "objections_we_should_raise": array of objects, each {"question_context": short quote/paraphrase of the opposing question this targets, "objection_ground": the specific objection to raise, "when_to_raise": brief note on timing/tactics}
}
Keep entries specific to the actual questions above, not generic trial-advocacy advice. If a category genuinely doesn't apply, return an empty array for it rather than inventing entries.`;

  const result = await generateContent({
    contents: 'Prepare the anticipated objections analysis as instructed and return the JSON.',
    systemInstruction,
    jsonMode: true,
    disableSearch: true,
    appendSources: false,
    maxTokens: 2048,
  });

  return { objections: parseJsonSafe(result.text), tokens: result.tokens };
}

/**
 * STEP 7 — Anticipated bench queries.
 */
async function draftBenchQueries({ theory, caseType, role, forum }) {
  const systemInstruction = `You are a senior advocate preparing for a ${caseType} hearing as counsel for the "${role}"${forum ? ` before the ${forum}` : ''}. Anticipate the questions the JUDGE/BENCH is likely to put to counsel during the hearing — the sharpest, most testing questions a judge would actually ask about this case theory, not softball questions.

Case theory:
Theme: ${theory.case_theme}
Controlling law: ${(theory.controlling_law || []).join('; ')}
Weaknesses already identified: ${(theory.weaknesses_to_preempt || []).map((w) => (typeof w === 'string' ? w : JSON.stringify(w))).join('; ')}

Respond with ONLY a JSON object with this key:
{
  "bench_queries": array of objects, each {"question": the judge's likely question, "prepared_answer": a concise, direct answer counsel should be ready to give — a few sentences, not a speech}
}
Produce 4-6 realistic queries, prioritising the ones that probe this side's actual weak points rather than easy questions.`;

  const result = await generateContent({
    contents: 'Prepare the anticipated bench queries as instructed and return the JSON.',
    systemInstruction,
    jsonMode: true,
    disableSearch: true,
    appendSources: false,
    maxTokens: 2048,
  });

  return { benchQueries: parseJsonSafe(result.text)?.bench_queries || [], tokens: result.tokens };
}

/**
 * STEP 8 — Closing arguments. Now also argues the alternative position and
 * pre-empts the anticipated opposing argument with the rebuttal already
 * prepared in step 1d, instead of leaving those as separate, unused notes.
 */
async function draftClosingArguments({ theory, opposingExchange, caseType, role, forum, language }) {
  const systemInstruction = `You are a senior advocate delivering CLOSING ARGUMENTS in a ${caseType} matter as counsel for the "${role}"${forum ? ` before the ${forum}` : ''}. Address the court as ${addressForm(forum)}.

Unlike the opening statement, closing arguments ARGUE — tie the evidence the examination was designed to bring out to the controlling law, address the opposing side's likely arguments head-on, argue the fallback position in the alternative, and end with a clear, specific request for relief.

Case theory:
Theme: ${theory.case_theme}
Controlling law: ${(theory.controlling_law || []).join('; ')}
Facts established through examination: ${(theory.facts_to_establish || []).join('; ')}
Weaknesses already pre-empted: ${(theory.weaknesses_to_preempt || []).map((w) => (typeof w === 'string' ? w : JSON.stringify(w))).join('; ')}
Relief sought: ${theory.relief_sought || '[state the relief sought]'}
Alternative position (to argue "in the alternative" if the primary theory does not fully persuade): ${theory.alternative_position || '[none identified]'}
Alternative relief: ${theory.alternative_relief || '[none identified]'}

The single strongest argument opposing counsel is expected to make, and the rebuttal already prepared for it — work this rebuttal into the closing naturally, at the point where it is most persuasive to pre-empt it:
Opposing argument: ${opposingExchange?.opposing_argument || '[none identified]'}
Prepared rebuttal: ${opposingExchange?.rebuttal || '[none identified]'}

${languageInstruction(language)}
Write the full closing argument as it would actually be delivered in court: summarise what the evidence showed, apply the law provision-by-provision to those facts, pre-empt the opposing side's strongest counter-argument using the rebuttal above, argue the alternative position briefly toward the end ("Without prejudice to the foregoing, and in the alternative, ..."), and close with the specific primary relief requested (naming the alternative relief only as a fallback). Use [CLIENT NAME], [CASE NUMBER] placeholders for specifics not given.`;

  const result = await generateContent({
    contents: 'Deliver the closing arguments now, in full.',
    systemInstruction,
    disableSearch: true,
    appendSources: false,
    maxTokens: 3584,
  });

  return { text: result.text, tokens: result.tokens };
}

function formatThreshold(threshold) {
  if (!threshold || Object.keys(threshold).length === 0) return '_Threshold assessment unavailable._';
  const issues = threshold.maintainability_issues || [];
  const issueLines = issues.length
    ? issues.map((i) => `- **${i.issue}** [${(i.severity || 'unknown').toUpperCase()}] — ${i.assessment}`).join('\n')
    : '- No maintainability issues identified from the facts given.';
  return `${issueLines}\n\n**Limitation:** ${threshold.limitation_assessment || 'Not assessed.'}\n**Jurisdiction:** ${threshold.jurisdiction_assessment || 'Not assessed.'}\n**Recommendation:** ${threshold.proceed_recommendation || 'Not assessed.'}`;
}

function formatCitationCheck(verification, summary) {
  if (!summary || summary.total === 0) {
    return '_No controlling-law citations to check, or the local law library was unavailable._';
  }
  const lines = verification.map((v) => {
    const badge = v.status === 'verified_local' ? `✓ verified (${v.matchQuality || 'match'} — ${v.matchedSource || 'local library'})`
      : v.status === 'verified_live' ? '✓ verified (live search)'
      : '⚠ unverified — confirm independently before relying on this in court';
    return `- **${v.citation}** — ${badge}`;
  });
  return `${lines.join('\n')}\n\n_${summary.verified_local + summary.verified_live}/${summary.total} citations verified against available sources._`;
}

function formatPrecedentStrength(precedents) {
  if (!precedents?.length) return '_No related judgments found on record for the verified citations above._';
  return precedents.map((p) =>
    `- **${p.title || p.citation || 'Untitled judgment'}**${p.court ? ` (${p.court}${p.year ? `, ${p.year}` : ''})` : ''} — **${p.bindingStatus.toUpperCase()}**${p.bindingStatus === 'persuasive' ? ' on this forum, cite with that caveat' : ' on this forum'}`
  ).join('\n');
}

function formatOpposingExchange(exchange) {
  if (!exchange?.opposing_argument) return '_Not generated._';
  return `**Opposing counsel's likely strongest argument:** ${exchange.opposing_argument}\n\n**Our prepared rebuttal:** ${exchange.rebuttal}`;
}

function formatObjections(objections) {
  const weMayFace = objections?.objections_we_may_face || [];
  const weShouldRaise = objections?.objections_we_should_raise || [];
  const section = (title, items, ctxKey, extraKey, extraLabel) => {
    if (!items.length) return `**${title}:** none identified.`;
    const lines = items.map((o) =>
      `- *${o[ctxKey] || ''}* — ${o.likely_objection || o.objection_ground || ''}${o[extraKey] ? `\n  - ${extraLabel}: ${o[extraKey]}` : ''}`
    );
    return `**${title}:**\n${lines.join('\n')}`;
  };
  return [
    section('Objections we may face', weMayFace, 'question_context', 'our_response', 'Response'),
    section('Objections we should raise', weShouldRaise, 'question_context', 'when_to_raise', 'Timing/tactics'),
  ].join('\n\n');
}

function formatBenchQueries(benchQueries) {
  if (!benchQueries?.length) return '_No bench queries anticipated._';
  return benchQueries.map((q, i) => `${i + 1}. **Q:** ${q.question}\n   **Prepared answer:** ${q.prepared_answer}`).join('\n\n');
}

/**
 * Main entry point. Runs the chain sequentially (each step needs real
 * output from earlier steps, so this can't be parallelized) and returns
 * every section individually plus one combined, ready-to-read document.
 *
 * @param {Object} params
 * @param {string} params.caseFacts - the facts of the matter
 * @param {string} [params.caseType] - 'criminal' | 'civil' | other description
 * @param {string} [params.role] - e.g. 'defence', 'prosecution', 'plaintiff', 'respondent'
 * @param {string} [params.forum] - e.g. 'Sessions Court', 'Lahore High Court'
 * @param {string[]} [params.ownWitnesses] - names/descriptions of this side's witnesses
 * @param {string[]} [params.opposingWitnesses] - names/descriptions of the opposing side's witnesses
 * @param {string} [params.language] - 'english' | 'urdu' | 'roman_urdu' | 'bilingual'
 */
async function generateCourtroomScript({
  caseFacts, caseType = 'civil', role = 'the party', forum = '',
  ownWitnesses = [], opposingWitnesses = [], language = 'english',
}) {
  if (!caseFacts?.trim()) {
    throw new Error('generateCourtroomScript: caseFacts is required.');
  }

  logger.info(`generateCourtroomScript: starting chain (caseType=${caseType}, role=${role}).`);

  let totalOutputTokens = 0;
  const track = (t) => { totalOutputTokens += t?.output_tokens || 0; };

  const { threshold, tokens: thresholdTokens } = await assessThreshold({ caseFacts, caseType, role, forum });
  track(thresholdTokens);

  const { theory, tokens: theoryTokens } = await buildCaseTheory({ caseFacts, caseType, role, forum });
  track(theoryTokens);

  // Deterministic, no LLM cost — runs right after theory/citations are known.
  const { verification: citationVerification, summary: citationSummary } =
    await checkCitations(caseFacts, theory.controlling_law);
  const precedentStrength = await analyzePrecedentStrength(citationVerification, forum);

  const { exchange: opposingExchange, tokens: opposingTokens } = await draftOpposingArgumentAndRebuttal({ theory, caseType, role });
  track(opposingTokens);

  const { text: openingStatement, tokens: openingTokens } = await draftOpeningStatement({ theory, caseType, role, forum, language });
  track(openingTokens);

  const { text: examinationInChief, tokens: examTokens } = await draftExaminationInChief({ theory, witnesses: ownWitnesses, caseType, role, language });
  track(examTokens);

  const { text: crossExamination, tokens: crossTokens } = await draftCrossExamination({ theory, opposingWitnesses, caseType, role, language });
  track(crossTokens);

  const { text: reExamination, tokens: reExamTokens } = await draftReExamination({ witnesses: ownWitnesses, crossExamination, caseType, role, language });
  track(reExamTokens);

  const { objections, tokens: objectionTokens } = await draftAnticipatedObjections({ examinationInChief, crossExamination, caseType, role });
  track(objectionTokens);

  const { benchQueries, tokens: benchTokens } = await draftBenchQueries({ theory, caseType, role, forum });
  track(benchTokens);

  const { text: closingArguments, tokens: closingTokens } = await draftClosingArguments({ theory, opposingExchange, caseType, role, forum, language });
  track(closingTokens);

  const combinedMarkdown = `# Courtroom Script — ${caseType.toUpperCase()} matter (${role})
${forum ? `**Forum:** ${forum}\n` : ''}
## 0. Threshold Check (Maintainability, Limitation, Jurisdiction)
${formatThreshold(threshold)}

## Case Theory
- **Theme:** ${theory.case_theme || '[not determined]'}
- **Controlling law:** ${(theory.controlling_law || []).join('; ') || '[not determined]'}
- **Relief sought:** ${theory.relief_sought || '[not determined]'}
- **Alternative position (in the alternative):** ${theory.alternative_position || '[none identified]'}
- **Alternative relief:** ${theory.alternative_relief || '[none identified]'}

## Citation Check
${formatCitationCheck(citationVerification, citationSummary)}

## Precedent Strength (Binding vs Persuasive on this Forum)
${formatPrecedentStrength(precedentStrength)}

## Anticipated Opposing Argument & Rebuttal
${formatOpposingExchange(opposingExchange)}

---

## 1. Opening Statement

${openingStatement}

---

## 2. Examination-in-Chief

${examinationInChief}

---

## 3. Cross-Examination

${crossExamination}

---

## 4. Re-Examination (Redirect)

${reExamination}

---

## 5. Anticipated Objections & Responses

${formatObjections(objections)}

---

## 6. Anticipated Bench Queries

${formatBenchQueries(benchQueries)}

---

## 7. Closing Arguments

${closingArguments}

---
⚖️ **DISCLAIMER**: This is preparation material for rehearsal purposes only. Examination, cross-examination, and re-examination are prepared QUESTIONS, not scripted answers — real witness testimony must be followed live in court, and questioning must adapt to what a witness actually says. Citations marked "unverified" and precedents marked "persuasive" must be independently confirmed/weighed before relying on them. The threshold and precedent-strength assessments are analytical aids, not a substitute for an advocate's own review of limitation, maintainability, and case law hierarchy. All content must be reviewed by a qualified advocate before use in any actual hearing.`;

  return {
    threshold,
    theory,
    citationVerification,
    citationSummary,
    precedentStrength,
    opposingExchange,
    openingStatement,
    examinationInChief,
    crossExamination,
    reExamination,
    anticipatedObjections: objections,
    benchQueries,
    closingArguments,
    combinedMarkdown,
    tokens: { output_tokens: totalOutputTokens },
  };
}

module.exports = { generateCourtroomScript };
