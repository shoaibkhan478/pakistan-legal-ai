const { retrieveRelevantLawWithCitations } = require('./src/services/legalRetrievalService');

async function run() {
  const result = await retrieveRelevantLawWithCitations('Qatl-e-amd ki saza kya hai?');
  console.log('Constitution matches:', result.constitution.length);
  console.log('Statute matches:', result.statute.length);
  console.log('Judgment matches:', result.judgment.length);
  console.log('\nFirst statute match:', JSON.stringify(result.statute[0], null, 2)?.slice(0, 500));
  process.exit(0);
}

run().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});