const mongoose = require('mongoose');

const payoutMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['bank', 'upi', 'qr'],
    required: true
  },
  bankDetails: {
    accountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' }
  },
  upiId: { type: String, default: '' },
  qrCodeImage: { type: String, default: '' },
  providerName: { type: String, default: '' }, // Optional provider name for QR Code method
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('PayoutMethod', payoutMethodSchema);
