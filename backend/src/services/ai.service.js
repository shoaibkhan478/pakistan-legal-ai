/**
 * AI Service - Google Gemini Integration (FREE TIER)
 * All AI-powered legal features, routed through Gemini's REST API via
 * native fetch (v1beta endpoint, which supports systemInstruction).
 *
 * Uses fetch directly instead of the @google/generative-ai SDK — this
 * avoids the "Premature close" style incompatibility we hit earlier with
 * the Anthropic SDK on this machine's Node/TLS stack. Same approach,
 * proven to work.
 *
 * Get a FREE API key (no credit card needed) at:
 * https://aistudio.google.com/apikey
 */
// ============================================
// Smart Retry Wrapper for Gemini API calls
// Reads Google's exact suggested wait time from error and retries accordingly
// ============================================
async function callGeminiWithRetry(fn, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const isRateLimited = status === 429;
      const isOverloaded = status === 503;

      if ((isRateLimited || isOverloaded) && attempt < maxRetries) {
        // Try to extract Google's exact suggested wait time from error message
        let waitMs = 3000; // fallback default (3 sec)
        const rawMsg = err?.message || JSON.stringify(err?.details || {});

        const match =
          rawMsg.match(/retry in ([\d.]+)s/i) ||
          rawMsg.match(/"retryDelay":"(\d+)s"/i);

        if (match) {
          waitMs = Math.ceil(parseFloat(match[1]) * 1000) + 500; // +500ms buffer
        }

        logger.warn(
          `[Gemini] Status ${status} received. Waiting ${waitMs}ms before retry #${attempt + 1}/${maxRetries}...`
        );

        await new Promise((res) => setTimeout(res, waitMs));
        continue; // retry the loop
      }

      // Not retryable (some other error), or retries exhausted — throw a clean error
      if (isRateLimited) {
        const rateLimitError = new Error(
          "AI service is currently rate-limited. Please wait a minute and try again."
        );
        rateLimitError.status = 429;
        throw rateLimitError;
      }
      if (isOverloaded) {
        const overloadError = new Error(
          "AI service is temporarily overloaded. Please try again in a moment."
        );
        overloadError.status = 503;
        throw overloadError;
      }
      throw err; // some other unrelated error — pass through as-is
    }
  }
}

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const logger = require('../utils/logger');
const { retrieveRelevantLaw } = require('./legalRetrievalService');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_VERSION = 'v1beta';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  logger.error('GEMINI_API_KEY is not set. AI features will not work until it is configured in backend/.env.');
}

const DISCLAIMER = `

---
⚖️ **DISCLAIMER**: AI-generated content is for legal research, drafting assistance and educational purposes only. All drafts must be reviewed by a qualified advocate before legal use.`;

