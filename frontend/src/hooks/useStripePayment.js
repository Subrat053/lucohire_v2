import { useState, useCallback } from 'react';
import { paymentAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * useStripePayment
 *
 * Handles the Stripe Checkout flow:
 *  1. Calls backend to create a Stripe Checkout Session
 *  2. In simulation mode: auto-completes and calls onSuccess
 *  3. In live mode: redirects the browser to Stripe's hosted checkout page
 *
 * After the user completes (or cancels) the Stripe Checkout, Stripe
 * redirects back to the plan page with ?payment=success&session_id=...
 * or ?payment=cancelled - the Plans page handles that via a useEffect.
 */
export default function useStripePayment() {
  const [loading, setLoading] = useState(false);

  const initiatePayment = useCallback(
    async ({ planId, onSuccess, onFailure, ...rest }) => {
      setLoading(true);
      try {
        // Build return URLs from current page location so Stripe redirects
        // back to the same plan page with status query params.
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        const params = new URLSearchParams(window.location.search || '');
        params.delete('payment');
        params.delete('session_id');

        const successParams = new URLSearchParams(params.toString());
        successParams.set('payment', 'success');
        // Do not use set() for session_id because it URL-encodes {} which breaks Stripe replacement
        const successUrl = `${origin}${pathname}?${successParams.toString()}&session_id={CHECKOUT_SESSION_ID}`;

        const cancelParams = new URLSearchParams(params.toString());
        cancelParams.set('payment', 'cancelled');
        const cancelUrl = `${origin}${pathname}?${cancelParams.toString()}`;
        const preferredCurrency = localStorage.getItem('locale_currency') || undefined;
        const preferredCountry = localStorage.getItem('locale_country') || undefined;

        const { data } = await paymentAPI.createOrder({
          planId,
          successUrl,
          cancelUrl,
          preferredCurrency,
          preferredCountry,
          ...rest,
        });

        // ---- Simulation mode: auto-completed on backend ----
        if (data.simulated) {
          toast.success('Plan activated! (Test / Simulation mode)');
          onSuccess?.({ simulated: true, payment: data.payment, profile: data.profile });
          setLoading(false);
          return;
        }

        // ---- Live Stripe mode: redirect to hosted checkout ----
        if (!data.sessionUrl) {
          toast.error('Could not create Stripe checkout session. Please try again.');
          onFailure?.('No session URL returned');
          setLoading(false);
          return;
        }

        // Redirect - loading spinner stays visible until the redirect happens
        window.location.href = data.sessionUrl;

        // Note: setLoading(false) is intentionally NOT called here because
        // the browser is navigating away. It will be reset on component mount.
      } catch (err) {
        console.error('Payment initiation error:', err);
        toast.error(err.response?.data?.message || 'Failed to initiate payment');
        onFailure?.(err.response?.data?.message || 'Payment initiation failed');
        setLoading(false);
      }
    },
    []
  );

  return { initiatePayment, loading };
}
