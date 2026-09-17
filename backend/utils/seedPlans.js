const connectDB = require('../config/db');
require('dotenv').config();
const Plan = require('../models/Plan');

const seedRecruiterPlans = async () => {
  try {
    await connectDB();

    const basePlans = [
      {
        name: 'Free',
        slug: 'free',
        type: 'recruiter',
        audience: 'recruiter',
        planType: 'free',
        price: 0,
        billingCycle: 'monthly',
        duration: 30,
        sortOrder: 1,
        description: 'For new recruiters',
        features: ['Free job posting forever', 'Unlimited candidate search', 'Basic candidate access'],
        metadata: {
          bestFor: 'First-time recruiters'
        }
      },
      {
        name: 'AI Starter',
        slug: 'ai-starter',
        type: 'recruiter',
        audience: 'recruiter',
        planType: 'paid',
        price: 499,
        billingCycle: 'monthly',
        duration: 30,
        sortOrder: 2,
        isPopular: true,
        description: 'For startups & small teams',
        features: ['AI tools to find the right talent', 'Promote jobs & boost visibility', 'Automate outreach'],
        metadata: {
          bestFor: 'Startups',
          hireLimitText: 'Hire up to 10 positions/month',
          saveHoursText: 'Save 40+ hours/month'
        }
      },
      {
        name: 'AI Growth',
        slug: 'ai-growth',
        type: 'recruiter',
        audience: 'recruiter',
        planType: 'paid',
        price: 1499,
        billingCycle: 'monthly',
        duration: 30,
        sortOrder: 3,
        description: 'For growing companies',
        features: ['Advanced AI hiring tools', 'Get more quality applicants', 'Advanced analytics'],
        metadata: {
          bestFor: 'SMBs',
          hireLimitText: 'Hire up to 50 positions/month',
          saveHoursText: 'Save 120+ hours/month'
        }
      },
      {
        name: 'AI Business',
        slug: 'ai-business',
        type: 'recruiter',
        audience: 'recruiter',
        planType: 'paid',
        price: 4999,
        billingCycle: 'monthly',
        duration: 30,
        sortOrder: 4,
        description: 'For agencies & teams',
        features: ['Unlimited everything', 'Advanced automation', 'Priority support'],
        metadata: {
          bestFor: 'Agencies & Large Teams',
          hireLimitText: 'Unlimited hiring',
          saveHoursText: 'Save 300+ hours/month'
        }
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        type: 'recruiter',
        audience: 'recruiter',
        planType: 'custom',
        price: 9999,
        billingCycle: 'monthly',
        duration: 30,
        sortOrder: 5,
        description: 'For large enterprises',
        features: ['Custom solutions', 'Dedicated support', 'SLA & security'],
        metadata: {
          bestFor: 'Large Enterprises & Recruitment Firms'
        }
      }
    ];

    const quarterlyPlans = basePlans.map(plan => {
      let price = plan.price * 3;
      if (plan.price > 0) {
        price = Math.floor(price * 0.9); // 10% discount
      }
      return {
        ...plan,
        billingCycle: 'quarterly',
        duration: 90,
        price,
        slug: `${plan.slug}-quarterly`
      };
    });

    const yearlyPlans = basePlans.map(plan => {
      // Create yearly version with 20% discount (approx)
      let price = plan.price * 12;
      if (plan.price > 0) {
        price = Math.floor(price * 0.8);
      }
      return {
        ...plan,
        billingCycle: 'yearly',
        duration: 365,
        price,
        slug: `${plan.slug}-yearly`
      };
    });

    const allPlans = [...basePlans, ...quarterlyPlans, ...yearlyPlans];

    let inserted = 0;
    for (const planData of allPlans) {
      // Check if exists
      const existing = await Plan.findOne({ slug: planData.slug, type: 'recruiter' });
      if (!existing) {
        await Plan.create(planData);
        inserted++;
      } else {
        await Plan.updateOne({ _id: existing._id }, { $set: planData });
      }
    }

    console.log(`Successfully seeded ${inserted} new recruiter plans, updated existing ones.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedRecruiterPlans();
