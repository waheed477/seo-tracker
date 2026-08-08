const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Site = require('../models/Site');
const Audit = require('../models/Audit');
const Keyword = require('../models/Keyword');
const technicalSeoAgent = require('../services/agents/technicalSeoAgent');
const keywordResearchAgent = require('../services/agents/keywordResearchAgent');
const contentSeoAgent = require('../services/agents/contentSeoAgent');
const { createNotification } = require('../lib/notify');

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;

const FREE_TIER_SITE_LIMIT = 1;

function normalizeDomain(raw) {
  return String(raw)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase()
    .trim();
}

/** Shared membership guard */
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

    // ── Notification: audit_complete ──────────────────────────────────────
    const audit = await Audit.findById(auditId).lean();
    if (audit) {
      const site = await Site.findById(audit.siteId).lean();
      if (site) {
        const issueCount = results.technical
          ? results.technical.missingTitleTags.length +
            results.technical.missingMetaDescriptions.length +
            results.technical.duplicateTitles.length +
            results.technical.headingIssues.length +
            results.technical.missingAltText.length +
            results.technical.brokenInternalLinks.length
          : 0;
        await createNotification(
          site.workspaceId.toString(),
          'audit_complete',
          `Technical audit of ${site.domain} complete — ${issueCount} issue${issueCount !== 1 ? 's' : ''} found across ${results.pagesCrawled.length} pages.`,
          site._id.toString(),
        );
      }
    }
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

    // ── Duplicate check first — 409 before any tier logic ────────────────
    // Must run before the free-tier check so a duplicate add always gets 409
    // regardless of plan (otherwise a free plan with 1 site returns 403 on
    // what is actually a duplicate-domain error).
    const existing = await Site.findOne({ workspaceId, domain: normalized });
    if (existing) {
      return res.status(409).json({ success: false, error: 'This domain is already in the workspace' });
    }

    // ── Free tier limit enforcement ────────────────────────────────────
    // Only enforced when BILLING_ENABLED=true (default). Set BILLING_ENABLED=false
    // in Render env vars to allow unlimited sites while billing is being configured.
    const billingEnabled = process.env.BILLING_ENABLED !== 'false';
    if (billingEnabled && workspace.plan === 'free') {
      const currentSiteCount = await Site.countDocuments({ workspaceId });
      if (currentSiteCount >= FREE_TIER_SITE_LIMIT) {
        return res.status(403).json({
          success: false,
          error: 'FREE_TIER_LIMIT_REACHED',
          data: { limit: FREE_TIER_SITE_LIMIT, current: currentSiteCount },
        });
      }
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
router.post('/:id/audit', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

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
    res.status(202).json({ success: true, data: { auditId: audit._id } });
    runAuditAsync(audit._id, site.domain).catch(console.error);
  } catch (err) {
    console.error('[Sites] audit create error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to start audit' });
  }
});

// ── GET /api/sites/:id/audit/latest ──────────────────────────────────────────
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

// ── POST /api/sites/:id/keywords ──────────────────────────────────────────────
router.post('/:id/keywords', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    const { seedKeywords } = req.body;
    if (!seedKeywords || !Array.isArray(seedKeywords) || seedKeywords.length === 0) {
      return res.status(400).json({ success: false, error: 'seedKeywords must be a non-empty array of strings' });
    }

    const cleaned = seedKeywords.map((k) => String(k).trim().toLowerCase()).filter((k) => k.length > 0);

    if (cleaned.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid seed keywords provided' });
    }

    const results = await keywordResearchAgent.run(cleaned, site.domain);

    const saved = [];
    for (const kw of results) {
      const doc = await Keyword.findOneAndUpdate(
        { siteId: site._id, keyword: kw.keyword },
        {
          siteId: site._id,
          keyword: kw.keyword,
          cluster: kw.cluster,
          intent: kw.intent,
          difficultyEstimate: kw.difficultyEstimate,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      saved.push(doc);
    }

    res.json({ success: true, data: saved });
  } catch (err) {
    console.error('[Sites] keyword research error:', err.stack || err);
    if (err.response) {
      console.error('[Sites] keyword research axios response:', err.response.status, err.response.data);
    }
    res.status(500).json({ success: false, error: err.message ?? 'Failed to run keyword research' });
  }
});

// ── GET /api/sites/:id/keywords/clusters ──────────────────────────────────────
router.get('/:id/keywords/clusters', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    const keywords = await Keyword.find({ siteId: site._id }).sort({ cluster: 1, keyword: 1 });

    const clusters = {};
    for (const kw of keywords) {
      const name = kw.cluster;
      if (!clusters[name]) clusters[name] = [];
      clusters[name].push({
        _id: kw._id,
        keyword: kw.keyword,
        intent: kw.intent,
        difficultyEstimate: kw.difficultyEstimate,
        createdAt: kw.createdAt,
      });
    }

    res.json({ success: true, data: clusters });
  } catch (err) {
    console.error('[Sites] keyword clusters error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch keyword clusters' });
  }
});

// ── POST /api/sites/:id/content-review ───────────────────────────────────────
router.post('/:id/content-review', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    const { content, targetKeywords, pageUrl } = req.body;

    if (!targetKeywords || !Array.isArray(targetKeywords) || targetKeywords.length === 0) {
      return res.status(400).json({ success: false, error: 'targetKeywords must be a non-empty array of strings' });
    }

    let contentToAnalyze = content;

    if (pageUrl && !contentToAnalyze) {
      const audit = await Audit.findOne({ siteId: site._id, status: 'done' }).sort({ createdAt: -1 });
      if (audit && audit.results?.pagesCrawled?.includes(pageUrl)) {
        try {
          const axiosLib = require('axios');
          const cheerio = require('cheerio');
          const { data } = await axiosLib.get(pageUrl, {
            timeout: 10_000,
            headers: { 'User-Agent': 'SEO-OS-Audit/1.0' },
          });
          const $ = cheerio.load(data);
          contentToAnalyze = $('body').text().replace(/\s+/g, ' ').trim();
        } catch {
          return res.status(400).json({
            success: false,
            error: `Could not fetch content from ${pageUrl} — please paste the content manually`,
          });
        }
      }
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required — paste it in or provide a pageUrl' });
    }

    const cleanedKeywords = targetKeywords.map((k) => String(k).trim().toLowerCase()).filter((k) => k.length > 0);

    if (cleanedKeywords.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid target keywords provided' });
    }

    const results = await contentSeoAgent.run(contentToAnalyze, cleanedKeywords);

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('[Sites] content review error:', err);
    res.status(500).json({ success: false, error: err.message ?? 'Failed to run content review' });
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
