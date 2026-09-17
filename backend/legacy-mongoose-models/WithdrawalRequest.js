const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['bank', 'upi', 'qr'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
