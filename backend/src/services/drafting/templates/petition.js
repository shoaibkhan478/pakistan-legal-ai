const C = require("./common");
const { Paragraph, TextRun } = require("docx");

// A writ petition (Art. 199) shares the court-pleading skeleton with a plaint,
// but its middle section is "GROUNDS" (legal arguments) rather than a
// commercial "cause of action", and the prayer asks for a WRIT/declaration,
// not a money decree.
const schema = {
  courtName: "string — e.g. IN THE HIGH COURT OF SINDH AT KARACHI",
  caseNo: "string — e.g. Constitutional Petition No. ___/2026",
  petitioner: { name: "string", parentage: "string", address: "string" },
  respondents: "string[] — list of respondent names/designations (e.g. government functionaries)",
  petitionTitle: "string — e.g. PETITION UNDER ARTICLE 199 OF THE CONSTITUTION OF PAKISTAN",
  facts: "string[] — numbered factual background paragraphs",
  grounds: "string[] — numbered legal grounds (e.g. violation of fundamental rights, excess of jurisdiction)",
  prayer: "string",
};

function render(data) {
  return [
    ...C.courtHeadingBlock({ courtName: data.courtName, caseNo: data.caseNo }),
    ...C.causeTitleBlock({
      party1Name: data.petitioner.name, party1Tag: "PETITIONER",
      party1Details: `${data.petitioner.parentage}\nAddress: ${data.petitioner.address}`,
      party2Name: data.respondents.map((r, i) => `${i + 1}. ${r}`).join("\n"), party2Tag: "RESPONDENT(S)",
    }),
    C.boxedHeading(data.petitionTitle),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "RESPECTFULLY SHEWETH:", bold: true, underline: {}, size: 24, font: C.FONT })] }),
    C.sectionLabel("FACTS:"),
    ...data.facts.map((f, i) => C.numbered(i + 1, f)),
    C.sectionLabel("GROUNDS:"),
    ...data.grounds.map((g, i) => C.numbered(i + 1, g)),
    C.sectionLabel("PRAYER:"),
    C.body(data.prayer),
    ...C.signatureBlock("PETITIONER", "Advocate High Court"),
    ...C.verificationBlock(
      `Verified at ______ on this _____ day of __________, 2026, that the contents of the above petition are true and correct to the best of my knowledge and belief and nothing has been concealed from this Hon'ble Court.`,
      "PETITIONER"
    ),
  ];
}

module.exports = { schema, render };
