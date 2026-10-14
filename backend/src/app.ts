import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Logging
  if (!env.isTest) {
    app.use(morgan('dev'));
  }

  // Cross-Origin Resource Sharing with credentials for HTTP-only cookies
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body and cookie parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Global rate limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
  });
  app.use(globalLimiter);

  // Root welcome check
  app.get('/', (req, res) => {
    res.json({
      name: 'SkillForge API',
      version: '1.0.0',
      description: 'SkillForge Programming Skill Assessment Portal REST API',
      documentation: '/api/health',
    });
  });

  // Mount API router
  app.use('/api', apiRoutes);

  // 404 and Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
