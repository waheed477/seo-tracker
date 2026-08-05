/**
 * stripeService — Stripe Checkout / Portal session creation.
 *
 * All Stripe API calls are centralized here. The webhook handler is in
 * routes/webhooks.js (needs raw body, separate from JSON middleware).
 *
 * TEST MODE ONLY — no live payments are processed.
 */
const Stripe = require('stripe');
const Workspace = require('../models/Workspace');

// In test environments or when STRIPE_SECRET_KEY is not set, use a dummy key
// so the Stripe constructor doesn't throw. The mock will override actual calls.
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_initialization';
const stripe = new Stripe(stripeKey, { apiVersion: '2025-04-30.basil' });

const FREE_TIER_SITE_LIMIT = 1;

/**
 * Create a Stripe Checkout Session for Pro plan subscription.
 * If the workspace doesn't have a stripeCustomerId yet, creates a
 * Stripe Customer first (linked to the user's email).
 *
 * @param {string} workspaceId
 * @param {string} userEmail
 * @returns {Promise<{ url: string }>} Checkout session URL
 */
async function createCheckoutSession(workspaceId, userEmail) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw new Error('Workspace not found');

  // Create Stripe Customer if not already linked
  if (!workspace.stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { workspaceId: workspace._id.toString() },
    });
    workspace.stripeCustomerId = customer.id;
    await workspace.save();
  }

  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

  const session = await stripe.checkout.sessions.create({
    customer: workspace.stripeCustomerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO, quantity: 1 }],
    success_url: `${FRONTEND_URL}/app/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${FRONTEND_URL}/app/billing?canceled=true`,
    metadata: { workspaceId: workspace._id.toString() },
  });

  return { url: session.url };
}

/**
 * Create a Stripe Billing Portal session so the customer can manage
 * their payment method, invoices, and cancel their subscription.
 *
 * @param {string} workspaceId
 * @returns {Promise<{ url: string }>} Portal session URL
 */
async function createPortalSession(workspaceId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw new Error('Workspace not found');
  if (!workspace.stripeCustomerId) throw new Error('No Stripe customer linked to this workspace');

  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${FRONTEND_URL}/app/billing`,
  });

  return { url: session.url };
}

module.exports = {
  stripe,
  createCheckoutSession,
  createPortalSession,
  FREE_TIER_SITE_LIMIT,
};
