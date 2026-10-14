import { Router } from 'express';
import { getDashboardSummary } from '../controllers/courses.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.get('/summary', protect, getDashboardSummary);

export default router;
