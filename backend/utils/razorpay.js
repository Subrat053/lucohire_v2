const crypto = require('crypto');
const Razorpay = require('razorpay');
const prisma = require('../config/prisma');
/**
 * Get Razorpay configuration from AdminSettings DB
 * Keys stored: razorpay_key_id, razorpay_key_secret, razorpay_simulation_mode
 */
const getPaymentConfig = async () => {
  const settings = await prisma.adminSetting.findMany({ where: { category: 'payment' } });
  const config = {};
  settings.forEach(s => {
    config[s.key] = s.value;
  });
  return {
    keyId: process.env.RAZORPAY_KEY_ID || config.razorpay_key_id || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || config.razorpay_key_secret || '',
    simulationMode: process.env.RAZORPAY_SIMULATION_MODE === 'true' || config.razorpay_simulation_mode === true || config.razorpay_simulation_mode === 'true',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || config.razorpay_webhook_secret || '',
  };
};

/**
 * Create a Razorpay instance with current credentials
 */
const getRazorpayInstance = async () => {
  const config = await getPaymentConfig();
  if (!config.keyId || !config.keySecret) {
    throw new Error('Razorpay credentials not configured. Set them in Admin → Settings → Payment.');
  }
  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
};

/**
 * Verify Razorpay payment signature (HMAC SHA256)
 */
const verifyPaymentSignature = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const config = await getPaymentConfig();
  
  // If orderId starts with 'sub_', it's a subscription. The signature body for subscriptions is:
  // payment_id + '|' + subscription_id
  // Otherwise, it's a normal order:
  // order_id + '|' + payment_id
  let body;
  if (String(razorpay_order_id).startsWith('sub_')) {
    body = razorpay_payment_id + '|' + razorpay_order_id;
  } else {
    body = razorpay_order_id + '|' + razorpay_payment_id;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', config.keySecret)
    .update(body)
    .digest('hex');
  return expectedSignature === razorpay_signature;
};

module.exports = { getPaymentConfig, getRazorpayInstance, verifyPaymentSignature };
