import mongoose from 'mongoose';

/**
 * One retrievable passage of a PDF plus its embedding.
 * `userId` and `documentId` are denormalised onto every chunk so that the vector
 * index can pre-filter on them: retrieval is scoped to the owner inside the
 * vector query itself, not by post-filtering results.
 */
const chunkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    filename: { type: String, required: true },
    page: { type: Number, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true, select: false },
  },
  { timestamps: true }
);

chunkSchema.index({ userId: 1, documentId: 1, chunkIndex: 1 });

export const DocumentChunk = mongoose.models.DocumentChunk || mongoose.model('DocumentChunk', chunkSchema);
