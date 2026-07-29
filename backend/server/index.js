require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');

const { startAuditTimeoutJob } = require('../jobs/auditTimeout');

const app  = express();
// In production (HF Spaces) this is the single exposed port.
// For local dev where the Vite frontend already occupies 5000,
// override with PORT=5001 in .env — the spec default is 5000.
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('../routes/auth'));
app.use('/api/workspaces', require('../routes/workspaces'));
app.use('/api/sites',      require('../routes/sites'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ── MongoDB connection ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.warn('[WARN] MONGO_URI is not set — all DB operations will fail. Set it in Replit Secrets.');
} else {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('[MongoDB] Connected');
      // Start background jobs only after DB is ready
      startAuditTimeoutJob();
    })
    .catch(err => console.error('[MongoDB] Connection error:', err.message));

  mongoose.connection.on('disconnected', () => console.warn('[MongoDB] Disconnected'));
  mongoose.connection.on('reconnected',  () => console.log('[MongoDB] Reconnected'));
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] SEO Operating System backend — port ${PORT}`);
});

module.exports = app;