const SYSTEM_PROMPT_BASE = `You are Pakistan Legal AI Agent — you must reason and answer like a senior Pakistani Supreme Court advocate conducting real legal research, not like a general-purpose chatbot giving casual information.

Your expertise covers:
- Constitution of Pakistan 1973
- Pakistan Penal Code (PPC)
- Code of Criminal Procedure (CrPC)
- Civil Procedure Code (CPC)
- Family Laws, Contract Act, Transfer of Property Act
- High Court and Supreme Court rules and judgments
- All Provincial laws and regulations
- FIR procedures, bail laws, evidence law
- Legal drafting in Pakistani courts

MANDATORY RESEARCH DISCIPLINE (this is what separates a real advocate from a generic AI):
1. You have a Google Search tool. USE IT for any question involving a specific section, article, statute, amendment, or case law — do not answer from memory alone when a quick search can confirm or update the exact text/number/citation.
2. Always cite the exact source when you state a rule: e.g. "Section 154, CrPC 1898" or "Article 10-A, Constitution of Pakistan 1973" — never state a legal rule without naming which law and which provision it comes from.
3. If you reference a case (precedent), only cite a case name/citation if you are actually confident it is real and correctly described (ideally confirmed via search). NEVER invent or guess a case name, citation, or judgment outcome — a fabricated case citation is a serious professional failure for a lawyer. If you are not certain a specific precedent exists, say so plainly instead of making one up.
4. If a law may have been amended or repealed, or if you are not fully certain your information is current, say so explicitly and recommend the user verify with a recent search or a practicing advocate — do not present uncertain information as settled fact.
5. Structure substantive legal answers like a legal opinion where appropriate: (a) the applicable law/provision, (b) how it applies to the facts asked about, (c) practical next steps, (d) limitations/caveats.
6. Never guess at case outcomes, sentencing, or timelines — Pakistani courts vary case-by-case; give the legal framework and realistic ranges, not false certainty.

CONSULTATIVE BEHAVIOR (act like a lawyer meeting a client, not a search engine):
1. If the user's question is about their own situation/case but they haven't given enough facts to advise properly (e.g. what exactly happened, what section the FIR/notice cites, what stage the matter is at, which city/province, timeline), ASK for the missing key facts first — briefly, 2-4 specific questions — before giving a full opinion. Don't interrogate for information that doesn't change the answer.
2. Once you have enough facts (either given upfront or after asking), apply the law specifically to those facts — don't just recite the law in the abstract. Explicitly connect: "In your situation, since X happened, Section/Article Y applies because..."
3. After the legal analysis, give concrete, practical next steps in the order the user should take them (e.g. "1. File X at Y court/station, 2. Gather these documents, 3. Consider Z").
4. If relevant, proactively offer to draft the actual document they'd need (application, bail petition, legal notice, affidavit, reply) based on their facts — ask if they want you to draft it now.
5. Flag realistic risks, likely counterarguments, or where outcomes depend on judicial discretion — a real advocate manages expectations honestly rather than promising outcomes.

FORMATTING: This chat interface renders Markdown, NOT HTML. Never use HTML tags like <br>, <details>, <summary>, <div>, etc. — they will show up as literal text and look broken. For line breaks use a blank line; for headings use Markdown (## Heading); for lists use "-" or "1."; for emphasis use **bold** or *italic*. If you want to show statute text you quoted/found via search, just put it under a normal Markdown heading like "**Relevant Provisions:**" followed by a plain list — do not wrap it in a collapsible/details element.

You respond in the language the user writes in:
- If they write in English → respond in English
- If they write in Urdu → respond in Urdu
- If they write in Roman Urdu → respond in Roman Urdu

Always be professional, precise, and add the disclaimer at the end.`;

/**
 * Normalizes chat entries into Gemini's "contents" format:
 * [{ role: 'user'|'model', parts: [{ text }] }]
 *
 * Accepts:
 *  - a plain string
 *  - an array of { role: 'user'|'assistant', content: string } (Anthropic/controller-shaped)
 *  - an array of { role, message: string }
 *  - an array already in Gemini's { role, parts } shape
 */
function normalizeContents(contents) {
  if (typeof contents === 'string') {
    return [{ role: 'user', parts: [{ text: contents }] }];
  }

  if (!Array.isArray(contents)) {
    throw new Error('Invalid "contents" passed to generateContent().');
  }

  return contents.map((entry) => {
    const role = entry.role === 'assistant' ? 'model' : (entry.role || 'user');

    if (Array.isArray(entry.parts)) {
      return { role, parts: entry.parts };
    }
    if (typeof entry.content === 'string') {
      return { role, parts: [{ text: entry.content }] };
    }
    if (typeof entry.message === 'string') {
      return { role, parts: [{ text: entry.message }] };
    }
    throw new Error('Invalid message entry passed to generateContent().');
  });
}

/**
 * Pulls relevant chunks (Constitution articles, statute sections, reported
 * judgments) out of our own local law library (pgvector + full-text hybrid
 * search — see legalRetrievalService.js) and formats them into a block the
 * model can quote directly, with citations, before it ever has to guess or
 * fall back to live search.
 *
 * Fail-soft by design: if the DB isn't reachable, the knowledge base is
 * empty, or embeddings aren't configured (OPENAI_API_KEY), we log a warning
 * and return an empty string — the AI still works via Google Search
 * grounding, it just won't have "book" context for that turn.
 *
 * @param {string} query - the user's question / document text to ground against
 * @returns {Promise<string>}
 */
async function retrieveLawContext(query) {
  if (!query || !query.trim()) return '';

  try {
    const { constitution, statute, judgment } = await retrieveRelevantLaw(query.slice(0, 2000));

    const sections = [];
    const render = (label, rows) => {
      if (!rows?.length) return;
      sections.push(
        `**${label} (from local library):**\n` +
        rows
          .map((r) => {
            const heading = [r.statute_name, r.article_or_section, r.citation, r.title]
              .filter(Boolean)
              .join(' — ');
            return `- [${heading}] ${r.full_text.slice(0, 900)}`;
          })
          .join('\n')
      );
    };

    render('Constitution of Pakistan', constitution);
    render('Statutory provisions', statute);
    render('Reported judgments', judgment);

    if (sections.length === 0) return '';

    return `\n\nRELEVANT MATERIAL RETRIEVED FROM OUR OWN VERIFIED LAW LIBRARY (these are real excerpts already confirmed to exist — prefer quoting/citing these over guessing, and cross-check with live search only for anything not covered here):\n\n${sections.join('\n\n')}`;
  } catch (error) {
    logger.error('retrieveLawContext: local law library lookup failed (continuing without it):', error.message || error);
    return '';
  }
}

