import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { providerAPI } from '../../services/api';
import { getIncomeOpportunities, getAiUsage } from '../../services/providerAIService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import useTranslation from '../../hooks/useTranslation';
import { confirmPaymentSuccess, purchaseFixedPlan } from '../../services/providerPlanService';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { 
  Briefcase, ArrowRight, Lock, RefreshCcw, Eye, FileText, CheckCircle2, Sparkles, Bookmark, MoreHorizontal, Mail, ExternalLink, Bot
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

const DASHBOARD_CACHE_TTL = 0; // Disable cache so count updates immediately
const dashboardCache = { data: null, ts: 0, inflight: null };
const matchesCache = { data: null, ts: 0, inflight: null };
const savedJobsCache = { data: null, ts: 0, inflight: null };
const applicationsCache = { data: null, ts: 0, inflight: null };

const getTimeAgo = (dateString) => {
  if (!dateString) return "Just now";
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const ProviderDashboard = () => {
  const { t } = useTranslation();
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const paymentHandledRef = useRef(false);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topJobs, setTopJobs] = useState([]);
  const [topJobsCount, setTopJobsCount] = useState(0);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);

  // AI-08: Income Opportunities
  const [incomeLoading, setIncomeLoading] = useState(true);
  const [incomeData, setIncomeData] = useState(null);
  const [incomeIsLocked, setIncomeIsLocked] = useState(false);

  const [aiUsage, setAiUsage] = useState(null);
  const [aiUsageLoading, setAiUsageLoading] = useState(true);

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const dashboardFresh = !forceRefresh && dashboardCache.data && now - dashboardCache.ts < DASHBOARD_CACHE_TTL;
    const matchesFresh = !forceRefresh && matchesCache.data && now - matchesCache.ts < DASHBOARD_CACHE_TTL;
    const savedJobsFresh = !forceRefresh && savedJobsCache.data && now - savedJobsCache.ts < DASHBOARD_CACHE_TTL;
    const applicationsFresh = !forceRefresh && applicationsCache.data && now - applicationsCache.ts < DASHBOARD_CACHE_TTL;

    if (forceRefresh) {
      dashboardCache.data = null; dashboardCache.ts = 0; dashboardCache.inflight = null;
      matchesCache.data = null; matchesCache.ts = 0; matchesCache.inflight = null;
      savedJobsCache.data = null; savedJobsCache.ts = 0; savedJobsCache.inflight = null;
      applicationsCache.data = null; applicationsCache.ts = 0; applicationsCache.inflight = null;
    }

    if (dashboardCache.data) setDashboard(dashboardCache.data);
    if (matchesCache.data) {
      setTopJobs(matchesCache.data.data);
      setTopJobsCount(matchesCache.data.totalCount || matchesCache.data.data?.length || 0);
    }
    if (savedJobsCache.data) setSavedJobs(savedJobsCache.data);
    if (applicationsCache.data) setApplications(applicationsCache.data);

    if (dashboardFresh && matchesFresh && savedJobsFresh && applicationsFresh) {
      setLoading(false);
      return;
    }

    if (!dashboardCache.data) setLoading(true);

    const dashboardPromise = dashboardFresh ? Promise.resolve({ data: dashboardCache.data }) : (dashboardCache.inflight ||= providerAPI.getDashboard());
    const matchesPromise = matchesFresh ? Promise.resolve({ data: { success: true, data: matchesCache.data.data, totalCount: matchesCache.data.totalCount } }) : (matchesCache.inflight ||= providerAPI.getMatches().catch(() => ({ data: { data: [], totalCount: 0 } })));
    const savedJobsPromise = savedJobsFresh ? Promise.resolve({ data: { jobs: savedJobsCache.data } }) : (savedJobsCache.inflight ||= providerAPI.getSavedJobs().catch(() => ({ data: { jobs: [] } })));
    const applicationsPromise = applicationsFresh ? Promise.resolve({ data: { applications: applicationsCache.data } }) : (applicationsCache.inflight ||= providerAPI.getApplications().catch(() => ({ data: { applications: [] } })));

    try {
      const [dashboardRes, matchesRes, savedJobsRes, applicationsRes] = await Promise.all([
        dashboardPromise, matchesPromise, savedJobsPromise, applicationsPromise
      ]);

      const dashboardData = dashboardRes.data;
      const matchesData = matchesRes.data?.data || [];
      const matchesTotalCount = matchesRes.data?.totalCount || matchesData.length;
      const savedJobsData = savedJobsRes.data?.jobs || savedJobsRes.data?.data || [];
      const applicationsData = applicationsRes.data?.applications || applicationsRes.data?.data || [];

      dashboardCache.data = dashboardData; dashboardCache.ts = Date.now();
      matchesCache.data = { data: matchesData, totalCount: matchesTotalCount }; matchesCache.ts = Date.now();
      savedJobsCache.data = savedJobsData; savedJobsCache.ts = Date.now();
      applicationsCache.data = applicationsData; applicationsCache.ts = Date.now();

      setDashboard(dashboardData);
      if (matchesRes.data?.success) {
        setTopJobs(matchesData);
        setTopJobsCount(matchesTotalCount);
      }
      setSavedJobs(savedJobsData);
      setApplications(applicationsData);
    } catch (err) {
      if (err.response?.status !== 404) toast.error(t('provider.failedLoadDashboard', 'Failed to load dashboard'));
    } finally {
      if (!dashboardFresh) dashboardCache.inflight = null;
      if (!matchesFresh) matchesCache.inflight = null;
      if (!savedJobsFresh) savedJobsCache.inflight = null;
      if (!applicationsFresh) applicationsCache.inflight = null;
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    let cancelled = false;
    const fetchIncomePaths = async () => {
      try {
        setIncomeLoading(true);
        const res = await getIncomeOpportunities();
        if (!cancelled && res.data?.success) {
          setIncomeData(res.data.data);
          setIncomeIsLocked(res.data.isLocked || false);
        }
      } catch (err) {
        if (!cancelled) console.error('[AI-08] Failed to fetch income opportunities:', err.message);
      } finally {
        if (!cancelled) setIncomeLoading(false);
      }
    };
    
    const fetchAiUsage = async () => {
      try {
        setAiUsageLoading(true);
        const res = await getAiUsage();
        if (!cancelled && res.data?.success) {
          setAiUsage(res.data);
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch AI usage:', err.message);
      } finally {
        if (!cancelled) setAiUsageLoading(false);
      }
    };
    
    fetchIncomePaths();
    fetchAiUsage();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (paymentHandledRef.current) return;
    if (params.get('success') === 'true' && params.get('sub_id')) {
      const subId = params.get('sub_id');
      const sessionId = params.get('session_id');
      const finalizePayment = async () => {
        paymentHandledRef.current = true;
        try {
          await confirmPaymentSuccess({ subscriptionId: subId, paymentId: sessionId, orderId: 'stripe_session' });
          if (fetchUser) await fetchUser();
          toast.success('Payment confirmed! Your WhatsApp plan is now active.');
          navigate('/provider/dashboard', { replace: true });
          loadDashboard(true);
        } catch (err) {
          toast.error('Failed to confirm payment status.');
        }
      };
      finalizePayment();
    }
  }, [location.search, navigate, loadDashboard]);


  const handleToggleSave = async (jobId, isExternal, e) => {
    e.preventDefault();
    try {
      await providerAPI.toggleSaveJob(jobId, isExternal);
      setTopJobs(prev => prev.map(job => 
        (job._id === jobId || job.id === jobId) ? { ...job, isSaved: !job.isSaved } : job
      ));
      toast.success("Job saved status updated");
    } catch (error) {
      toast.error("Failed to update saved status");
    }
  };

  const profile = dashboard?.profile || {};
  const stats = dashboard?.stats || {};
  
  const activeJobsCount = topJobsCount || 0;
  const applicationsCount = applications.length || stats.appliedJobs || 0;
  const savedJobsCount = savedJobs.length || stats.savedJobs || 0;
  const resumeScore = stats.resumeScore || 0;
  
  const isToday = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    const d = new Date(dateString);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const newMatchesTodayCount = topJobs.filter(j => isToday(j.createdAt)).length;
  const inReviewApplicationsCount = applications.filter(a => ['in_review', 'review', 'screening'].includes(a.status?.toLowerCase())).length;
  const newSavedTodayCount = savedJobs.filter(j => isToday(j.createdAt)).length;
  
  const recentApplications = applications.slice(0, 4);
  const skillProgress = (profile.skills && profile.skills.length > 0) ? profile.skills.slice(0, 4) : ['UI/UX Design', 'Figma', 'User Research', 'Prototyping'];
  const recentActivities = dashboard?.recentActivities || [
    { id: 1, text: 'Google viewed your profile', timeAgo: '1h ago', icon: <img src="https://logo.clearbit.com/google.com" className="w-4 h-4" alt="Google" />, iconBg: 'bg-white' },
    { id: 2, text: 'Your application is under review', timeAgo: '3h ago', icon: <FileText className="w-4 h-4 text-purple-600" />, iconBg: 'bg-purple-50' },
    { id: 3, text: 'New job matches found', timeAgo: '5h ago', icon: <Sparkles className="w-4 h-4 text-yellow-600" />, iconBg: 'bg-yellow-50' },
  ];

  if (loading) return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-64 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded-lg w-96 mb-8"></div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl border border-gray-100 p-4"></div>)}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-[28px] font-medium text-[#1a1b41] tracking-tight">Good afternoon, {user?.name ? user.name.split(' ')[0] : 'User'}! <span className="text-2xl">👋</span></h1>
          <p className="text-gray-500 font-medium text-sm mt-1">Your AI is working hard to find the best opportunities for you.</p>
        </div>
        
        {/* Plan & AI Limits */}
        {!aiUsageLoading && aiUsage?.limits && (
          <div className="bg-white rounded-xl border border-indigo-100 p-3 shadow-sm flex items-center gap-4 text-xs font-medium">
            <div className="flex flex-col">
              <span className="text-gray-500 mb-0.5">Current Plan</span>
              <span className="text-indigo-600 font-bold capitalize bg-indigo-50 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide border border-indigo-100 self-start">
                {aiUsage?.planName || user?.plan?.name || user?.plan || 'Free'}
              </span>
            </div>
            <div className="h-8 w-px bg-gray-100"></div>
            <div className="flex flex-col">
              <span className="text-gray-500 flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-500"/> AI Credits</span>
              <span className="text-gray-900 font-bold">
                {aiUsage.limits.aiCareerAnalysis === -1 ? 'Unlimited' : 
                  Math.max(0, (aiUsage.limits.aiCareerAnalysis || 0) - (aiUsage.usage?.aiCareerAnalysis || 0))} left
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column (Wider) */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Top Matches */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm flex flex-col items-center justify-center text-center hover:border-teal-100 transition-colors cursor-pointer min-h-[140px]" onClick={() => navigate('/provider/job-for-me')}>
              <div className="text-3xl font-bold text-emerald-600 mb-1">{activeJobsCount}</div>
              <div className="text-sm font-medium text-gray-500 mb-3">Top Matches</div>
              <div className="text-[11px] font-medium text-gray-500">New matches today</div>
              <div className="text-[11px] font-medium text-gray-500 mt-1">{newMatchesTodayCount > 0 ? `↑ ${newMatchesTodayCount} new` : 'No new today'}</div>
            </div>
            {/* Applications */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm flex flex-col items-center justify-center text-center hover:border-purple-100 transition-colors cursor-pointer min-h-[140px]" onClick={() => navigate('/provider/applied-jobs')}>
              <div className="text-3xl font-bold text-emerald-600 mb-1">{applicationsCount}</div>
              <div className="text-sm font-medium text-gray-500 mb-3">Applications</div>
              <div className="text-[11px] font-medium text-gray-500">Active applications</div>
              <div className="text-[11px] font-medium text-gray-500 mt-1">{inReviewApplicationsCount} in review</div>
            </div>
            {/* Saved Jobs */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm flex flex-col items-center justify-center text-center hover:border-yellow-100 transition-colors cursor-pointer min-h-[140px]" onClick={() => navigate('/provider/saved-jobs')}>
              <div className="text-3xl font-bold text-emerald-600 mb-1">{savedJobsCount}</div>
              <div className="text-sm font-medium text-gray-500 mb-3">Saved Jobs</div>
              <div className="text-[11px] font-medium text-gray-500">Jobs you saved</div>
              <div className="text-[11px] font-medium text-gray-500 mt-1">{newSavedTodayCount > 0 ? `↑ ${newSavedTodayCount} new` : 'Recently saved'}</div>
            </div>
            {/* Resume Score */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px]" onClick={() => navigate('/provider/resume-toolkit')}>
              <div className="text-3xl font-bold text-emerald-600 mb-1">{resumeScore}%</div>
              <div className="text-sm font-medium text-gray-500 mb-3">Resume Score</div>
              <div className="text-[11px] font-medium text-gray-500">Excellent</div>
              <div className="text-[11px] font-medium text-gray-500 mt-1 hover:underline">Improve</div>
            </div>
          </div>

          {/* Top Job Matches for You */}
          <div>
            <div className="flex items-start sm:items-center justify-between mb-4">
              <h2 className="text-[17px] font-extrabold text-[#1a1b41] leading-tight">
                Top Job Matches for <br className="sm:hidden" />
                <span className="inline-flex items-center gap-2 mt-1 sm:mt-0">
                  You
                  <span className="text-[10px] bg-emerald-50 text-[#0d8765] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Powered</span>
                </span>
              </h2>
              <Link to="/provider/job-for-me" className="text-xs font-bold text-[#0d8765] hover:underline flex items-center gap-1 mt-1 sm:mt-0 shrink-0">
                View All <span className="hidden sm:inline">Matches</span> <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              {topJobs.length > 0 ? topJobs.slice(0, 4).map((job, idx) => {
                const company = job.company || 'Company';
                return (
                  <div 
                    key={job._id || idx} 
                    onClick={() => navigate(`/provider/job/${job._id || job.id}`)}
                    className="min-w-[260px] w-[260px] bg-white rounded-2xl border border-gray-100 p-5 shadow-sm shrink-0 hover:shadow-md group transition-all flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border border-gray-100 bg-white shrink-0 overflow-hidden shadow-sm">
                          {company.toLowerCase().includes('google') ? <img src="https://logo.clearbit.com/google.com" alt="G" className="w-full h-full object-cover" /> :
                           company.toLowerCase().includes('microsoft') ? <img src="https://logo.clearbit.com/microsoft.com" alt="M" className="w-full h-full object-cover" /> :
                           company.toLowerCase().includes('adobe') ? <img src="https://logo.clearbit.com/adobe.com" alt="A" className="w-full h-full object-cover" /> :
                           company.toLowerCase().includes('swiggy') ? <img src="https://logo.clearbit.com/swiggy.com" alt="S" className="w-full h-full object-cover" /> :
                           company.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-extrabold text-[#1a1b41] text-sm leading-tight line-clamp-1 group-hover:text-[#0d8765]">{job.title || 'Professional'}</span>
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-medium mt-1">
                            {company} <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-[#0d8765] font-extrabold text-sm flex items-center gap-1">{idx === 0 ? '92' : idx === 1 ? '89' : idx === 2 ? '87' : '84'}% Match</div>
                        <div className="text-xs font-bold text-gray-400 mt-0.5">{idx < 3 ? 'Excellent' : 'Very Good'}</div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                          <span className="w-4 flex justify-center text-gray-400">📍</span>
                          <span className="truncate">{job.city || job.location?.city || 'Bengaluru'} ({job.workMode || 'Hybrid'})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                          <span className="w-4 flex justify-center text-gray-400">💰</span>
                          <span>{job.budgetMin ? `₹${job.budgetMin} - ${job.budgetMax} LPA` : (job.salaryInsight || 'Salary not disclosed')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center mt-auto pt-4 border-t border-gray-50">
                      <span className="text-[11px] font-medium text-gray-400">Posted {idx + 1} {idx === 0 ? 'day' : 'days'} ago</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="w-full p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                  <p className="text-gray-500 text-sm font-medium">{t("No matching jobs found right now.")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-extrabold text-[#1a1b41]">Recent Applications</h2>
              <Link to="/provider/applied-jobs" className="text-xs font-bold text-[#0d8765] hover:underline flex items-center gap-1">View All <ArrowRight className="w-4 h-4" /></Link>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 text-[11px] uppercase text-gray-400 font-extrabold tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-extrabold">Job Role</th>
                      <th className="px-6 py-4 font-extrabold">Company</th>
                      <th className="px-6 py-4 font-extrabold text-center">Status</th>
                      <th className="px-6 py-4 font-extrabold">Applied On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentApplications.length > 0 ? recentApplications.map((app, idx) => {
                      const company = app.jobPost?.company || app.company || 'Company';
                      const title = app.jobPost?.title || app.title || 'Role';
                      const status = app.status || 'applied';
                      const appliedDate = app.createdAt || new Date().toISOString();
                      
                      return (
                        <tr key={app._id || idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                {company.toLowerCase().includes('google') ? <img src="https://logo.clearbit.com/google.com" alt="G" className="w-full h-full object-cover" /> :
                                 company.toLowerCase().includes('microsoft') ? <img src="https://logo.clearbit.com/microsoft.com" alt="M" className="w-full h-full object-cover" /> :
                                 company.toLowerCase().includes('adobe') ? <img src="https://logo.clearbit.com/adobe.com" alt="A" className="w-full h-full object-cover" /> :
                                 company.toLowerCase().includes('uber') ? <img src="https://logo.clearbit.com/uber.com" alt="U" className="w-full h-full object-cover" /> :
                                 <span className="font-bold text-gray-500">{company.charAt(0)}</span>}
                              </div>
                              <span className="font-extrabold text-[#1a1b41] text-[13px]">{title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-500 text-[13px]">{company}</span>
                              {(idx < 2) && <CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-3 py-1 text-[11px] font-extrabold rounded-full ${
                              status === 'in_review' ? 'bg-blue-50 text-blue-600' :
                              status === 'screening' ? 'bg-purple-50 text-purple-600' :
                              status === 'assessment' ? 'bg-orange-50 text-orange-600' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {status === 'in_review' ? 'In Review' : status === 'screening' ? 'Screening' : status === 'assessment' ? 'Assessment' : 'Applied'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-500 font-medium text-[13px]">{getTimeAgo(appliedDate)}</span>
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500 text-sm">
                          No recent applications found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-gray-50 text-center bg-gray-50/30 hover:bg-gray-50 transition-colors">
                <Link to="/provider/applied-jobs" className="text-xs font-extrabold text-[#0d8765] hover:underline flex items-center justify-center gap-1 w-full h-full">View All Applications <ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
            </div>
          </div>



        </div>

        {/* Right Sidebar (Narrower) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Your Overall Match Score */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-[#1a1b41] text-[15px]">Your Overall Match Score</h3>
              <span className="bg-[#6366f1] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl uppercase tracking-wider">AI</span>
            </div>
            
            <div className="flex items-center gap-6 mb-6">
              <div className="w-24 h-24 shrink-0 relative">
                <CircularProgressbar 
                  value={92} 
                  text="92%"
                  strokeWidth={10} 
                  styles={buildStyles({
                    pathColor: '#0d8765',
                    textColor: '#1a1b41',
                    trailColor: '#f1f5f9',
                    strokeLinecap: 'round',
                    textSize: '24px',
                  })}
                />
              </div>
              <div>
                <div className="text-[17px] font-extrabold text-[#1a1b41] mb-1">Excellent Match</div>
                <div className="flex items-center gap-1 text-[#0d8765]">
                  {[1,2,3,4].map(i => <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
                  <svg className="w-4 h-4 fill-current opacity-30" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                </div>
              </div>
            </div>
            

            
            <button onClick={() => navigate('/provider/career-health')} className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-[#1a1b41] transition-colors flex items-center justify-center gap-1 mb-6">
              View Full Analysis <ArrowRight className="w-3.5 h-3.5" />
            </button>


          </div>

          {/* Freelance Alert */}
          <div className="bg-[#0b5d49] rounded-3xl p-6 relative overflow-hidden shadow-lg border border-[#094d3c] text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0d735a] rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-extrabold text-[17px] tracking-tight text-white">Freelance Alert</h3>
                <span className="bg-orange-400 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
              </div>
              
              <div className="flex justify-between items-start mb-6">
                <p className="text-teal-50 text-[13px] leading-snug font-medium max-w-[200px]">
                  Get nearby freelance projects on WhatsApp.
                </p>
                <div className="w-12 h-12 flex items-center justify-center text-4xl mt-[-10px]">
                  <FaWhatsapp className="text-[#075E54] drop-shadow-md w-10 h-10" />
                </div>
              </div>
              
              <ul className="list-disc list-inside pl-0 space-y-2 mb-6 text-[12px] text-teal-100 font-medium">
                <li>Weekend Projects</li>
                <li>Part-time Work</li>
                <li>Instant Alerts</li>
              </ul>
              
              <div className="flex justify-between items-end mb-4 px-1">
                <div className="text-sm font-extrabold">Just ₹{Math.max(1, Math.round((dashboard?.subscription?.whatsappPlanPrice || 30) / 30))}/day</div>
                <div className="text-[11px] text-teal-200/70 font-medium">Only ₹{dashboard?.subscription?.whatsappPlanPrice || 30}/month</div>
              </div>
              
              {dashboard?.subscription?.whatsappPlanEndDate && new Date(dashboard.subscription.whatsappPlanEndDate) > new Date() ? (
                <div className="w-full bg-[#0d735a] border border-[#138e71] text-white font-extrabold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm">
                  Active - Valid until {new Date(dashboard.subscription.whatsappPlanEndDate).toLocaleDateString()}
                </div>
              ) : (
                <>
                  <button onClick={() => navigate('/provider/plans#addons')} className="w-full bg-white hover:bg-gray-50 text-[#0b5d49] font-extrabold py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm">
                    Enable Alerts <FaWhatsapp className="w-4 h-4 text-[#075E54]" />
                  </button>
                  <div className="text-center text-sm text-teal-300 mt-3 font-medium">Get listed on Top Talent</div>
                </>
              )}
            </div>
          </div>
          
          {/* AI Coach */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-extrabold text-[#1a1b41] text-[15px]">AI Coach</h3>
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wider">Premium</span>
                </div>
                <p className="text-[12px] text-gray-500 font-medium leading-relaxed max-w-[150px]">
                  Get personalized career guidance and improve your chances.
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-inner">
                <Bot className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            
            <button onClick={() => navigate('/provider/ai-career-coach')} className="w-full mt-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-[#1a1b41] transition-colors flex items-center justify-center gap-1 shadow-sm">
              Chat with AI Coach <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          


        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
