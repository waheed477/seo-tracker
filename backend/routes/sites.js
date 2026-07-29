const router      = require('express').Router();
const requireAuth = require('../middleware/auth');
const Workspace   = require('../models/Workspace');
const Site        = require('../models/Site');

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;

function normalizeDomain(raw) {
  return String(raw).replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase().trim();
}

/** Shared membership guard — populates req.workspace */
async function requireMembership(workspaceId, userId, res) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    res.status(404).json({ success: false, error: 'Workspace not found' });
    return null;
  }
  const isMember = workspace.members.some(m => m.userId.toString() === userId);
  if (!isMember) {
    res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    return null;
  }
  return workspace;
}

router.use(requireAuth);

// ── POST /api/sites ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { workspaceId, domain } = req.body;

  if (!workspaceId || !domain) {
    return res.status(400).json({ success: false, error: 'workspaceId and domain are required' });
  }

  const normalized = normalizeDomain(domain);
  if (!DOMAIN_RE.test(normalized)) {
    return res.status(400).json({ success: false, error: 'Invalid domain — provide a bare domain like example.com' });
  }

  try {
    const workspace = await requireMembership(workspaceId, req.user.id, res);
    if (!workspace) return;

    const existing = await Site.findOne({ workspaceId, domain: normalized });
    if (existing) {
      return res.status(409).json({ success: false, error: 'This domain is already in the workspace' });
    }

    const site = await Site.create({ workspaceId, domain: normalized });
    res.status(201).json({ success: true, data: site });
  } catch (err) {
    console.error('[Sites] create error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create site' });
  }
});

// ── GET /api/sites?workspaceId=... ────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) {
    return res.status(400).json({ success: false, error: 'workspaceId query param is required' });
  }
  try {
    const workspace = await requireMembership(workspaceId, req.user.id, res);
    if (!workspace) return;

    const sites = await Site.find({ workspaceId }).sort({ createdAt: -1 });
    res.json({ success: true, data: sites });
  } catch (err) {
    console.error('[Sites] list error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch sites' });
  }
});

// ── GET /api/sites/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

    const workspace = await requireMembership(site.workspaceId, req.user.id, res);
    if (!workspace) return;

    res.json({ success: true, data: site });
  } catch (err) {
    console.error('[Sites] get error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch site' });
  }
});

module.exports = router;
