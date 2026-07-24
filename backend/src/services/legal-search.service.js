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

module.exports = { runLiveLegalSearch };
