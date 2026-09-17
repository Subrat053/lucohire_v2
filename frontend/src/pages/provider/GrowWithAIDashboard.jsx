import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Lock, Sparkles, Briefcase, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, FileSearch, Search, Check, Info, Bot, MapPin, Heart, ChevronRight, Bookmark, MessageSquare, Eye, EyeOff, Loader2, RefreshCw
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { getCareerGPS, getHiringBarriers, getSkillGap, getAtsOptimizer, getAiUsage, improveCareerGPS, improveHiringBarriers, improveSkillGap, getAICareerReport, getInterviewQuestions, refreshInterviewQuestions } from '../../services/providerAIService';
import AiCareerReportModal from '../../components/provider/AiCareerReportModal';
import AICoachModal from '../../components/provider/AICoachModal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { getCurrentSubscription } from '../../services/providerPlanService';

const fallbackGpsData = {
  current_role: "Software Developer",
  recommended_next_role: "Senior Software Engineer",
  reasoning_summary: "Based on your current skill set, transitioning to a senior role is the optimal next step. We observed that you have strong foundational skills, but lack some of the advanced architectural knowledge and leadership experience required for senior roles. By focusing on these areas, you can significantly increase your market value.",
  required_skills: ["System Design", "Leadership", "Advanced React"],
  missing_skills: ["System Architecture", "Team Management"],
  learning_path: [
    { step: 'Step 1: Core Concepts', description: 'Master advanced architectural patterns and system design principles.' },
    { step: 'Step 2: Leadership', description: 'Take ownership of projects and mentor junior developers.' }
  ],
  salary_growth_potential_percent: "35%",
  estimated_timeline_months: "6-12",
  alternative_roles: ["Tech Lead", "Engineering Manager"]
};

const fallbackBarriersData = {
  hiring_barrier_score: 45,
  top_reasons: ["Lack of quantified achievements", "Missing some critical hard skills"],
  resume_issues: ["Bullet points lack impact", "Format is not ATS-friendly"],
  skill_issues: ["Missing advanced framework experience"],
  salary_or_location_issues: ["Salary expectations might be slightly above market"],
  immediate_action_plan: [{ action: 'Rewrite resume bullets', priority: 'High' }, { action: 'Learn advanced frameworks', priority: 'Medium' }]
};

const fallbackReportData = {
  top_strengths: ["Strong technical foundation", "Good problem solving skills", "Solid educational background", "Adaptability"]
};

const fallbackSkillGapData = {
  job_match_score: 65,
  matched_skills: ["React", "JavaScript", "HTML/CSS"],
  missing_critical_skills: ["Node.js", "AWS", "System Design"],
  fastest_hire_path: "Focus on learning Node.js and AWS basics to bridge the gap. Consider completing a hands-on project that incorporates these technologies.",
  hire_ready_after: "3 months"
};

const fallbackAtsData = {
  warnings: ["Keywords missing", "Formatting issues detected"],
  ats_score_before: 55,
  ats_score_after: 85,
  missing_keywords: ["Cloud Computing", "Agile", "REST API"],
  added_keywords: ["Microservices", "Docker"],
  improved_summary: "A highly motivated professional with experience in developing scalable web applications. Proven track record of improving system performance and delivering high-quality software on time.",
  improved_experience_bullets: [
    "Developed and maintained **scalable** web applications that increased user engagement by 25%.",
    "Improved system performance by **40%** through code optimization and database indexing."
  ]
};

