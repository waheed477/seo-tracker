const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
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

  results: {
    pagesCrawled: [String],
    technical: {
      missingMetaDescriptions: [String],
      missingTitleTags: [String],
      duplicateTitles: [
        {
          title: String,
          urls: [String],
        },
      ],
      headingIssues: [
        {
          url: String,
          issue: String,
        },
      ],
      missingAltText: [
        {
          url: String,
          imageCount: Number,
        },
      ],
      robotsTxt: {
        found: Boolean,
        disallowsEverything: Boolean,
      },
      sitemapXml: {
        found: Boolean,
        urlCount: Number,
      },
      brokenInternalLinks: [
        {
          fromUrl: String,
          brokenUrl: String,
          status: Number, // HTTP status, or null if the request errored
        },
      ],
    },
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Audit', auditSchema);
