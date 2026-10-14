import { Response, NextFunction } from 'express';
import { Course, AssessmentLevel, StudentProgress, Booking, AssessmentAttempt } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { checkSlotTiming } from '../utils/slots';

export const getAllCourses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const courses = await Course.find({ isActive: true }).sort({ createdAt: 1 });
    
    // If user is authenticated, attach their current unlocked level for each course
    let progressMap: Record<string, any> = {};
    if (req.user) {
      const progressList = await StudentProgress.find({ studentId: req.user._id });
      progressList.forEach((p) => {
        progressMap[p.courseId.toString()] = {
          currentUnlockedLevel: p.currentUnlockedLevel,
          completedLevels: p.completedLevels,
        };
      });
    }

    const coursesWithProgress = courses.map((course) => {
      const progress = progressMap[course._id.toString()] || {
        currentUnlockedLevel: 1,
        completedLevels: [],
      };
      return {
        id: course._id,
        name: course.name,
        language: course.language,
        description: course.description,
        icon: course.icon,
        totalLevels: course.totalLevels,
        topics: course.topics,
        currentUnlockedLevel: progress.currentUnlockedLevel,
        completedLevels: progress.completedLevels,
        isCompleted: progress.completedLevels.length === course.totalLevels,
      };
    });

    res.status(200).json({
      success: true,
      courses: coursesWithProgress,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getCourseById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError('Course not found', 404));
    }

    const levels = await AssessmentLevel.find({ courseId: course._id }).sort({ levelNumber: 1 });

    let progress = null;
    if (req.user) {
      progress = await StudentProgress.findOne({
        studentId: req.user._id,
        courseId: course._id,
      });

      // If no progress record exists yet, create Level 1 default
      if (!progress) {
        progress = await StudentProgress.create({
          studentId: req.user._id,
          courseId: course._id,
          language: course.language,
          currentUnlockedLevel: 1,
          completedLevels: [],
        });
      }
    }

    const currentUnlockedLevel = progress ? progress.currentUnlockedLevel : 1;
    const completedLevels = progress ? progress.completedLevels : [];

    // Query active bookings and active attempts for this student in this course
    let studentBookings: any[] = [];
    let activeAttempts: any[] = [];
    let allCourseAttempts: any[] = [];

    if (req.user) {
      studentBookings = await Booking.find({
        studentId: req.user._id,
        courseId: course._id,
        status: 'BOOKED',
      });
      activeAttempts = await AssessmentAttempt.find({
        studentId: req.user._id,
        courseId: course._id,
        status: 'IN_PROGRESS',
        expiresAt: { $gt: new Date() },
      });
      allCourseAttempts = await AssessmentAttempt.find({
        studentId: req.user._id,
        courseId: course._id,
      }).sort({ createdAt: 1 });
    }

    const levelsWithLockState = levels.map((lvl) => {
      const isUnlocked = lvl.levelNumber <= currentUnlockedLevel;
      const isCompleted = completedLevels.includes(lvl.levelNumber);

      const levelBooking = studentBookings.find(
        (b) => b.levelId.toString() === lvl._id.toString()
      );
      const levelAttempt = activeAttempts.find(
        (a) => a.levelId.toString() === lvl._id.toString()
      );

      // Attempts calculation for this specific level
      const levelAttemptsList = allCourseAttempts.filter((a: any) => a.levelNumber === lvl.levelNumber);
      const attemptsCount = levelAttemptsList.length;

      let attemptsToClear: number | null = null;
      const passedAttemptIndex = levelAttemptsList.findIndex((a: any) => a.passed === true);
      if (passedAttemptIndex !== -1) {
        attemptsToClear = passedAttemptIndex + 1;
      } else if (isCompleted) {
        attemptsToClear = attemptsCount > 0 ? attemptsCount : 1;
      }

      const highestScore = levelAttemptsList.reduce(
        (max: number, a: any) => Math.max(max, a.totalScore || 0),
        isCompleted ? 100 : 0
      );

      let bookingData = null;
      if (levelBooking) {
        const timing = checkSlotTiming(levelBooking.date, levelBooking.startTime, levelBooking.endTime);
        bookingData = {
          id: levelBooking._id,
          slotReference: levelBooking.slotReference,
          date: levelBooking.date,
          startTime: levelBooking.startTime,
          endTime: levelBooking.endTime,
          attendanceStatus: levelBooking.attendanceStatus || 'PENDING',
          isNow: timing.isNow || !!levelAttempt,
          isFuture: timing.isFuture && !levelAttempt,
          isPast: timing.isPast && !levelAttempt,
          message: timing.message,
        };
      }

      return {
        id: lvl._id,
        levelNumber: lvl.levelNumber,
        title: lvl.title,
        category: lvl.category,
        description: lvl.description,
        topics: lvl.topics,
        passingScore: lvl.passingScore,
        durationMinutes: lvl.durationMinutes,
        isUnlocked,
        isCompleted,
        attemptsCount,
        attemptsToClear,
        highestScore,
        booking: bookingData,
        hasActiveAttempt: !!levelAttempt,
        activeAttemptId: levelAttempt ? levelAttempt._id : null,
      };
    });

    res.status(200).json({
      success: true,
      course: {
        id: course._id,
        name: course.name,
        language: course.language,
        description: course.description,
        icon: course.icon,
        totalLevels: course.totalLevels,
        topics: course.topics,
        levels: levelsWithLockState,
        studentProgress: {
          currentUnlockedLevel,
          completedLevels,
          completionPercentage: Math.round((completedLevels.length / course.totalLevels) * 100),
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const getDashboardSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const totalCourses = await Course.countDocuments({ isActive: true });
    const studentProgresses = await StudentProgress.find({ studentId: req.user._id });

    let totalCompletedLevels = 0;
    studentProgresses.forEach((p) => {
      totalCompletedLevels += p.completedLevels.length;
    });

    const totalPossibleLevels = totalCourses * 4;
    const overallProgress = totalPossibleLevels > 0 
      ? Math.round((totalCompletedLevels / totalPossibleLevels) * 100) 
      : 0;

    // Fetch next upcoming active booking
    const upcomingBooking = await Booking.findOne({
      studentId: req.user._id,
      status: 'BOOKED',
    })
      .populate('courseId', 'name language')
      .populate('levelId', 'levelNumber title category')
      .sort({ date: 1, startTime: 1 });

    // Fetch recent 5 assessment attempts
    const recentAttempts = await AssessmentAttempt.find({ studentId: req.user._id })
      .populate('courseId', 'name language')
      .populate('levelId', 'levelNumber title')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      summary: {
        studentName: req.user.name,
        studentEmail: req.user.email,
        totalCourses,
        enrolledCoursesCount: studentProgresses.length,
        totalCompletedLevels,
        overallProgress,
        upcomingBooking: upcomingBooking
          ? {
              id: upcomingBooking._id,
              courseName: (upcomingBooking.courseId as any)?.name,
              language: (upcomingBooking.courseId as any)?.language,
              levelTitle: (upcomingBooking.levelId as any)?.title,
              levelNumber: (upcomingBooking.levelId as any)?.levelNumber,
              date: upcomingBooking.date,
              startTime: upcomingBooking.startTime,
              endTime: upcomingBooking.endTime,
              slotReference: upcomingBooking.slotReference,
              status: upcomingBooking.status,
            }
          : null,
        recentAttempts: recentAttempts.map((att) => ({
          id: att._id,
          courseName: (att.courseId as any)?.name,
          language: (att.courseId as any)?.language,
          levelTitle: (att.levelId as any)?.title,
          levelNumber: att.levelNumber,
          totalScore: att.totalScore,
          passed: att.passed,
          status: att.status,
          date: att.createdAt,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
};
