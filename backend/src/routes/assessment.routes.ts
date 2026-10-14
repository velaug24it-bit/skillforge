import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  startAssessment,
  runSampleTest,
  submitQuestion,
  submitLevel,
  getMyResults,
} from '../controllers/assessment.controller';
import { protect } from '../middlewares/auth';
import { env } from '../config/env';

const router = Router();

// Rate limiter for execution and submission endpoints
const codeExecutionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: env.isTest ? 1000 : 30, // 30 submissions per minute
  message: {
    success: false,
    message: 'Too many code submissions in a short duration. Please wait 1 minute before resubmitting.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

router.post('/start', startAssessment);
router.post('/:attemptId/run-sample', codeExecutionLimiter, runSampleTest);
router.post('/:attemptId/submit-question', codeExecutionLimiter, submitQuestion);
router.post('/:attemptId/submit-level', submitLevel);
router.get('/my-results', getMyResults);

export default router;
