import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  AssessmentAttempt,
  CodingQuestion,
  Course,
  AssessmentLevel,
  StudentProgress,
  Booking,
} from '../models';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { CodeExecutionService } from '../services/codeExecution.service';
import { checkSlotTiming } from '../utils/slots';
import { verifyOtpHash, MAX_FAILED_OTP_ATTEMPTS } from '../utils/otpHelper';

export const startAssessment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const { courseId, levelId, bookingId } = req.body;

    if (!courseId || !levelId) {
      return next(new AppError('Please provide courseId and levelId', 400));
    }

    const course = await Course.findById(courseId);
    if (!course) return next(new AppError('Course not found', 404));

    const level = await AssessmentLevel.findById(levelId);
    if (!level) return next(new AppError('Level not found', 404));

    // Check student progress to ensure level is unlocked
    let progress = await StudentProgress.findOne({
      studentId: req.user._id,
      courseId: course._id,
    });

    if (!progress) {
      progress = await StudentProgress.create({
        studentId: req.user._id,
        courseId: course._id,
        language: course.language,
        currentUnlockedLevel: 1,
        completedLevels: [],
      });
    }

    if (level.levelNumber > progress.currentUnlockedLevel) {
      return next(
        new AppError(
          `Level ${level.levelNumber} is locked. You must clear Level ${progress.currentUnlockedLevel} with 100/100 to unlock it.`,
          403
        )
      );
    }

    // Check if an in-progress attempt already exists and is not expired
    const now = new Date();
    let attempt = await AssessmentAttempt.findOne({
      studentId: req.user._id,
      courseId: course._id,
      levelId: level._id,
      status: 'IN_PROGRESS',
      expiresAt: { $gt: now },
    });

    let bookingToUse: any = null;

    // If no active non-expired attempt, verify booking and create a new attempt
    if (!attempt) {
      const bookingQuery: any = {
        studentId: req.user._id,
        courseId: course._id,
        levelId: level._id,
        status: 'BOOKED',
      };
      if (bookingId) {
        bookingQuery._id = bookingId;
      }

      bookingToUse = await Booking.findOne(bookingQuery);

      // In production/normal environment, active booking and valid slot timing window are strictly required
      if (process.env.NODE_ENV !== 'test') {
        if (!bookingToUse) {
          return next(
            new AppError(
              'An active exam slot booking is required to take this assessment. Please reserve your slot first.',
              403
            )
          );
        }

        const timing = checkSlotTiming(bookingToUse.date, bookingToUse.startTime, bookingToUse.endTime);
        if (timing.isFuture) {
          return next(
            new AppError(
              `Your booked exam slot starts at ${bookingToUse.startTime} on ${bookingToUse.date} (Asia/Kolkata). You can only enter the test during your reserved slot.`,
              403
            )
          );
        }
        if (timing.isPast) {
          return next(
            new AppError(
              `Your booked exam slot on ${bookingToUse.date} from ${bookingToUse.startTime} to ${bookingToUse.endTime} has expired. Please book a new slot.`,
              403
            )
          );
        }

        // Strict Proctor Verification: Admin must mark student as Present for this slot
        if (bookingToUse.attendanceStatus !== 'PRESENT') {
          if (bookingToUse.attendanceStatus === 'ABSENT') {
            return next(
              new AppError(
                'You were marked Absent by the proctor for this examination slot. Assessment entry is blocked.',
                403
              )
            );
          }
          return next(
            new AppError(
              'Your attendance has not been verified by the administrator yet. The admin must mark you Present during your booked slot before you can enter the assessment.',
              403
            )
          );
        }
      }

      // 60 minutes duration
      const expiresAt = new Date(Date.now() + (level.durationMinutes || 60) * 60 * 1000);

      // Find the 2 questions for this level
      const questions = await CodingQuestion.find({
        courseId: course._id,
        levelNumber: level.levelNumber,
      }).sort({ questionNumber: 1 });

      if (questions.length < 2) {
        return next(new AppError('This level does not have the required 2 coding questions configured yet.', 500));
      }

      attempt = await AssessmentAttempt.create({
        studentId: req.user._id,
        courseId: course._id,
        levelId: level._id,
        levelNumber: level.levelNumber,
        bookingId: bookingToUse ? bookingToUse._id : (bookingId ? new mongoose.Types.ObjectId(bookingId) : undefined),
        status: 'IN_PROGRESS',
        startedAt: now,
        expiresAt,
        questionSubmissions: questions.map((q) => ({
          questionId: q._id,
          questionNumber: q.questionNumber,
          code: (q.starterCode instanceof Map ? (q.starterCode as any).get(course.language) : (q.starterCode as any)?.[course.language]) || '',
          language: course.language,
          sampleTestPassed: false,
          testResults: [],
          questionScore: 0,
        })),
      });

      // Increment attempt counter in progress
      progress.totalAttempts += 1;
      progress.lastAttemptAt = now;
      await progress.save();
    }

    // Fetch questions and SANITIZE by omitting mainTestCases (never leak hidden tests!)
    const rawQuestions = await CodingQuestion.find({
      courseId: course._id,
      levelNumber: level.levelNumber,
    })
      .select('-mainTestCases -referenceSolution')
      .sort({ questionNumber: 1 });

    res.status(200).json({
      success: true,
      attempt: {
        id: attempt._id,
        courseId: attempt.courseId,
        courseName: course.name,
        language: course.language,
        levelId: attempt.levelId,
        levelNumber: attempt.levelNumber,
        levelTitle: level.title,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        questionSubmissions: attempt.questionSubmissions,
      },
      questions: rawQuestions,
    });
  } catch (error: any) {
    next(error);
  }
};

