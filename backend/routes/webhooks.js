/**
 * Stripe Webhook handler — POST /api/webhooks/stripe
 *
 * This route MUST receive the raw request body (not JSON-parsed) to
 * verify Stripe's signature. It is mounted BEFORE the global
 * express.json() middleware in server/index.js.
 *
 * TEST MODE ONLY — no live payments are processed.
 */
const router = require('express').Router();
const { stripe } = require('../services/stripeService');
const Workspace = require('../models/Workspace');
const { createNotification } = require('../lib/notify');

// Raw body — this route is mounted BEFORE express.json()
router.post('/stripe', expressRawBody, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ success: false, error: 'Missing signature or webhook secret' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ success: false, error: 'Invalid signature' });
  }

  // Respond 200 quickly so Stripe doesn't retry
  res.json({ received: true });

  // Process event asynchronously
  try {
    await handleEvent(event);
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err.message);
  }
});

async function handleEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const workspaceId = session.metadata?.workspaceId;
      if (!workspaceId) {
        console.warn('[Stripe Webhook] checkout.session.completed — no workspaceId in metadata');
        return;
      }
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        console.warn(`[Stripe Webhook] Workspace ${workspaceId} not found`);
        return;
      }
      workspace.stripeSubscriptionId = session.subscription;
      workspace.plan = 'pro';
      workspace.planStatus = 'active';
      await workspace.save();
      await createNotification(
        workspaceId,
        'plan_upgraded',
        'Your workspace has been upgraded to Pro! Enjoy unlimited sites and all features.',
      );
      console.log(`[Stripe Webhook] Workspace ${workspaceId} upgraded to Pro`);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const workspace = await Workspace.findOne({ stripeSubscriptionId: subscription.id });
      if (!workspace) {
        console.warn(`[Stripe Webhook] subscription.updated — no workspace for subscription ${subscription.id}`);
        return;
      }
      if (subscription.status === 'active') {
        workspace.plan = 'pro';
        workspace.planStatus = 'active';
        await workspace.save();
        console.log(`[Stripe Webhook] Workspace ${workspace._id} subscription active`);
      } else if (subscription.status === 'past_due') {
        workspace.planStatus = 'past_due';
        // Keep plan='pro' — grace period, don't downgrade immediately
        await workspace.save();
        await createNotification(
          workspace._id.toString(),
          'payment_failed',
          'Payment for your Pro plan failed. Please update your payment method to avoid losing access.',
        );
        console.log(`[Stripe Webhook] Workspace ${workspace._id} subscription past_due`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const workspace = await Workspace.findOne({ stripeSubscriptionId: subscription.id });
      if (!workspace) {
        console.warn(`[Stripe Webhook] subscription.deleted — no workspace for subscription ${subscription.id}`);
        return;
      }
      workspace.plan = 'free';
      workspace.planStatus = 'canceled';
      workspace.stripeSubscriptionId = null;
      await workspace.save();
      await createNotification(
        workspace._id.toString(),
        'plan_downgraded',
        'Your Pro subscription has been canceled. You are now on the Free plan (max 1 site).',
      );
      console.log(`[Stripe Webhook] Workspace ${workspace._id} downgraded to Free`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const workspace = await Workspace.findOne({ stripeCustomerId: customerId });
      if (!workspace) {
        console.warn(`[Stripe Webhook] invoice.payment_failed — no workspace for customer ${customerId}`);
        return;
      }
      // Avoid duplicate notification if subscription.updated already handled it
      if (workspace.planStatus !== 'past_due') {
        await createNotification(
          workspace._id.toString(),
          'payment_failed',
          'Payment for your Pro plan failed. Please update your payment method.',
        );
      }
      console.log(`[Stripe Webhook] invoice.payment_failed for workspace ${workspace._id}`);
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}

/**
 * Middleware that captures the raw body for Stripe signature verification.
 * Must be applied BEFORE express.json() on this route only.
 *
 * Handles both streaming requests (production) and pre-buffered bodies
 * (supertest in tests).
 */
function expressRawBody(req, _res, next) {
  // If the body is already parsed (e.g., by supertest which sends a buffer
  // that express.json() hasn't touched yet), use it directly.
  if (req.body && typeof req.body === 'string') {
    req.rawBody = req.body;
    return next();
  }

  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
}

module.exports = router;
