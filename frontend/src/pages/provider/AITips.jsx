import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle, ArrowRight, Briefcase, TrendingUp, Lightbulb, Target, CheckCircle2, Lock, Bot, Info, RefreshCcw, Bookmark, MapPin, Heart, ChevronRight, Check, FileText, X } from "lucide-react";
import { getAICareerReport, getAiUsage, improveAICareerReport } from "../../services/providerAIService";
import { providerAPI } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { FaWhatsapp } from 'react-icons/fa';
import AICoachModal from '../../components/provider/AICoachModal';
import { useAuth } from '../../context/AuthContext';
import { getCurrentSubscription } from '../../services/providerPlanService';

export default function AITips() {
  const { user } = useAuth();
  const {
    t
  } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  const [topJobs, setTopJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const init = async () => {
      let isUserPro = false;
      try {
        const planRes = await getCurrentSubscription();
        const activePlan = planRes?.subscription || planRes || {};
        const planStatus = activePlan?.subscriptionStatus || activePlan?.status || 'active';
        const tier = activePlan?.planSnapshot?.slug || activePlan?.planName || activePlan?.plan || activePlan?.tier || 'free';
        isUserPro = planStatus === 'active' && String(tier).toLowerCase() !== 'free';
      } catch {}
      
      const finalIsPro = isUserPro || user?.isPro || false;
      setIsPro(finalIsPro);

      fetchUsage();
      fetchProfile();
      fetchTopJobs();
      fetchAICareerReport(finalIsPro, true);
    };
    init();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await providerAPI.getProfile();
      if (data.success) {
        setProfile(data.data);
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  const fetchTopJobs = async () => {
    try {
      const { data } = await providerAPI.getMatches();
      if (data.success) {
        setTopJobs(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load jobs", err);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleSaveJob = async (e, job, idx) => {
    e.preventDefault();
    if (!job || (!job._id && !job.id)) return;
    try {
      await providerAPI.toggleSaveJob(job._id || job.id, job.isExternal || false);
      setTopJobs(prev => prev.map((j, i) => i === idx ? { ...j, isSaved: !j.isSaved } : j));
      toast.success(job.isSaved ? "Job removed from saved" : "Job saved successfully");
    } catch (err) {
      console.error(err);
      toast.error("Could not save job");
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

  const [needsGen, setNeedsGen] = useState(false);

  const fetchAICareerReport = async (isUserPro, cachedOnly = false) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isUserPro) {
        setReportData({
          top_job_roles: [{ title: 'Locked Role', match_percentage: 92 }],
          resume_score: { overall: 78, impact: 80, formatting: 85, keywords: 75 },
          key_strengths: [
            { strength: 'Premium feature locked', icon: '🔒' },
            { strength: 'Premium feature locked', icon: '🔒' },
            { strength: 'Premium feature locked', icon: '🔒' }
          ],
          areas_for_improvement: [
            { area: 'Premium feature locked', suggestion: 'Upgrade your plan to see this' },
            { area: 'Premium feature locked', suggestion: 'Upgrade your plan to see this' }
          ],
          missing_skills: ['Locked Skill', 'Locked Skill', 'Locked Skill'],
          recommended_courses: [
            { course_title: 'Premium Course', description: 'Upgrade to view' },
            { course_title: 'Premium Course', description: 'Upgrade to view' }
          ],
          projected_salary: { min: 'Locked', max: 'Locked' },
          skills_gap: ['Locked', 'Locked', 'Locked']
        });
        setLoading(false);
        return;
      }
      
      const { state } = location;
      const fileHash = state?.fileHash || localStorage.getItem('lastResumeHash');
      const parsedData = state?.parsedData;
      
      const payload = { fileHash, parsedData, cachedOnly };
      
      const response = await getAICareerReport(payload);
      if (response?.data?.data) {
        setReportData(response.data.data);
        setNeedsGen(false);
      } else if (response?.data?.success && response?.data?.needsGeneration) {
        setNeedsGen(true);
      } else {
        setError("To generate your AI Career Report, please upload your resume or complete your profile details.");
      }
    } catch (err) {
      if (err.response?.data?.code === 'REQUIRED_DATA_MISSING') {
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || "Failed to load AI Career Report. Ensure you have uploaded your resume or completed your profile.");
      }
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        <LoadingSpinner size="lg" className="text-indigo-600 mb-4" />
        <p className="text-gray-500 font-medium">{t("Analyzing your profile to generate AI Career Tips...")}</p>
      </div>
    );
  }

  if (needsGen) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center mt-10">
          <Sparkles className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-2xl md:text-xl font-bold text-indigo-900 mb-2">{t("AI Career Tips Ready")}</h2>
          <p className="text-indigo-700 mb-6 max-w-md mx-auto">{t("Your profile has changed or you haven't generated this yet. Click below to generate your personalized AI Career Tips.")}</p>
          <button
            onClick={() => fetchAICareerReport(isPro, false)}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors gap-2"
          >
            <Sparkles className="w-5 h-5" /> {t("Generate Analysis (1 Credit)")}
          </button>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center mt-10">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl md:text-xl font-bold text-red-800 mb-2">{t("Profile Actions Required")}</h2>
          <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
          <Link
            to="/provider/profile"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors gap-2"
          >{t("Go to Profile")}<ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-8 pb-20 relative bg-slate-50 min-h-screen">
      {!usageLoading && (
        <div className="bg-white border border-slate-200 p-3 md:px-6 md:py-3 rounded-2xl flex items-center justify-between gap-3 md:gap-2 shadow-sm">
          {/* Left side text container */}
          <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
            <Sparkles className="hidden md:block w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[15px] md:text-[13px] md:text-sm font-medium text-emerald-900">{t("Career Report Limit:")}</span>
            {(() => {
                const limit = aiUsage.limits['careerReport'] || 0;
                const used = aiUsage.usage['careerReport'] || 0;
                if (limit === -1) return <span className="text-[14px] md:text-[12px] md:text-sm font-bold text-emerald-700">{t("Unlimited")}</span>;
                if (limit === 0) return <span className="text-[14px] md:text-[12px] md:text-sm font-bold text-red-600">{t("Not included")}</span>;
                return (
                  <span className="text-[14px] md:text-[12px] md:text-sm font-bold text-emerald-700">
                    {Math.max(0, limit - used)}/{limit} {t("requests remaining")}
                  </span>
                );
              })()}
          </div>
          
          <Link to="/provider/plans" className="shrink-0 flex items-center justify-center text-center text-[13px] md:text-[11px] md:text-xs font-black text-emerald-700 hover:text-emerald-900 bg-emerald-100 px-4 md:px-3 py-1.5 md:py-1 rounded-full transition-colors whitespace-nowrap">{t("Upgrade Plan")}</Link>
        </div>
      )}
      {/* UI Block Overlay for Pro users who reached their limit */}
      {isPro && !usageLoading && (() => {
        const limit = aiUsage.limits['careerReport'] || 0;
        const used = aiUsage.usage['careerReport'] || 0;
        
        if (limit !== -1 && used >= limit) {
          return (
            <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center rounded-2xl">
              <div className="w-16 h-16 bg-red-50 text-red-700 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl md:text-xl font-bold text-gray-900 mb-2">Usage Limit Reached</h3>
              <p className="text-gray-500 max-w-md mb-6">
                You have used all {limit} requests for this feature in the current billing cycle.
              </p>
              <Link to="/provider/plans" className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">{t("Upgrade Plan")}</Link>
            </div>
          );
        }
        return null;
      })()}
      <div className={isPro && !usageLoading && (() => {
        const limit = aiUsage.limits['careerReport'] || 0;
        const used = aiUsage.usage['careerReport'] || 0;
        return (limit !== -1 && used >= limit) ? 'opacity-30 pointer-events-none' : '';
      })() ? 'opacity-30 pointer-events-none' : ''}>
        
        {/* Main 3 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Main Content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">{t("AI Dashboard")}<span className="bg-teal-50 text-teal-700 text-[12px] md:text-[10px] font-bold px-2 py-0.5 rounded-md border border-teal-100">{t("Pro")}</span>
                </h1>
                <p className="text-base md:text-sm text-gray-500 mt-1 font-medium">{t("Smart insights to help you get better matches and faster results")}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={async () => {
                    try {
                      const { state } = location;
                      const fileHash = state?.fileHash || localStorage.getItem('lastResumeHash');
                      const parsedData = state?.parsedData;
                      
                      const payload = { fileHash, parsedData, improve: true };
                      
                      setLoading(true);
                      const { data } = await improveAICareerReport(payload);
                      if (data.success) {
                        setReportData(data.data);
                        toast.success("AI Career Report updated!");
                        setTimeout(() => fetchUsage(), 500);
                      }
                    } catch (err) {
                      toast.error(err.response?.data?.message || "Failed to improve insights");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !isPro}
                  className="bg-[#0f766e] hover:bg-teal-800 text-white px-4 py-2.5 rounded-xl text-[15px] md:text-[13px] font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : !isPro ? <Lock className="w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />}
                  {t("Refresh Insights")}
                </button>
              </div>
            </div>

            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              
              {/* AI Match Score */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden col-span-2 sm:col-span-1 xl:col-span-1">
                <div className="w-[72px] h-[72px] shrink-0 relative z-10 hidden md:block">
                  <CircularProgressbar 
                    value={reportData?.top_job_roles?.[0]?.match_percentage || 92} 
                    strokeWidth={8} 
                    styles={buildStyles({ pathColor: '#059669', trailColor: '#f1f5f9' })}
                  />
                </div>
                <div className="z-10 relative md:mt-2 w-full">
                  <div className="flex items-center justify-between mb-2 md:mb-0">
                    <div className="text-[13px] md:text-[11px] font-bold text-gray-500 flex items-center gap-1 whitespace-nowrap">{t("AI Match Score")}<Info className="w-3 h-3 text-gray-400" /></div>
                    <div className={`md:hidden text-xl md:text-lg font-black text-[#0f766e] ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{reportData?.top_job_roles?.[0]?.match_percentage || 92}%</div>
                  </div>
                  
                  <div className={`hidden md:block text-4xl md:text-3xl font-black text-gray-900 mt-1 leading-none ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{reportData?.top_job_roles?.[0]?.match_percentage || 92}%</div>
                  
                  {/* Linear Progress for mobile */}
                  <div className="md:hidden w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-[#0f766e] rounded-full" style={{ width: `${reportData?.top_job_roles?.[0]?.match_percentage || 92}%` }}></div>
                  </div>

                  <div className={`text-[13px] md:text-[11px] font-bold text-teal-700 md:mt-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{(reportData?.top_job_roles?.[0]?.match_percentage || 92) > 85 ? 'Excellent' : 'Good'}</div>
                </div>
              </div>

              {/* Profile Strength */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between col-span-2 sm:col-span-1 xl:col-span-1">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mt-2">
                  <div className="w-[72px] h-[72px] shrink-0 hidden md:block">
                    <CircularProgressbar 
                      value={reportData?.resume_score?.overall || 78} 
                      strokeWidth={8} 
                      styles={buildStyles({ pathColor: '#0f766e', trailColor: '#f1f5f9' })}
                    />
                  </div>
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2 md:mb-0">
                      <div className="text-[13px] md:text-[11px] font-bold text-gray-500 flex items-center gap-1 whitespace-nowrap">{t("Profile Strength")}<Info className="w-3 h-3 text-gray-400" /></div>
                      <div className={`md:hidden text-xl md:text-lg font-black text-[#0f766e] ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{reportData?.resume_score?.overall || 78}%</div>
                    </div>
                    
                    <div className={`hidden md:block text-4xl md:text-3xl font-black text-gray-900 mt-1 leading-none ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{reportData?.resume_score?.overall || 78}%</div>
                    
                    {/* Linear Progress for mobile */}
                    <div className="md:hidden w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-[#0f766e] rounded-full" style={{ width: `${reportData?.resume_score?.overall || 78}%` }}></div>
                    </div>

                    <div className={`text-[13px] md:text-[11px] font-bold text-gray-700 md:mt-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{(reportData?.resume_score?.overall || 78) > 80 ? 'Excellent' : 'Good'}</div>
                  </div>
                </div>
                <div className="text-[12px] md:text-[10px] font-medium text-gray-500 mt-5 pt-1 border-t border-gray-50">{t("Complete more to reach 100%")}</div>
              </div>

              {/* Better Matches */}
              <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between col-span-1 sm:col-span-1 xl:col-span-1">
                <div>
                  <div className="text-[12px] md:text-[10px] md:text-[11px] font-bold text-gray-500 mb-2">{t("Better Matches")}</div>
                  <div className={`text-3xl md:text-2xl md:text-4xl font-black text-[#0f766e] mt-1 mb-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{topJobs.length > 0 ? topJobs.length : 18}</div>
                  <div className="text-[12px] md:text-[10px] md:text-[11px] font-bold text-teal-700 mt-1">{t("jobs found")}</div>
                </div>
                <div className="text-[11px] md:text-[9px] md:text-[10px] font-medium text-gray-500 mt-3 md:mt-4 pt-1 border-t border-gray-50">{t("Updated today")}</div>
              </div>

              {/* Interview Chance */}
              <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between col-span-1 sm:col-span-1 xl:col-span-1">
                <div>
                  <div className="text-[12px] md:text-[10px] md:text-[11px] font-bold text-gray-500 mb-2">{t("Interview Chance")}</div>
                  <div className={`text-2xl md:text-xl md:text-3xl font-black text-[#0f766e] mt-2 mb-2 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{(reportData?.resume_score?.impact || 80) > 85 ? 'High' : (reportData?.resume_score?.impact || 80) > 60 ? 'Medium' : 'Low'}</div>
                  <div className={`text-[11px] md:text-[9px] md:text-[10px] font-bold text-teal-700 mt-1.5 bg-teal-50 px-2 md:px-2.5 py-1 rounded-md inline-block w-full text-center ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{t("You're in top")} {(reportData?.resume_score?.impact || 80) > 85 ? '10%' : '30%'}</div>
                </div>
                <div className="text-[11px] md:text-[9px] md:text-[10px] font-medium text-gray-500 mt-3 md:mt-4 pt-1 border-t border-gray-50">{t("for similar roles")}</div>
              </div>

            </div>

            {/* AI Insights For You Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <h2 className="text-[17px] md:text-[15px] font-bold text-gray-900 mb-5">{t("AI Insights for You")}</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                
                {/* Skills You Should Improve */}
                <div className="border border-gray-100 rounded-xl p-4 flex flex-col h-full bg-gray-50/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-teal-50 p-1.5 rounded-md"><Target className="w-4 h-4 text-teal-700" /></div>
                      <span className="font-bold text-[15px] md:text-[13px] text-gray-900">{t("Skills You Should Improve")}</span>
                    </div>
                    {!isPro && <Lock className="w-4 h-4 text-gray-300" />}
                  </div>
                  <p className="text-[13px] md:text-[11px] text-gray-500 mb-5 line-clamp-2 leading-relaxed">{t("These skills are in high demand for your target roles.")}</p>
                  
                  <div className="space-y-3.5 mb-auto">
                    {reportData?.missing_skills?.slice(0,3).map((skill, i) => (
                      <div key={i} className="flex justify-between items-center text-[13px] md:text-[11px]">
                        <span className={`font-bold text-gray-700 truncate max-w-[120px] ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{skill}</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] md:text-[9px] whitespace-nowrap ${i===0?'text-teal-700 bg-teal-50':'text-gray-500 bg-gray-100'}`}>{i===0?'High':'Medium'}{t("Impact")}</span>
                      </div>
                    )) || (
                      <>
                        <div className="flex justify-between items-center text-[13px] md:text-[11px]">
                          <span className={`font-bold text-gray-700 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{t("Figma (Advanced)")}</span>
                          <span className="text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded text-[11px] md:text-[9px]">{t("High Impact")}</span>
                        </div>
                        <div className="flex justify-between items-center text-[13px] md:text-[11px]">
                          <span className={`font-bold text-gray-700 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{t("User Research")}</span>
                          <span className="text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded text-[11px] md:text-[9px]">{t("Medium Impact")}</span>
                        </div>
                        <div className="flex justify-between items-center text-[13px] md:text-[11px]">
                          <span className={`font-bold text-gray-700 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{t("Interaction Design")}</span>
                          <span className="text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded text-[11px] md:text-[9px]">{t("Medium Impact")}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {!isPro ? (
                    <button disabled className="w-full py-2.5 mt-5 text-[13px] md:text-[11px] font-bold text-gray-400 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center gap-1 cursor-not-allowed">
                      <Lock className="w-3 h-3"/> {t("Locked")}
                    </button>
                  ) : (
                    <Link to="/provider/grow-with-ai?tab=skillgap" className="block w-full text-center py-2.5 mt-5 text-[13px] md:text-[11px] font-bold text-[#0f766e] border border-teal-100 rounded-lg hover:bg-teal-50 transition">{t("Improve Skills →")}</Link>
                  )}
                </div>

                {/* Top Skills You Have */}
                <div className="border border-gray-100 rounded-xl p-4 flex flex-col h-full bg-gray-50/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-50 p-1.5 rounded-md"><CheckCircle2 className="w-4 h-4 text-[#0f766e]" /></div>
                      <span className="font-bold text-[15px] md:text-[13px] text-gray-900">{t("Top Skills You Have")}</span>
                    </div>
                    {!isPro && <Lock className="w-4 h-4 text-gray-300" />}
                  </div>
                  <p className="text-[13px] md:text-[11px] text-gray-500 mb-5 line-clamp-2 leading-relaxed">{t("Great! These skills make you stand out.")}</p>
                  
                  <ul className="space-y-3.5 mb-auto">
                    {(reportData?.top_skills || profile?.skills || ['Please click Refresh Insights']).slice(0, showAllSkills ? undefined : 4).map((s,i) => (
                      <li key={i} className="flex items-center gap-2 text-[14px] md:text-[12px] font-bold text-gray-700">
                        <div className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                           <Check className="w-2.5 h-2.5" strokeWidth={3} />
                        </div> 
                        <span className={`${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>
                          {typeof s === 'string' ? s : s?.name || 'Skill'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!isPro ? (
                    <button disabled className="w-full py-2.5 mt-5 text-[13px] md:text-[11px] font-bold text-gray-400 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center gap-1 cursor-not-allowed">
                      <Lock className="w-3 h-3"/> {t("Locked")}
                    </button>
                  ) : (
                    <button onClick={() => setShowAllSkills(!showAllSkills)} className="w-full text-center py-2.5 mt-5 text-[13px] md:text-[11px] font-bold text-[#0f766e] border border-teal-100 rounded-lg hover:bg-teal-50 transition">{showAllSkills ? t("Show Less ←") : t("View All Skills →")}</button>
                  )}
                </div>

                {/* Resume Score */}
                <div className="border border-gray-100 rounded-xl p-4 flex flex-col h-full bg-gray-50/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-teal-50 p-1.5 rounded-md"><FileText className="w-4 h-4 text-teal-700" /></div>
                      <span className="font-bold text-[15px] md:text-[13px] text-gray-900">{t("Resume Score")}</span>
                    </div>
                    {!isPro && <Lock className="w-4 h-4 text-gray-300" />}
                  </div>
                  <p className="text-[13px] md:text-[11px] text-gray-500 mb-5 line-clamp-2 leading-relaxed">{t("Your resume is good. Improve these areas to make it excellent.")}</p>
                  
                  <div className="space-y-4 mb-auto">
                    <div>
                      <div className="flex justify-between text-[13px] md:text-[11px] font-bold text-gray-700 mb-1.5">
                        <span>{t("Format & Structure")}</span> <span className={`text-[#0f766e] ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{(reportData?.resume_score?.impact > 70) ? 'Good' : 'Average'}</span>
                      </div>
                      <div className={`h-1.5 bg-gray-200 rounded-full overflow-hidden ${!isPro ? 'blur-[2px] opacity-80' : ''}`}><div className="h-full bg-emerald-600 rounded-full" style={{width: `${reportData?.resume_score?.impact || 80}%`}}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[13px] md:text-[11px] font-bold text-gray-700 mb-1.5">
                        <span>{t("Content Depth")}</span> <span className={`text-[#0f766e] ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{(reportData?.resume_score?.brevity > 70) ? 'Good' : 'Average'}</span>
                      </div>
                      <div className={`h-1.5 bg-gray-200 rounded-full overflow-hidden ${!isPro ? 'blur-[2px] opacity-80' : ''}`}><div className="h-full bg-emerald-600 rounded-full" style={{width: `${reportData?.resume_score?.brevity || 75}%`}}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[13px] md:text-[11px] font-bold text-gray-700 mb-1.5">
                        <span>{t("Keywords Optimization")}</span> <span className={`${reportData?.resume_score?.skills_match > 70 ? 'text-[#0f766e]' : 'text-orange-500'} ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{(reportData?.resume_score?.skills_match > 70) ? 'Good' : 'Average'}</span>
                      </div>
                      <div className={`h-1.5 bg-gray-200 rounded-full overflow-hidden ${!isPro ? 'blur-[2px] opacity-80' : ''}`}><div className={`h-full ${reportData?.resume_score?.skills_match > 70 ? 'bg-emerald-600' : 'bg-orange-400'} rounded-full`} style={{width: `${reportData?.resume_score?.skills_match || 50}%`}}></div></div>
                    </div>
                  </div>
                  {!isPro ? (
                    <button disabled className="w-full py-2.5 mt-5 text-[13px] md:text-[11px] font-bold text-gray-400 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center gap-1 cursor-not-allowed">
                      <Lock className="w-3 h-3"/> {t("Locked")}
                    </button>
                  ) : (
                    <Link to="/provider/resume-toolkit" className="block w-full text-center py-2.5 mt-5 text-[13px] md:text-[11px] font-bold text-[#0f766e] border border-teal-100 rounded-lg hover:bg-teal-50 transition">{t("Optimize Resume →")}</Link>
                  )}
                </div>

                {/* Top Job Roles */}
                <div className="border border-gray-100 rounded-xl p-4 flex flex-col h-full bg-gray-50/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#0f766e]/10 p-1.5 rounded-md"><Briefcase className="w-4 h-4 text-[#0f766e]" /></div>
                      <span className="font-bold text-[15px] md:text-[13px] text-gray-900">{t("Top Job Roles for You")}</span>
                    </div>
                    {!isPro && <Lock className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className="mb-2 h-1"></div>
                  
                  <div className="space-y-4 mb-auto">
                    {(reportData?.top_job_roles?.length > 0 ? reportData.top_job_roles : (topJobs.length > 0 ? topJobs.map((j, idx) => ({ role: j.title, match_percentage: 95 - idx * 2 })) : [
                      { role: 'Refresh Insights to unlock', match_percentage: 0 }
                    ])).slice(0, 3).map((jobRole, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[13px] md:text-[11px] font-bold shrink-0 mt-0.5 border bg-gray-50 text-gray-500 border-gray-100">{i+1}</div>
                        <div>
                          <div className={`text-[14px] md:text-[12px] font-bold text-gray-800 leading-tight ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{jobRole.role}</div>
                          <div className={`text-[12px] md:text-[10px] font-bold text-teal-600 mt-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{jobRole.match_percentage > 0 ? `${jobRole.match_percentage}% Match` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isPro ? (
                    <button disabled className="w-full py-2.5 mt-5 text-[13px] md:text-[11px] font-bold text-gray-400 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center gap-1 cursor-not-allowed">
                      <Lock className="w-3 h-3"/> {t("Locked")}
                    </button>
                  ) : (
                    <Link to="/provider/job-for-me" className="block w-full text-center py-2.5 mt-5 text-[13px] md:text-[11px] font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition">{t("Explore Roles →")}</Link>
                  )}
                </div>

              </div>
            </div>

            {/* AI Recommended Jobs */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[17px] md:text-[15px] font-bold text-gray-900 flex items-center gap-2">{t("AI Recommended Jobs")}{!isPro && <Lock className="w-4 h-4 text-gray-300" />}</h2>
                  <p className="text-sm md:text-xs text-gray-600 mt-1 font-medium">{t("Jobs picked by AI based on your profile & activity")}</p>
                </div>
                {!isPro ? (
                  <span className="text-[13px] md:text-[11px] font-bold text-gray-400 flex items-center gap-1"><Lock className="w-3 h-3"/> {t("Locked")}</span>
                ) : (
                  <Link to="/provider/job-for-me" className="text-[13px] md:text-[11px] font-bold text-[#0f766e] flex items-center gap-1 hover:underline">
                    <span className="hidden md:inline">{t("View All Matches")}</span>
                    <span className="md:hidden">{t("View")}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              <div className="relative">
                {!isPro && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[3px] rounded-xl">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h4 className="text-base md:text-sm font-bold text-gray-900">{t("Premium Feature")}</h4>
                    <p className="text-sm md:text-xs text-gray-500 mt-1 mb-3">{t("Purchase premium to see AI recommended jobs")}</p>
                    <Link to="/provider/plans" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition">{t("Upgrade Plan")}</Link>
                  </div>
                )}
                <div className={`flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 ${!isPro ? 'pointer-events-none select-none' : ''}`}>
                  {(topJobs.length > 0 ? topJobs.slice(0, 5) : Array(4).fill({ title: 'UI/UX Designer', company: 'Google', budgetMin: 12, budgetMax: 18, city: 'Bengaluru, Karnataka (Hybrid)' })).map((job, idx) => (
                  <div key={idx} className="min-w-[280px] bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col h-full relative">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center font-black text-gray-700 shadow-sm border border-gray-100 shrink-0 text-xl md:text-lg relative overflow-hidden">
                         {/* Fallback to color blocks for companies if no logo */}
                         {idx === 0 ? <div className="w-full h-full bg-blue-500 text-white flex items-center justify-center">{t("G")}</div> : 
                          idx === 1 ? <div className="w-full h-full bg-gray-800 text-white flex items-center justify-center">{t("M")}</div> :
                          idx === 2 ? <div className="w-full h-full bg-red-600 text-white flex items-center justify-center">{t("A")}</div> :
                          <div className="w-full h-full bg-orange-500 text-white flex items-center justify-center">{t("S")}</div>
                         }
                      </div>
                      <div>
                        <h3 className="text-[15px] md:text-[13px] font-bold text-gray-900 truncate max-w-[180px] leading-tight">{job.title}</h3>
                        <div className="text-[13px] md:text-[11px] font-bold text-blue-600 mt-1 flex items-center gap-1">
                          {job.company} 
                          <span className="text-[#0f766e] flex items-center gap-0.5 ml-1">
                            <CheckCircle2 className="w-3 h-3" /> {t("Verified")}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-black font-black text-[15px] md:text-[13px] leading-none">{92 - idx}{t("% Match")}</div>
                      <div className="text-black text-[12px] md:text-[10px] font-bold mt-1">{t("Excellent")}</div>
                    </div>
                    
                    <div className="space-y-2 mb-5">
                      <div className="flex items-center gap-1.5 text-[13px] md:text-[11px] text-gray-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {job.city || 'Remote'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[13px] md:text-[11px] text-gray-500 font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" /> {job.budgetMin ? `₹${job.budgetMin} - ${job.budgetMax} LPA` : 'Salary not disclosed'}</div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {['Figma', 'UI Design', 'User Research'].slice(0, 3 - (idx % 2)).map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-50 text-gray-500 border border-gray-100 rounded text-[11px] md:text-[9px] font-bold">{tag}</span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                      <Link to={job._id || job.id ? `/provider/job/${job._id || job.id}` : `/provider/jobs`} className="text-[14px] md:text-[12px] font-bold text-[#0f766e] flex items-center gap-1.5 hover:underline">{t("View Job")}<ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={(e) => handleSaveJob(e, job, idx)} className={`transition ${job.isSaved ? "text-emerald-600" : "text-gray-300 hover:text-gray-500"}`}>
                        <Bookmark className="w-4 h-4" fill={job.isSaved ? "currentColor" : "none"} />
                      </button>
                    </div>

                    {/* Right Arrow on the last card */}
                    {idx === 3 && (
                       <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-md text-gray-700">
                          <ChevronRight className="w-5 h-5" />
                       </div>
                    )}
                  </div>
                ))}
                </div>
              </div>
            </div>

            {/* AI Tip Banner */}
            <div className="bg-[#f0fdf4] border border-[#bcf0cf] rounded-xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#dcfce7] p-2 rounded-lg"><Lightbulb className="w-5 h-5 text-[#166534]" /></div>
                <span className="text-[15px] md:text-[13px] font-medium text-[#166534]">
                  <strong className="font-bold text-[#14532d] mr-1">{t("AI Tip:")}</strong>
                  <span className={!isPro ? 'blur-[4px] opacity-80 select-none' : ''}>{t(
                    "Candidates with strong Design Systems skills are getting 40% more interview calls."
                  )}</span>
                </span>
              </div>
              {!isPro && <Lock className="w-4 h-4 text-[#166534]/30" />}
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* AI Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#0f766e]" />
                  <h3 className="font-bold text-gray-900 text-[16px] md:text-[14px]">{t("AI Summary")}</h3>
                </div>
                {!isPro && <Lock className="w-4 h-4 text-gray-300" />}
              </div>
              <p className="text-[13px] md:text-[11px] text-gray-500 mb-5 leading-relaxed font-medium">{t("Here's what AI thinks about your job search progress.")}</p>
              
              <ul className="space-y-3.5 mb-6">
                <li className="flex items-start gap-2 text-[13px] md:text-[11px] font-bold text-gray-700">
                  <Check className="w-4 h-4 text-[#0f766e] shrink-0 mt-0.5" /><span className={!isPro ? 'blur-[4px] opacity-80 select-none' : ''}>{t("Your profile is well optimized")}</span></li>
                <li className="flex items-start gap-2 text-[13px] md:text-[11px] font-bold text-gray-700">
                  <Check className="w-4 h-4 text-[#0f766e] shrink-0 mt-0.5" /><span className={!isPro ? 'blur-[4px] opacity-80 select-none' : ''}>{t("You have strong skills for your roles")}</span></li>
                <li className="flex items-start gap-2 text-[13px] md:text-[11px] font-bold text-gray-700">
                  <Check className="w-4 h-4 text-[#0f766e] shrink-0 mt-0.5" /><span className={!isPro ? 'blur-[4px] opacity-80 select-none' : ''}>{t("Keep applying consistently")}</span></li>
                <li className="flex items-start gap-2 text-[13px] md:text-[11px] font-bold text-gray-700">
                  <Check className="w-4 h-4 text-[#0f766e] shrink-0 mt-0.5" /><span className={!isPro ? 'blur-[4px] opacity-80 select-none' : ''}>{t("Improve these skills to get more interviews")}</span></li>
              </ul>
            </div>

            {/* AI Coach */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-gray-700" />
                  <h3 className="font-bold text-gray-900 text-[16px] md:text-[14px]">{t("AI Coach")}</h3>
                </div>
                {!isPro ? <Lock className="w-4 h-4 text-gray-300" /> : <span className="bg-indigo-50 text-indigo-600 text-[11px] md:text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">{t("Premium")}</span>}
              </div>
              <p className="text-[13px] md:text-[11px] text-gray-500 mb-5 leading-relaxed font-medium">{t("Get personalized guidance to move ahead in your career.")}</p>
              
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl rounded-tr-sm mb-5 relative ml-6">
                <p className={`text-[13px] md:text-[11px] text-gray-700 leading-relaxed font-medium ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{t(
                  "Hi Ananya! I analyzed your profile and applications. Would you like me to suggest some ways to improve your chances?"
                )}</p>
                <div className="absolute -left-8 top-0 w-8 h-8 bg-emerald-600 shadow-sm rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {!isPro ? (
                <button disabled className="w-full py-2.5 border border-gray-200 rounded-xl text-[13px] md:text-[11px] font-bold text-gray-400 bg-gray-50 flex justify-center items-center gap-1.5 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5" /> {t("Locked")}
                </button>
              ) : (
                <button onClick={() => window.dispatchEvent(new CustomEvent('open-ai-coach'))} className="w-full py-2.5 border border-gray-200 rounded-xl text-[13px] md:text-[11px] font-bold text-[#0f766e] hover:bg-gray-50 transition flex justify-center items-center gap-1.5 cursor-pointer">{t("Chat with AI Coach")}<ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* WhatsApp AI Alerts */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative overflow-hidden group">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#075E54] flex items-center justify-center"><FaWhatsapp className="w-3.5 h-3.5 text-white" /></div>
                <h3 className="font-bold text-gray-900 text-[16px] md:text-[14px]">{t("WhatsApp AI Alerts")}</h3>
              </div>
              <p className="text-[13px] md:text-[11px] text-gray-500 mb-4 font-medium">{t("Stay updated on the go!")}</p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-[13px] md:text-[11px] font-bold text-gray-700"><Check className="w-3.5 h-3.5 text-[#0f766e]" />{t("New job matches")}</li>
                <li className="flex items-center gap-2 text-[13px] md:text-[11px] font-bold text-gray-700"><Check className="w-3.5 h-3.5 text-[#0f766e]" />{t("Application status updates")}</li>
                <li className="flex items-center gap-2 text-[13px] md:text-[11px] font-bold text-gray-700"><Check className="w-3.5 h-3.5 text-[#0f766e]" />{t("Interview reminders")}</li>
                <li className="flex items-center gap-2 text-[13px] md:text-[11px] font-bold text-gray-700"><Check className="w-3.5 h-3.5 text-[#0f766e]" />{t("Salary drops & more")}</li>
              </ul>
              
              <button onClick={() => setWhatsappEnabled(!whatsappEnabled)} className={`w-full py-2.5 border rounded-xl text-[13px] md:text-[11px] font-bold transition flex justify-center items-center gap-2 ${whatsappEnabled ? 'bg-[#075E54]/10 text-[#04433B] border-[#075E54]/20 hover:bg-[#075E54]/20' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                {whatsappEnabled ? (
                  <>{t("WhatsApp Alerts On")} <CheckCircle2 className="w-4 h-4 text-[#075E54]" /></>
                ) : (
                  <>{t("Enable WhatsApp Alerts")} <FaWhatsapp className="w-4 h-4 text-[#075E54]" /></>
                )}
              </button>
            </div>

            {/* Earn Extra Income */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-center text-[12px] md:text-[10px]">💰</div>
                <h3 className="font-bold text-gray-900 text-[16px] md:text-[14px]">{t("Earn Extra Income")}</h3>
                <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[11px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full">{t("New")}</span>
              </div>
              
              <div className="flex items-center justify-between gap-2 mb-5 mt-4">
                <p className="text-[13px] md:text-[11px] text-gray-700 leading-relaxed max-w-[130px] font-medium">{t("Discover freelance projects matching your skills.")}</p>
                <div className="w-10 h-10 bg-[#0f766e]/10 rounded-xl flex items-center justify-center border border-[#0f766e]/20">
                  <Briefcase className="w-5 h-5 text-[#0f766e]" />
                </div>
              </div>

              <button onClick={() => navigate('/provider/jobs')} className="w-full py-2.5 border border-[#0f766e]/20 bg-[#0f766e]/5 rounded-xl text-[13px] md:text-[11px] font-bold text-[#0f766e] hover:bg-[#0f766e]/10 transition flex justify-center items-center gap-1.5 shadow-sm">{t("Explore Freelance Jobs")}<ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </div>
      {showFullAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-xl flex flex-col overflow-hidden relative animate-slideUp">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 sticky top-0">
              <h2 className="text-xl md:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0f766e]" /> {t("Full AI Analysis Report")}
              </h2>
              <button onClick={() => setShowFullAnalysis(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              {reportData ? (
                <div className="space-y-6">
                  {reportData.summary && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-2">{t("Executive Summary")}</h3>
                      <p className="text-base md:text-sm text-gray-700 leading-relaxed font-medium">{reportData.summary}</p>
                    </div>
                  )}
                  {reportData.top_strengths && reportData.top_strengths.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-700" /> {t("Top Strengths")}</h3>
                      <ul className="space-y-2">
                        {reportData.top_strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-base md:text-sm text-gray-700 font-medium"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {reportData.top_weaknesses && reportData.top_weaknesses.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-orange-500" /> {t("Areas for Improvement")}</h3>
                      <ul className="space-y-2">
                        {reportData.top_weaknesses.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-base md:text-sm text-gray-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-2"></span> {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {reportData.next_best_actions && reportData.next_best_actions.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-indigo-600" /> {t("Recommended Next Steps")}</h3>
                      <ul className="space-y-2">
                        {reportData.next_best_actions.map((s, i) => (
                          <li key={i} className="flex items-start gap-3 p-3 bg-indigo-50/30 rounded-lg text-base md:text-sm text-gray-700 font-medium"><div className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-sm md:text-xs">{i+1}</div> {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {reportData.ai_tip && (
                    <div className="bg-[#f0fdf4] border border-[#bcf0cf] rounded-xl px-5 py-4">
                       <h3 className="font-bold text-[#14532d] mb-1">{t("Pro Tip")}</h3>
                       <p className="text-base md:text-sm text-[#166534] font-medium">{reportData.ai_tip}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500">{t("Detailed analysis not available.")}</p>
              )}
            </div>
          </div>
        </div>
      )}
      <AICoachModal role="provider" />
    </div>
  );
}
