const mongoose = require('mongoose');

const categorySuggestionSchema = new mongoose.Schema({
  suggestedName: { type: String, required: true },
  matchedKeywords: [{ type: String }],
  occurrenceCount: { type: Number, default: 1 },
  sampleJobIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobPost' }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('CategorySuggestion', categorySuggestionSchema);
