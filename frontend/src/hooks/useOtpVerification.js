/**
 * useOtpVerification.js
 * Custom hook for managing OTP send, verify, and resend flows.
 * Handles both Firebase phone OTP (Indian +91) and email OTP (Resend).
 */

import { useState, useCallback, useRef } from 'react';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { API } from '../services/api';

export function useOtpVerification({ purpose, onSuccess }) {
  const [state, setState] = useState({
    loading: false,
    sending: false,
    verifying: false,
    resending: false,
    error: null,
    sent: false,
    verified: false,
    channel: null,      // 'phone' | 'email'
    maskedTarget: '',
    requiresFirebase: false,
    expiryMinutes: 5,
    resendRemaining: 3,
    attemptsRemaining: 5,
    resendCooldown: 0,  // seconds remaining on resend timer
  });

  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);
  const cooldownTimerRef = useRef(null);

  const startCooldownTimer = useCallback((seconds = 60) => {
    setState(s => ({ ...s, resendCooldown: seconds }));
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setState(s => {
        if (s.resendCooldown <= 1) {
          clearInterval(cooldownTimerRef.current);
          return { ...s, resendCooldown: 0 };
        }
        return { ...s, resendCooldown: s.resendCooldown - 1 };
      });
    }, 1000);
  }, []);

  // ─── Send OTP ───────────────────────────────────────────────────────────────
  const sendOtp = useCallback(async ({ phone, email } = {}) => {
    setState(s => ({ ...s, sending: true, error: null }));
    try {
      const res = await API.post(
        `/otp/send`,
        { purpose, phone, email }
      );

      const { channel, maskedTarget, requiresFirebase, expiryMinutes, resendRemaining } = res.data;

      setState(s => ({
        ...s,
        sending: false,
        sent: true,
        channel,
        maskedTarget,
        requiresFirebase,
        expiryMinutes: expiryMinutes || 5,
        resendRemaining: resendRemaining ?? 3,
        error: null,
      }));

      startCooldownTimer(60);

      // If phone + Firebase, initiate Firebase signInWithPhoneNumber
      if (requiresFirebase && phone) {
        await initFirebasePhoneAuth(phone);
      }

      return { success: true, channel, maskedTarget };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setState(s => ({ ...s, sending: false, error: msg }));
      return { success: false, error: msg };
    }
  }, [purpose, startCooldownTimer]);

  // ─── Firebase Phone Auth ────────────────────────────────────────────────────
  const initFirebasePhoneAuth = useCallback(async (phone) => {
    try {
      const auth = getAuth();
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
        });
      }
      const confirmation = await signInWithPhoneNumber(auth, phone, recaptchaVerifierRef.current);
      confirmationResultRef.current = confirmation;
    } catch (err) {
      console.error('[OTP] Firebase phone auth failed:', err.message);
      setState(s => ({ ...s, error: 'Failed to send SMS OTP. Please try email OTP instead.' }));
      throw err; // MUST rethrow so sendOtp knows it failed!
    }
  }, []);

  // ─── Verify OTP ─────────────────────────────────────────────────────────────
  const verifyOtp = useCallback(async ({ otp, target }) => {
    setState(s => ({ ...s, verifying: true, error: null }));
    try {
      let payload = { purpose, otp, target };

      // For Firebase phone auth: confirm with Firebase first, get idToken
      if (state.requiresFirebase && confirmationResultRef.current) {
        try {
          const credential = await confirmationResultRef.current.confirm(otp);
          const idToken = await credential.user.getIdToken();
          payload = { purpose, firebaseIdToken: idToken };
        } catch (fbErr) {
          setState(s => ({ ...s, verifying: false, error: 'Invalid SMS code. Please check and try again.' }));
          return { success: false };
        }
      }

      const res = await API.post(
        `/otp/verify`,
        payload
      );

      setState(s => ({ ...s, verifying: false, verified: true, error: null }));
      if (onSuccess) onSuccess();
      return { success: true };
    } catch (err) {
      const data = err.response?.data || {};
      const msg = data.message || 'Verification failed. Please try again.';
      setState(s => ({
        ...s,
        verifying: false,
        error: msg,
        attemptsRemaining: data.attemptsRemaining ?? s.attemptsRemaining,
      }));
      return { success: false, error: msg, code: data.code };
    }
  }, [purpose, state.requiresFirebase, onSuccess]);

  // ─── Resend OTP ─────────────────────────────────────────────────────────────
  const resendOtp = useCallback(async () => {
    if (state.resendCooldown > 0) return;
    setState(s => ({ ...s, resending: true, error: null }));
    try {
      const res = await API.post(
        `/otp/resend`,
        { purpose }
      );
      setState(s => ({
        ...s,
        resending: false,
        resendRemaining: res.data.resendRemaining ?? s.resendRemaining,
        error: null,
      }));
      startCooldownTimer(60);

      if (res.data.requiresFirebase) {
        const phone = res.data.maskedTarget; // Won't re-init, user already has firebase session
      }

      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend OTP.';
      setState(s => ({ ...s, resending: false, error: msg }));
      return { success: false, error: msg };
    }
  }, [purpose, state.resendCooldown, startCooldownTimer]);

  const reset = useCallback(() => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setState({
      loading: false, sending: false, verifying: false, resending: false,
      error: null, sent: false, verified: false, channel: null,
      maskedTarget: '', requiresFirebase: false, expiryMinutes: 5,
      resendRemaining: 3, attemptsRemaining: 5, resendCooldown: 0,
    });
    confirmationResultRef.current = null;
  }, []);

  return { ...state, sendOtp, verifyOtp, resendOtp, reset };
}
