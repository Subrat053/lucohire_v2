const mongoose = require('mongoose');

const aiEvaluationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProviderProfile', // We use ProviderProfile since that's what represents the candidate's skills
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  reasoning: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Ensure one evaluation per candidate per job
aiEvaluationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model('AiEvaluation', aiEvaluationSchema);
