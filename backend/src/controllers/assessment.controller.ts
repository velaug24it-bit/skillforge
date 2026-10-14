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

    // Verify booking if bookingId provided
    if (bookingId) {
      const booking = await Booking.findOne({
        _id: bookingId,
        studentId: req.user._id,
        status: 'BOOKED',
      });
      if (!booking) {
        return next(new AppError('Valid active exam booking required for this session', 400));
      }
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

    // If no active non-expired attempt, create a new one
    if (!attempt) {
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
        bookingId: bookingId ? new mongoose.Types.ObjectId(bookingId) : undefined,
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
      status: 'SUBMITTED',
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
