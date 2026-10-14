import { Router } from 'express';
import {
  getAdminOverview,
  getAdminStudents,
  getDailyHourwiseBookings,
  updateBookingAttendance,
} from '../controllers/admin.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// Protect all admin routes with JWT and admin role authorization
router.use(protect);
router.use(authorize('admin'));

router.get('/overview', getAdminOverview);
router.get('/students', getAdminStudents);
router.get('/slots', getDailyHourwiseBookings);
router.patch('/bookings/:bookingId/attendance', updateBookingAttendance);

export default router;
