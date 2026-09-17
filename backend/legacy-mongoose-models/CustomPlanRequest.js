const mongoose = require('mongoose');

const customPlanRequestSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  durationMonths: {
    type: Number,
    required: true,
    min: 1
  },
  selectedFeatures: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'contacted', 'resolved', 'closed'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  jobsPerMonth: { type: Number, default: 0 },
  profileUnlocks: { type: Number, default: 0 },
  campaigns: { type: Number, default: 0 },
  boostJobs: { type: Number, default: 0 },
  boostDays: { type: Number, default: 0 },
  estimatedPrice: { type: Number, default: 0 },
  offerDetails: {
    price: { type: Number },
    durationMonths: { type: Number },
    features: [{ type: String }],
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    stripePriceId: { type: String },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    purchasedAt: { type: Date },
    createdAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('CustomPlanRequest', customPlanRequestSchema);
