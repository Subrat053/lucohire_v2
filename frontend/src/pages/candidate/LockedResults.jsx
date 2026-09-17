import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiLock, FiCheckCircle, FiStar, FiTrendingUp, FiBriefcase, FiPhone } from 'react-icons/fi';
import { BiBuildingHouse } from 'react-icons/bi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const LockedResults = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [phoneState, setPhoneState] = useState('');
  const [step, setStep] = useState(1); // 1: Ask Phone, 2: OTP
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [realScore, setRealScore] = useState(null);
  const [realJobs, setRealJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const { saveUserSession } = useAuth();
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const formData = location.state?.formData || {};

  useEffect(() => {
    if (formData?.phone) {
      setPhoneState(formData.phone);
    }
  }, [formData]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setJobsLoading(true);
        const res = await api.post('/jobs/guest-recommended', {
          skills: formData?.skills || formData?.role || '',
          mobileNumber: formData?.phone || ''
        });
        if (res.data?.success && res.data?.data?.jobs) {
          setRealJobs(res.data.data.jobs);
        }
      } catch (err) {
        console.error('Failed to fetch recommended jobs:', err);
      } finally {
        setJobsLoading(false);
      }
    };
    fetchJobs();
  }, [formData?.role, formData?.phone]);

  const handleInterceptClick = (e) => {
    if (!isVerified) {
      e.preventDefault();
      e.stopPropagation();
      setShowOtpModal(true);
    }
  };

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const handlePhoneSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!phoneState || phoneState.length !== 10) {
      return toast.error('Please enter a valid 10-digit mobile number');
    }

    setLoading(true);

    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 
          size: 'invisible',
          callback: () => {}
        });
      }
      
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = `+91${phoneState.replace(/\D/g, '')}`;
      
      const confResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confResult);
      setStep(2);
      toast.success('OTP sent successfully');
    } catch (err) {
      console.error('Send OTP Error:', err);
      toast.error(err.message || 'Failed to send OTP. Please try again.');
      // Reset recaptcha on error
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading) return;
    
    if (otp.length !== 6) {
      return toast.error('Enter 6-digit OTP');
    }

    if (!confirmationResult) {
      return toast.error('Please send OTP first');
    }

    setLoading(true);

    try {
      // 1. Verify with Firebase
      const result = await confirmationResult.confirm(otp);
      const firebaseToken = await result.user.getIdToken();

      // Generate a system password since we removed it from manual form
      const sysPassword = formData.password || Math.random().toString(36).slice(-6) + 'Luco@1';

      // 2. Verify with our backend and create user
      const verifyResponse = await api.post('/jobs/guest-firebase/verify', {
        firebaseToken,
        ...formData, // send name, email, skills, experience from GuestDiscovery
        password: sysPassword
      });

      if (verifyResponse.data?.success) {
        toast.success('Phone verified successfully!');
        setGeneratedPassword(sysPassword);
        
        // Log the user in with the received token and user object
        if (verifyResponse.data.token && verifyResponse.data.user) {
          saveUserSession({
            token: verifyResponse.data.token,
            user: verifyResponse.data.user
          });
        }

        setIsVerified(true);
        setShowOtpModal(false);

        // Show a persistent toast with the password and redirect
        toast.success(`Success! Save this temporary password: ${sysPassword}`, { duration: 6000 });
        
        setTimeout(() => {
          navigate('/provider/job-for-me');
        }, 1500);
      }
    } catch (err) {
      console.error('OTP Verify Error:', err);
      toast.error(
        err.response?.data?.message || err.message || 'OTP verification failed'
      );
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (step === 2 && otp.length === 6) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-2 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-start items-center mb-2 mt-2">
        <button onClick={() => navigate(-1)} className="text-indigo-600 font-medium hover:text-indigo-800 flex items-center">
          &larr; Back
        </button>
      </div>

      {!isVerified && (
        <div className="w-full max-w-5xl bg-blue-600 rounded-lg p-6 mb-6 text-white shadow-md flex flex-col items-start justify-between relative z-20">
          <div className="flex flex-col mb-4 text-left">
            <h2 className="text-xl font-bold leading-snug max-w-2xl">Verify your mobile number to unlock your full analytics and matching jobs.</h2>
          </div>
          <button 
            onClick={() => setShowOtpModal(true)}
            className="bg-white text-blue-600 font-bold py-2 px-6 rounded-md hover:bg-gray-100 transition shadow self-start mt-2"
          >
            Verify with OTP
          </button>
        </div>
      )}

      {isVerified && (
        <div className="w-full max-w-5xl bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-green-800 flex flex-col md:flex-row items-start md:items-center justify-between">
          <div className="flex items-center">
            <FiCheckCircle className="text-3xl mr-4 text-green-700 shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-1">You&apos;re Verified! Here are your top matching jobs.</h2>
              <p className="text-sm text-green-700">
                Your temporary password is: <span className="font-mono bg-white px-2 py-1 rounded border border-green-300 font-bold mx-1">{generatedPassword}</span>
                <br className="md:hidden" />
                (You can change it later in the Change Password tab)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Click intercepted if not verified */}
      <div 
        className="w-full max-w-5xl relative" 
        onClickCapture={handleInterceptClick}
      >
        {/* Score & Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column: Score Section */}
          <div className="w-full lg:col-span-1 bg-white shadow rounded-lg p-6 border border-gray-100 flex flex-col items-start justify-center text-left h-full">
            <h3 className="text-sm font-bold text-gray-700 mb-4 text-left w-full">Your Resume Match Score</h3>
            
            <div className="grid grid-cols-[auto_1fr] items-center w-full gap-4">
              {/* Left side: The Circle */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-gray-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-green-500" strokeWidth="4" strokeDasharray={`${formData?.resumeScore || 78}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl sm:text-3xl font-bold text-green-700">{formData?.resumeScore || 78}<span className="text-lg sm:text-xl">%</span></span>
                </div>
              </div>

              {/* Right side: The Text */}
              <div className="w-full h-full flex flex-col justify-center items-start">
                <div className="flex items-center text-green-700 font-bold mb-1.5 md:mb-1 text-lg whitespace-nowrap">
                   <FiCheckCircle className="mr-2 shrink-0" />
                   Good Match
                </div>
                <p className="text-gray-500 text-sm md:text-xs leading-relaxed w-full">
                  You're a good fit for many opportunities out there!
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Analytics Section */}
          <div className="w-full lg:col-span-2 bg-white shadow rounded-lg p-6 border border-gray-100 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Your Profile Analytics</h3>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {!isVerified && (
                  <div className="flex items-center text-xs sm:text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-medium">
                    Blurred for your privacy
                  </div>
                )}
                <span className="hidden sm:flex text-[10px] text-gray-400 items-center">Powered by AI ✨</span>
              </div>
            </div>
            
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 transition-all duration-500 ${!isVerified ? 'select-none pointer-events-none' : ''}`}>
              {[
                { title: 'Skills Match', icon: <FiStar />, value: 'High' },
                { title: 'Experience Match', icon: <FiBriefcase />, value: 'Medium' },
                { title: 'Industry Fit', icon: <BiBuildingHouse />, value: 'Excellent' },
                { title: 'Profile Strength', icon: <FiTrendingUp />, value: '85/100' }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-2">
                  <div className="text-blue-600 text-xl mb-3">{item.icon}</div>
                  <h4 className="text-gray-700 text-xs font-bold mb-1">{item.title}</h4>
                  <p className={`font-bold text-sm ${!isVerified ? 'blur-[2px] text-gray-400 opacity-60' : 'text-gray-400'}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Bottom Section: Top Strengths & Improvement Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 mt-auto">
              <div className="flex flex-col h-full">
                <h4 className="text-sm font-bold text-gray-900 mb-4">Top Strengths</h4>
                <ul className="grid grid-cols-2 md:grid-cols-1 md:flex md:flex-col md:space-y-3 gap-y-3 gap-x-2 flex-1">
                   {['React JS', 'Node JS', 'UI/UX Design'].map((strength, i) => (
                      <li key={i} className="flex items-center text-xs font-medium">
                        <FiCheckCircle className="text-green-500 mr-2 shrink-0" />
                        <span className={`${!isVerified ? 'blur-[2px] text-gray-400 opacity-60 select-none' : 'text-gray-700'}`}>{strength}</span>
                      </li>
                   ))}
                </ul>
                {!isVerified && <div className="mt-4 border-t border-gray-100 pt-3 text-center"><span className="text-[10px] text-gray-400 flex justify-center items-center"><FiLock className="mr-1" /> Unlock to view</span></div>}
              </div>
              <div className="flex flex-col h-full">
                <h4 className="text-sm font-bold text-gray-900 mb-4">Improvement Areas</h4>
                <ul className="grid grid-cols-2 md:grid-cols-1 md:flex md:flex-col md:space-y-3 gap-y-3 gap-x-2 flex-1">
                   {['System Design', 'Docker', 'AWS'].map((area, i) => (
                      <li key={i} className="flex items-center text-xs font-medium">
                        <span className="text-yellow-500 font-bold mr-2 shrink-0 text-sm md:text-xs">⚠</span>
                        <span className={`${!isVerified ? 'blur-[2px] text-gray-400 opacity-60 select-none' : 'text-gray-700'}`}>{area}</span>
                      </li>
                   ))}
                </ul>
                {!isVerified && <div className="mt-4 border-t border-gray-100 pt-3 text-center"><span className="text-[10px] text-gray-400 flex justify-center items-center"><FiLock className="mr-1" /> Unlock to view</span></div>}
              </div>
            </div>
          </div>
        </div>

        {/* Jobs Section (Blurred) */}
        <div className="flex justify-between items-start md:items-end mb-4">
          <h3 className="text-xl font-bold text-gray-900 leading-tight md:leading-normal">
            Top Matching<br className="block md:hidden" /> <span className="hidden md:inline">Jobs for You</span><span className="md:hidden">Jobs for You</span>
          </h3>
          {!isVerified && <span className="text-sm text-gray-500 flex items-center pt-1 md:pt-0"><FiLock className="mr-1" /> Unlock to view details</span>}
        </div>
        
        <div className={`space-y-4 transition-all duration-500 ${!isVerified ? 'select-none pointer-events-none' : ''}`}>
          {jobsLoading ? (
            <div className="flex justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : realJobs.length > 0 ? (
            realJobs.map((job, idx) => {
              if (isVerified) {
                return (
                  <div key={job._id || idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div className="flex items-center mb-4 sm:mb-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full md:rounded-md flex items-center justify-center text-blue-600 font-bold text-xl mr-4 shrink-0">
                          {(job.companyName || job.recruiter?.name || job.recruiter?.companyName || 'J').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{job.title}</h4>
                          <p className="text-gray-500">{job.companyName || job.recruiter?.name || job.recruiter?.companyName || 'Confidential'} &bull; {job.city || 'Remote'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-green-700 font-bold bg-green-50 px-3 py-1 rounded-full text-sm mb-2">{job.matchScore || 90}% Match</span>
                        <button onClick={() => navigate('/provider/dashboard')} className="text-blue-600 border border-blue-600 hover:bg-blue-50 font-medium px-4 py-2 rounded-md transition">
                          Go to Dashboard
                        </button>
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={job._id || idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div className="flex items-center mb-4 sm:mb-0">
                        <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-full md:rounded-md flex items-center justify-center text-blue-600 font-bold text-xl mr-4 shrink-0">
                          {(job.companyName || job.recruiter?.name || job.recruiter?.companyName || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{job.companyName || job.recruiter?.name || job.recruiter?.companyName || 'Confidential'}</h4>
                          <p className="text-gray-500">
                            {job.title} <span className="blur-[2px] opacity-70 select-none">&bull; {job.city || 'Remote'} &bull; Full-time</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-green-700 font-bold bg-green-50 px-3 py-1 rounded-full text-sm mb-2 blur-[2px] opacity-70 select-none">{job.matchScore || 90}% Match</span>
                        <button className="text-gray-400 border border-gray-200 bg-gray-50 font-medium px-4 py-2 rounded-md transition flex items-center cursor-not-allowed">
                          <FiLock className="mr-2" /> Locked
                        </button>
                      </div>
                    </div>
                    
                    {/* Blurred AI Insights CTA */}
                    <div className="mt-4 pt-4 border-t border-gray-100 relative overflow-hidden bg-gradient-to-r from-blue-50/50 to-indigo-50/50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                      <div className="filter blur-[2px] opacity-80 select-none pointer-events-none space-y-3 mt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-blue-200 rounded-full"></div>
                          <div className="h-4 bg-gray-300 rounded w-32"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                        <div className="flex gap-2 mt-2">
                          <div className="h-6 w-20 bg-emerald-100 rounded-full"></div>
                          <div className="h-6 w-24 bg-blue-100 rounded-full"></div>
                        </div>
                      </div>
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/40 backdrop-blur-[1px]">
                        <p className="text-sm font-bold text-gray-800 mb-2 drop-shadow-sm flex items-center gap-2">
                          <FiLock className="w-4 h-4 text-indigo-600" /> Unlock AI Job Insights
                        </p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate('/provider/plans'); }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-5 rounded-xl md:rounded-full transition-colors shadow-md flex items-center gap-1.5"
                        >
                          View Premium Plans
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                 <FiBriefcase className="text-gray-400 text-2xl" />
               </div>
               <h3 className="text-lg font-bold text-gray-900 mb-2">No exact matches yet</h3>
               <p className="text-gray-500 text-center max-w-md">We couldn't find active jobs matching your specific profile right now. We'll notify you when new opportunities arrive.</p>
            </div>
          )}
        </div>
      </div>

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>

      {/* OTP Modal */}
      {showOtpModal && !isVerified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative animate-fade-in">
            <button 
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-100 p-4 rounded-full mb-6">
                <FiLock className="text-blue-600 text-3xl" />
              </div>
              
              {step === 1 ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Unlock Matching Jobs</h2>
                  <p className="text-gray-500 mb-6">Confirm your mobile number to receive an OTP.</p>
                  
                  <form onSubmit={handlePhoneSubmit} className="w-full">
                    <div className="mb-6 text-left relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-medium">+91</span>
                      </div>
                      <input 
                        type="tel"
                        value={phoneState}
                        onChange={(e) => setPhoneState(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        required
                        maxLength="10"
                      />
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={loading || !phoneState}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition shadow-md disabled:opacity-50 flex justify-center items-center"
                    >
                      {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify to Unlock</h2>
                  <p className="text-gray-500 mb-6">Enter the OTP sent to <span className="font-semibold text-gray-800">{phoneState}</span></p>
                  
                  <div className="flex justify-center mb-6 w-full">
                    <input
                      className="w-full h-14 px-4 border-2 rounded-lg bg-gray-50 text-center text-3xl tracking-[0.5em] font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-300 placeholder:tracking-normal"
                      type="text"
                      inputMode="numeric"
                      name="otp"
                      placeholder="------"
                      maxLength="6"
                      value={otp}
                      onChange={handleOtpChange}
                      autoFocus
                    />
                  </div>

                  <p className="text-sm text-gray-500 mb-6">
                    Didn&apos;t receive the code?{' '}
                    <button 
                      type="button"
                      onClick={handlePhoneSubmit} 
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      Resend OTP
                    </button>
                  </p>
                  
                  <button 
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition shadow-md disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & View Jobs'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LockedResults;
