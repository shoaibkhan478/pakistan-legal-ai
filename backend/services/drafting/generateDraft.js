const { Document, Packer } = require("docx");
const C = require("./templates/common");
const registry = require("./templates/registry");

/**
 * generateDraft(type, data) -> Buffer (docx)
 *
 * `type` selects which layout + schema to use.
 * `data` is the STRUCTURED JSON Claude should return for that type
 * (see the `schema` export in each template file — feed that schema
 * straight into your Claude prompt as the required response shape).
 */
async function generateDraft(type, data) {
  const tpl = registry[type];
  if (!tpl) {
    throw new Error(`Unknown draft type: "${type}". Available: ${Object.keys(registry).join(", ")}`);
  }
  const doc = new Document({
    sections: [{ properties: C.pageSetup, children: tpl.render(data) }],
  });
  return Packer.toBuffer(doc);
}

async function formatCourtDocx(titleText, contentText) {
  const { Paragraph, TextRun } = require("docx");
  const paragraphs = [];
  const lines = (contentText || '').split('\n');

  if (titleText) {
    paragraphs.push(C.title(titleText.toUpperCase(), 24));
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) {
      paragraphs.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }

    if (rawLine.startsWith('# ') || rawLine.startsWith('## ') || rawLine.startsWith('### ')) {
      const headingClean = rawLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
      paragraphs.push(C.sectionLabel(headingClean));
    } else if (/^(IN THE COURT OF|IN THE HON'BLE|IN THE HIGH COURT|BEFORE THE|AT THE)/i.test(rawLine)) {
      paragraphs.push(C.title(rawLine.replace(/\*\*/g, '').trim(), 22));
    } else if (/^(APPLICATION UNDER|PETITION UNDER|SUIT UNDER|APPEAL UNDER|WRIT PETITION|CRIMINAL MISC)/i.test(rawLine)) {
      paragraphs.push(C.boxedHeading(rawLine.replace(/\*\*/g, '').trim()));
    } else if (/^(RESPECTFULLY SHEWETH|PRAYER|VERIFICATION|AFFIDAVIT|GROUNDS|MEMO OF PARTIES)/i.test(rawLine)) {
      paragraphs.push(C.sectionLabel(rawLine.replace(/[:\*]/g, '').trim()));
    } else if (/^(\d+)[\.\)]\s+(.*)/.test(rawLine)) {
      const match = rawLine.match(/^(\d+)[\.\)]\s+(.*)/);
      paragraphs.push(C.numbered(parseInt(match[1], 10), match[2].replace(/\*\*/g, '').trim()));
    } else if (/^([A-Z])[\.\)]\s+(.*)/.test(rawLine)) {
      const match = rawLine.match(/^([A-Z])[\.\)]\s+(.*)/);
      paragraphs.push(C.lettered(match[1], match[2].replace(/\*\*/g, '').trim()));
    } else if (/^\s*\.{0,3}\s*VERSUS\s*\.{0,3}\s*$/i.test(rawLine) || rawLine.toUpperCase() === 'VERSUS') {
      paragraphs.push(new Paragraph({
        alignment: C.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "... VERSUS ...", bold: true, size: 24, font: "Times New Roman" })]
      }));
    } else {
      paragraphs.push(C.body(rawLine.replace(/\*\*/g, '')));
    }
  }

  const courtPageSetup = {
    page: {
      size: { width: 12240, height: 15840 },
      margin: { top: 1440, bottom: 1440, left: 2160, right: 1440 },
    },
  };

  const doc = new Document({
    sections: [{ properties: courtPageSetup, children: paragraphs }],
  });
  return Packer.toBuffer(doc);
}

function getSchema(type) {
  const tpl = registry[type];
  if (!tpl) throw new Error(`Unknown draft type: "${type}"`);
  return tpl.schema;
}

module.exports = { generateDraft, getSchema, formatCourtDocx, availableTypes: Object.keys(registry) };

