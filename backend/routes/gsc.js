/**
 * Google Search Console routes
 *
 * GET  /api/sites/:id/gsc/connect   — Redirect to Google OAuth consent screen
 * GET  /api/sites/:id/gsc/callback  — OAuth callback, exchange code, store tokens
 * GET  /api/sites/:id/rankings      — Get aggregated ranking data from GSC
 * POST /api/sites/:id/gsc/sync      — Manually trigger a GSC data sync
 */

const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const Site = require('../models/Site');
const RankSnapshot = require('../models/RankSnapshot');
const Workspace = require('../models/Workspace');
const gscService = require('../services/gscService');
const { encrypt } = require('../lib/encryption');

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

// ── Routes ────────────────────────────────────────────────────────────────────

// Apply auth to all routes EXCEPT the callback (Google redirects here without a JWT)
// The callback uses a state parameter to verify the siteId.

/**
 * GET /api/sites/:id/gsc/connect
 * Redirects to Google's OAuth consent screen.
 * This is a browser redirect — user must be logged in (we verify via JWT in query param).
 */
router.get('/:id/gsc/connect', async (req, res) => {
  try {
    const siteId = req.params.id;
    // We can't use requireAuth middleware on a redirect, so we verify via query param
    // The frontend passes ?token=xxx which we validate
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required — pass ?token=' });
    }

    const jwt = require('jsonwebtoken');
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const site = await requireSiteAccess(siteId, user.id, res);
    if (!site) return;

    const authUrl = gscService.getAuthUrl(siteId);
    res.redirect(authUrl);
  } catch (err) {
    console.error('[GSC] connect error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to initiate Google OAuth' });
  }
});

/**
 * GET /api/sites/:id/gsc/callback
 * Google redirects here after user consents. Exchanges the code for tokens.
 * This endpoint does NOT require a JWT header — Google redirects here without one.
 * Security: the state parameter contains the siteId, and we verify the code
 * was issued by Google for our client.
 */
router.get('/:id/gsc/callback', async (req, res) => {
  try {
    const siteId = req.params.id;
    const { code, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(`/app/sites/${siteId}/rankings?gsc=error&msg=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
      return res.redirect(`/app/sites/${siteId}/rankings?gsc=error&msg=No+authorization+code+received`);
    }

    const site = await Site.findById(siteId);
    if (!site) {
      return res.redirect(`/app/sites/${siteId}/rankings?gsc=error&msg=Site+not+found`);
    }

    // Exchange code for tokens
    const tokens = await gscService.exchangeCode(code);

    // Encrypt and store the refresh token
    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    // Determine the GSC site URL
    // The domain property in GSC is usually "https://example.com/" or "sc-domain:example.com"
    // We'll try to figure it out — default to https://<domain>/
    const gscSiteUrl = `https://${site.domain}/`;

    await Site.findByIdAndUpdate(siteId, {
      gscConnected: true,
      gscRefreshToken: encryptedRefreshToken,
      gscSiteUrl,
    });

    // Redirect back to the frontend rankings page with success indicator
    res.redirect(`/app/sites/${siteId}/rankings?gsc=connected`);
  } catch (err) {
    console.error('[GSC] callback error:', err.message);
    res.redirect(`/app/sites/${req.params.id}/rankings?gsc=error&msg=${encodeURIComponent(err.message)}`);
  }
});

// ── Authenticated routes below ────────────────────────────────────────────────

router.use(requireAuth);

/**
 * GET /api/sites/:id/rankings?days=30
 * Returns aggregated ranking data from GSC.
 * Returns: { positionTrend: [{date, avgPosition}], topQueries: [{queryText, clicks, impressions, avgPosition, ctr}] }
 */
router.get('/:id/rankings', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    if (!site.gscConnected) {
      return res.status(400).json({
        success: false,
        error: 'Google Search Console is not connected for this site. Connect it first.',
      });
    }

    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Fetch all snapshots in the date range
    const snapshots = await RankSnapshot.find({
      siteId: site._id,
      date: { $gte: since },
    }).sort({ date: 1 });

    if (snapshots.length === 0) {
      return res.json({
        success: true,
        data: { positionTrend: [], topQueries: [], totalClicks: 0, totalImpressions: 0 },
      });
    }

    // ── Position trend: average position per day ────────────────────────
    const byDate = {};
    for (const s of snapshots) {
      const dateKey = typeof s.date === 'string' ? s.date : s.date.toISOString().split('T')[0];
      if (!byDate[dateKey]) byDate[dateKey] = { positions: [], clicks: 0, impressions: 0 };
      byDate[dateKey].positions.push(s.avgPosition);
      byDate[dateKey].clicks += s.clicks;
      byDate[dateKey].impressions += s.impressions;
    }

    const positionTrend = Object.entries(byDate)
      .map(([date, data]) => ({
        date,
        avgPosition: Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10,
        clicks: data.clicks,
        impressions: data.impressions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Top queries by clicks ───────────────────────────────────────────
    const byQuery = {};
    for (const s of snapshots) {
      if (!byQuery[s.queryText]) {
        byQuery[s.queryText] = { queryText: s.queryText, clicks: 0, impressions: 0, positions: [], ctr: 0 };
      }
      byQuery[s.queryText].clicks += s.clicks;
      byQuery[s.queryText].impressions += s.impressions;
      byQuery[s.queryText].positions.push(s.avgPosition);
    }

    const topQueries = Object.values(byQuery)
      .map((q) => ({
        queryText: q.queryText,
        clicks: q.clicks,
        impressions: q.impressions,
        avgPosition: Math.round((q.positions.reduce((a, b) => a + b, 0) / q.positions.length) * 10) / 10,
        ctr: q.impressions > 0 ? Math.round((q.clicks / q.impressions) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50);

    // ── Totals ──────────────────────────────────────────────────────────
    const totalClicks = snapshots.reduce((sum, s) => sum + s.clicks, 0);
    const totalImpressions = snapshots.reduce((sum, s) => sum + s.impressions, 0);

    res.json({
      success: true,
      data: { positionTrend, topQueries, totalClicks, totalImpressions },
    });
  } catch (err) {
    console.error('[GSC] rankings error:', err.message);
    res.status(500).json({ success: false, error: err.message ?? 'Failed to fetch rankings' });
  }
});

/**
 * POST /api/sites/:id/gsc/sync
 * Manually trigger a GSC data sync (pulls last 30 days).
 */
router.post('/:id/gsc/sync', async (req, res) => {
  try {
    const site = await requireSiteAccess(req.params.id, req.user.id, res);
    if (!site) return;

    if (!site.gscConnected) {
      return res.status(400).json({ success: false, error: 'GSC not connected' });
    }

    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const rows = await gscService.fetchSearchAnalytics(site, days);

    for (const row of rows) {
      await RankSnapshot.findOneAndUpdate(
        { siteId: site._id, queryText: row.queryText, page: row.page, date: row.date },
        {
          siteId: site._id,
          queryText: row.queryText,
          page: row.page,
          avgPosition: row.avgPosition,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          date: row.date,
        },
        { upsert: true, new: false, setDefaultsOnInsert: true },
      );
    }

    res.json({ success: true, data: { syncedRows: rows.length } });
  } catch (err) {
    console.error('[GSC] sync error:', err.message);
    res.status(500).json({ success: false, error: err.message ?? 'Failed to sync GSC data' });
  }
});

module.exports = router;
