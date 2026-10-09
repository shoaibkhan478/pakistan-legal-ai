const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { runCaseIntake } = require('../src/services/caseIntakeOrchestrator');

async function testIntake() {
  console.log('--- Testing Autonomous Case Intake with Pakistani Law & Court-Ready Drafting ---');

  const problem = "Police ne mere bhai Asad ko kal raat bina kisi FIR ya warrant ke utha liya hai aur Thana New Town Rawalpindi mein ghair qanooni tor par band kiya hua hai. Police milne nahi de rahi aur na he koi jurm bata rahi hai.";

  console.log('Input Grievance:', problem);
  console.log('Running autonomous case diagnosis and court drafting...');

  const result = await runCaseIntake(problem, { language: 'english' });

  console.log('\n--- AUTONOMOUS DIAGNOSIS ---');
  console.log('Case Nature:', result.diagnosis?.case_nature);
  console.log('Competent Court:', result.diagnosis?.competent_court);
  console.log('Primary Remedy:', result.diagnosis?.primary_remedy);
  console.log('Statutes:', result.diagnosis?.applicable_statutes);

  console.log('\n--- DRAFT GENERATED ---');
  console.log('Draft Title:', result.draft?.draftTitle);
  console.log('Draft Type:', result.draft?.draftType);
  console.log('Draft Length:', result.draft?.content?.length);

  console.log('\n--- DRAFT PREVIEW (First 600 chars) ---');
  console.log(result.draft?.content?.slice(0, 600));

  if (!result.draft?.content) {
    throw new Error('Draft was not generated!');
  }
  console.log('\n✅ Case Intake Autonomous Diagnosis & Court Drafting test PASSED successfully!');
}

testIntake().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
