import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Document } from '../models/Document.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { ApiError } from '../utils/ApiError.js';
import { hasPdfSignature, safeUnlink } from '../middleware/upload.js';
import { processDocument } from '../services/rag/ingest.js';

const sha256File = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', (d) => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });

const cleanName = (name) =>
  path
    .basename(name || 'document.pdf')
    .replace(/[^\p{L}\p{N}._ ()-]/gu, '_')
    .slice(0, 255);

export async function uploadDocument(req, res) {
  const file = req.file;
  if (!file) throw ApiError.badRequest('Choose a PDF file to upload.');

  if (!hasPdfSignature(file.path)) {
    safeUnlink(file.path);
    throw ApiError.badRequest('That file is not a valid PDF.');
  }

  const fileHash = await sha256File(file.path);
  const existing = await Document.findOne({ userId: req.user._id, fileHash });
  if (existing) {
    if (existing.status !== 'failed') {
      safeUnlink(file.path);
      throw ApiError.conflict(`You already uploaded this file as "${existing.originalName}".`);
    }
    // A failed earlier attempt is replaced so the user can simply retry.
    safeUnlink(path.join(env.uploadDir, existing.storedName));
    await DocumentChunk.deleteMany({ documentId: existing._id });
    await existing.deleteOne();
  }

  const doc = await Document.create({
    userId: req.user._id,
    originalName: cleanName(file.originalname),
    storedName: file.filename,
    fileHash,
    sizeBytes: file.size,
    status: 'processing',
  });

  // Processing is asynchronous: the client polls GET /documents/:id until status is ready/failed.
  setImmediate(() => processDocument(doc._id));
  res.status(202).json({ success: true, data: { document: doc.toPublic() } });
}

export async function listDocuments(req, res) {
  const docs = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: { documents: docs.map((d) => d.toPublic()) } });
}

export async function getDocument(req, res) {
  // Scoping the query by userId means another user's document is indistinguishable from a missing one.
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!doc) throw ApiError.notFound('Document not found.');
  res.json({ success: true, data: { document: doc.toPublic() } });
}

export async function deleteDocument(req, res) {
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!doc) throw ApiError.notFound('Document not found.');
  await DocumentChunk.deleteMany({ documentId: doc._id, userId: req.user._id });
  safeUnlink(path.join(env.uploadDir, doc.storedName));
  await doc.deleteOne();
  res.json({ success: true, data: { message: 'Document deleted.' } });
}
