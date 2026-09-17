const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Plan = require('../legacy-mongoose-models/Plan');

dotenv.config({ path: '.env' });

const seedFreeRecruiterPlan = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Remove existing free plan if it exists
    await Plan.deleteMany({ audience: 'recruiter', slug: 'free' });

    const freePlan = {
      name: 'Free',
      slug: 'free',
      code: 'REC_FREE',
      audience: 'recruiter',
      type: 'recruiter',
      planType: 'free',
      price: 0,
      priceMonthly: 0,
      discountedPrice: 0,
      billingCycle: 'monthly',
      duration: 36500, // practically forever
      description: 'Get started with basic recruiter access.',
      features: [
        '1 Profile Unlock',
        '1 Active Job Post'
      ],
      aiLimits: {
        aiJdGenerator: 1,
        aiJdParsing: 1,
        aiCopilot: 0,
        interviewKits: 0,
        jobPostLimit: 1,
        jobBoostJobsLimit: 0,
        jobBoostDaysLimit: 0,
        outreachCampaigns: 0,
        directMessaging: 0,
        customReports: 0,
      },
      unlockCredits: 1,
      isActive: true,
      sortOrder: 0,
    };

    await Plan.create(freePlan);
    console.log(`Created free plan: ${freePlan.name}`);

    process.exit(0);
  } catch (err) {
    console.error('Error seeding free plan:', err);
    process.exit(1);
  }
};

seedFreeRecruiterPlan();
