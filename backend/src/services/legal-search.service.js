/**
 * backend/src/services/legal-search.service.js
 * -----------------------------------------------------
 * LIVE web search legal research service.
 * Koi PDF/database nahi — Claude khud internet par live
 * search karta hai (multiple angles se), khud padhta hai,
 * aur source links ke saath jawab banata hai.
 *
 * Ye is project ke existing ai.service.js jaisa hi pattern
 * follow karta hai (Anthropic SDK), taake style consistent rahe.
 *
 * .env mein zaroori:
 *   ANTHROPIC_API_KEY=sk-ant-xxxxx   (already project mein hai)
 * -----------------------------------------------------
 */

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Trusted legal sources — Claude ko inhi ko priority dene ko kaha jayega
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
Aap ek Pakistan legal research assistant hain jo LIVE web search kar ke jawab deta hai.

Kaam karne ka tareeqa:
1. Sawal ko ache se samjho — user ka asal legal maqsad kya hai
2. Sawal ko 2-5 alag angles/queries mein todo:
   - Direct keyword search (exact section/act ka naam)
   - Related legal concept search (jaise "murder punishment Pakistan" agar "qatl-e-amd" na mile)
   - Recent amendment/update search
   - Ordinance/Decree/Notification/SRO search (Presidential/Provincial Ordinances, FBR/SECP SROs, Gazette notifications)
   - Case law/judgment search agar zaroorat ho
3. In sabhi angles se search karo, results cross-check karo
4. Priority in websites ko do: ${TRUSTED_SOURCES.join(', ')}
5. Agar official source na mile to reliable legal news/analysis sites use karo, lekin clearly batao ke ye official text nahi hai
6. Jawab mein hamesha:
   - Act/Ordinance/SRO ka poora naam, number, aur Section
   - Ye batao "Act" hai ya "Ordinance/Notification" (Ordinance temporary ho sakti hai)
   - Source/link
   - Agar multiple/conflicting versions hon to latest ko priority do aur saal/tareekh mention karo
7. Agar confident na ho ya conflicting info mile, saaf bata do — kabhi guess na karo
8. Jis language mein sawal pucha jaye (English/Urdu/Roman Urdu) usi mein jawab do

⚠️ Ye AI-generated legal research assistance hai, final legal advice ke liye qualified advocate se confirm zaroor karayein — ye line hamesha end mein add karo.
`.trim();

/**
 * @param {string} question - User ka legal sawal
 * @returns {Promise<{answer: string, sources: Array<{title: string, url: string}>}>}
 */
async function runLiveLegalSearch(question) {
  if (!question || typeof question !== 'string') {
    throw new Error('Question is required');
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_INSTRUCTIONS,
    messages: [{ role: 'user', content: question }],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
      },
    ],
  });

  // Answer text nikalna
  const answer = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  // Sources/citations nikalna
  const sources = [];
  for (const block of response.content) {
    if (block.type === 'text' && block.citations) {
      for (const citation of block.citations) {
        if (citation.url) {
          sources.push({ title: citation.title || citation.url, url: citation.url });
        }
      }
    }
  }

  return { answer, sources };
}

module.exports = { runLiveLegalSearch };
