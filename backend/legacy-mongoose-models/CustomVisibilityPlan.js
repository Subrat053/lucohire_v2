const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  placeId: { type: String, required: true },
  name: { type: String, default: '' },
  formattedAddress: { type: String, default: '' },
  locality: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: '' },
  pincode: { type: String, default: '' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  durationMonths: { type: Number, required: true },
  price: { type: Number, required: true, default: 0 }
}, { _id: false });

const customVisibilityItemSchema = new mongoose.Schema({
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', default: null },
  skillName: { type: String, required: true },
  visibilityType: { type: String, enum: ['locality', 'city', 'country'], required: true },
  locations: [locationSchema],
  subtotal: { type: Number, required: true, default: 0 }
}, { _id: false });

const customVisibilityPlanSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderSubscription', default: null },
  paymentId: { type: String, default: '' },
  planType: { type: String, default: 'custom' },
  status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled'], default: 'pending' },
  selectedGoals: [{ type: String }], // e.g. ['multipleSkills', 'locality', 'city', 'country']
  items: [customVisibilityItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  gstPercent: { type: Number, default: 0 },
  gstAmount: { type: Number, required: true, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null }
}, { timestamps: true });

customVisibilityPlanSchema.index({ providerId: 1, status: 1 });
customVisibilityPlanSchema.index({ subscriptionId: 1 });

module.exports = mongoose.model('CustomVisibilityPlan', customVisibilityPlanSchema);