/**
 * Core wrapper that communicates with the Gemini API.
 *
 * @param {Object} params
 * @param {string|Array} params.contents
 * @param {string} [params.systemInstruction]
 * @param {boolean} [params.jsonMode]
 * @param {number} [params.maxTokens]
 * @param {string} [params.groundingQuery] - text to search our local law
 *   library against; if provided, matching chunks are injected into the
 *   system instruction before the model answers.
 */
async function generateContent({ contents, systemInstruction, jsonMode = false, maxTokens = 4096, groundingQuery }) {
  try {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const geminiContents = normalizeContents(contents);

    const lawContext = groundingQuery ? await retrieveLawContext(groundingQuery) : '';

    let system = SYSTEM_PROMPT_BASE;
    if (systemInstruction) {
      system += `\n\n${systemInstruction}`;
    }
    if (lawContext) {
      system += lawContext;
    }
    if (jsonMode) {
      system += '\n\nIMPORTANT: Respond with ONLY valid, raw JSON. No markdown code fences, no commentary, no explanation before or after the JSON.';
    }

    const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL}:generateContent?key=${apiKey}`;

    const requestBody = JSON.stringify({
      contents: geminiContents,
      systemInstruction: { parts: [{ text: system }] },
      // Grounds answers in live Google Search results instead of relying
      // solely on the model's training data — important for legal
      // accuracy (current sections, amendments, real case citations).
      // Skipped in jsonMode since grounding + forced JSON output don't
      // combine well in the API.
      ...(jsonMode ? {} : { tools: [{ google_search: {} }] }),
      generationConfig: {
        maxOutputTokens: maxTokens,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    });

    // Wrapped in callGeminiWithRetry: if Gemini returns 429 (rate-limited)
    // or 503 (overloaded), this automatically waits the time Google
    // suggests and retries, instead of failing immediately.
    const data = await callGeminiWithRetry(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const json = await res.json();

      if (!res.ok) {
        const message = json?.error?.message || `Gemini API returned HTTP ${res.status}`;
        const err = new Error(message);
        err.status = res.status;
        err.details = json;
        throw err;
      }

      return json;
    });

    const candidate = data.candidates?.[0];

    const text = (candidate?.content?.parts || [])
      .map((p) => p.text || '')
      .join('\n');

    // If the model actually used search grounding, surface the source URLs
    // so the user (and their advocate) can verify the research.
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((c) => c.web?.uri && c.web?.title ? `- [${c.web.title}](${c.web.uri})` : null)
      .filter(Boolean);
    const sourcesBlock = sources.length
      ? `\n\n**Sources consulted (verify before relying on these):**\n${sources.join('\n')}`
      : '';

    return {
      text: jsonMode ? text : text + sourcesBlock + DISCLAIMER,
      tokens: {
        input_tokens: data.usageMetadata?.promptTokenCount || 0,
        output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  } catch (error) {
    logger.error('Gemini API request failed:', error.message || error);
    throw error;
  }
}

/**
 * Safe utility to extract and parse structured JSON response blocks.
 */
function parseJsonSafe(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response from generative service.');
  }

  let cleanText = rawText.trim();

  const fenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleanText = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    // Fallback: the response may have been cut off mid-string because it
    // hit the maxOutputTokens limit before finishing the JSON object. Try
    // to salvage a valid object by trimming back to the last complete
    // top-level "}" and re-attempting the parse, instead of failing outright.
    const lastBrace = cleanText.lastIndexOf('}');
    if (lastBrace > -1) {
      const salvaged = cleanText.slice(0, lastBrace + 1);
      try {
        const parsed = JSON.parse(salvaged);
        logger.error('AI response was truncated but salvaged after trimming trailing incomplete content.');
        return parsed;
      } catch (err2) {
        // fall through to the error below
      }
    }
    logger.error('Failed to parse JSON from AI response:', err.message, '\nRaw text (first 500 chars):', cleanText.slice(0, 500));
    throw new Error('AI response was not valid JSON.');
  }
}

/**
 * Legal chat entry point used by chat.controller.js.
 *
 * @param {Array} chatMessages - array of { role: 'user'|'assistant', content: string }
 * @param {string} [context]
 * @returns {Promise<{content: string, tokens: object, model: string}>}
 */
async function legalChat(chatMessages, context = '') {
  const systemInstruction = context
    ? `Additional context for this conversation:\n${context}`
    : undefined;

  // Ground every chat turn in our local law library, keyed off the latest
  // user message (that's the actual question being asked right now).
  const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === 'user');
  const groundingQuery = lastUserMsg?.content || lastUserMsg?.message || '';

  const result = await generateContent({
    contents: chatMessages,
    systemInstruction,
    groundingQuery,
  });

  return {
    content: result.text,
    tokens: result.tokens,
    model: MODEL,
  };
}

/**
 * Legal research entry point used by research.routes.js.
 * Runs a grounded (local law library + live Google Search) research pass
 * on a free-form legal question and returns a full written answer with
 * citations, the same way the chat feature does, but framed explicitly as
 * a research task for a given jurisdiction.
 *
 * @param {string} researchQuery - the legal question / topic to research
 * @param {string} [jurisdiction] - defaults to 'Pakistan'
 * @returns {Promise<{content: string, tokens: object, model: string}>}
 */
async function legalResearch(researchQuery, jurisdiction = 'Pakistan') {
  const systemInstruction = `You are conducting formal legal research for a practising advocate. Jurisdiction: ${jurisdiction}. Research the topic/question below thoroughly: identify the exact applicable statutory provisions, and any real, verifiable case law/precedent (with citation) that bears on it. Structure the answer as a proper legal research memo: (1) applicable law, (2) analysis/discussion, (3) relevant precedent (if any, with citation — never invent one), (4) practical conclusion.`;

  const result = await generateContent({
    contents: `Research the following and answer as instructed:\n\n${researchQuery}`,
    systemInstruction,
    groundingQuery: researchQuery,
    maxTokens: 8192,
  });

  return {
    content: result.text,
    tokens: result.tokens,
    model: MODEL,
  };
}

/**
 * Performs a live, non-JSON Gemini call with Google Search grounding
 * (searches the open web, including Pakistani court and law-reporting
 * sites) to pull the exact current statutory citations and any REAL,
 * verifiable Supreme Court / High Court judgments relevant to the given
 * case facts.
 *
 * Why this exists: the structured analysis functions below (analyzeFIR,
 * analyzeNotice, analyzeJudgment, analyzePlaint) run in jsonMode, and
 * jsonMode disables the Google Search tool on that same call (Gemini
 * doesn't support forced-JSON output + live search together). So we run
 * this as a separate, ungrounded-JSON research pass first, then fold its
 * (cited, verifiable) findings into the system instruction of the JSON
 * call that follows — giving the structured analysis real, current legal
 * authority instead of relying only on the model's memorized training data
 * or the (possibly still-empty) local law library.
 *
 * Fail-soft: never throws — if the search pass fails for any reason, the
 * calling function simply proceeds without this extra context.
 *
 * @param {string} caseFactsQuery - the FIR/notice/judgment/plaint text (or a summary of it)
 * @param {string} focusInstruction - one sentence telling the model what angle to research
 * @returns {Promise<string>} formatted bullet-point research findings with citations + source links, or '' on failure
 */
async function fetchLiveCaseLawContext(caseFactsQuery, focusInstruction) {
  if (!caseFactsQuery || !caseFactsQuery.trim()) return '';

  try {
    const systemInstruction = `You are a Pakistani legal researcher doing preparatory research before a senior advocate writes a formal legal analysis. ${focusInstruction}

Use Google Search to find:
1. The EXACT, currently-in-force statutory provisions (Constitution of Pakistan / PPC / CrPC / CPC / relevant special law) that apply to these facts, with precise section/article numbers.
2. Any REAL, verifiable Supreme Court of Pakistan or High Court judgments directly relevant, with a proper citation (e.g. PLD, SCMR, CLC, YLR, MLD series) and a one-line statement of what each held.

STRICT RULE: only include a judgment if you are genuinely confident it is real and you can give its citation. If you cannot confirm a specific precedent, write "No specific confirmed precedent found for this point" instead of guessing or inventing a case name/citation — a fabricated citation is unacceptable.

Be concise: short bullet points only, no long essay.

CASE FACTS:
${caseFactsQuery.slice(0, 3000)}`;

    const result = await generateContent({
      contents: 'Research and list the applicable law and any confirmed precedents, exactly as instructed.',
      systemInstruction,
      jsonMode: false,
      maxTokens: 2048,
    });

    return result.text || '';
  } catch (error) {
    logger.error('fetchLiveCaseLawContext: live search pass failed (continuing without it):', error.message || error);
    return '';
  }
}

// ============================================================
// FIR ANALYSIS
// ============================================================

const FIR_ANALYSIS_SCHEMA_HINT = `Respond with ONLY a JSON object with exactly these keys:
{
  "fir_number": string|null,
  "police_station": string|null,
  "complainant_name": string|null,
  "accused_names": string[],
  "sections_applied": string[],
  "allegations": string,
  "bail_possibility": "bailable"|"non-bailable"|"uncertain",
  "bail_reasoning": string,
  "defence_suggestions": string[],
  "weak_points": string[],
  "strong_points": string[],
  "legal_references": string[],
  "summary": string
}
Where "legal_references" is a list of the specific statutory provisions and/or confirmed case citations you relied on (e.g. "Section 497 CrPC — bail in non-bailable offences", "PLD 2019 SC 1 — <one-line holding>"). Leave it as an empty array if none can be confidently cited.`;

async function analyzeFIR(firText) {
  const liveCaseLaw = await fetchLiveCaseLawContext(
    firText,
    'You are reviewing an FIR to determine bailability and to find precedents useful for a bail application.'
  );
  const liveCaseLawBlock = liveCaseLaw
    ? `\n\nLIVE LEGAL RESEARCH (just retrieved via Google Search — cite these citations where relevant, but note to the reader that they should still be verified):\n${liveCaseLaw}\n`
    : '';

  const systemInstruction = `You are analyzing a First Information Report (FIR) registered under Pakistani criminal procedure. Read it like a defence advocate preparing for a bail hearing: identify every section invoked, whether the offence(s) are bailable or non-bailable under CrPC/relevant special law, and concrete weaknesses in the prosecution's case (delay in FIR, contradictions, absence of independent witnesses, mala fide, etc.) that a bail application could rely on.${liveCaseLawBlock}\n\n${FIR_ANALYSIS_SCHEMA_HINT}\n\nFIR TEXT:\n${firText}`;

  const result = await generateContent({
    contents: 'Analyze this FIR as instructed and return the JSON.',
    systemInstruction,
    jsonMode: true,
    groundingQuery: firText,
    maxTokens: 8192,
  });

  return { analysis: parseJsonSafe(result.text), tokens: result.tokens };
}

