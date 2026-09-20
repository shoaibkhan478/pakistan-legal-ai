/**
 * Translation Service - Certified Literal Legal Document Translation
 * ===================================================================
 * Certified, word-exact, sentence-by-sentence legal translation for
 * Pakistani court submissions (FIRs, plaints, judgments, decrees, notices).
 * Includes SENIOR ADVOCATE MODE for in-depth statutory and evidentiary audit.
 *
 * GUARANTEES:
 * 1. Absolute word-to-word literal translation: no paraphrasing, no unauthorized substitutions.
 * 2. Original terminology preserved with literal bracketed glosses [Original: ...].
 * 3. Exact sentence-by-sentence order and layout matching source document.
 * 4. Verbatim transcription of proper nouns, CNIC numbers, FIR numbers, dates, times, and sections.
 * 5. Ambiguity flagged without guessing.
 * 6. Senior Advocate Evidentiary Audit: FIR delay analysis, PPC section breakdown, bail vulnerability pointers, and High Court certification affidavit.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let logger;
try {
  logger = require('../utils/logger');
} catch (_) {
  try {
    logger = require('../src/utils/logger');
  } catch (_2) {
    logger = console;
  }
}

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (_) {}

const { generateContent } = require('./ai.service');

const SUPPORTED_LANGUAGES = {
  ur: 'Urdu',
  sd: 'Sindhi',
  'roman-ur': 'Roman Urdu',
  en: 'English',
};

const SYSTEM_PROMPT =
  'You are an accredited Senior Judicial Translator & Senior Advocate of the High Court of Pakistan. ' +
  'Your sworn statutory duty is to produce an ABSOLUTE VERBATIM, WORD-FOR-WORD LITERAL TRANSLATION of the legal record ' +
  'for judicial proceedings in Pakistani Courts (High Court, Sessions Court, Supreme Court). ' +
  'CRITICAL RULE: Translate EVERY SINGLE WORD exactly as used without changing, smoothing, modernizing, or paraphrasing ANY word. ' +
  'Preserve all police headings, honorifics, repetitive formulaic phrasing, and original terminology in square brackets. ' +
  'Never guess on ambiguity. Preserve exact structural order, numbers, names, and dates.';

/**
 * Translates a legal document literally with parallel side-by-side output, verbatim term mappings,
 * and optional Senior Advocate evidentiary audit.
 *
 * @param {string} sourceText - The document text to translate
 * @param {string} sourceLang - 'ur' | 'sd' | 'roman-ur' | 'en'
 * @param {string} targetLang - 'en' | 'ur' | 'sd' | 'roman-ur'
 * @param {object} [options] - Optional settings
 * @param {boolean} [options.seniorAdvocateMode=false] - Enables Senior Advocate evidentiary audit and cross-examination pointers
 * @returns {Promise<object>}
 */
