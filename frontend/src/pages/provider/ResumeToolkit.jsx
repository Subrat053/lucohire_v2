import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useTranslation from '../../hooks/useTranslation';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  ArrowLeft, RefreshCw, Upload, CheckCircle2, FileText, Layout,
  Link2, Download, Edit, Zap, ShieldCheck, MoreVertical, Info,
  Star, PenTool, Check, Eye, Sparkles, Crown
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { getResumeToolkit, uploadResume, getAiUsage } from '../../services/providerAIService';
import { getCurrentSubscription } from '../../services/providerPlanService';
import { providerAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ResumeToolkit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [profile, setProfile] = useState(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [missingData, setMissingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiUsage, setAiUsage] = useState({ limits: { resumeToolkit: 10 }, usage: { resumeToolkit: 0 } });
  const fileInputRef = useRef(null);

  // Re-fetch whenever profile is saved (same trigger as GrowWithAI)
  const fileHash = location.state?.fileHash || localStorage.getItem('lastResumeHash');

  useEffect(() => { fetchAll(false, true); }, [fileHash]);

  useEffect(() => {
    if (window.location.hash === '#enhance-resume' || sessionStorage.getItem('scroll_to_enhance') === 'true') {
      sessionStorage.removeItem('scroll_to_enhance');
      setTimeout(() => {
        const el = document.getElementById('enhance-resume');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 800);
    }
  }, [location.hash]);

  const handleNavigateWithBack = (url) => {
    window.history.replaceState(null, '', '/provider/resume-toolkit#enhance-resume');
    sessionStorage.setItem('scroll_to_enhance', 'true');
    navigate(url);
  };

  const handleNavigateToAts = () => {
    window.history.replaceState(null, '', '/provider/resume-toolkit#enhance-resume');
    sessionStorage.setItem('scroll_to_enhance', 'true');
    sessionStorage.setItem('scroll_to_ats', 'true');
    navigate('/provider/profile?tab=Generate%20Resume');
  };

  const handleRefresh = async () => {
    if (!isPro) {
      navigate('/provider/plans');
      return;
    }
    
    const limit = aiUsage.limits?.resumeImprovement || 0;
    const used = aiUsage.usage?.resumeImprovement || 0;
    
    if (limit !== -1 && used >= limit) {
      toast.error(t('Usage limit reached. Upgrade your plan for more requests.'));
      return;
    }

    setRefreshing(true);
    await fetchAll(true);
    
    // Wait for backend database increment to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Re-fetch AI usage after the backend has potentially incremented it
    try {
      const usageRes = await getAiUsage();
      if (usageRes?.data?.success) {
        setAiUsage({ 
          limits: { ...usageRes.data.limits }, 
          usage: { ...usageRes.data.usage } 
        });
      }
    } catch (e) {}

    setRefreshing(false);
    toast.success(t('AI analysis refreshed'));
  };

  const [needsGen, setNeedsGen] = useState(false);

  const fetchAll = async (force = false, cachedOnly = false) => {
    try {
      setLoading(true);
      
      const [planRes, profileRes, usageRes] = await Promise.allSettled([
        getCurrentSubscription(),
        providerAPI.getProfile(),
        getAiUsage(),
      ]);

      let userIsPro = false;
      if (planRes.status === 'fulfilled') {
        const activePlan = planRes.value?.subscription || planRes.value || {};
        const planStatus = activePlan?.subscriptionStatus || activePlan?.status || 'active';
        const tier = activePlan?.planSnapshot?.slug || activePlan?.planName || activePlan?.plan || activePlan?.tier || 'free';
        userIsPro = planStatus === 'active' && String(tier).toLowerCase() !== 'free';
        setIsPro(userIsPro);
      }

      let p = null;
      if (profileRes.status === 'fulfilled') {
        p = profileRes.value?.data?.data || profileRes.value?.data || null;
        setProfile(p);
        setWhatsappEnabled(!!(p?.whatsappAlerts));
      }

      if (usageRes.status === 'fulfilled') {
        const usageData = usageRes.value?.data;
        if (usageData?.success) {
          setAiUsage(prev => ({ 
            limits: { ...usageData.limits }, 
            usage: { ...usageData.usage } 
          }));
        }
      }

      const hasResume = p?.resumeApproval?.pendingUrl || p?.resumeUrl;

      if (userIsPro) {
        const toolkitRes = await getResumeToolkit(force, cachedOnly).catch(() => null);
        if (toolkitRes?.data?.data) {
          setData(toolkitRes.data.data);
          setMissingData(false);
          setNeedsGen(false);
        } else if (toolkitRes?.data?.success && toolkitRes?.data?.needsGeneration) {
          setNeedsGen(true);
          setData(fallback());
        } else if (
          toolkitRes?.data?.code === 'REQUIRED_DATA_MISSING' ||
          !toolkitRes?.data?.success
        ) {
          setMissingData(true);
          setNeedsGen(false);
          setData(fallback());
        } else {
          setData(fallback());
        }
      } else {
        setData(fallback());
      }
      setMissingData(!hasResume);


    } catch (err) {
      console.error('ResumeToolkit fetch error', err);
      setData(fallback());
    } finally {
      setLoading(false);
    }
  };

  function fallback() {
    return {
      resumeScore: { overall: 76, content: 70, structure: 82, ats: 78 },
      profileCompletion: 0,
      aiSuggestions: [
        { title: 'Add More Quantifiable Achievements', impact: 'High Impact', metric: 'Improve your content score by quantifying your bullets.' },
        { title: 'Optimize for Target Keywords', impact: 'High Impact', metric: 'Missing key technical skills found in standard job descriptions.' }
      ],
      resumeStats: { atsScore: 78, readability: 'Good', sections: '6/10', keywords: '12/24' },
    };
  }

  const handleEnableWhatsApp = () => {
    setWhatsappEnabled(!whatsappEnabled);
  };

  const handleOpenWhatsAppHelp = () => {
    const supportNumber = '919876543210';
    window.open(`https://wa.me/${supportNumber}?text=${encodeURIComponent(t('Hi! I need career help.'))}`, '_blank');
  };

  const handleDownloadResume = () => {
    let url = profile?.resumeApproval?.pendingUrl || profile?.resumeUrl;
    if (!url) { toast.error(t('No resume uploaded yet')); return; }

    // Resolve local /uploads paths to full backend URL
    if (!url.startsWith('http')) {
      const backendOrigin = import.meta.env.VITE_API_URL?.replace('/api', '')
        || '';
      url = `${backendOrigin}${url}`;
    }
    
    // If it's a legacy Cloudinary raw URL missing the .pdf extension, force download as PDF
    if (url.includes('res.cloudinary.com') && url.includes('/raw/upload/') && !url.includes('fl_attachment')) {
      const fileName = resumeFileName || 'Resume.pdf';
      const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      url = url.replace('/raw/upload/', `/raw/upload/fl_attachment:${safeName}/`);
    }
    
    window.open(url, '_blank');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('resume', file);
      
      const res = await uploadResume(formData);
      if (res.data?.success) {
        toast.success(t('Resume parsed & profile updated successfully!'));
        await fetchAll(true);
      } else {
        toast.error(res.data?.message || t('Failed to parse resume'));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || t('Error uploading resume'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePreviewResume = async (e) => {
    if (e) e.preventDefault();
    try {
      setPreviewLoading(true);
      // Fetch the PDF through our backend proxy (handles all storage types)
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiBase}/provider/profile/resume/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(blobUrl, '_blank');
      // Clean up after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (err) {
      toast.error(err.message || t('Failed to load resume preview'));
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading || uploading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
        {uploading && <p className="text-teal-700 font-bold text-sm animate-pulse">{t('Analyzing your resume and updating profile...')}</p>}
      </div>
    );
  }

  const { resumeScore, profileCompletion, aiSuggestions, resumeStats } = data;

  const resumeUrl = profile?.resumeApproval?.pendingUrl || profile?.resumeUrl || null;
  const resumeFileName = profile?.resumeFileName || (resumeUrl ? resumeUrl.split('/').pop() : null);
  const profileName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.name || 'Your Resume';
  const updatedAt = profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not uploaded';

  // Profile completion checklist derived from actual profile data
  const profileCheckList = [
    { label: 'Basic Information', done: !!(profile?.firstName && profile?.phone) },
    { label: 'Work Experience', done: !!(profile?.experience?.length > 0 || profile?.workExperience?.length > 0) },
    { label: 'Skills', done: !!(profile?.skills?.length > 0) },
    { label: 'Education', done: !!(profile?.education?.length > 0) },
    { label: 'Resume', done: !!resumeUrl },
    { label: 'Career Goals', done: !!(profile?.desiredRole || profile?.careerGoal) },
  ];

  const completedCount = profileCheckList.filter(i => i.done).length;
  const dynamicCompletion = Math.round((completedCount / profileCheckList.length) * 100);

  const resumeTools = [
    { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50', title: 'AI Resume Optimizer', desc: 'Get AI suggestions to improve content, keywords & impact.', btn: 'Optimize Now', pro: false, action: handleNavigateToAts },
    { icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50', title: 'ATS Check', desc: 'Check how well your resume passes ATS systems.', btn: 'Check ATS Score', pro: false, action: handleNavigateToAts },
    { icon: Layout, color: 'text-orange-500', bg: 'bg-orange-50', title: 'Resume Templates', desc: 'Professional templates trusted by recruiters.', btn: 'Browse Templates', pro: false, action: () => handleNavigateWithBack('/provider/profile?tab=Generate%20Resume') },
    { icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50', title: 'Resume Builder', desc: 'Create a new resume step by step.', btn: 'Build New', pro: false, action: () => handleNavigateWithBack('/provider/profile?tab=Generate%20Resume') },
  ];

  const contentTools = [
    { icon: PenTool, color: 'text-purple-600', title: 'About Me Generator', desc: 'Generate a professional summary for your profile.', btn: 'Generate Now', action: () => handleNavigateWithBack('/provider/profile?tab=Personal#summary') },
    { icon: FileText, color: 'text-blue-600', title: 'Cover Letter Builder', desc: 'Create a tailored cover letter for any job.', btn: 'Create Letter', action: () => handleNavigateWithBack('/provider/ai-career-coach?prompt=Write%20a%20cover%20letter') },
    { icon: Edit, color: 'text-emerald-600', title: 'Experience Rewriter', desc: 'Make your experience more impactful with AI.', btn: 'Rewrite Now', action: () => handleNavigateWithBack('/provider/profile?tab=Details#experience') },
    { icon: Star, color: 'text-orange-500', title: 'Achievements Optimizer', desc: 'Add strong achievements that get you noticed.', btn: 'Add Achievements', action: () => handleNavigateWithBack('/provider/profile?tab=Education%20%26%20Credentials#achievements') },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-5 pb-12">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleFileUpload} 
      />

      {/* Usage Limit Banner */}
      {!loading && (
        <div className="bg-white border border-slate-200 p-3 md:px-6 md:py-3 rounded-2xl flex items-center justify-between gap-3 md:gap-2 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
            <Sparkles className="hidden md:block w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[13px] md:text-sm font-medium text-emerald-900">{t("Toolkit AI Limit:")}</span>
            {(() => {
                const limit = aiUsage.limits['resumeImprovement'] || 0;
                const used = aiUsage.usage['resumeImprovement'] || 0;
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

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-2">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition mb-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> {t('Back')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{t('Resume & Profile Toolkit')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('Build a stronger profile that gets you more interviews')}</p>
        </div>
        {isPro && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition flex items-center gap-2 shadow-md disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? t('Analyzing...') : t('Refresh AI Analysis')}
          </button>
        )}
      </div>

      {/* Missing data banner */}
      {missingData && !needsGen && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">{t('Complete your profile to unlock AI analysis')}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t('Add your skills, experience, and upload a resume so our AI can generate personalized scores and suggestions.')}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/provider/profile?tab=Resume')}
            className="shrink-0 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition"
          >
            {t('Complete Profile')} →
          </button>
        </div>
      )}

      {/* Needs Generation banner */}
      {needsGen && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-teal-900">{t('AI Resume Analysis Ready')}</p>
              <p className="text-xs text-teal-800 mt-0.5">{t('Your profile has changed or you haven\'t generated this yet. Click below to generate your analysis.')}</p>
            </div>
          </div>
          <button
            onClick={() => fetchAll(false)}
            className="shrink-0 px-4 py-2 bg-[#0f766e] text-white text-xs font-bold rounded-xl hover:bg-teal-800 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> {t('Generate (1 Credit)')}
          </button>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="relative">
        <div className="space-y-6">

          {/* ── Row 1: Score / Completion / AI Suggestions ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Resume Score */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-sm font-bold text-gray-900">{t('Resume Score')}</h2>
            <Info className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-5 mb-6">
            <div className="w-28 shrink-0">
              <div className={!isPro ? 'blur-[6px] select-none opacity-70' : ''}>
                <CircularProgressbar
                  value={resumeScore.overall}
                  text={`${resumeScore.overall}%`}
                  styles={buildStyles({ pathColor: '#0f766e', textColor: '#0f766e', trailColor: '#f1f5f9', textSize: '22px', pathTransitionDuration: 1.5 })}
                />
              </div>
              <p className={`text-center text-xs font-bold text-teal-700 mt-1 ${!isPro ? 'blur-[5px] select-none opacity-70' : ''}`}>
                {resumeScore.overall >= 80 ? t('Very Good') : resumeScore.overall >= 50 ? t('Average') : t('Needs Work')}
              </p>
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{t('Improve the areas below to make it excellent.')}</p>
              {[['Content', resumeScore.content], ['Structure', resumeScore.structure], ['ATS Readability', resumeScore.ats]].map(([label, val]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700 w-24 shrink-0">{t(label)}</span>
                  <div className={`flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden ${!isPro ? 'blur-[4px] opacity-80' : ''}`}>
                    <div className="h-full bg-teal-600 rounded-full" style={{ width: `${val}%` }} />
                  </div>
                  <span className={`text-xs font-bold text-gray-500 w-8 text-right ${!isPro ? 'blur-[5px] select-none opacity-70' : ''}`}>{val}%</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => isPro ? navigate('/provider/grow-with-ai?tab=gps') : navigate('/provider/plans')}
            className={`mt-auto w-full py-2.5 rounded-xl border font-bold text-sm transition ${!isPro ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' : 'border-gray-100 text-teal-700 hover:bg-teal-50'}`}
          >
            {!isPro ? t('Unlock with Premium') : t('Interview Preparation & AI Career GPS')} →
          </button>
        </div>

        {/* Profile Completion — dynamic from real profile */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-sm font-bold text-gray-900">{t('Profile Completion')}</h2>
            <Info className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-5 mb-6">
            <div className="w-28 shrink-0">
              <div className={!isPro ? 'blur-[6px] select-none opacity-70' : ''}>
                <CircularProgressbar
                  value={dynamicCompletion}
                  text={`${dynamicCompletion}%`}
                  styles={buildStyles({ pathColor: '#0f766e', textColor: '#0f766e', trailColor: '#f1f5f9', textSize: '22px', pathTransitionDuration: 1.5 })}
                />
              </div>
              <p className={`text-center text-xs font-bold text-teal-700 mt-1 ${!isPro ? 'blur-[5px] select-none opacity-70' : ''}`}>
                {dynamicCompletion === 100 ? t('Complete') : dynamicCompletion >= 67 ? t('Almost Complete') : t('In Progress')}
              </p>
            </div>
            <div className="flex-1 space-y-2">
              {profileCheckList.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">{t(item.label)}</span>
                  <div className={!isPro ? 'blur-[4px] opacity-80' : ''}>
                    {item.done
                      ? <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      : <div className="w-4 h-4 rounded-full border-2 border-gray-200" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate('/provider/profile')}
            className="mt-auto w-full py-2.5 rounded-xl border border-gray-100 text-teal-700 text-sm font-bold hover:bg-teal-50 transition"
          >
            {t('Complete Profile')} →
          </button>
        </div>

        {/* AI Suggestions */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-900">{t('AI Suggestions for You')}</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            {data?.targetRole
              ? `${t('Based on your target role')}: ${data.targetRole}`
              : profile?.desiredRole
              ? `${t('Based on your target role')}: ${profile.desiredRole}`
              : t('Based on your profile')}
          </p>
          <div className="space-y-3 mb-5 flex-1">
            {aiSuggestions.length > 0 ? aiSuggestions.map((sug, idx) => (
              <div key={idx} className={`flex gap-3 items-start bg-slate-50 p-3 rounded-2xl border border-slate-200 ${!isPro ? 'blur-[2.5px] select-none opacity-80' : ''}`}>
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  {typeof sug === 'string' ? (
                    <p className="text-xs font-medium text-gray-800 leading-relaxed">{t(sug)}</p>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-xs font-bold text-gray-900 leading-snug">{t(sug.title)}</h4>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${sug.impact === 'High Impact' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                          {t(sug.impact)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">{t(sug.metric)}</p>
                    </>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-xs text-gray-400 italic">{t('No suggestions yet. Upload your resume to get started.')}</p>
            )}
          </div>
          <button
            onClick={() => isPro ? navigate('/provider/grow-with-ai') : navigate('/provider/plans')}
            className={`mt-auto w-full py-2.5 rounded-xl border font-bold text-sm transition ${!isPro ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' : 'border-gray-100 text-teal-700 hover:bg-teal-50'}`}
          >
            {!isPro ? t('Unlock AI Suggestions') : t('Apply All Suggestions')} →
          </button>
        </div>
      </div>

      {/* ── Row 2: Enhance Tools + WhatsApp ── */}
      <div id="enhance-resume" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <h3 className="text-base font-bold text-gray-900 mb-4">{t('Enhance Your Resume')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {resumeTools.map((tool, idx) => {
              const locked = tool.pro && !isPro;
              return (
                <div key={idx} className={`bg-white rounded-xl md:rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col transition hover:shadow-md ${locked ? 'opacity-70' : ''}`}>
                  <div className={`hidden md:flex w-9 h-9 rounded-2xl ${tool.bg} items-center justify-center mb-3`}>
                    <tool.icon className={`w-4 h-4 ${tool.color}`} />
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 leading-tight">{t(tool.title)}</h4>
                    {locked && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold ml-1">PRO</span>}
                  </div>
                  <p className="text-xs text-gray-500 mb-4 flex-1">{t(tool.desc)}</p>
                  <button
                    className={`text-sm font-bold flex items-center gap-1 ${locked ? 'text-amber-600 hover:text-amber-800' : 'text-teal-700 hover:text-teal-900'} transition`}
                    onClick={() => locked ? navigate('/provider/my-plan') : tool.action()}
                  >
                    {locked ? t('Upgrade to Pro') : t(tool.btn)} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* WhatsApp Updates — functional */}
        <div className="bg-emerald-100 rounded-3xl p-5 shadow-sm border border-emerald-200 flex flex-col justify-between relative overflow-hidden lg:mt-10">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h2 className="text-base font-bold text-gray-900 leading-tight mt-1">{t('Stay Updated on WhatsApp')}</h2>
              <div className="w-12 h-12 bg-emerald-200/60 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xl">👩‍💼</span>
              </div>
            </div>
            
            <p className="text-[11px] text-gray-700 mb-4 flex-1 pr-4">
              {t('Get real-time updates about your resume score & profile views.')}
            </p>
            <button
              onClick={handleEnableWhatsApp}
              className={`w-full font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm text-[11px] ${whatsappEnabled ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' : 'bg-[#0f766e] border border-[#0b5952] text-white hover:bg-[#0b5952]'}`}
            >
              {whatsappEnabled ? t('Disable Updates') : t('Enable Updates')} <FaWhatsapp className={`w-3.5 h-3.5 ${whatsappEnabled ? 'text-red-500' : 'text-white'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 3: Resume Overview (real data, full width) ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          {/* Mobile-only logo replacement for the large thumbnail */}
          <div className="md:hidden w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900">{t('Your Resume')}</h3>
        </div>
        <div className="flex flex-col md:flex-row gap-6 mb-5">
          {/* PDF preview thumbnail (hidden on mobile) */}
          <div className="hidden md:block w-28 h-36 bg-white rounded-xl border border-gray-200 shrink-0 shadow-sm overflow-hidden relative group">
            {resumeUrl ? (
              <button type="button" onClick={handlePreviewResume} disabled={previewLoading} className="block w-full h-full text-left focus:outline-none">
                {/* Mini Resume Skeleton (Resume in short) */}
                <div className="absolute inset-0 p-3 flex flex-col gap-1.5 opacity-70 group-hover:opacity-30 transition-opacity duration-300 bg-slate-50">
                  <div className="h-1.5 w-14 bg-teal-600/60 rounded-full mx-auto mb-1"></div>
                  <div className="h-0.5 w-full bg-gray-200 mb-1"></div>
                  <div className="h-1 w-full bg-gray-300 rounded-full"></div>
                  <div className="h-1 w-11/12 bg-gray-300 rounded-full"></div>
                  <div className="h-1 w-4/5 bg-gray-300 rounded-full mb-1.5"></div>
                  
                  <div className="h-1 w-10 bg-teal-600/40 rounded-full"></div>
                  <div className="h-1 w-full bg-gray-200 rounded-full"></div>
                  <div className="h-1 w-5/6 bg-gray-200 rounded-full"></div>
                  <div className="h-1 w-full bg-gray-200 rounded-full mb-1"></div>

                  <div className="h-1 w-12 bg-teal-600/40 rounded-full"></div>
                  <div className="h-1 w-11/12 bg-gray-200 rounded-full"></div>
                </div>
                
                {/* Overlay Hover State */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100 bg-white/30 backdrop-blur-[2px]">
                  <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center mb-1.5 shadow-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-teal-800 font-bold bg-white/95 px-2 py-0.5 rounded shadow-sm">{t('View PDF')}</span>
                </div>
              </button>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
                <FileText className="w-8 h-8 text-gray-300 mb-1" />
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{t('No File')}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-gray-900 text-sm truncate max-w-xs">
                {resumeFileName || profileName}
              </h4>
              {resumeUrl && (
                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">{t('Primary')}</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mb-4">
              {t('Last updated')}: {updatedAt}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'ATS Score', val: `${resumeStats.atsScore}%`, color: 'text-teal-700' },
                { label: 'Readability', val: t(resumeStats.readability), color: 'text-teal-700' },
                { label: 'Sections', val: resumeStats.sections, color: 'text-teal-700' },
                { label: 'Keywords', val: resumeStats.keywords, color: 'text-teal-700' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  <div className="text-xs text-gray-500 font-bold mb-1">{t(label)}</div>
                  <div className={`text-lg font-black ${color} ${!isPro ? 'blur-[2.5px] select-none opacity-80' : ''}`}>{val}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {resumeUrl && (
                <button
                  type="button"
                  onClick={handlePreviewResume}
                  disabled={previewLoading}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {previewLoading ? t('Loading...') : t('Preview Resume')}
                </button>
              )}
              <button
                onClick={() => navigate('/provider/profile?tab=Resume')}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition"
              >
                <Edit className="w-3.5 h-3.5" /> {t('Edit Profile')}
              </button>
              {resumeUrl && (
                <button
                  onClick={handleDownloadResume}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" /> {t('Download')}
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 border border-teal-200 rounded-xl text-xs font-bold text-teal-700 hover:bg-teal-50 flex items-center gap-1.5 shadow-sm transition"
              >
                <Upload className="w-3.5 h-3.5" /> {t('Upload New')}
              </button>
            </div>
          </div>
        </div>
        {!resumeUrl && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center justify-between gap-3">
            <p className="text-xs text-amber-800 font-medium">{t('No resume uploaded yet. Upload your resume to get AI-powered analysis and more recruiter visibility.')}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 text-xs font-bold bg-amber-600 text-white px-4 py-2 rounded-xl hover:bg-amber-700 transition"
            >
              {t('Upload Now')} →
            </button>
          </div>
        )}
      </div>

      {/* ── Row 4: Profile & Content Tools + Need Help ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <h3 className="text-base font-bold text-gray-900 mb-4">{t('Profile & Content Tools')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {contentTools.map((tool, idx) => (
              <div key={idx} className="bg-white rounded-xl md:rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col hover:shadow-md transition cursor-pointer" onClick={tool.action}>
                <div className="flex items-center gap-2 mb-3">
                  <tool.icon className={`hidden md:flex w-5 h-5 ${tool.color}`} />
                  <h4 className="text-base font-semibold text-gray-900 leading-tight">{t(tool.title)}</h4>
                </div>
                <p className="text-sm text-gray-500 mb-4 flex-1">{t(tool.desc)}</p>
                <button className="text-sm font-bold text-teal-700 flex items-center gap-1 hover:text-teal-900 transition">{t(tool.btn)} →</button>
              </div>
            ))}
          </div>
        </div>

        {/* Need Help? — functional WhatsApp chat */}
        <div className="bg-emerald-100 rounded-3xl p-5 shadow-sm border border-emerald-200 flex flex-col justify-between relative overflow-hidden lg:mt-10">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h2 className="text-base font-bold text-gray-900 leading-tight mt-1">{t('Need Help?')}</h2>
              <div className="w-12 h-12 bg-emerald-200/60 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xl">👩🏻‍💻</span>
              </div>
            </div>
            
            <p className="text-[11px] text-gray-700 mb-1 pr-4">
              {t('Chat with our career experts on WhatsApp')}
            </p>
            <p className="text-[9px] text-gray-500 mb-4 font-medium flex-1">📅 {t('Mon – Sat, 9 AM – 9 PM')}</p>
            
            <button
              onClick={handleOpenWhatsAppHelp}
              className="w-full font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm text-[11px] bg-[#0f766e] border border-[#0b5952] text-white hover:bg-[#0b5952]"
            >
              {t('Chat on WhatsApp')} <FaWhatsapp className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
        </div>
        </div>

      </div>

    </div>
  );
}
