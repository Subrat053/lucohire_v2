const mongoose = require('mongoose');

const documentVerificationResultSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  documentUrl: { type: String, required: true, trim: true },
  documentType: { type: String, enum: ['aadhaar', 'other'], default: 'aadhaar', index: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'verified', 'rejected', 'needs_review', 'failed'],
    default: 'pending',
    index: true,
  },
  extractedFields: {
    name: { type: String, default: '' },
    dob: { type: String, default: '' },
    aadhaarMasked: { type: String, default: '' },
  },
  profileComparison: {
    nameMatch: { type: Boolean, default: false },
    dobMatch: { type: Boolean, default: false },
    overallMatch: { type: Boolean, default: false },
  },
  confidence: { type: Number, default: 0, min: 0, max: 1 },
  reasons: [{ type: String, trim: true }],
  rawOcrText: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

documentVerificationResultSchema.index({ providerId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('DocumentVerificationResult', documentVerificationResultSchema);
