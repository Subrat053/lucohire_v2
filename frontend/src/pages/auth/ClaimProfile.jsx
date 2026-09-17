import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { HiCheckCircle, HiBriefcase, HiOutlineLocationMarker, HiLockClosed } from 'react-icons/hi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ClaimProfile() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true); // Show by default so they can see the generated password
  const [consentAccepted, setConsentAccepted] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/claim-profile/${token}`);
        if (data.success) {
          setProfile(data.data);
          // Generate a secure random password for them
          const generatedPass = 'Lc' + Math.random().toString(36).slice(-6) + Math.floor(Math.random() * 100) + '!';
          setPassword(generatedPass);
          setConfirmPassword(generatedPass);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Invalid or expired claim link.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [token, navigate]);

  const handleClaim = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (!consentAccepted) {
      toast.error('You must accept the terms and consent to be verified.');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axios.post(`${API_URL}/claim-profile/${token}/confirm`, { password });
      
      if (data.success) {
        toast.success(data.message);
        localStorage.setItem('token', data.token); // Log them in
        await checkAuth(); // Refresh auth context
        navigate('/provider/dashboard'); // Redirect to their new dashboard
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to claim profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-500 font-medium">Verifying secure link...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <HiCheckCircle className="w-10 h-10 text-green-700" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Lucohire
          </h2>
          <p className="mt-2 text-center text-sm text-gray-700">
            Top companies are looking for your skills! We've pre-built your profile.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-gray-100">
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <h3 className="text-lg font-bold text-indigo-900">{profile.name}</h3>
            <p className="text-sm text-indigo-700">{profile.email}</p>
            
            <div className="mt-4 flex flex-col gap-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <HiBriefcase className="text-gray-400" /> 
                <span className="font-medium">{profile.jobTitle || 'Professional'}</span>
              </div>
              <div className="flex items-center gap-2">
                <HiOutlineLocationMarker className="text-gray-400" /> 
                <span className="font-medium">{profile.location || 'Not Specified'}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {profile.skills?.slice(0, 5).map(skill => (
                <span key={skill} className="px-2 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-md text-xs font-semibold">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleClaim}>
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 shadow-sm">
              <p className="font-bold mb-1">We've generated a secure password for you.</p>
              <p>You can use this password to claim your account now. Please copy it or change it to something you will remember.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Set a Password to Claim Account</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiLockClosed className="text-gray-400 w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setConfirmPassword(e.target.value); // Keep them in sync if they just edit the first one
                  }}
                  className="pl-10 w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            {/* Hide confirm password visually to reduce clutter since we keep it in sync, but it's technically still there in state */}

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="consent"
                  type="checkbox"
                  required
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="consent" className="font-medium text-gray-700">
                  I consent to verify my profile and accept the <a href="#" className="text-indigo-600 hover:underline">Terms of Service</a> & <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>.
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            >
              {submitting ? 'Creating Account...' : 'Confirm & Claim Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
