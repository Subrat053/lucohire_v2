const mongoose = require('mongoose');
const User = require('../legacy-mongoose-models/User');
const { generateReferralCode } = require('../utils/generateReferralCode');
require('dotenv').config();

const migrateReferralCodes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const usersWithoutCode = await User.find({ 
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: "" },
        { referralCode: null }
      ]
    });

    console.log(`Found ${usersWithoutCode.length} users without referral code`);

    for (const user of usersWithoutCode) {
      user.referralCode = generateReferralCode();
      await user.save();
      console.log(`Generated code ${user.referralCode} for user ${user.email}`);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateReferralCodes();
