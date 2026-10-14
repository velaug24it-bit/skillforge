import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import coursesRoutes from './courses.routes';
import dashboardRoutes from './dashboard.routes';
import bookingRoutes from './booking.routes';
import assessmentRoutes from './assessment.routes';
import { getMyResults } from '../controllers/assessment.controller';
import { protect } from '../middlewares/auth';

const router = Router();

// Health and identity
router.use('/', healthRoutes);

// Authentication
router.use('/auth', authRoutes);

// Courses & Levels
router.use('/courses', coursesRoutes);

// Dashboard
router.use('/dashboard', dashboardRoutes);

// Exam Slot Booking
router.use('/bookings', bookingRoutes);

// Assessment Exam & Code Evaluation
router.use('/assessments', assessmentRoutes);

// Direct Results alias
router.get('/results/my', protect, getMyResults);

export default router;
