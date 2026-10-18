import mongoose from 'mongoose';

export const DOCUMENT_STATUS = ['processing', 'ready', 'failed'];

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    // Random on-disk name; the PDF itself is stored on disk, never inside MongoDB.
    storedName: { type: String, required: true },
    fileHash: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    pageCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    status: { type: String, enum: DOCUMENT_STATUS, default: 'processing', index: true },
    errorMessage: { type: String, default: '' },
    processedAt: Date,
  },
  { timestamps: true }
);

// Duplicate-upload protection is per user.
documentSchema.index({ userId: 1, fileHash: 1 }, { unique: true });

documentSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    filename: this.originalName,
    sizeBytes: this.sizeBytes,
    pageCount: this.pageCount,
    chunkCount: this.chunkCount,
    status: this.status,
    errorMessage: this.errorMessage || undefined,
    createdAt: this.createdAt,
    processedAt: this.processedAt,
  };
};

export const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);
