const mongoose = require('mongoose');

/** Strip protocol and trailing slash, lowercase */
function normalizeDomain(raw) {
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase().trim();
}

const siteSchema = new mongoose.Schema({
  workspaceId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  domain:       { type: String, required: true },
  gscConnected: { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now },
});

siteSchema.pre('save', function (next) {
  this.domain = normalizeDomain(this.domain);
  next();
});

module.exports = mongoose.model('Site', siteSchema);
