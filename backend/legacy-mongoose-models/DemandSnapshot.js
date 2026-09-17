const mongoose = require('mongoose');

const demandSnapshotSchema = new mongoose.Schema({
  skill: { type: String, required: true, trim: true, index: true },
  city: { type: String, required: true, trim: true, index: true },
  snapshotDate: { type: Date, required: true, index: true },
  demandCount: { type: Number, default: 0, min: 0 },
  supplyCount: { type: Number, default: 0, min: 0 },
  unmetDemandScore: { type: Number, default: 0, min: 0 },
  confidence: { type: Number, default: 0, min: 0, max: 1 },
}, { timestamps: true });

demandSnapshotSchema.index({ skill: 1, city: 1, snapshotDate: -1 }, { unique: true });

module.exports = mongoose.model('DemandSnapshot', demandSnapshotSchema);
