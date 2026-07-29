/**
 * Integration tests for the auth routes.
 *
 * These tests use supertest + mongodb-memory-server to hit real Express
 * routes backed by an in-memory MongoDB. No external network calls are made.
 */

const request = require('supertest');
const app = require('../app');

require('../setup');

describe('POST /api/auth/register', () => {
  test('registers a new user and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user.name).toBe('Alice');
    expect(res.body.data.user.id).toBeDefined();
    // Password hash should never be returned
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('rejects duplicate email registration', async () => {
    // First registration succeeds
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'password123', name: 'Bob' });

    // Second registration with same email fails
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'password456', name: 'Bob Duplicate' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('normalises email to lowercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'Charlie@Example.COM', password: 'password123', name: 'Charlie' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('charlie@example.com');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Register a user for login tests
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login@example.com', password: 'password123', name: 'Login User' });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('login@example.com');
  });

  test('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test('rejects non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test('login is case-insensitive for email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'Login@Example.COM', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