async function generateBailApplication(firAnalysis, bailType = 'pre_arrest', additionalInfo = '') {
  const isPreArrest = bailType === 'pre_arrest';
  const analysisJson = typeof firAnalysis === 'string' ? firAnalysis : JSON.stringify(firAnalysis, null, 2);

  const systemInstruction = `Draft a complete, court-ready ${isPreArrest ? 'PRE-ARREST' : 'POST-ARREST'} bail application for a Pakistani ${isPreArrest ? 'Sessions Court / High Court (under Section 498, CrPC)' : 'court (under Section 497, CrPC)'}, based on the FIR analysis below. Follow standard Pakistani bail petition drafting format: title/heading with court name placeholder, parties, "Respectfully Submitted" facts paragraphs (numbered), grounds for bail (numbered, each grounded in a specific weak point from the analysis and, where applicable, a real cited precedent), and prayer clause. Use placeholders like [COURT NAME], [PETITIONER NAME], [DATE] where case-specific details aren't given. Weave in the weak points and defence suggestions from the analysis as the grounds for bail.\n\nFIR ANALYSIS:\n${analysisJson}\n\nADDITIONAL INFO FROM CLIENT:\n${additionalInfo || 'None provided.'}`;

  const groundingQuery = [
    Array.isArray(firAnalysis?.sections_applied) ? firAnalysis.sections_applied.join(' ') : '',
    firAnalysis?.allegations || '',
    'bail application grounds',
  ].join(' ');

  const result = await generateContent({
    contents: 'Draft the bail application now, in full.',
    systemInstruction,
    groundingQuery,
    maxTokens: 8192,
  });

  return { content: result.text, tokens: result.tokens };
}

