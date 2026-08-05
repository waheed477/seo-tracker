/**
 * Integration tests for Stripe billing — free tier limit enforcement
 * and webhook event handling.
 *
 * Stripe SDK is fully mocked — no real API calls are made.
 */
const request = require('supertest');
const app = require('../app');
const Workspace = require('../../models/Workspace');
const _Site = require('../../models/Site');
const _User = require('../../models/User');
const Notification = require('../../models/Notification');

// ── Set required Stripe env vars for tests ────────────────────────────────────
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_unit_tests';

// ── Mock the Stripe SDK ──────────────────────────────────────────────────────
jest.mock('../../services/stripeService', () => {
  const original = jest.requireActual('../../services/stripeService');
  return {
    ...original,
    stripe: {
      webhooks: {
        constructEvent: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
      customers: {
        create: jest.fn(),
      },
    },
    createCheckoutSession: jest.fn(),
    createPortalSession: jest.fn(),
  };
});

const { stripe, createCheckoutSession: _createCheckoutSession, createPortalSession: _createPortalSession } = require('../../services/stripeService');

let token;
let _userId;
let workspaceId;

beforeEach(async () => {
  // Create a user and get a token
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'billing-test@example.com', password: 'password123', name: 'Billing Tester' });
  token = regRes.body.data.token;
  _userId = regRes.body.data.user.id;

  // Create a workspace
  const wsRes = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Billing Test WS' });
  workspaceId = wsRes.body.data._id;
});

// ── Free tier limit enforcement ──────────────────────────────────────────────

describe('Free tier site limit', () => {
  it('allows creating the first site (up to the limit of 1)', async () => {
    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, domain: 'site1.example.com' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 with FREE_TIER_LIMIT_REACHED on the 2nd site', async () => {
    // Create the 1 allowed site first
    await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, domain: 'site1.example.com' });

    // 2nd site should be blocked
    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId, domain: 'site2.example.com' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('FREE_TIER_LIMIT_REACHED');
    expect(res.body.data).toEqual({ limit: 1, current: 1 });
  });

  it('allows creating sites beyond the limit on pro plan', async () => {
    // Upgrade workspace to pro
    await Workspace.findByIdAndUpdate(workspaceId, { plan: 'pro' });

    // Create 6 sites — all should succeed
    for (let i = 1; i <= 6; i++) {
      const res = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${token}`)
        .send({ workspaceId, domain: `pro-site${i}.example.com` });
      expect(res.status).toBe(201);
    }
  });
});

// ── Webhook event handling ───────────────────────────────────────────────────

describe('Stripe webhook events', () => {
  it('rejects webhook with invalid signature', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'invalid-sig')
      .send('{"type":"test"}');

    expect(res.status).toBe(400);
  });

  it('handles checkout.session.completed — upgrades workspace to pro', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { workspaceId },
          subscription: 'sub_test_123',
        },
      },
    };
    stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid-sig')
      .send(JSON.stringify(mockEvent));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    // Wait for async handler
    await new Promise((r) => setTimeout(r, 100));

    const ws = await Workspace.findById(workspaceId);
    expect(ws.plan).toBe('pro');
    expect(ws.planStatus).toBe('active');
    expect(ws.stripeSubscriptionId).toBe('sub_test_123');

    // Notification should be created
    const notifs = await Notification.find({ workspaceId, type: 'plan_upgraded' });
    expect(notifs.length).toBe(1);
  });

  it('handles customer.subscription.updated — sets past_due', async () => {
    // First, set workspace to pro
    await Workspace.findByIdAndUpdate(workspaceId, {
      plan: 'pro',
      planStatus: 'active',
      stripeSubscriptionId: 'sub_test_123',
    });

    const mockEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_123',
          status: 'past_due',
        },
      },
    };
    stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid-sig')
      .send(JSON.stringify(mockEvent));

    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 100));

    const ws = await Workspace.findById(workspaceId);
    expect(ws.plan).toBe('pro'); // kept as pro — grace period
    expect(ws.planStatus).toBe('past_due');

    const notifs = await Notification.find({ workspaceId, type: 'payment_failed' });
    expect(notifs.length).toBe(1);
  });

  it('handles customer.subscription.deleted — downgrades to free', async () => {
    await Workspace.findByIdAndUpdate(workspaceId, {
      plan: 'pro',
      planStatus: 'active',
      stripeSubscriptionId: 'sub_test_123',
    });

    const mockEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test_123',
        },
      },
    };
    stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid-sig')
      .send(JSON.stringify(mockEvent));

    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 100));

    const ws = await Workspace.findById(workspaceId);
    expect(ws.plan).toBe('free');
    expect(ws.planStatus).toBe('canceled');
    expect(ws.stripeSubscriptionId).toBeNull();

    const notifs = await Notification.find({ workspaceId, type: 'plan_downgraded' });
    expect(notifs.length).toBe(1);
  });

  it('handles invoice.payment_failed — creates notification', async () => {
    await Workspace.findByIdAndUpdate(workspaceId, {
      plan: 'pro',
      planStatus: 'active',
      stripeCustomerId: 'cus_test_123',
    });

    const mockEvent = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_test_123',
        },
      },
    };
    stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid-sig')
      .send(JSON.stringify(mockEvent));

    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 100));

    const notifs = await Notification.find({ workspaceId, type: 'payment_failed' });
    expect(notifs.length).toBe(1);
  });

  it('responds 200 for unhandled event types', async () => {
    const mockEvent = { type: 'product.created', data: { object: {} } };
    stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid-sig')
      .send(JSON.stringify(mockEvent));

    expect(res.status).toBe(200);
  });
});
