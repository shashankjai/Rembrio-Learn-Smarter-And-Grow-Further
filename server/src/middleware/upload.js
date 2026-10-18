import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  // Never trust the client filename on disk: random name, fixed extension.
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.pdf`),
});

export const uploadPdf = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const isPdfName = path.extname(file.originalname).toLowerCase() === '.pdf';
    if (file.mimetype !== 'application/pdf' || !isPdfName) {
      return cb(ApiError.badRequest('Only PDF files are supported.'));
    }
    cb(null, true);
  },
}).single('file');

/** Check the PDF magic bytes — MIME types and extensions are client-controlled. */
export function hasPdfSignature(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(5);
    fs.readSync(fd, buf, 0, 5, 0);
    return buf.toString('latin1') === '%PDF-';
  } finally {
    fs.closeSync(fd);
  }
}

export const safeUnlink = (filePath) => {
  try {
    if (filePath) fs.unlinkSync(filePath);
  } catch {
    /* already gone */
  }
};
