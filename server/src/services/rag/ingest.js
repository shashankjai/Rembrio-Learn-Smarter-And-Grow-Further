import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { Document } from '../../models/Document.js';
import { DocumentChunk } from '../../models/DocumentChunk.js';
import { extractPdfPages, totalTextLength } from '../pdf/extract.js';
import { chunkPages } from '../pdf/chunker.js';
import { embedTexts } from '../embeddings/embeddings.js';

const MIN_TEXT_CHARS = 50;
const INSERT_BATCH = 200;

// Errors we raised ourselves (ApiError / explicit status) carry user-safe messages; anything else is generic.
const safeMessage = (err) => (err?.status && err.message ? err.message : 'Processing failed unexpectedly.');

/**
 * Upload -> extract -> chunk -> embed -> store. The document only becomes "ready"
 * after every chunk has been embedded and persisted.
 */
export async function processDocument(documentId) {
  const doc = await Document.findById(documentId);
  if (!doc) return;
  try {
    const buffer = await fs.readFile(path.join(env.uploadDir, doc.storedName));
    const { pages, pageCount } = await extractPdfPages(buffer);

    if (totalTextLength(pages) < MIN_TEXT_CHARS) {
      throw Object.assign(
        new Error(
          'No extractable text was found. This looks like a scanned or image-only PDF, which is not supported (no OCR).'
        ),
        { status: 422 }
      );
    }

    const chunks = chunkPages(pages, { chunkSize: env.chunkSize, overlap: env.chunkOverlap });
    if (!chunks.length) throw Object.assign(new Error('The PDF did not contain usable text.'), { status: 422 });

    const vectors = await embedTexts(
      chunks.map((c) => c.text),
      'RETRIEVAL_DOCUMENT'
    );

    await DocumentChunk.deleteMany({ documentId: doc._id }); // idempotent re-processing
    for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
      const slice = chunks.slice(i, i + INSERT_BATCH).map((c, j) => ({
        userId: doc.userId,
        documentId: doc._id,
        filename: doc.originalName,
        page: c.page,
        chunkIndex: c.chunkIndex,
        text: c.text,
        embedding: vectors[i + j],
      }));
      await DocumentChunk.insertMany(slice);
    }

    doc.pageCount = pageCount;
    doc.chunkCount = chunks.length;
    doc.status = 'ready';
    doc.errorMessage = '';
    doc.processedAt = new Date();
    await doc.save();
  } catch (err) {
    await DocumentChunk.deleteMany({ documentId: doc._id }).catch(() => {});
    doc.status = 'failed';
    doc.errorMessage = safeMessage(err);
    await doc.save().catch(() => {});
    if (!env.isTest) console.error(`[ingest] document ${doc._id} failed:`, err.message);
  }
}