export const runSampleTest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const { questionId, code, language } = req.body;

    if (!code || !language) {
      return next(new AppError('Code and language are required', 400));
    }

    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      studentId: req.user?._id,
    });

    if (!attempt) return next(new AppError('Assessment attempt not found', 404));

    if (attempt.status !== 'IN_PROGRESS' || new Date() > attempt.expiresAt) {
      return next(new AppError('Assessment examination time has expired', 400));
    }

    const question = await CodingQuestion.findById(questionId);
    if (!question) return next(new AppError('Question not found', 404));

    const sample = question.sampleTestCase;

    // Run code through isolated execution service
    const execution = await CodeExecutionService.execute(
      code,
      language,
      sample.input,
      question.timeLimitMs,
      question.memoryLimitKb
    );

    const cleanActual = (execution.stdout || '').trim();
    const cleanExpected = sample.expectedOutput.trim();
    const passed = execution.success && cleanActual === cleanExpected;

    // Update attempt draft code without modifying official assessment score
    const sub = attempt.questionSubmissions.find(
      (s) => s.questionId.toString() === questionId
    );
    if (sub) {
      sub.code = code;
      sub.language = language;
      sub.sampleTestPassed = passed;
      sub.sampleExecutionOutput = cleanActual;
      await attempt.save();
    }

    res.status(200).json({
      success: true,
      isServiceAvailable: execution.isServiceAvailable,
      sampleTest: {
        passed,
        input: sample.input,
        expectedOutput: cleanExpected,
        actualOutput: cleanActual,
        stderr: execution.stderr,
        compileOutput: execution.compileOutput,
        executionTimeMs: execution.executionTimeMs,
        statusDescription: execution.statusDescription,
        explanation: sample.explanation,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const submitQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const { questionId, code, language } = req.body;

    if (!code || !language) {
      return next(new AppError('Code and language are required for evaluation', 400));
    }

    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      studentId: req.user?._id,
    });

    if (!attempt) return next(new AppError('Assessment attempt not found', 404));

    if (attempt.status !== 'IN_PROGRESS' || new Date() > attempt.expiresAt) {
      return next(new AppError('Assessment examination time has expired', 400));
    }

    const question = await CodingQuestion.findById(questionId);
    if (!question) return next(new AppError('Question not found', 404));

    // Evaluate all 5 hidden main test cases
    const testResults = [];
    let questionScore = 0;

    for (let i = 0; i < question.mainTestCases.length; i++) {
      const tc = question.mainTestCases[i];
      const execution = await CodeExecutionService.execute(
        code,
        language,
        tc.input,
        question.timeLimitMs,
        question.memoryLimitKb
      );

      const cleanActual = (execution.stdout || '').trim();
      const cleanExpected = tc.expectedOutput.trim();
      const passed = execution.success && cleanActual === cleanExpected;

      const marksEarned = passed ? 10 : 0;
      questionScore += marksEarned;

      let statusDesc = 'Passed';
      if (!execution.isServiceAvailable) {
        statusDesc = 'Service Unavailable';
      } else if (!execution.success) {
        statusDesc = execution.statusDescription;
      } else if (!passed) {
        statusDesc = 'Wrong Answer';
      }

      testResults.push({
        testCaseIndex: i + 1,
        passed,
        marksEarned,
        statusDescription: statusDesc,
        executionTimeMs: execution.executionTimeMs,
      });
    }

    // Persist question submission in attempt
    const subIndex = attempt.questionSubmissions.findIndex(
      (s) => s.questionId.toString() === questionId
    );

    if (subIndex >= 0) {
      attempt.questionSubmissions[subIndex].code = code;
      attempt.questionSubmissions[subIndex].language = language;
      attempt.questionSubmissions[subIndex].testResults = testResults as any;
      attempt.questionSubmissions[subIndex].questionScore = questionScore;
      attempt.questionSubmissions[subIndex].submittedAt = new Date();
    }

    await attempt.save();

    const passedCount = testResults.filter((t) => t.passed).length;

    res.status(200).json({
      success: true,
      message: `Question evaluated: ${passedCount}/5 test cases passed (${questionScore}/50 marks)`,
      questionScore,
      maxScore: 50,
      testCasesPassed: passedCount,
      totalTestCases: 5,
      testResults: testResults.map((t) => ({
        testCaseIndex: t.testCaseIndex,
        passed: t.passed,
        marksEarned: t.marksEarned,
        statusDescription: t.statusDescription,
        executionTimeMs: t.executionTimeMs,
      })),
    });
  } catch (error: any) {
    next(error);
  }
};

