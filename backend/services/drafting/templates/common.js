/**
 * COMMON BUILDING BLOCKS
 * ----------------------
 * Every legal document is built from a small set of reusable pieces.
 * What changes between types is WHICH pieces are used, in WHAT order,
 * and with what exact wording — not the underlying formatting engine.
 */
const { Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType } = require("docx");

const FONT = "Times New Roman";
const JUSTIFY = AlignmentType.JUSTIFIED;
const CENTER = AlignmentType.CENTER;
const RIGHT = AlignmentType.RIGHT;

const pageSetup = {
  page: {
    size: { width: 12240, height: 15840 }, // Letter; use 11906x16838 for A4
    margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
  },
};

function title(text, size = 26) {
  return new Paragraph({
    alignment: CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text, bold: true, size, font: FONT })],
  });
}

function boxedHeading(text) {
  return new Paragraph({
    alignment: CENTER,
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    },
    spacing: { before: 100, after: 300 },
    children: [new TextRun({ text, bold: true, size: 24, font: FONT })],
  });
}

function sectionLabel(text) {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text, bold: true, underline: {}, size: 24, font: FONT })],
  });
}

function body(text, opts = {}) {
  // Support "\n" in the input text as real line breaks (docx ignores literal \n
  // inside a single TextRun, so split it into runs joined by explicit breaks).
  const lines = String(text).split("\n");
  const children = [];
  lines.forEach((line, i) => {
    if (i > 0) children.push(new TextRun({ text: "", break: 1 }));
    children.push(new TextRun({ text: line, size: 24, font: FONT }));
  });
  return new Paragraph({
    alignment: JUSTIFY,
    spacing: { after: 200, line: 360 },
    children,
    ...opts,
  });
}

function numbered(num, text) {
  return new Paragraph({
    alignment: JUSTIFY,
    spacing: { after: 200, line: 360 },
    indent: { left: 400, hanging: 400 },
    tabStops: [{ type: TabStopType.LEFT, position: 400 }],
    children: [
      new TextRun({ text: `${num}.\t`, bold: true, size: 24, font: FONT }),
      new TextRun({ text, size: 24, font: FONT }),
    ],
  });
}

// "IN THE COURT OF..." + case number — used by anything FILED IN a court
// (bail application, plaint, petition, appeal). NOT used by notices/affidavits
// that stand alone (affidavit has its own oath heading; notice has no court).
function courtHeadingBlock({ courtName, caseNo }) {
  return [
    title(courtName),
    caseNo ? title(caseNo, 24) : null,
  ].filter(Boolean);
}

// Party-vs-party cause title — used by anything with two contesting sides
// (bail application, plaint, appeal, petition). A legal notice or affidavit
// does not use "VERSUS" — a notice goes "To,", an affidavit just names the deponent.
function causeTitleBlock({ party1Label, party1Name, party1Details, party1Tag,
                            party2Label, party2Name, party2Tag }) {
  const rows = [];
  rows.push(body(party1Name, { spacing: { after: 100 }, alignment: AlignmentType.LEFT }));
  if (party1Details) rows.push(body(party1Details, { spacing: { after: 100 }, alignment: AlignmentType.LEFT }));
  rows.push(new Paragraph({
    alignment: CENTER,
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: `...................${party1Tag}`, bold: true, size: 22, font: FONT })],
  }));
  rows.push(new Paragraph({
    alignment: CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "VERSUS", bold: true, size: 24, font: FONT })],
  }));
  rows.push(body(party2Name, { spacing: { after: 100 }, alignment: AlignmentType.LEFT }));
  rows.push(new Paragraph({
    alignment: CENTER,
    spacing: { before: 100, after: 300 },
    children: [new TextRun({ text: `...............${party2Tag}`, bold: true, size: 22, font: FONT })],
  }));
  return rows;
}

// Signature block — wording changes by role (Applicant/Plaintiff/Notice-giver/Deponent)
function signatureBlock(roleLabel, counselLine) {
  const out = [
    new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: " " })] }),
    new Paragraph({ alignment: RIGHT, spacing: { after: 100 },
      children: [new TextRun({ text: roleLabel, size: 22, font: FONT })] }),
  ];
  if (counselLine) {
    out.push(new Paragraph({ alignment: RIGHT, spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: "Through", size: 22, font: FONT })] }));
    out.push(new Paragraph({ alignment: RIGHT, spacing: { after: 100 },
      children: [new TextRun({ text: counselLine, bold: true, size: 22, font: FONT })] }));
  }
  return out;
}

// Verification — mandatory on pleadings (bail app, plaint, petition) filed
// under oath. NOT used on a legal notice (notices aren't verified before a
// court). Affidavits have their own separate oath/attestation clause instead.
function verificationBlock(text, deponentLabel = "DEPONENT / APPLICANT") {
  return [
    sectionLabel("VERIFICATION:"),
    body(text),
    new Paragraph({ alignment: RIGHT, spacing: { before: 300 },
      children: [new TextRun({ text: deponentLabel, size: 22, font: FONT })] }),
  ];
}

module.exports = {
  FONT, JUSTIFY, CENTER, RIGHT, pageSetup,
  title, boxedHeading, sectionLabel, body, numbered,
  courtHeadingBlock, causeTitleBlock, signatureBlock, verificationBlock,
};
