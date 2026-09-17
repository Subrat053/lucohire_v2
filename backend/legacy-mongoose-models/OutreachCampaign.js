const mongoose = require('mongoose');

const outreachCampaignSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost',
    required: true
  },
  jobTitle: {
    type: String,
    required: true
  },
  candidatesContacted: {
    type: Number,
    default: 0
  },
  candidates: [{
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile' },
    name: String,
    email: String,
    avatar: String
  }],
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running'
  },
  runDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('OutreachCampaign', outreachCampaignSchema);
