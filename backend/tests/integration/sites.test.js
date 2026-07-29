/**
 * Integration tests for the site and audit routes.
 *
 * Uses supertest + mongodb-memory-server. No external network calls.
 * The audit trigger is tested but the async crawl is mocked —
 * we only verify the API contract (status codes, response shapes).
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

require('../setup');

// Mock the technical SEO agent so we never make real HTTP requests
jest.mock('../../services/agents/technicalSeoAgent', () => ({
  run: jest.fn().mockResolvedValue({
    pagesCrawled: ['https://example.com/'],
    technical: {
      missingMetaDescriptions: ['https://example.com/'],
      missingTitleTags: [],
      duplicateTitles: [],
      headingIssues: [],
      missingAltText: [],
      robotsTxt: { found: true, disallowsEverything: false },
      sitemapXml: { found: true, urlCount: 12 },
      brokenInternalLinks: [],
    },
  }),
}));

async function registerAndLogin(email = 'siteuser@example.com', name = 'Site User') {
  const regRes = await request(app).post('/api/auth/register').send({ email, password: 'password123', name });
  return regRes.body.data.token;
}

async function createWorkspace(token) {
  const res = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Workspace' });
  return res.body.data._id;
}

describe('POST /api/sites', () => {
  let token, workspaceId;

  beforeEach(async () => {
    token = await registerAndLogin('sites@example.com', 'Sites User');
    workspaceId = await createWorkspace(token);
  });

  test('creates a site in a workspace', async () => {
    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, domain: 'example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.domain).toBe('example.com');
    expect(res.body.data.workspaceId).toBe(workspaceId);
  });

  test('normalises domain (strips protocol, lowercase)', async () => {
    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, domain: 'https://Example.COM/' });

    expect(res.status).toBe(201);
    expect(res.body.data.domain).toBe('example.com');
  });

  test('rejects duplicate domain in same workspace', async () => {
    await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, domain: 'example.com' });

    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, domain: 'example.com' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already/i);
  });
});

describe('GET /api/sites/:id/audit/latest', () => {
  let token, workspaceId, siteId;

  beforeEach(async () => {
    token = await registerAndLogin('audit@example.com', 'Audit User');
    workspaceId = await createWorkspace(token);

    const siteRes = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, domain: 'auditsite.com' });
    siteId = siteRes.body.data._id;
  });

  test('returns 404 when no audits exist', async () => {
    const res = await request(app).get(`/api/sites/${siteId}/audit/latest`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/no audits/i);
  });

  test('returns the latest audit after one is created', async () => {
    // Trigger an audit
    const startRes = await request(app).post(`/api/sites/${siteId}/audit`).set('Authorization', `Bearer ${token}`);

    expect(startRes.status).toBe(202);
    expect(startRes.body.success).toBe(true);
    expect(startRes.body.data.auditId).toBeDefined();

    // Wait for the async audit to complete (mocked, so it should be fast)
    await new Promise((r) => setTimeout(r, 500));

    const latestRes = await request(app)
      .get(`/api/sites/${siteId}/audit/latest`)
      .set('Authorization', `Bearer ${token}`);

    expect(latestRes.status).toBe(200);
    expect(latestRes.body.success).toBe(true);
    expect(latestRes.body.data.status).toBe('done');
    expect(latestRes.body.data.results).toBeDefined();
    expect(latestRes.body.data.results.technical).toBeDefined();
    expect(latestRes.body.data.results.pagesCrawled).toBeDefined();
  });

  test('returns 404 for a non-existent site', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/sites/${fakeId}/audit/latest`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
