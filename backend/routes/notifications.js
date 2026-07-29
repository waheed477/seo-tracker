/**
 * Notification routes
 *
 * GET  /api/notifications?workspaceId=... — list, most recent first
 * PATCH /api/notifications/:id/read        — mark one as read
 * PATCH /api/notifications/read-all        — mark all in workspace as read
 */

const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Workspace = require('../models/Workspace');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ── Verify workspace membership ──────────────────────────────────────────────
async function requireMembership(workspaceId, userId, res) {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    res.status(400).json({ success: false, error: 'Invalid workspaceId' });
    return null;
  }
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    res.status(404).json({ success: false, error: 'Workspace not found' });
    return null;
  }
  const isMember = workspace.members.some((m) => m.userId.toString() === userId);
  if (!isMember) {
    res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    return null;
  }
  return workspace;
}

router.use(requireAuth);

// ── GET /api/notifications?workspaceId=... ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'workspaceId query param is required' });
    }

    const workspace = await requireMembership(workspaceId, req.user.id, res);
    if (!workspace) return;

    const notifications = await Notification.find({ workspaceId }).sort({ createdAt: -1 }).lean();

    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('[Notifications] list error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch('/:id/read', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid notification ID' });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    // Verify the user is a member of the notification's workspace
    const workspace = await requireMembership(notification.workspaceId.toString(), req.user.id, res);
    if (!workspace) return;

    notification.read = true;
    await notification.save();

    res.json({ success: true, data: notification.toObject() });
  } catch (err) {
    console.error('[Notifications] read error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
router.patch('/read-all', async (req, res) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'workspaceId is required in body' });
    }

    const workspace = await requireMembership(workspaceId, req.user.id, res);
    if (!workspace) return;

    await Notification.updateMany({ workspaceId, read: false }, { read: true });

    res.json({ success: true, data: { updated: true } });
  } catch (err) {
    console.error('[Notifications] read-all error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
});

module.exports = router;
