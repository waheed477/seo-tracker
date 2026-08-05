/**
 * Testable Express app — identical to server/index.js but WITHOUT
 * the app.listen() call and the MongoDB auto-connect. Integration
 * tests use supertest which needs the app object but handles its own
 * server lifecycle. MongoDB connection is managed by the test setup
 * in tests/setup.js (using mongodb-memory-server).
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

app.use(
  cors({
    origin: FRONTEND_URL.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);

// ── Stripe webhook route — MUST be mounted BEFORE express.json() ──────────────
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
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
