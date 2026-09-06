const C = require("./common");
const { Paragraph, TextRun, AlignmentType } = require("docx");

// A notice is a LETTER, not a court pleading — no court heading, no VERSUS,
// no verification clause. Getting this wrong (treating it like a plaint) is
// one of the most common "looks like a court document but shouldn't" errors.
const schema = {
  date: "string",
  sender: { name: "string", address: "string" },
  recipient: { name: "string", address: "string" },
  subject: "string — one line, e.g. LEGAL NOTICE FOR RECOVERY OF RS. ______",
  body: "string[] — numbered paragraphs stating facts and the demand",
  demandDeadline: "string — e.g. within 14 days of receipt of this notice",
  consequenceOfNonCompliance: "string",
  counsel: "string — advocate name/line issuing the notice",
};

function render(data) {
  return [
    new Paragraph({ alignment: C.RIGHT, spacing: { after: 300 },
      children: [new TextRun({ text: data.date, size: 22, font: C.FONT })] }),
    C.body(`To,\n${data.recipient.name}\n${data.recipient.address}`, { spacing: { after: 300 }, alignment: AlignmentType.LEFT }),
    new Paragraph({ spacing: { after: 200 },
      children: [new TextRun({ text: `Subject: ${data.subject}`, bold: true, underline: {}, size: 24, font: C.FONT })] }),
    C.body("Dear Sir/Madam,", { spacing: { after: 200 } }),
    C.body(`Under instructions from and on behalf of my client, ${data.sender.name}, resident of ${data.sender.address}, I hereby serve upon you the following legal notice:`),
    ...data.body.map((p, i) => C.numbered(i + 1, p)),
    C.body(`You are, therefore, called upon to comply with the above demand ${data.demandDeadline}, failing which ${data.consequenceOfNonCompliance}, and you shall be liable for all costs and consequences thereof.`),
    C.body("A copy of this notice has been retained in my office for record and further necessary action."),
    ...C.signatureBlock(`For and on behalf of ${data.sender.name}`, data.counsel),
  ];
}

module.exports = { schema, render };
