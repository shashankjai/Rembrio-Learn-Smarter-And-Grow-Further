import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: mongoose.Schema.Types.ObjectId,
    selectedIndex: { type: Number, default: null },
    correct: Boolean,
    topic: String,
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    quizTitle: String,
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    percentage: { type: Number, required: true },
    answers: [answerSchema],
  },
  { timestamps: true }
);

quizAttemptSchema.index({ userId: 1, createdAt: -1 });

export const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', quizAttemptSchema);
