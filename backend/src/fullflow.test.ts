/// <reference types="jest" />
import request from 'supertest';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { User, Course, AssessmentLevel, Booking, AssessmentAttempt, StudentProgress } from './models';

describe('SkillForge Full-Stack Flow Integration Tests', () => {
  jest.setTimeout(30000);

  let app: any;
  let studentCookie: any;
  let studentId: string;
  let cCourseId: string;
  let level1Id: string;
  let level2Id: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();
    app = createApp();

    // Register a test student
    const email = `test_flow_${Date.now()}@college.edu`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Grace Hopper',
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    studentCookie = regRes.headers['set-cookie'];
    studentId = regRes.body.user.id;

    // Find seeded C course and its levels
    const course = await Course.findOne({ language: 'c' });
    expect(course).toBeDefined();
    cCourseId = course!._id.toString();

    const lvl1 = await AssessmentLevel.findOne({ courseId: course!._id, levelNumber: 1 });
    const lvl2 = await AssessmentLevel.findOne({ courseId: course!._id, levelNumber: 2 });
    expect(lvl1).toBeDefined();
    expect(lvl2).toBeDefined();
    level1Id = lvl1!._id.toString();
    level2Id = lvl2!._id.toString();
  });

  afterAll(async () => {
    // Clean up test data
    await User.findByIdAndDelete(studentId);
    await Booking.deleteMany({ studentId });
    await AssessmentAttempt.deleteMany({ studentId });
    await StudentProgress.deleteMany({ studentId });
    await disconnectDatabase();
  });

  it('GET /api/courses should return 5 seeded programming courses with student progress', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Cookie', studentCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.courses.length).toBeGreaterThanOrEqual(5);

    const cProg = res.body.courses.find((c: any) => c.language === 'c');
    expect(cProg).toBeDefined();
    expect(cProg.currentUnlockedLevel).toBe(1);
  });

  it('GET /api/courses/:courseId should return course details and level locking state', async () => {
    const res = await request(app)
      .get(`/api/courses/${cCourseId}`)
      .set('Cookie', studentCookie);

    expect(res.status).toBe(200);
    expect(res.body.course.levels.length).toBe(4);
    
    // Level 1 should be unlocked, Level 2-4 locked initially
    expect(res.body.course.levels[0].isUnlocked).toBe(true);
    expect(res.body.course.levels[1].isUnlocked).toBe(false);
  });

  it('GET /api/dashboard/summary should return student aggregate metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Cookie', studentCookie);

    expect(res.status).toBe(200);
    expect(res.body.summary.studentName).toBe('Grace Hopper');
    expect(res.body.summary.totalCourses).toBeGreaterThanOrEqual(5);
    expect(res.body.summary.totalCompletedLevels).toBe(0);
  });

  it('GET /api/bookings/availability should return all 8 one-hour examination slots', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .get(`/api/bookings/availability?date=${dateStr}`)
      .set('Cookie', studentCookie);

    expect(res.status).toBe(200);
    expect(res.body.slots.length).toBe(8);
    expect(res.body.slots[0].startTime).toBe('09:10');
    expect(res.body.slots[7].endTime).toBe('17:10');
    expect(res.body.slots[0].isAvailable).toBe(true);
  });

  it('POST /api/bookings should successfully book an available examination slot', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', studentCookie)
      .send({
        courseId: cCourseId,
        levelId: level1Id,
        date: dateStr,
        startTime: '10:10',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.slotReference).toMatch(/^SF-/);
  });

  it('POST /api/bookings should reject duplicate booking for the same student on the same level', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', studentCookie)
      .send({
        courseId: cCourseId,
        levelId: level1Id,
        date: dateStr,
        startTime: '11:10',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already have an active booking');
  });

  it('POST /api/assessments/start should reject starting a locked level (Level 2)', async () => {
    const res = await request(app)
      .post('/api/assessments/start')
      .set('Cookie', studentCookie)
      .send({
        courseId: cCourseId,
        levelId: level2Id,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('locked');
  });

  it('POST /api/assessments/start should start Level 1 exam and return sanitized questions', async () => {
    const res = await request(app)
      .post('/api/assessments/start')
      .set('Cookie', studentCookie)
      .send({
        courseId: cCourseId,
        levelId: level1Id,
      });

    expect(res.status).toBe(200);
    expect(res.body.attempt).toBeDefined();
    expect(res.body.questions.length).toBe(2);
    
    // Crucial security check: main test cases must never be returned to client!
    expect(res.body.questions[0].mainTestCases).toBeUndefined();
    expect(res.body.questions[0].referenceSolution).toBeUndefined();
    expect(res.body.questions[0].sampleTestCase).toBeDefined();
  });
});
