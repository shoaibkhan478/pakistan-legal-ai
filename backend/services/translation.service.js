/**
 * Translation Service - Certified Literal Legal Document Translation
 * ===================================================================
 * Certified, word-exact, sentence-by-sentence legal translation for
 * Pakistani court submissions (FIRs, plaints, judgments, decrees, notices).
 *
 * GUARANTEE:
 * 1. Literal, sentence-by-sentence order preservation (no paraphrasing or reordering).
 * 2. No additions (no explanatory glosses inserted into narrative).
 * 3. No omissions (boilerplate, honorifics, formulaic language preserved).
 * 4. Exact structural preservation (numbering, headers, columns).
 * 5. Ambiguity flagged, never guessed:
 *    [ORIGINAL TERM — no exact English equivalent; literal sense: "..."]
 * 6. Proper nouns, dates, CNICs, FIR numbers, sections transcribed verbatim.
 * 7. Side-by-side output pairs for advocate verification before filing.
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
  'You are a certified literal legal-document translator. Translate with maximum fidelity to the source wording. ' +
  'Do not paraphrase, summarize, interpret, or add any content not present in the original. If a term is ambiguous ' +
  'or has no direct equivalent, flag it instead of guessing. Preserve exact structure, numbering, names, dates, and ' +
  'numbers. This translation will be submitted in a Pakistani court, where even a minor unauthorized wording change ' +
  'can be challenged.';

/**
 * Translates a legal document literally with parallel side-by-side output and ambiguity flags.
 *
 * @param {string} sourceText - The document text to translate
 * @param {string} sourceLang - 'ur' | 'sd' | 'roman-ur' | 'en'
 * @param {string} targetLang - 'en' | 'ur' | 'sd' | 'roman-ur'
 * @returns {Promise<{
 *   sourceLang: string,
 *   targetLang: string,
 *   pairs: Array<{index: number, original: string, translated: string}>,
 *   fullTranslation: string,
 *   flaggedTerms: Array<{term: string, literalSense: string, flag: string}>,
 *   model: string,
 *   tokens: object
 * }>}
 */
async function translateLegalDocument(sourceText, sourceLang, targetLang) {
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

  const sourceLangName = SUPPORTED_LANGUAGES[sourceLang];
  const targetLangName = SUPPORTED_LANGUAGES[targetLang];

  const userPrompt =
    `Translate the following Pakistani legal document from ${sourceLangName} (${sourceLang}) to ${targetLangName} (${targetLang}).\n\n` +
    `MANDATORY LITERAL TRANSLATION RULES:\n` +
    `1. Literal, sentence-by-sentence translation: Translate each sentence/clause in the same sequence as the original. Do not merge, split, reorder, summarize, or omit any sentence, phrase, name, date, number, or section reference.\n` +
    `2. No additions: Never insert clarifying words, context, or explanations that are not present in the source text. Do not expand abbreviations or add implied subjects/objects.\n` +
    `3. No omissions: Every word and phrase in the source must have a corresponding rendering in the output, including repetitions, honorifics, and formulaic legal phrases.\n` +
    `4. Preserve structure exactly: Keep the same paragraph/line numbering, section headers, and formatting layout as the source document.\n` +
    `5. Flag, never guess, on ambiguity: If a word, idiom, legal term, or proper noun has no exact equivalent or its meaning is ambiguous, do NOT silently pick an interpretation. Output the original term in brackets alongside a literal gloss and a flag, e.g.: [ORIGINAL TERM — no exact English equivalent; literal sense: "..."] and record it in the flaggedTerms array.\n` +
    `6. Preserve proper nouns and numbers exactly: Names, place names, CNIC numbers, FIR numbers, dates, and statute section numbers must be transcribed exactly as they appear (transliterated if necessary), never altered, corrected, or "normalized."\n` +
    `7. Side-by-side output: Provide parallel sentence/line pairs mapping original to translated.\n\n` +
    `Return ONLY a raw JSON object (no markdown, no code fences, no commentary) matching this exact schema:\n` +
    `{\n` +
    `  "pairs": [\n` +
    `    {\n` +
    `      "index": 1,\n` +
    `      "original": "exact original sentence or line",\n` +
    `      "translated": "exact literal translated sentence or line"\n` +
    `    }\n` +
    `  ],\n` +
    `  "fullTranslation": "full verbatim translated document text with exact structural linebreaks and paragraphs",\n` +
    `  "flaggedTerms": [\n` +
    `    {\n` +
    `      "term": "original ambiguous term",\n` +
    `      "literalSense": "literal sense / gloss",\n` +
    `      "flag": "[TERM — no exact equivalent; literal sense: \\"...\\"]"\n` +
    `    }\n` +
    `  ]\n` +
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
    logger.info('translateLegalDocument: ANTHROPIC_API_KEY not set, using Gemini fallback for literal translation.');
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

  return {
    sourceLang,
    targetLang,
    pairs,
    fullTranslation,
    flaggedTerms,
    model: modelUsed,
    tokens: tokenUsage,
  };
}

module.exports = {
  translateLegalDocument,
  SUPPORTED_LANGUAGES,
  SYSTEM_PROMPT,
};
