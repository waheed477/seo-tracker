/**
 * Competitor routes
 *
 * POST /api/competitors              — Add a competitor domain
 * GET  /api/competitors?siteId=      — List competitors for a site
 * POST /api/competitors/:id/analyze  — Run gap analysis (async job pattern)
 * GET  /api/competitors/:id/report/latest — Latest gap report for polling
 */

const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Site = require('../models/Site');
const Audit = require('../models/Audit');
const Competitor = require('../models/Competitor');
const ContentGapReport = require('../models/ContentGapReport');
const competitorAgent = require('../services/agents/competitorAgent');
const { createNotification } = require('../lib/notify');

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;

function normalizeDomain(raw) {
  return String(raw)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase()
    .trim();
}

/** Daily analysis cap: max 5 gap analyses per site per 24 hours */
const MAX_DAILY_ANALYSES_PER_SITE = 5;

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
  if (!siteId || !/^[a-f\d]{24}$/i.test(String(siteId))) {
    res.status(400).json({ success: false, error: 'Invalid siteId' });
    return null;
  }

  const site = await Site.findById(siteId);
  if (!site) {
    res.status(404).json({ success: false, error: 'Site not found' });
    return null;
  }
  const workspace = await requireMembership(site.workspaceId, userId, res);
  if (!workspace) return null;
  return site;
}

async function requireCompetitorAccess(competitorId, userId, res) {
  const comp = await Competitor.findById(competitorId);
  if (!comp) {
    res.status(404).json({ success: false, error: 'Competitor not found' });
    return null;
  }
  // Verify the user has access to the site this competitor belongs to
  const site = await requireSiteAccess(comp.siteId, userId, res);
  if (!site) return null;
  return { competitor: comp, site };
}

// ── Async gap analysis runner ─────────────────────────────────────────────────

async function runGapAnalysisAsync(reportId, competitorId, siteId, userDomain, compDomain) {
  try {
    await ContentGapReport.findByIdAndUpdate(reportId, {
      status: 'running',
      startedAt: new Date(),
    });

    // ── 1. Get user's site content ────────────────────────────────────
    let userPages = [];

    // Try to reuse latest audit if recent (< 24h old)
    const latestAudit = await Audit.findOne({
      siteId,
      status: 'done',
      completedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).sort({ completedAt: -1 });

    if (latestAudit && latestAudit.results?.pagesCrawled?.length > 0) {
      // Re-crawl those pages to get content summaries (audit only stores metadata)

      for (const pageUrl of latestAudit.results.pagesCrawled.slice(0, 20)) {
        try {
          const axiosLib = require('axios');
          const cheerio = require('cheerio');
          const { data, status } = await axiosLib.get(pageUrl, {
            timeout: 10_000,
            headers: { 'User-Agent': 'SEO-OS-Audit/1.0' },
            maxContentLength: 2 * 1024 * 1024,
          });
          if (status >= 400) continue;
          const $ = cheerio.load(data);
          const title = $('title').first().text().trim();
          const headings = $('h1, h2, h3')
            .map((_, el) => $(el).text().trim())
            .get()
            .filter(Boolean);
          const excerpt = $('main, article, .content, #content, .post, .entry, body')
            .first()
            .text()
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 500);
          userPages.push({ url: pageUrl, title, headings, excerpt });
        } catch {
          /* skip page */
        }
        await new Promise((r) => setTimeout(r, 400)); // polite delay
      }
    }

    // If we couldn't reuse audit data, re-crawl user site
    if (userPages.length === 0) {
      const userCrawl = await competitorAgent.crawlCompetitor(userDomain);
      if (userCrawl.blocked) {
        throw new Error(`Your site ${userDomain} blocks crawling via robots.txt`);
      }
      userPages = userCrawl.pages;
    }

    // ── 2. Crawl competitor ───────────────────────────────────────────
    const compCrawl = await competitorAgent.crawlCompetitor(compDomain);
    if (compCrawl.blocked) {
      throw new Error(`Competitor ${compDomain} blocks crawling via robots.txt`);
    }
    const compPages = compCrawl.pages;

    if (compPages.length === 0) {
      throw new Error(`Could not crawl any pages from ${compDomain}`);
    }

    // ── 3. Update competitor lastCrawledAt ────────────────────────────
    await Competitor.findByIdAndUpdate(competitorId, { lastCrawledAt: new Date() });

    // ── 4. Run Groq gap analysis ──────────────────────────────────────
    const gaps = await competitorAgent.analyzeGaps(userPages, compPages, userDomain, compDomain);

    // ── 5. Save results ───────────────────────────────────────────────
    await ContentGapReport.findByIdAndUpdate(reportId, {
      status: 'done',
      completedAt: new Date(),
      generatedAt: new Date(),
      gaps,
    });

    console.log(`[GapAnalysis] ${reportId} completed — ${gaps.length} gaps found`);

    // ── Notification: competitor_analysis_complete ────────────────────────
    const site = await Site.findById(siteId).lean();
    if (site) {
      await createNotification(
        site.workspaceId.toString(),
        'competitor_analysis_complete',
        `Content gap analysis comparing ${userDomain} vs ${compDomain} complete — ${gaps.length} gaps found.`,
        site._id.toString(),
      );
    }
  } catch (err) {
    await ContentGapReport.findByIdAndUpdate(reportId, {
      status: 'failed',
      completedAt: new Date(),
      error: err.message ?? 'Unknown error',
    });
    console.error(`[GapAnalysis] ${reportId} failed:`, err.message);
  }
}

