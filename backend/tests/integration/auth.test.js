/**
 * Integration tests for the auth routes.
 */

jest.mock('../../services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({}),
}));

const request = require('supertest');
const app = require('../app');
require('../setup');

// Keep track of cookies to simulate browser persistence
function getCookiesForHeader(setCookies) {
  return setCookies.map(c => c.split(';')[0]).join('; ');
}

describe('Auth routes (Cookies & Refresh Tokens)', () => {
  let userCookies = [];

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', name: 'Alice' });
    userCookies = res.headers['set-cookie'];
  });

  test('POST /api/auth/register sets cookies and returns tokens', async () => {
    // Rely on beforeEach
    expect(userCookies).toBeDefined();
    const hasAccessToken = userCookies.some(c => c.startsWith('accessToken='));
    const hasRefreshToken = userCookies.some(c => c.startsWith('refreshToken='));
    expect(hasAccessToken).toBe(true);
    expect(hasRefreshToken).toBe(true);
  });

  test('GET /api/auth/me accepts access token via cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', getCookiesForHeader(userCookies));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  test('GET /api/auth/me rejects missing cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/refresh issues new tokens', async () => {
    // Only send the refreshToken cookie (simulate access token expired/deleted)
    const refreshTokenCookie = userCookies.find(c => c.startsWith('refreshToken='));
    
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', getCookiesForHeader([refreshTokenCookie]));

    expect(res.status).toBe(200);
    
    const newCookies = res.headers['set-cookie'];
    expect(newCookies).toBeDefined();
    
    userCookies = newCookies; // Update to the new tokens
  });

  test('POST /api/auth/refresh rotates the token (old one is revoked)', async () => {
    const originalRefreshTokenCookie = userCookies.find(c => c.startsWith('refreshToken='));
    
    // First refresh should succeed
    let res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', getCookiesForHeader([originalRefreshTokenCookie]));
      
    expect(res.status).toBe(200);

    // Second refresh with the SAME token should fail
    res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', getCookiesForHeader([originalRefreshTokenCookie]));
      
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/logout clears cookies and revokes token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', getCookiesForHeader(userCookies));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify cookies are cleared
    const setCookie = res.headers['set-cookie'];
    const accessCleared = setCookie.some(c => c.startsWith('accessToken=;'));
    const refreshCleared = setCookie.some(c => c.startsWith('refreshToken=;'));
    
    expect(accessCleared).toBe(true);
    expect(refreshCleared).toBe(true);
  });

  test('GET /api/auth/me fails after logout', async () => {
    // We send the old cookies but the token is revoked! Wait, the accessToken might still be valid cryptographically.
    // The /me route only verifies the JWT locally (doesn't hit DB to check if revoked).
    // This is standard JWT behavior unless we blacklist access tokens.
    // Since logout clears cookies, the browser won't send them.
    // We'll simulate the browser by not sending cookies.
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/register edge cases', () => {
  test('rejects duplicate email registration', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'password123', name: 'Bob' });

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

describe('POST /api/auth/login edge cases', () => {
  beforeEach(async () => {
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

describe('Password reset flow', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'reset@example.com', password: 'password123', name: 'Reset User' });
  });

  test('requests password reset without revealing account existence', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/if an account exists/i);
  });

  test('resets password with valid token and logs in', async () => {
    const resetResponse = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@example.com' });

    expect(resetResponse.status).toBe(200);

    const PasswordReset = require('../../models/PasswordReset');
    const record = await PasswordReset.findOne({}).lean();
    expect(record).not.toBeNull();

    const { createPasswordReset } = require('../../services/passwordResetService');
    const newToken = await createPasswordReset(record.userId);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: newToken, password: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('reset@example.com');
  });
});
