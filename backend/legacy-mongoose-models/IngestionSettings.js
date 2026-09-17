const mongoose = require('mongoose');

const IngestionSettingsSchema = new mongoose.Schema({
  maxRecordsPerDay: { type: Number, default: 3000 },
  maxRecordsPerMonth: { type: Number, default: 90000 },
  maxSpendPerDay: { type: Number, default: 5000 },
  maxSpendPerMonth: { type: Number, default: 150000 },
  // Running usage counters
  dailyRecordsUsed: { type: Number, default: 0 },
  monthlyRecordsUsed: { type: Number, default: 0 },
  dailySpendUsed: { type: Number, default: 0 },
  monthlySpendUsed: { type: Number, default: 0 },
  lastResetDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure single document pattern
IngestionSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  
  // Simple reset logic
  const now = new Date();
  const lastReset = settings.lastResetDate || now;
  let needsSave = false;

  // Reset daily if it's a new day
  if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    settings.dailyRecordsUsed = 0;
    settings.dailySpendUsed = 0;
    needsSave = true;
  }
  
  // Reset monthly if it's a new month
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    settings.monthlyRecordsUsed = 0;
    settings.monthlySpendUsed = 0;
    needsSave = true;
  }

  if (needsSave) {
    settings.lastResetDate = now;
    await settings.save();
  }

  return settings;
};

module.exports = mongoose.model('IngestionSettings', IngestionSettingsSchema);
