const mongoose = require('mongoose');

const careerHealthCacheSchema = new mongoose.Schema({
  fileHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  reportData: {
    type: Object,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60, // 30 days TTL
  },
});

module.exports = mongoose.model('CareerHealthCache', careerHealthCacheSchema);
