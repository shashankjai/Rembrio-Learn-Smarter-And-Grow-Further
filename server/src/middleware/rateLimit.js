import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';

const build = (windowMs, limit, message, keyByUser = false) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    keyGenerator: (req) => (keyByUser && req.user ? String(req.user._id) : ipKeyGenerator(req.ip)),
    handler: (_req, res) => res.status(429).json({ success: false, error: { message } }),
  });

export const authLimiter = build(15 * 60 * 1000, 20, 'Too many attempts. Please try again in a few minutes.');
export const aiLimiter = build(10 * 60 * 1000, 40, 'AI request limit reached. Please wait a few minutes.', true);
export const uploadLimiter = build(60 * 60 * 1000, 30, 'Upload limit reached. Please try again later.', true);
export const apiLimiter = build(60 * 1000, 300, 'Too many requests. Please slow down.');
