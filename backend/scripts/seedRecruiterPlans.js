const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Plan = require('../legacy-mongoose-models/Plan');

dotenv.config({ path: '.env' });

const seedRecruiterPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Remove existing recruiter plans
    await Plan.deleteMany({ audience: 'recruiter' });
    console.log('Cleared old recruiter plans.');

    const plans = [
      {
        name: 'Recruiter Basic',
        slug: 'recruiter-basic',
        code: 'REC_BASIC',
        audience: 'recruiter',
        type: 'recruiter',
        planType: 'paid',
        price: 499,
        priceMonthly: 499,
        discountedPrice: 499,
        billingCycle: 'monthly',
        duration: 30, // 30 days
        description: 'Perfect for small businesses looking to hire quickly.',
        features: [
          '5 Profile Unlocks',
          '3 Active Job Posts',
          'Basic AI JD Generator',
        ],
        aiLimits: {
          aiJdGenerator: 5,
          aiJdParsing: 5,
          aiCopilot: 0,
          interviewKits: 0,
          jobPostLimit: 3,
          jobBoostJobsLimit: 0,
          jobBoostDaysLimit: 0,
          outreachCampaigns: 0,
          directMessaging: 0,
          customReports: 0,
        },
        unlockCredits: 5,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Recruiter Pro',
        slug: 'recruiter-pro',
        code: 'REC_PRO',
        audience: 'recruiter',
        type: 'recruiter',
        planType: 'paid',
        price: 1499,
        priceMonthly: 1499,
        discountedPrice: 1499,
        billingCycle: 'monthly',
        duration: 30,
        description: 'Ideal for growing teams with consistent hiring needs.',
        features: [
          '20 Profile Unlocks',
          '10 Active Job Posts',
          'Advanced AI Suite & JD Generator',
          '2 Job Boosts (3 days each)'
        ],
        aiLimits: {
          aiJdGenerator: 20,
          aiJdParsing: 20,
          aiCopilot: 10,
          interviewKits: 5,
          jobPostLimit: 10,
          jobBoostJobsLimit: 2,
          jobBoostDaysLimit: 3,
          outreachCampaigns: 5,
          directMessaging: 50,
          customReports: 1,
        },
        unlockCredits: 20,
        isActive: true,
        isPopular: true,
        sortOrder: 2,
      },
      {
        name: 'Recruiter Max',
        slug: 'recruiter-max',
        code: 'REC_MAX',
        audience: 'recruiter',
        type: 'recruiter',
        planType: 'paid',
        price: 4999,
        priceMonthly: 4999,
        discountedPrice: 4999,
        billingCycle: 'monthly',
        duration: 30,
        description: 'The ultimate package for enterprise scaling and high-volume recruitment.',
        features: [
          'Unlimited Profile Unlocks',
          'Unlimited Active Job Posts',
          'Full AI Suite & Copilot',
          '10 Job Boosts (7 days each)',
          'Custom Reporting'
        ],
        aiLimits: {
          aiJdGenerator: 100,
          aiJdParsing: 100,
          aiCopilot: 100,
          interviewKits: 20,
          jobPostLimit: 9999, // unlimited practically
          jobBoostJobsLimit: 10,
          jobBoostDaysLimit: 7,
          outreachCampaigns: 20,
          directMessaging: 500,
          customReports: 5,
        },
        unlockCredits: 9999, // practically unlimited
        isActive: true,
        sortOrder: 3,
      },
    ];

    for (const plan of plans) {
      await Plan.create(plan);
      console.log(`Created plan: ${plan.name}`);
    }

    console.log('Successfully seeded recruiter plans.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding recruiter plans:', err);
    process.exit(1);
  }
};

seedRecruiterPlans();
