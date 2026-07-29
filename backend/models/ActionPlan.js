const mongoose = require('mongoose');

const actionPlanSchema = new mongoose.Schema({
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },

  status: {
    type: String,
    enum: ['queued', 'running', 'done', 'failed'],
    default: 'queued',
  },

  startedAt: { type: Date },
  completedAt: { type: Date },

  /** Populated when status === 'failed' */
  error: { type: String },

  items: [
    {
      priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        required: true,
      },
      agent: {
        type: String,
        required: true,
        // Which area this came from: technical, content, competitor, rankings, keywords
      },
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ['todo', 'in_progress', 'done'],
        default: 'todo',
      },
    },
  ],

  /** Short AI-written overview of overall SEO health */
  summary: { type: String },

  generatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActionPlan', actionPlanSchema);
