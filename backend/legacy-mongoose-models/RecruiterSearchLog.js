const mongoose = require('mongoose');

const recruiterSearchLogSchema = new mongoose.Schema({
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  query: { type: String, required: true, trim: true },
  parsedIntent: { type: mongoose.Schema.Types.Mixed, default: {} },
  semanticEmbeddingModel: { type: String, default: 'text-embedding-3-small', trim: true },
  resultCount: { type: Number, default: 0, min: 0 },
  hiredProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  wasSuccessful: { type: Boolean, default: false, index: true },
}, { timestamps: true });

recruiterSearchLogSchema.index({ recruiterId: 1, createdAt: -1 });

module.exports = mongoose.model('RecruiterSearchLog', recruiterSearchLogSchema);
