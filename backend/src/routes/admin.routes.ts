import { Router } from 'express';
import {
  getAdminOverview,
  getAdminStudents,
  getAdminStudentHistory,
  getDailyHourwiseBookings,
  updateBookingAttendance,
  createAdminCourse,
  getAdminCourses,
  getAdminAssessmentSessions,
  generateSessionOtp,
  getSessionOtpStatus,
  generateGlobalExitOtp,
  getGlobalExitOtpStatus,
  adminBookSlot,
  createAdminQuestion,
  getAdminQuestions,
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
router.post('/book-slot', adminBookSlot);

router.get('/courses', getAdminCourses);
router.post('/courses', createAdminCourse);
router.get('/questions', getAdminQuestions);
router.post('/questions', createAdminQuestion);

// Global / Universal 30-Second Exit OTP for all students
router.post('/global-exit-otp', generateGlobalExitOtp);
router.post('/global-otp', generateGlobalExitOtp);
router.get('/global-exit-otp/status', getGlobalExitOtpStatus);
router.get('/global-otp/status', getGlobalExitOtpStatus);

router.get('/assessment-sessions', getAdminAssessmentSessions);
router.post('/assessment-sessions/:attemptId/generate-otp', generateSessionOtp);
router.post('/assessment-sessions/:attemptId/otp', generateSessionOtp);
router.get('/assessment-sessions/:attemptId/otp-status', getSessionOtpStatus);

export default router;
