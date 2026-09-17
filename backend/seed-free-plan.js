require('dotenv').config();
const connectDB = require('./config/db');
const Plan = require('./models/Plan');

connectDB()
  .then(async () => {
    console.log('Connected to DB');
    const existing = await Plan.findOne({ slug: 'free', type: 'recruiter' });
    if (!existing) {
      await Plan.create({
        name: 'Free',
        slug: 'free',
        type: 'recruiter',
        price: 0,
        priceMonthly: 0,
        duration: 30,
        features: ['Basic features'],
        maxSkills: 10,
        boostWeight: 1,
        unlockCredits: 0,
        isActive: true,
        showOnLandingPage: false,
        aiLimits: {
          aiJdGenerator: 0,
          aiJdParsing: 0,
          aiCopilot: 0,
          interviewKits: 0,
          outreachCampaigns: 0,
          directMessaging: 0,
        }
      });
      console.log('Created Free plan for recruiters.');
    } else {
      console.log('Free plan for recruiters already exists.');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