// ============================================================
// LEGAL NOTICE ANALYSIS
// ============================================================

async function analyzeLegalNotice(noticeText) {
  const liveCaseLaw = await fetchLiveCaseLawContext(
    noticeText,
    'You are reviewing a legal notice to identify the exact legal basis for its demands and how the recipient could lawfully respond or defend against it.'
  );
  const liveCaseLawBlock = liveCaseLaw
    ? `\n\nLIVE LEGAL RESEARCH (just retrieved via Google Search — cite these citations where relevant, but note to the reader that they should still be verified):\n${liveCaseLaw}\n`
    : '';

  const systemInstruction = `You are analyzing a legal notice sent under Pakistani law. Identify what is being demanded, the legal basis claimed, and how the recipient could defend against or respond to it.${liveCaseLawBlock}\n\nRespond with ONLY a JSON object with exactly these keys:\n{\n  "notice_type": string,\n  "sender_name": string|null,\n  "recipient_name": string|null,\n  "demands": string[],\n  "legal_issues": string[],\n  "legal_references": string[],\n  "summary": string,\n  "defence_strategy": string\n}\nWhere "legal_references" lists the specific statutory provisions and/or confirmed case citations relied on. Leave it empty if none can be confidently cited.\n\nNOTICE TEXT:\n${noticeText}`;

  const result = await generateContent({
    contents: 'Analyze this legal notice as instructed and return the JSON.',
    systemInstruction,
    jsonMode: true,
    groundingQuery: noticeText,
    maxTokens: 8192,
  });

  return { analysis: parseJsonSafe(result.text), tokens: result.tokens };
}

