import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
    topic: { type: String, default: 'General' },
    source: {
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      filename: String,
      page: Number,
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 160 },
    documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    topic: { type: String, default: '' },
    questions: { type: [questionSchema], validate: (v) => v.length > 0 },
  },
  { timestamps: true }
);

export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
