const mongoose = require('mongoose');

const seoPageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  type: { type: String, default: 'job_listing' },
  city: { type: String, required: true, index: true },
  keyword: { type: String, required: true, index: true },
  job_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  generated_at: { type: Date, default: Date.now },
  last_updated: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('SeoPage', seoPageSchema);
