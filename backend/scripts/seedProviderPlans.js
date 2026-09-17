const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Plan = require('../legacy-mongoose-models/Plan');

dotenv.config();

const providerPlans = [
  {
    name: 'Default Free Provider Plan',
    slug: 'provider-free-default',
    type: 'provider',
    audience: 'provider',
    planType: 'free',
    price: 0,
    priceMonthly: 0,
    billingCycle: 'yearly',
    gstPercent: 0,
    isDefaultFree: true,
    isProviderDefault: true,
    description: 'Default free plan assigned automatically on provider registration.',
    coverageType: 'pincode',
    maxSkills: 2,
    maxPincodes: 2,
    maxCities: 1,
    maxJobApplications: 5,
    visibilityLevel: 'basic',
    priorityWeight: 0,
    isActive: true,
    status: 'active',
    duration: 365,
    planCategory: 'default_free',
    usageResetCycle: 'monthly',
    features: [
      '2 free locations/pincodes coverage',
      '2 free skills category selection',
      '5 job applications per month',
      'Basic search visibility'
    ],
    sortOrder: 0
  },
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
    isProviderDefault: false,
    description: 'Show multiple skills in one pincode.',
    coverageType: 'pincode',
    maxSkills: 10,
    maxPincodes: 1,
    maxCities: 1,
    maxJobApplications: 20,
    visibilityLevel: 'basic',
    priorityWeight: 20,
    allowedSkills: 'multiple',
    allowedPincodes: 1,
    supportsWhatsappAlerts: true,
    supportsSmsAlerts: true,
    supportsPerformanceInsights: true,
    isActive: true,
    status: 'active',
    duration: 30,
    planCategory: 'multiple_skills',
    usageResetCycle: 'monthly',
    features: [
      'Multiple skills (up to 10)',
      '1 pincode coverage',
      '20 job applications per month',
      'Priority in search results',
      'WhatsApp + SMS alerts',
      'Performance insights'
    ],
    sortOrder: 1
  },
  {
    name: 'One Locality Top',
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
    isProviderDefault: false,
    description: 'Top position in selected locality (pincode).',
    coverageType: 'pincode',
    maxSkills: 1,
    maxPincodes: 1,
    maxCities: 1,
    maxJobApplications: 30,
    visibilityLevel: 'pincode_top',
    priorityWeight: 40,
    allowedSkills: 1,
    allowedPincodes: 1,
    supportsWhatsappAlerts: true,
    supportsSmsAlerts: true,
    isActive: true,
    status: 'active',
    duration: 30,
    planCategory: 'locality_top',
    usageResetCycle: 'monthly',
    features: [
      'Top position in selected pincode/locality',
      '1 skill category',
      '30 job applications per month',
      'Priority in search results',
      'More profile views',
      'WhatsApp + SMS alerts'
    ],
    sortOrder: 2
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
    isProviderDefault: false,
    isPopular: true,
    description: 'Top position in entire city.',
    coverageType: 'city',
    maxSkills: 10,
    maxPincodes: 50,
    maxCities: 1,
    maxJobApplications: 50,
    visibilityLevel: 'city_top',
    priorityWeight: 70,
    allowedSkills: 'multiple',
    allowedPincodes: 'all_city',
    allowedCities: 1,
    isActive: true,
    status: 'active',
    duration: 30,
    planCategory: 'city_top',
    usageResetCycle: 'monthly',
    features: [
      'Top position in entire city',
      'Multiple skills (up to 10)',
      'All pincodes in one city',
      '50 job applications per month',
      'Priority in search results',
      'More profile views'
    ],
    sortOrder: 3
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
    isProviderDefault: false,
    description: 'Top position across country.',
    coverageType: 'country',
    maxSkills: 20,
    maxPincodes: 1000,
    maxCities: 100,
    maxJobApplications: 100,
    visibilityLevel: 'country_top',
    priorityWeight: 100,
    allowedSkills: 'multiple',
    allowedPincodes: 'country',
    supportsWhatsappAlerts: true,
    supportsSmsAlerts: true,
    isActive: true,
    status: 'active',
    duration: 30,
    planCategory: 'country_top',
    usageResetCycle: 'monthly',
    features: [
      'Top position across country',
      'Multiple skills (up to 20)',
      '100 job applications per month',
      'Highest priority in search',
      'Maximum profile visibility',
      'WhatsApp + SMS alerts'
    ],
    sortOrder: 4
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
    isProviderDefault: false,
    description: 'Create your own plan as per your need.',
    coverageType: 'custom',
    visibilityLevel: 'custom',
    priorityWeight: 0,
    allowedSkills: 'multiple',
    allowedCities: 'multiple',
    isActive: true,
    status: 'active',
    duration: 30,
    planCategory: 'custom',
    usageResetCycle: 'monthly',
    isCustomisable: true,
    features: [
      'Choose multiple cities',
      'Choose multiple skills',
      'Set visibility level',
      'Flexible duration',
      'Best for businesses'
    ],
    customConfig: {
      allowSkillSelection: true,
      allowCitySelection: true,
      allowPincodeSelection: true,
      allowVisibilitySelection: true,
      allowDurationSelection: true,
      minSkills: 1,
      maxSkills: 15,
      minCities: 1,
      maxCities: 10,
      minPincodes: 1,
      maxPincodes: 50,
      minDurationMonths: 1,
      maxDurationMonths: 12
    },
    sortOrder: 5
  }
];

const seedProviderPlans = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // First unset isProviderDefault for everything if we're doing a clean set
    await Plan.updateMany({ type: 'provider' }, { $set: { isProviderDefault: false } });

    for (const planData of providerPlans) {
      // Find by slug and duration to see if it exists
      const existingPlan = await Plan.findOne({
        slug: planData.slug,
        type: 'provider',
        duration: planData.duration
      });

      if (existingPlan) {
        console.log(`Plan ${planData.slug} already exists. Updating details...`);
        await Plan.updateOne({ _id: existingPlan._id }, { $set: planData });
      } else {
        console.log(`Creating plan ${planData.slug}...`);
        await Plan.create(planData);
      }
    }

    console.log('Provider plans seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding provider plans:', error);
    process.exit(1);
  }
};

seedProviderPlans();
