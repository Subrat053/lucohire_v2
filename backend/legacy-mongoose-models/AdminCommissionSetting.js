const mongoose = require('mongoose');

const adminCommissionSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('AdminCommissionSetting', adminCommissionSettingSchema);
