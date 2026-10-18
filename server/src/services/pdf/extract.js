import { PDFParse } from 'pdf-parse';

/**
 * Extract text per page so every chunk can later be cited with an exact page number.
 * Note: this reads the PDF text layer only. Scanned/image-only PDFs have no text
 * layer and yield empty pages (no OCR is implemented).
 * @param {Buffer} buffer
 * @returns {Promise<{ pages: {page:number,text:string}[], pageCount:number }>}
 */
export async function extractPdfPages(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const pages = result.pages.map((p) => ({ page: p.num, text: p.text || '' }));
    return { pages, pageCount: result.total ?? pages.length };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

export const totalTextLength = (pages) => pages.reduce((n, p) => n + p.text.trim().length, 0);
