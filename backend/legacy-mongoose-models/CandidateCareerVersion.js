const mongoose = require('mongoose');

const candidateCareerVersionSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProviderProfile',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  snapshotData: {
    type: Object,
    required: true
  },
  source: {
    type: String,
    enum: ['Apify', 'Manual', 'System'],
    default: 'System'
  },
  reasonForVersion: {
    type: String,
    enum: ['Promotion', 'Skill Change', 'Routine Scan', 'Company Change', 'Other'],
    default: 'Routine Scan'
  },
  versionDate: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('CandidateCareerVersion', candidateCareerVersionSchema);
