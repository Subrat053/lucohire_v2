const mongoose = require('mongoose');

const providerWalletTransactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProviderWallet',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['earning', 'withdrawal', 'commission', 'adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['credited', 'pending', 'debited', 'failed'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

providerWalletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ProviderWalletTransaction', providerWalletTransactionSchema);
