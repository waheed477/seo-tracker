const cron = require('node-cron');
const { cleanupExpiredPasswordResets } = require('../services/passwordResetService');

function startPasswordResetCleanupJob() {
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await cleanupExpiredPasswordResets();
      if (result.deletedCount > 0) {
        console.log(`[PasswordResetCleanup] Removed ${result.deletedCount} expired password reset record(s)`);
      }
    } catch (err) {
      console.error('[PasswordResetCleanup] Cron error:', err.message);
    }
  });

  console.log('[PasswordResetCleanup] Started (hourly cleanup)');
}

module.exports = { startPasswordResetCleanupJob };
