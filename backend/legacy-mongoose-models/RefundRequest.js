const mongoose = require('mongoose');

const refundRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProviderSubscription',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  bankDetails: {
    accountHolderName: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true }
  },
  status: {
    type: String,
    enum: [
      'Refund Requested',
      'Under Review',
      'Full Refund',
      'Partial Refund',
      'Refund Successful',
      'Refund Failed',
      'Refund Rejected'
    ],
    default: 'Refund Requested'
  },
  cancellationDate: {
    type: Date,
    default: Date.now
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  completionDate: {
    type: Date
  },
  planPrice: {
    type: Number,
    required: true
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  usedCredits: {
    type: Number,
    default: 0
  },
  remainingCredits: {
    type: Number,
    default: 0
  },
  totalCredits: {
    type: Number,
    default: 0
  },
  adminReason: {
    type: String,
    default: ''
  },
  transactionId: {
    type: String,
    default: ''
  }
}, { timestamps: true });

refundRequestSchema.index({ userId: 1, createdAt: -1 });
refundRequestSchema.index({ status: 1 });

module.exports = mongoose.model('RefundRequest', refundRequestSchema);
