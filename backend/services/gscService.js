/**
 * Google Search Console Service
 *
 * Handles OAuth2 token management and Search Analytics data retrieval.
 * Uses the official Google Search Console API — NO SERP scraping.
 *
 * Refresh tokens are stored AES-encrypted in the Site model
 * (never plaintext). Access tokens are short-lived and never stored.
 */

const axios = require('axios');
const { decrypt } = require('../lib/encryption');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';

// ── OAuth helpers ─────────────────────────────────────────────────────────────

/**
 * Build the Google OAuth consent URL for a site.
 * Requests readonly scope for Search Console.
 */
function getAuthUrl(siteId) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    access_type: 'offline', // to get a refresh token
    prompt: 'consent', // force consent to always get a new refresh token
    state: siteId, // pass siteId through so callback knows which site
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange an OAuth code for access + refresh tokens.
 * Returns { accessToken, refreshToken } (refresh token is NOT encrypted here;
 * encryption happens in the route handler before storing).
 */
async function exchangeCode(code) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth env vars not configured');
  }

  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    },
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30_000,
    },
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in,
  };
}

/**
 * Refresh an access token from the stored encrypted refresh token.
 * Returns a fresh access token string.
 */
async function refreshAccessToken(site) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth env vars not configured');
  }

  if (!site.gscRefreshToken) {
    throw new Error('No refresh token stored for this site');
  }

  const refreshToken = decrypt(site.gscRefreshToken);

  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    },
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30_000,
    },
  );

  return response.data.access_token;
}

// ── Search Analytics ──────────────────────────────────────────────────────────

/**
 * Pull Search Analytics data from Google Search Console.
 *
 * @param {object} site - Site mongoose doc (must have gscConnected=true, gscSiteUrl, gscRefreshToken)
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Promise<{queryText, page, avgPosition, clicks, impressions, ctr, date}[]>}
 */
async function fetchSearchAnalytics(site, days = 30) {
  if (!site.gscConnected) throw new Error('GSC not connected for this site');
  if (!site.gscSiteUrl) throw new Error('No GSC site URL configured');

  const accessToken = await refreshAccessToken(site);

  const endDate = new Date(); // today
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // GSC data is typically 2-3 days behind, so we query up to 3 days ago
  endDate.setDate(endDate.getDate() - 3);
  startDate.setDate(startDate.getDate() - 3);

  const formatDate = (d) => d.toISOString().split('T')[0];

  const response = await axios.post(
    `${GSC_API_BASE}/sites/${encodeURIComponent(site.gscSiteUrl)}/searchAnalytics/query`,
    {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ['query', 'page'],
      type: 'web',
      rowLimit: 1000,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    },
  );

  const rows = response.data.rows ?? [];
  return rows.map((row) => ({
    queryText: row.keys[0],
    page: row.keys[1],
    avgPosition: Math.round(row.position * 10) / 10,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 10000, // store as decimal (0.05 = 5%)
    date: formatDate(endDate), // use end date as the snapshot date
  }));
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  refreshAccessToken,
  fetchSearchAnalytics,
};
