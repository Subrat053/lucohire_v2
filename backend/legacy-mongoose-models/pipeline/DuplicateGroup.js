const mongoose = require('mongoose');

const duplicateGroupSchema = new mongoose.Schema({
  canonicalJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true },
  duplicateJobIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobPost' }],
  duplicateSourceVersionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobSourceVersion' }],
  matchingRule: { type: String, enum: ['source_job_id', 'apply_url', 'requisition_id', 'content_fingerprint', 'composite_id', 'near_duplicate'], required: true },
  similarityScore: { type: Number, default: 100 }
}, { timestamps: true });

module.exports = mongoose.model('DuplicateGroup', duplicateGroupSchema);
