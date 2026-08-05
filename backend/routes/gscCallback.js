/**
 * Google Search Console OAuth callback — SINGLE FIXED redirect URI.
 *
 * Mounted at GET /api/gsc/callback (no siteId in the path). Google OAuth
 * requires ONE exact, pre-registered redirect URI and does not allow a dynamic
 * path segment, so the site is carried through the signed `state` parameter
 * that /api/sites/:id/gsc/connect produced.
 *
 * This endpoint does NOT require a JWT header — Google redirects the browser
 * here without one. Trust comes entirely from verifying the signed `state`.
 */

const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Site = require('../models/Site');
const gscService = require('../services/gscService');
const { encrypt } = require('../lib/encryption');

// Frontend origin to redirect the browser back to after the flow. FRONTEND_URL
// may be a comma-separated allow-list; use the first entry as the canonical origin.
function frontendBase() {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5000';
  return raw.split(',')[0].trim().replace(/\/$/, '');
}

/**
 * GET /api/gsc/callback
 * Query params (from Google): `code` + `state`, OR `error` (e.g. user denied consent).
 */
router.get('/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  // ── 1. Verify the signed state BEFORE anything else ─────────────────────────
  // If the state is missing, tampered with, or expired we must NOT attempt a
  // token exchange — we don't even know which site this is for.
  if (!state) {
    return res.status(400).json({ success: false, error: 'Missing OAuth state parameter' });
  }

  let siteId;
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    if (decoded.purpose !== 'gsc_oauth' || !decoded.siteId) {
      throw new Error('State is not a valid GSC OAuth token');
    }
    siteId = decoded.siteId;
  } catch (err) {
    console.error('[GSC] callback state verification failed:', err.message);
    return res.status(400).json({ success: false, error: 'Invalid or expired OAuth state parameter' });
  }

  // State is trustworthy from here on — siteId is safe to use for redirects.
  const rankingsUrl = (query) => `${frontendBase()}/app/sites/${siteId}/rankings?${query}`;

  try {
    // ── 2. Handle Google's own error cases (e.g. user denied consent) ─────────
    if (oauthError) {
      return res.redirect(rankingsUrl(`gsc=error&msg=${encodeURIComponent(oauthError)}`));
    }

    if (!code) {
      return res.redirect(rankingsUrl('gsc=error&msg=No+authorization+code+received'));
    }

    const site = await Site.findById(siteId);
    if (!site) {
      return res.redirect(rankingsUrl('gsc=error&msg=Site+not+found'));
    }

    // ── 3. Exchange the code for tokens and store the encrypted refresh token ─
    const tokens = await gscService.exchangeCode(code);
    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    // The domain property in GSC is usually "https://example.com/" — default to https://<domain>/
    const gscSiteUrl = `https://${site.domain}/`;

    await Site.findByIdAndUpdate(siteId, {
      gscConnected: true,
      gscRefreshToken: encryptedRefreshToken,
      gscSiteUrl,
    });

    // ── 4. Redirect back to the frontend rankings page with a success flag ────
    return res.redirect(rankingsUrl('gsc=connected'));
  } catch (err) {
    console.error('[GSC] callback error:', err.message);
    return res.redirect(rankingsUrl(`gsc=error&msg=${encodeURIComponent(err.message)}`));
  }
});

module.exports = router;
