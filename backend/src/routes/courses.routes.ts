import { Router } from 'express';
import { getAllCourses, getCourseById } from '../controllers/courses.controller';
import { protect } from '../middlewares/auth';

const router = Router();

// Public / Authenticated course routes
router.get('/', protect, getAllCourses);
router.get('/:courseId', protect, getCourseById);

export default router;
