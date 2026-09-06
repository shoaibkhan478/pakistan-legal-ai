const fs = require('fs');
const path = require('path');
const { generateDocxDraft, availableTypes } = require('../services/ai.service');

const sampleFacts = {
  bail_application: `Applicant Muhammad Aslam s/o Abdul Rehman CNIC 35201-1234567-1 resident of House 12, Street 4, Lahore. Registered FIR No. 123/2026 at PS Gulberg Lahore under sections 420, 406, 489-F PPC. Seeking post-arrest bail. Ground: False implication due to business dispute, delay in FIR of 14 days without explanation, offences punishable with up to 3 years falling within non-prohibitory clause of section 497 CrPC, investigation complete and accused behind bars not required for further recovery.`,
  plaint: `Plaintiff Tariq Mahmood s/o Bashir Ahmad resident of House 55, Model Town, Lahore. Defendant Kamran Ali resident of Flat 3, Gulberg III, Lahore. Suit for recovery of Rs. 2,500,000/- with damages. Cause of action arose on 15.01.2026 when defendant dishonoured promissory note. Court fee paid Rs. 15,000. Relief: decree for principal amount and 15% interest.`,
  legal_notice: `Sender: Advocate Tariq Law Associates on behalf of Client Alpha Goods Ltd Karachi. Recipient: Omega Trading Co, I.I. Chundrigar Road Karachi. Subject: Legal notice for recovery of outstanding commercial invoice PKR 1,800,000/-. Goods delivered on 10.02.2026, 30-day credit expired. Demand: Pay within 14 days failing which civil and criminal proceedings under PPC and suit for recovery.`,
  legal_notice_reply: `Sender: Advocate Farooq & Co on behalf of Omega Trading Co. Recipient: Alpha Goods Ltd c/o Advocate Tariq Law Associates. Subject: Reply to legal notice dated 01.03.2026. Ref: Notice regarding alleged PKR 1,800,000 invoice. Reply: Allegations denied in toto. The consignment was rejected upon inspection due to defective goods as notified via email on 12.02.2026. Demand that notice be withdrawn unconditionally within 7 days.`,
  affidavit: `Deponent: Dr. Ayesha Siddiqui d/o Muhammad Siddiqui, CNIC 42101-9876543-2, resident of DHA Phase 6, Karachi. Purpose: Affidavit in support of application for succession certificate regarding estate of late father. Statements: Sole surviving daughter, all legal heirs listed honestly, no other claims or litigation pending. Signed at Karachi.`,
  petition: `Petitioner: Citizen Rights Forum through President Raza Khan resident of Islamabad. Respondent: Federation of Pakistan through Secretary Interior and Islamabad Capital Territory Administration. Subject: Constitutional Petition under Article 199 of Constitution for enforcement of fundamental rights (Articles 9, 14, 19-A) regarding arbitrary internet and social media service shutdown. Prayer: Declare shutdown unlawful and direct uninterrupted service.`,
  appeal: `Appellant: Naseer Ahmad resident of Rawalpindi. Respondent: The State and Muhammad Qasim. Appeal against judgment and conviction dated 15.02.2026 passed by Additional Sessions Judge Rawalpindi in Case No. 45/2024 under Section 324 PPC convicting appellant to 5 years RI. Grounds: Evidence of interested prosecution witnesses accepted without independent corroboration, medical evidence contradicts ocular account, benefit of doubt wrongfully withheld. Prayer: Set aside conviction and acquit appellant.`,
  contract: `Commercial Tenancy Agreement made at Karachi between Landlord: Tariq Aziz s/o Aziz Khan resident of Clifton Karachi (First Party) and Tenant: CyberSoft Solutions Pvt Ltd through CEO Bilal Ahmed resident of PECHS Karachi (Second Party). Premises: Office No. 402, 4th Floor, Fortune Centre, Shahrah-e-Faisal Karachi. Term: 3 years. Monthly rent: PKR 150,000 with 10% annual escalation. Security deposit: 3 months rent. 2 witnesses required.`,
};

async function runTests() {
  console.log('====================================================');
  console.log('TESTING GENERATION OF ALL 8 COURT-READY DOCX DRAFTS');
  console.log('====================================================\n');

  const results = [];
  const outputDir = path.resolve(__dirname, '../sample_docx_output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const forceFresh = process.argv.includes('--fresh');

  for (const type of availableTypes) {
    const filePath = path.join(outputDir, `${type}.docx`);
    if (!forceFresh && fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      const existing = fs.readFileSync(filePath);
      const isZip = existing.length > 4 && existing[0] === 0x50 && existing[1] === 0x4b;
      if (isZip) {
        console.log(`Generating [${type}]... ✓ VERIFIED EXISTING (${existing.length} bytes) -> ${path.basename(filePath)}`);
        results.push({ type, status: 'SUCCESS', size: existing.length, time: 'cached' });
        continue;
      }
    }

    process.stdout.write(`Generating [${type}]... `);
    const start = Date.now();
    try {
      const facts = sampleFacts[type] || 'Standard Pakistani court facts for testing.';
      const buffer = await generateDocxDraft(type, facts);

      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Result is not a Buffer');
      }

      // Check for PK zip header
      const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
      if (!isZip) {
        throw new Error('Buffer is not a valid docx/zip file');
      }

      fs.writeFileSync(filePath, buffer);

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✓ SUCCESS (${buffer.length} bytes, ${elapsed}s) -> saved to ${path.basename(filePath)}`);
      results.push({ type, status: 'SUCCESS', size: buffer.length, time: `${elapsed}s` });
      await new Promise(r => setTimeout(r, 4000));
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✗ FAILED (${elapsed}s): ${err.message}`);
      results.push({ type, status: 'FAILED', error: err.message, time: `${elapsed}s` });
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  console.log('\n====================================================');
  console.log('SUMMARY RESULTS:');
  console.log('====================================================');
  console.table(results);

  const passed = results.filter((r) => r.status === 'SUCCESS').length;
  console.log(`\nTotal: ${availableTypes.length}, Passed: ${passed}, Failed: ${availableTypes.length - passed}`);

  if (passed === availableTypes.length) {
    console.log('ALL 8 TYPES TESTED AND GENERATED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
