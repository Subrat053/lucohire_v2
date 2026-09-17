const mongoose = require('mongoose');
const AdminSetting = require('../legacy-mongoose-models/AdminSetting');
require('dotenv').config();

const seedReferralSettings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const settings = [
      {
        key: 'user_referral_commission_percentage',
        value: '10',
        description: 'Percentage of commission given to a user for referring another user who subscribes.',
        category: 'referral',
        isPublic: true
      }
    ];

    for (const s of settings) {
      await AdminSetting.findOneAndUpdate(
        { key: s.key },
        s,
        { upsert: true, new: true }
      );
      console.log(`Setting ${s.key} seeded/updated`);
    }

    console.log('Admin settings seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedReferralSettings();
