const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  start: { type: String, required: true, trim: true },
  end: { type: String, required: true, trim: true },
}, { _id: false });

const providerAvailabilitySchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  isAvailableNow: { type: Boolean, default: true, index: true },
  availableSlots: { type: [slotSchema], default: [] },
  workingDays: { type: [String], default: [] },
  workingHours: {
    start: { type: String, default: '' },
    end: { type: String, default: '' },
  },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

providerAvailabilitySchema.index({ isAvailableNow: 1, updatedAt: -1 });

module.exports = mongoose.model('ProviderAvailability', providerAvailabilitySchema);
