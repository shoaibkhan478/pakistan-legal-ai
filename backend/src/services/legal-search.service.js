/**
 * backend/src/services/legal-search.service.js
 * -----------------------------------------------------
 * Live web-search legal research — reuses the existing
 * ai.service.js generateContent() helper (Gemini + Google
 * Search grounding), so this needs NO new npm package and
 * NO new env variable. It just points the same working
 * pipeline at a multi-angle legal-research system prompt.
 * -----------------------------------------------------
 */

const { generateContent } = require('./ai.service');

const TRUSTED_SOURCES = [
  'pakistancode.gov.pk',
  'na.gov.pk',
  'senate.gov.pk',
  'supremecourt.gov.pk',
  'pja.gov.pk',
  'shc.gov.pk',
  'lhc.gov.pk',
  'ihc.gov.pk',
  'president.gov.pk',
  'cabinet.gov.pk',
  'fbr.gov.pk',
  'secp.gov.pk',
];

const SYSTEM_INSTRUCTIONS = `
Ye ek LIVE web-search legal research mode hai (Pakistan Legal AI Agent ke andar).

Kaam karne ka tareeqa:
1. Sawal ko ache se samjho — user ka asal legal maqsad kya hai
2. Sawal ko 2-5 alag angles/queries mein todo:
   - Direct keyword search (exact section/act ka naam)
   - Related legal concept search
   - Recent amendment/update search
   - Ordinance/Decree/Notification/SRO search
   - Case law/judgment search agar zaroorat ho
3. Priority in websites ko do: ${TRUSTED_SOURCES.join(', ')}
4. Jawab mein hamesha Act/Ordinance/SRO ka poora naam, number, aur Section batao
5. Agar multiple/conflicting versions hon to latest ko priority do aur saal/tareekh mention karo
6. Agar confident na ho, saaf bata do — kabhi guess na karo
`.trim();

/**
 * @param {string} question
 * @returns {Promise<{ answer: string }>}
 */
async function runLiveLegalSearch(question) {
  if (!question || typeof question !== 'string') {
    throw new Error('Question is required');
  }

  const { text } = await generateContent({
    contents: question,
    systemInstruction: SYSTEM_INSTRUCTIONS,
    maxTokens: 2048,
    appendSources: true,
    disableSearch: false,
  });

  return { answer: text };
}

// ------------------------------------------------------------------
// LIVE GROUNDING FOR THE REASONING CHAIN / DRAFTING
// ------------------------------------------------------------------
// runLiveLegalSearch() above is a standalone "ask a legal research
// question" feature. This is different: it's a single live-search call
// meant to be run BEHIND THE SCENES, at the start of a case analysis or
// before drafting, to pull the actual current text of the relevant
// PPC/CrPC/CPC/etc. sections (and any directly relevant recent superior
// court judgments) from trusted government/court sites — the way a
// senior advocate looks the provision up before relying on it, rather
// than drafting from memory of what a section "usually" says.
//
// Why this can't just reuse legalReasoningChain's normal steps: those
// run with jsonMode:true for structured output, and Gemini's grounding
// (google_search tool) is only usable when jsonMode is off (see
// ai.service.js's `useSearch = !jsonMode && !disableSearch`). So this
// runs ONE plain-text, search-enabled call up front, and the resulting
// grounding text is threaded into the JSON-mode steps as additional
// context instead of each step trying to search for itself.

const GROUNDING_SYSTEM_INSTRUCTIONS = `
Tum ek senior Pakistani advocate ke research assistant ho. Case ke facts diye jayenge.
Kaam: in facts se related EXACT statute sections (PPC/CrPC/CPC/Qanun-e-Shahadat/etc.) aur
kisi bhi directly-relevant recent superior court judgment ko ${TRUSTED_SOURCES.join(', ')} jaise
trusted sites se abhi live search karo.

Sakht rules:
- Har section ka poora number aur uska asal (verbatim ya bohot qareeb-paraphrase) current text do — sirf
  "Section 302 murder ki saza deta hai" jaisa vague mat likho, asal wording do.
- Agar koi section confidently nahi mil raha, use skip kar do — number ya text guess mat karo.
- Agar koi relevant amendment hui ho, uska saal aur reference batao.
- Format: har entry ke liye "SECTION: [naam + number]\\nTEXT: [asal wording]\\nSOURCE: [website]" style mein do.
- Zyada se zyada 6-8 sabse relevant sections/judgments cover karo, poora statute mat de do.
`.trim();

/**
 * @param {string} caseText - the case facts (FIR text, case description, etc.)
 * @param {string} [caseTypeLabel] - short label for context, e.g. "bail application"
 * @returns {Promise<{ grounding: string, sources: {title: string, url: string}[], tokens: number }>}
 */
async function gatherLiveLegalGrounding(caseText, caseTypeLabel = '') {
  if (!caseText || !caseText.trim()) {
    return { grounding: '', sources: [], tokens: 0 };
  }

  try {
    const result = await generateContent({
      contents: `Case type: ${caseTypeLabel}\n\nCase facts:\n${caseText.slice(0, 3000)}`,
      systemInstruction: GROUNDING_SYSTEM_INSTRUCTIONS,
      maxTokens: 2048,
      appendSources: true,
      disableSearch: false, // this is the ONE call in the whole pipeline that's allowed to hit the live web
      jsonMode: false,
    });
    const tokenCount = (result.tokens?.input_tokens || 0) + (result.tokens?.output_tokens || 0);

    // generateContent appends sources as markdown links, e.g. "- [Pakistan
    // Code](https://pakistancode.gov.pk/...)" — pull those back out into a
    // structured list so the frontend can show "live sources checked"
    // without having to parse markdown itself.
    const sources = [];
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkPattern.exec(result.text || '')) !== null) {
      sources.push({ title: match[1], url: match[2] });
    }

    return { grounding: result.text || '', sources, tokens: tokenCount };
  } catch (error) {
    // Live search failing (rate limit, network, etc.) should degrade the
    // analysis to "no live grounding" rather than fail the whole chain —
    // the local RAG library and the model's own knowledge are still
    // there as a fallback.
    return { grounding: '', sources: [], tokens: 0 };
  }
}

module.exports = { runLiveLegalSearch, gatherLiveLegalGrounding };
