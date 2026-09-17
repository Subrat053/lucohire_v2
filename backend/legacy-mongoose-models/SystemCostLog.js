const mongoose = require('mongoose');

const systemCostLogSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true,
    enum: ['OpenAI', 'Gemini', 'Apify', 'Cloudinary', 'MetaCloud', 'Resend', 'Razorpay', 'Stripe', 'JobAPIs', 'Instantly', 'Other']
  },
  costInUsd: {
    type: Number,
    required: true,
    default: 0
  },
  tokensUsed: {
    type: Number,
    default: 0
  },
  computeUnits: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('SystemCostLog', systemCostLogSchema);
