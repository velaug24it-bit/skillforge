import { Response, NextFunction } from 'express';
import { User, Booking, Course, AssessmentAttempt, StudentProgress, AssessmentLevel } from '../models';
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

export const createAdminCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, language, description, icon, topics } = req.body;

    if (!name || !name.trim()) {
      return next(new AppError('Course name is required', 400));
    }
    if (!language || !['c', 'cpp', 'java', 'python', 'javascript'].includes(language)) {
      return next(new AppError('Valid language (c, cpp, java, python, javascript) is required', 400));
    }
    if (!description || !description.trim()) {
      return next(new AppError('Course description is required', 400));
    }

    // Check for duplicate course name
    const existing = await Course.findOne({ name: name.trim() });
    if (existing) {
      return next(new AppError('A course with this name already exists', 400));
    }

    const { createFullCourseHierarchy } = await import('../utils/courseFactory');
    const { course, levels } = await createFullCourseHierarchy({
      name: name.trim(),
      language,
      description: description.trim(),
      icon: icon || 'Code',
      topics,
    });

    res.status(201).json({
      success: true,
      message: `Course "${course.name}" and 4 assessment levels created successfully!`,
      course: {
        id: course._id,
        name: course.name,
        language: course.language,
        description: course.description,
        icon: course.icon,
        totalLevels: course.totalLevels,
        levelsCount: levels.length,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAdminCourses = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });

    const courseIds = courses.map((c) => c._id);
    const [allProgress, allLevels] = await Promise.all([
      StudentProgress.find({ courseId: { $in: courseIds } }),
      AssessmentLevel.find({ courseId: { $in: courseIds } }),
    ]);

    const coursesData = courses.map((c) => {
      const progress = allProgress.filter((p) => p.courseId.toString() === c._id.toString());
      const enrolledCount = progress.length;
      const completedCount = progress.filter((p) => p.completedLevels.length >= c.totalLevels).length;
      const levels = allLevels.filter((lvl) => lvl.courseId.toString() === c._id.toString());

      return {
        id: c._id,
        name: c.name,
        language: c.language,
        description: c.description,
        icon: c.icon,
        totalLevels: c.totalLevels,
        isActive: c.isActive,
        createdAt: c.createdAt,
        levelsCount: levels.length,
        enrolledCount,
        completedCount,
      };
    });

    res.status(200).json({
      success: true,
      courses: coursesData,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAdminStudentHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId).select('-password');
    if (!student || student.role !== 'student') {
      return next(new AppError('Student profile not found', 404));
    }

    const [allCourses, studentProgress, attempts, bookings] = await Promise.all([
      Course.find({ isActive: true }).sort({ createdAt: 1 }),
      StudentProgress.find({ studentId: student._id }).populate('courseId', 'name language icon totalLevels'),
      AssessmentAttempt.find({ studentId: student._id })
        .populate('courseId', 'name language')
        .populate('levelId', 'levelNumber title category')
        .sort({ createdAt: -1 }),
      Booking.find({ studentId: student._id })
        .populate('courseId', 'name language')
        .populate('levelId', 'levelNumber title')
        .sort({ date: -1, startTime: -1 }),
    ]);

    // Calculate course-by-course and level-by-level history
    const progressMap = new Map<string, any>();
    studentProgress.forEach((p) => {
      progressMap.set((p.courseId as any)?._id?.toString() || p.courseId.toString(), p);
    });

    const coursesProgress = allCourses.map((c) => {
      const p = progressMap.get(c._id.toString());
      const currentUnlockedLevel = p ? p.currentUnlockedLevel : 1;
      const completedLevels: number[] = p ? p.completedLevels : [];

      const courseAttempts = attempts.filter((a) => a.courseId && (a.courseId as any)._id?.toString() === c._id.toString());

      // Build levels 1 to 4 breakdown
      const levels = [1, 2, 3, 4].map((lvlNum) => {
        const isCompleted = completedLevels.includes(lvlNum);
        const isUnlocked = lvlNum <= currentUnlockedLevel;
        const levelAttempts = courseAttempts.filter((a) => a.levelNumber === lvlNum);

        // Find how many attempts were made before clearing
        let attemptsToClear: number | null = null;
        const passedIndex = levelAttempts.findIndex((a) => a.passed === true);
        if (passedIndex !== -1) {
          attemptsToClear = levelAttempts.length - passedIndex; // since sorted desc, calculate chronological
        } else if (isCompleted) {
          attemptsToClear = levelAttempts.length > 0 ? levelAttempts.length : 1;
        }

        const highestScore = levelAttempts.reduce(
          (max, a) => Math.max(max, a.totalScore || 0),
          isCompleted ? 100 : 0
        );

        return {
          levelNumber: lvlNum,
          title: `Level ${lvlNum}`,
          status: isCompleted ? ('COMPLETED' as const) : isUnlocked ? ('UNLOCKED' as const) : ('LOCKED' as const),
          isCompleted,
          isUnlocked,
          attemptsCount: levelAttempts.length,
          attemptsToClear,
          highestScore,
          attempts: levelAttempts.map((a) => ({
            id: a._id,
            score: a.totalScore,
            passed: a.passed,
            status: a.status,
            createdAt: a.createdAt,
            completedAt: a.completedAt,
          })),
        };
      });

      return {
        courseId: c._id,
        courseName: c.name,
        language: c.language,
        icon: c.icon,
        totalLevels: c.totalLevels,
        isEnrolled: !!p,
        currentUnlockedLevel,
        completedLevelsCount: completedLevels.length,
        isCompleted: completedLevels.length >= c.totalLevels,
        progressPercentage: Math.round((completedLevels.length / c.totalLevels) * 100),
        levels,
      };
    });

    const passedAttemptsCount = attempts.filter((a) => a.passed).length;
    const passRate = attempts.length > 0 ? Math.round((passedAttemptsCount / attempts.length) * 100) : 0;
    const totalClearedLevels = studentProgress.reduce((sum, p) => sum + p.completedLevels.length, 0);

    res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        createdAt: student.createdAt,
      },
      stats: {
        totalCoursesEnrolled: studentProgress.length,
        totalLevelsCleared: totalClearedLevels,
        totalAttempts: attempts.length,
        passedAttempts: passedAttemptsCount,
        passRate,
        totalBookings: bookings.length,
      },
      coursesProgress,
      attemptsHistory: attempts.map((a) => ({
        id: a._id,
        courseName: (a.courseId as any)?.name || 'Course',
        language: (a.courseId as any)?.language || '',
        levelNumber: a.levelNumber,
        levelTitle: (a.levelId as any)?.title || `Level ${a.levelNumber}`,
        totalScore: a.totalScore,
        passed: a.passed,
        status: a.status,
        createdAt: a.createdAt,
        completedAt: a.completedAt,
        questionsCount: a.questionSubmissions?.length || 0,
      })),
      bookingsHistory: bookings.map((b) => ({
        id: b._id,
        slotReference: b.slotReference,
        courseName: (b.courseId as any)?.name || 'Course',
        levelNumber: (b.levelId as any)?.levelNumber || 1,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        attendanceStatus: b.attendanceStatus,
        markedAt: b.markedAt,
        createdAt: b.createdAt,
      })),
    });
  } catch (error: any) {
    next(error);
  }
};

