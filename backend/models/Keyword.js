const mongoose = require('mongoose');

const keywordSchema = new mongoose.Schema({
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },

  keyword: { type: String, required: true, trim: true },

  cluster: { type: String, required: true, trim: true },

  intent: {
    type: String,
    enum: ['informational', 'transactional', 'navigational', 'commercial'],
    required: true,
  },

  /**
   * AI-estimated difficulty 0–100.
   * This is NOT real search data — it is a rough heuristic from Groq's
   * general knowledge of keyword competitiveness. The UI must label this
   * honestly wherever it is displayed.
   */
  difficultyEstimate: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },

  createdAt: { type: Date, default: Date.now },
});

// Compound index: one keyword per site (avoid duplicates across runs)
keywordSchema.index({ siteId: 1, keyword: 1 }, { unique: true });

module.exports = mongoose.model('Keyword', keywordSchema);
