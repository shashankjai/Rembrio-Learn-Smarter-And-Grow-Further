import { describe, it, expect } from 'vitest';
import { extractPdfPages, totalTextLength } from '../src/services/pdf/extract.js';
import { chunkPages } from '../src/services/pdf/chunker.js';
import { buildPdf } from './helpers/pdf.js';

describe('PDF extraction (real pdf-parse)', () => {
  it('extracts text per page with correct page numbers', async () => {
    const pdf = buildPdf([
      'Cell biology: the mitochondria is the powerhouse of the cell.',
      'Genetics: DNA is transcribed into RNA and translated into protein.',
      'Ecology: producers form the base of every food chain.',
    ]);
    const { pages, pageCount } = await extractPdfPages(pdf);
    expect(pageCount).toBe(3);
    expect(pages.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(pages[0].text).toContain('mitochondria');
    expect(pages[1].text).toContain('DNA');
    expect(pages[2].text).toContain('food chain');
  });

  it('feeds page-aware chunking', async () => {
    const { pages } = await extractPdfPages(buildPdf(['Alpha beta gamma delta epsilon zeta eta theta.', 'Iota kappa lambda mu nu xi omicron pi.']));
    const chunks = chunkPages(pages, { chunkSize: 200, overlap: 20 });
    expect(chunks.map((c) => c.page)).toEqual([1, 2]);
  });

  it('reports no text for a page-only PDF (scanned PDFs have no text layer)', async () => {
    const { pages } = await extractPdfPages(buildPdf(['', '']));
    expect(totalTextLength(pages)).toBe(0);
  });

  it('rejects garbage that is not a PDF', async () => {
    await expect(extractPdfPages(Buffer.from('this is not a pdf at all'))).rejects.toBeTruthy();
  });
});
