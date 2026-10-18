import { Router } from 'express';
import mongoose from 'mongoose';
import { env, aiConfigured } from '../config/env.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { validate, validateObjectIdParam } from '../utils/validate.js';
import * as s from '../utils/schemas.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, aiLimiter, uploadLimiter } from '../middleware/rateLimit.js';
import { uploadPdf } from '../middleware/upload.js';
import * as auth from '../controllers/authController.js';
import * as profile from '../controllers/profileController.js';
import * as documents from '../controllers/documentController.js';
import * as chat from '../controllers/chatController.js';
import * as quizzes from '../controllers/quizController.js';
import * as progress from '../controllers/progressController.js';
import * as plans from '../controllers/studyPlanController.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      aiConfigured: aiConfigured(),
      vectorBackend: env.vectorBackend,
    },
  });
});

// Auth
router.post('/auth/register', authLimiter, validate(s.registerSchema), h(auth.register));
router.post('/auth/login', authLimiter, validate(s.loginSchema), h(auth.login));
router.get('/auth/me', requireAuth, h(auth.me));
router.post('/auth/logout', requireAuth, h(auth.logout));

// Profile
router.get('/profile', requireAuth, h(profile.getProfile));
router.patch('/profile', requireAuth, validate(s.patchProfileSchema), h(profile.updateProfile));

// Documents
router.get('/documents', requireAuth, h(documents.listDocuments));
router.post('/documents/upload', requireAuth, uploadLimiter, uploadPdf, h(documents.uploadDocument));
router.get('/documents/:id', requireAuth, validateObjectIdParam(), h(documents.getDocument));
router.delete('/documents/:id', requireAuth, validateObjectIdParam(), h(documents.deleteDocument));

// Chat (RAG)
router.post('/chat/ask', requireAuth, aiLimiter, validate(s.askSchema), h(chat.ask));
router.get('/chat/history', requireAuth, validate(s.historyQuerySchema, 'query'), h(chat.history));

// Quizzes
router.post('/quizzes/generate', requireAuth, aiLimiter, validate(s.generateQuizSchema), h(quizzes.generateQuiz));
router.post('/quizzes/submit', requireAuth, validate(s.submitQuizSchema), h(quizzes.submitQuiz));

// Progress
router.get('/progress', requireAuth, h(progress.getProgress));

// Study plans
router.get('/study-plans', requireAuth, h(plans.listPlans));
router.post('/study-plans', requireAuth, aiLimiter, validate(s.createPlanSchema), h(plans.createPlan));
router.patch('/study-plans/:id', requireAuth, validateObjectIdParam(), validate(s.patchPlanSchema), h(plans.updatePlan));
router.delete('/study-plans/:id', requireAuth, validateObjectIdParam(), h(plans.deletePlan));

export default router;
