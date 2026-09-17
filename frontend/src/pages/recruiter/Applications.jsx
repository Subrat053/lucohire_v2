import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HiArrowLeft, HiDocumentText, HiCheckCircle, HiClock,
  HiX, HiEye, HiPhone, HiCheck, HiExclamation, HiTrash,
  HiSparkles, HiMail, HiLockClosed, HiLockOpen, HiLocationMarker,
  HiBriefcase, HiCurrencyRupee,
} from 'react-icons/hi';
import { recruiterAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending:     { bg: 'bg-amber-50/70',    border: 'border-amber-200',    text: 'text-amber-700',    icon: HiClock, label: 'Pending' },
  reviewed:    { bg: 'bg-sky-50/70',     border: 'border-sky-200',     text: 'text-sky-700',     icon: HiEye, label: 'Reviewed' },
  contacted:   { bg: 'bg-purple-50/70',   border: 'border-purple-200',   text: 'text-purple-700',   icon: HiPhone, label: 'Contacted' },
  shortlisted:{ bg: 'bg-indigo-50/70',    border: 'border-indigo-200',   text: 'text-indigo-700',   icon: HiCheck, label: 'Shortlisted' },
  rejected:    { bg: 'bg-rose-50/70',      border: 'border-rose-200',      text: 'text-rose-700',      icon: HiX, label: 'Rejected' },
  hired:       { bg: 'bg-emerald-50/70',    border: 'border-emerald-200',    text: 'text-emerald-700',    icon: HiCheckCircle, label: 'Hired' },
};

const formatLocation = (location) => {
  if (!location) return 'Location Specified';
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    return (
      location.formattedAddress ||
      location.name ||
      [location.city, location.state, location.country].filter(Boolean).join(', ') ||
      location.postalCode ||
      'Location Specified'
    );
  }
  return 'Location Specified';
};

/* ── Upgrade Modal ───────────────────────────────────────────────────── */
const UpgradeModal = ({ onClose, navigate }) => {
  const {
    t
  } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <HiSparkles className="w-8 h-8 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900">{t("Unlock Credits Exhausted")}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{t(
            "You need additional profile unlock credits or an active subscription plan to view full candidate contact details."
          )}</p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => {
              onClose();
              navigate('/recruiter/plans');
            }}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-md hover:from-indigo-700 hover:to-purple-700 transition"
          >{t("Upgrade Subscription / Purchase Credits")}</button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition"
          >{t("Cancel")}</button>
        </div>
      </div>
    </div>
  );
};

