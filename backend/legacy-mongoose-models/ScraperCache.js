const mongoose = require('mongoose');

const ScraperCacheSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  htmlHash: {
    type: String,
    required: true
  },
  extractionMethod: {
    type: String,
    enum: ['css', 'llm', 'mixed', 'json-ld']
  },
  confidence: {
    type: Number,
    default: 0
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // flexible for { jobs: [], emails: [] }
    required: true
  }
}, { timestamps: true });

// Optional: Expire cache after 7 days
ScraperCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('ScraperCache', ScraperCacheSchema);
