const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { formatCourtDocx } = require('../src/services/drafting/generateDraft');
const fs = require('fs');

async function testCourtDrafting() {
  console.log('--- Testing Court-Ready .docx Generation ---');

  const sampleDraft = `IN THE COURT OF THE LEARNED SESSIONS JUDGE / EX-OFFICIO JUSTICE OF PEACE, RAWALPINDI

Criminal Misc. Application No. _________ / 2026

Muhammad Asad, S/o Tariq Mehmood, CNIC No. 37405-1234567-1, Resident of House No. 12, Street 4, Satellite Town, Rawalpindi.
... PETITIONER / APPLICANT

... VERSUS ...

1. The State
2. Station House Officer (SHO), Police Station New Town, Rawalpindi.
... RESPONDENTS

PETITION UNDER SECTION 22-A & 22-B CR.P.C. FOR ISSUANCE OF DIRECTIONS TO RESPONDENT NO. 2 (SHO) FOR REGISTRATION OF CRIMINAL CASE (FIR) UNDER SECTIONS 420, 468, 471 PPC

RESPECTFULLY SHEWETH:

1. That the Petitioner is a law-abiding citizen of Pakistan and permanently resides at the address mentioned above.
2. That on 15.08.2026, the proposed accused committed fraud and issued a bogus cheque for an amount of Rs. 2,500,000/-.
3. That despite disclosure of a cognizable offence, Respondent No. 2 has refused to register the FIR in sheer violation of Section 154 Cr.P.C.

GROUNDS:
A. That the provisions of Section 154 Cr.P.C. are mandatory and the police is under statutory obligation to register an FIR upon receipt of information disclosing a cognizable offence (reliance placed on PLD 2007 SC 538).
B. That the inaction of the police is mala fide and colorable exercise of power violating the fundamental rights of the Petitioner enshrined under Articles 4, 9, 10-A, and 25 of the Constitution of Pakistan, 1973.

PRAYER:
It is, therefore, most respectfully and humbly prayed that this Hon'ble Court may graciously be pleased to:
a) Direct Respondent No. 2 to immediately register a criminal case (FIR) against the proposed accused under the relevant sections of PPC;
b) Grant any other relief deemed just and proper in the interest of justice.

PETITIONER
Through:
Mian Ali Advocate High Court
CC No. HC-98765

VERIFICATION:
Verified on oath at Rawalpindi on this 29th day of September, 2026, that the contents of paragraphs 1 to 3 are true and correct to my knowledge and grounds A to B are believed to be true based on legal advice.
DEPONENT

AFFIDAVIT
I, Muhammad Asad, S/o Tariq Mehmood, adult, resident of Rawalpindi, do solemnly affirm that the contents of the petition are true and no previous application has been filed before any court.
DEPONENT
ATTESTED BY OATH COMMISSIONER`;

  const buffer = await formatCourtDocx('Petition under Section 22-A CrPC', sampleDraft);
  console.log('✅ Generated .docx buffer length:', buffer.length);
  if (buffer.length > 5000) {
    console.log('✅ .docx file is a valid, well-formed Word document!');
  } else {
    throw new Error('Generated buffer is unexpectedly small');
  }
}

testCourtDrafting().catch(e => {
  console.error('❌ Error testing court drafting:', e);
  process.exit(1);
});
