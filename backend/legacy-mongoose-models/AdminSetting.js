const mongoose = require('mongoose');

const adminSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: [
      'pricing',
      'limits',
      'rotation',
      'whatsapp',
      'general',
      'terms',
      'privacy',
      'faq',
      'payment',
      'currency',
      'cloudinary',
      'notification',
      'ai',
      'search',
      'trust',
      'fraud',
      'matching',
      'referral',
      'refund',
      'about',
      'renewal',
      'scraper',
      'outreach',
      'socials'
    ],
    default: 'general',
  },
}, { timestamps: true });

adminSettingSchema.statics.getValue = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

adminSettingSchema.statics.isFeatureEnabled = async function(key, defaultEnabled = true) {
  const val = await this.getValue(key);
  if (val === null || val === undefined) return defaultEnabled;
  // Handle both 0/1 (from admin panel) and boolean/string
  return Number(val) === 1 || val === true || String(val).toLowerCase() === 'true';
};


module.exports = mongoose.model('AdminSetting', adminSettingSchema);
