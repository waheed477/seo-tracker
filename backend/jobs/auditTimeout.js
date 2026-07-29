/**
 * Timeout watchdog for all async jobs.
 *
 * Runs every minute via node-cron. Any Audit, ContentGapReport, or
 * ActionPlan that has been in 'running' status for more than 5 minutes
 * is assumed to have died mid-crawl and is marked 'failed'.
 *
 * This is an in-process safety net — no Redis or external queue needed.
 */

const cron = require('node-cron');
const Audit = require('../models/Audit');
const ContentGapReport = require('../models/ContentGapReport');
const ActionPlan = require('../models/ActionPlan');

const TIMEOUT_MINUTES = 5;

function startAuditTimeoutJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

      // ── Audits ────────────────────────────────────────────────────
      const auditResult = await Audit.updateMany(
        { status: 'running', startedAt: { $lt: cutoff } },
        { $set: { status: 'failed', completedAt: new Date(), error: 'Timed out — exceeded the 5-minute limit.' } },
      );
      if (auditResult.modifiedCount > 0) {
        console.log(`[Watchdog] Marked ${auditResult.modifiedCount} stuck audit(s) as failed`);
      }

      // ── Gap Analysis Reports ──────────────────────────────────────
      const reportResult = await ContentGapReport.updateMany(
        { status: 'running', startedAt: { $lt: cutoff } },
        { $set: { status: 'failed', completedAt: new Date(), error: 'Timed out — exceeded the 5-minute limit.' } },
      );
      if (reportResult.modifiedCount > 0) {
        console.log(`[Watchdog] Marked ${reportResult.modifiedCount} stuck gap report(s) as failed`);
      }

      // ── Action Plans ──────────────────────────────────────────────
      const planResult = await ActionPlan.updateMany(
        { status: 'running', startedAt: { $lt: cutoff } },
        { $set: { status: 'failed', completedAt: new Date(), error: 'Timed out — exceeded the 5-minute limit.' } },
      );
      if (planResult.modifiedCount > 0) {
        console.log(`[Watchdog] Marked ${planResult.modifiedCount} stuck action plan(s) as failed`);
      }
    } catch (err) {
      console.error('[Watchdog] Cron error:', err.message);
    }
  });

  console.log('[Watchdog] Started (every 1 min, 5-min timeout for audits + gap reports + action plans)');
}

module.exports = { startAuditTimeoutJob };
