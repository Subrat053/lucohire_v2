const mongoose = require('mongoose');

const repeatHireInsightSchema = new mongoose.Schema({
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillCategory', default: null, index: true },
  city: { type: String, default: '', trim: true, index: true },
  lastHiredAt: { type: Date, default: null },
  hireCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

repeatHireInsightSchema.index({ recruiterId: 1, providerId: 1 }, { unique: true });

module.exports = mongoose.model('RepeatHireInsight', repeatHireInsightSchema);
