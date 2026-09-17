const Stripe = require('stripe');
const prisma = require('../config/prisma');

/**
 * Get Stripe configuration from AdminSettings DB
 * Keys stored: stripe_publishable_key, stripe_secret_key,
 *              stripe_webhook_secret, stripe_simulation_mode
 */
const getPaymentConfig = async () => {
  const settings = await prisma.adminSetting.findMany({ where: { category: 'payment' } });
  const dbConfig = {};
  settings.forEach(s => {
    if (s.value && String(s.value).trim()) {
      dbConfig[s.key] = String(s.value).trim();
    }
  });

  return {
    publishableKey: dbConfig.stripe_publishable_key || process.env.STRIPE_PUBLISHABLE_KEY || '',
    secretKey: dbConfig.stripe_secret_key || process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: dbConfig.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || '',
    simulationMode:
      dbConfig.stripe_simulation_mode === true ||
      dbConfig.stripe_simulation_mode === 'true' ||
      process.env.STRIPE_SIMULATION_MODE === 'true',
  };
};

/**
 * Create a Stripe instance with the current secret key
 * Throws if credentials are not configured.
 */
const getStripeInstance = async () => {
  const config = await getPaymentConfig();
  if (!config.secretKey) {
    throw new Error(
      'Payment configuration is not set. Please configure Stripe credentials in Admin → Payments or check your environment variables.'
    );
  }
  return Stripe(config.secretKey);
};

module.exports = { getPaymentConfig, getStripeInstance };