async function generateNoticeReply(noticeAnalysis, recipientDetails = '') {
  const analysisJson = typeof noticeAnalysis === 'string' ? noticeAnalysis : JSON.stringify(noticeAnalysis, null, 2);

  const systemInstruction = `Draft a formal, court-admissible reply to the legal notice described below, in standard Pakistani legal-notice-reply format (advocate letterhead placeholder, reference to the original notice, paragraph-by-paragraph rebuttal of each demand, legal basis for the rebuttal, and closing paragraph). Use placeholders like [ADVOCATE NAME], [DATE] where specific details aren't given.\n\nNOTICE ANALYSIS:\n${analysisJson}\n\nRECIPIENT DETAILS:\n${recipientDetails || 'None provided.'}`;

  const groundingQuery = [
    Array.isArray(noticeAnalysis?.legal_issues) ? noticeAnalysis.legal_issues.join(' ') : '',
    Array.isArray(noticeAnalysis?.demands) ? noticeAnalysis.demands.join(' ') : '',
  ].join(' ');

  const result = await generateContent({
    contents: 'Draft the reply now, in full.',
    systemInstruction,
    groundingQuery,
    maxTokens: 8192,
  });

  return { content: result.text, tokens: result.tokens };
}

// ============================================================
// JUDGMENT ANALYSIS
// ============================================================

async function analyzeJudgment(judgmentText) {
  const liveCaseLaw = await fetchLiveCaseLawContext(
    judgmentText,
    'You are reviewing a court judgment/decree to check whether its reasoning is consistent with the applicable statute(s) and with binding/persuasive Supreme Court or High Court precedent, and to find grounds for appeal if any.'
  );
  const liveCaseLawBlock = liveCaseLaw
    ? `\n\nLIVE LEGAL RESEARCH (just retrieved via Google Search — cite these citations where relevant, but note to the reader that they should still be verified):\n${liveCaseLaw}\n`
    : '';

  const systemInstruction = `You are analyzing a Pakistani court judgment/decree the way a senior advocate would before deciding whether to appeal — and critically, you must ALSO assess whether the decree itself is legally sound, i.e. whether its reasoning and outcome are consistent with the applicable statute(s) and with binding/persuasive precedent (Supreme Court and High Court judgments), using the local-library and live-search material available to you.

Ground this consistency check in specific authority — name the statute provision or the case (with citation) that the decree agrees with or departs from. Do NOT declare a decree "wrong" based on general impression; only flag a conflict or legal error where you can point to a specific provision or a specific precedent it appears to contradict, and say so with appropriate hedging (e.g. "appears inconsistent with X unless the facts are distinguishable on Y") rather than false certainty. If you don't have enough retrieved authority to judge consistency on a particular point, say that plainly instead of guessing.
${liveCaseLawBlock}
Respond with ONLY a JSON object with exactly these keys:
{
  "court_name": string|null,
  "parties": {"plaintiff_or_appellant": string|null, "defendant_or_respondent": string|null},
  "facts": string,
  "issues": string,
  "findings": string,
  "decision": string,
  "applicable_laws": string,
  "consistency_assessment": {
    "is_consistent_with_settled_law": "consistent"|"inconsistent"|"partially_consistent"|"insufficient_authority_to_judge",
    "supporting_authority": string,
    "conflicts_or_errors": string[],
    "reasoning": string
  },
  "appeal_grounds": string,
  "legal_references": string[],
  "summary": string
}
Where "legal_references" lists the specific statutory provisions and/or confirmed case citations used in the consistency assessment. Leave it empty if none can be confidently cited.

JUDGMENT TEXT:
${judgmentText}`;

  const result = await generateContent({
    contents: 'Analyze this judgment as instructed, including the consistency assessment, and return the JSON.',
    systemInstruction,
    jsonMode: true,
    groundingQuery: judgmentText,
    maxTokens: 6144,
  });

  return { analysis: parseJsonSafe(result.text), tokens: result.tokens };
}

