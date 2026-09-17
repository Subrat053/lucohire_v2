/**
 * billingRuleUtils.js
 *
 * Pure utility functions for billing rule fetching and calculation.
 * Import these wherever a payment/subscription is created to ensure
 * consistent calculation across the codebase.
 */

const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

const fmt = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Fetch the active billing rule.
 * If no BillingRule exists yet, seeds one from legacy AdminCommissionSetting keys.
 *
 * @returns {Promise<Object>} Lean billing rule object
 */
const getActiveBillingRule = async () => {
  let rule = withLegacyId(await prisma.billingRule.findFirst({
    where: { isActive: true },
    orderBy: { version: 'desc' },
  }));
  if (rule) return rule;

  // ── Legacy migration: seed first BillingRule from old flat keys ─────────────
  const [commissionDoc, minWithdrawalDoc, fixedFeeDoc, referralPctDoc] = await Promise.all([
    prisma.adminCommissionSetting.findUnique({ where: { key: 'platform_commission_percentage' } }),
    prisma.adminCommissionSetting.findUnique({ where: { key: 'min_withdrawal_amount' } }),
    prisma.adminCommissionSetting.findUnique({ where: { key: 'fixed_withdrawal_fee' } }),
    prisma.adminSetting.findUnique({ where: { key: 'user_referral_commission_percentage' } }),
  ]);

  const platformCommissionPercentage = commissionDoc?.value ?? 30;
  const minPayoutThreshold = minWithdrawalDoc?.value ?? 500;
  const fixedWithdrawalFee = fixedFeeDoc?.value ?? 0;
  const oldReferralPct = referralPctDoc?.value ?? 0;

  return withLegacyId(await prisma.billingRule.create({
    data: {
      platformCommissionPercentage,
      referralEnabled: oldReferralPct > 0,
      referralCommissionType: 'percentage',
      referralCommissionValue: oldReferralPct,
      referralMaxCap: 0,
      cashbackEnabled: false,
      cashbackType: 'percentage',
      cashbackValue: 0,
      cashbackMaxCap: 0,
      cashbackMinTransactionAmount: 0,
      minPayoutThreshold,
      fixedWithdrawalFee,
      version: 1,
      effectiveFrom: new Date(),
      isActive: true,
      changeReason: 'Auto-seeded from legacy settings',
      legacyUserReferralCommissionPercentage: oldReferralPct,
    },
  }));
};

/**
 * Build a compact snapshot suitable for embedding in Payment/UserSubscription docs.
 *
 * @param {Object} rule - Active BillingRule object
 * @returns {Object} billingRuleSnapshot
 */
const buildBillingRuleSnapshot = (rule) => ({
  ruleId: rule._id,
  version: rule.version,

  platformCommissionPercentage: rule.platformCommissionPercentage,

  referralEnabled: rule.referralEnabled,
  referralCommissionType: rule.referralCommissionType,
  referralCommissionValue: rule.referralCommissionValue,
  referralMaxCap: rule.referralMaxCap,

  cashbackEnabled: rule.cashbackEnabled,
  cashbackType: rule.cashbackType,
  cashbackValue: rule.cashbackValue,
  cashbackMaxCap: rule.cashbackMaxCap,
  cashbackMinTransactionAmount: rule.cashbackMinTransactionAmount,
  
  countryGst: rule.countryGst || [],
});

/**
 * Resolve the GST percentage for a given country from a billing rule.
 * Falls back to 18% if not found.
 *
 * @param {string} country - The country code (e.g. 'IN', 'US')
 * @param {Object} rule - BillingRule doc or snapshot object
 * @returns {number} GST percentage
 */
const resolveCountryGstPercent = (country, rule) => {
  const normCountry = String(country || '').trim().toUpperCase();
  if (!normCountry || !rule || !Array.isArray(rule.countryGst)) {
    return 0; // Default fallback GST is 0%
  }
  const match = rule.countryGst.find(item => item.country.toUpperCase() === normCountry);
  return match ? (Number(match.gstPercent) || 0) : 0;
};

/**
 * Calculate all billing amounts for a given transaction.
 *
 * IMPORTANT — Always pass the SNAPSHOT, not the current active rule,
 * when recalculating historical transactions.
 *
 * @param {number} transactionAmount  - Gross booking/subscription amount
 * @param {Object} rule               - BillingRule doc or snapshot object
 * @param {Object} [opts]
 * @param {number} [opts.eligibleReferralBase] - Override base for referral % (defaults to transactionAmount)
 * @returns {{
 *   platformCommissionAmount: number,
 *   providerShareAmount: number,
 *   referralCommissionAmount: number,
 *   cashbackAmount: number,
 *   netPlatformRevenue: number,
 *   isNetNegative: boolean
 * }}
 */
const calculateBillingAmounts = (transactionAmount, rule, opts = {}) => {
  const amount = Number(transactionAmount) || 0;

  // ── Platform Commission ───────────────────────────────────────────────────
  const platformCommissionAmount = fmt(amount * ((rule.platformCommissionPercentage || 0) / 100));
  const providerShareAmount = fmt(amount - platformCommissionAmount);

  // ── Referral Commission ───────────────────────────────────────────────────
  let referralCommissionAmount = 0;
  if (rule.referralEnabled) {
    const base = opts.eligibleReferralBase != null ? Number(opts.eligibleReferralBase) : amount;
    if (rule.referralCommissionType === 'percentage') {
      referralCommissionAmount = fmt(base * ((rule.referralCommissionValue || 0) / 100));
    } else {
      referralCommissionAmount = fmt(rule.referralCommissionValue || 0);
    }
    if (rule.referralMaxCap > 0 && referralCommissionAmount > rule.referralMaxCap) {
      referralCommissionAmount = fmt(rule.referralMaxCap);
    }
  }

  // ── Cashback ─────────────────────────────────────────────────────────────
  let cashbackAmount = 0;
  if (rule.cashbackEnabled) {
    const minTx = Number(rule.cashbackMinTransactionAmount || 0);
    if (amount >= minTx) {
      if (rule.cashbackType === 'percentage') {
        cashbackAmount = fmt(amount * ((rule.cashbackValue || 0) / 100));
      } else {
        cashbackAmount = fmt(rule.cashbackValue || 0);
      }
      if (rule.cashbackMaxCap > 0 && cashbackAmount > rule.cashbackMaxCap) {
        cashbackAmount = fmt(rule.cashbackMaxCap);
      }
    }
  }

  // ── Net Platform Revenue ──────────────────────────────────────────────────
  const netPlatformRevenue = fmt(platformCommissionAmount - referralCommissionAmount - cashbackAmount);

  return {
    platformCommissionAmount,
    providerShareAmount,
    referralCommissionAmount,
    cashbackAmount,
    netPlatformRevenue,
    isNetNegative: netPlatformRevenue < 0,
  };
};

module.exports = {
  getActiveBillingRule,
  buildBillingRuleSnapshot,
  calculateBillingAmounts,
  resolveCountryGstPercent,
};
