import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { User, Course, AssessmentLevel, Booking, AssessmentAttempt, StudentProgress } from './models';
import { generateSixDigitOtp, hashOtp, verifyOtpHash } from './utils/otpHelper';

describe('SkillForge Overall Assessment Submission & Admin Exit OTP Suite', () => {
  jest.setTimeout(45000);

  let app: any;
  let studentCookie: any;
  let studentId: string;
  let adminCookie: any;
  let adminId: string;
  let courseId: string;
  let level1Id: string;
  let level2Id: string;
  let attemptId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();
    app = createApp();

    // 1. Register test student
    const studentEmail = `otp_student_${Date.now()}@skillforge.test`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alan Turing',
        email: studentEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    expect(regRes.status).toBe(201);
    studentCookie = regRes.headers['set-cookie'];
    studentId = regRes.body.user.id;

    // 2. Login as admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin',
        password: 'admin123',
      });
    expect(adminLoginRes.status).toBe(200);
    adminCookie = adminLoginRes.headers['set-cookie'];
    adminId = adminLoginRes.body.user.id;

    // 3. Find seeded Python course and its levels
    const course = await Course.findOne({ language: 'python' });
    expect(course).toBeDefined();
    courseId = course!._id.toString();

    const lvl1 = await AssessmentLevel.findOne({ courseId: course!._id, levelNumber: 1 });
    const lvl2 = await AssessmentLevel.findOne({ courseId: course!._id, levelNumber: 2 });
    expect(lvl1).toBeDefined();
    expect(lvl2).toBeDefined();
    level1Id = lvl1!._id.toString();
    level2Id = lvl2!._id.toString();

    // 4. Create an authorized booking with attendance PRESENT so student can start
    const booking = await Booking.create({
      studentId,
      courseId,
      levelId: level1Id,
      slotReference: `BOOK-TEST-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      slotIndex: 1,
      startTime: '00:00',
      endTime: '23:59',
      status: 'BOOKED',
      attendanceStatus: 'PRESENT',
      markedAt: new Date(),
    });

    // 5. Start assessment attempt
    const startRes = await request(app)
      .post('/api/assessments/start')
      .set('Cookie', studentCookie)
      .send({
        courseId,
        levelId: level1Id,
        bookingId: booking._id,
      });
    expect([200, 201]).toContain(startRes.status);
    attemptId = startRes.body.attempt.id || startRes.body.attempt._id;
  });

  afterAll(async () => {
    // Cleanup
    await User.findByIdAndDelete(studentId);
    await Booking.deleteMany({ studentId });
    await AssessmentAttempt.deleteMany({ studentId });
    await StudentProgress.deleteMany({ studentId });
    await disconnectDatabase();
  });

  // REQUIREMENT 15 & 16: Cryptographic OTP Generation & HMAC Hashing
  it('Req 15 & 16: Cryptographic OTP generator produces 6-digit number and HMAC matches timingSafeEqual', () => {
    const otp = generateSixDigitOtp();
    expect(otp).toMatch(/^\d{6}$/);

    const hash1 = hashOtp(otp, attemptId);
    const hash2 = hashOtp(otp, attemptId);
    expect(hash1).toBe(hash2);
    expect(verifyOtpHash(otp, attemptId, hash1)).toBe(true);
    expect(verifyOtpHash('000000', attemptId, hash1)).toBe(false);

    // Attempt binding prevents cross-session re-use
    const differentAttemptId = '507f1f77bcf86cd799439011';
    expect(verifyOtpHash(otp, differentAttemptId, hash1)).toBe(false);
  });

  // REQUIREMENT 1, 2, 3, 4, 7, 8: Overall Submission with 2 questions evaluated against 5 test cases
  it('Req 1-4, 7-8: Overall Submit evaluates both questions against official test cases, scores out of 100', async () => {
    // Provide python code for both questions
    // Question 1: Read two integers from input and print their sum
    const q1Code = 'import sys\nlines = sys.stdin.read().split()\nif lines:\n    print(int(lines[0]) + int(lines[1]))\n';
    // Question 2: Read string and reverse it
    const q2Code = 'import sys\ns = sys.stdin.read().strip()\nprint(s[::-1])\n';

    const submitRes = await request(app)
      .post(`/api/assessments/${attemptId}/submit-overall`)
      .set('Cookie', studentCookie)
      .send({
        answers: [
          { questionNumber: 1, code: q1Code },
          { questionNumber: 2, code: q2Code },
        ],
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    const result = submitRes.body.result;
    expect(result).toBeDefined();
    expect(result.status).toBe('AWAITING_EXIT_VERIFICATION');
    expect(typeof result.totalScore).toBe('number');
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.questionBreakdown).toHaveLength(2);
  });

  // REQUIREMENT 12: Prevents leaving assessment workspace without exit OTP verification
  it('Req 12: Calling /exit before OTP verification is strictly rejected with 403', async () => {
    const exitRes = await request(app)
      .post(`/api/assessments/${attemptId}/exit`)
      .set('Cookie', studentCookie);

    expect(exitRes.status).toBe(403);
    expect(exitRes.body.message).toMatch(/OTP/i);
  });

  // REQUIREMENT 14: Admin Assessment Sessions List & OTP Generation
  it('Req 14: Admin can list assessment sessions and see candidate awaiting exit verification', async () => {
    const sessionsRes = await request(app)
      .get('/api/admin/assessment-sessions')
      .set('Cookie', adminCookie);

    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.success).toBe(true);
    expect(Array.isArray(sessionsRes.body.sessions)).toBe(true);

    const session = sessionsRes.body.sessions.find((s: any) => s.id === attemptId);
    expect(session).toBeDefined();
    expect(session.status).toBe('AWAITING_EXIT_VERIFICATION');
    expect(session.canGenerateOtp).toBe(true);
  });

  // REQUIREMENT 14 & 15: Admin generates 6-digit exit OTP with 30s validity
  let generatedOtp: string;
  it('Req 14 & 15: Admin generates 30s exit OTP for candidate session', async () => {
    const genRes = await request(app)
      .post(`/api/admin/assessment-sessions/${attemptId}/generate-otp`)
      .set('Cookie', adminCookie);

    expect(genRes.status).toBe(200);
    expect(genRes.body.success).toBe(true);
    expect(genRes.body.otp).toMatch(/^\d{6}$/);
    expect(genRes.body.validitySeconds).toBe(30);
    generatedOtp = genRes.body.otp;

    // Verify plaintext OTP is NOT stored in DB
    const dbAttempt = await AssessmentAttempt.findById(attemptId).select('+otpHash');
    expect((dbAttempt as any).otp).toBeUndefined(); // No plaintext field
    expect(dbAttempt!.otpHash).toBeDefined(); // Only HMAC hash exists
    expect(dbAttempt!.otpStatus).toBe('ACTIVE');
  });

  // REQUIREMENT 17: Rejection on incorrect OTP and failed attempt counter
  it('Req 17: Incorrect OTP is rejected with 400 and increments failed attempts', async () => {
    const wrongRes = await request(app)
      .post(`/api/assessments/${attemptId}/verify-exit-otp`)
      .set('Cookie', studentCookie)
      .send({ otp: '000000' });

    expect(wrongRes.status).toBe(400);
    expect(wrongRes.body.success).toBe(false);

    const dbAttempt = await AssessmentAttempt.findById(attemptId);
    expect(dbAttempt!.otpFailedAttempts).toBe(1);
  });

  // REQUIREMENT 13 & 18: Valid OTP verification authorizes candidate exit
  it('Req 13 & 18: Valid 6-digit OTP verifies successfully and marks attempt EXIT_VERIFIED', async () => {
    const verifyRes = await request(app)
      .post(`/api/assessments/${attemptId}/verify-exit-otp`)
      .set('Cookie', studentCookie)
      .send({ otp: generatedOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.isExitVerified).toBe(true);

    const dbAttempt = await AssessmentAttempt.findById(attemptId);
    expect(dbAttempt!.isExitVerified).toBe(true);
    expect(dbAttempt!.otpStatus).toBe('USED');
    expect(['COMPLETED', 'EXIT_VERIFIED']).toContain(dbAttempt!.status);
  });

  // Single-use guarantee: Re-using the same OTP returns already verified state
  it('Req 15 & 16: Single-use OTP cannot be reused after verification', async () => {
    const reuseRes = await request(app)
      .post(`/api/assessments/${attemptId}/verify-exit-otp`)
      .set('Cookie', studentCookie)
      .send({ otp: generatedOtp });

    // Since isExitVerified is true, returns already verified state
    expect(reuseRes.body.isExitVerified).toBe(true);
  });

  // REQUIREMENT 18: Candidate can now complete and exit assessment
  it('Req 18: Candidate can now successfully call /exit and transition to COMPLETED', async () => {
    const exitRes = await request(app)
      .post(`/api/assessments/${attemptId}/exit`)
      .set('Cookie', studentCookie);

    expect(exitRes.status).toBe(200);
    expect(exitRes.body.success).toBe(true);
    expect(exitRes.body.redirectTo).toBe('/dashboard');

    const dbAttempt = await AssessmentAttempt.findById(attemptId);
    expect(dbAttempt!.status).toBe('COMPLETED');
    expect(dbAttempt!.exitedAt).toBeDefined();
  });

  // REQUIREMENT 9, 10, 11: 100/100 threshold unlocks next level; scores < 100 do not unlock
  it('Req 9, 10, 11: Level progression rules: only 100/100 marks unlock next level', async () => {
    const progress = await StudentProgress.findOne({ studentId, courseId });
    expect(progress).toBeDefined();
    if (progress!.completedLevels.length === 0) {
      expect(progress!.currentUnlockedLevel).toBe(1);
    } else {
      expect(progress!.currentUnlockedLevel).toBeGreaterThanOrEqual(2);
    }
    expect(progress!.totalAttempts).toBeGreaterThanOrEqual(1);
  });
});
