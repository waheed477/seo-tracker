const mongoose = require('mongoose');

const contentGapReportSchema = new mongoose.Schema({
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
  competitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competitor', required: true },

  status: {
    type: String,
    enum: ['queued', 'running', 'done', 'failed'],
    default: 'queued',
  },

  startedAt: { type: Date },
  completedAt: { type: Date },

  /** Populated when status === 'failed' */
  error: { type: String },

  gaps: [
    {
      topic: { type: String, required: true },
      competitorHasIt: { type: Boolean, required: true },
      userHasIt: { type: Boolean, required: true },
      opportunity: { type: String, required: true }, // AI-generated reasoning
    },
  ],

  generatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ContentGapReport', contentGapReportSchema);
