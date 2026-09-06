const C = require("./common");
const { Paragraph, TextRun } = require("docx");

// An appeal's defining feature is the reference to the IMPUGNED
// judgment/order (court, date, case no. below) — that block doesn't exist
// in a fresh plaint/petition. Grounds of appeal replace "facts" as the core.
const schema = {
  courtName: "string — e.g. IN THE HIGH COURT OF SINDH AT KARACHI (Appellate Jurisdiction)",
  caseNo: "string — e.g. Criminal Appeal No. ___/2026",
  appellant: { name: "string", address: "string" },
  respondent: "string",
  impugnedOrder: { court: "string", date: "string", caseNo: "string", briefDescription: "string" },
  appealTitle: "string — e.g. APPEAL AGAINST THE JUDGMENT AND ORDER DATED __________",
  grounds: "string[] — numbered grounds of appeal",
  prayer: "string",
};

function render(data) {
  return [
    ...C.courtHeadingBlock({ courtName: data.courtName, caseNo: data.caseNo }),
    ...C.causeTitleBlock({
      party1Name: data.appellant.name, party1Tag: "APPELLANT",
      party1Details: `Address: ${data.appellant.address}`,
      party2Name: data.respondent, party2Tag: "RESPONDENT",
    }),
    C.boxedHeading(data.appealTitle),
    C.body(
      `(Being an appeal against the judgment/order dated ${data.impugnedOrder.date} passed by ${data.impugnedOrder.court} in ${data.impugnedOrder.caseNo}, whereby ${data.impugnedOrder.briefDescription})`,
      { alignment: C.CENTER, spacing: { after: 300 } }
    ),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "RESPECTFULLY SHEWETH:", bold: true, underline: {}, size: 24, font: C.FONT })] }),
    C.sectionLabel("GROUNDS OF APPEAL:"),
    ...data.grounds.map((g, i) => C.numbered(i + 1, g)),
    C.sectionLabel("PRAYER:"),
    C.body(data.prayer),
    ...C.signatureBlock("APPELLANT", "Advocate High Court"),
    ...C.verificationBlock(
      `Verified at ______ on this _____ day of __________, 2026, that the contents of the above appeal are true and correct to the best of my knowledge and belief and nothing has been concealed from this Hon'ble Court.`,
      "APPELLANT"
    ),
  ];
}

module.exports = { schema, render };
