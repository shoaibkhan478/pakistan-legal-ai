const C = require("./common");
const { Paragraph, TextRun, AlignmentType } = require("docx");

// A reply-to-notice is still a LETTER (like the notice itself) — no court
// heading, no verification — but its body structure is point-by-point
// admission/denial against the original notice's paragraphs, ending with
// a rebuttal + counter-warning rather than a fresh demand.
const schema = {
  date: "string",
  sender: { name: "string", address: "string" },
  recipient: { name: "string", address: "string" },
  originalNoticeRef: "string — e.g. 'your notice dated 01.08.2026'",
  subject: "string — e.g. REPLY TO LEGAL NOTICE DATED 01.08.2026",
  responses: "string[] — numbered para-wise admission/denial of the original notice's claims",
  concludingStatement: "string — overall rebuttal / position of the client",
  counterWarning: "string — optional warning of counter-action if pursued frivolously",
  counsel: "string",
};

function render(data) {
  return [
    new Paragraph({ alignment: C.RIGHT, spacing: { after: 300 },
      children: [new TextRun({ text: data.date, size: 22, font: C.FONT })] }),
    C.body(`To,\n${data.recipient.name}\n${data.recipient.address}`, { spacing: { after: 300 }, alignment: AlignmentType.LEFT }),
    new Paragraph({ spacing: { after: 200 },
      children: [new TextRun({ text: `Subject: ${data.subject}`, bold: true, underline: {}, size: 24, font: C.FONT })] }),
    C.body("Dear Sir/Madam,", { spacing: { after: 200 } }),
    C.body(`Under instructions from and on behalf of my client, ${data.sender.name}, I am directed to reply to ${data.originalNoticeRef} as under:`),
    ...data.responses.map((r, i) => C.numbered(i + 1, r)),
    C.sectionLabel("CONCLUSION:"),
    C.body(data.concludingStatement),
    ...(data.counterWarning ? [C.body(data.counterWarning)] : []),
    ...C.signatureBlock(`For and on behalf of ${data.sender.name}`, data.counsel),
  ];
}

module.exports = { schema, render };
