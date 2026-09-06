const C = require("./common");
const { Paragraph, TextRun } = require("docx");

// An affidavit has NO court heading and NO "versus" — it's a sworn statement
// by one person. Its defining feature is the "jurat" (the attestation clause
// at the end), not a prayer/relief section.
const schema = {
  deponent: { name: "string", parentage: "string", cnic: "string", address: "string" },
  purpose: "string — e.g. AFFIDAVIT IN SUPPORT OF APPLICATION FOR ______",
  statements: "string[] — numbered sworn statements",
  place: "string", 
};

function render(data) {
  return [
    C.title("AFFIDAVIT"),
    C.body(`I, ${data.deponent.name}, ${data.deponent.parentage}, holder of CNIC No. ${data.deponent.cnic}, resident of ${data.deponent.address}, do hereby solemnly affirm and declare on oath as under:`, { spacing: { after: 300 } }),
    C.boxedHeading(data.purpose),
    ...data.statements.map((s, i) => C.numbered(i + 1, s)),
    C.body("That the contents of this affidavit are true and correct to the best of my knowledge and belief and nothing has been concealed therein.", { spacing: { before: 100, after: 400 } }),
    new Paragraph({ alignment: C.RIGHT, spacing: { after: 100 },
      children: [new TextRun({ text: "DEPONENT", bold: true, size: 22, font: C.FONT })] }),
    new Paragraph({ spacing: { before: 400, after: 100 },
      children: [new TextRun({ text: "Identified by:", size: 22, font: C.FONT })] }),
    C.body(`Solemnly affirmed and signed before me at ${data.place} on this _____ day of __________, 2026, by the above-named deponent who is identified to me and whose signature/thumb impression has been verified.`, { spacing: { before: 100 } }),
    new Paragraph({ alignment: C.RIGHT, spacing: { before: 300 },
      children: [new TextRun({ text: "OATH COMMISSIONER / NOTARY PUBLIC", size: 22, font: C.FONT })] }),
  ];
}

module.exports = { schema, render };
