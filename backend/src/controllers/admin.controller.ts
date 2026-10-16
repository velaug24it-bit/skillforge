import mongoose from 'mongoose';
import { Response, NextFunction } from 'express';
import { User, Booking, Course, AssessmentAttempt, StudentProgress, AssessmentLevel, GlobalExitOtp, CodingQuestion } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { EXAM_SLOTS, checkSlotTiming, getCampusNow, generateSlotReference } from '../utils/slots';
import { generateSixDigitOtp, hashOtp, OTP_VALIDITY_SECONDS } from '../utils/otpHelper';

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

export const getAdminAssessmentSessions = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attempts = await AssessmentAttempt.find()
      .populate('studentId', 'name email')
      .populate('courseId', 'name language icon')
      .populate('levelId', 'title category levelNumber')
      .sort({ createdAt: -1 })
      .limit(100);

    const now = Date.now();

    const sessions = attempts.map((att) => {
      let liveOtpStatus = att.otpStatus || 'NOT_GENERATED';
      let remainingSeconds = 0;

      if (liveOtpStatus === 'ACTIVE' && att.otpExpiresAt) {
        const diff = Math.floor((att.otpExpiresAt.getTime() - now) / 1000);
        if (diff > 0) {
          remainingSeconds = diff;
        } else {
          liveOtpStatus = 'EXPIRED';
        }
      }

      const isCompleted = att.status === 'COMPLETED' || att.isExitVerified === true;
      const canGenerateOtp = true;

      return {
        id: att._id,
        attemptId: att._id,
        student: {
          id: (att.studentId as any)?._id,
          name: (att.studentId as any)?.name || 'Unknown Student',
          email: (att.studentId as any)?.email || '',
        },
        course: {
          id: (att.courseId as any)?._id,
          name: (att.courseId as any)?.name || 'Course',
          language: (att.courseId as any)?.language || '',
        },
        level: {
          id: (att.levelId as any)?._id,
          levelNumber: att.levelNumber,
          title: (att.levelId as any)?.title || `Level ${att.levelNumber}`,
        },
        status: att.status,
        totalScore: att.totalScore,
        passed: att.passed,
        otpStatus: liveOtpStatus,
        otpExpiresAt: att.otpExpiresAt,
        remainingSeconds,
        isExitVerified: !!att.isExitVerified,
        canGenerateOtp,
        startedAt: att.startedAt,
        finalSubmittedAt: att.finalSubmittedAt,
        completedAt: att.completedAt,
        exitedAt: att.exitedAt,
      };
    });

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    next(error);
  }
};

export const generateSessionOtp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;

    const attempt = await AssessmentAttempt.findById(attemptId)
      .populate('studentId', 'name email')
      .populate('courseId', 'name language');

    if (!attempt) {
      return next(new AppError('Assessment session not found', 404));
    }

    // If session was completed or exited, allow proctor to re-issue an exit OTP
    if (attempt.status === 'COMPLETED' || attempt.exitedAt) {
      attempt.status = 'AWAITING_EXIT_VERIFICATION';
      attempt.isExitVerified = false;
      attempt.exitedAt = undefined;
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const otp = generateSixDigitOtp();
    const hash = hashOtp(otp, attempt._id.toString());
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_VALIDITY_SECONDS * 1000); // exactly 30s server expiry

    // Atomic update on attempt: invalidates any previous OTP
    attempt.otpHash = hash;
    attempt.otpGeneratedAt = now;
    attempt.otpExpiresAt = expiresAt;
    attempt.otpStatus = 'ACTIVE';
    attempt.otpFailedAttempts = 0;
    if (req.user) {
      attempt.otpGeneratedBy = req.user._id;
    }
    await attempt.save();

    // Plaintext OTP is returned ONLY in this response to authorized admin
    res.status(200).json({
      success: true,
      message: 'Exit OTP generated successfully. Valid for 30 seconds.',
      attemptId: attempt._id,
      studentName: (attempt.studentId as any)?.name,
      courseName: (attempt.courseId as any)?.name,
      levelNumber: attempt.levelNumber,
      otp, // 6-digit plaintext for temporary display to administrator
      expiresAt,
      validitySeconds: OTP_VALIDITY_SECONDS,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getSessionOtpStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;

    const attempt = await AssessmentAttempt.findById(attemptId);
    if (!attempt) {
      return next(new AppError('Assessment session not found', 404));
    }

    const now = Date.now();
    let liveStatus = attempt.otpStatus || 'NOT_GENERATED';
    let remainingSeconds = 0;

    if (liveStatus === 'ACTIVE' && attempt.otpExpiresAt) {
      const diff = Math.floor((attempt.otpExpiresAt.getTime() - now) / 1000);
      if (diff > 0) {
        remainingSeconds = diff;
      } else {
        liveStatus = 'EXPIRED';
        if (attempt.otpStatus === 'ACTIVE') {
          attempt.otpStatus = 'EXPIRED';
          await attempt.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      attemptId: attempt._id,
      otpStatus: liveStatus,
      remainingSeconds,
      isExitVerified: !!attempt.isExitVerified,
      otpGeneratedAt: attempt.otpGeneratedAt,
      otpExpiresAt: attempt.otpExpiresAt,
    });
  } catch (error: any) {
    next(error);
  }
};

export const generateGlobalExitOtp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const otp = generateSixDigitOtp();
    const hash = hashOtp(otp, 'GLOBAL_EXIT');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_VALIDITY_SECONDS * 1000); // exactly 30s server expiry

    // Delete previous global OTPs to guarantee single active code
    await GlobalExitOtp.deleteMany({});

    await GlobalExitOtp.create({
      otp,
      otpHash: hash,
      otpGeneratedAt: now,
      otpExpiresAt: expiresAt,
      generatedBy: req.user?._id,
    });

    res.status(200).json({
      success: true,
      message: 'Universal 30-second exit OTP generated. Any student can exit using this code.',
      otp, // 6-digit numeric OTP for administrator to announce or display
      expiresAt,
      validitySeconds: OTP_VALIDITY_SECONDS,
      generatedAt: now,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getGlobalExitOtpStatus = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const latest = await GlobalExitOtp.findOne().sort({ createdAt: -1 });
    if (!latest) {
      res.status(200).json({
        success: true,
        isActive: false,
        remainingSeconds: 0,
      });
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, Math.floor((latest.otpExpiresAt.getTime() - now) / 1000));
    const isActive = remaining > 0;

    res.status(200).json({
      success: true,
      isActive,
      otp: isActive ? latest.otp : null,
      remainingSeconds: remaining,
      expiresAt: latest.otpExpiresAt,
      generatedAt: latest.otpGeneratedAt,
    });
  } catch (error: any) {
    next(error);
  }
};

