const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
const Plan = require('../models/Plan');
const User = require('../models/User');
const recruiterPlanService = require('../services/recruiterPlanService');

const RAZORPAY_RECRUITER_PLAN_MAP = {
  'recruiter-basic-monthly': 'plan_TMtucG9tlEEh8R',
  'recruiter-basic-quarterly': 'plan_TMtvJKGG6vjyM6',
  'recruiter-basic-yearly': 'plan_TMtvITjPZfis21',

  'recruiter-pro-monthly': 'plan_TMtwYFORTX4bTR',
  'recruiter-pro-quarterly': 'plan_TMtx0nbXpO0rmZ',
  'recruiter-pro-yearly': 'plan_TMtxTX56eYWq17',

  'recruiter-max-monthly': 'plan_TMty7Zb2PNIsWl',
  'recruiter-max-quarterly': 'plan_TMtyjIOrd6IhQE',
  'recruiter-max-yearly': 'plan_TMtz7A6GEEh308', 
};

const Razorpay = require('razorpay');

const testCheckout = async () => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    for (const [slug, planId] of Object.entries(RAZORPAY_RECRUITER_PLAN_MAP)) {
      try {
        const res = await razorpay.plans.fetch(planId);
        console.log(`✅ ${slug}: ${planId} found!`);
      } catch (err) {
        console.error(`❌ ${slug}: ${planId} failed - ${err.error?.description || err.message}`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
};

testCheckout();
