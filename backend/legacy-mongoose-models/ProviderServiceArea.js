const mongoose = require('mongoose');

const providerServiceAreaSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  city: { type: String, required: true, trim: true, index: true },
  locality: { type: String, default: '', trim: true, index: true },
  geoPoint: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: 'geoPoint.coordinates must be [lng, lat]',
      },
    },
  },
  radiusKm: { type: Number, default: 15, min: 1, max: 200 },
}, { timestamps: true });

providerServiceAreaSchema.index({ geoPoint: '2dsphere' });
providerServiceAreaSchema.index({ providerId: 1, city: 1, locality: 1 });

module.exports = mongoose.model('ProviderServiceArea', providerServiceAreaSchema);
