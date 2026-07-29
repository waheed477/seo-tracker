const mongoose = require('mongoose');

/** Strip protocol and trailing slash, lowercase */
function normalizeDomain(raw) {
  return raw
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase()
    .trim();
}

const siteSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  domain: { type: String, required: true },

  gscConnected: { type: Boolean, default: false },
  /** AES-encrypted refresh token — never stored in plaintext */
  gscRefreshToken: { type: String },
  /** The exact property URL as registered in Google Search Console
   *  (e.g. "https://example.com/" or "sc-domain:example.com") */
  gscSiteUrl: { type: String },

  createdAt: { type: Date, default: Date.now },
});

siteSchema.pre('save', function () {
  this.domain = normalizeDomain(this.domain);
});

module.exports = mongoose.model('Site', siteSchema);
