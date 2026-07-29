const router             = require('express').Router();
const requireAuth        = require('../middleware/auth');
const Workspace          = require('../models/Workspace');
const Site               = require('../models/Site');
const Audit              = require('../models/Audit');
const technicalSeoAgent  = require('../services/agents/technicalSeoAgent');

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;

function normalizeDomain(raw) {
  return String(raw).replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase().trim();
}

/** Shared membership guard */
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

/** Shared site ownership guard — checks the site exists AND caller is a workspace member */
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

/**
 * Fire-and-forget audit runner.
 * Called after the HTTP response is sent so the request handler is not blocked.
 * Pattern reused by later phases (Keyword Agent, etc.).
 */
async function runAuditAsync(auditId, domain) {
  try {
    await Audit.findByIdAndUpdate(auditId, {
      status: 'running',
      startedAt: new Date(),
    });

    const results = await technicalSeoAgent.run(domain);

    await Audit.findByIdAndUpdate(auditId, {
      status: 'done',
      completedAt: new Date(),
      results,
    });

    console.log(`[Audit] ${auditId} completed — ${results.pagesCrawled.length} pages crawled`);
  } catch (err) {
    await Audit.findByIdAndUpdate(auditId, {
      status: 'failed',
      completedAt: new Date(),
      error: err.message ?? 'Unknown error',
    });
    console.error(`[Audit] ${auditId} failed:`, err.message);
  }
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

// ── POST /api/sites/:id/audit ─────────────────────────────────────────────────
// Creates an Audit doc (status: queued), responds immediately with auditId,
// then fires the crawl asynchronously (fire-and-forget pattern).
router.post('/:id/audit', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    // Prevent stacking multiple running audits on the same site
    const inProgress = await Audit.findOne({
      siteId: site._id,
      status: { $in: ['queued', 'running'] },
    });
    if (inProgress) {
      return res.status(409).json({
        success: false,
        error: 'An audit is already in progress for this site',
        data: { auditId: inProgress._id },
      });
    }

    const audit = await Audit.create({ siteId: site._id });

    // Respond immediately — do not await the crawl
    res.status(202).json({ success: true, data: { auditId: audit._id } });

    // Fire and forget
    runAuditAsync(audit._id, site.domain).catch(console.error);
  } catch (err) {
    console.error('[Sites] audit create error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to start audit' });
  }
});

// ── GET /api/sites/:id/audit/latest ──────────────────────────────────────────
// Returns the most recent Audit for this site (used by frontend polling).
router.get('/:id/audit/latest', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    const audit = await Audit.findOne({ siteId: site._id }).sort({ createdAt: -1 });
    if (!audit) {
      return res.status(404).json({ success: false, error: 'No audits found for this site' });
    }
    res.json({ success: true, data: audit });
  } catch (err) {
    console.error('[Sites] audit latest error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch audit' });
  }
});

// ── GET /api/sites/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;
    res.json({ success: true, data: site });
  } catch (err) {
    console.error('[Sites] get error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch site' });
  }
});

module.exports = router;
