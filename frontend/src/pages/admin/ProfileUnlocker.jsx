import React, { useState } from 'react';
import { unlockProfileAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HiLockOpen, HiMail, HiKey, HiArrowRight } from 'react-icons/hi';
import { useAuth, getDashboardByRole } from '../../context/AuthContext';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../config/firebase';

const ProfileUnlocker = ({ restrictionType = null, initialEmail = '' }) => {
  const { saveUserSession } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [impersonateToken, setImpersonateToken] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);

  React.useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);
  
  // Edit Profile Form State
  const [editForm, setEditForm] = useState({ name: '', phone: '' });

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifierUnlock) {
      window.recaptchaVerifierUnlock = new RecaptchaVerifier(
        auth,
        'unlock-recaptcha-container',
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            if (window.recaptchaVerifierUnlock) {
              window.recaptchaVerifierUnlock.clear();
              window.recaptchaVerifierUnlock = null;
            }
          },
        }
      );
    }
    return window.recaptchaVerifierUnlock;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter the registered email');
    
    setLoading(true);
    try {
      const { data } = await unlockProfileAPI.sendOtp({ email });
      const phone = data.phone;
      if (!phone) throw new Error("No phone number found for this user.");
      
      const cleanPhone = String(phone).replace(/\D/g, "");
      let formattedPhone = cleanPhone;
      if (cleanPhone.length === 10) formattedPhone = `+91${cleanPhone}`;
      else if (!cleanPhone.startsWith('+')) formattedPhone = `+${cleanPhone}`;
      
      const verifier = setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      
      toast.success('OTP sent successfully to the user\'s registered mobile number via Firebase');
      setStep(2);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter the OTP');
    if (!confirmationResult) return toast.error("Verification session expired");

    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const firebaseToken = await result.user.getIdToken(true);
      const res = await unlockProfileAPI.verifyOtp({ email, firebaseToken });
      toast.success('Profile unlocked successfully!');
      
      const userData = res.data.data;
      setUser(userData);
      setImpersonateToken(res.data.token);
      setEditForm({ name: userData.name || '', phone: userData.phone || '' });
      setStep(3); // Go to edit step
      setOtp('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await unlockProfileAPI.updateProfile(user._id, editForm);
      toast.success('Profile details updated successfully!');
      // Reset flow entirely
      setStep(1);
      setEmail('');
      setUser(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = () => {
    if (!impersonateToken || !user) return;
    
    // Store current admin/manager session before impersonating
    const currentToken = localStorage.getItem("authToken");
    const currentUser = JSON.parse(localStorage.getItem("authUser") || '{}');
    if (currentToken) {
      localStorage.setItem("impersonatorToken", currentToken);
      localStorage.setItem("impersonatorRole", currentUser.activeRole || 'admin');
      if (restrictionType) {
        localStorage.setItem("impersonatorRestriction", restrictionType);
      }
    }

    saveUserSession({ token: impersonateToken, user });
    toast.success(`Logged in as ${user.email}`);
    
    if (restrictionType === 'payment') {
      window.location.href = '/provider/wallet';
    } else if (restrictionType === 'manager_support') {
      window.location.href = '/provider/profile';
    } else {
      const dashUrl = getDashboardByRole(user.activeRole);
      window.location.href = dashUrl;
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto mt-10">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 text-center bg-indigo-50/50 border-b border-gray-100">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100">
            <HiLockOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Profile Unlocker</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Unlock a user profile by sending a Firebase OTP to their registered mobile number.
          </p>
        </div>

        <div id="unlock-recaptcha-container"></div>

        <div className="p-8">
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User's Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiMail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50/50"
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : step === 2 ? (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-6 flex gap-3">
                <HiMail className="w-5 h-5 shrink-0 mt-0.5" />
                <p>An OTP has been sent to <strong>{email}</strong> from admin@servicehub.com. Ask the user for the code.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiKey className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50/50 text-center tracking-widest text-lg font-mono"
                    placeholder="------"
                    maxLength={6}
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors text-right"
                >
                  Resend OTP
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Unlock Profile'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm mb-6">
                <p className="font-bold mb-1">Profile Unlocked!</p>
                <p>The profile for <strong>{email}</strong> is now active. You can update their details below.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50/50"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50/50"
                  placeholder="+1234567890"
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setEmail('');
                    setUser(null);
                  }}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 transition-colors"
                >
                  Done / Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-3">Or access the user's dashboard to edit everything:</p>
                <button
                  type="button"
                  onClick={handleImpersonate}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-indigo-200 rounded-xl shadow-sm text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  {restrictionType === 'payment' ? 'Access Payment Settings Only' : restrictionType === 'manager_support' ? 'Access Profile & Jobs Only' : 'Access Full User Dashboard'} <HiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileUnlocker;
