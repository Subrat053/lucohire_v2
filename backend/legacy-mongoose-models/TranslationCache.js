const mongoose = require('mongoose');

const translationCacheSchema = new mongoose.Schema({
  originalText: { type: String, required: true, trim: true },
  targetLanguage: { type: String, required: true, trim: true, index: true },
  translatedText: { type: String, required: true, trim: true },
}, { timestamps: true });

translationCacheSchema.index({ originalText: 1, targetLanguage: 1 }, { unique: true });

module.exports = mongoose.model('TranslationCache', translationCacheSchema);