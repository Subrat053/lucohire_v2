const mongoose = require('mongoose');

const providerWithdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  payoutMethodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayoutMethod',
    required: true
  },
  payoutMethodSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending',
    index: true
  },
  transactionId: {
    type: String,
    default: ''
  },
  adminNotes: {
    type: String,
    default: ''
  },
  processedAt: {
    type: Date,
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('ProviderWithdrawal', providerWithdrawalSchema);
