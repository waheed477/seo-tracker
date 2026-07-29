const Notification = require('../models/Notification');

/**
 * Create a workspace-scoped notification.
 * All workspace members see it.
 * @param {string} workspaceId
 * @param {string} type — one of: audit_complete, action_plan_ready, gsc_sync_error, competitor_analysis_complete
 * @param {string} message
 * @param {string|null} relatedSiteId
 */
async function createNotification(workspaceId, type, message, relatedSiteId = null) {
  try {
    await Notification.create({ workspaceId, type, message, relatedSiteId });
  } catch (err) {
    console.error('[Notify] Failed to create notification:', err.message);
  }
}

module.exports = { createNotification };
