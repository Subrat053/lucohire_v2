const mongoose = require('mongoose');

const jobMatchSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  matchScore: { type: Number, default: 0, min: 0, max: 100, index: true },
  scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  dispatchedAt: { type: Date, default: null },
  responseStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'contacted', 'hired', 'closed'],
    default: 'pending',
    index: true,
  },
  responseAt: { type: Date, default: null },
}, { timestamps: true });

jobMatchSchema.index({ jobId: 1, providerId: 1 }, { unique: true });

module.exports = mongoose.model('JobMatch', jobMatchSchema);
