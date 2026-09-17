const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../legacy-mongoose-models/User');
const ProviderProfile = require('../legacy-mongoose-models/ProviderProfile');
const RecruiterProfile = require('../legacy-mongoose-models/RecruiterProfile');

const migrateApprovalStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for migration...');

    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate.`);

    let migratedCount = 0;

    for (const user of users) {
      const providerProfile = await ProviderProfile.findOne({ user: user._id });
      const recruiterProfile = await RecruiterProfile.findOne({ user: user._id });

      let isProviderApproved = false;
      let isRecruiterApproved = false;

      if (providerProfile) {
        isProviderApproved = providerProfile.isApproved || providerProfile.approvalAction === 'approved';
      }
      if (recruiterProfile) {
        isRecruiterApproved = recruiterProfile.isApproved || recruiterProfile.approvalAction === 'approved';
      }

      // Update panel access
      user.panelAccess = {
        provider: {
          enabled: isProviderApproved,
          source: isProviderApproved ? (providerProfile.currentPlan === 'free' ? 'free_plan' : 'paid_plan') : 'none'
        },
        recruiter: {
          enabled: isRecruiterApproved,
          source: isRecruiterApproved ? (recruiterProfile.currentPlan === 'free' ? 'free_plan' : 'paid_plan') : 'none'
        }
      };

      // Unified approval status
      if (isProviderApproved || isRecruiterApproved) {
        user.approvalStatus = 'approved';
        user.approvedAt = providerProfile?.approvedAt || recruiterProfile?.approvedAt || new Date();
      } else if ((providerProfile?.approvalAction === 'rejected') || (recruiterProfile?.approvalAction === 'rejected')) {
        user.approvalStatus = 'rejected';
        user.rejectionReason = providerProfile?.approvalNote || recruiterProfile?.approvalNote || 'Legacy rejection';
      } else {
        user.approvalStatus = 'pending';
      }

      // Role Intent
      if (!user.roleIntent) {
        const roles = user.roles || [];
        const hasProvider = roles.includes('provider');
        const hasRecruiter = roles.includes('recruiter');
        if (hasProvider && hasRecruiter) user.roleIntent = 'both';
        else if (hasRecruiter) user.roleIntent = 'recruiter';
        else if (hasProvider) user.roleIntent = 'provider';
        else user.roleIntent = 'provider'; // Fallback
      }

      // Active Panel
      if (!user.activePanel) {
        if (isProviderApproved) user.activePanel = 'provider';
        else if (isRecruiterApproved) user.activePanel = 'recruiter';
      }

      await user.save();
      migratedCount++;
    }

    console.log(`Successfully migrated ${migratedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrateApprovalStatus();
