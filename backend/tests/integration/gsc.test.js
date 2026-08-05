/**
 * Integration tests for the GSC OAuth callback (GET /api/gsc/callback).
 *
 * Focus: the callback must verify the signed `state` param BEFORE attempting
 * any token exchange. A missing, malformed, or expired state must be rejected
 * without ever calling gscService.exchangeCode.
 *
 * gscService is mocked so we can assert the token exchange is never reached and
 * so a valid-state flow never makes a real network call to Google.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

require('../setup');

// Mock the GSC service so no real Google network calls happen and so we can
// assert whether the token exchange was attempted.
jest.mock('../../services/gscService', () => ({
  exchangeCode: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 }),
  getAuthUrl: jest.fn(),
  refreshAccessToken: jest.fn(),
  fetchSearchAnalytics: jest.fn(),
}));

const gscService = require('../../services/gscService');
const Site = require('../../models/Site');
const Workspace = require('../../models/Workspace');

describe('GET /api/gsc/callback — state verification', () => {
  beforeEach(() => {
    gscService.exchangeCode.mockClear();
  });

  test('rejects a request with NO state param before any token exchange', async () => {
    const res = await request(app).get('/api/gsc/callback').query({ code: 'fake-google-code' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/state/i);
    expect(gscService.exchangeCode).not.toHaveBeenCalled();
  });

  test('rejects a request with an INVALID (bad signature) state before any token exchange', async () => {
    const forged = jwt.sign({ siteId: 'abc123', purpose: 'gsc_oauth' }, 'wrong-secret', { expiresIn: '10m' });

    const res = await request(app).get('/api/gsc/callback').query({ code: 'fake-google-code', state: forged });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid or expired/i);
    expect(gscService.exchangeCode).not.toHaveBeenCalled();
  });

  test('rejects a state signed with the wrong purpose before any token exchange', async () => {
    // Correctly signed with our secret, but not a gsc_oauth token (e.g. a plain auth JWT)
    const wrongPurpose = jwt.sign({ id: 'user1' }, process.env.JWT_SECRET, { expiresIn: '10m' });

    const res = await request(app).get('/api/gsc/callback').query({ code: 'fake-google-code', state: wrongPurpose });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(gscService.exchangeCode).not.toHaveBeenCalled();
  });

  test('rejects an EXPIRED state before any token exchange', async () => {
    const expired = jwt.sign({ siteId: 'abc123', purpose: 'gsc_oauth' }, process.env.JWT_SECRET, { expiresIn: '-1s' });

    const res = await request(app).get('/api/gsc/callback').query({ code: 'fake-google-code', state: expired });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid or expired/i);
    expect(gscService.exchangeCode).not.toHaveBeenCalled();
  });
});

describe('GET /api/sites/:id/gsc/connect — OAuth redirect', () => {
  let siteId;
  let validToken;
  let validCookie;

  beforeEach(async () => {
    // 1. Register a user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'gsc@example.com', password: 'password123', name: 'GSC User' });
    
    validToken = regRes.body.data.token;
    validCookie = regRes.headers['set-cookie'].find(c => c.startsWith('accessToken=')).split(';')[0];
    const userId = regRes.body.data.user.id;

    // 2. Create a workspace
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'GSC Workspace' });
    
    const workspaceId = wsRes.body.data._id;

    // 3. Create a site
    const site = await Site.create({ workspaceId, domain: 'example.com', gscConnected: false });
    siteId = site._id.toString();

    gscService.getAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
  });

  test('rejects request with no auth token (no cookie, no query)', async () => {
    const res = await request(app).get(`/api/sites/${siteId}/gsc/connect`);
    expect(res.status).toBe(401);
  });

  test('accepts request via ?token= query parameter (legacy fallback)', async () => {
    const res = await request(app).get(`/api/sites/${siteId}/gsc/connect?token=${validToken}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
  });

  test('accepts request via accessToken cookie (modern behavior)', async () => {
    const res = await request(app)
      .get(`/api/sites/${siteId}/gsc/connect`)
      .set('Cookie', validCookie);
    
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
  });
});
