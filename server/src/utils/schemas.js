import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain at least one letter and one number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.email('Enter a valid email address').trim().toLowerCase().max(254),
  password,
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128),
});

export const askSchema = z.object({
  question: z.string().trim().min(1, 'Please enter a question').max(2000, 'Question is too long'),
  documentIds: z.array(objectId).max(20).optional(),
  conversationId: objectId.optional(),
});

export const historyQuerySchema = z.object({
  conversationId: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const generateQuizSchema = z.object({
  documentIds: z.array(objectId).min(1, 'Select at least one document').max(10),
  topic: z.string().trim().max(120).optional(),
  numQuestions: z.coerce.number().int().min(3).max(15).default(5),
});

export const submitQuizSchema = z.object({
  quizId: objectId,
  answers: z
    .array(z.object({ questionId: objectId, selectedIndex: z.number().int().min(0).max(3).nullable() }))
    .max(50),
});

const taskInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().default(''),
  dueDate: z.coerce.date().optional(),
});

export const createPlanSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    goal: z.string().trim().max(1000).optional().default(''),
    deadline: z.coerce.date().optional(),
    documentIds: z.array(objectId).max(10).optional().default([]),
    generate: z.boolean().optional().default(false),
    tasks: z.array(taskInput).max(50).optional().default([]),
  })
  .refine((v) => (v.generate ? v.goal.length >= 5 : Boolean(v.title)), {
    message: 'Provide a goal of at least 5 characters to generate a plan, or a title for a manual plan',
  });

export const patchPlanSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  goal: z.string().trim().max(1000).optional(),
  deadline: z.coerce.date().nullable().optional(),
  taskUpdates: z.array(z.object({ id: objectId, completed: z.boolean() })).max(100).optional(),
  addTasks: z.array(taskInput).max(50).optional(),
});

export const patchProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z.email('Enter a valid email address').trim().toLowerCase().max(254).optional(),
    currentPassword: z.string().max(128).optional(),
    newPassword: password.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });
