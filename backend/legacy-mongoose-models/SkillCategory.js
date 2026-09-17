const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  isActive: { type: Boolean, default: true },
}, { _id: true });

const skillCategorySchema = new mongoose.Schema({
  tier: {
    type: String,
    enum: ['unskilled', 'semi-skilled', 'skilled'],
    required: true,
  },
  type: {
    type: String,
    enum: ['unskilled', 'semi_skilled', 'skilled'],
    default: 'unskilled',
  },
  name: { type: String, required: true, trim: true },           // e.g. "Home / Personal"
  icon: { type: String, default: '🔧' },
  slug: { type: String, required: true, trim: true, lowercase: true },
  skills: [skillSchema],
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  deactivatedAt: { type: Date, default: null },
  deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deactivationReason: { type: String, default: '' },
  reactivatedAt: { type: Date, default: null },
  reactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

skillCategorySchema.index({ tier: 1, slug: 1 }, { unique: true });

skillCategorySchema.pre('validate', function normalizeType(next) {
  if (!this.type && this.tier) {
    this.type = this.tier === 'semi-skilled' ? 'semi_skilled' : this.tier;
  }
  if (!this.tier && this.type) {
    this.tier = this.type === 'semi_skilled' ? 'semi-skilled' : this.type;
  }
  next();
});

module.exports = mongoose.model('SkillCategory', skillCategorySchema);
