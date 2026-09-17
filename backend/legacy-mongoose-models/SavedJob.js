const mongoose = require('mongoose');

const savedJobSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobPost: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost' },
  externalJob: { type: mongoose.Schema.Types.ObjectId, ref: 'ExternalJob' },
  isExternal: { type: Boolean, default: false },
}, { timestamps: true });

// Ensure a user can only save a specific job once
savedJobSchema.index({ provider: 1, jobPost: 1, externalJob: 1 }, { unique: true });

module.exports = mongoose.model('SavedJob', savedJobSchema);