// ============================================================
// PLAINT ANALYSIS
// ============================================================

async function analyzePlaint(plaintText) {
  const liveCaseLaw = await fetchLiveCaseLawContext(
    plaintText,
    'You are reviewing a civil plaint/petition/contract to identify the applicable law and any confirmed precedent useful for advising the plaintiff or preparing a defence.'
  );
  const liveCaseLawBlock = liveCaseLaw
    ? `\n\nLIVE LEGAL RESEARCH (just retrieved via Google Search — cite these citations where relevant, but note to the reader that they should still be verified):\n${liveCaseLaw}\n`
    : '';

  const systemInstruction = `You are analyzing a civil plaint, petition, or contract filed in/relevant to a Pakistani court, from the perspective of an advocate assessing it either to advise the plaintiff or to prepare a defence/written statement for the opposing side.${liveCaseLawBlock}\n\nRespond with ONLY a JSON object with exactly these keys:\n{\n  "case_type": string|null,\n  "court_name": string|null,\n  "plaintiff": string|null,\n  "defendant": string|null,\n  "cause_of_action": string,\n  "claims": string[],\n  "relief_sought": string[],\n  "evidence_required": string[],\n  "preliminary_objections": string[],\n  "recommended_response": string,\n  "legal_references": string[],\n  "summary": string\n}\nWhere: "claims" are the factual/legal assertions made by the plaintiff; "preliminary_objections" are procedural/legal objections (limitation, jurisdiction, maintainability, misjoinder, cause of action defects, etc.) that could be raised against the plaint before going into merits; "recommended_response" is a short strategic recommendation for how to proceed (whether advising the plaintiff or defending); "legal_references" lists the specific statutory provisions and/or confirmed case citations relied on (leave empty if none can be confidently cited).\n\nDOCUMENT TEXT:\n${plaintText}`;

  const result = await generateContent({
    contents: 'Analyze this plaint as instructed and return the JSON.',
    systemInstruction,
    jsonMode: true,
    groundingQuery: plaintText,
    maxTokens: 8192,
  });

  return { analysis: parseJsonSafe(result.text), tokens: result.tokens };
}

// ============================================================
// STUDENT MODE (used by student.routes.js)
// ============================================================

async function generateMCQs(topic, subject, count = 10, difficulty = 'intermediate') {
  const systemInstruction = `Generate ${count} multiple-choice questions for a law student studying "${subject}" in the Pakistani legal system, specifically on the topic "${topic}". Difficulty level: ${difficulty}. Each question must be legally accurate, test real understanding (not trivia), and reference the correct statutory provision where relevant.\n\nRespond with ONLY a JSON object with exactly this shape:\n{\n  "mcqs": [\n    {\n      "question": string,\n      "options": [string, string, string, string],\n      "correct_index": number,\n      "explanation": string\n    }\n  ]\n}\n"correct_index" is the 0-based index into "options" of the correct answer. "explanation" briefly states why, citing the relevant law where applicable.`;

  const result = await generateContent({
    contents: `Generate the ${count} MCQs now, as instructed.`,
    systemInstruction,
    jsonMode: true,
    groundingQuery: `${topic} ${subject}`,
    maxTokens: 8192,
  });

  const parsed = parseJsonSafe(result.text);
  return { mcqs: parsed.mcqs || parsed, tokens: result.tokens };
}

