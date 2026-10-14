import { Router, Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database';
import { env } from '../config/env';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();
  const executionServiceConfigured = Boolean(env.JUDGE0_API_URL && env.JUDGE0_API_KEY);

  res.status(200).json({
    success: true,
    message: 'SkillForge API is operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    database: {
      status: dbStatus.state,
      connected: dbStatus.connected,
      host: dbStatus.host,
      name: dbStatus.name,
    },
    codeExecutionService: {
      provider: 'Judge0 CE Compatible',
      configured: executionServiceConfigured,
      status: executionServiceConfigured ? 'ready' : 'unconfigured_notice',
      endpoint: env.JUDGE0_API_URL || null,
    },
    campusTimezone: env.CAMPUS_TIMEZONE,
  });
});

export default router;
