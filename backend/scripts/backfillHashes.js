require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../legacy-mongoose-models/User');

async function backfillHashes() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is missing. Make sure .env is accessible.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Find users missing phone_hash OR email_hash OR having empty source_profile_url
    const users = await User.find({
      $or: [
        { phone_hash: { $exists: false } },
        { email_hash: { $exists: false } },
        { source_profile_url: "" }
      ]
    });

    console.log(`Found ${users.length} users to backfill.`);

    let updatedCount = 0;
    for (const user of users) {
      let changed = false;
      
      if (user.source_profile_url === "") {
        user.source_profile_url = undefined;
        changed = true;
      }
      
      if (user.phone && !user.phone_hash) {
        user.phone_hash = crypto.createHash('sha256').update(user.phone.trim()).digest('hex');
        changed = true;
      }
      
      if (user.email && !user.email_hash) {
        user.email_hash = crypto.createHash('sha256').update(user.email.trim().toLowerCase()).digest('hex');
        changed = true;
      }

      if (changed) {
        try {
          // Save using validateBeforeSave: false to avoid triggering validation errors on old/legacy data
          await user.save({ validateBeforeSave: false });
          updatedCount++;
        } catch (err) {
          console.error(`Failed to save user ${user._id} (phone: ${user.phone}):`, err.message);
        }
      }
    }

    console.log(`Backfill complete. Updated ${updatedCount} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  }
}

backfillHashes();
