/**
 * Unit tests for input validation on auth, workspace, and site routes.
 *
 * These tests verify that the routes reject malformed or missing input
 * with the correct HTTP status codes and error messages — without hitting
 * a real database. We use a lightweight mock approach: replace Mongoose
 * models with jest mocks to isolate validation logic.
 */

const express = require('express');
const request = require('supertest');

// ── Mock Mongoose models before requiring routes ─────────────────────────────
jest.mock('../../models/User');
jest.mock('../../models/Workspace');
jest.mock('../../models/Site');

const _User = require('../../models/User');
const _Workspace = require('../../models/Workspace');
const _Site = require('../../models/Site');

const authRouter = require('../../routes/auth');
const workspaceRouter = require('../../routes/workspaces');
const siteRouter = require('../../routes/sites');

const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/workspaces', workspaceRouter);
  app.use('/api/sites', siteRouter);
  return app;
}

function authToken(userId = '507f1f77bcf86cd799439011') {
  return jwt.sign({ id: userId, email: 'test@test.com', name: 'Test' }, secret);
}

describe('Auth route validation', () => {
  const app = createApp();

  test('POST /api/auth/register — rejects missing email', async () => {
    const res = await request(app).post('/api/auth/register').send({ password: 'password123', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/email/i);
  });

  test('POST /api/auth/register — rejects missing password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@test.com', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/password/i);
  });

  test('POST /api/auth/register — rejects short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'short', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  test('POST /api/auth/register — rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/email/i);
  });

  test('POST /api/auth/register — rejects blank name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'password123', name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/name/i);
  });

  test('POST /api/auth/login — rejects missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/email/i);
  });

  test('POST /api/auth/login — rejects missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/password/i);
  });
});

describe('Workspace route validation', () => {
  const app = createApp();

  test('POST /api/workspaces — rejects missing name', async () => {
    const res = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${authToken()}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/name/i);
  });

  test('POST /api/workspaces — rejects blank name', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/name/i);
  });

  test('POST /api/workspaces/:id/members — rejects missing email', async () => {
    const res = await request(app)
      .post('/api/workspaces/507f1f77bcf86cd799439011/members')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/email/i);
  });

  test('POST /api/workspaces/:id/members — rejects invalid role', async () => {
    const res = await request(app)
      .post('/api/workspaces/507f1f77bcf86cd799439011/members')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ email: 'test@test.com', role: 'superadmin' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/role/i);
  });

  test('POST /api/workspaces — rejects request without auth token', async () => {
    const res = await request(app).post('/api/workspaces').send({ name: 'Test workspace' });
    expect(res.status).toBe(401);
  });
});

describe('Site route validation', () => {
  const app = createApp();

  test('POST /api/sites — rejects missing workspaceId', async () => {
    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ domain: 'example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/workspaceId/i);
  });

  test('POST /api/sites — rejects missing domain', async () => {
    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ workspaceId: '507f1f77bcf86cd799439011' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/domain/i);
  });

  test('POST /api/sites — rejects invalid domain', async () => {
    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ workspaceId: '507f1f77bcf86cd799439011', domain: 'not a domain!!!' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/domain/i);
  });

  test('POST /api/sites — rejects request without auth token', async () => {
    const res = await request(app)
      .post('/api/sites')
      .send({ workspaceId: '507f1f77bcf86cd799439011', domain: 'example.com' });
    expect(res.status).toBe(401);
  });
});
