/**
 * Google Search Console routes
 *
 * GET  /api/sites/:id/gsc/connect   — Redirect to Google OAuth consent screen
 * GET  /api/sites/:id/rankings      — Get aggregated ranking data from GSC
 * POST /api/sites/:id/gsc/sync      — Manually trigger a GSC data sync
 *
 * NOTE: the OAuth callback is NOT here — Google requires ONE fixed, pre-registered
 * redirect URI with no dynamic path segment, so the callback lives at the
 * site-agnostic route GET /api/gsc/callback (see routes/gscCallback.js). The
 * connect route below encodes the siteId into a signed `state` param so the
 * callback can recover it.
 */

const router = require('express').Router();
const jwt = require('jsonwebtoken');
const requireAuth = require('../middleware/auth');
const Site = require('../models/Site');
const RankSnapshot = require('../models/RankSnapshot');
const Workspace = require('../models/Workspace');
const gscService = require('../services/gscService');

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

// The connect route below is a browser redirect (verified via ?token=). All
// other routes require a JWT header (requireAuth is applied further down).

/**
 * GET /api/sites/:id/gsc/connect
 * Redirects to Google's OAuth consent screen.
 * This is a browser redirect — user must be logged in (we verify via JWT in query param).
 *
 * The siteId is encoded into a signed, short-lived `state` token so the fixed
 * callback route (/api/gsc/callback) can recover it without a path param.
 */
router.get('/:id/gsc/connect', async (req, res) => {
  try {
    const siteId = req.params.id;
    // We can't use requireAuth middleware on a browser redirect, so we verify via query param or cookie.
    // Support req.cookies.accessToken as the primary method, with fallbacks.
    const cookieToken = req.cookies?.accessToken;
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;
    const token = cookieToken || queryToken || headerToken;
    console.log('[GSC] connect selected token:', token ? `${token.slice(0, 20)}... (len=${token.length})` : '(none)');

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required — pass ?token=' });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const site = await requireSiteAccess(siteId, user.id, res);
    if (!site) return;

    // Sign a short-lived state token carrying the siteId. Google returns this
    // verbatim to the callback, which verifies the signature before trusting it.
    const state = jwt.sign({ siteId, purpose: 'gsc_oauth' }, process.env.JWT_SECRET, { expiresIn: '10m' });

    const authUrl = gscService.getAuthUrl(state);
    res.redirect(authUrl);
  } catch (err) {
    console.error('[GSC] connect error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to initiate Google OAuth' });
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
    if (err.name === 'GscError' || (err.code && err.code.startsWith('GSC_'))) {
      const statusCode = err.code === 'GSC_PROPERTY_NOT_VERIFIED' ? 403 
                       : err.code === 'GSC_TOKEN_EXPIRED_OR_REVOKED' ? 401 
                       : 500;
      return res.status(statusCode).json({
        success: false,
        error: err.code,
        message: err.message,
      });
    }
    res.status(500).json({ success: false, error: 'GENERIC_ERROR', message: err.message ?? 'Failed to sync GSC data' });
  }
});

module.exports = router;
