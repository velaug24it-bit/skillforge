/// <reference types="jest" />
import request from 'supertest';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { User } from './models/User';

describe('SkillForge Authentication Flow', () => {
  jest.setTimeout(30000);

  let app: any;
  const testStudent = {
    name: 'Alice Turing',
    email: `alice_${Date.now()}@college.edu`,
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();
    app = createApp();
  });

  afterAll(async () => {
    // Clean up test user
    await User.deleteMany({ email: testStudent.email });
    await disconnectDatabase();
  });

  it('POST /api/auth/register should create a new student and set HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testStudent);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testStudent.email.toLowerCase());
    expect(res.body.user.password).toBeUndefined(); // Never return password
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('token=');
  });

  it('POST /api/auth/register should reject duplicate email registrations', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testStudent);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('POST /api/auth/register should reject mismatched passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bob',
        email: 'bob@college.edu',
        password: 'password123',
        confirmPassword: 'differentpassword',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Passwords do not match');
  });

  it('POST /api/auth/login should authenticate valid student credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: testStudent.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe(testStudent.name);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/auth/login should reject incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email or password');
  });

  it('GET /api/auth/me should reject unauthorized requests without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me should return authenticated user profile using cookie', async () => {
    // First login to obtain cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: testStudent.password,
      });

    const cookie = loginRes.headers['set-cookie'];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.user.email).toBe(testStudent.email.toLowerCase());
  });

  it('POST /api/auth/logout should clear the authentication cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie'][0]).toContain('token=;');
  });
});
