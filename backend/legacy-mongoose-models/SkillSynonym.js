const mongoose = require('mongoose');

const skillSynonymSchema = new mongoose.Schema({
  canonicalSkillId: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillCategory', required: true, index: true },
  label: { type: String, required: true, trim: true },
  normalizedLabel: { type: String, required: true, trim: true, lowercase: true, index: true },
  locale: { type: String, default: 'en', trim: true, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
}, { timestamps: true });

skillSynonymSchema.index({ canonicalSkillId: 1, normalizedLabel: 1, locale: 1 }, { unique: true });

module.exports = mongoose.model('SkillSynonym', skillSynonymSchema);