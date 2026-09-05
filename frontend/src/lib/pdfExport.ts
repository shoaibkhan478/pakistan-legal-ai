/**
 * frontend/src/lib/pdfExport.ts
 *
 * Converts an AI-generated legal document (plain text / lightly-markdown'd,
 * same shape as what docxExport.ts already handles) into a properly
 * formatted, downloadable PDF — court-ready: 1-inch margins, justified body
 * text, centered bold headings, numbered/indented list paragraphs,
 * highlighted [PLACEHOLDER] text so nothing left to fill in gets missed,
 * and page numbers in the footer.
 *
 * Deliberately mirrors the SAME line-classification rules as
 * docxExport.ts (ALL-CAPS short line = heading, "1." / "i." = list item,
 * **bold**, [PLACEHOLDER] = highlighted) so a document looks visually
 * consistent whether the user downloads it as Word or as PDF — same
 * source text, same formatting logic, two output formats.
 *
 * NOTE ON FONT: pdfmake's browser build only ships Roboto by default (no
 * Times New Roman without shipping extra font files), so this PDF uses
 * Roboto rather than the Times New Roman used in the .docx export. Still
 * fully court-appropriate in terms of margins/structure/justification —
 * just a different (still professional, still serif-free/clean) typeface.
 * If a specific court's rules require Times New Roman specifically, use
 * the "Download Word" option instead, or ask to have a licensed Times New
 * Roman TTF embedded (that's a separate, larger change — needs the actual
 * font files added to the project, which can't be done without them).
 */

// pdfmake needs its virtual file system (bundled font data) registered
// before use — done lazily inside the exported function so this module
// stays safe to import from server-rendered pages without pulling
// browser-only code into the SSR bundle.
async function loadPdfMake() {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
  const pdfFonts = (pdfFontsModule as any).default || pdfFontsModule;
  // Different pdfmake versions have shipped the vfs table under slightly
  // different paths — check both rather than assuming one.
  pdfMake.vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs || pdfFonts;
  return pdfMake;
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

/**
 * Splits a line into pdfmake inline text-run objects, handling **bold**
 * and [PLACEHOLDER] tokens the same way docxExport.ts does for .docx.
 */
function parseInlineRunsPdf(line: string): any[] {
  const tokens = line.split(/(\*\*.*?\*\*|\[[^\]]+\])/g).filter((t) => t !== '');
  return tokens.map((tok) => {
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return { text: tok.slice(2, -2), bold: true };
    }
    if (tok.startsWith('[') && tok.endsWith(']')) {
      // pdfmake highlight-equivalent: colored background behind bold text.
      return { text: tok, bold: true, background: '#fff3a3' };
    }
    return { text: tok };
  });
}

/**
 * Builds the pdfmake `content` array for the document body — same
 * heading/list/paragraph classification as docxExport.ts's
 * draftTextToParagraphs(), just targeting pdfmake's content-spec shape
 * instead of docx.js Paragraph objects.
 */
export function draftTextToPdfContent(raw: string): any[] {
  const cleaned = raw
    .replace(/\*\*Sources consulted[\s\S]*$/i, '')
    .replace(/⚖️\s*\*\*DISCLAIMER\*\*[\s\S]*$/i, '')
    .trim();

  const lines = cleaned.split('\n');
  const content: any[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      content.push({ text: '', margin: [0, 4, 0, 4] });
      continue;
    }

    if (isHeadingLine(trimmed)) {
      content.push({
        text: trimmed.replace(/\*\*/g, ''),
        bold: true,
        fontSize: 13,
        alignment: 'center',
        margin: [0, 14, 0, 10],
      });
      continue;
    }

    if (isListLine(trimmed)) {
      content.push({
        text: parseInlineRunsPdf(trimmed),
        alignment: 'justify',
        margin: [18, 0, 0, 10],
        lineHeight: 1.3,
      });
      continue;
    }

    content.push({
      text: parseInlineRunsPdf(trimmed),
      alignment: 'justify',
      margin: [0, 0, 0, 10],
      lineHeight: 1.3,
    });
  }

  return content;
}

/**
 * Downloads `text` as a court-ready formatted PDF.
 *
 * @param text - the document body (plain text / lightly-markdown'd, same
 *               shape passed to downloadDraftAsWord)
 * @param filename - without extension; ".pdf" is appended if missing
 * @param options.title - optional short title shown in the PDF's own
 *               metadata (not printed on the page — the body's own heading
 *               lines are what actually appear on the page)
 */
export async function downloadTextAsPdf(
  text: string,
  filename: string,
  options: { title?: string } = {}
) {
  const pdfMake = await loadPdfMake();

  const docDefinition: any = {
    info: { title: options.title || filename },
    pageSize: 'A4',
    // 1-inch margins on all sides (72pt = 1in) — standard for court filings.
    pageMargins: [72, 72, 72, 96],
    defaultStyle: { fontSize: 11 },
    content: draftTextToPdfContent(text),
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 9,
          color: '#666666',
          margin: [0, 8, 0, 0],
        },
      ],
    }),
  };

  // Same disclaimer footer docxExport.ts appends to the .docx version —
  // kept identical in wording so both download formats carry the same
  // caveat regardless of which one the user picks.
  docDefinition.content.push(
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 451, y2: 0, lineWidth: 0.5, lineColor: '#999999' }], margin: [0, 20, 0, 10] },
    {
      text: [
        { text: 'Disclaimer: ', bold: true, italics: true, fontSize: 9 },
        {
          text: 'This is an AI-generated first draft for illustrative purposes only. Highlighted placeholders must be completed, and the document must be reviewed by a practicing advocate before any legal use.',
          italics: true,
          fontSize: 9,
        },
      ],
    }
  );

  pdfMake.createPdf(docDefinition).download(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
