const mongoose = require('mongoose');

const seoMetaSchema = new mongoose.Schema({
  page_slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  keywords: [{ type: String }],
  schema_enabled: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SeoMeta', seoMetaSchema);
