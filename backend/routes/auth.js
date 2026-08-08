const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const requireAuth = require('../middleware/auth');
const { createPasswordReset, consumePasswordResetToken } = require('../services/passwordResetService');
const { sendPasswordResetEmail } = require('../services/emailService');

const BCRYPT_ROUNDS = 12;

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15m — matches the JWT's own expiry
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30d

/**
 * Path the refresh cookie is scoped to.
 *
 * A browser only sends a cookie to request paths at or below its Path
 * attribute (RFC 6265 path-match). This is deliberately the auth router and
 * NOT '/api/auth/refresh': the narrower path keeps the 30-day token off every
 * unrelated API call, but still covers BOTH /api/auth/refresh and
 * /api/auth/logout — logout needs the cookie to revoke the token server-side.
 */
const REFRESH_COOKIE_PATH = '/api/auth';

/** Pre-existing sessions have a cookie at the old, narrower path. Browsers send
 *  the more specific path first, so it must be cleared explicitly or a stale
 *  token would shadow the current one. */
const LEGACY_REFRESH_COOKIE_PATH = '/api/auth/refresh';

/**
 * Attributes shared by both auth cookies. `res.cookie` and `res.clearCookie`
 * must agree on path/sameSite/secure or the browser silently keeps the old
 * cookie, so every call site goes through here.
 */
function cookieAttributes(path) {
  // Cross-site (frontend on a different registrable domain than the API, e.g.
  // Netlify frontend + hf.space backend) requires SameSite=None, which browsers
  // only accept alongside Secure. Default 'lax' keeps http://localhost working.
  const crossSite = process.env.COOKIE_CROSS_SITE === 'true';
  return {
    httpOnly: true,
    sameSite: crossSite ? 'none' : 'lax',
    secure: crossSite || process.env.NODE_ENV === 'production',
    path,
  };
}

const accessCookieAttributes = () => cookieAttributes('/');
const refreshCookieAttributes = () => cookieAttributes(REFRESH_COOKIE_PATH);

/** Expire both auth cookies in the browser. Used by logout and by any path
 *  that determines the session is unrecoverable. */
function clearAuthCookies(res) {
  res.clearCookie('accessToken', accessCookieAttributes());
  res.clearCookie('refreshToken', refreshCookieAttributes());
  res.clearCookie('refreshToken', cookieAttributes(LEGACY_REFRESH_COOKIE_PATH));
}

function signAccessToken(user) {
  return jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function safeUser(user) {
  return { id: user._id, email: user.email, name: user.name };
}

async function issueTokens(res, user) {
  const accessToken = signAccessToken(user);
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
  });

  res.cookie('accessToken', accessToken, { ...accessCookieAttributes(), maxAge: ACCESS_TOKEN_MAX_AGE });
  res.cookie('refreshToken', rawRefreshToken, { ...refreshCookieAttributes(), maxAge: REFRESH_TOKEN_MAX_AGE });

  return accessToken;
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  // Return the current access token alongside user info so the frontend
  // can re-hydrate its in-memory token store (Zustand) on page refresh.
  const token = req.cookies?.accessToken ?? req.headers.authorization?.slice(7) ?? null;
  // BILLING_ENABLED defaults to true if unset. Set to 'false' in Render env vars
  // to temporarily disable billing/upgrade flow (e.g. while Stripe is being configured).
  const billingEnabled = process.env.BILLING_ENABLED !== 'false';
  res.json({ success: true, data: { user: { id: req.user.id, email: req.user.email, name: req.user.name }, token, billingEnabled } });
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ success: false, error: 'email, password, and name are required' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'name cannot be blank' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
    });
    
    const token = await issueTokens(res, user);
    res.status(201).json({ success: true, data: { token, user: safeUser(user) } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
    console.error('[Auth] register error:', err.message);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    const token = await issueTokens(res, user);
    res.json({ success: true, data: { token, user: safeUser(user) } });
  } catch (err) {
    console.error('[Auth] login error:', err.message);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (!refreshToken) {
    return res.status(401).json({ success: false, error: 'No refresh token provided' });
  }

  try {
    // Find matching tokens, check all valid candidates
    const tokens = await RefreshToken.find({ 
      revoked: false, 
      expiresAt: { $gt: new Date() } 
    }).populate('userId');

    let matchedToken = null;
    for (const doc of tokens) {
      if (await bcrypt.compare(refreshToken, doc.tokenHash)) {
        matchedToken = doc;
        break;
      }
    }

    if (!matchedToken) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    // Revoke old token
    matchedToken.revoked = true;
    await matchedToken.save();

    // Issue new tokens
    const user = matchedToken.userId;
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const token = await issueTokens(res, user);
    res.json({ success: true, data: { token, user: safeUser(user) } });

  } catch (err) {
    console.error('[Auth] refresh error:', err.message);
    res.status(500).json({ success: false, error: 'Refresh failed' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (refreshToken) {
    try {
      const tokens = await RefreshToken.find({ revoked: false });
      for (const doc of tokens) {
        if (await bcrypt.compare(refreshToken, doc.tokenHash)) {
          doc.revoked = true;
          await doc.save();
          break;
        }
      }
    } catch (err) {
      console.error('[Auth] logout error revoking token:', err.message);
    }
  }

  clearAuthCookies(res);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'email is required' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      const token = await createPasswordReset(user._id);
      await sendPasswordResetEmail(normalizedEmail, token);
    }

    return res.json({ success: true, data: { message: 'If an account exists for that email, reset instructions have been sent.' } });
  } catch (err) {
    console.error('[Auth] forgot-password error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not process password reset request' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || typeof token !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'token and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }

  try {
    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Invalid or expired password reset token' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.findByIdAndUpdate(userId, { passwordHash }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const authToken = await issueTokens(res, user);
    return res.json({ success: true, data: { token: authToken, user: safeUser(user) } });
  } catch (err) {
    console.error('[Auth] reset-password error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not reset password' });
  }
});

module.exports = router;
