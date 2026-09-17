const mongoose = require('mongoose');

const providerWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  availableBalance: {
    type: Number,
    default: 0
  },
  pendingBalance: {
    type: Number,
    default: 0
  },
  withdrawnAmount: {
    type: Number,
    default: 0
  },
  commissionDeducted: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('ProviderWallet', providerWalletSchema);