router.use(requireAuth);

// ── POST /api/competitors — Add a competitor ──────────────────────────────────
router.post('/', async (req, res) => {
  const { siteId, domain } = req.body;
  if (!siteId || !domain) {
    return res.status(400).json({ success: false, error: 'siteId and domain are required' });
  }

  const normalized = normalizeDomain(domain);
  if (!DOMAIN_RE.test(normalized)) {
    return res.status(400).json({ success: false, error: 'Invalid domain — provide a bare domain like example.com' });
  }

  try {
    const site = await requireSiteAccess(siteId, req.user.id, res);
    if (!site) return;

    // Don't add your own site as a competitor
    if (normalized === site.domain) {
      return res.status(400).json({ success: false, error: 'You cannot add your own site as a competitor' });
    }

    const existing = await Competitor.findOne({ siteId, domain: normalized });
    if (existing) {
      return res.status(409).json({ success: false, error: 'This competitor domain is already added' });
    }

    const competitor = await Competitor.create({
      workspaceId: site.workspaceId,
      siteId: site._id,
      domain: normalized,
    });

    res.status(201).json({ success: true, data: competitor });
  } catch (err) {
    console.error('[Competitors] create error:', err.stack || err);
    if (err.response) {
      console.error('[Competitors] create axios response:', err.response.status, err.response.data);
    }
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map((e) => e.message).join('; ');
      return res.status(400).json({ success: false, error: message || 'Validation failed' });
    }
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'This competitor domain is already added' });
    }
    res.status(500).json({ success: false, error: 'Failed to add competitor' });
  }
});

// ── GET /api/competitors?siteId= — List competitors ──────────────────────────
router.get('/', async (req, res) => {
  const { siteId } = req.query;
  if (!siteId) {
    return res.status(400).json({ success: false, error: 'siteId query param is required' });
  }

  try {
    const site = await requireSiteAccess(siteId, req.user.id, res);
    if (!site) return;

    const competitors = await Competitor.find({ siteId }).sort({ createdAt: -1 });
    res.json({ success: true, data: competitors });
  } catch (err) {
    console.error('[Competitors] list error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch competitors' });
  }
});

// ── POST /api/competitors/:id/analyze — Run gap analysis (async) ─────────────
router.post('/:id/analyze', async (req, res) => {
  try {
    const { competitor, site } = await requireCompetitorAccess(req.params.id, req.user.id, res);
    if (!competitor || !site) return;

    // ── Daily analysis cap ────────────────────────────────────────────
    // Count how many reports have been generated for this site in the last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReports = await ContentGapReport.countDocuments({
      siteId: site._id,
      createdAt: { $gte: twentyFourHoursAgo },
    });
    if (recentReports >= MAX_DAILY_ANALYSES_PER_SITE) {
      return res.status(429).json({
        success: false,
        error: `Daily analysis limit reached (${MAX_DAILY_ANALYSES_PER_SITE} per site per day). Please try again tomorrow.`,
      });
    }

    // Prevent stacking multiple running analyses on the same competitor
    const inProgress = await ContentGapReport.findOne({
      competitorId: competitor._id,
      status: { $in: ['queued', 'running'] },
    });
    if (inProgress) {
      return res.status(409).json({
        success: false,
        error: 'An analysis is already in progress for this competitor',
        data: { reportId: inProgress._id },
      });
    }

    const report = await ContentGapReport.create({
      siteId: site._id,
      competitorId: competitor._id,
    });

    // Respond immediately — fire-and-forget
    res.status(202).json({ success: true, data: { reportId: report._id } });

    runGapAnalysisAsync(report._id, competitor._id, site._id, site.domain, competitor.domain).catch(console.error);
  } catch (err) {
    console.error('[Competitors] analyze error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to start analysis' });
  }
});

// ── GET /api/competitors/:id/report/latest — Latest gap report ───────────────
router.get('/:id/report/latest', async (req, res) => {
  try {
    const { competitor } = await requireCompetitorAccess(req.params.id, req.user.id, res);
    if (!competitor) return;

    const report = await ContentGapReport.findOne({
      competitorId: competitor._id,
    }).sort({ createdAt: -1 });

    if (!report) {
      return res.status(404).json({ success: false, error: 'No analysis reports found for this competitor' });
    }

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('[Competitors] report latest error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
});

module.exports = router;