export default function GrowWithAIDashboard() {
  const {
    t
  } = useTranslation();

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPro, setIsPro] = useState(user?.isPro || user?.plan?.name?.toLowerCase() === 'premium' || false);

  const [activeTab, setActiveTab] = useState(
    location.state?.tab || new URLSearchParams(location.search).get('tab') || 'interview'
  ); // 'interview' or 'gps' or 'barriers' or 'skillgap' or 'ats'

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsData, setGpsData] = useState(null);
  const [gpsLocked, setGpsLocked] = useState(false);
  
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [refreshInterviewTrigger, setRefreshInterviewTrigger] = useState(0);
  const [barriersLoading, setBarriersLoading] = useState(false);
  const [barriersData, setBarriersData] = useState(null);
  const [barriersLocked, setBarriersLocked] = useState(false);
  
  const [interviewData, setInterviewData] = useState({ technical: [], behavioural: [], hr: [] });
  const [errorMessage, setErrorMessage] = useState(null);

  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);
  
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  
  const [freelanceEnabled, setFreelanceEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  const { state } = location;
  const fileHash = state?.fileHash || localStorage.getItem('lastResumeHash');
  const parsedData = state?.parsedData;

  useEffect(() => {
    const fetchPlanAndData = async () => {
      try {
        const planRes = await getCurrentSubscription();
        const activePlan = planRes?.subscription || planRes || {};
        const planStatus = activePlan?.subscriptionStatus || activePlan?.status || 'active';
        const tier = activePlan?.planSnapshot?.slug || activePlan?.planName || activePlan?.plan || activePlan?.tier || 'free';
        const isUserPro = planStatus === 'active' && String(tier).toLowerCase() !== 'free';
        setIsPro(isUserPro || user?.isPro || false);
      } catch (e) {
        setIsPro(user?.isPro || false);
      }
      fetchUsage();
      fetchGPS(true);
      fetchBarriers(true);
      fetchReport(true);
    };
    fetchPlanAndData();
  }, [fileHash, parsedData, user]);

  const [reportNeedsGen, setReportNeedsGen] = useState(false);

  const fetchReport = async (cachedOnly = false) => {
    try {
      setReportLoading(true);
      if (!isPro) {
        setReportData(fallbackReportData);
        setReportLoading(false);
        return;
      }
      const { data } = await getAICareerReport({ fileHash, parsedData, cachedOnly });
      if (data?.success && data?.data) {
        setReportData(data.data);
        setReportNeedsGen(false);
      } else if (data?.success && data?.needsGeneration) {
        setReportNeedsGen(true);
      }
    } catch (error) {
      console.error('Failed to fetch AI report', error);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      setUsageLoading(true);
      const { data } = await getAiUsage();
      if (data.success) {
        setAiUsage({ limits: data.limits || {}, usage: data.usage || {} });
      }
    } catch (error) {
      console.error('Failed to fetch AI usage', error);
    } finally {
      setUsageLoading(false);
    }
  };

  const [gpsNeedsGen, setGpsNeedsGen] = useState(false);
  const fetchGPS = async (cachedOnly = false) => {
    try {
      setGpsLoading(true);
      setErrorMessage(null);
      
      if (!isPro) {
        setGpsData(fallbackGpsData);
        setGpsLocked(false);
        setGpsLoading(false);
        return;
      }

      const { data } = await getCareerGPS({ fileHash, parsedData, cachedOnly });
      if (data.success && data.data) {
        setGpsData(data.data);
        setGpsLocked(false);
        setGpsNeedsGen(false);
        if (fileHash) localStorage.setItem('lastResumeHash', fileHash);
      } else if (data.success && data.needsGeneration) {
        setGpsNeedsGen(true);
      }
    } catch (error) {
      console.error("Failed to fetch GPS data:", error);
      if (error.response?.data?.code === 'REQUIRED_DATA_MISSING') {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("An error occurred while loading your AI Career GPS.");
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const [barriersNeedsGen, setBarriersNeedsGen] = useState(false);
  const fetchBarriers = async (cachedOnly = false) => {
    try {
      setBarriersLoading(true);
      
      if (!isPro) {
        setBarriersData(fallbackBarriersData);
        setBarriersLocked(false);
        setBarriersLoading(false);
        return;
      }

      const { data } = await getHiringBarriers({ fileHash, parsedData, cachedOnly });
      if (data.success && data.data) {
        setBarriersData(data.data);
        setBarriersLocked(false);
        setBarriersNeedsGen(false);
      } else if (data.success && data.needsGeneration) {
        setBarriersNeedsGen(true);
      }
    } catch (error) {
      console.error("Failed to fetch Hiring Barriers data:", error);
    } finally {
      setBarriersLoading(false);
    }
  };

  if (errorMessage) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center mt-10">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">{t("Interview Preparation")}</h2>
          <p className="text-red-600 mb-6 max-w-md mx-auto">{errorMessage}</p>
          <Link
            to="/provider/profile"
            className="inline-flex items-center px-6 py-3 bg-[#059669] hover:bg-teal-800 text-white font-bold rounded-xl transition-colors gap-2"
          >{t("Go to Profile")}<ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 flex flex-col gap-6 pb-20 relative">
      {/* Usage Banner */}
      {!usageLoading && (
        <div className="bg-white border border-slate-200 p-3 md:px-6 md:py-3 rounded-2xl flex items-center justify-between gap-3 md:gap-2 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
            <Sparkles className="hidden md:block w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[13px] md:text-sm font-medium text-emerald-900">
              {(activeTab === 'interview' || activeTab === 'gps' || activeTab === 'barriers') ? t("AI Insights Limit:") : t("AI Limit:")}
            </span>
            {(() => {
              const map = { interview: 'refreshInsight', gps: 'refreshInsight', barriers: 'refreshInsight' };
              if (activeTab === 'skillgap' || activeTab === 'ats') return <span className="text-[12px] md:text-sm font-bold text-emerald-700">{t("Select supported tab")}</span>;
              const key = map[activeTab];
              const limit = aiUsage.limits[key] || 0;
              const used = aiUsage.usage[key] || 0;
              
              if (limit === -1) return <span className="text-[12px] md:text-sm font-bold text-emerald-700">{t("Unlimited")}</span>;
              if (limit === 0) return <span className="text-[12px] md:text-sm font-bold text-red-600">{t("Not included")}</span>;
              return (
                <span className="text-[12px] md:text-sm font-bold text-emerald-700">
                  {Math.max(0, limit - used)}/{limit} {t("requests remaining")}
                </span>
              );
            })()}
          </div>
          
          <Link to="/provider/plans" className="shrink-0 flex items-center justify-center text-center text-[11px] md:text-xs font-black text-emerald-700 hover:text-emerald-900 bg-emerald-100 px-4 md:px-3 py-1.5 md:py-1 rounded-lg transition-colors whitespace-nowrap">{t("Upgrade Plan")}</Link>
        </div>
      )}
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Main Content */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">{t("Interview Preparation")}<span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-teal-100">{t("Pro")}</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">{t("Data-driven insights to accelerate your career trajectory.")}</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={async () => {
                  if (!isPro) return; // Prevent API call for free users
                  if (activeTab === 'gps') {
                    try {
                      setGpsLoading(true);
                      const { data } = await improveCareerGPS({ fileHash, parsedData, improve: true });
                      if (data.success) {
                        setGpsData(data.data);
                        toast.success("Career GPS Insights updated!");
                        setTimeout(() => fetchUsage(), 500);
                      }
                    } catch (err) {
                      toast.error("Failed to improve insights");
                    } finally {
                      setGpsLoading(false);
                    }
                  } else if (activeTab === 'barriers') {
                    try {
                      setBarriersLoading(true);
                      const { data } = await improveHiringBarriers({ fileHash, parsedData, improve: true });
                      if (data.success) {
                        setBarriersData(data.data);
                        toast.success("Hiring Barriers updated!");
                        setTimeout(() => fetchUsage(), 500);
                      }
                    } catch (err) {
                      toast.error("Failed to improve insights");
                    } finally {
                      setBarriersLoading(false);
                    }
                  } else if (activeTab === 'interview') {
                    try {
                      setInterviewLoading(true);
                      const { data } = await refreshInterviewQuestions();
                      if (data.success) {
                        toast.success("Interview cycle refreshed!");
                        setTimeout(() => fetchUsage(), 500);
                        setRefreshInterviewTrigger(prev => prev + 1);
                      }
                    } catch (err) {
                      toast.error("Failed to refresh interview questions cycle");
                    } finally {
                      setInterviewLoading(false);
                    }
                  }
                }}
                disabled={!isPro || (activeTab === 'gps' && gpsLoading) || (activeTab === 'barriers' && barriersLoading) || (activeTab === 'interview' && interviewLoading) || activeTab === 'skillgap' || activeTab === 'ats'}
                className={`bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 shadow-sm transition ${(activeTab === 'skillgap' || activeTab === 'ats') ? 'hidden' : ''} disabled:opacity-50`}
              >
                <RefreshCw className={`w-4 h-4 ${(activeTab === 'gps' && gpsLoading) || (activeTab === 'barriers' && barriersLoading) || (activeTab === 'interview' && interviewLoading) ? 'animate-spin' : ''}`} />{t("Refresh Insights")}
              </button>
            </div>
          </div>

          {/* Unified Nested Box for Main Tabs and Panel */}
          <div className="max-md:border max-md:border-gray-200 max-md:rounded-2xl max-md:bg-white max-md:shadow-[0_2px_12px_rgba(0,0,0,0.02)] max-md:overflow-hidden max-md:mb-6">
            {/* Main Tabs */}
            <div className="flex max-md:border-b max-md:border-gray-100 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:gap-3 md:pb-3 pt-2 md:pl-2 md:-ml-2 md:pr-4 md:border-b md:border-gray-200">
              {[
                { id: 'interview', icon: MessageSquare, label: 'Interview Questions' },
                { id: 'gps', icon: TrendingUp, label: 'AI Career GPS' },
                { id: 'barriers', icon: AlertCircle, label: 'Why Am I Not Getting Hired?' },
                { id: 'skillgap', icon: FileSearch, label: 'Skill Gap Report' },
                { id: 'ats', icon: Search, label: 'ATS Optimizer' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`transition-all duration-300 whitespace-nowrap flex items-center gap-2 relative
                    max-md:py-3.5 max-md:px-5 max-md:text-[14.5px] max-md:font-bold max-md:border-b-2
                    md:px-4 md:py-2.5 md:rounded-xl md:font-semibold md:text-sm md:border
                    ${
                      activeTab === tab.id
                        ? "max-md:border-emerald-600 max-md:text-emerald-700 max-md:bg-white md:bg-emerald-600 md:text-white md:shadow-sm md:border-emerald-600"
                        : "max-md:border-transparent max-md:text-gray-500 max-md:hover:text-gray-700 max-md:hover:bg-gray-50 md:bg-white md:text-gray-600 md:border-gray-200 md:hover:bg-gray-50 md:hover:text-gray-900"
                    }
                  `}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400'}`} /> 
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Locked State Overlay Logic */}
            <div className="relative min-h-[400px] md:bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            {!usageLoading && isPro && (() => {
              if (activeTab === 'skillgap' || activeTab === 'ats') return null;
              const map = { gps: 'refreshInsight', barriers: 'refreshInsight', interview: 'refreshInsight' };
              const key = map[activeTab];
              const limit = aiUsage.limits[key] || 0;
              const used = aiUsage.usage[key] || 0;
              
              if (limit !== -1 && (limit === 0 || used >= limit)) {
                return (
                  <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center rounded-2xl">
                    <div className="w-16 h-16 bg-red-50 text-red-700 rounded-full flex items-center justify-center mb-4">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {limit === 0 ? 'Feature Not Available' : 'Usage Limit Reached'}
                    </h3>
                    <p className="text-gray-500 max-w-md mb-6 font-medium">
                      {limit === 0 
                        ? "Your current plan does not include access to this feature. Upgrade to unlock."
                        : `You have used all ${limit} requests for this feature in the current billing cycle.`}
                    </p>
                    <Link to="/provider/plans" className="px-6 py-3 bg-[#059669] text-white font-bold rounded-xl hover:bg-teal-800 transition shadow-sm">{t("Upgrade Plan")}</Link>
                  </div>
                );
              }
              return null;
            })()}

            <div className={!usageLoading && isPro && (() => {
              if (activeTab === 'skillgap' || activeTab === 'ats') return false;
              const map = { gps: 'refreshInsight', barriers: 'refreshInsight', interview: 'refreshInsight' };
              const key = map[activeTab];
              const limit = aiUsage.limits[key] || 0;
              const used = aiUsage.usage[key] || 0;
              return (limit !== -1 && (limit === 0 || used >= limit)) ? 'opacity-30 pointer-events-none' : '';
            })() ? 'opacity-30 pointer-events-none' : ''}>
              
              {activeTab === 'gps' && <CareerGPSPanel loading={gpsLoading} data={gpsData} isLocked={gpsLocked} isPro={isPro} needsGen={gpsNeedsGen} onGenerate={() => fetchGPS(false)} />}
              {activeTab === 'barriers' && <HiringBarriersPanel loading={barriersLoading} data={barriersData} isLocked={barriersLocked} gpsData={gpsData} isPro={isPro} needsGen={barriersNeedsGen} onGenerate={() => fetchBarriers(false)} />}
              {activeTab === 'skillgap' && <SkillGapPanel fileHash={fileHash} parsedData={parsedData} isPro={isPro} />}
              {activeTab === 'ats' && <AtsOptimizerPanel fileHash={fileHash} parsedData={parsedData} isPro={isPro} />}
              {activeTab === 'interview' && <InterviewQuestionsPanel key={refreshInterviewTrigger} isPro={isPro} fileHash={fileHash} parsedData={parsedData} />}
              

            </div>
          </div>
          </div>
        </div>

        {/* Right Sidebar - Identical to AITips */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* AI Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-[#059669]" />
              <h3 className="font-bold text-gray-900 max-md:text-[18px] md:text-[14px]">{t("AI Summary")}</h3>
            </div>
            <p className="max-md:text-[15px] md:text-[11px] text-gray-500 mb-5 leading-relaxed font-medium">{t("Here's what AI thinks about your job search progress.")}</p>
            
            <ul className="space-y-3.5 mb-6">
              {reportLoading ? (
                <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : reportNeedsGen ? (
                <div className="text-center py-4">
                  <p className="max-md:text-[15px] md:text-[11px] text-gray-500 mb-3">{t("New analysis available.")}</p>
                  <button onClick={() => fetchReport(false)} className="px-4 py-2 bg-[#059669] text-white max-md:text-[15px] md:text-[11px] font-bold rounded-lg shadow-sm hover:bg-teal-800 transition-all flex items-center justify-center gap-1.5 w-full">
                    <Sparkles className="w-3.5 h-3.5" /> {t("Generate AI Report (1 Credit)")}
                  </button>
                </div>
              ) : reportData?.top_strengths ? (
                reportData.top_strengths.slice(0, 4).map((strength, i) => (
                  <li key={i} className="flex items-start gap-2 max-md:text-[15px] md:text-[11px] font-bold text-gray-700">
                    <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                    <span className={!isPro ? "blur-[4px] select-none pointer-events-none" : ""}>{strength}</span>
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-start gap-2 max-md:text-[15px] md:text-[11px] font-bold text-gray-700">
                    <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />{t("Your profile is well optimized")}</li>
                  <li className="flex items-start gap-2 max-md:text-[15px] md:text-[11px] font-bold text-gray-700">
                    <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />{t("You have strong skills for your roles")}</li>
                  <li className="flex items-start gap-2 max-md:text-[15px] md:text-[11px] font-bold text-gray-700">
                    <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />{t("Keep applying consistently")}</li>
                  <li className="flex items-start gap-2 max-md:text-[15px] md:text-[11px] font-bold text-gray-700">
                    <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />{t("Improve these skills to get more interviews")}</li>
                </>
              )}
            </ul>
            {!reportNeedsGen && (
              <button 
                onClick={() => isPro && setIsAiReportModalOpen(true)}
                className={`w-full py-2.5 border border-gray-200 rounded-xl max-md:text-[15px] md:text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition flex justify-center items-center gap-1.5 ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {t("View Full AI Analysis")}<ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* AI Coach */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-gray-900 max-md:text-[18px] md:text-[14px]">{t("AI Coach")}</h3>
              </div>
              <span className="bg-indigo-50 text-indigo-600 max-md:text-[12px] md:text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">{t("Premium")}</span>
            </div>
            <p className="max-md:text-[15px] md:text-[11px] text-gray-500 mb-5 leading-relaxed font-medium">{t("Get personalized guidance to move ahead in your career.")}</p>
            
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl rounded-tr-sm mb-5 relative ml-6">
              <p className="max-md:text-[15px] md:text-[11px] text-gray-700 leading-relaxed font-medium">{t(
                "Hi! I analyzed your profile and applications. Would you like me to suggest some ways to improve your chances?"
              )}</p>
              <div className="absolute -left-8 top-0 w-8 h-8 bg-[#059669] shadow-sm rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <button onClick={() => isPro && window.dispatchEvent(new CustomEvent('open-ai-coach'))} className={`w-full py-2.5 border border-gray-200 rounded-xl max-md:text-[15px] md:text-[11px] font-bold text-[#059669] hover:bg-gray-50 transition flex justify-center items-center gap-1.5 ${isPro ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>{t("Chat with AI Coach")}<ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* WhatsApp AI Alerts */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#075E54] flex items-center justify-center"><FaWhatsapp className="w-3.5 h-3.5 text-white" /></div>
                <h3 className="font-bold text-gray-900 max-md:text-[18px] md:text-[14px]">{t("WhatsApp AI Alerts")}</h3>
              </div>
              <div
                onClick={() => {
                  setWhatsappEnabled(!whatsappEnabled);
                  toast.success(whatsappEnabled ? "WhatsApp alerts disabled" : "WhatsApp alerts enabled!");
                }}
                className={`w-11 h-6 min-w-[44px] min-h-[24px] max-h-[24px] shrink-0 rounded-full p-[2px] cursor-pointer transition-colors duration-200 ease-in-out flex items-center box-border ${whatsappEnabled ? 'bg-[#075E54]' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 min-w-[20px] min-h-[20px] rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${whatsappEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>
            <p className="max-md:text-[15px] md:text-[11px] text-gray-500 mb-4 font-medium">
              {whatsappEnabled ? t("You will receive updates on your phone.") : t("Stay updated on the go!")}
            </p>
            
            <ul className={`space-y-3 mb-6 transition-opacity duration-200 ${whatsappEnabled ? 'opacity-100' : 'opacity-60'}`}>
              <li className="flex items-center gap-2 max-md:text-[15px] md:text-[11px] font-bold text-gray-700"><Check className={`w-3.5 h-3.5 ${whatsappEnabled ? 'text-[#075E54]' : 'text-gray-400'}`} />{t("New job matches")}</li>
              <li className="flex items-center gap-2 max-md:text-[15px] md:text-[11px] font-bold text-gray-700"><Check className={`w-3.5 h-3.5 ${whatsappEnabled ? 'text-[#075E54]' : 'text-gray-400'}`} />{t("Application status updates")}</li>
              <li className="flex items-center gap-2 max-md:text-[15px] md:text-[11px] font-bold text-gray-700"><Check className={`w-3.5 h-3.5 ${whatsappEnabled ? 'text-[#075E54]' : 'text-gray-400'}`} />{t("Interview reminders")}</li>
              <li className="flex items-center gap-2 max-md:text-[15px] md:text-[11px] font-bold text-gray-700"><Check className={`w-3.5 h-3.5 ${whatsappEnabled ? 'text-[#075E54]' : 'text-gray-400'}`} />{t("Salary drops & more")}</li>
            </ul>
            
            <button 
              onClick={() => {
                setWhatsappEnabled(!whatsappEnabled);
                toast.success(whatsappEnabled ? "WhatsApp alerts disabled" : "WhatsApp alerts enabled!");
              }}
              className={`w-full py-2.5 border rounded-xl max-md:text-[15px] md:text-[11px] font-bold transition flex justify-center items-center gap-2 ${whatsappEnabled ? 'border-[#075E54]/20 bg-[#075E54]/10 text-[#04433B] hover:bg-[#075E54]/20' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              {whatsappEnabled ? t("Manage Alert Settings") : t("Enable WhatsApp Alerts")}<FaWhatsapp className={`w-4 h-4 ${whatsappEnabled ? 'text-[#04433B]' : 'text-[#075E54]'}`} />
            </button>
          </div>

          {/* Earn Extra Income */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-center text-[10px]">💰</div>
                <h3 className="font-bold text-gray-900 max-md:text-[18px] md:text-[14px]">{t("Earn Extra Income")}</h3>
                <span className="bg-orange-50 text-orange-600 border border-orange-100 max-md:text-[12px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full hidden sm:inline-block">{t("New")}</span>
              </div>
              <div
                onClick={() => {
                  setFreelanceEnabled(!freelanceEnabled);
                  toast.success(freelanceEnabled ? "Freelance discovery paused" : "Freelance mode activated!");
                }}
                className={`w-11 h-6 min-w-[44px] min-h-[24px] max-h-[24px] shrink-0 rounded-full p-[2px] cursor-pointer transition-colors duration-200 ease-in-out flex items-center box-border ${freelanceEnabled ? 'bg-[#059669]' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 min-w-[20px] min-h-[20px] rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${freelanceEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-2 mb-5 mt-4">
              <p className="max-md:text-[15px] md:text-[11px] text-gray-700 leading-relaxed max-w-[130px] font-medium">
                {freelanceEnabled 
                  ? t("We are actively finding freelance projects for you.") 
                  : t("Discover freelance projects matching your skills.")}
              </p>
              <div className={`w-10 h-10 rounded-xl hidden md:flex items-center justify-center border transition-colors ${freelanceEnabled ? 'bg-[#059669] border-[#059669]' : 'bg-[#059669]/10 border-[#059669]/20'}`}>
                <Briefcase className={`w-5 h-5 transition-colors ${freelanceEnabled ? 'text-white' : 'text-[#059669]'}`} />
              </div>
            </div>

            <button 
              onClick={() => navigate('/provider/jobs?type=freelance')}
              className={`w-full py-2.5 border rounded-xl max-md:text-[15px] md:text-[11px] font-bold transition flex justify-center items-center gap-1.5 shadow-sm ${freelanceEnabled ? 'border-[#059669] bg-[#059669] text-white hover:bg-[#115e59]' : 'border-[#059669]/20 bg-[#059669]/5 text-[#059669] hover:bg-[#059669]/10'}`}
            >
              {t("Explore Freelance Jobs")}<ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      <AiCareerReportModal 
        isOpen={isAiReportModalOpen} 
        onClose={() => setIsAiReportModalOpen(false)} 
        fileHash={fileHash} 
        parsedData={parsedData} 
      />
      <AICoachModal role="provider" />
    </div>
  );
}

// -------------------------------------------------------------------------
// SUB-PANELS
// -------------------------------------------------------------------------

function CareerGPSPanel({ loading, data, isLocked, isPro, needsGen, onGenerate }) {
  const {
    t
  } = useTranslation();

  const blurClass = !isPro ? "blur-[6px] select-none pointer-events-none" : "";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#059669] mb-4"></div>
        <p className="text-[13px] font-bold text-gray-500">{t("Calculating your optimal career trajectory...")}</p>
      </div>
    );
  }
  if (needsGen) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh]">
        <div className="bg-teal-50 text-teal-700 p-4 rounded-full mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t("AI Career GPS Ready")}</h3>
        <p className="text-[13px] text-gray-500 max-w-md text-center mb-6">{t("Your profile has changed or you haven't generated this yet. Generate your AI Career GPS to see your optimal career trajectory.")}</p>
        <button onClick={onGenerate} className="px-6 py-2.5 bg-[#059669] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-teal-800 transition-all flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> {t("Generate AI Analysis (1 Credit)")}
        </button>
      </div>
    );
  }
  if (!data) return <div className="p-10 text-center text-gray-500 text-[13px] font-medium">{t("No GPS data available. Refresh insights.")}</div>;

  return (
    <div className="relative p-6">
      {!isPro && (
        <div className="absolute top-4 right-4 z-10">
          <Link to="/provider/my-plan" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 pointer-events-auto">
            <Lock className="w-3.5 h-3.5" /> Unlock Premium to use this feature
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-gray-500 mb-1">{t("CURRENT ROLE")}</p>
          <h3 className={`text-[18px] font-black text-gray-900 ${blurClass}`}>{data.current_role || 'Not Specified'}</h3>
        </div>
        <div className="bg-teal-50/50 p-5 rounded-2xl border border-teal-100 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-teal-700 mb-1">{t("RECOMMENDED NEXT ROLE")}</p>
          <h3 className={`text-[18px] font-black text-[#059669] ${blurClass}`}>{data.recommended_next_role}</h3>
        </div>
      </div>
      <div className="mb-8">
        <h4 className="text-[14px] font-bold text-gray-900 mb-2">{t("Reasoning Summary")}</h4>
        <p className={`text-[12px] text-gray-700 leading-relaxed font-medium ${blurClass}`}>{data.reasoning_summary}</p>
      </div>
      <div className={isLocked ? "blur-md pointer-events-none opacity-50 select-none" : ""}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h4 className="text-[13px] font-bold text-gray-900 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-700" />{t("Required Skills")}</h4>
            <div className="flex flex-wrap gap-1.5">
              {(data.required_skills || ['React', 'System Design']).map((skill, i) => (
                <span key={i} className={`px-2.5 py-1.5 bg-gray-50 border border-gray-100 text-gray-700 rounded-lg text-[11px] font-bold ${blurClass}`}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-gray-900 mb-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-orange-500" />{t("Missing Skills to Acquire")}</h4>
            <div className="flex flex-wrap gap-1.5">
              {(data.missing_skills && data.missing_skills.length > 0 ? data.missing_skills : ['TypeScript', 'System Design']).map((skill, i) => (
                <span key={i} className={`px-2.5 py-1.5 bg-orange-50 border border-orange-100 text-orange-700 rounded-lg text-[11px] font-bold ${blurClass}`}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2">
            <h4 className="text-[14px] font-bold text-gray-900 mb-4">{t("Step-by-Step Learning Path")}</h4>
            <div className="space-y-3">
              {(data.learning_path || [{ step: 'Step 1', description: 'Sample' }]).map((path, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                  <div className="w-6 h-6 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 border border-teal-100">
                    {i + 1}
                  </div>
                  <div>
                    <h5 className={`font-bold text-[12px] text-gray-900 ${blurClass}`}>{path.step}</h5>
                    <p className={`text-gray-500 text-[11px] mt-1 font-medium ${blurClass}`}>{path.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-700 mb-1">{t("SALARY POTENTIAL")}</p>
              <h3 className={`text-3xl font-black text-emerald-600 ${blurClass}`}>
                {data.salary_growth_potential_percent 
                  ? `+${String(data.salary_growth_potential_percent).replace('%', '')}%` 
                  : 'N/A'}
              </h3>
              <p className="text-emerald-700/80 text-[10px] mt-1 font-medium">{t("Estimated increase")}</p>
            </div>
            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-700 mb-1">{t("ESTIMATED TIMELINE")}</p>
              <h3 className={`text-3xl font-black text-indigo-700 ${blurClass}`}>
                {data.estimated_timeline_months 
                  ? `${String(data.estimated_timeline_months).replace(/mo|months/i, '').trim()} mo` 
                  : 'N/A'}
              </h3>
              <p className="text-indigo-700/80 text-[10px] mt-1 font-medium">{t("To reach readiness")}</p>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <h4 className="text-[12px] font-bold text-gray-900 mb-3">{t("Alternative Roles")}</h4>
              <ul className="space-y-2">
                {(data.alternative_roles || ['Role A']).map((role, i) => (
                  <li key={i} className={`flex items-center gap-1.5 text-[11px] font-bold text-gray-700 ${blurClass}`}>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> {role}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HiringBarriersPanel({ loading, data, isLocked, gpsData, isPro }) {
  const {
    t
  } = useTranslation();
  
  const blurClass = !isPro ? "blur-[6px] select-none pointer-events-none" : "";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#059669] mb-4"></div>
        <p className="text-[13px] font-bold text-gray-500">{t("Analyzing your hiring barriers...")}</p>
      </div>
    );
  }
  if (!data) return <div className="p-10 text-center text-gray-500 text-[13px] font-medium">{t("No barrier data available. Refresh insights.")}</div>;

  return (
    <div className="relative p-6">
      {!isPro && (
        <div className="absolute top-4 right-4 z-10">
          <Link to="/provider/my-plan" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 pointer-events-auto">
            <Lock className="w-3.5 h-3.5" /> Unlock Premium to use this feature
          </Link>
        </div>
      )}
      {/* Score Card */}
      <div className="flex flex-col md:flex-row gap-6 items-center bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mb-8">
        <div className="w-[84px] h-[84px] shrink-0 relative">
          <CircularProgressbar 
            value={data.hiring_barrier_score || 0} 
            strokeWidth={10} 
            styles={buildStyles({ 
              pathColor: data.hiring_barrier_score > 60 ? '#ef4444' : data.hiring_barrier_score > 30 ? '#f59e0b' : '#10b981', 
              trailColor: '#f1f5f9' 
            })}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-black text-gray-900 leading-none ${blurClass}`}>{data.hiring_barrier_score}</span>
          </div>
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1">{t("Hiring Barrier Score")}</h3>
          <p className="text-[12px] text-gray-700 font-medium leading-relaxed">{t("A lower score is better. Your score indicates")}<span className="font-bold text-gray-800">{data.hiring_barrier_score > 60 ? 'significant' : data.hiring_barrier_score > 30 ? 'moderate' : 'few'}</span>{t("barriers to getting hired based on your current presentation and skills.")}</p>
        </div>
      </div>
      <div className="mb-8">
        <h4 className="text-[14px] font-bold text-gray-900 mb-3">{t("Top Reason You Aren't Getting Hired")}</h4>
        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-emerald-800 text-[13px] font-bold flex items-start gap-3">
           <AlertCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
           <span className={blurClass}>{data.top_reasons?.[0] || "Needs more data."}</span>
        </div>
      </div>
      <div className={isLocked ? "blur-md pointer-events-none opacity-50 select-none" : ""}>
        
        {data.top_reasons?.length > 1 && (
          <div className="mb-8">
            <h4 className="text-[13px] font-bold text-gray-900 mb-3">{t("Other Major Reasons")}</h4>
            <ul className="space-y-2.5">
              {data.top_reasons.slice(1).map((reason, i) => (
                <li key={i} className="flex items-start gap-2.5 text-gray-700 text-[12px] font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                  <span className={blurClass}>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <h5 className="font-bold text-[13px] text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase className="text-blue-500 w-4 h-4" />{t("Resume Issues")}</h5>
            <ul className="space-y-2.5 text-[11px] text-gray-700 font-medium">
              {(data.resume_issues || ['Issue 1']).map((issue, i) => (
                <li key={i} className="flex items-start gap-2"><Check className="w-3 h-3 text-blue-700 mt-0.5 shrink-0"/> <span className={blurClass}>{issue}</span></li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <h5 className="font-bold text-[13px] text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="text-amber-500 w-4 h-4" />{t("Skill Issues")}</h5>
            <ul className="space-y-2.5 text-[11px] text-gray-700 font-medium">
              {((gpsData?.missing_skills?.length > 0 ? gpsData.missing_skills : data.skill_issues) || ['No major issues']).map((issue, i) => (
                <li key={i} className="flex items-start gap-2"><Check className="w-3 h-3 text-amber-400 mt-0.5 shrink-0"/> <span className={blurClass}>{issue}</span></li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <h5 className="font-bold text-[13px] text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="text-emerald-500 w-4 h-4" />{t("Salary/Location")}</h5>
            <ul className="space-y-2.5 text-[11px] text-gray-700 font-medium">
              {(data.salary_or_location_issues || ['Issue 1']).map((issue, i) => (
                <li key={i} className="flex items-start gap-2"><Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0"/> <span className={blurClass}>{issue}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h4 className="text-[14px] font-bold text-gray-900 mb-4">{t("Immediate Action Plan")}</h4>
          <div className="space-y-3">
            {(data.immediate_action_plan || [{ action: 'Update resume', priority: 'High' }]).map((plan, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-gray-100 shadow-sm p-4 rounded-xl">
                <span className={`font-bold text-gray-700 text-[12px] ${blurClass}`}>{plan.action}</span>
                <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                  plan.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                  plan.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-green-50 text-green-700 border border-green-100'
                } ${blurClass}`}>
                  {plan.priority}{t("Priority")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      

    </div>
  );
}

function SkillGapPanel({ fileHash, parsedData, isPro }) {
  const {
    t
  } = useTranslation();

  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(!isPro ? fallbackSkillGapData : null);

  const blurClass = !isPro ? "blur-[6px] select-none pointer-events-none" : "";

  const handleAnalyze = async () => {
    if (!jd.trim()) return;
    try {
      setLoading(true);
      if (!isPro) {
        setTimeout(() => {
          setData(fallbackSkillGapData);
          setLoading(false);
        }, 800);
        return;
      }
      const res = await getSkillGap({ fileHash, parsedData, jobDescription: jd });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch Skill Gap data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Input area */}
      <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
        <h3 className="text-[15px] font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FileSearch className="text-[#059669] w-5 h-5" />{t("Test AI Skill Gap Analysis")}</h3>
        <p className="text-gray-500 mb-5 text-[12px] font-medium">{t("Paste a Job Description here to see how your resume holds up against it.")}</p>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] text-[12px] outline-none transition shadow-inner font-medium text-gray-700"
          placeholder={t("Paste Job Description here...")}
        />
        {!isPro ? (
          <Link
            to="/provider/plans"
            className="mt-4 bg-white border-2 border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 px-5 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition w-max hover:bg-emerald-50"
          >
            <Lock className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
            {t("Purchase AI Plan to See This Feature")}
          </Link>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={loading || !jd.trim()}
            className="mt-4 bg-[#059669] hover:bg-teal-800 text-white px-5 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{t("Analyzing...")}</>
            ) : (
              <><Sparkles className="w-4 h-4" />{t("Generate Skill Gap Report")}</>
            )}
          </button>
        )}
      </div>
      {/* Results */}
      {data && (
        <div className="animate-fadeIn space-y-8">
          
          <div className="flex flex-col md:flex-row gap-6 items-center bg-teal-50/30 p-6 rounded-2xl border border-teal-100">
            <div className="w-[84px] h-[84px] shrink-0 relative">
              <CircularProgressbar 
                value={data.job_match_score || 0} 
                strokeWidth={10} 
                styles={buildStyles({ 
                  pathColor: data.job_match_score > 75 ? '#059669' : data.job_match_score > 50 ? '#f59e0b' : '#ef4444', 
                  trailColor: '#e2e8f0' 
                })}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black text-gray-900 leading-none ${blurClass}`}>{data.job_match_score}%</span>
              </div>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">{t("Job Match Score")}</h3>
              <p className="text-gray-700 text-[12px] font-medium">{t("Based on your resume, you are a")}<span className={`font-bold text-gray-800 ${blurClass}`}>{data.job_match_score}{t("% match")}</span>{t("for this job description.")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h4 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="text-green-700 w-4 h-4" />{t("Matched Skills")}</h4>
              <div className="flex flex-wrap gap-1.5">
                {(data.matched_skills || []).map((skill, i) => (
                  <span key={i} className={`px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-md text-[11px] font-bold ${blurClass}`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h4 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="text-red-700 w-4 h-4" />{t("Missing Critical Skills")}</h4>
              <div className="flex flex-wrap gap-1.5">
                {(data.missing_critical_skills || []).map((skill, i) => (
                  <span key={i} className={`px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-md text-[11px] font-bold ${blurClass}`}>
                    {skill}
                  </span>
                ))}
                {(!data.missing_critical_skills || data.missing_critical_skills.length === 0) && (
                  <span className={`px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-md text-[11px] font-bold ${blurClass}`}>{t("None!")}</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-indigo-600 w-5 h-5" />
              <h4 className="text-[14px] font-bold text-gray-900">{t("Fastest Hire Path")}</h4>
            </div>
            <p className={`text-gray-700 leading-relaxed text-[12px] font-medium mb-4 ${blurClass}`}>
              {data.fastest_hire_path || "No clear path identified."}
            </p>
            <div className="pt-4 border-t border-indigo-100 flex items-center justify-between">
              <span className="text-gray-500 text-[11px] font-bold">{t("Estimated time to be hire-ready:")}</span>
              <span className={`px-3 py-1 bg-white border border-indigo-100 text-indigo-700 rounded-lg font-black text-[11px] ${blurClass}`}>
                {data.hire_ready_after || "Unknown"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AtsOptimizerPanel({ fileHash, parsedData, isPro }) {
  const {
    t
  } = useTranslation();

  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(!isPro ? fallbackAtsData : null);

  const blurClass = !isPro ? "blur-[6px] select-none pointer-events-none" : "";

  const handleOptimize = async () => {
    if (!jd.trim()) return;
    try {
      setLoading(true);
      if (!isPro) {
        setTimeout(() => {
          setData(fallbackAtsData);
          setLoading(false);
        }, 800);
        return;
      }
      const res = await getAtsOptimizer({ fileHash, parsedData, jobDescription: jd });
      if (res.success || res.data) {
        setData(res.data.data || res.data);
      }
    } catch (error) {
      console.error("Failed to fetch ATS Optimizer data:", error);
      toast.error('Failed to analyze ATS compatibility.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
        <h3 className="text-[15px] font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Search className="text-[#059669] w-5 h-5" />{t("ATS Resume Optimizer")}</h3>
        <p className="text-gray-500 mb-5 text-[12px] font-medium">{t(
          "Paste the target Job Description to see how an ATS evaluates your resume. We will suggest actionable improvements."
        )}</p>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] text-[12px] outline-none transition shadow-inner font-medium text-gray-700"
          placeholder={t("Paste Target Job Description here...")}
        />
        {!isPro ? (
          <Link
            to="/provider/plans"
            className="mt-4 bg-white border-2 border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 px-5 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition w-max hover:bg-emerald-50"
          >
            <Lock className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
            {t("Purchase Plan to See Details")}
          </Link>
        ) : (
          <button
            onClick={handleOptimize}
            disabled={loading || !jd.trim()}
            className="mt-4 bg-[#059669] hover:bg-teal-800 text-white px-5 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{t("Optimizing...")}</>
            ) : (
              <><Sparkles className="w-4 h-4" />{t("Optimize for ATS")}</>
            )}
          </button>
        )}
      </div>
      {data && (
        <div className="animate-fadeIn space-y-8">
          
          {data.warnings?.length > 0 && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[13px] font-bold text-red-800 mb-1">{t("AI Integrity Warnings")}</h3>
                <ul className="text-[11px] text-red-700 font-medium space-y-1">
                  {data.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-5 shadow-sm">
              <div className="w-[64px] h-[64px] shrink-0 relative">
                <CircularProgressbar 
                  value={data.ats_score_before || 0} strokeWidth={8} 
                  styles={buildStyles({ pathColor: '#64748b', trailColor: '#f1f5f9' })}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-[18px] font-black text-gray-700 ${blurClass}`}>{data.ats_score_before}</span>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-[13px] text-gray-900 mb-1">{t("Original ATS Score")}</h4>
                <p className="text-[11px] font-medium text-gray-500">{t("Your current match percentage.")}</p>
              </div>
            </div>

            <div className="bg-teal-50/50 border border-teal-100 p-5 rounded-2xl flex items-center gap-5 shadow-sm">
              <div className="w-[64px] h-[64px] shrink-0 relative">
                <CircularProgressbar 
                  value={data.ats_score_after || 0} strokeWidth={8} 
                  styles={buildStyles({ pathColor: '#059669', trailColor: '#ccfbf1' })}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-[18px] font-black text-[#059669] ${blurClass}`}>{data.ats_score_after}</span>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-[13px] text-gray-900 mb-1">{t("Potential ATS Score")}</h4>
                <p className="text-[11px] font-medium text-teal-700">{t("Score after applying improvements.")}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-[13px] text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="text-orange-500 w-4 h-4" />{t("Missing Keywords")}</h4>
              <div className="flex flex-wrap gap-1.5">
                {(data.missing_keywords || []).map((keyword, i) => (
                  <span key={i} className={`px-2 py-1 bg-orange-50 border border-orange-100 text-orange-700 rounded-md text-[10px] font-bold ${blurClass}`}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-[13px] text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="text-green-500 w-4 h-4" />{t("Recommended to Add")}</h4>
              <div className="flex flex-wrap gap-1.5">
                {(data.added_keywords || []).map((keyword, i) => (
                  <span key={i} className={`px-2 py-1 bg-green-50 border border-green-100 text-green-700 rounded-md text-[10px] font-bold ${blurClass}`}>
                    + {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
              <h4 className="text-[14px] font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="text-indigo-600 w-4 h-4" />{t("Optimized Resume Summary")}</h4>
              <p className={`text-indigo-900 leading-relaxed text-[12px] font-medium ${blurClass}`}>
                {data.improved_summary || "No summary improvements suggested."}
              </p>
            </div>

            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
              <h4 className="text-[14px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="text-[#059669] w-4 h-4" />{t("Improved Experience Bullets")}</h4>
              <ul className="space-y-3">
                {(data.improved_experience_bullets || []).map((bullet, i) => (
                  <li key={i} className={`flex gap-3 text-[12px] text-gray-700 bg-gray-50/50 p-3 rounded-xl border border-gray-100 font-medium leading-relaxed ${blurClass}`}>
                    <CheckCircle2 className="text-[#059669] w-4 h-4 shrink-0 mt-0.5" />
                    <span dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InterviewQuestionsPanel({ isPro, fileHash, parsedData }) {
  const { t } = useTranslation();
  const blurClass = !isPro ? "blur-[5px] select-none pointer-events-none opacity-80" : "";
  const [activeCategory, setActiveCategory] = useState('technical'); // technical, behavioural, hr
  const [revealed, setRevealed] = useState({});
  const [questions, setQuestions] = useState({ technical: [], behavioural: [], hr: [] });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchCache = async () => {
      if (!isPro) {
        setInitialLoading(false);
        return;
      }
      try {
        const { data } = await getInterviewQuestions({ fileHash, parsedData });
        if (data.success && data.data) {
          setQuestions(prev => ({
            technical: Array.isArray(data.data.technical) ? data.data.technical : prev.technical,
            behavioural: Array.isArray(data.data.behavioural) ? data.data.behavioural : prev.behavioural,
            hr: Array.isArray(data.data.hr) ? data.data.hr : prev.hr
          }));
        }
      } catch (err) {
        console.error("Failed to fetch cached questions", err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchCache();
  }, [fileHash, parsedData, isPro]);

  const fetchQuestions = async (category) => {
    if (!isPro) return;
    if (questions[category].length >= 15) {
       toast.success("You've generated the maximum questions for this category.");
       return;
    }
    
    try {
      setLoading(true);
      const { data } = await getInterviewQuestions({ 
        fileHash, 
        parsedData, 
        category,
        existingQuestions: questions[category] 
      });
      if (data.success) {
        setQuestions(prev => ({
          ...prev,
          [category]: [...prev[category], ...data.data.questions]
        }));
      }
    } catch (err) {
      toast.error("Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  const toggleReveal = (idx) => {
    setRevealed(prev => (prev[idx] ? {} : { [idx]: true }));
  };

  return (
    <div className="animate-fadeIn p-2">
      {initialLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-4" />
          <p className="text-gray-500 font-medium text-sm animate-pulse">{t("Loading your questions...")}</p>
        </div>
      ) : (
        <>
      <div className="mb-6 text-left">
        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 justify-start">
          <MessageSquare className="text-[#059669] w-6 h-6 hidden md:block" /> {t("Interview Questions")}
        </h2>
        <p className="text-gray-500 text-[13px] font-medium mt-1">
          {t("AI-generated questions tailored to your profile and target roles.")}
        </p>
      </div>
      {/* Unified Nested Box for Tabs and Questions */}
      <div className="mb-4 md:mb-0 max-md:border max-md:border-gray-200 max-md:rounded-2xl max-md:bg-white max-md:shadow-sm max-md:overflow-hidden">
        {/* Category Tabs */}
        <div className="flex max-md:border-b max-md:border-gray-100 overflow-x-auto [&::-webkit-scrollbar]:hidden md:gap-2 md:mb-6">
          {['technical', 'behavioural', 'hr'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`capitalize transition-all whitespace-nowrap
                max-md:flex-1 max-md:py-3.5 max-md:px-4 max-md:text-[14.5px] max-md:font-bold max-md:text-center max-md:border-b-2
                md:px-4 md:py-2 md:rounded-xl md:text-sm md:font-bold md:border
                ${
                  activeCategory === cat 
                    ? 'max-md:border-emerald-600 max-md:text-emerald-700 max-md:bg-white md:bg-emerald-600 md:text-white md:border-transparent md:shadow-md md:shadow-emerald-600/25' 
                    : 'max-md:border-transparent max-md:text-gray-500 max-md:hover:text-gray-700 max-md:hover:bg-gray-50 md:bg-white md:text-gray-700 md:border-gray-200 md:hover:border-emerald-600/30 md:hover:bg-emerald-50/50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>


        <div className="max-md:p-2 sm:max-md:p-4">
          <div className="max-md:space-y-6 max-md:divide-y max-md:divide-gray-100 md:space-y-4">
            {questions[activeCategory].map((item, i) => {
              const globalIdx = `${activeCategory}-${i}`;
              const isRevealed = revealed[globalIdx];
              return (
                <div key={globalIdx} className={`max-md:pt-6 max-md:first:pt-2 md:bg-white md:border md:border-gray-100 md:rounded-2xl md:p-5 md:shadow-sm md:hover:shadow-md md:hover:border-emerald-600/30 md:transition-all md:group ${i !== 0 ? 'max-md:mt-6' : ''}`}>
                  <div className="flex flex-col items-start text-left w-full">
                    <div className="flex justify-between items-center w-full mb-3">
                      <span className="text-[10px] font-bold text-[#059669] bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md inline-block capitalize">
                        {activeCategory}
                      </span>
                      {isPro && (
                        <button 
                          onClick={() => toggleReveal(globalIdx)}
                          className="text-emerald-600 hover:text-emerald-800 text-[13px] font-bold transition flex items-center gap-1"
                          title={isRevealed ? "Hide Answer" : "View Answer"}
                        >
                          {isRevealed ? (
                            <span>{t("Hide Answer")}</span>
                          ) : (
                            <>
                              <span>{t("View Answer")}</span> <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <h4 className={`text-[14px] font-medium text-gray-800 w-full mb-1 ${blurClass}`}>
                      {item.q}
                    </h4>
                  </div>
                  
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isRevealed ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
                  >
                    <div className={`text-[13px] text-gray-700 font-medium bg-teal-50/50 border border-teal-100 p-4 rounded-xl leading-relaxed whitespace-pre-wrap ${blurClass}`}>
                      <strong className="text-[#059669] block mb-1">{t("Suggested Answer / Framework:")}</strong> 
                      {item.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        {!isPro && questions[activeCategory].length === 0 && (
          <div className="text-center p-8 m-4 border-2 border-dashed border-gray-200 rounded-2xl">
            <Lock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-gray-900 font-bold mb-1">{t("Unlock Interview Questions")}</h3>
            <p className="text-gray-500 text-[13px] mb-4">{t("Get AI-generated questions tailored to your profile.")}</p>
            <Link to="/provider/plans" className="inline-flex px-4 py-2 bg-[#059669] text-white text-[13px] font-bold rounded-lg hover:bg-teal-800 transition shadow-sm">{t("Upgrade to Pro")}</Link>
          </div>
        )}

        {isPro && questions[activeCategory].length === 0 && !loading && (
          <div className="flex flex-col items-start md:items-center justify-center p-6 md:p-10 border-2 border-dashed border-[#059669]/20 rounded-2xl bg-teal-50/30">
            <MessageSquare className="w-10 h-10 text-[#059669]/40 mb-3 hidden md:block" />
            <h3 className="text-gray-900 font-bold mb-1">Ready for {activeCategory} questions?</h3>
            <p className="text-sm text-gray-500 mb-5 max-w-sm text-left md:text-center">Generate your first batch of AI-tailored {activeCategory} interview questions to practice.</p>
            <button 
              onClick={() => fetchQuestions(activeCategory)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2"
            >
              <Bot className="w-4 h-4" /> Generate Questions
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
          </div>
        )}

        {isPro && questions[activeCategory].length > 0 && questions[activeCategory].length < 15 && !loading && (
          <div className="flex justify-start md:justify-center mt-6">
            <button 
              onClick={() => fetchQuestions(activeCategory)}
              className="bg-gray-50 hover:bg-gray-100 text-emerald-700 border border-gray-200 px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 hidden md:block" /> {t("Load More Questions")}
            </button>
          </div>
        )}
      </div>
      </div>
      </>
      )}
    </div>
  );
}
