const prisma = require('../../config/prisma');
const { withLegacyId, withLegacyIds } = require('../../utils/prismaResponse');
const { findPlan } = require('../billingPersistenceService');
const { searchPlaces, getPlaceDetails } = require('../../services/googlePlacesService');
const { getActiveBillingRule, resolveCountryGstPercent } = require('../../utils/billingRuleUtils');

const DEFAULT_PRICING = {
  locality: {
    1: 300,
    2: 500,
    3: 700,
    4: 800
  },
  city: {
    'trial': 250,
    1: 350,
    3: 900
  },
  country: {
    6: 3500,
    12: 6000
  }
};

class CustomPlanService {
  async getPricingConfig() {
    try {
      const setting = await prisma.adminSetting.findUnique({ where: { key: 'customise_plan_pricing' } });
      return setting?.value || DEFAULT_PRICING;
    } catch (_) {
      return DEFAULT_PRICING;
    }
  }

  async getOptions(userId) {
    const categories = await prisma.skillCategory.findMany({ where: { isActive: true } });
    let skills = [];
    categories.forEach(cat => {
      if (Array.isArray(cat.skills)) {
        cat.skills.forEach(skill => {
          if (skill.isActive && !skills.includes(skill.name)) {
            skills.push(skill.name);
          }
        });
      }
    });

    if (skills.length === 0) {
      skills = [
        'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Driver', 'Cook',
        'Welder', 'Mason', 'AC Technician', 'CCTV Installer', 'Tiler',
        'Interior Designer', 'UI/UX Designer', 'Graphic Designer', 'Web Developer',
        'Mobile Developer', 'Content Writer', 'Digital Marketer', 'Accountant',
        'Data Entry Operator', 'Receptionist', 'Security Guard', 'Housekeeping',
        'Nurse', 'Caretaker', 'Tailor', 'Beautician', 'Yoga Trainer', 'Tutor',
        'Video Editing'
      ];
    }

    const pastCustomPlans = withLegacyIds(await prisma.customVisibilityPlan.findMany({
      where: { providerId: String(userId), status: 'active' },
    }));

    const trialAvailable = pastCustomPlans.length === 0;

    return {
      skills: skills.sort(),
      durations: {
        locality: Array.from({ length: 12 }, (_, index) => {
          const months = index + 1;
          return { months, label: `${months} Month${months > 1 ? 's' : ''}` };
        }),
        city: [
          ...(trialAvailable ? [{ months: 1, label: '1 Month (Trial)', isTrial: true }] : []),
          ...Array.from({ length: 12 }, (_, index) => {
            const months = index + 1;
            return { months, label: `${months} Month${months > 1 ? 's' : ''}` };
          })
        ],
        country: Array.from({ length: 12 }, (_, index) => {
          const months = index + 1;
          return { months, label: `${months} Month${months > 1 ? 's' : ''}` };
        })
      },
      trialAvailable
    };
  }

  async getSuggestions(input, type, userLat, userLng) {
    if (!input || !String(input).trim()) return [];

    const options = {};
    if (userLat && userLng) {
      options.lat = Number(userLat);
      options.lng = Number(userLng);
      options.radiusMeters = 50000;
    }

    if (type === 'city') {
      options.types = '(cities)';
    } else if (type === 'country') {
      options.types = 'country';
    } else if (type === 'locality') {
      options.types = 'geocode';
    }

    return await searchPlaces(input, options);
  }

  async getDetails(placeId, type) {
    const details = await getPlaceDetails(placeId);
    const normalized = {
      placeId: details.placeId,
      lat: details.latitude,
      lng: details.longitude,
      country: details.country,
      name: details.name,
      formattedAddress: details.formattedAddress
    };

    if (type === 'locality') {
      normalized.locality = details.name;
      normalized.city = details.city;
      normalized.state = details.state;
      normalized.pincode = details.postalCode || '';
    } else if (type === 'city') {
      normalized.city = details.city || details.name;
      normalized.state = details.state;
    } else if (type === 'country') {
      normalized.countryCode = details.state || '';
    }

    return normalized;
  }