export const adminBookSlot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentIdentifier, studentId, studentName, courseId, levelNumber, date, startTime } = req.body;

    const queryIdentifier = (studentId || studentIdentifier || studentName || '').trim();
    if (!queryIdentifier) {
      return next(new AppError('Please enter the student ID, email, or name', 400));
    }

    if (!courseId || !date || !startTime) {
      return next(new AppError('Missing required booking details: courseId, date, startTime', 400));
    }

    // 1. Locate student
    let student = null;
    if (mongoose.Types.ObjectId.isValid(queryIdentifier)) {
      student = await User.findById(queryIdentifier);
    }
    if (!student) {
      student = await User.findOne({
        $or: [
          { email: queryIdentifier.toLowerCase() },
          { name: { $regex: new RegExp(`^${queryIdentifier}$`, 'i') } },
        ],
        role: 'student',
      });
    }
    if (!student) {
      student = await User.findOne({
        name: { $regex: new RegExp(queryIdentifier, 'i') },
        role: 'student',
      });
    }

    if (!student) {
      return next(new AppError(`Student "${queryIdentifier}" not found. Please verify the student ID, email, or name.`, 404));
    }

    // 2. Validate course
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError('Course not found', 404));
    }

    // 3. Determine level to book (default to student's next unlocked level for this course)
    const progress = await StudentProgress.findOne({
      studentId: student._id,
      courseId: course._id,
    });

    const currentUnlockedLevel = progress ? progress.currentUnlockedLevel : 1;
    const targetLevelNumber = levelNumber ? Number(levelNumber) : currentUnlockedLevel;

    let level = await AssessmentLevel.findOne({
      courseId: course._id,
      levelNumber: targetLevelNumber,
    });

    if (!level) {
      const isAptitude = course.language === 'aptitude';
      level = await AssessmentLevel.create({
        courseId: course._id,
        levelNumber: targetLevelNumber,
        title: `Level ${targetLevelNumber} Assessment`,
        description: `Level ${targetLevelNumber} evaluation for ${course.name}`,
        passingScore: isAptitude ? 24 : 100,
        totalMarks: isAptitude ? 40 : 100,
        assessmentType: isAptitude ? 'aptitude' : 'coding',
        negativeMarking: isAptitude ? 0.25 : 0,
        marksPerQuestion: isAptitude ? 1 : 50,
        durationMinutes: 60,
      });
    }

    // 4. Validate slot definition
    const slotDef = EXAM_SLOTS.find((s) => s.startTime === startTime);
    if (!slotDef) {
      return next(new AppError(`Invalid slot start time: ${startTime}. Allowed slots: 09:10, 10:10, 11:10, 12:10, 13:10, 14:10, 15:10, 16:10`, 400));
    }

    // 5. Ensure slot is not already booked on that date
    const existingSlotBooking = await Booking.findOne({
      date,
      startTime,
      status: 'BOOKED',
    }).populate('studentId', 'name email');

    if (existingSlotBooking) {
      const bookedByName = (existingSlotBooking.studentId as any)?.name || 'another student';
      return next(new AppError(`Slot ${slotDef.label} on ${date} is already reserved by ${bookedByName}. Please choose another slot.`, 409));
    }

    // 6. Generate slot reference & create booking
    const slotReference = generateSlotReference(date, startTime);
    const booking = await Booking.create({
      studentId: student._id,
      courseId: course._id,
      levelId: level._id,
      date,
      startTime,
      endTime: slotDef.endTime,
      status: 'BOOKED',
      attendanceStatus: 'PENDING',
      slotReference,
    });

    res.status(201).json({
      success: true,
      message: `Successfully booked slot ${slotDef.label} on ${date} for student ${student.name} (${course.name} - Level ${level.levelNumber})!`,
      booking: {
        id: booking._id,
        slotReference,
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
        },
        course: {
          id: course._id,
          name: course.name,
          language: course.language,
        },
        level: {
          id: level._id,
          levelNumber: level.levelNumber,
          title: level.title,
        },
        date,
        startTime,
        endTime: slotDef.endTime,
        status: booking.status,
        attendanceStatus: booking.attendanceStatus,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const createAdminQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      courseId,
      levelNumber,
      questionNumber,
      title,
      problemStatement,
      inputFormat,
      outputFormat,
      constraints,
      difficulty,
      sampleTestCase,
      mainTestCases,
      referenceSolution,
      starterCode,
      topicTags,
      timeLimitMs,
      memoryLimitKb,
    } = req.body;

    if (!courseId || !levelNumber || !questionNumber || !title || !problemStatement || !inputFormat || !outputFormat || !constraints) {
      return next(new AppError('Missing required question fields. Please complete all required question specifications.', 400));
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError('Selected course not found', 404));
    }

    // Find or create assessment level if needed
    let level = await AssessmentLevel.findOne({
      courseId: course._id,
      levelNumber: Number(levelNumber),
    });

    if (!level) {
      level = await AssessmentLevel.create({
        courseId: course._id,
        levelNumber: Number(levelNumber),
        title: `Level ${levelNumber} Assessment`,
        description: `Comprehensive Level ${levelNumber} practical coding assessment for ${course.name}`,
        passingScore: 100,
        timeLimitMinutes: 60,
        totalQuestions: 2,
      });
    }

    // Validate sample test case
    if (!sampleTestCase || !sampleTestCase.input || !sampleTestCase.expectedOutput) {
      return next(new AppError('A sample test case with both input and expected output is required.', 400));
    }

    // Exactly 5 main evaluation test cases
    let processedMainTestCases: any[] = [];
    if (Array.isArray(mainTestCases) && mainTestCases.length > 0) {
      processedMainTestCases = mainTestCases.slice(0, 5).map((tc, idx) => ({
        input: tc.input ?? '',
        expectedOutput: tc.expectedOutput ?? '',
        marks: tc.marks ?? 10,
        explanation: tc.explanation || `Evaluation Test Case ${idx + 1}`,
      }));
    }

    while (processedMainTestCases.length < 5) {
      const idx = processedMainTestCases.length + 1;
      processedMainTestCases.push({
        input: `Sample Input ${idx}`,
        expectedOutput: `Sample Output ${idx}`,
        marks: 10,
        explanation: `Evaluation Test Case ${idx}`,
      });
    }

    const cleanDifficulty = difficulty || (Number(levelNumber) === 1 ? 'Beginner' : Number(levelNumber) === 2 ? 'Intermediate' : Number(levelNumber) === 3 ? 'Advanced' : 'Expert');

    const question = await CodingQuestion.findOneAndUpdate(
      {
        courseId: course._id,
        levelNumber: Number(levelNumber),
        questionNumber: Number(questionNumber),
      },
      {
        courseId: course._id,
        levelId: level._id,
        language: course.language,
        levelNumber: Number(levelNumber),
        questionNumber: Number(questionNumber),
        title: title.trim(),
        problemStatement: problemStatement.trim(),
        inputFormat: inputFormat.trim(),
        outputFormat: outputFormat.trim(),
        constraints: constraints.trim(),
        sampleTestCase: {
          input: sampleTestCase.input,
          expectedOutput: sampleTestCase.expectedOutput,
          explanation: sampleTestCase.explanation || '',
        },
        mainTestCases: processedMainTestCases,
        referenceSolution: referenceSolution || `// Reference solution for ${title}`,
        starterCode: starterCode || { [course.language]: `// Write your ${course.name} solution here\n` },
        difficulty: cleanDifficulty,
        topicTags: Array.isArray(topicTags) ? topicTags : [course.name, `Level ${levelNumber}`],
        timeLimitMs: Number(timeLimitMs) || 2000,
        memoryLimitKb: Number(memoryLimitKb) || 128000,
        marks: 50,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      message: `Question "${title}" created successfully for ${course.name} Level ${levelNumber} (Question ${questionNumber})!`,
      question,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAdminQuestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId, levelNumber } = req.query;
    const filter: any = {};
    if (courseId) filter.courseId = courseId;
    if (levelNumber) filter.levelNumber = Number(levelNumber);

    const questions = await CodingQuestion.find(filter)
      .populate('courseId', 'name language icon')
      .sort({ courseId: 1, levelNumber: 1, questionNumber: 1 });

    res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error: any) {
    next(error);
  }
};



