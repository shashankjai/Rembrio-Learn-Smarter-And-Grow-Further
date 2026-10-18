import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 1000 },
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date,
  },
  { _id: true }
);

const studyPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    goal: { type: String, default: '', maxlength: 1000 },
    deadline: Date,
    documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    generatedByAi: { type: Boolean, default: false },
    tasks: [taskSchema],
  },
  { timestamps: true }
);

studyPlanSchema.index({ userId: 1, createdAt: -1 });

export const StudyPlan = mongoose.models.StudyPlan || mongoose.model('StudyPlan', studyPlanSchema);
