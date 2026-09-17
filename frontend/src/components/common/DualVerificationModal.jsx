import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiCheckCircle, FiArrowLeft, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { auth } from '../../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const DualVerificationModal = ({ isOpen, onClose, recruiterData }) => {
  const [recaptchaId] = useState(() => 'recaptcha-' + Math.random().toString(36).substr(2, 9));
  const { saveUserSession } = useAuth();
  const navigate = useNavigate();

  // Active view: 'email' or 'phone' or 'success'
  const [activeView, setActiveView] = useState('email');
  
  const [loading, setLoading] = useState(false);
  const [initialSent, setInitialSent] = useState(false);
  const initializedRef = useRef(false);

  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [guestToken, setGuestToken] = useState('');
  
  const [phoneOtp, setPhoneOtp] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState(null);

  const emailInputRefs = useRef([]);
  const phoneInputRefs = useRef([]);

  const handleBack = () => {
    navigate('/recruiter-discovery', { state: { recruiterData } });
  };

  useEffect(() => {
    if (isOpen && !initialSent && recruiterData?.email && recruiterData?.phone) {
      if (initializedRef.current) return;
      initializedRef.current = true;
      setInitialSent(true);

      // Sequential: only send phone OTP if email check passes (saves Firebase SMS credits)
      const initOtps = async () => {
        const emailOk = await sendEmailOtp();
        if (emailOk) setTimeout(() => sendPhoneOtp(true), 200);
      };
      initOtps();
    }

    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) {}
        window.recaptchaVerifier = null;
      }
    };
  }, [isOpen, initialSent, recruiterData]);

  // Returns true if email OTP was sent successfully, false otherwise
  const sendEmailOtp = async () => {
    try {
      const { data } = await api.post('/jobs/recruiter-discovery/send-email-otp', {
        email: recruiterData.email
      });
      if (data.success) {
        setGuestToken(data.guestToken);
        toast.success('OTP sent to email');
        return true;
      } else {
        toast.error(data.message || 'Failed to send email OTP');
        return false;
      }
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.accountExists) {
        toast.error('Account already exists! Please login.');
        navigate(`/login?email=${encodeURIComponent(recruiterData?.email || '')}`);
      } else {
        toast.error(err.response?.data?.message || 'Failed to send OTP to email');
      }
      return false;
    }
  };

  const sendPhoneOtp = async (forceRecreate = false) => {
    try {
      if (forceRecreate) {
        if (window.recaptchaVerifier) {
          try { window.recaptchaVerifier.clear(); } catch (e) {}
          window.recaptchaVerifier = null;
        }
        const wrapper = document.getElementById('recaptcha-wrapper');
        if (wrapper) {
          const newId = 'recaptcha-' + Date.now();
          wrapper.innerHTML = `<div id="${newId}"></div>`;
          window.recaptchaVerifier = new RecaptchaVerifier(auth, newId, { size: 'invisible' });
          await window.recaptchaVerifier.render();
        }
      }
      
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaId, { size: 'invisible' });
        await window.recaptchaVerifier.render();
      }
      
      const appVerifier = window.recaptchaVerifier;

      // Build E.164: prefer countryCode+nationalNumber, fall back to parsing fullPhone
      let formattedPhone;
      const rawNational = (recruiterData.nationalNumber || '').replace(/\D/g, '');
      if (rawNational) {
        const cc = (recruiterData.countryCode || '+91');
        formattedPhone = (cc.startsWith('+') ? cc : '+' + cc) + rawNational;
      } else {
        // Fall back: strip non-digits from phone and ensure it starts with +
        const digits = (recruiterData.phone || '').replace(/\D/g, '');
        formattedPhone = digits ? '+' + digits : null;
      }

      if (!formattedPhone || formattedPhone.length < 8) {
        toast.error('Please enter a valid phone number before proceeding.');
        return;
      }

      const confResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confResult);
      toast.success('OTP sent to phone');
    } catch (err) {
      if (err.code === 'auth/internal-error') return;
      console.error('Send Phone OTP Error:', err);
      
      let msg = err.message || 'Failed to send OTP';
      // Make it more user-friendly for common Firebase errors
      if (msg.includes('INVALID_APP_CREDENTIAL')) {
        msg = 'reCAPTCHA/App Credential Error: Please check Firebase Authorized Domains (auth/invalid-app-credential).';
      } else if (msg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        msg = 'Too many attempts. Please try again later (auth/too-many-requests).';
      } else if (msg.includes('CAPTCHA_CHECK_FAILED')) {
        msg = 'reCAPTCHA verification failed: Hostname match not found. Add domain to reCAPTCHA enterprise.';
      } else if (err.code) {
        // Fallback to error code if message is unhelpful
        msg = err.code.replace('auth/', '').replace(/-/g, ' ') + ' - ' + msg;
      }

      toast.error(msg, { duration: 10000 }); // Increased duration to 10 seconds
    }
  };

  const handleOtpChange = (index, value, type) => {
    if (!/^[0-9]*$/.test(value)) return;
    
    const newOtp = type === 'email' ? [...emailOtp] : [...phoneOtp];
    newOtp[index] = value;
    
    if (type === 'email') setEmailOtp(newOtp);
    else setPhoneOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      const refs = type === 'email' ? emailInputRefs.current : phoneInputRefs.current;
      refs[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e, type) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      const refs = type === 'email' ? emailInputRefs.current : phoneInputRefs.current;
      refs[index - 1]?.focus();
    }
  };

  const handleVerifyDual = async () => {
    const fullEmailOtp = emailOtp.join('');
    const fullPhoneOtp = phoneOtp.join('');

    if (fullEmailOtp.length !== 6) return toast.error('Enter 6-digit email OTP');
    if (fullPhoneOtp.length !== 6) return toast.error('Enter 6-digit phone OTP');
    
    if (!confirmationResult) return toast.error('Phone verification not ready. Please try resending.');

    setLoading(true);
    try {
      // 1. Verify Phone OTP locally with Firebase
      const result = await confirmationResult.confirm(fullPhoneOtp);
      const firebaseToken = await result.user.getIdToken();

      // 2. Call backend with everything
      const payload = {
        guestToken,
        emailOtp: fullEmailOtp,
        firebaseToken,
        name: recruiterData.name,
        companyName: recruiterData.companyName,
        email: recruiterData.email,
        phone: recruiterData.phone,
        password: recruiterData.password,
        industry: recruiterData.industry,
        country: 'India', // Optional defaults since we removed from modal
        state: '',
        city: ''
      };

      const { data } = await api.post('/jobs/recruiter-discovery/verify-dual', payload);

      if (data.success) {
        saveUserSession({ token: data.token, user: data.user });
        setActiveView('success');
        setTimeout(() => {
          navigate('/recruiter/dashboard');
        }, 1500);
      } else {
        toast.error(data.message || 'Verification failed');
      }

    } catch (err) {
      console.error('Dual Verify Error:', err);
      const msg = err.response?.data?.message || 'Invalid OTP or Verification Failed';
      // If already registered, redirect to login with prefilled email
      if (msg.toLowerCase().includes('already registered')) {
        toast.error(msg + ' Redirecting to login...');
        setTimeout(() => navigate(`/login?email=${encodeURIComponent(recruiterData?.email || '')}`), 1500);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-lg p-5 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={handleBack} className="absolute top-3 right-3 sm:top-6 sm:right-6 text-gray-400 hover:text-gray-700 transition">
          <FiX className="w-6 h-6" />
        </button>

        {activeView !== 'success' ? (
          <>
            <div className="flex justify-center mb-6">
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
                Step 2 of 2
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-1 sm:mb-2 text-center">Verify your account</h2>
            <p className="text-gray-500 mb-5 sm:mb-8 text-xs sm:text-sm text-center">
              {activeView === 'email' 
                ? `We've sent an OTP to your email address`
                : `We've sent an OTP to your mobile number`
              }
            </p>

            <div className="space-y-5 sm:space-y-8">
              {/* Email Section */}
              {activeView === 'email' && (
                <div className="animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-1 sm:gap-0">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">Email Address</span>
                    <button onClick={handleBack} className="text-[11px] sm:text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 truncate max-w-full">
                      <span className="truncate">{recruiterData?.email}</span> <FiEdit2 className="w-3 h-3 shrink-0" />
                    </button>
                  </div>
                  <div className="flex gap-1 sm:gap-2 justify-center sm:justify-between mb-4">
                    {emailOtp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => emailInputRefs.current[idx] = el}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value, 'email')}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e, 'email')}
                        className="w-10 h-10 sm:w-12 sm:h-14 text-center text-base sm:text-xl font-bold border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-blue-600 focus:ring-0 outline-none transition-colors"
                      />
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] sm:text-sm text-gray-500 mb-5 sm:mb-6 gap-2 sm:gap-0">
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <FiCheckCircle className="text-green-500 shrink-0" /> Didn't receive the OTP?
                    </span>
                    <button onClick={sendEmailOtp} className="text-purple-600 font-semibold hover:underline">
                      Resend OTP
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <button 
                      onClick={handleBack}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <FiArrowLeft /> Back
                    </button>
                    <button
                      onClick={() => {
                        if (emailOtp.join('').length === 6) setActiveView('phone');
                        else toast.error('Please enter complete Email OTP');
                      }}
                      className="w-full sm:flex-1 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg sm:rounded-xl font-bold hover:bg-purple-700 transition text-sm sm:text-base"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Phone Section */}
              {activeView === 'phone' && (
                <div className="animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-1 sm:gap-0">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">Mobile Number</span>
                    <button onClick={handleBack} className="text-[11px] sm:text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                      {recruiterData?.phone} <FiEdit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex gap-1 sm:gap-2 justify-center sm:justify-between mb-4">
                    {phoneOtp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => phoneInputRefs.current[idx] = el}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value, 'phone')}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e, 'phone')}
                        className="w-10 h-10 sm:w-12 sm:h-14 text-center text-base sm:text-xl font-bold border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-purple-600 focus:ring-0 outline-none transition-colors"
                      />
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] sm:text-sm text-gray-500 mb-5 sm:mb-6 gap-2 sm:gap-0">
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <FiCheckCircle className="text-green-500 shrink-0" /> Didn't receive the OTP?
                    </span>
                    <button onClick={sendPhoneOtp} className="text-purple-600 font-semibold hover:underline">
                      Resend OTP
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <button 
                      onClick={() => setActiveView('email')}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <FiArrowLeft /> Back
                    </button>
                    <button
                      onClick={handleVerifyDual}
                      disabled={loading}
                      className="w-full sm:flex-1 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg sm:rounded-xl font-bold hover:bg-purple-700 disabled:opacity-70 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {loading ? (
                         <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                      ) : (
                        <FiCheckCircle className="shrink-0" />
                      )}
                      <span className="truncate">{loading ? 'Verifying...' : 'Verify & Unlock Candidates'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
              <FiCheckCircle className="text-green-500" /> Your data is 100% secure and will never be shared.
            </div>
          </>
        ) : (
          <div className="text-center space-y-4 py-8">
            <div className="w-20 h-20 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto">
              <FiCheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Account Verified!</h3>
            <p className="text-gray-500">Redirecting to your workspace...</p>
          </div>
        )}
      </div>
      <div id="recaptcha-wrapper">
        <div id={recaptchaId}></div>
      </div>
    </div>
  );
};

export default DualVerificationModal;
