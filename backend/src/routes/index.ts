import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Base health and system status routes
router.use('/', healthRoutes);

export default router;
