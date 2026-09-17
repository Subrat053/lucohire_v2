import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { 
  HiCheck, 
  HiOutlineMail, 
  HiOutlinePhone, 
  HiOutlineUser, 
  HiOutlineDocumentText, 
  HiOutlineSparkles, 
  HiOutlineUserCircle, 
  HiOutlineBell,
  HiLocationMarker,
  HiBriefcase,
  HiCurrencyRupee,
  HiClock,
  HiBookmark,
  HiOutlineBookmark,
  HiOutlineOfficeBuilding,
  HiArrowRight
} from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { providerAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ApplicationSuccess = () => {
  const { applicationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [job, setJob] = useState(location.state?.job || null);
  const [application, setApplication] = useState(location.state?.application || null);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  
  useEffect(() => {
    // If we don't have job data in state, we should ideally fetch the application details
    // But for now, if missing, we redirect to applied jobs to be safe
    if (!job || !application) {
      navigate("/provider/applied-jobs", { replace: true });
    }
    
    // Fetch recommended jobs for the sidebar
    const fetchMatches = async () => {
      try {
        const { data } = await providerAPI.getMatches();
        // Filter out the job just applied to and take top 3
        if (data?.success && data?.data && Array.isArray(data.data)) {
          setRecommendedJobs(data.data.filter(j => j._id !== job._id).slice(0, 3));
        } else if (data?.success && data?.matches && Array.isArray(data.matches)) {
          setRecommendedJobs(data.matches.filter(j => j._id !== job._id).slice(0, 3));
        } else {
          // Fallback to regular jobs
          const fallback = await providerAPI.getJobs({ limit: 5 });
          if (fallback.data?.success && fallback.data?.jobs) {
            setRecommendedJobs(fallback.data.jobs.filter(j => j._id !== job._id).slice(0, 3));
          }
        }
      } catch (err) {
        console.error("Failed to fetch recommended jobs", err);
      }
    };
    
    fetchMatches();
  }, [job, application, navigate]);

  if (!job || !application) return null;

  const handleWhatsappCheckout = async () => {
    try {
      toast.loading('Redirecting to checkout...', { id: 'whatsapp-checkout' });
      const { data } = await providerAPI.checkoutWhatsappPlan();
      if (data?.checkout?.url) {
        window.location.href = data.checkout.url;
      } else {
        toast.error('Could not get checkout URL', { id: 'whatsapp-checkout' });
      }
    } catch (err) {
      console.error('WhatsApp Checkout error:', err);
      toast.error(err.response?.data?.message || 'Failed to initiate checkout', { id: 'whatsapp-checkout' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) + 
      ", " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formattedAppId = `LH-${new Date().getFullYear()}-${application._id?.substring(0, 4).toUpperCase()}-${application._id?.substring(application._id.length - 4).toUpperCase()}`;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
      
      {/* Left Column (Main Content) */}
      <div className="flex-1 space-y-6">
        
        {/* Success Header Card */}
        <div className="bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/50 rounded-3xl border border-emerald-100 p-6 md:p-8 md:px-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-sm">
          
          <div className="z-10 flex-1 text-center md:text-left mb-8 md:mb-0">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-6 mx-auto md:mx-0 shadow-lg shadow-emerald-500/30">
              <HiCheck className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Application Submitted Successfully! 🎉
            </h1>
            <p className="text-gray-700 mb-8 max-w-lg mx-auto md:mx-0">
              Great job, {user?.name?.split(" ")[0] || "there"}! Your application has been sent to the recruiter. We'll notify you about any updates.
            </p>
            
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-wrap gap-4 md:gap-8 justify-center md:justify-start mb-8 text-left">

              <div>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Applied On</p>
                <p className="text-sm font-semibold text-gray-800">{formatDate(application.createdAt)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Status</p>
                <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                  Application Submitted
                </span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link 
                to="/provider/applied-jobs"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-emerald-600/20 text-center"
              >
                View Applied Jobs
              </Link>
              <Link 
                to="/provider/dashboard"
                className="px-6 py-3 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-bold rounded-xl transition text-center"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Illustration */}
          <div className="hidden md:block w-64 h-64 shrink-0 relative z-10">
            <style>{`
              @keyframes floatApp {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-12px); }
                100% { transform: translateY(0px); }
              }
            `}</style>
            <img 
              src="/assets/success-illustration.png" 
              alt="Success Illustration" 
              className="w-full h-full object-contain"
              style={{ animation: 'floatApp 4s ease-in-out infinite' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
            <div className="absolute top-10 left-1/4 w-2 h-2 bg-yellow-400 rounded-full"></div>
            <div className="absolute top-20 left-1/2 w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-blue-400 rounded-full"></div>
            <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-emerald-400 rounded-full"></div>
          </div>
        </div>

        {/* What happens next? */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-8">What happens next?</h2>
          
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-6 right-6 h-0.5 bg-gray-200 hidden md:block"></div>
            <div className="absolute top-5 left-6 w-[25%] h-0.5 bg-emerald-500 hidden md:block"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-md shadow-emerald-500/20 text-white">
                  <HiCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Application Sent</h3>
                <p className="text-xs text-gray-500">Your application is successfully submitted to the recruiter.</p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center mb-3 text-emerald-600">
                  <HiOutlineMail className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Under Review</h3>
                <p className="text-xs text-gray-500">Recruiter will review your profile and resume carefully.</p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center mb-3 text-gray-400">
                  <HiOutlinePhone className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Shortlist & Connect</h3>
                <p className="text-xs text-gray-500">If shortlisted, you will receive an email/WhatsApp from the recruiter.</p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center mb-3 text-gray-400">
                  <HiOutlineUser className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Interview</h3>
                <p className="text-xs text-gray-500">You may be invited for an interview. All the best!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Boost Your Chances */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Boost Your Chances</h2>
          <p className="text-sm text-gray-500 mb-6">Take these quick actions to stand out and get noticed faster.</p>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <HiOutlineDocumentText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Improve your resume score</h3>
                  <p className="text-xs text-gray-500">Your resume score is 67%. Improve it to increase visibility.</p>
                </div>
              </div>
              <Link to="/provider/resume-toolkit" className="px-4 py-2 border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl text-xs font-bold transition whitespace-nowrap">
                Improve Now
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <HiOutlineSparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Add key skills</h3>
                  <p className="text-xs text-gray-500">Add trending skills to match job requirements.</p>
                </div>
              </div>
              <Link to="/provider/profile" className="px-4 py-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition whitespace-nowrap">
                Add Skills
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <HiOutlineUserCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Complete your profile</h3>
                  <p className="text-xs text-gray-500">A complete profile gets 3x more interview calls.</p>
                </div>
              </div>
              <Link to="/provider/profile" className="px-4 py-2 border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition whitespace-nowrap">
                Complete Profile
              </Link>
            </div>
            

          </div>
        </div>

        {/* Earn extra income */}
        <div 
          className="rounded-3xl p-6 md:p-10 flex flex-col items-start justify-center relative overflow-hidden border border-emerald-50 w-full min-h-[300px] md:min-h-[350px]"
          style={{ backgroundImage: "url('/freelance-banner-bg.webp')", backgroundSize: "cover", backgroundPosition: "center right", backgroundRepeat: "no-repeat" }}
        >
          {/* Gradient overlay to ensure text is readable on the left */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#f2faf7] via-[#f2faf7]/90 to-transparent w-[80%] md:w-2/3 z-0"></div>
          
          <div className="z-10 relative w-full md:w-1/2">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a1b41] mb-4 leading-tight">Earn extra income in<br/>your free time</h2>
            <p className="text-base text-gray-800 md:text-gray-700 mb-8 max-w-sm font-medium">Enable Freelance Alerts and get notified about nearby projects that match your skills.</p>
            <button onClick={handleWhatsappCheckout} className="px-6 py-3 bg-[#0d8765] hover:bg-[#096c4f] text-white text-sm font-bold rounded-xl transition flex items-center gap-2 w-max shadow-md">
               Enable Freelance Alerts <FaWhatsapp className="w-5 h-5 ml-1" />
            </button>
          </div>
        </div>

      </div>
      
      {/* Right Column (Sidebar) */}
      <div className="w-full lg:w-[340px] space-y-6 shrink-0">
        
        {/* Application Summary */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-6">Application Summary</h2>
          
          <div className="flex items-start gap-4 mb-6">
            {job.companyLogo ? (
              <img src={job.companyLogo} alt={job.companyName} className="w-12 h-12 rounded-xl object-contain border border-gray-100 bg-white" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-400 shrink-0">
                <HiOutlineOfficeBuilding className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-900 line-clamp-1">{job.title}</h3>
              <p className="text-xs text-gray-500 mb-1">{job.companyName || "Company"}</p>
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <HiLocationMarker className="w-3 h-3 text-emerald-500" /> 
                {job.city || "Location not specified"}
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gray-500">
                <HiBriefcase className="w-4 h-4 text-gray-400" /> Experience
              </div>
              <span className="font-semibold text-gray-800">{job.requiredSkillLevel === "skilled" ? "2-4 Years" : "Entry Level"}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gray-500">
                <HiClock className="w-4 h-4 text-gray-400" /> Job Type
              </div>
              <span className="font-semibold text-gray-800 capitalize">{job.jobType?.replace("_", " ") || "Full-time"}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gray-500">
                <HiCurrencyRupee className="w-4 h-4 text-gray-400" /> Salary
              </div>
              <span className="font-semibold text-gray-800">
                {job.budget?.perMonth ? `₹${job.budget.perMonth.toLocaleString()}/mo` : "Not disclosed"}
              </span>
            </div>
            
          </div>
          
          <Link 
            to={`/provider/job/${job._id}`}
            className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-emerald-600 border border-emerald-100 hover:bg-emerald-50 rounded-xl transition"
          >
            View Job Details <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>


        {/* Recommended for You */}
        {recommendedJobs.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-900">Recommended for You</h2>
              <Link to="/provider/job-for-me" className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 hover:underline">
                View All <HiArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {recommendedJobs.map((rec) => (
                <div key={rec._id} className="flex gap-3 group cursor-pointer" onClick={() => navigate(`/provider/job/${rec._id}`)}>
                  {rec.companyLogo ? (
                    <img src={rec.companyLogo} alt="" className="w-10 h-10 rounded-lg object-contain border border-gray-100 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-400 shrink-0">
                      <span className="font-bold text-sm">{(rec.companyName || "C")[0].toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 truncate group-hover:text-emerald-600 transition">{rec.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{rec.companyName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-500 truncate">{rec.city || "Remote"}</span>
                      {rec.budget?.perMonth > 0 && (
                        <span className="text-[10px] font-medium text-emerald-700">₹{rec.budget.perMonth.toLocaleString()}/mo</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}



      </div>
    </div>
  );
};

export default ApplicationSuccess;