export const submitLevel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;

    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      studentId: req.user?._id,
    });

    if (!attempt) return next(new AppError('Assessment attempt not found', 404));

    if (attempt.status === 'SUBMITTED') {
      return next(new AppError('This assessment level has already been submitted', 400));
    }

    // Calculate official total level score
    let totalScore = 0;
    attempt.questionSubmissions.forEach((sub) => {
      totalScore += sub.questionScore || 0;
    });

    // Level passing rule: STRICT 100/100 REQUIRED
    const passed = totalScore === 100;

    attempt.totalScore = totalScore;
    attempt.passed = passed;
    attempt.status = 'SUBMITTED';
    attempt.completedAt = new Date();
    await attempt.save();

    // If booking was associated, mark it COMPLETED
    if (attempt.bookingId) {
      await Booking.findByIdAndUpdate(attempt.bookingId, { status: 'COMPLETED' });
    }

    // Update StudentProgress
    const progress = await StudentProgress.findOne({
      studentId: req.user?._id,
      courseId: attempt.courseId,
    });

    if (progress) {
      if (passed) {
        if (!progress.completedLevels.includes(attempt.levelNumber)) {
          progress.completedLevels.push(attempt.levelNumber);
          progress.completedLevels.sort((a, b) => a - b);
        }

        // Unlock next level if currently on this level and < 4
        if (progress.currentUnlockedLevel === attempt.levelNumber && attempt.levelNumber < 4) {
          progress.currentUnlockedLevel = attempt.levelNumber + 1;
        }
      }

      // Record highest score
      const currentHighest = progress.highestScores.get(String(attempt.levelNumber)) || 0;
      if (totalScore > currentHighest) {
        progress.highestScores.set(String(attempt.levelNumber), totalScore);
      }

      await progress.save();
    }

    res.status(200).json({
      success: true,
      message: passed
        ? `Congratulations! You scored ${totalScore}/100 and successfully cleared Level ${attempt.levelNumber}!`
        : `Assessment completed. You scored ${totalScore}/100. A perfect score of 100/100 is required to clear this level.`,
      result: {
        attemptId: attempt._id,
        levelNumber: attempt.levelNumber,
        totalScore,
        maxScore: 100,
        passed,
        nextLevelUnlocked: passed && attempt.levelNumber < 4,
        nextLevelNumber: passed && attempt.levelNumber < 4 ? attempt.levelNumber + 1 : null,
        completedLevels: progress?.completedLevels || [],
        questionBreakdown: attempt.questionSubmissions.map((sub) => ({
          questionNumber: sub.questionNumber,
          score: sub.questionScore,
          maxScore: 50,
          passedTests: sub.testResults?.filter((t) => t.passed).length || 0,
          totalTests: 5,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const getMyResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const attempts = await AssessmentAttempt.find({
      studentId: req.user._id,
      status: { $in: ['SUBMITTED', 'AWAITING_EXIT_VERIFICATION', 'EXIT_VERIFIED', 'COMPLETED'] },
    })
      .populate('courseId', 'name language icon')
      .populate('levelId', 'title category levelNumber')
      .sort({ completedAt: -1 });

    const progressList = await StudentProgress.find({ studentId: req.user._id })
      .populate('courseId', 'name language totalLevels');

    res.status(200).json({
      success: true,
      attempts: attempts.map((a) => ({
        id: a._id,
        courseName: (a.courseId as any)?.name,
        language: (a.courseId as any)?.language,
        levelTitle: (a.levelId as any)?.title,
        levelNumber: a.levelNumber,
        totalScore: a.totalScore,
        passed: a.passed,
        completedAt: a.completedAt,
        questionBreakdown: a.questionSubmissions.map((q) => ({
          questionNumber: q.questionNumber,
          score: q.questionScore,
          passedTests: q.testResults?.filter((t) => t.passed).length || 0,
        })),
      })),
      courseProgress: progressList.map((p) => ({
        courseName: (p.courseId as any)?.name,
        language: p.language,
        currentUnlockedLevel: p.currentUnlockedLevel,
        completedLevels: p.completedLevels,
        totalLevels: (p.courseId as any)?.totalLevels || 4,
      })),
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAssessmentAttemptById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return next(new AppError('Invalid attempt ID format', 400));
    }

    const attempt = await AssessmentAttempt.findById(attemptId)
      .populate('courseId', 'name language icon')
      .populate('levelId', 'title category levelNumber durationMinutes passingScore');

    if (!attempt) {
      return next(new AppError('Assessment attempt not found', 404));
    }

    // Verify ownership
    if (attempt.studentId.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      return next(new AppError('Unauthorized access to this assessment attempt', 403));
    }

    // Check expiry if IN_PROGRESS
    const now = new Date();
    if (attempt.status === 'IN_PROGRESS' && now > attempt.expiresAt) {
      attempt.status = 'EXPIRED';
      await attempt.save();
    }

    // Fetch and sanitize questions (omit mainTestCases, referenceSolution)
    const questions = await CodingQuestion.find({
      courseId: (attempt.courseId as any)._id,
      levelNumber: attempt.levelNumber,
    })
      .select('-mainTestCases -referenceSolution')
      .sort({ questionNumber: 1 });

    const isSubmitted = ['SUBMITTED', 'AWAITING_EXIT_VERIFICATION', 'EXIT_VERIFIED', 'COMPLETED'].includes(attempt.status);

    let result = null;
    if (isSubmitted) {
      let passedTestCasesCount = 0;
      let totalTestCasesCount = 0;

      const questionBreakdown = attempt.questionSubmissions.map((sub) => {
        const passedTests = sub.testResults?.filter((t) => t.passed).length || 0;
        const totalTests = 5;
        passedTestCasesCount += passedTests;
        totalTestCasesCount += totalTests;

        return {
          questionNumber: sub.questionNumber,
          score: sub.questionScore,
          maxScore: 50,
          passedTests,
          totalTests,
          testResults: sub.testResults?.map((t) => ({
            testCaseIndex: t.testCaseIndex,
            passed: t.passed,
            marksEarned: t.marksEarned,
            statusDescription: t.statusDescription,
          })) || [],
        };
      });

      result = {
        attemptId: attempt._id,
        levelNumber: attempt.levelNumber,
        totalScore: attempt.totalScore,
        maxScore: 100,
        passed: attempt.passed,
        passedTestCasesCount,
        failedTestCasesCount: totalTestCasesCount - passedTestCasesCount,
        levelCompletionStatus: attempt.passed ? 'COMPLETED' : 'RETRY_REQUIRED',
        status: attempt.status,
        isExitVerified: !!attempt.isExitVerified,
        questionBreakdown,
      };
    }

    res.status(200).json({
      success: true,
      attempt: {
        id: attempt._id,
        courseId: (attempt.courseId as any)._id,
        courseName: (attempt.courseId as any).name,
        language: (attempt.courseId as any).language,
        levelId: (attempt.levelId as any)._id,
        levelNumber: attempt.levelNumber,
        levelTitle: (attempt.levelId as any).title,
        status: attempt.status,
        isSubmitted,
        isExitVerified: !!attempt.isExitVerified,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        finalSubmittedAt: attempt.finalSubmittedAt,
        questionSubmissions: attempt.questionSubmissions,
      },
      questions,
      result,
    });
  } catch (error: any) {
    next(error);
  }
};

export const submitOverallAssessment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const { submissions } = req.body || {};

    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      studentId: req.user?._id,
    });

    if (!attempt) {
      return next(new AppError('Assessment attempt not found', 404));
    }

    // Prevent duplicate submission from modifying authoritative score or re-clearing levels
    if (['SUBMITTED', 'AWAITING_EXIT_VERIFICATION', 'EXIT_VERIFIED', 'COMPLETED'].includes(attempt.status)) {
      return next(new AppError('This assessment has already been finalized and submitted.', 400));
    }

    if (new Date() > attempt.expiresAt) {
      attempt.status = 'EXPIRED';
      await attempt.save();
      return next(new AppError('Assessment time has expired. Submissions are no longer accepted.', 400));
    }

    // Update in-memory draft code if provided
    if (Array.isArray(submissions)) {
      submissions.forEach((draft: any) => {
        const sub = attempt.questionSubmissions.find(
          (s) => s.questionId.toString() === String(draft.questionId)
        );
        if (sub && typeof draft.code === 'string') {
          sub.code = draft.code;
          if (draft.language) sub.language = draft.language;
        }
      });
    }

    let overallTotalScore = 0;
    let totalPassedTestCases = 0;
    const totalOfficialTestCases = 10;
    const questionBreakdown = [];

    // Evaluate both questions against their 5 official test cases
    for (const sub of attempt.questionSubmissions) {
      const question = await CodingQuestion.findById(sub.questionId);
      if (!question) {
        continue;
      }

      const testResults = [];
      let questionScore = 0;

      // Exactly 5 main evaluation test cases (10 marks each)
      for (const tc of question.mainTestCases) {
        const execution = await CodeExecutionService.execute(
          sub.code,
          sub.language || question.language,
          tc.input,
          question.timeLimitMs,
          question.memoryLimitKb
        );

        const cleanActual = (execution.stdout || '').trim();
        const cleanExpected = tc.expectedOutput.trim();
        const passed = execution.success && cleanActual === cleanExpected;
        const marks = passed ? (tc.marks || 10) : 0;

        testResults.push({
          testCaseIndex: testResults.length + 1,
          passed,
          marksEarned: marks,
          statusDescription: passed
            ? 'Passed'
            : execution.statusDescription || 'Wrong Answer',
          executionTimeMs: execution.executionTimeMs,
        });

        if (passed) {
          questionScore += marks;
          totalPassedTestCases += 1;
        }
      }

      sub.testResults = testResults;
      sub.questionScore = questionScore;
      sub.submittedAt = new Date();

      overallTotalScore += questionScore;

      questionBreakdown.push({
        questionNumber: sub.questionNumber,
        score: questionScore,
        maxScore: 50,
        passedTests: testResults.filter((t) => t.passed).length,
        totalTests: 5,
        testResults: testResults.map((t) => ({
          testCaseIndex: t.testCaseIndex,
          passed: t.passed,
          marksEarned: t.marksEarned,
          statusDescription: t.statusDescription,
        })),
      });
    }

    // Strict 100/100 threshold (all 10 test cases must pass)
    const passed = overallTotalScore === 100;
    const now = new Date();

    attempt.totalScore = overallTotalScore;
    attempt.passed = passed;
    attempt.status = 'AWAITING_EXIT_VERIFICATION';
    attempt.finalSubmittedAt = now;
    attempt.completedAt = now;
    attempt.otpStatus = 'NOT_GENERATED';
    attempt.isExitVerified = false;
    await attempt.save();

    // Mark booking as COMPLETED if attached
    if (attempt.bookingId) {
      await Booking.findByIdAndUpdate(attempt.bookingId, { status: 'COMPLETED' });
    }

    // Update StudentProgress
    const progress = await StudentProgress.findOne({
      studentId: req.user?._id,
      courseId: attempt.courseId,
    });

    let nextLevelUnlocked = false;
    let nextLevelNumber: number | null = null;

    if (progress) {
      if (passed) {
        if (!progress.completedLevels.includes(attempt.levelNumber)) {
          progress.completedLevels.push(attempt.levelNumber);
          progress.completedLevels.sort((a, b) => a - b);
        }

        if (progress.currentUnlockedLevel === attempt.levelNumber && attempt.levelNumber < 4) {
          progress.currentUnlockedLevel = attempt.levelNumber + 1;
          nextLevelUnlocked = true;
          nextLevelNumber = attempt.levelNumber + 1;
        }
      }

      // Record highest score
      const currentHighest = progress.highestScores.get(String(attempt.levelNumber)) || 0;
      if (overallTotalScore > currentHighest) {
        progress.highestScores.set(String(attempt.levelNumber), overallTotalScore);
      }

      await progress.save();
    }

    res.status(200).json({
      success: true,
      message: passed
        ? `Assessment submitted successfully! Perfect score of 100/100 achieved! Level ${attempt.levelNumber} cleared.`
        : `Assessment submitted. You scored ${overallTotalScore}/100. A score of 100/100 (all 10 test cases) is required to clear Level ${attempt.levelNumber}.`,
      result: {
        attemptId: attempt._id,
        levelNumber: attempt.levelNumber,
        totalScore: overallTotalScore,
        maxScore: 100,
        passed,
        passedTestCasesCount: totalPassedTestCases,
        failedTestCasesCount: totalOfficialTestCases - totalPassedTestCases,
        levelCompletionStatus: passed ? 'COMPLETED' : 'RETRY_REQUIRED',
        status: attempt.status,
        nextLevelUnlocked,
        nextLevelNumber,
        questionBreakdown,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const verifyExitOtp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const { otp } = req.body;

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      return next(new AppError('A valid 6-digit numeric OTP is required', 400));
    }

    const cleanOtp = otp.trim();

    // Query attempt including hidden otpHash field
    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      studentId: req.user?._id,
    }).select('+otpHash');

    if (!attempt) {
      return next(new AppError('Assessment session not found', 404));
    }

    // Must be submitted before exit verification
    if (!['AWAITING_EXIT_VERIFICATION', 'SUBMITTED', 'EXIT_VERIFIED'].includes(attempt.status)) {
      return next(new AppError('You must submit the overall assessment before verifying exit OTP.', 400));
    }

    // If already verified, return idempotent success
    if (attempt.isExitVerified && attempt.status === 'EXIT_VERIFIED') {
      res.status(200).json({
        success: true,
        message: 'Exit verification has already been completed. You may now exit the assessment.',
        isExitVerified: true,
      });
      return;
    }

    // Rate-limiting: Check failed attempt counter
    if ((attempt.otpFailedAttempts || 0) >= MAX_FAILED_OTP_ATTEMPTS) {
      attempt.otpStatus = 'INVALIDATED';
      await attempt.save();
      return next(
        new AppError(
          'Maximum verification attempts exceeded. For security, this OTP was invalidated. Please request a new OTP from the administrator.',
          429
        )
      );
    }

    // Check OTP status and server-enforced 30-second expiry
    const now = new Date();
    if (attempt.otpStatus !== 'ACTIVE' || !attempt.otpExpiresAt || !attempt.otpHash) {
      return next(
        new AppError(
          'No active OTP found for this session. Please ask the administrator to generate an exit OTP.',
          400
        )
      );
    }

    if (now > attempt.otpExpiresAt) {
      attempt.otpStatus = 'EXPIRED';
      await attempt.save();
      return next(
        new AppError(
          'The OTP has expired (30-second server validity exceeded). Please request a new OTP from the administrator.',
          400
        )
      );
    }

    // Timing-safe cryptographic hash comparison
    const isMatch = verifyOtpHash(cleanOtp, attempt._id.toString(), attempt.otpHash);

    if (!isMatch) {
      attempt.otpFailedAttempts = (attempt.otpFailedAttempts || 0) + 1;
      const remainingAttempts = MAX_FAILED_OTP_ATTEMPTS - attempt.otpFailedAttempts;
      if (remainingAttempts <= 0) {
        attempt.otpStatus = 'INVALIDATED';
      }
      await attempt.save();

      return next(
        new AppError(
          remainingAttempts > 0
            ? `Incorrect OTP. Please enter the 6-digit code provided by your administrator (${remainingAttempts} attempts remaining).`
            : 'Maximum verification attempts exceeded. This OTP has been invalidated. Please ask the administrator for a new one.',
          400
        )
      );
    }

    // Successful Verification: Atomic consumption of OTP
    attempt.isExitVerified = true;
    attempt.otpStatus = 'USED';
    attempt.otpVerifiedAt = now;
    attempt.status = 'EXIT_VERIFIED';
    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Exit OTP verified successfully! You may now exit the assessment.',
      isExitVerified: true,
    });
  } catch (error: any) {
    next(error);
  }
};

export const exitAssessment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;

    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      studentId: req.user?._id,
    });

    if (!attempt) {
      return next(new AppError('Assessment session not found', 404));
    }

    // Strict security check: Student cannot exit without successful OTP verification
    if (!attempt.isExitVerified || attempt.status !== 'EXIT_VERIFIED') {
      return next(
        new AppError(
          'Protected assessment lock active. You must complete administrator OTP verification before exiting.',
          403
        )
      );
    }

    // Transition to COMPLETED
    attempt.status = 'COMPLETED';
    attempt.exitedAt = new Date();
    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Assessment session completed. Exit authorized.',
      redirectTo: '/dashboard',
    });
  } catch (error: any) {
    next(error);
  }
};

