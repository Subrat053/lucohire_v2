const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  keywords: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isSystemDefault: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('PipelineCategory', categorySchema);
