// backend/src/services/translationService.js
//
// LITERAL (WORD-FOR-WORD) FIR TRANSLATION — English to Urdu
//
// This is deliberately NOT the kind of fluent, reworded translation a
// general "translate this" prompt produces. An FIR is a legal record —
// a bail application, a court, or a client reading the Urdu version needs
// every word that appears in the English original to still be there,
// in the same order, with nothing paraphrased, summarized, condensed,
// explained, or silently dropped. "Correct-sounding Urdu" that quietly
// drops a name, a date, or a qualifying phrase is worse than useless in
// this context — it's a translation you can't trust as a record of what
// the English text actually said.
//
// So the system instruction below explicitly forbids the things a
// translation model normally *wants* to do to sound natural (reordering
// for Urdu grammar, merging clauses, dropping repeated words), and the
// function chunks long FIRs and sanity-checks the output length instead
// of trusting one long generation to stay faithful all the way through.

const { generateContent } = require('./ai.service');
const logger = require('../utils/logger');

// Keep chunks small enough that the model has no incentive to compress —
// long single generations are exactly where an LLM starts quietly
// summarizing instead of translating line-by-line. Splitting on paragraph/
// sentence boundaries also means a translation glitch in one chunk doesn't
// require re-translating the whole FIR.
const MAX_CHUNK_CHARS = 900;

const TRANSLATION_SYSTEM_INSTRUCTION = `You are a literal, word-for-word English-to-Urdu translator for legal documents (FIRs). This is NOT a request for fluent or natural-sounding Urdu prose. Follow these rules exactly:

1. Translate EVERY word of the English text into Urdu, one word/phrase at a time, in the SAME ORDER it appears in the English original as far as Urdu script and grammar allow. Do not reorder clauses for smoother Urdu flow.
2. Do NOT summarize, condense, paraphrase, omit, or "clean up" anything — every sentence in the English text must have a corresponding Urdu sentence carrying the same words. If the English repeats a word or phrase, the Urdu must repeat it too.
3. Do NOT add anything that is not in the English original — no explanations, no commentary, no headings, no notes, no "translation:" preamble, no clarifying brackets.
4. Proper nouns (names of people, places, police stations), FIR numbers, section numbers, dates, and numerals must be carried across EXACTLY as written in the English text (numerals stay in the same numeral form; do not convert them or spell them out).
5. Preserve the original paragraph breaks, line breaks, and punctuation placement — the Urdu output's structure must mirror the English input's structure line-for-line.
6. If a word has no natural Urdu equivalent (a proper noun, a technical/legal term with no Urdu counterpart), transliterate it into Urdu script rather than skipping it or leaving it in English.
7. Output ONLY the Urdu translation text. Nothing before it, nothing after it.`;

/**
 * Splits text into chunks that keep paragraph/sentence boundaries intact,
 * each under MAX_CHUNK_CHARS, and preserves order so chunks can be
 * translated independently and re-joined without losing structure.
 */
function chunkText(text) {
  const paragraphs = text.split(/\n\s*\n/); // split on blank lines
  const chunks = [];
  let current = '';

  const flush = () => {
    if (current.trim()) chunks.push(current);
    current = '';
  };

  for (const para of paragraphs) {
    if (para.length > MAX_CHUNK_CHARS) {
      // A single paragraph too long on its own — split further on sentence
      // boundaries (., ?, !, Urdu-adjacent punctuation) rather than mid-word.
      const sentences = para.split(/(?<=[.?!])\s+/);
      for (const sentence of sentences) {
        if ((current + '\n\n' + sentence).length > MAX_CHUNK_CHARS) {
          flush();
        }
        current += (current ? ' ' : '') + sentence;
      }
    } else if ((current + '\n\n' + para).length > MAX_CHUNK_CHARS) {
      flush();
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  flush();

  return chunks.length ? chunks : [text];
}

/**
 * Rough word-count fidelity check. Urdu word counts won't exactly match
 * English word counts (script and compounding differ), but a translation
 * that dropped whole sentences will show up as a drastically low ratio.
 * This is a heuristic flag for the caller/UI to show a review warning —
 * not a hard failure, since a modest ratio difference is normal.
 */
function wordCount(str) {
  return (str || '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Translates a single chunk. disableSearch/appendSources/no jsonMode: this
 * is plain literal translation, not research or JSON extraction, so none
 * of the grounding/search machinery should touch the output.
 */
async function translateChunk(chunk) {
  const result = await generateContent({
    contents: `Translate the following English FIR text into Urdu, following every rule above exactly:\n\n${chunk}`,
    systemInstruction: TRANSLATION_SYSTEM_INSTRUCTION,
    disableSearch: true,
    appendSources: false,
    jsonMode: false,
    maxTokens: 4096,
  });
  return result;
}

/**
 * Translates FIR text (or any legal text) from English to Urdu, word-for-
 * word / line-for-line, with no editing, summarizing, or omission.
 *
 * @param {string} englishText
 * @returns {Promise<{translation: string, tokens: {input_tokens:number,output_tokens:number}, chunkCount: number, possibleTruncation: boolean, sourceWordCount: number, translatedWordCount: number}>}
 */
async function translateFIRToUrdu(englishText) {
  const text = (englishText || '').trim();
  if (!text) {
    throw new Error('translateFIRToUrdu: received empty text.');
  }

  const chunks = chunkText(text);
  logger.info(`translateFIRToUrdu: translating ${chunks.length} chunk(s), ${text.length} chars total.`);

  const translatedParts = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Sequential, not parallel: keeps the free-tier rate limiter (see
  // ai.service.js) from being hit with a burst all at once for one FIR,
  // and preserves strict ordering of chunks in the reassembled output.
  for (const chunk of chunks) {
    const result = await translateChunk(chunk);
    translatedParts.push(result.text.trim());
    totalInputTokens += result.tokens?.input_tokens || 0;
    totalOutputTokens += result.tokens?.output_tokens || 0;
  }

  const translation = translatedParts.join('\n\n');

  const sourceWordCount = wordCount(text);
  const translatedWordCount = wordCount(translation);
  // Flag, don't block: Urdu word segmentation differs from English, so this
  // is only meant to catch drastic drops (e.g. the model summarized instead
  // of translating), not to enforce a strict 1:1 count.
  const possibleTruncation = sourceWordCount > 0 && translatedWordCount < sourceWordCount * 0.5;
  if (possibleTruncation) {
    logger.warn(`translateFIRToUrdu: translated word count (${translatedWordCount}) is far below source (${sourceWordCount}) — possible summarization/truncation, flagging for review.`);
  }

  return {
    translation,
    tokens: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
    chunkCount: chunks.length,
    possibleTruncation,
    sourceWordCount,
    translatedWordCount,
  };
}

module.exports = { translateFIRToUrdu };