/* ── Application Card ────────────────────────────────────────────────── */
const ApplicationCard = ({ application, onStatusChange, planSummary, onUnlock, aiUsage, setAiUsage, usageLoading }) => {
  const {
    t
  } = useTranslation();

  const [updating, setUpdating] = useState(false);
  const [showSkillGap, setShowSkillGap] = useState(false);
  const [skillGapData, setSkillGapData] = useState(null);
  const [loadingSkillGap, setLoadingSkillGap] = useState(false);
  const navigate = useNavigate();

  const handleGenerateSkillGap = async () => {
    if (skillGapData) {
      setShowSkillGap(!showSkillGap);
      return;
    }
    
    setLoadingSkillGap(true);
    setShowSkillGap(true);
    try {
      const res = await recruiterAPI.getSkillGap({
        providerId: provider._id,
        jobId: job._id
      });
      setSkillGapData(res.data);
      // Fetch updated usage if success
      if (res.data) {
          recruiterAPI.getAiUsage().then(usageRes => {
              if (usageRes.data?.success && typeof setAiUsage === 'function') {
                  setAiUsage({ limits: usageRes.data.limits || {}, usage: usageRes.data.usage || {} });
              }
          }).catch(() => {});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate skill gap report');
      setShowSkillGap(false);
    } finally {
      setLoadingSkillGap(false);
    }
  };

  const provider = application.provider;
  const job = application.jobPost;
  const currentStatus = application.status;
  const statusInfo = STATUS_COLORS[currentStatus] || STATUS_COLORS.pending;
  const StatusIcon = statusInfo.icon;
  const isUnlocked = provider?.isUnlocked;

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await recruiterAPI.updateApplicationStatus(application._id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      onStatusChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this application? This action cannot be undone.")) return;
    setUpdating(true);
    try {
      await recruiterAPI.deleteApplication(application._id);
      toast.success("Application deleted");
      onStatusChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete application");
    } finally {
      setUpdating(false);
    }
  };



  return (
    <div className={`rounded-2xl border p-6 bg-white shadow-sm border-gray-100 hover:border-gray-200 transition-all space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 items-center">
          {/* Avatar Placeholder */}
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-lg uppercase shadow-xs">
            {provider?.name ? provider.name.charAt(0) : 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base">{provider?.name || 'Provider Candidate'}</h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.border} ${statusInfo.text}`}>
                <StatusIcon className="w-3.5 h-3.5" /> {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <HiBriefcase className="w-3.5 h-3.5" /> {job?.title || 'Unknown Job'}
            </p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={updating}
          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
          title="Delete Application"
        >
          <HiTrash className="w-5 h-5" />
        </button>
      </div>
      {/* Candidate Overview Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50/50 p-3.5 rounded-xl border border-gray-100/50 text-xs">
        <div className="flex items-center gap-1.5 text-gray-700">
          <HiLocationMarker className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate">{formatLocation(provider?.location || provider?.city)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-700">
          <HiBriefcase className="w-4 h-4 text-gray-400 shrink-0" />
          <span>{provider?.experience ? `${provider.experience} Experience` : 'N/A Experience'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-700">
          <HiCurrencyRupee className="w-4 h-4 text-gray-400 shrink-0" />
          <span>{provider?.pricing ? `₹${provider.pricing} ${provider.pricingType || ''}` : 'Rate Negotiable'}</span>
        </div>
      </div>
      {/* Bio / Skills */}
      <div className="space-y-2">
        {provider?.description && (
          <p className="text-xs text-gray-700 leading-relaxed italic bg-gray-50/30 p-3 rounded-lg border border-gray-100">
            "{provider.description}"
          </p>
        )}
        {provider?.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {provider.skills.map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[10px] font-semibold">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Cover Letter */}
      {application.coverLetter && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">{t("Application Message:")}</p>
          <p className="text-xs text-gray-700 leading-relaxed bg-amber-50/30 border border-amber-100/40 p-3 rounded-xl italic">
            "{application.coverLetter}"
          </p>
        </div>
      )}
      {/* Contact Details Mask / Unlock Banner */}
      {!isUnlocked ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-indigo-50/70 border border-indigo-100/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <HiLockClosed className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">{t("Contact information locked")}</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">{t("Available Credits:")}<span className="font-semibold text-indigo-700">{planSummary?.unlockCreditsRemaining ?? 0}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => onUnlock(provider._id)}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <HiSparkles className="w-3.5 h-3.5" />{t("Unlock Profile (1 Credit)")}</button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="space-y-1">
            <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
              <HiLockOpen className="w-3.5 h-3.5 text-emerald-600" />{t("Candidate Contact Unlocked")}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-800 pt-0.5">
              <span className="flex items-center gap-1.5 font-medium"><HiPhone className="w-4 h-4 text-emerald-500" />{provider.phone}</span>
              <span className="flex items-center gap-1.5 font-medium"><HiMail className="w-4 h-4 text-emerald-500" />{provider.email}</span>
            </div>
          </div>
        </div>
      )}
      {/* AI Skill Gap Button */}
      <div className="pt-2">
        <button
          onClick={handleGenerateSkillGap}
          disabled={!showSkillGap && (aiUsage?.limits?.customReports !== -1 && aiUsage?.usage?.customReports >= (aiUsage?.limits?.customReports || 0))}
          className={`px-4 py-2 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed ${
            showSkillGap 
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <HiSparkles className={showSkillGap ? "text-purple-600" : "text-gray-400"} />
            {showSkillGap ? 'Hide AI Match Analysis' : 'AI Match Analysis'}
          </div>
          {!showSkillGap && !usageLoading && aiUsage?.limits?.customReports !== undefined && aiUsage?.limits?.customReports !== -1 && (
             <span className="text-[10px] opacity-80 mt-[-2px] font-medium text-gray-500">
                ({Math.max(0, aiUsage.limits.customReports - (aiUsage.usage.customReports || 0))} left)
             </span>
          )}
        </button>
      </div>
      {/* AI Skill Gap Panel */}
      {showSkillGap && (
        <div className="p-4 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 border border-purple-100 rounded-xl mt-2 animate-fadeIn space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <HiSparkles className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">{t("AI Skill Gap Match")}</h4>
          </div>

          {loadingSkillGap ? (
            <div className="flex flex-col items-center justify-center py-6 text-purple-600 space-y-3">
              <HiSparkles className="w-8 h-8 animate-pulse opacity-60" />
              <p className="text-xs font-semibold animate-pulse">{t("Analyzing candidate against Job Description...")}</p>
            </div>
          ) : skillGapData && skillGapData.analysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Score & Matched Skills (Free) */}
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border border-purple-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("Match Score")}</p>
                    <div className="text-2xl font-black text-gray-900">
                      {skillGapData.analysis.job_match_score || 0}%
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-full border-4 flex items-center justify-center text-sm font-bold bg-gray-50"
                    style={{ borderColor: skillGapData.analysis.job_match_score > 70 ? '#10B981' : skillGapData.analysis.job_match_score > 40 ? '#F59E0B' : '#EF4444', color: skillGapData.analysis.job_match_score > 70 ? '#047857' : skillGapData.analysis.job_match_score > 40 ? '#B45309' : '#B91C1C' }}
                  >
                    {skillGapData.analysis.job_match_score || 0}%
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-purple-100 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t("Matched Skills")}</p>
                  <div className="flex flex-wrap gap-2">
                    {skillGapData.analysis.matched_skills && skillGapData.analysis.matched_skills.length > 0 ? (
                      skillGapData.analysis.matched_skills.map((s, i) => (
                        <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[10px] font-semibold flex items-center gap-1">
                          <HiCheckCircle className="w-3 h-3" /> {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">{t("No exact matches found.")}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Missing Skills & Hiring Path (Premium Locked) */}
              {!skillGapData.isSubscribed ? (
                <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 shadow-inner flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden h-full min-h-[160px]">
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]"></div>
                  <div className="relative z-10 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white text-gray-400 flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                      <HiLockClosed className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{t("Detailed Gap Analysis Locked")}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] mx-auto">{t(
                        "Upgrade to view missing critical skills and the fastest hire path for this candidate."
                      )}</p>
                    </div>
                    <button 
                      onClick={() => navigate('/recruiter/plans')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-sm hover:from-purple-700 hover:to-indigo-700 transition"
                    >{t("Upgrade Plan")}</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-rose-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t("Missing Critical Skills")}</p>
                    <div className="flex flex-wrap gap-2">
                      {skillGapData.analysis.missing_critical_skills && skillGapData.analysis.missing_critical_skills.length > 0 ? (
                        skillGapData.analysis.missing_critical_skills.map((s, i) => (
                          <span key={i} className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-md text-[10px] font-semibold flex items-center gap-1">
                            <HiX className="w-3 h-3" /> {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">{t("None! Candidate meets requirements.")}</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{t("Fastest Hire Path")}</p>
                    <p className="text-xs text-gray-700 leading-relaxed font-medium">
                      {skillGapData.analysis.fastest_hire_path || "Ready to hire based on matched skills."}
                    </p>
                    {skillGapData.analysis.hire_ready_after && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 text-[10px] font-bold">
                        <HiClock className="w-3 h-3" />{t("Estimated Readiness:")}{skillGapData.analysis.hire_ready_after}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
             <div className="text-center py-4 text-xs text-red-700">{t("Failed to load analysis.")}</div>
          )}
        </div>
      )}
      {/* Status transition buttons */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
        {['reviewed', 'contacted', 'shortlisted', 'rejected', 'hired'].map(status => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={updating || currentStatus === status}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentStatus === status
                ? 'bg-gray-100 text-gray-400 cursor-default'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            } disabled:opacity-50`}
          >
            {statusInfo.label === STATUS_COLORS[status]?.label ? '✓' : '→'} {STATUS_COLORS[status]?.label || status}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Main RecruiterApplications Component ────────────────────────────── */
const RecruiterApplications = () => {
  const {
    t
  } = useTranslation();

  const navigate = useNavigate();
  const location = useLocation();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [planSummary, setPlanSummary] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    recruiterAPI.getAiUsage().then(res => {
      if (res.data?.success) {
        setAiUsage({ limits: res.data.limits || {}, usage: res.data.usage || {} });
      }
    }).catch(err => console.error(err))
      .finally(() => setUsageLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchPlanSummary = async () => {
    try {
      const summaryRes = await recruiterAPI.getRecruiterPlanSummary();
      setPlanSummary(summaryRes.data || null);
    } catch (err) {
      console.error('Failed to load plan summary', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await fetchPlanSummary();
      const jobsRes = await recruiterAPI.getJobs();
      const apiJobs = jobsRes.data || [];
      setJobs(apiJobs);
      
      const searchParams = new URLSearchParams(location.search);
      const queryJobId = searchParams.get('jobId');
      
      const targetJobId = queryJobId && apiJobs.some(j => j._id === queryJobId)
        ? queryJobId
        : (apiJobs[0]?._id || null);

      if (targetJobId) {
        setSelectedJob(targetJobId);
        await fetchApplications(targetJobId);
      }
    } catch (err) {
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobId) => {
    setLoading(true);
    try {
      const res = await recruiterAPI.getJobApplications(jobId);
      setApplications(res.data || []);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleJobChange = (jobId) => {
    setSelectedJob(jobId);
    fetchApplications(jobId);
  };

  const handleUnlockProvider = async (providerId) => {
    if (!planSummary || (planSummary.unlockCreditsRemaining ?? 0) <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    if (!window.confirm("Unlock this profile? 1 profile unlock credit will be deducted.")) return;

    try {
      const toastId = toast.loading("Unlocking contact information...");
      await recruiterAPI.unlockProvider(providerId, { jobId: selectedJob });
      toast.success("Profile unlocked successfully!", { id: toastId });
      
      // Real-time update: fetch data again
      await Promise.all([
        fetchApplications(selectedJob),
        fetchPlanSummary()
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unlock profile");
    }
  };

  const filteredApplications = filterStatus === 'all'
    ? applications
    : applications.filter(app => app.status === filterStatus);

  const statsCounts = {
    pending: applications.filter(a => a.status === 'pending').length,
    reviewed: applications.filter(a => a.status === 'reviewed').length,
    contacted: applications.filter(a => a.status === 'contacted').length,
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    hired: applications.filter(a => a.status === 'hired').length,
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: 'linear-gradient(160deg,#f3f4f6 0%,#f8fafc 65%,#ffffff 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/recruiter/dashboard')}
              className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 shadow-xs transition"
            >
              <HiArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t("Job Applications")}</h1>
              <p className="text-xs text-gray-500 mt-0.5">{t("Review and manage candidates for your posted jobs")}</p>
            </div>
          </div>

          {/* Credits Summary Banner */}
          {planSummary && (
            <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl flex items-center gap-2 shadow-sm shrink-0">
              <HiSparkles className="w-4 h-4 animate-pulse" />
              <div className="text-xs font-semibold">
                <span className="opacity-90">{planSummary.plan?.name || 'Active'}{t("Plan:")}</span>
                <span>{planSummary.unlockCreditsRemaining ?? 0}{t("Unlocks Left")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Job Selector */}
        {jobs.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
            <label className="block text-xs font-bold text-gray-700 mb-2">{t("Select Posted Job")}</label>
            <select
              value={selectedJob || ''}
              onChange={(e) => handleJobChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-transparent outline-none bg-white font-medium"
            >
              {jobs.map(job => (
                <option key={job._id} value={job._id}>
                  {job.title} ({job.skill}) - {job.city} ({job.applicationCount || 0}{t("applications)")}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
            <HiDocumentText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800">{t("No jobs posted yet")}</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">{t(
              "Post an active job using our smart AI describer to start receiving candidate applications."
            )}</p>
            <button
              onClick={() => navigate('/recruiter/post-job')}
              className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
            >{t("Post a Job")}</button>
          </div>
        )}

        {/* Status Filter Tabs */}
        {applications.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-2.5 shadow-xs flex flex-wrap gap-2">
            {['all', 'pending', 'reviewed', 'contacted', 'shortlisted', 'rejected', 'hired'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                }`}
              >
                {status === 'all' ? 'All' : STATUS_COLORS[status]?.label || status}
                {status !== 'all' && <span className="ml-1 font-bold">({statsCounts[status]})</span>}
              </button>
            ))}
          </div>
        )}

        {/* Applications List */}
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : filteredApplications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-xs">
            <HiDocumentText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">
              {applications.length === 0
                ? 'No applications yet for this job'
                : `No applications with status "${STATUS_COLORS[filterStatus]?.label || filterStatus}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map(app => (
              <ApplicationCard
                key={app._id}
                application={app}
                planSummary={planSummary}
                onUnlock={handleUnlockProvider}
                onStatusChange={() => fetchApplications(selectedJob)}
                aiUsage={aiUsage}
                setAiUsage={setAiUsage}
                usageLoading={usageLoading}
              />
            ))}
          </div>
        )}
      </div>
      {/* Upgrade / Out of Credits Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          navigate={navigate}
        />
      )}
    </div>
  );
};

export default RecruiterApplications;
