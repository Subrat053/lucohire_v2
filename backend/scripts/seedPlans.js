const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Plan = require('../legacy-mongoose-models/Plan');

dotenv.config();

const providerPlans = [
  {
    name: 'Add Multiple Skills',
    slug: 'add-multiple-skills',
    type: 'provider',
    audience: 'provider',
    planType: 'paid',
    price: 300,
    priceMonthly: 300,
    billingCycle: 'monthly',
    gstPercent: 18,
    isDefaultFree: false,
    description: 'Show multiple skills in one pincode.',
    coverageType: 'pincode',
    maxSkills: 10,
    maxPincodes: 1,
    visibilityLevel: 'basic',
    priorityWeight: 20,
    allowedSkills: 'multiple',
    allowedPincodes: 1,
    supportsWhatsappAlerts: true,
    supportsSmsAlerts: true,
    supportsPerformanceInsights: true,
    features: [
      'Multiple skills',
      '1 pincode coverage',
      'Priority in search results',
      'WhatsApp + SMS alerts',
      'Performance insights'
    ],
    sortOrder: 1,
    isActive: true
  },
  {
    name: 'One Pincode Top',
    slug: 'one-pincode-top',
    type: 'provider',
    audience: 'provider',
    planType: 'paid',
    price: 299,
    priceMonthly: 299,
    oldMonthlyPrice: 499,
    discountedPrice: 499,
    billingCycle: 'monthly',
    gstPercent: 18,
    isDefaultFree: false,
    description: 'Top position in selected pincode.',
    coverageType: 'pincode',
    maxSkills: 1,
    maxPincodes: 1,
    visibilityLevel: 'pincode_top',
    priorityWeight: 40,
    allowedSkills: 1,
    allowedPincodes: 1,
    supportsWhatsappAlerts: true,
    supportsSmsAlerts: true,
    features: [
      'Top position in selected pincode',
      '1 skill category',
      'Priority in search results',
      'More profile views',
      'WhatsApp + SMS alerts'
    ],
    sortOrder: 2,
    isActive: true
  },
  {
    name: 'Top in City',
    slug: 'top-in-city',
    type: 'provider',
    audience: 'provider',
    planType: 'paid',
    price: 499,
    priceMonthly: 499,
    oldMonthlyPrice: 799,
    discountedPrice: 799,
    billingCycle: 'monthly',
    gstPercent: 18,
    isDefaultFree: false,
    isPopular: true,
    description: 'Top position in entire city.',
    coverageType: 'city',
    maxSkills: 10,
    maxCities: 1,
    visibilityLevel: 'city_top',
    priorityWeight: 70,
    allowedSkills: 'multiple',
    allowedPincodes: 'all_city',
    allowedCities: 1,
    features: [
      'Top position in entire city',
      'Multiple skills',
      'All pincodes in one city',
      'Priority in search results',
      'More profile views'
    ],
    sortOrder: 3,
    isActive: true
  },
  {
    name: 'Show Top in Country',
    slug: 'show-top-in-country',
    type: 'provider',
    audience: 'provider',
    planType: 'paid',
    price: 2999,
    priceMonthly: 2999,
    oldMonthlyPrice: 4999,
    discountedPrice: 4999,
    billingCycle: 'monthly',
    gstPercent: 18,
    isDefaultFree: false,
    description: 'Top position across country.',
    coverageType: 'country',
    maxSkills: 20,
    visibilityLevel: 'country_top',
    priorityWeight: 100,
    allowedSkills: 'multiple',
    allowedPincodes: 'country',
    supportsWhatsappAlerts: true,
    supportsSmsAlerts: true,
    features: [
      'Top position across country',
      'Multiple skills',
      'Highest priority in search',
      'Maximum profile visibility',
      'WhatsApp + SMS alerts'
    ],
    sortOrder: 4,
    isActive: true
  },
  {
    name: 'Customise Plan',
    slug: 'customise-plan',
    type: 'provider',
    audience: 'provider',
    planType: 'custom',
    price: 0,
    priceMonthly: 0,
    billingCycle: 'custom',
    gstPercent: 18,
    isDefaultFree: false,
    description: 'Create your own plan as per your need.',
    coverageType: 'custom',
    visibilityLevel: 'custom',
    priorityWeight: 0, // Admin configurable
    allowedSkills: 'multiple',
    allowedCities: 'multiple',
    features: [
      'Choose multiple cities',
      'Choose multiple skills',
      'Set visibility level',
      'Flexible duration',
      'Best for businesses'
    ],
    sortOrder: 5,
    isActive: true
  }
];


