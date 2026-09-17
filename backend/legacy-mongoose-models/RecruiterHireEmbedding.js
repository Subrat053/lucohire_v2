const mongoose = require('mongoose');

const recruiterHireEmbeddingSchema = new mongoose.Schema({
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceType: {
    type: String,
    enum: ['hire_history', 'search_pattern', 'job_intent'],
    default: 'hire_history',
    index: true,
  },
  referenceId: { type: String, default: '', trim: true },
  model: { type: String, default: 'text-embedding-3-small', trim: true },
  dimensions: { type: Number, default: 1536, min: 1 },
  vector: [{ type: Number }],
  skill: { type: String, default: '', trim: true },
  city: { type: String, default: '', trim: true },
  successSignals: {
    hireCompleted: { type: Boolean, default: false },
    satisfactionRating: { type: Number, default: 0, min: 0, max: 5 },
  },
}, { timestamps: true });

recruiterHireEmbeddingSchema.index({ recruiterId: 1, sourceType: 1, createdAt: -1 });

module.exports = mongoose.model('RecruiterHireEmbedding', recruiterHireEmbeddingSchema);
