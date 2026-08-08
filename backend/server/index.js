require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { startAuditTimeoutJob } = require('../jobs/auditTimeout');
const { startGscDailySyncJob } = require('../jobs/gscDailySync');
const { sweepStuckJobs } = require('../jobs/startupSweep');
const { startPasswordResetCleanupJob } = require('../jobs/passwordResetCleanup');
const { startRefreshTokenCleanupJob } = require('../jobs/refreshTokenCleanup');

// ── Validate required environment variables FIRST ────────────────────────────
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'GROQ_API_KEY', 'SITE_ENCRYPTION_KEY', 'RESEND_API_KEY'];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(
    `[ERROR] Required environment variables not set: ${missingEnvVars.join(', ')}. ` +
      'Copy backend/.env.example to backend/.env and fill in the values.',
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ────────────────────────────────────────────────────────────────

// CORS: explicit allowed origin — no wildcard '*', even as a fallback.
// FRONTEND_URL must be set in production. During local dev it defaults
// to http://localhost:5000 so the Vite proxy works.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
app.use(
  cors({
    origin: FRONTEND_URL.split(',').map((s) => s.trim()), // supports comma-separated list
    credentials: true,
  }),
);

// ── Stripe webhook route — MUST be mounted BEFORE express.json() ──────────────
// The webhook handler needs the raw request body to verify Stripe's signature.
app.use('/api/webhooks', require('../routes/webhooks'));

app.use(express.json());
app.use(cookieParser());

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('../routes/auth'));
app.use('/api/workspaces', require('../routes/workspaces'));
app.use('/api/competitors', require('../routes/competitors'));
app.use('/api/sites', require('../routes/gsc'));
app.use('/api/sites', require('../routes/sites'));
app.use('/api/gsc', require('../routes/gscCallback'));
app.use('/api/sites', require('../routes/actionPlans'));
app.use('/api/notifications', require('../routes/notifications'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ── Serve frontend static files in production ─────────────────────────────────
// When NODE_ENV=production, the Docker container places the Vite build output
// at /app/frontend/dist/. Express serves these as static files and falls back
// to index.html for SPA client-side routing (React Router v6).
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));

  // SPA fallback — any non-API route returns index.html so React Router can handle it
  // Using '/*splat' instead of '*' — required for Express 5 / path-to-regexp v6+
  app.get('/*splat', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ── MongoDB connection ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected');
  // In production, a lost connection is fatal — exit so the orchestrator can restart.
  if (process.env.NODE_ENV === 'production') {
    console.error('[MongoDB] Lost connection in production — exiting for restart.');
    process.exit(1);
  }
});
mongoose.connection.on('reconnected', () => console.log('[MongoDB] Reconnected'));

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('[MongoDB] Connected');
    // Sweep any stuck 'running' jobs from a previous container crash
    await sweepStuckJobs();
    startAuditTimeoutJob();
    startGscDailySyncJob();
    startPasswordResetCleanupJob();
    startRefreshTokenCleanupJob();

    // ── Start server AFTER successful DB connection ─────────────────────────
    // Bind to 0.0.0.0 so the server is reachable from outside the container
    // (required for Hugging Face Spaces and any containerised deployment).
    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[Server] SEO Operating System — 0.0.0.0:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`,
      );
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Connection error:', err.message);
    console.error('[MongoDB] The server cannot start without a database connection. Exiting.');
    process.exit(1);
  });

module.exports = app;
