import { StudyPlan } from '../models/StudyPlan.js';
import { Document } from '../models/Document.js';
import { ApiError } from '../utils/ApiError.js';
import { generatePlanTasks } from '../services/ai/planService.js';

const publicPlan = (p) => {
  const total = p.tasks.length;
  const done = p.tasks.filter((t) => t.completed).length;
  return {
    id: String(p._id),
    title: p.title,
    goal: p.goal,
    deadline: p.deadline,
    generatedByAi: p.generatedByAi,
    documentIds: p.documentIds.map(String),
    createdAt: p.createdAt,
    progress: { total, completed: done, percentage: total ? Math.round((done / total) * 100) : 0 },
    tasks: p.tasks.map((t) => ({
      id: String(t._id),
      title: t.title,
      description: t.description,
      dueDate: t.dueDate,
      completed: t.completed,
      completedAt: t.completedAt,
    })),
  };
};

export async function listPlans(req, res) {
  const plans = await StudyPlan.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: { plans: plans.map(publicPlan) } });
}

export async function createPlan(req, res) {
  const { title, goal, deadline, documentIds, generate, tasks } = req.valid.body;

  // Only the user's own, fully processed documents may inform a plan.
  let ownedIds = [];
  if (documentIds.length) {
    const docs = await Document.find({ _id: { $in: documentIds }, userId: req.user._id, status: 'ready' }).select('_id');
    ownedIds = docs.map((d) => d._id);
    if (!ownedIds.length) throw ApiError.badRequest('The selected documents are unavailable or still processing.');
  }

  let planTitle = title;
  let planTasks = tasks;
  if (generate) {
    const generated = await generatePlanTasks({ userId: req.user._id, goal, deadline, documentIds: ownedIds });
    planTitle = title || generated.title;
    planTasks = generated.tasks;
  }

  const plan = await StudyPlan.create({
    userId: req.user._id,
    title: planTitle,
    goal,
    deadline,
    documentIds: ownedIds,
    generatedByAi: generate,
    tasks: planTasks,
  });
  res.status(201).json({ success: true, data: { plan: publicPlan(plan) } });
}

export async function updatePlan(req, res) {
  const { title, goal, deadline, taskUpdates, addTasks } = req.valid.body;
  const plan = await StudyPlan.findOne({ _id: req.params.id, userId: req.user._id });
  if (!plan) throw ApiError.notFound('Study plan not found.');

  if (title !== undefined) plan.title = title;
  if (goal !== undefined) plan.goal = goal;
  if (deadline !== undefined) plan.deadline = deadline ?? undefined;

  for (const update of taskUpdates ?? []) {
    const task = plan.tasks.id(update.id);
    if (!task) throw ApiError.notFound('Task not found in this plan.');
    task.completed = update.completed;
    task.completedAt = update.completed ? new Date() : undefined;
  }
  if (addTasks?.length) plan.tasks.push(...addTasks);

  await plan.save();
  res.json({ success: true, data: { plan: publicPlan(plan) } });
}

export async function deletePlan(req, res) {
  const plan = await StudyPlan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!plan) throw ApiError.notFound('Study plan not found.');
  res.json({ success: true, data: { message: 'Study plan deleted.' } });
}
