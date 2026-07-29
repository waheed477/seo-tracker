/**
 * Audit timeout watchdog.
 *
 * Runs every minute via node-cron. Any audit that has been in 'running'
 * status for more than 5 minutes is assumed to have died mid-crawl
 * (e.g. container restart) and is marked 'failed' so the site isn't
 * permanently blocked from new audits.
 *
 * This is an in-process safety net — no Redis or external queue needed.
 */

const cron  = require('node-cron');
const Audit = require('../models/Audit');

const TIMEOUT_MINUTES = 5;

function startAuditTimeoutJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);
      const result = await Audit.updateMany(
        { status: 'running', startedAt: { $lt: cutoff } },
        {
          $set: {
            status:      'failed',
            completedAt: new Date(),
            error:       'Audit timed out — the crawl exceeded the 5-minute limit.',
          },
        },
      );
      if (result.modifiedCount > 0) {
        console.log(`[AuditTimeout] Marked ${result.modifiedCount} stuck audit(s) as failed`);
      }
    } catch (err) {
      console.error('[AuditTimeout] Cron error:', err.message);
    }
  });

  console.log('[AuditTimeout] Watchdog cron started (every 1 min, 5-min timeout)');
}

module.exports = { startAuditTimeoutJob };
