const C = require("./common");
const { Paragraph, TextRun } = require("docx");

const schema = {
  courtName: "string — e.g. IN THE COURT OF SENIOR CIVIL JUDGE, LAHORE",
  caseNo: "string — e.g. Civil Suit No. ___/2026",
  plaintiff: { name: "string", parentage: "string", address: "string" },
  defendant: { name: "string", address: "string" },
  suitTitle: "string — e.g. SUIT FOR RECOVERY OF RS. ______ ALONG WITH DAMAGES",
  valuationForCourtFee: "string",
  valuationForJurisdiction: "string",
  courtFeePaid: "string",
  facts: "string[] — numbered paragraphs stating cause of action",
  causeOfActionParagraph: "string — when and how the cause of action arose (required in every plaint)",
  jurisdictionParagraph: "string — why this court has jurisdiction (required)",
  reliefClaimed: "string[] — list of specific reliefs sought",
};

function render(data) {
  return [
    ...C.courtHeadingBlock({ courtName: data.courtName, caseNo: data.caseNo }),
    ...C.causeTitleBlock({
      party1Name: data.plaintiff.name, party1Tag: "PLAINTIFF",
      party1Details: `${data.plaintiff.parentage}\nAddress: ${data.plaintiff.address}`,
      party2Name: `${data.defendant.name}\nAddress: ${data.defendant.address}`, party2Tag: "DEFENDANT",
    }),
    C.boxedHeading(data.suitTitle),
    C.body(`Valuation for court fee: ${data.valuationForCourtFee}   |   Valuation for jurisdiction: ${data.valuationForJurisdiction}   |   Court fee paid: ${data.courtFeePaid}`, { alignment: C.CENTER, spacing: { after: 300 } }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "RESPECTFULLY SHEWETH:", bold: true, underline: {}, size: 24, font: C.FONT })] }),
    ...data.facts.map((f, i) => C.numbered(i + 1, f)),
    C.numbered(data.facts.length + 1, data.causeOfActionParagraph),
    C.numbered(data.facts.length + 2, data.jurisdictionParagraph),
    C.sectionLabel("PRAYER / RELIEF CLAIMED:"),
    C.body("It is, therefore, most respectfully prayed that this Hon'ble Court may graciously be pleased to:"),
    ...data.reliefClaimed.map((r, i) =>
      new Paragraph({
        alignment: C.JUSTIFY, spacing: { after: 150 }, indent: { left: 400, hanging: 300 },
        children: [
          new TextRun({ text: `${String.fromCharCode(97 + i)}) `, bold: true, size: 24, font: C.FONT }),
          new TextRun({ text: r, size: 24, font: C.FONT }),
        ],
      })
    ),
    C.body("Any other relief which this Hon'ble Court deems fit may also be granted in the interest of justice."),
    ...C.signatureBlock("PLAINTIFF", "Advocate High Court"),
    ...C.verificationBlock(
      `Verified at ______ on this _____ day of __________, 2026, that the contents of paras 1 to ${data.facts.length} are true to my personal knowledge and paras ${data.facts.length + 1} onwards are believed to be true on legal advice, and nothing has been concealed.`,
      "PLAINTIFF"
    ),
  ];
}

module.exports = { schema, render };
