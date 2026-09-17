/**
 * UnlockCandidateModal.jsx
 * Multi-step unlock flow:
 * Step 1: Plan check → shows upgrade CTA if no plan
 * Step 2: OTP verification
 * Step 3: Success → parent re-fetches full profile
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Lock, ShieldCheck, CreditCard, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import OtpVerificationModal from '../otp/OtpVerificationModal';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function UnlockCandidateModal({
  isOpen,
  onClose,
  onUnlocked,
  providerId,
  unlockRequired = {},
  recruiterUser = {},
}) {
  const [step, setStep] = useState('checking'); // checking | plan_required | otp | success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!isOpen) {
      setStep('checking');
      setError(null);
      setShowOtpModal(false);
      return;
    }

    // Determine initial step from unlockRequired flags
    if (unlockRequired.planRequired) {
      setStep('plan_required');
    } else if (unlockRequired.limitExceeded) {
      setStep('limit_exceeded');
    } else {
      setStep('otp');
    }
  }, [isOpen, unlockRequired]);

  const handleRequestUnlock = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        `${API_BASE}/recruiter/candidates/${providerId}/request-unlock`,
        { phone: recruiterUser.phone, email: recruiterUser.email },
        { headers: getAuthHeader() }
      );

      if (res.data.alreadyUnlocked) {
        setStep('success');
        if (onUnlocked) onUnlocked();
        return;
      }

      setStep('otp_modal');
      setShowOtpModal(true);
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'PLAN_REQUIRED') {
        setStep('plan_required');
      } else if (data?.code === 'LIMIT_EXCEEDED') {
        setStep('limit_exceeded');
      } else {
        setError(data?.message || 'Could not initiate unlock. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    setShowOtpModal(false);
    setStep('success');
    if (onUnlocked) onUnlocked();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* ── Plan Required ─────────────────────────────────────────────── */}
          {step === 'plan_required' && (
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade to Unlock</h2>
              <p className="text-gray-500 text-sm mb-6">
                A paid recruiter plan is required to view full candidate contact information.
              </p>
              <a
                href="/recruiter/plans"
                className="block w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 rounded-xl transition text-center shadow-md mb-3"
              >
                View Plans & Pricing
              </a>
              <button onClick={onClose} className="w-full text-gray-400 text-sm hover:text-gray-700 transition py-2">Cancel</button>
            </div>
          )}

          {/* ── Limit Exceeded ────────────────────────────────────────────── */}
          {step === 'limit_exceeded' && (
            <div className="text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Contact Limit Reached</h2>
              <p className="text-gray-500 text-sm mb-6">
                You have reached your plan's candidate contact limit. Upgrade to view more profiles.
              </p>
              <a
                href="/recruiter/plans"
                className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition text-center shadow-md mb-3"
              >
                Upgrade Plan
              </a>
              <button onClick={onClose} className="w-full text-gray-400 text-sm hover:text-gray-700 transition py-2">Cancel</button>
            </div>
          )}

          {/* ── OTP Step ─────────────────────────────────────────────────── */}
          {step === 'otp' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Lock className="w-7 h-7 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Unlock Candidate Profile</h2>
                  <p className="text-sm text-gray-500">OTP verification required to view contact details</p>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-indigo-700">
                  <strong>Why verify?</strong> To protect candidate privacy, we verify your identity before sharing contact information.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleRequestUnlock}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md mb-3"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</>
                  : <><ShieldCheck className="w-4 h-4" /> Send Verification Code</>
                }
              </button>

              <button onClick={onClose} className="w-full text-gray-400 text-sm hover:text-gray-700 transition py-2">Cancel</button>
            </div>
          )}

          {/* ── Success ──────────────────────────────────────────────────── */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Unlocked!</h2>
              <p className="text-gray-500 text-sm mb-6">
                You can now view the full contact details and resume.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition"
              >
                View Full Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OTP Verification Modal (shown after request-unlock succeeds) */}
      {showOtpModal && (
        <OtpVerificationModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onSuccess={handleOtpSuccess}
          purpose="unlock_profile"
          phone={recruiterUser.phone}
          email={recruiterUser.email}
          title="Verify to Unlock"
          description="Enter the OTP to complete profile unlock"
        />
      )}
    </>
  );
}
