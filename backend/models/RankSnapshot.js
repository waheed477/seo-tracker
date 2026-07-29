const mongoose = require('mongoose');

const rankSnapshotSchema = new mongoose.Schema({
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },

  queryText: { type: String, required: true, trim: true },
  page: { type: String, required: true, trim: true },

  avgPosition: { type: Number, required: true },
  clicks: { type: Number, required: true },
  impressions: { type: Number, required: true },
  ctr: { type: Number, required: true },

  date: { type: Date, required: true },
});

// Upsert key: one snapshot per (siteId, queryText, page, date)
rankSnapshotSchema.index({ siteId: 1, queryText: 1, page: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('RankSnapshot', rankSnapshotSchema);
