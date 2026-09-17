/**
 * OtpVerificationModal.jsx
 * 6-digit OTP input modal with:
 * - Auto-focus next input on entry
 * - Paste support across all 6 boxes
 * - Resend countdown timer
 * - Firebase phone auth + email OTP support
 * - Attempts remaining display
 * - Mobile responsive
 */

import { useState, useRef, useEffect } from 'react';
import { X, ShieldCheck, RefreshCw, Loader2, Phone, Mail } from 'lucide-react';
import { useOtpVerification } from '../../hooks/useOtpVerification';

export default function OtpVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  purpose = 'unlock_profile',
  phone,
  email,
  title = 'Verify Your Identity',
  description,
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const {
    sending, verifying, resending, error, sent, verified,
    channel, maskedTarget, expiryMinutes, resendRemaining, resendCooldown,
    attemptsRemaining, sendOtp, verifyOtp, resendOtp, reset,
  } = useOtpVerification({ purpose, onSuccess });

  // Auto-send OTP when modal opens
  useEffect(() => {
    if (isOpen && !sent && !sending) {
      sendOtp({ phone, email });
    }
    if (!isOpen) {
      reset();
      setDigits(['', '', '', '', '', '']);
    }
  }, [isOpen]);

  const handleDigitChange = (index, value) => {
    const sanitized = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = sanitized;
    setDigits(newDigits);

    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (sanitized && index === 5) {
      const complete = [...newDigits.slice(0, 5), sanitized];
      if (complete.every(d => d)) {
        handleVerify(complete.join(''));
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split('');
      setDigits(arr);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (otp = digits.join('')) => {
    if (otp.length !== 6) return;
    await verifyOtp({ otp, target: channel === 'email' ? email : phone });
  };

  if (!isOpen) return null;

  const channelIcon = channel === 'phone'
    ? <Phone className="w-5 h-5 text-indigo-400" />
    : <Mail className="w-5 h-5 text-indigo-400" />;

  return (
    <>
      {/* Invisible reCAPTCHA container for Firebase phone auth */}
      <div id="recaptcha-container" />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in slide-in-from-bottom-4 duration-300">

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700"
            aria-label="Close OTP modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">
                {description || (sent
                  ? `Code sent to ${maskedTarget}`
                  : 'Sending verification code...'
                )}
              </p>
            </div>
          </div>

          {/* Channel badge */}
          {sent && maskedTarget && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-6">
              {channelIcon}
              <span className="text-sm text-indigo-700 font-medium">{maskedTarget}</span>
              <span className="text-xs text-indigo-400 ml-auto">
                Expires in {expiryMinutes}min
              </span>
            </div>
          )}

          {/* Sending state */}
          {sending && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="text-gray-500">Sending verification code...</span>
            </div>
          )}

          {/* OTP Input grid */}
          {sent && !verified && (
            <>
              <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition
                      ${error
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : d
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                          : 'border-gray-200 bg-gray-50 text-gray-800 focus:border-indigo-400'
                      }`}
                    autoFocus={i === 0}
                    disabled={verifying}
                    aria-label={`OTP digit ${i + 1}`}
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                  {attemptsRemaining < 5 && (
                    <p className="text-xs text-red-700 mt-1">{attemptsRemaining} attempts remaining</p>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={() => handleVerify()}
                disabled={digits.join('').length !== 6 || verifying}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 mb-4"
              >
                {verifying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4" /> Verify Code</>
                )}
              </button>

              {/* Resend */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <span className="text-sm text-gray-400">
                    Resend in <span className="font-semibold text-gray-700">{resendCooldown}s</span>
                  </span>
                ) : resendRemaining > 0 ? (
                  <button
                    onClick={resendOtp}
                    disabled={resending}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5 mx-auto"
                  >
                    {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Resend code
                  </button>
                ) : (
                  <span className="text-sm text-red-400">Resend limit reached. Please wait 15 minutes.</span>
                )}
              </div>
            </>
          )}

          {/* Success state */}
          {verified && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-9 h-9 text-green-700" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">Verified!</p>
              <p className="text-sm text-gray-500">Identity confirmed successfully.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