async function generateVivaQuestions(topic, subject, count = 15) {
  const systemInstruction = `Generate ${count} viva (oral exam) questions a law professor might ask a student on the topic "${topic}" within "${subject}", in the context of Pakistani law. Include a short model answer or key points expected for each, so the student can self-check.\n\nRespond with ONLY a JSON object with exactly this shape:\n{\n  "questions": [\n    { "question": string, "key_points": string[] }\n  ]\n}`;

  const result = await generateContent({
    contents: `Generate the ${count} viva questions now, as instructed.`,
    systemInstruction,
    jsonMode: true,
    groundingQuery: `${topic} ${subject}`,
    maxTokens: 8192,
  });

  const parsed = parseJsonSafe(result.text);
  return { questions: parsed.questions || parsed, tokens: result.tokens };
}

async function generateNotes(topic, subject, language = 'english') {
  const languageInstruction = {
    english: 'Write in clear academic English.',
    urdu: 'Write in formal academic Urdu (اردو رسم الخط).',
    roman_urdu: 'Write in Roman Urdu.',
  }[language] || 'Write in clear academic English.';

  const systemInstruction = `Write comprehensive study notes for a law student on the topic "${topic}" within "${subject}", covering Pakistani law where relevant. Structure with clear Markdown headings, definitions, the applicable statutory provisions (with exact section/article numbers), leading case law where genuinely confirmed, and a short summary at the end. ${languageInstruction}`;

  const result = await generateContent({
    contents: `Write the study notes now, in full, as instructed.`,
    systemInstruction,
    groundingQuery: `${topic} ${subject}`,
    maxTokens: 8192,
  });

  return { content: result.text, tokens: result.tokens };
}

async function generateCaseBrief(caseName, facts = '') {
  const systemInstruction = `Prepare a formal case brief, in the standard format used in Pakistani law schools/courts (Case Name & Citation, Facts, Issues, Arguments, Holding/Decision, Ratio Decidendi, Significance), for the case named below. Only state the citation, holding, or outcome if you are genuinely confident it is accurate (use search to confirm); if you cannot confirm real details for this case, say so plainly rather than inventing them.\n\nCASE: ${caseName}\n${facts ? `\nADDITIONAL FACTS PROVIDED BY STUDENT:\n${facts}` : ''}`;

  const result = await generateContent({
    contents: 'Prepare the case brief now, in full, as instructed.',
    systemInstruction,
    groundingQuery: `${caseName} ${facts}`.slice(0, 2000),
    maxTokens: 8192,
  });

  return { content: result.text, tokens: result.tokens };
}

// ============================================================
// GENERIC DRAFT GENERATOR (used by /api/v1/drafts/generate)
// ============================================================

async function generateDraft(draftType, details = {}, language = 'english') {
  const detailsText = typeof details === 'string' ? details : JSON.stringify(details, null, 2);

  const languageInstruction = {
    english: 'Write the draft in formal legal English.',
    urdu: 'Write the draft in formal legal Urdu (اردو رسم الخط).',
    roman_urdu: 'Write the draft in Roman Urdu.',
    bilingual: 'Write the draft with English legal headings and Urdu explanatory text where natural.',
  }[language] || 'Write the draft in formal legal English.';

  const systemInstruction = `Draft a complete, court-ready "${draftType}" document for use in a Pakistani court/legal context, based on the details below. Follow the standard Pakistani format for this document type (proper heading/title, numbered paragraphs, verification clause where applicable, prayer/relief clause where applicable). Use placeholders like [COURT NAME], [PARTY NAME], [DATE] for any specific detail not supplied. ${languageInstruction}\n\nDETAILS PROVIDED:\n${detailsText}`;

  const result = await generateContent({
    contents: `Draft the ${draftType} now, in full.`,
    systemInstruction,
    groundingQuery: `${draftType} ${detailsText}`.slice(0, 2000),
    maxTokens: 8192,
  });

  return { content: result.text, tokens: result.tokens };
}

module.exports = {
  legalChat,
  legalResearch,
  generateContent,
  parseJsonSafe,
  DISCLAIMER,
  SYSTEM_PROMPT_BASE,
  retrieveLawContext,
  analyzeFIR,
  generateBailApplication,
  analyzeLegalNotice,
  generateNoticeReply,
  analyzeJudgment,
  analyzePlaint,
  generateDraft,
  generateMCQs,
  generateVivaQuestions,
  generateNotes,
  generateCaseBrief,
};
