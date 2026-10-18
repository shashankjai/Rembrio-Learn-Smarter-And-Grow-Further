import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.isProd ? 1 : false);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const configured = env.clientUrl
          .split(',')
          .map((o) => o.trim().replace(/\/$/, ''))
          .filter(Boolean);
        const cleanOrigin = origin.replace(/\/$/, '');
        if (
          configured.includes('*') ||
          configured.includes(cleanOrigin) ||
          cleanOrigin.endsWith('.onrender.com') ||
          cleanOrigin.includes('localhost')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Rembrio API is running smoothly.',
      health: '/api/health',
    });
  });
  app.use('/api', apiLimiter, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
