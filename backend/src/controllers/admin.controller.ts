import { Response, NextFunction } from 'express';
import { User, Booking, Course, AssessmentAttempt, StudentProgress } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { EXAM_SLOTS, checkSlotTiming, getCampusNow } from '../utils/slots';

export const getAdminOverview = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campusNow = getCampusNow();
    const today = campusNow.date;

    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalBookings = await Booking.countDocuments();
    const todayBookingsCount = await Booking.countDocuments({ date: today, status: 'BOOKED' });
    const presentTodayCount = await Booking.countDocuments({ date: today, status: 'BOOKED', attendanceStatus: 'PRESENT' });
    const absentTodayCount = await Booking.countDocuments({ date: today, status: 'BOOKED', attendanceStatus: 'ABSENT' });
    const pendingTodayCount = await Booking.countDocuments({
      date: today,
      status: 'BOOKED',
      attendanceStatus: { $nin: ['PRESENT', 'ABSENT'] }
    });
    const completedAttemptsCount = await AssessmentAttempt.countDocuments({ status: 'COMPLETED' });

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalBookings,
        todayBookingsCount,
        presentTodayCount,
        absentTodayCount,
        pendingTodayCount,
        completedAttemptsCount,
        campusTime: campusNow,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAdminStudents = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    const studentIds = students.map((s) => s._id);

    // Fetch progress and attempts for aggregate reporting
    const [allProgress, allAttempts, allBookings] = await Promise.all([
      StudentProgress.find({ studentId: { $in: studentIds } }).populate('courseId', 'name language'),
      AssessmentAttempt.find({ studentId: { $in: studentIds } }).select('studentId totalScore isPassed levelNumber status createdAt'),
      Booking.find({ studentId: { $in: studentIds } })
        .populate('courseId', 'name language')
        .populate('levelId', 'levelNumber title')
        .sort({ date: -1, startTime: -1 }),
    ]);

    const studentData = students.map((student) => {
      const studentIdStr = student._id.toString();
      const progress = allProgress.filter((p) => p.studentId.toString() === studentIdStr);
      const attempts = allAttempts.filter((a) => a.studentId.toString() === studentIdStr);
      const bookings = allBookings.filter((b) => b.studentId.toString() === studentIdStr);

      let totalClearedLevels = 0;
      progress.forEach((p) => {
        totalClearedLevels += p.completedLevels.length;
      });

      const maxScore = attempts.reduce((max, a) => Math.max(max, a.totalScore || 0), 0);

      const latestBooking = bookings[0] || null;

      return {
        id: student._id,
        name: student.name,
        email: student.email,
        createdAt: student.createdAt,
        coursesEnrolled: progress.length,
        totalClearedLevels,
        totalAttempts: attempts.length,
        bestScore: maxScore,
        latestBooking: latestBooking
          ? {
              id: latestBooking._id,
              courseName: (latestBooking.courseId as any)?.name,
              levelNumber: (latestBooking.levelId as any)?.levelNumber,
              date: latestBooking.date,
              startTime: latestBooking.startTime,
              endTime: latestBooking.endTime,
              status: latestBooking.status,
              attendanceStatus: latestBooking.attendanceStatus,
              slotReference: latestBooking.slotReference,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      students: studentData,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getDailyHourwiseBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campusNow = getCampusNow();
    const queryDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : campusNow.date;

    const bookings = await Booking.find({
      date: queryDate,
      status: 'BOOKED',
    })
      .populate('studentId', 'name email')
      .populate('courseId', 'name language icon')
      .populate('levelId', 'levelNumber title category durationMinutes')
      .sort({ startTime: 1 });

    const bookedSlotsMap = new Map<string, any>();
    bookings.forEach((b) => {
      bookedSlotsMap.set(b.startTime, b);
    });

    const hourwiseSlots = EXAM_SLOTS.map((slot) => {
      const timing = checkSlotTiming(queryDate, slot.startTime, slot.endTime);
      const booking = bookedSlotsMap.get(slot.startTime);

      let bookingDetails = null;
      if (booking) {
        bookingDetails = {
          id: booking._id,
          slotReference: booking.slotReference,
          student: {
            id: (booking.studentId as any)?._id,
            name: (booking.studentId as any)?.name || 'Unknown Student',
            email: (booking.studentId as any)?.email || '',
          },
          course: {
            id: (booking.courseId as any)?._id,
            name: (booking.courseId as any)?.name || 'Course',
            language: (booking.courseId as any)?.language || '',
          },
          level: {
            id: (booking.levelId as any)?._id,
            levelNumber: (booking.levelId as any)?.levelNumber || 1,
            title: (booking.levelId as any)?.title || 'Level',
          },
          attendanceStatus: booking.attendanceStatus || 'PENDING',
          markedAt: booking.markedAt,
          status: booking.status,
        };
      }

      return {
        slotIndex: slot.slotIndex,
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label,
        isBooked: !!booking,
        timingStatus: timing,
        booking: bookingDetails,
      };
    });

    res.status(200).json({
      success: true,
      date: queryDate,
      campusTime: campusNow,
      slots: hourwiseSlots,
    });
  } catch (error: any) {
    next(error);
  }
};

export const updateBookingAttendance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { attendanceStatus } = req.body;

    if (!['PENDING', 'PRESENT', 'ABSENT'].includes(attendanceStatus)) {
      return next(
        new AppError('Invalid attendanceStatus. Must be PENDING, PRESENT, or ABSENT', 400)
      );
    }

    const booking = await Booking.findById(bookingId)
      .populate('studentId', 'name email')
      .populate('courseId', 'name language')
      .populate('levelId', 'levelNumber title');

    if (!booking) {
      return next(new AppError('Booking reservation not found', 404));
    }

    booking.attendanceStatus = attendanceStatus;
    booking.markedAt = new Date();
    if (req.user) {
      booking.markedBy = req.user._id;
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: `Candidate attendance marked as ${attendanceStatus} successfully!`,
      booking: {
        id: booking._id,
        slotReference: booking.slotReference,
        studentName: (booking.studentId as any)?.name,
        courseName: (booking.courseId as any)?.name,
        levelNumber: (booking.levelId as any)?.levelNumber,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        attendanceStatus: booking.attendanceStatus,
        markedAt: booking.markedAt,
      },
    });
  } catch (error: any) {
    next(error);
  }
};
