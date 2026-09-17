import { API } from './api';

export const getProviderPlans = async () => {
  // Try /provider/plan/list first, fallback to /provider/plans
  try {
    const { data } = await API.get('/provider/plan/list');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const { data } = await API.get('/provider/plans');
    return Array.isArray(data) ? data : [];
  }
};

export const getMyPlan = async () => {
  const { data } = await API.get('/provider/my-plan');
  return data || {};
};

export const getCurrentSubscription = async () => {
  const { data } = await API.get('/provider/subscription/current');
  return data || {};
};

export const previewPlan = async (payload) => {
  const { data } = await API.post('/provider/plan/preview', payload);
  return data || {};
};

export const checkoutPlan = async (payload) => {
  const { data } = await API.post('/provider/plan/checkout', payload);
  return data || {};
};

export const confirmPayment = async (payload) => {
  const { data } = await API.post('/provider/plan/payment-success', payload);
  return data || {};
};

// New Provider Subscription System APIs
export const getActiveSubscriptionDetail = async () => {
  const { data } = await API.get('/provider/subscription/active');
  return data || {};
};

export const getProviderUsageMetrics = async () => {
  const { data } = await API.get('/provider/subscription/usage');
  return data || {};
};

export const calculateCustomPrice = async (payload) => {
  const { data } = await API.post('/provider/subscription/calculate-custom-price', payload);
  return data || {};
};

export const purchaseFixedPlan = async (payload) => {
  const { data } = await API.post('/provider/subscription/purchase-fixed', payload);
  return data || {};
};

export const purchaseCustomPlan = async (payload) => {
  const { data } = await API.post('/provider/subscription/purchase-custom', payload);
  return data || {};
};

export const confirmPaymentSuccess = async (payload) => {
  const { data } = await API.post('/provider/subscription/payment-success', payload);
  return data || {};
};

export const cancelSubscription = async () => {
  const { data } = await API.post('/payments/cancel-subscription');
  return data || {};
};

export const toggleAutoRenew = async (isAutoRenew) => {
  const { data } = await API.patch('/provider/subscription/auto-renew', { isAutoRenew });
  return data || {};
};