  async calculatePrice(items, country) {
    const pricingConfig = await this.getPricingConfig();
    let subtotal = 0;
    const itemsWithPricing = [];

    for (const item of items) {
      const { skillId, skillName, visibilityType, locations = [] } = item;
      let itemSubtotal = 0;
      const locationsWithPricing = [];

      for (const loc of locations) {
        const { durationMonths, isTrial } = loc;
        const duration = Number(durationMonths);
        let price = 0;

        const typePrices = pricingConfig[visibilityType] || DEFAULT_PRICING[visibilityType];
        
        if (isTrial && typePrices['trial']) {
          price = typePrices['trial'];
        } else if (typePrices[duration]) {
          price = typePrices[duration];
        } else {
          const baseRate = typePrices[1] || (visibilityType === 'country' ? 600 : visibilityType === 'city' ? 350 : 300);
          price = baseRate * duration;
        }

        itemSubtotal += price;
        locationsWithPricing.push({
          ...loc,
          price
        });
      }

      subtotal += itemSubtotal;
      itemsWithPricing.push({
        skillId,
        skillName,
        visibilityType,
        locations: locationsWithPricing,
        subtotal: itemSubtotal
      });
    }

    const activeRule = await getActiveBillingRule();
    const gstPercent = resolveCountryGstPercent(country, activeRule);
    const gstAmount = Math.round(subtotal * (gstPercent / 100));
    const discountAmount = 0;
    const totalAmount = subtotal + gstAmount;
    const savingsAmount = Math.round(subtotal * 0.15);

    return {
      lineItems: itemsWithPricing,
      subtotal,
      gstPercent,
      gstAmount,
      discountAmount,
      totalAmount,
      savingsAmount
    };
  }

  async createPendingPlan(userId, items, selectedGoals, reqUser) {
    const planObj = await findPlan({ slug: 'customise-plan', isActive: true });
    if (!planObj) {
      throw new Error('Customise Plan template not found in system.');
    }

    const country = reqUser?.country || 'IN';
    const calculated = await this.calculatePrice(items, country);
    const subtotal = calculated.subtotal;
    const gstPercent = calculated.gstPercent;
    const gstAmount = calculated.gstAmount;
    const totalAmount = calculated.totalAmount;

    // Create CustomVisibilityPlan pending record
    const customPlan = withLegacyId(await prisma.customVisibilityPlan.create({
      data: {
        providerId: String(userId),
        selectedGoals,
        items: calculated.lineItems,
        subtotal,
        gstPercent,
        gstAmount,
        totalAmount,
        status: 'pending',
      },
    }));

    const flatSkills = Array.from(new Set(items.map(i => i.skillName)));
    const flatLocalities = [];
    const flatCities = [];

    items.forEach(item => {
      if (item.visibilityType === 'locality') {
        item.locations.forEach(loc => {
          if (loc.locality && !flatLocalities.includes(loc.locality)) {
            flatLocalities.push(loc.locality);
          }
        });
      } else if (item.visibilityType === 'city') {
        item.locations.forEach(loc => {
          if (loc.city && !flatCities.includes(loc.city)) {
            flatCities.push(loc.city);
          }
        });
      }
    });

    const customConfig = {
      localities: items.filter(i => i.visibilityType === 'locality').flatMap(item => 
        item.locations.map(loc => ({
          skill: item.skillName,
          locality: loc.locality || loc.name,
          durationMonths: loc.durationMonths,
          price: loc.price
        }))
      ),
      cities: items.filter(i => i.visibilityType === 'city').flatMap(item => 
        item.locations.map(loc => ({
          skill: item.skillName,
          city: loc.city || loc.name,
          durationMonths: loc.durationMonths,
          price: loc.price,
          isTrial: loc.isTrial
        }))
      ),
      countries: items.filter(i => i.visibilityType === 'country').flatMap(item => 
        item.locations.map(loc => ({
          skill: item.skillName,
          country: loc.country || loc.name,
          durationMonths: loc.durationMonths,
          price: loc.price
        }))
      ),
      multipleSkills: items.filter(i => i.visibilityType === 'multipleSkills').map(item => item.skillName),
      subtotal,
      gstAmount,
      totalAmount
    };

    const { checkoutPlan } = require('../../controllers/providerPlanController');
    const mockReq = {
      user: reqUser,
      body: {
        planId: planObj._id,
        durationMonths: 1,
        customAmount: subtotal,
        selectedSkills: flatSkills,
        selectedPincodes: flatLocalities,
        selectedCities: flatCities,
        customConfig
      }
    };

    let subscriptionCreated = null;
    let checkoutResponse = null;

    const mockRes = {
      status: (code) => {
        return {
          json: (err) => {
            throw new Error(err.message || 'Checkout failed');
          }
        };
      },
      json: (data) => {
        subscriptionCreated = data.subscription;
        checkoutResponse = data.checkout;
      }
    };

    await checkoutPlan(mockReq, mockRes);

    if (subscriptionCreated) {
      Object.assign(customPlan, withLegacyId(await prisma.customVisibilityPlan.update({
        where: { id: customPlan._id },
        data: { subscriptionId: String(subscriptionCreated._id) },
      })));
    }

    return {
      customPlan,
      subscription: subscriptionCreated,
      checkout: checkoutResponse
    };
  }

  async getCurrentPlan(userId) {
    const row = await prisma.customVisibilityPlan.findFirst({
      where: { providerId: String(userId), status: 'active' },
      include: { subscriptionIdRecord: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    const result = withLegacyId(row);
    result.subscriptionId = withLegacyId(result.subscriptionIdRecord);
    delete result.subscriptionIdRecord;
    return result;
  }
}

module.exports = new CustomPlanService();
