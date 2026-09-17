import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchAPI } from '../../services/api';
import API from '../../services/api';
import toast from 'react-hot-toast';
import { Briefcase, MapPin, Search, Star, Phone, FileText, Lock } from 'lucide-react';
import SubscriptionPlansPopup from '../../components/common/SubscriptionPlansPopup';

const ExternalMatch = () => {
  const {
    t
  } = useTranslation();

  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const jobId = searchParams.get('jobId');
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [authFormData, setAuthFormData] = useState({ name: '', email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState(new Set());

  useEffect(() => {
    // Module 2 SEO Tag Requirement: Prevent indexing of external/scraped pages
    let metaTag = document.querySelector('meta[name="robots"]');
    let metaTagCreated = false;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'robots';
      document.head.appendChild(metaTag);
      metaTagCreated = true;
    }
    const originalContent = metaTag.content;
    metaTag.content = 'noindex, nofollow';

    fetchCandidates();
    
    // Trigger auth popup after 10 seconds if not logged in
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
      }
    }, 10000);
    
    return () => {
      clearTimeout(timer);
      if (metaTagCreated) {
        document.head.removeChild(metaTag);
      } else if (metaTag) {
        metaTag.content = originalContent || 'index, follow';
      }
    };
  }, [category, isAuthenticated]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await searchAPI.providers({ skills: category, limit: 10 });
      setCandidates(res.data?.providers || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      const res = await API.post('/auth/register', { ...authFormData, role: 'recruiter' });
      login(res.data);
      setShowAuthModal(false);
      toast.success('Registration successful! You can now view candidates.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleConnect = async (providerId) => {
    if (!isAuthenticated) {
      toast.error('Please register to connect with candidates.');
      setShowAuthModal(true);
      return;
    }
    
    try {
      // Backend handles checking limits vs subscription
      const res = await API.post(`/recruiter/provider/${providerId}/unlock`, { jobId });
      toast.success('Profile Unlocked!');
      setUnlockedIds(prev => new Set(prev).add(providerId));
    } catch (err) {
      if (err.response?.data?.needsSubscription) {
        toast.error('Free limit reached! Unlock premium to connect with more candidates.');
        setShowPaywall(true);
      } else {
        toast.error(err.response?.data?.message || 'Failed to unlock profile');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">{t("Top Matches for your Job")}</h1>
          <p className="mt-4 text-xl text-gray-500">{t("We found")}{candidates.length}{t("pre-screened professionals ready to start.")}</p>
        </div>

        {loading ? (
          <div className="flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
        ) : (
          <div className="space-y-6">
            {candidates.map((candidate, idx) => {
              const isUnlocked = unlockedIds.has(candidate._id);
              return (
                <div key={candidate._id || idx} className="bg-white shadow rounded-lg p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                  <div className="flex-shrink-0">
                    <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {candidate.user?.profilePicture ? (
                        <img src={candidate.user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-gray-500 text-2xl font-semibold">?</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h2 className={`text-2xl font-bold text-gray-900 ${!isUnlocked ? 'filter blur-md select-none' : ''}`}>
                      {candidate.user?.name || 'Candidate Name'}
                    </h2>
                    
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {candidate.skills?.slice(0,2).join(', ')}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {candidate.city || 'Remote'}
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        {candidate.ratings?.average || 4.5}{t("Rating")}</div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-100 ${!isUnlocked ? 'filter blur-[5px] select-none' : ''}`}>
                        <Phone className="w-5 h-5 text-indigo-500" />
                        <span className="font-medium">{candidate.user?.phone || '+91 9876543210'}</span>
                      </div>
                      <div className={`flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-100 ${!isUnlocked ? 'filter blur-[5px] select-none' : ''}`}>
                        <FileText className="w-5 h-5 text-indigo-500" />
                        <span className="font-medium text-indigo-600">{t("View Resume")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center justify-center">
                    {isUnlocked ? (
                      <button className="px-6 py-3 bg-green-50 text-green-700 font-semibold rounded-lg border border-green-200 cursor-default">{t("Connected")}</button>
                    ) : (
                      <button 
                        onClick={() => handleConnect(candidate._id)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                      >
                        <Lock className="w-4 h-4" />{t("Connect to View")}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Auth Modal */}
      {showAuthModal && !isAuthenticated && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                  <Lock className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">{t("Create a Free Account")}</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">{t("Sign up now to instantly unlock 3 candidate profiles for free!")}</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleRegister} className="mt-5 space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    placeholder={t("Full Name")}
                    className="w-full border-gray-300 rounded-md shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                    value={authFormData.name}
                    onChange={(e) => setAuthFormData({...authFormData, name: e.target.value})}
                  />
                </div>
                <div>
                  <input
                    type="email"
                    required
                    placeholder={t("Email Address")}
                    className="w-full border-gray-300 rounded-md shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                    value={authFormData.email}
                    onChange={(e) => setAuthFormData({...authFormData, email: e.target.value})}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    placeholder={t("Password")}
                    className="w-full border-gray-300 rounded-md shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                    value={authFormData.password}
                    onChange={(e) => setAuthFormData({...authFormData, password: e.target.value})}
                  />
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-3 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:bg-indigo-400"
                  >
                    {authLoading ? 'Creating Account...' : 'Sign Up for Free'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Paywall Popup */}
      <SubscriptionPlansPopup 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)}
        role="recruiter"
      />
    </div>
  );
};

export default ExternalMatch;
