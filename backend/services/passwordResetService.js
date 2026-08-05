const crypto = require('crypto');
const PasswordReset = require('../models/PasswordReset');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createPasswordReset(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await PasswordReset.deleteMany({ userId });
  await PasswordReset.create({ userId, tokenHash, expiresAt });

  return token;
}

async function consumePasswordResetToken(token) {
  const tokenHash = hashToken(token);
  const reset = await PasswordReset.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!reset) return null;

  const userId = reset.userId;
  await PasswordReset.deleteMany({ userId });
  return userId;
}

async function cleanupExpiredPasswordResets() {
  return PasswordReset.deleteMany({ expiresAt: { $lte: new Date() } });
}

module.exports = {
  createPasswordReset,
  consumePasswordResetToken,
  cleanupExpiredPasswordResets,
};
