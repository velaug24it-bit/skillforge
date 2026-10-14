import { Router } from 'express';
import {
  getAdminOverview,
  getAdminStudents,
  getAdminStudentHistory,
  getDailyHourwiseBookings,
  updateBookingAttendance,
  createAdminCourse,
  getAdminCourses,
} from '../controllers/admin.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// Protect all admin routes with JWT and admin role authorization
router.use(protect);
router.use(authorize('admin'));

router.get('/overview', getAdminOverview);
router.get('/students', getAdminStudents);
router.get('/students/:studentId/history', getAdminStudentHistory);
router.get('/slots', getDailyHourwiseBookings);
router.patch('/bookings/:bookingId/attendance', updateBookingAttendance);
router.get('/courses', getAdminCourses);
router.post('/courses', createAdminCourse);

export default router;
