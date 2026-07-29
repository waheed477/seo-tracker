const router    = require('express').Router();
const requireAuth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const User      = require('../models/User');

router.use(requireAuth);

// ── POST /api/workspaces ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, error: 'name is required' });
  }
  try {
    const workspace = await Workspace.create({
      name: String(name).trim(),
      ownerId: req.user.id,
      members: [{ userId: req.user.id, role: 'owner' }],
    });
    res.status(201).json({ success: true, data: workspace });
  } catch (err) {
    console.error('[Workspaces] create error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create workspace' });
  }
});

// ── GET /api/workspaces ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.find({ 'members.userId': req.user.id });
    res.json({ success: true, data: workspaces });
  } catch (err) {
    console.error('[Workspaces] list error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch workspaces' });
  }
});

// ── POST /api/workspaces/:id/members ─────────────────────────────────────────
router.post('/:id/members', async (req, res) => {
  const { email, role = 'member' } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'email is required' });
  }
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ success: false, error: "role must be 'admin' or 'member'" });
  }

  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    const requester = workspace.members.find(m => m.userId.toString() === req.user.id);
    if (!requester || requester.role === 'member') {
      return res.status(403).json({ success: false, error: 'Only owners and admins can add members' });
    }

    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'No account found with that email' });
    }

    const alreadyMember = workspace.members.some(m => m.userId.toString() === targetUser._id.toString());
    if (alreadyMember) {
      return res.status(409).json({ success: false, error: 'User is already a member of this workspace' });
    }

    workspace.members.push({ userId: targetUser._id, role });
    await workspace.save();
    res.json({ success: true, data: workspace });
  } catch (err) {
    console.error('[Workspaces] add member error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to add member' });
  }
});

module.exports = router;
