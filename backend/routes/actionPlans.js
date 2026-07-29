/**
 * Action Plan routes
 *
 * POST  /api/sites/:id/action-plan           — Generate a new plan (async)
 * GET   /api/sites/:id/action-plan/latest     — Latest plan for polling
 * PATCH /api/sites/:id/action-plan/items/:itemId — Update item status
 */

const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Site = require('../models/Site');
const ActionPlan = require('../models/ActionPlan');
const { runActionPlanAsync } = require('../services/agents/actionPlanAgent');

// ── Shared guards ─────────────────────────────────────────────────────────────

async function requireMembership(workspaceId, userId, res) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    res.status(404).json({ success: false, error: 'Workspace not found' });
    return null;
  }
  const isMember = workspace.members.some((m) => m.userId.toString() === userId);
  if (!isMember) {
    res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    return null;
  }
  return workspace;
}

async function requireSiteAccess(siteId, userId, res) {
  const site = await Site.findById(siteId);
  if (!site) {
    res.status(404).json({ success: false, error: 'Site not found' });
    return null;
  }
  const workspace = await requireMembership(site.workspaceId, userId, res);
  if (!workspace) return null;
  return site;
}

router.use(requireAuth);

// ── POST /api/sites/:id/action-plan — Generate a new plan (async) ─────────────
router.post('/:id/action-plan', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    // Prevent stacking multiple running plans
    const inProgress = await ActionPlan.findOne({
      siteId: site._id,
      status: { $in: ['queued', 'running'] },
    });
    if (inProgress) {
      return res.status(409).json({
        success: false,
        error: 'An action plan is already being generated',
        data: { planId: inProgress._id },
      });
    }

    const plan = await ActionPlan.create({ siteId: site._id });

    // Respond immediately — fire-and-forget
    res.status(202).json({ success: true, data: { planId: plan._id } });

    runActionPlanAsync(plan._id, site._id, site.domain).catch(console.error);
  } catch (err) {
    console.error('[ActionPlan] create error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to start action plan generation' });
  }
});

// ── GET /api/sites/:id/action-plan/latest — Latest plan for polling ───────────
router.get('/:id/action-plan/latest', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    const plan = await ActionPlan.findOne({ siteId: site._id }).sort({ createdAt: -1 });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'No action plans found for this site' });
    }
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('[ActionPlan] latest error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch action plan' });
  }
});

// ── PATCH /api/sites/:id/action-plan/items/:itemId — Update item status ───────
router.patch('/:id/action-plan/items/:itemId', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    const { status } = req.body;
    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const plan = await ActionPlan.findOne({ siteId: site._id }).sort({ createdAt: -1 });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'No action plan found' });
    }

    const item = plan.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Action item not found' });
    }

    item.status = status;
    await plan.save();

    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('[ActionPlan] update item error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update action item' });
  }
});

module.exports = router;
