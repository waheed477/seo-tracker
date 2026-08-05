const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tokenHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Async pre-save hook for Mongoose 9.x compatibility (just in case we need it, though no logic here atm)
refreshTokenSchema.pre('save', async function () {
  // no-op, just demonstrating the pattern as requested
});

// Index for fast lookups and to easily clean up expired tokens
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 });
refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
