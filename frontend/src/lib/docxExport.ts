/**
 * Converts an AI-generated legal draft (plain text / lightly-markdown'd)
 * into a properly formatted, downloadable .docx file — instead of leaving
 * the user to copy-paste raw text into Word themselves.
 *
 * Formatting rules applied line-by-line:
 *   - ALL-CAPS short lines (headings like "GROUNDS FOR BAIL:") -> bold, centered-ish heading
 *   - Lines starting with a number/roman-numeral + "." -> indented list paragraph
 *   - **bold** markdown -> bold run
 *   - [BRACKETED PLACEHOLDERS] -> bold + yellow-highlighted run, so nothing
 *     the user still needs to fill in gets missed
 *   - Blank lines -> paragraph spacing
 */
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

const FONT = 'Times New Roman';

function parseInlineRuns(line: string): TextRun[] {
  // Split on **bold** and [PLACEHOLDER] tokens, preserving order.
  const tokens = line.split(/(\*\*.*?\*\*|\[[^\]]+\])/g).filter((t) => t !== '');
  return tokens.map((tok) => {
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return new TextRun({ text: tok.slice(2, -2), bold: true, font: FONT });
    }
    if (tok.startsWith('[') && tok.endsWith(']')) {
      return new TextRun({ text: tok, bold: true, highlight: 'yellow', font: FONT });
    }
    return new TextRun({ text: tok, font: FONT });
  });
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 90) return false;
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase();
}

function isListLine(line: string): boolean {
  return /^\s*(\d+|[ivxlc]+)[.)]\s+/i.test(line);
}

export function draftTextToParagraphs(raw: string): Paragraph[] {
  // Strip the "Sources consulted" / disclaimer footer if present — those
  // render separately in-app and don't belong inside the filed document body.
  const cleaned = raw
    .replace(/\*\*Sources consulted[\s\S]*$/i, '')
    .replace(/⚖️\s*\*\*DISCLAIMER\*\*[\s\S]*$/i, '')
    .trim();

  const lines = cleaned.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      continue;
    }

    if (isHeadingLine(trimmed)) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 160 },
        children: [new TextRun({ text: trimmed.replace(/\*\*/g, ''), bold: true, font: FONT, size: 24 })],
      }));
      continue;
    }

    if (isListLine(trimmed)) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 160, line: 300 },
        indent: { left: 360, hanging: 360 },
        children: parseInlineRuns(trimmed),
      }));
      continue;
    }

    paragraphs.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 160, line: 300 },
      children: parseInlineRuns(trimmed),
    }));
  }

  return paragraphs;
}

export async function downloadDraftAsWord(draftText: string, filename: string) {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // US Letter
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          ...draftTextToParagraphs(draftText),
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: '999999' } },
            spacing: { before: 400, after: 120 },
            children: [],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Disclaimer: ',
                bold: true,
                italics: true,
                size: 18,
                font: FONT,
              }),
              new TextRun({
                text: 'This is an AI-generated first draft for illustrative purposes only. Highlighted placeholders must be completed, and the document must be reviewed by a practicing advocate before any legal use.',
                italics: true,
                size: 18,
                font: FONT,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename.endsWith('.docx') ? filename : `${filename}.docx`);
}
