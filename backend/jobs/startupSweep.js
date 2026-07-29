/**
 * Startup sweep — marks any jobs that were left in 'running' status
 * when the previous container/process died. This runs ONCE at boot
 * before the periodic cron watchdog takes over.
 *
 * Unlike the cron watchdog (which uses a 5-minute cutoff to avoid
 * killing genuinely-running jobs), the startup sweep marks ALL running
 * jobs as failed immediately. On boot we know with certainty that the
 * previous process is gone — any in-progress job is stuck.
 *
 * Without this, a container restart could leave jobs stuck in 'running'
 * for up to 5 minutes (until the first cron tick catches them).
 */

const Audit = require('../models/Audit');
const ContentGapReport = require('../models/ContentGapReport');
const ActionPlan = require('../models/ActionPlan');

async function sweepStuckJobs() {
  try {
    const msg = 'Job interrupted — server restarted while this job was running.';

    // No cutoff — on boot, every 'running' job is definitely stuck.
    // The 5-minute cutoff is only for the cron watchdog which runs
    // continuously alongside live jobs.
    const auditResult = await Audit.updateMany(
      { status: 'running' },
      { $set: { status: 'failed', completedAt: new Date(), error: msg } },
    );

    const reportResult = await ContentGapReport.updateMany(
      { status: 'running' },
      { $set: { status: 'failed', completedAt: new Date(), error: msg } },
    );

    const planResult = await ActionPlan.updateMany(
      { status: 'running' },
      { $set: { status: 'failed', completedAt: new Date(), error: msg } },
    );

    const total = auditResult.modifiedCount + reportResult.modifiedCount + planResult.modifiedCount;
    if (total > 0) {
      console.log(`[StartupSweep] Marked ${total} stuck job(s) as failed (server restart recovery)`);
    }
  } catch (err) {
    console.error('[StartupSweep] Error:', err.message);
  }
}

module.exports = { sweepStuckJobs };