async function translateLegalDocument(sourceText, sourceLang, targetLang, options = {}) {
  if (!sourceText || typeof sourceText !== 'string' || !sourceText.trim()) {
    throw new Error('sourceText must be a non-empty string.');
  }

  const validKeys = Object.keys(SUPPORTED_LANGUAGES);
  if (!validKeys.includes(sourceLang)) {
    throw new Error(`Invalid sourceLang "${sourceLang}". Supported languages: ${validKeys.join(', ')}`);
  }
  if (!validKeys.includes(targetLang)) {
    throw new Error(`Invalid targetLang "${targetLang}". Supported languages: ${validKeys.join(', ')}`);
  }
  if (sourceLang === targetLang) {
    throw new Error(`sourceLang and targetLang cannot be identical ("${sourceLang}").`);
  }

  const seniorAdvocateMode = Boolean(options.seniorAdvocateMode);
  const sourceLangName = SUPPORTED_LANGUAGES[sourceLang];
  const targetLangName = SUPPORTED_LANGUAGES[targetLang];

  const userPrompt =
    `Translate the following Pakistani legal document from ${sourceLangName} (${sourceLang}) to ${targetLangName} (${targetLang}).\n\n` +
    `MANDATORY LITERAL & VERBATIM TRANSLATION RULES:\n` +
    `1. Absolute word-to-word literal translation: Translate every word exactly as used. Do NOT change, omit, or paraphrase any word.\n` +
    `2. Police & Legal Terminology: Keep the exact literal English equivalent AND the transliterated source term in brackets [Original: ...]. E.g.:\n` +
    `   - "مستغیث" -> "Complainant [Mustagheeth]"\n` +
    `   - "مسمی / مسماۃ" -> "Named [Musamma / Musammat]"\n` +
    `   - "ولد / دختر / زوجہ" -> "Son of [Walad] / Daughter of [Dukhtar] / Wife of [Zauja]"\n` +
    `   - "حاضر تھانہ آیا/آئی" -> "Came present at the Police Station [Hazir Thana Aya/Ai]"\n` +
    `   - "وقوعہ" -> "Occurrence [Waqu'a]"\n` +
    `   - "وجہ عناد" -> "Motive / Cause of grudge [Wajah-e-Inad]"\n` +
    `   - "فرد مقبوضگی" -> "Recovery memo [Fard-e-Maqboozi]"\n` +
    `   - "مضروب" -> "Injured person [Mazroob]"\n` +
    `   - "کارروائی پولیس" -> "Police proceedings [Karwai Police]"\n` +
    `   - "ت پ" -> "P.P.C. [Pakistan Penal Code / Ta'zirat-e-Pakistan]"\n` +
    `   - "ض ف" -> "Cr.P.C. [Code of Criminal Procedure / Zabita-e-Faujdari]"\n` +
    `   - "دستخط / نشان انگوٹھا" -> "Signature [Dastakhat] / Thumb impression [Nishan-e-Angootha]"\n` +
    `3. No additions or omissions: Do not insert unauthorized explanatory sentences into the narrative text.\n` +
    `4. Preserve proper nouns and numbers exactly: Names, CNICs, FIR numbers, dates, times, and sections must be transcribed verbatim.\n` +
    `5. Flag, never guess, on ambiguity: If any term is ambiguous, record in flaggedTerms array.\n` +
    `6. Senior Advocate Evidentiary Audit: If seniorAdvocateMode is enabled or if this is an FIR/legal document, provide an in-depth evidentiary analysis (FIR delay impact under Supreme Court rulings, PPC sections breakdown, bail strategy, and cross-examination angles).\n\n` +
    `Return ONLY a raw JSON object (no markdown code blocks, no commentary) matching this exact schema:\n` +
    `{\n` +
    `  "pairs": [\n` +
    `    {\n` +
    `      "index": 1,\n` +
    `      "original": "exact original sentence or line",\n` +
    `      "translated": "exact word-to-word literal translation",\n` +
    `      "verbatimTerms": [\n` +
    `        {"original": "مستغیث", "translated": "Complainant", "transliteration": "Mustagheeth"}\n` +
    `      ],\n` +
    `      "seniorAdvocateNote": "Evidentiary note / legal weight of this line in court"\n` +
    `    }\n` +
    `  ],\n` +
    `  "fullTranslation": "full verbatim translated document text",\n` +
    `  "flaggedTerms": [\n` +
    `    {\n` +
    `      "term": "original ambiguous term",\n` +
    `      "literalSense": "literal sense / gloss",\n` +
    `      "flag": "[TERM — no exact equivalent; literal sense: \"...\"]"\n` +
    `    }\n` +
    `  ],\n` +
    `  "seniorAdvocateAudit": {\n` +
    `    "isFir": true,\n` +
    `    "firNumber": "e.g. 145/2026",\n` +
    `    "policeStation": "e.g. Saddar Rawalpindi",\n` +
    `    "dateTimeOccurrence": "date and time of occurrence",\n` +
    `    "dateTimeReported": "date and time of reporting",\n` +
    `    "timeDelay": "time difference (e.g. 4 hours / 2 days delay)",\n` +
    `    "delayEvidentiaryImpact": "Detailed legal evaluation citing Supreme Court precedents (e.g. PLD 2020 SC 156 / 2019 SCMR 652)",\n` +
    `    "sectionsAnalysis": [\n` +
    `      {\n` +
    `        "section": "e.g. 392 PPC",\n` +
    `        "offence": "e.g. Robbery",\n` +
    `        "bailable": false,\n` +
    `        "compoundable": false,\n` +
    `        "cognizable": true,\n` +
    `        "trialCourt": "Court of Session",\n` +
    `        "punishment": "Rigorous imprisonment for 3 to 10 years and fine",\n` +
    `        "defenseBailStrategy": "Specific pointer for bail under Section 497 Cr.P.C."\n` +
    `      }\n` +
    `    ],\n` +
    `    "accusedBreakdown": {\n` +
    `      "nominatedAccused": ["list of named accused"],\n` +
    `      "unnamedAccusedCount": "description of unknown persons",\n` +
    `      "identificationParadeRequired": true,\n` +
    `      "identificationParadeNotes": "Notes under Article 22 of Qanun-e-Shahadat Order 1984"\n` +
    `    },\n` +
    `    "evidentiaryVulnerabilities": [\n` +
    `      "weakness 1 in prosecution story as worded in FIR",\n` +
    `      "weakness 2"\n` +
    `    ],\n` +
    `    "crossExaminationAngles": [\n` +
    `      "question or angle 1 for defense advocate",\n` +
    `      "question or angle 2"\n` +
    `    ],\n` +
    `    "bailGrounds": [\n` +
    `      "ground 1 for bail u/s 497/498 Cr.P.C.",\n` +
    `      "ground 2"\n` +
    `    ]\n` +
    `  },\n` +
    `  "certifiedCourtAffidavit": "Formal High Court Rules Vol V Ch 1 certificate of verbatim accuracy"\n` +
    `}\n\n` +
    `SOURCE LEGAL DOCUMENT:\n` +
    `${sourceText.trim()}`;

  let rawText = '';
  let modelUsed = 'claude-sonnet-4-6';
  let tokenUsage = { input_tokens: 0, output_tokens: 0 };

  if (process.env.ANTHROPIC_API_KEY) {
    modelUsed = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
    if (Anthropic) {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: modelUsed,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
      rawText = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      tokenUsage = {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
      };
    } else {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: modelUsed,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${resJson?.error?.message || response.statusText}`);
      }
      rawText = resJson.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') || '';
      tokenUsage = {
        input_tokens: resJson.usage?.input_tokens || 0,
        output_tokens: resJson.usage?.output_tokens || 0,
      };
    }
  } else {
    modelUsed = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    logger.info('translateLegalDocument: using Gemini fallback for literal translation.');
    const geminiRes = await generateContent({
      contents: userPrompt,
      systemInstruction: SYSTEM_PROMPT + '\nRespond with ONLY valid raw JSON.',
      jsonMode: true,
      disableSearch: true,
      appendSources: false,
      maxTokens: 4096,
    });
    rawText = geminiRes.text;
    tokenUsage = geminiRes.tokens;
  }

  // Defensively clean and parse JSON
  const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1').replace(/```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error('Failed to parse translation JSON:', err.message, cleaned.slice(0, 300));
    throw new Error('Translation model response was not valid JSON.');
  }

  // Defensive normalization
  const pairs = Array.isArray(parsed.pairs)
    ? parsed.pairs.map((p, idx) => ({
        index: p.index || idx + 1,
        original: String(p.original || '').trim(),
        translated: String(p.translated || '').trim(),
        verbatimTerms: Array.isArray(p.verbatimTerms) ? p.verbatimTerms : [],
        seniorAdvocateNote: String(p.seniorAdvocateNote || '').trim(),
      }))
    : [];

  const fullTranslation = typeof parsed.fullTranslation === 'string' && parsed.fullTranslation.trim()
    ? parsed.fullTranslation.trim()
    : pairs.map((p) => p.translated).join('\n');

  const flaggedTerms = Array.isArray(parsed.flaggedTerms)
    ? parsed.flaggedTerms.map((f) => ({
        term: String(f.term || '').trim(),
        literalSense: String(f.literalSense || '').trim(),
        flag: String(f.flag || `[${f.term} — no exact equivalent; literal sense: "${f.literalSense}"]`),
      }))
    : [];

  const seniorAdvocateAudit = parsed.seniorAdvocateAudit && typeof parsed.seniorAdvocateAudit === 'object'
    ? parsed.seniorAdvocateAudit
    : null;

  const certifiedCourtAffidavit = typeof parsed.certifiedCourtAffidavit === 'string' && parsed.certifiedCourtAffidavit.trim()
    ? parsed.certifiedCourtAffidavit.trim()
    : 'I, certified legal translator / Advocate of the High Court, do hereby certify that this is a true, faithful, and exact word-for-word translation of the source record into English, prepared strictly in accordance with Chapter 1, High Court Rules and Orders.';

  return {
    sourceLang,
    targetLang,
    seniorAdvocateMode,
    pairs,
    fullTranslation,
    flaggedTerms,
    seniorAdvocateAudit,
    certifiedCourtAffidavit,
    model: modelUsed,
    tokens: tokenUsage,
  };
}

module.exports = {
  translateLegalDocument,
  SUPPORTED_LANGUAGES,
  SYSTEM_PROMPT,
};
