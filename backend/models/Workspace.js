const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  },
  { _id: false },
);

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [memberSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Workspace', workspaceSchema);