const recruiterPlans = [
  {
    name: 'Free Plan',
    slug: 'free',
    code: 'RECRUITER_FREE',
    type: 'recruiter',
    audience: 'recruiter',
    planType: 'free',
    price: 0,
    priceMonthly: 0,
    contactLimit: 5,
    unlockCredits: 2,
    isDefaultFree: true,
    description: 'View first 5 candidate contacts for FREE.',
    features: ['View first 5 candidate contacts for FREE'],
    sortOrder: 1,
    isActive: true,
    duration: 30,
    durationDays: 30,
    billingCycle: 'monthly',
    gstPercent: 0,
  },
  // Starter Monthly (30 days)
  {
    name: 'Starter (10 Contacts)',
    slug: 'starter',
    code: 'RECRUITER_STARTER_30',
    type: 'recruiter',
    audience: 'recruiter',
    planType: 'paid',
    price: 500,
    priceMonthly: 500,
    contactLimit: 10,
    unlockCredits: 10,
    isDefaultFree: false,
    isPopular: true,
    description: 'View & download 10 candidate contacts monthly.',
    features: ['View & download 10 candidate contacts'],
    sortOrder: 2,
    isActive: true,
    duration: 30,
    durationDays: 30,
    billingCycle: 'monthly',
    gstPercent: 18,
  },
  // Starter 3 Monthly (90 days)
  {
    name: 'Starter (30 Contacts)',
    slug: 'starter',
    code: 'RECRUITER_STARTER_90',
    type: 'recruiter',
    audience: 'recruiter',
    planType: 'paid',
    price: 1425,
    priceMonthly: 500,
    contactLimit: 30,
    unlockCredits: 30,
    isDefaultFree: false,
    description: 'View & download 30 candidate contacts.',
    features: ['View & download 30 candidate contacts'],
    sortOrder: 2,
    isActive: true,
    duration: 90,
    durationDays: 90,
    billingCycle: 'quarterly',
    gstPercent: 18,
  },
  // Starter Yearly (365 days)
  {
    name: 'Starter (120 Contacts)',
    slug: 'starter',
    code: 'RECRUITER_STARTER_365',
    type: 'recruiter',
    audience: 'recruiter',
    planType: 'paid',
    price: 4867,
    priceMonthly: 500,
    contactLimit: 120,
    unlockCredits: 120,
    isDefaultFree: false,
    description: 'View & download 120 candidate contacts yearly.',
    features: ['View & download 120 candidate contacts'],
    sortOrder: 2,
    isActive: true,
    duration: 365,
    durationDays: 365,
    billingCycle: 'yearly',
    gstPercent: 18,
  },
  // Business Monthly (30 days)
  {
    name: 'Business (50 Contacts)',
    slug: 'business',
    code: 'RECRUITER_BUSINESS_30',
    type: 'recruiter',
    audience: 'recruiter',
    planType: 'paid',
    price: 1000,
    priceMonthly: 1000,
    contactLimit: 50,
    unlockCredits: 50,
    isDefaultFree: false,
    description: 'View & download 50 candidate contacts monthly.',
    features: ['View & download 50 candidate contacts'],
    sortOrder: 3,
    isActive: true,
    duration: 30,
    durationDays: 30,
    billingCycle: 'monthly',
    gstPercent: 18,
  },
  // Business 3 Monthly (90 days)
  {
    name: 'Business (150 Contacts)',
    slug: 'business',
    code: 'RECRUITER_BUSINESS_90',
    type: 'recruiter',
    audience: 'recruiter',
    planType: 'paid',
    price: 2850,
    priceMonthly: 1000,
    contactLimit: 150,
    unlockCredits: 150,
    isDefaultFree: false,
    description: 'View & download 150 candidate contacts.',
    features: ['View & download 150 candidate contacts'],
    sortOrder: 3,
    isActive: true,
    duration: 90,
    durationDays: 90,
    billingCycle: 'quarterly',
    gstPercent: 18,
  },
  // Business Yearly (365 days)
  {
    name: 'Business (600 Contacts)',
    slug: 'business',
    code: 'RECRUITER_BUSINESS_365',
    type: 'recruiter',
    audience: 'recruiter',
    planType: 'paid',
    price: 9733,
    priceMonthly: 1000,
    contactLimit: 600,
    unlockCredits: 600,
    isDefaultFree: false,
    description: 'View & download 600 candidate contacts yearly.',
    features: ['View & download 600 candidate contacts'],
    sortOrder: 3,
    isActive: true,
    duration: 365,
    durationDays: 365,
    billingCycle: 'yearly',
    gstPercent: 18,
  },
  // Customise Plan
  {
    name: 'Customise Plan',
    slug: 'custom',
    code: 'RECRUITER_CUSTOM',
    type: 'recruiter',
    audience: 'recruiter',
    planType: 'custom',
    price: 0,
    priceMonthly: 0,
    contactLimit: 0,
    unlockCredits: 0,
    isDefaultFree: false,
    description: 'Create a plan as per your requirements.',
    features: ['Create a plan as per your requirements'],
    sortOrder: 4,
    isActive: true,
    duration: 30,
    durationDays: 30,
    billingCycle: 'custom',
    gstPercent: 18,
  },
];

const seedPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clean up legacy plans with old slugs
    await Plan.deleteMany({
      type: 'recruiter',
      slug: { $in: ['recruiter-free', 'recruiter-10-contacts', 'recruiter-50-contacts', 'recruiter-custom'] }
    });

    const allPlans = [...providerPlans, ...recruiterPlans];

    // Clean up any existing plans that share codes to avoid duplicate key errors on code
    const codesToClean = allPlans.map(p => p.code).filter(Boolean);
    await Plan.deleteMany({ code: { $in: codesToClean } });

    for (const planData of allPlans) {
      const existingPlan = await Plan.findOne({
        slug: planData.slug,
        type: planData.type,
        duration: planData.duration
      });
      if (existingPlan) {
        console.log(`Plan ${planData.slug} (${planData.duration} days) already exists. Updating...`);
        await Plan.updateOne({ _id: existingPlan._id }, { $set: planData });
      } else {
        console.log(`Creating plan ${planData.slug} (${planData.duration} days)...`);
        await Plan.create(planData);
      }
    }

    console.log('Plans seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
};

seedPlans();
