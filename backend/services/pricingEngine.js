const { findPlanById } = require('./billingPersistenceService');
const prisma = require('../config/prisma');

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  AED: 'AED',
  EUR: '€',
  GBP: '£'
};

const round = (val) => Math.max(0, Math.round((Number(val) || 0) * 100) / 100);

/**
 * Get dynamic pricing details for a plan and country code.
 * 
 * @param {string|Object} planId - Plan Mongoose Document or ObjectId or string ID
 * @param {string} countryCode - 2-letter country code (e.g. 'IN', 'AE', 'US')
 * @returns {Promise<Object>} Price configuration object
 */
const getPlanPrice = async (planId, countryCode) => {
  if (!planId) {
    throw new Error('Plan ID or Document is required');
  }

  let plan;
  if (planId && typeof planId.toObject === 'function') {
    plan = planId;
  } else if (typeof planId === 'string' || (planId && typeof planId === 'object')) {
    plan = await findPlanById(planId);
  }

  if (!plan) {
    throw new Error('Plan not found');
  }

  const normCountry = String(countryCode || '').trim().toUpperCase();

  // Find country-specific pricing config in plan
  let countryPricingEntry = null;
  if (Array.isArray(plan.countryPricing) && normCountry) {
    countryPricingEntry = plan.countryPricing.find(
      (entry) => entry.countryCode === normCountry && entry.isActive !== false
    );
  }

  let response = {};

  if (countryPricingEntry) {
    const basePrice = countryPricingEntry.basePrice || 0;
    const discountedPrice = countryPricingEntry.discountedPrice || 0;
    const activePrice = discountedPrice > 0 ? discountedPrice : basePrice;
    const taxPercent = countryPricingEntry.taxPercent || 0;
    const isInclusive = countryPricingEntry.isTaxInclusive === true;

    let taxAmount = 0;
    let finalAmount = 0;

    if (isInclusive) {
      finalAmount = activePrice;
      taxAmount = round(finalAmount - (finalAmount / (1 + taxPercent / 100)));
    } else {
      taxAmount = round(activePrice * (taxPercent / 100));
      finalAmount = round(activePrice + taxAmount);
    }

    response = {
      countryCode: normCountry,
      countryName: countryPricingEntry.countryName || normCountry,
      currency: countryPricingEntry.currency,
      currencySymbol: countryPricingEntry.currencySymbol || CURRENCY_SYMBOLS[countryPricingEntry.currency] || countryPricingEntry.currency,
      basePrice,
      discountedPrice,
      taxName: countryPricingEntry.taxName || 'Tax',
      taxPercent,
      taxAmount,
      finalAmount
    };
  } else {
    // If not found in plan's countryPricing, return default plan pricing.
    // Check if there is a master configuration for this country to get defaults
    let countryConfig = null;
    if (normCountry) {
      countryConfig = await prisma.countryConfig.findFirst({ where: { countryCode: normCountry, isActive: true } });
    }

    const { getActiveBillingRule, resolveCountryGstPercent } = require('../utils/billingRuleUtils');
    const activeRule = await getActiveBillingRule();
    const billingRuleGst = resolveCountryGstPercent(normCountry, activeRule);

    const defaultCurrency = 'INR';
    const defaultCurrencySymbol = '₹';
    const taxName = countryConfig ? countryConfig.defaultTaxName : 'GST';
    
    const billingRuleHasCountry = activeRule && activeRule.countryGst && activeRule.countryGst.some(item => item.country.toUpperCase() === normCountry);
    const taxPercent = billingRuleHasCountry
      ? billingRuleGst
      : (countryConfig && countryConfig.defaultTaxPercent !== undefined)
        ? countryConfig.defaultTaxPercent
        : (plan.gstPercent !== undefined ? plan.gstPercent : billingRuleGst);

    const basePrice = plan.price || 0;
    const discountedPrice = plan.discountedPrice || 0;
    const activePrice = discountedPrice > 0 ? discountedPrice : basePrice;

    // Default plan is historically tax-exclusive
    const taxAmount = round(activePrice * (taxPercent / 100));
    const finalAmount = round(activePrice + taxAmount);

    response = {
      countryCode: normCountry || plan.country || 'IN',
      countryName: countryConfig ? countryConfig.countryName : (normCountry || 'India'),
      currency: defaultCurrency,
      currencySymbol: defaultCurrencySymbol,
      basePrice,
      discountedPrice,
      taxName,
      taxPercent,
      taxAmount,
      finalAmount
    };
  }

  return response;
};

module.exports = {
  getPlanPrice
};
