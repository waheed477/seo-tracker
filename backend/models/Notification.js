const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'audit_complete',
  'action_plan_ready',
  'gsc_sync_error',
  'competitor_analysis_complete',
  'plan_upgraded',
  'plan_downgraded',
  'payment_failed',
];

const notificationSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  relatedSiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index — auto-delete after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Efficient query: by workspace, read status, newest first
notificationSchema.index({ workspaceId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
