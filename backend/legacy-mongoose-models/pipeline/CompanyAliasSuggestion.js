const mongoose = require('mongoose');

const companyAliasSuggestionSchema = new mongoose.Schema({
  rawCompanyName: { type: String, required: true },
  suggestedCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'PipelineCompanyMaster', default: null },
  confidenceScore: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  sampleJobIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobPost' }]
}, { timestamps: true });

module.exports = mongoose.model('CompanyAliasSuggestion', companyAliasSuggestionSchema);
