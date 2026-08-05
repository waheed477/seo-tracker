const mongoose = require('mongoose');

const competitorSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },

  domain: { type: String, required: true, trim: true },

  lastCrawledAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
});

// Normalise domain on save (same as Site model)
competitorSchema.pre('save', async function () {
  if (this.isModified('domain')) {
    this.domain = this.domain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .toLowerCase()
      .trim();
  }
});

// Prevent same competitor domain added twice for the same site
competitorSchema.index({ siteId: 1, domain: 1 }, { unique: true });

module.exports = mongoose.model('Competitor', competitorSchema);
