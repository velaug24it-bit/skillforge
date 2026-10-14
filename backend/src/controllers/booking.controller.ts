import { Response, NextFunction } from 'express';
import { Booking, Course, AssessmentLevel, StudentProgress } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { EXAM_SLOTS, generateSlotReference, checkSlotTiming } from '../utils/slots';

export const getSlotAvailability = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date, courseId, levelId } = req.query;

    if (!date || typeof date !== 'string') {
      return next(new AppError('Please specify a date in YYYY-MM-DD format', 400));
    }

    // Format validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(new AppError('Invalid date format. Expected YYYY-MM-DD', 400));
    }

    // Check if date is in the past (using UTC/campus local date)
    const todayStr = new Date().toISOString().split('T')[0];
    const isPastDate = date < todayStr;

    // Fetch existing active bookings for this date
    const activeBookings = await Booking.find({
      date,
      status: 'BOOKED',
    }).select('startTime endTime studentId');

    const bookedTimes = new Set(activeBookings.map((b) => b.startTime));

    // Current hour/minute for today's expired slots check
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    const slotsWithStatus = EXAM_SLOTS.map((slot) => {
      let isAvailable = true;
      let reason = 'Available';

      if (isPastDate) {
        isAvailable = false;
        reason = 'Date has passed';
      } else if (date === todayStr && slot.startTime <= currentTimeStr) {
        isAvailable = false;
        reason = 'Slot expired';
      } else if (bookedTimes.has(slot.startTime)) {
        isAvailable = false;
        // Check if booked by current student
        const isMyBooking = activeBookings.some(
          (b) => b.startTime === slot.startTime && req.user && b.studentId.toString() === req.user._id.toString()
        );
        reason = isMyBooking ? 'Booked by you' : 'Reserved';
      }

      return {
        ...slot,
        isAvailable,
        status: isAvailable ? 'AVAILABLE' : (reason === 'Booked by you' ? 'BOOKED_BY_YOU' : 'UNAVAILABLE'),
        statusReason: reason,
      };
    });

    res.status(200).json({
      success: true,
      date,
      campusTimezone: 'Asia/Kolkata',
      bookingWindowNotice: 'Daily examination window operates from 9:10 AM to 5:30 PM. The final 1-hour examination slot ends at 5:10 PM.',
      slots: slotsWithStatus,
    });
  } catch (error: any) {
    next(error);
  }
};

export const createBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const { courseId, levelId, date, startTime } = req.body;

    if (!courseId || !levelId || !date || !startTime) {
      return next(new AppError('Missing required booking fields: courseId, levelId, date, startTime', 400));
    }

    // Verify course & level
    const course = await Course.findById(courseId);
    if (!course) return next(new AppError('Course not found', 404));

    const level = await AssessmentLevel.findById(levelId);
    if (!level) return next(new AppError('Assessment level not found', 404));

    // Verify student has unlocked this level
    const progress = await StudentProgress.findOne({
      studentId: req.user._id,
      courseId: course._id,
    });

    const currentUnlockedLevel = progress ? progress.currentUnlockedLevel : 1;
    if (level.levelNumber > currentUnlockedLevel) {
      return next(new AppError(`Level ${level.levelNumber} is locked. You must clear Level ${currentUnlockedLevel} with 100/100 first.`, 403));
    }

    // Match valid predefined slot
    const slotDef = EXAM_SLOTS.find((s) => s.startTime === startTime);
    if (!slotDef) {
      return next(new AppError(`Invalid start time ${startTime}. Available slots start at 09:10, 10:10, 11:10, 12:10, 13:10, 14:10, 15:10, 16:10`, 400));
    }

    // Prevent bookings in past
    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      return next(new AppError('Cannot book examination slots in the past', 400));
    }

    // Prevent duplicate active booking by same student for the same course level
    const existingStudentBooking = await Booking.findOne({
      studentId: req.user._id,
      courseId: course._id,
      levelId: level._id,
      status: 'BOOKED',
    });

    if (existingStudentBooking) {
      return next(
        new AppError(
          `You already have an active booking for this level on ${existingStudentBooking.date} at ${existingStudentBooking.startTime} (Ref: ${existingStudentBooking.slotReference}). Complete or cancel it before rebooking.`,
          409
        )
      );
    }

    // Atomic reservation attempt using Mongoose with unique index safety
    try {
      const slotReference = generateSlotReference(date, startTime);

      const booking = await Booking.create({
        studentId: req.user._id,
        courseId: course._id,
        levelId: level._id,
        date,
        startTime: slotDef.startTime,
        endTime: slotDef.endTime,
        slotReference,
        status: 'BOOKED',
      });

      res.status(201).json({
        success: true,
        message: 'Examination slot booked successfully!',
        booking: {
          id: booking._id,
          slotReference: booking.slotReference,
          courseId: course._id,
          courseName: course.name,
          language: course.language,
          levelId: level._id,
          levelTitle: level.title,
          levelNumber: level.levelNumber,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          attendanceStatus: booking.attendanceStatus || 'PENDING',
          campusTimezone: 'Asia/Kolkata',
        },
      });
    } catch (err: any) {
      // MongoDB duplicate key error code 11000
      if (err.code === 11000) {
        return next(new AppError('This examination slot was just reserved by another candidate. Please select another slot.', 409));
      }
      throw err;
    }
  } catch (error: any) {
    next(error);
  }
};

export const getMyBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const bookings = await Booking.find({ studentId: req.user._id })
      .populate('courseId', 'name language icon')
      .populate('levelId', 'levelNumber title category durationMinutes')
      .sort({ date: -1, startTime: -1 });

    res.status(200).json({
      success: true,
      bookings: bookings.map((b) => {
        const timing = checkSlotTiming(b.date, b.startTime, b.endTime);
        return {
          id: b._id,
          slotReference: b.slotReference,
          courseId: (b.courseId as any)?._id,
          courseName: (b.courseId as any)?.name,
          language: (b.courseId as any)?.language,
          levelId: (b.levelId as any)?._id,
          levelTitle: (b.levelId as any)?.title,
          levelNumber: (b.levelId as any)?.levelNumber,
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status,
          attendanceStatus: b.attendanceStatus || 'PENDING',
          isNow: b.status === 'BOOKED' && timing.isNow,
          isFuture: b.status === 'BOOKED' && timing.isFuture,
          isPast: b.status === 'BOOKED' && timing.isPast,
          timingMessage: timing.message,
          createdAt: b.createdAt,
        };
      }),
    });
  } catch (error: any) {
    next(error);
  }
};

export const cancelBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const { bookingId } = req.params;
    const booking = await Booking.findOne({
      _id: bookingId,
      studentId: req.user._id,
    });

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.status !== 'BOOKED') {
      return next(new AppError(`Cannot cancel a booking that is currently ${booking.status}`, 400));
    }

    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || 'Cancelled by student';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully. The slot has been released.',
      booking: {
        id: booking._id,
        slotReference: booking.slotReference,
        status: booking.status,
      },
    });
  } catch (error: any) {
    next(error);
  }
};
