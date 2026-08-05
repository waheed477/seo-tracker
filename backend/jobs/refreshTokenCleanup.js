const cron = require('node-cron');
const RefreshToken = require('../models/RefreshToken');

function startRefreshTokenCleanupJob() {
  // Run every day at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[RefreshTokenCleanup] Starting daily cleanup');
      const now = new Date();
      
      // Delete tokens that are expired
      const expiredResult = await RefreshToken.deleteMany({ expiresAt: { $lt: now } });
      
      // Delete tokens that were revoked more than 7 days ago 
      // (we keep them briefly to track potential abuse or replay, but 7 days is plenty)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const revokedResult = await RefreshToken.deleteMany({ 
        revoked: true, 
        createdAt: { $lt: sevenDaysAgo } 
      });

      console.log(`[RefreshTokenCleanup] Deleted ${expiredResult.deletedCount} expired and ${revokedResult.deletedCount} old revoked tokens.`);
    } catch (err) {
      console.error('[RefreshTokenCleanup] Error during cleanup:', err.message);
    }
  });
  console.log('[RefreshTokenCleanup] Scheduled (daily at 3 AM)');
}

module.exports = { startRefreshTokenCleanupJob };
