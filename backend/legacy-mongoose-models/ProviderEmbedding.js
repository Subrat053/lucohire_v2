const mongoose = require('mongoose');

const providerEmbeddingSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  model: { type: String, default: 'text-embedding-3-small', trim: true },
  dimensions: { type: Number, default: 1536, min: 1 },
  vector: [{ type: Number }],
  textSnapshot: { type: String, default: '', trim: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAtSource: { type: Date, default: Date.now },
}, { timestamps: true });

providerEmbeddingSchema.index({ providerId: 1, updatedAt: -1 });

module.exports = mongoose.model('ProviderEmbedding', providerEmbeddingSchema);
