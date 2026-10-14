import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from './app';
import { disconnectDatabase } from './config/database';

describe('SkillForge Backend Initialization & Health Check', () => {
  let app: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('GET / should return service identity and version', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('SkillForge API');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.documentation).toBe('/api/health');
  });

  it('GET /api/health should return 200 with structured database and execution service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.database).toBeDefined();
    expect(typeof res.body.database.connected).toBe('boolean');
    expect(res.body.codeExecutionService).toBeDefined();
    expect(res.body.campusTimezone).toBe('Asia/Kolkata');
  });

  it('GET /api/unknown-endpoint should return 404 with structured error', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Resource not found');
  });
});
