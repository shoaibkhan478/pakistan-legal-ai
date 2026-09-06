const C = require("./common");
const { Paragraph, TextRun } = require("docx");

// This is the exact JSON shape Claude should be prompted to return for THIS type.
// Different document types get DIFFERENT schemas — that's what "accurate per type" means.
const schema = {
  courtName: "string — e.g. IN THE COURT OF THE SESSIONS JUDGE, KARACHI (SOUTH)",
  caseNo: "string — e.g. Cr. Bail Application No. ___/2026",
  applicant: { name: "string", cnic: "string", address: "string" },
  respondent: "string — usually 'The State'",
  firNo: "string", policeStation: "string", sections: "string — PPC/CrPC sections",
  applicationTitle: "string — e.g. APPLICATION UNDER SECTION 497 Cr.P.C FOR GRANT OF POST-ARREST BAIL",
  facts: "string[] — numbered grounds for bail",
  prayer: "string",
};

function render(data) {
  return [
    ...C.courtHeadingBlock({ courtName: data.courtName, caseNo: data.caseNo }),
    ...C.causeTitleBlock({
      party1Name: data.applicant.name, party1Tag: "APPLICANT",
      party1Details: `S/o/D/o details — CNIC: ${data.applicant.cnic}\nAddress: ${data.applicant.address}`,
      party2Name: data.respondent, party2Tag: "RESPONDENT",
    }),
    C.boxedHeading(data.applicationTitle),
    C.body(`(Arising out of ${data.firNo}, u/s ${data.sections}, registered at ${data.policeStation})`, { alignment: C.CENTER, spacing: { after: 300 } }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "RESPECTFULLY SHEWETH:", bold: true, underline: {}, size: 24, font: C.FONT })] }),
    ...data.facts.map((f, i) => C.numbered(i + 1, f)),
    C.sectionLabel("PRAYER:"),
    C.body(data.prayer),
    ...C.signatureBlock("APPLICANT", "Advocate High Court"),
    ...C.verificationBlock(
      `Verified on oath at ______ this _____ day of __________, 2026, that the contents of the above Application are true and correct to the best of my knowledge and belief and nothing has been concealed from this Hon'ble Court.`
    ),
  ];
}

module.exports = { schema, render };
