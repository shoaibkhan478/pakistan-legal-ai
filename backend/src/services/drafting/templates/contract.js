const C = require("./common");
const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = require("docx");

// A contract has NO court heading, NO versus, NO verification, NO prayer.
// Its skeleton is: title -> recitals (WHEREAS clauses) -> numbered clauses/
// terms -> dual signature blocks with witnesses. Treating it like a pleading
// is the single most common "wrong document shape" mistake for this type.
const schema = {
  agreementTitle: "string — e.g. RENT AGREEMENT / SERVICE AGREEMENT / SALE AGREEMENT",
  date: "string",
  place: "string",
  partyA: { role: "string — e.g. LANDLORD / FIRST PARTY", name: "string", parentage: "string", address: "string" },
  partyB: { role: "string — e.g. TENANT / SECOND PARTY", name: "string", parentage: "string", address: "string" },
  recitals: "string[] — WHEREAS background statements",
  clauses: "string[] — numbered terms and conditions",
  witnesses: "string[] — witness names/labels, usually 2",
};

function render(data) {
  return [
    C.title(data.agreementTitle),
    C.body(`This Agreement is made at ${data.place} on this ${data.date} between:`, { spacing: { after: 300 } }),
    C.body(`${data.partyA.name}, ${data.partyA.parentage}, resident of ${data.partyA.address}, hereinafter referred to as the "${data.partyA.role}" (which expression shall include his/her heirs, successors and assigns);`, { spacing: { after: 200 } }),
    C.body("AND", { spacing: { after: 200 }, alignment: C.CENTER }),
    C.body(`${data.partyB.name}, ${data.partyB.parentage}, resident of ${data.partyB.address}, hereinafter referred to as the "${data.partyB.role}" (which expression shall include his/her heirs, successors and assigns);`, { spacing: { after: 300 } }),
    C.body(`${data.partyA.role} and ${data.partyB.role} are hereinafter collectively referred to as the "Parties".`, { spacing: { after: 300 } }),

    ...(data.recitals || []).map((r) =>
      C.body(`WHEREAS ${r}`, { spacing: { after: 150 } })
    ),
    C.body("NOW THEREFORE, the Parties agree as follows:", { spacing: { before: 200, after: 300 } }),

    ...data.clauses.map((cl, i) => C.numbered(i + 1, cl)),

    C.body("IN WITNESS WHEREOF, the Parties have set their hands on this Agreement on the day, month and year first above written.", { spacing: { before: 400, after: 400 } }),

    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              borders: { top: {style:"none"}, bottom: {style:"none"}, left: {style:"none"}, right: {style:"none"} },
              children: [
                new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: "_______________________", size: 22, font: C.FONT })] }),
                new Paragraph({ children: [new TextRun({ text: `${data.partyA.role}`, bold: true, size: 22, font: C.FONT })] }),
                new Paragraph({ children: [new TextRun({ text: data.partyA.name, size: 22, font: C.FONT })] }),
              ],
            }),
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              borders: { top: {style:"none"}, bottom: {style:"none"}, left: {style:"none"}, right: {style:"none"} },
              children: [
                new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: "_______________________", size: 22, font: C.FONT })] }),
                new Paragraph({ children: [new TextRun({ text: `${data.partyB.role}`, bold: true, size: 22, font: C.FONT })] }),
                new Paragraph({ children: [new TextRun({ text: data.partyB.name, size: 22, font: C.FONT })] }),
              ],
            }),
          ],
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 500, after: 200 }, children: [new TextRun({ text: "WITNESSES:", bold: true, underline: {}, size: 24, font: C.FONT })] }),
    ...(data.witnesses || []).map((w, i) =>
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `${i + 1}. ${w}`, size: 22, font: C.FONT })] })
    ),
  ];
}

module.exports = { schema, render };
