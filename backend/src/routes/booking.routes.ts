import { Router } from 'express';
import {
  getSlotAvailability,
  createBooking,
  getMyBookings,
  cancelBooking,
} from '../controllers/booking.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect);

router.get('/availability', getSlotAvailability);
router.post('/', createBooking);
router.get('/my', getMyBookings);
router.patch('/:bookingId/cancel', cancelBooking);

export default router;
