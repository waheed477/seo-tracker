require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
// In production (HF Spaces) this is the single exposed port.
// For local dev where the Vite frontend already occupies 5000,
// override with PORT=5001 in .env — the spec default is 5000.
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

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
  console.warn('[WARN] MONGO_URI is not set — MongoDB will not connect. Set it in .env to enable persistence.');
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('[MongoDB] Connected successfully'))
    .catch((err) => console.error('[MongoDB] Connection error:', err.message));

  mongoose.connection.on('disconnected', () =>
    console.warn('[MongoDB] Disconnected'));
  mongoose.connection.on('reconnected', () =>
    console.log('[MongoDB] Reconnected'));
}

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] SEO Operating System backend running on port ${PORT}`);
});

module.exports = app;
