const mongoose = require('mongoose');

const resumeFileCacheSchema = new mongoose.Schema({
  fileHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  parsedResult: {
    type: Object,
    required: true,
  },
  resumeUrl: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60, // 30 days TTL
  },
});

module.exports = mongoose.model('ResumeFileCache', resumeFileCacheSchema);
