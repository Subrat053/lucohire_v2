import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  HiArrowLeft,
  HiArrowRight,
  HiLocationMarker,
  HiCurrencyRupee,
  HiBriefcase,
  HiClock,
  HiUsers,
  HiCheckCircle,
  HiBookmark,
  HiShare,
  HiExternalLink,
  HiSparkles,
  HiLockClosed,
  HiOfficeBuilding,
  HiShieldCheck,
  HiExclamationCircle,
  HiOutlineMail,
  HiPhone,
  HiX,
  HiChevronRight,
  HiChevronDown,
  HiOutlineBookmark,
  HiOutlineClock,
  HiTrendingUp,
  HiOutlineBriefcase,
} from "react-icons/hi";
import { FaWhatsapp, FaLinkedin, FaTwitter } from "react-icons/fa";
import { providerAPI, subscriptionAPI } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const BUDGET_LABELS = {
  fixed: "Fixed",
  hourly: "/hr",
  monthly: "/mo",
  negotiable: "Negotiable",
};

const getSafeHtml = (htmlStr) => {
  if (!htmlStr) return "";
  // Remove image tags as a precaution
  let cleaned = htmlStr.replace(/<img[^>]*>/g, "");
  // Decode HTML entities (e.g. &lt;p&gt; -> <p>)
  const textArea = document.createElement("textarea");
  textArea.innerHTML = cleaned;
  return textArea.value;
};

/* ── Full Report Modal ───────────────────────────────────────────────────── */
const FullReportModal = ({ job, aiInsights, onClose }) => {
  if (!job || !aiInsights) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="font-extrabold text-gray-900 text-xl sm:text-lg flex items-center gap-2">
              <span className="text-2xl sm:text-xl">📊</span> Full AI Insights Report
            </h3>
            <p className="text-sm sm:text-xs text-gray-500 font-medium">For {job.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition text-gray-500"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-6">
          <div>
            <h4 className="text-base sm:text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-emerald-700">
              <HiSparkles className="w-4 h-4" /> Why this is a great match
            </h4>
            <ul className="space-y-2">
              {(aiInsights.whyMatch || ["Strong skill alignment"]).map(
                (pt, i) => (
                  <li
                    key={i}
                    className="text-base sm:text-sm text-gray-700 flex items-start gap-2"
                  >
                    <span className="text-emerald-500 mt-0.5">•</span> {pt}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-base sm:text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-blue-700">
              <HiBriefcase className="w-4 h-4" /> Action Plan
            </h4>
            <ul className="space-y-2">
              {(
                aiInsights.actionPlan || [
                  "Tailor your resume to highlight relevant experience.",
                ]
              ).map((pt, i) => (
                <li
                  key={i}
                  className="text-base sm:text-sm text-gray-700 flex items-start gap-2"
                >
                  <span className="text-blue-500 mt-0.5">•</span> {pt}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-base sm:text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-purple-700">
              <HiOfficeBuilding className="w-4 h-4" /> Resume Keywords
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(
                aiInsights.resumeKeywords || ["Leadership", "Communication"]
              ).map((keyword, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm sm:text-xs font-semibold"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-base sm:text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-orange-700">
              <HiUsers className="w-4 h-4" /> Interview Prep
            </h4>
            <ul className="space-y-2">
              {(
                aiInsights.interviewPrep || ["What is your greatest strength?"]
              ).map((pt, i) => (
                <li
                  key={i}
                  className="text-base sm:text-sm text-gray-700 flex items-start gap-2"
                >
                  <span className="text-orange-500 mt-0.5">Q:</span> {pt}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-base sm:text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-red-700">
              <HiExclamationCircle className="w-4 h-4" /> Potential Hire Blocker
            </h4>
            <p className="text-base sm:text-sm text-gray-700">
              {aiInsights.hireBlocker || "No major blockers identified."}
            </p>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-base sm:text-sm font-bold transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [saved, setSaved] = useState(false);

  const [showFullReport, setShowFullReport] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [jobRes, subRes] = await Promise.allSettled([
          providerAPI.getJobById(jobId),
          subscriptionAPI.getMySubscription(),
        ]);

        const topData =
          jobRes.status === "fulfilled" ? jobRes.value.data : null;
        const jobData = topData?.job || topData;
        if (!jobData) {
          toast.error("Job not found");
          navigate(-1);
          return;
        }

        if (topData?.isExternal !== undefined) {
          jobData.isExternal = topData.isExternal;
        } else if (jobData.source && jobData.source !== "internal") {
          jobData.isExternal = true;
        }

        setJob(jobData);
        setHasApplied(!!topData?.hasApplied);
        setSaved(!!topData?.isSaved);

        const sub =
          subRes.status === "fulfilled"
            ? subRes.value.data?.subscription
            : null;
        setSubscription(sub);

        // Always call backend — it checks ProviderSubscription and returns _isMock: true for free users
        try {
          const insRes = await providerAPI.getJobAiInsights([
            {
              _id: jobData._id,
              title: jobData.title,
              skill: jobData.skill,
              requirements: jobData.requirements,
              experienceRequired: jobData.experienceRequired,
            },
          ]);
          if (insRes.data?.success && insRes.data.data.length > 0) {
            setAiInsights(insRes.data.data[0].insights);
          }
        } catch {
          /* silently fail */
        }
        // Fetch Similar Jobs
        try {
          const matchRes = await providerAPI.getMatches();
          if (matchRes.data?.success && matchRes.data.data) {
            setSimilarJobs(
              matchRes.data.data.filter((j) => j._id !== jobId).slice(0, 4),
            );
          }
        } catch {
          /* silently fail */
        }
      } catch {
        toast.error("Failed to load job details");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [jobId, navigate]);

  // hasActivePlan is derived from backend response — _isMock: true means free user
  const hasActivePlan = !aiInsights?._isMock;

  const handleSave = useCallback(async () => {
    try {
      await providerAPI.toggleSaveJob(job._id, !!job.isExternal);
      setSaved((s) => !s);
    } catch {
      toast.error("Could not save job");
    }
  }, [job]);

  const handleApply = useCallback(async () => {
    if (!job) return;
    if (job.isExternal || job.source !== 'internal') {
      const extUrl = job.applyUrl || job.apply_url || job.externalUrl || job.url;
      if (extUrl) window.open(extUrl, '_blank', 'noopener,noreferrer');
      else toast.error('Application link not available for this job.');
      return;
    }
    if (hasApplied) { toast('You have already applied to this job.'); return; }
    try {
      setApplying(true);
      await providerAPI.applyToJob(job._id, {});
      setHasApplied(true);
      toast.success('Application submitted successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to apply. Please try again.');
    } finally {
      setApplying(false);
    }
  }, [job, hasApplied]);

  const handleShare = async (platform) => {
    const publicUrl = `${window.location.origin}/job/${job._id}`;
    const text = `Check out this job: ${job?.title}`;
    
    if (platform === "copy" || platform === "native") {
      if (navigator.share) {
        try {
          await navigator.share({ title: job?.title || "Job", text: text, url: publicUrl });
          return;
        } catch (error) {
          console.error("Native share failed/aborted:", error);
        }
      }
      
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(publicUrl);
          toast.success("Link copied!");
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = publicUrl;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
            toast.success("Link copied!");
          } catch (err) {
            console.error('Fallback copy failed', err);
            toast.error("Could not copy link");
          }
          textArea.remove();
        }
      } catch (err) {
        console.error("Clipboard copy failed", err);
        toast.error("Could not copy link");
      }
    } else {
      const links = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + publicUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicUrl)}`,
      };
      window.open(links[platform], "_blank");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );

  if (!job) return null;

  const budgetText =
    job.budgetType === "negotiable"
      ? "Negotiable"
      : `₹${job.budgetMin?.toLocaleString()} – ₹${job.budgetMax?.toLocaleString()} ${BUDGET_LABELS[job.budgetType] || ""}`.trim();

  const postedAgo = (() => {
    const d = Math.floor((Date.now() - new Date(job.createdAt)) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
  })();

  const matchScore = aiInsights?.matchScore || 0;

  const similarJobsSection = (
    <div>
            <div className="flex items-center justify-between mb-4 mt-2">
              <h2 className="font-extrabold text-[17px] sm:text-[15px] text-gray-900">
                Similar Jobs for You
              </h2>
              <Link
                to="/provider/jobs"
                className="text-[14px] sm:text-[12px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                View all <HiArrowRight className="w-3 h-3" />
              </Link>
            </div>
  
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {similarJobs.length > 0
                ? similarJobs.map((sJob, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                      onClick={() => navigate(`/provider/job/${sJob._id}`)}
                    >
                      <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {sJob.companyLogo ? (
                            <img
                              src={sJob.companyLogo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-gray-700">
                              {sJob.companyName?.substring(0, 1) || "C"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-extrabold text-[15px] sm:text-[13px] text-gray-900 line-clamp-1 truncate">
                              {sJob.title}
                            </p>
  
                          </div>
                          <p className="text-[13px] sm:text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                            {sJob.companyName || "Company"}{" "}
                            <HiCheckCircle className="w-3 h-3 text-blue-500 shrink-0" />
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-4">
                        <p className="text-[13px] sm:text-[11px] text-gray-500 flex items-center gap-1.5 truncate">
                          <HiLocationMarker className="w-3.5 h-3.5 text-gray-400 shrink-0" />{" "}
                          {sJob.city || "Remote"}
                        </p>
                        <p className="text-[13px] sm:text-[11px] text-gray-500 flex items-center gap-1.5 truncate">
                          <HiCurrencyRupee className="w-3.5 h-3.5 text-gray-400 shrink-0" />{" "}
                          {sJob.budgetMax
                            ? `₹${sJob.budgetMin / 100000} - ${sJob.budgetMax / 100000} LPA`
                            : "Negotiable"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                        <span className="text-[13px] sm:text-[11px] font-bold text-emerald-600">
                          {sJob.matchScore || 80}% Match
                        </span>
                        <HiArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </div>
                  ))
                : [1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between h-[160px]"
                    >
                      <div className="animate-pulse flex gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg"></div>
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                          <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="animate-pulse space-y-2 mt-4">
                        <div className="h-2 bg-gray-100 rounded w-2/3"></div>
                        <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Back bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-base sm:text-sm font-semibold text-gray-700 hover:text-gray-900 transition"
          >
            <HiArrowLeft className="w-4 h-4" /> Back to Jobs
          </button>
        </div>
      </div>
      <div className="relative w-full pb-[80px]">
        {/* Mobile Sticky Wrapper that doesn't affect document flow */}
        <div className="xl:hidden fixed bottom-4 left-0 right-0 z-50 pointer-events-none flex justify-center">
          <div className="w-[85%] max-w-[340px]">
            <button
              onClick={handleApply}
              disabled={applying || (hasApplied && job?.source === 'internal')}
              className="pointer-events-auto w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[17px] sm:text-[15px] font-bold rounded-xl shadow-[0_8px_20px_-4px_rgba(5,150,105,0.4)] transition flex items-center justify-center gap-2"
            >
              {applying ? 'Submitting...' : hasApplied && job?.source === 'internal' ? 'Applied ✓' : 'Apply Now'}
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* ── Left Column ── */}
        <div className="space-y-5">
          {/* ── AI Match Banner ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col xl:flex-row gap-5 sm:gap-6 xl:gap-8">
              {/* Left Grouping for Mobile: Score + Report */}
              <div className="flex flex-row items-center xl:items-stretch gap-4 sm:gap-6 xl:gap-8 xl:flex-1">
                {/* Score */}
                <div className="flex flex-col items-center justify-center min-w-[90px] sm:min-w-[120px] shrink-0">
                  <p className="text-[11px] sm:text-[10px] font-bold text-gray-500 mb-2 tracking-wide uppercase">
                    AI Match Score
                  </p>
                  <div className="relative w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] mb-2">
                    <svg
                      className="w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] -rotate-90"
                      viewBox="0 0 36 36"
                    >
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke={matchScore >= 80 ? "#10b981" : "#f59e0b"}
                        strokeWidth="3.5"
                        strokeDasharray={`${matchScore} ${100 - matchScore}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-extrabold text-xl sm:text-2xl text-gray-900 tracking-tighter">
                        {matchScore}%
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[13px] sm:text-[13px] font-bold ${matchScore >= 80 ? "text-emerald-600" : "text-yellow-600"} text-center leading-tight`}
                  >
                    {matchScore >= 80
                      ? "Excellent Match"
                      : matchScore >= 60
                        ? "Good Match"
                        : "Fair Match"}
                  </span>
                  <div className="flex gap-0.5 sm:gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={`text-[12px] sm:text-xs ${s <= Math.round(matchScore / 20) ? "text-emerald-500" : "text-gray-200"}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                {/* Why this job is great for you — AI Report */}
                <div className="flex-1 min-w-0 xl:border-l border-gray-100 xl:pl-8 py-2">
                  <h3 className="font-bold text-gray-900 text-[16px] sm:text-[15px] mb-2 sm:mb-3 leading-tight">
                    Why this job is a great match for you
                  </h3>

                  {/* Checklist bullets */}
                  {hasActivePlan ? (
                    <ul className="space-y-2.5 mb-4">
                      {(aiInsights?.whyMatch || [])
                        .slice(0, 1)
                        .map((point, i) => (
                          <li
                            key={i}
                            className="text-[15px] sm:text-[13px] text-gray-700 font-medium"
                          >
                            <span className="line-clamp-3 sm:line-clamp-none">
                              <HiCheckCircle className="inline-block w-[18px] h-[18px] text-emerald-500 mr-1.5 align-text-bottom sm:align-text-top" />
                              {point}
                            </span>
                          </li>
                        ))}
                      {(!aiInsights?.whyMatch ||
                        aiInsights.whyMatch.length === 0) && (
                        <li className="text-[15px] sm:text-[13px] font-medium text-amber-700">
                          <span>
                            <HiCheckCircle className="inline-block w-[18px] h-[18px] text-emerald-500 mr-1.5 opacity-0 align-text-bottom sm:align-text-top" />
                            {aiInsights?.improve ||
                              "Improve skills to increase match score"}
                          </span>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center mt-2">
                      <HiLockClosed className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
                      <p className="text-[15px] sm:text-[13px] font-bold text-gray-700 mb-1">
                        Unlock Premium AI Features
                      </p>
                      <button
                        onClick={() => navigate("/provider/plans")}
                        className="text-[14px] sm:text-[12px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5"
                      >
                        View Plans
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Action Block */}
              <div className="w-full xl:w-[200px] shrink-0 xl:border-l border-gray-100 xl:pl-8 space-y-4 pt-4 xl:pt-0 border-t xl:border-t-0 flex flex-col justify-center">
                <button
                  onClick={handleApply}
                  disabled={applying || (hasApplied && job?.source === 'internal')}
                  className="hidden xl:block w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[15px] sm:text-[13px] font-bold rounded-xl shadow-sm transition"
                >
                  {applying ? 'Submitting...' : hasApplied && job?.source === 'internal' ? 'Applied ✓' : 'Apply Now'}
                </button>
                <div className="hidden sm:flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <HiClock className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-[15px] sm:text-[13px] text-gray-900 leading-tight">
                      Posted
                    </p>
                    <p className="text-[13px] sm:text-[11px] font-medium text-gray-500 mt-0.5">
                      {postedAgo}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Company Header ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-0 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] rounded-[12px] sm:rounded-[16px] border border-gray-100 flex flex-col items-center justify-center shadow-sm bg-white overflow-hidden shrink-0">
                    {job.companyLogo ? (
                      <img
                        src={job.companyLogo}
                        alt={job.companyName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-extrabold text-2xl sm:text-2xl text-gray-900 tracking-tighter capitalize">
                        {job.companyName?.substring(0, 1) || "C"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                      <span className="font-extrabold text-gray-900 text-lg sm:text-lg truncate max-w-full">
                        {job.companyName || job.recruiter?.name || "Company"}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                        <HiCheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{" "}
                        Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[13px] sm:text-[13px] text-gray-500 font-medium">
                      <span className="text-yellow-400">★</span>
                      <span className="font-bold text-gray-700">4.6</span>
                      <span>(12.4K reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button
                    onClick={() => handleSave()}
                    className={`flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl transition ${saved ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {saved ? (
                      <HiBookmark className="w-[18px] h-[18px]" />
                    ) : (
                      <HiOutlineBookmark className="w-[18px] h-[18px]" />
                    )}
                    <span className="hidden sm:block text-[15px] sm:text-[13px] font-bold ml-1.5">
                      {saved ? "Saved" : "Save"}
                    </span>
                  </button>
                  <button
                    onClick={() => handleShare("native")}
                    className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl text-gray-700 hover:bg-gray-50 transition"
                  >
                    <HiShare className="w-[18px] h-[18px]" />
                    <span className="hidden sm:block text-[15px] sm:text-[13px] font-bold ml-1.5">
                      Share
                    </span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="mt-5 sm:mt-6">
                <h1 className="font-extrabold text-3xl sm:text-3xl text-gray-900 leading-tight">
                  {job.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-[15px] sm:text-[13px] font-medium text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <HiLocationMarker className="w-4 h-4 text-gray-400" />{" "}
                    {job.city || "Location not specified"}{" "}
                    {job.workMode && `(${job.workMode})`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <HiClock className="w-4 h-4 text-gray-400" />{" "}
                    {job.jobType || "Full-time"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <HiCurrencyRupee className="w-4 h-4 text-gray-400" />{" "}
                    {budgetText}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-[14px] sm:text-[12px] font-medium text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <HiOutlineClock className="w-4 h-4" /> Posted {postedAgo}
                  </span>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mt-5">
                  {job.skill && (
                    <span className="text-[14px] sm:text-[12px] px-4 py-1.5 bg-gray-50 text-gray-700 rounded-full font-bold border border-gray-100">
                      {job.skill}
                    </span>
                  )}
                  {job.requirements?.slice(0, 4).map((r, i) => (
                    <span
                      key={i}
                      className="text-[14px] sm:text-[12px] px-4 py-1.5 bg-gray-50 text-gray-700 rounded-full font-bold border border-gray-100"
                    >
                      {r}
                    </span>
                  ))}
                  {job.requirements?.length > 4 && (
                    <span className="text-[14px] sm:text-[12px] px-4 py-1.5 bg-gray-50 text-gray-700 rounded-full font-bold border border-gray-100">
                      +{job.requirements.length - 4}
                    </span>
                  )}
                </div>

                {/* Info row */}
                <div className="flex items-center justify-start border-t border-gray-100 mt-5 pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <span className="flex items-center gap-1.5 text-[14px] sm:text-[12px] font-medium text-gray-500">
                      <HiClock className="w-3.5 h-3.5 text-emerald-500" /> Apply
                      takes less than 2 minutes
                    </span>
                    <span className="flex items-center gap-1.5 text-[14px] sm:text-[12px] font-medium text-gray-500">
                      <HiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />{" "}
                      No cover letter required
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs & Content ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-6 sm:gap-8 px-6 bg-gray-50/50 border-b border-gray-100">
              {["Overview", "About Company"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 text-[16px] sm:text-[15px] font-bold border-b-2 transition-colors ${activeTab === tab ? "border-emerald-600 text-emerald-700 -mb-[1px]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === "Overview" && (
                <div className="space-y-7">
                  {/* Overview */}
                  <section>
                    <h2 className="font-extrabold text-[17px] sm:text-[15px] text-gray-900 flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <HiOfficeBuilding className="w-4 h-4 text-emerald-600" />
                      </div>
                      Overview
                    </h2>
                    {job.description && (
                      <div
                        className="text-[16px] sm:text-[14px] text-gray-700 leading-relaxed prose prose-sm max-w-none px-1"
                        dangerouslySetInnerHTML={{
                          __html: getSafeHtml(job.description),
                        }}
                      />
                    )}
                  </section>

                  {/* Requirements */}
                  {job.requirements && job.requirements.length > 0 && (
                    <section className="border-t border-gray-100 pt-5">
                      <div className="w-full flex items-center justify-between font-extrabold text-[17px] sm:text-[15px] text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                            <HiBriefcase className="w-4 h-4 text-purple-600" />
                          </div>
                          Requirements
                        </div>
                      </div>
                      <p className="text-[15px] sm:text-[13px] text-gray-700 mt-2 px-10">
                        {job.requirements.join(", ")}
                      </p>
                    </section>
                  )}

                  {/* Benefits & Perks */}
                  {job.benefits && job.benefits.length > 0 && (
                    <section className="border-t border-gray-100 pt-5">
                      <div className="w-full flex items-center justify-between font-extrabold text-[17px] sm:text-[15px] text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <HiSparkles className="w-4 h-4 text-emerald-600" />
                          </div>
                          Benefits & Perks
                        </div>
                      </div>
                      <ul className="text-[15px] sm:text-[13px] text-gray-700 mt-2 px-10 list-disc list-inside">
                        {job.benefits.map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}

              {activeTab === "About Company" && (
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-[52px] h-[52px] rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col items-center justify-center overflow-hidden shrink-0">
                      {job.companyLogo ? (
                        <img
                          src={job.companyLogo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-extrabold text-[20px] sm:text-[18px] text-gray-900 capitalize">
                          {job.companyName?.substring(0, 1) || "C"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-[17px] sm:text-[15px] text-gray-900 mb-0.5">
                        {job.companyName || job.recruiter?.name || "Company"}
                      </p>
                      <p className="text-[13px] sm:text-[11px] font-medium text-gray-500 flex items-center gap-1">
                        <span className="text-yellow-400">★</span> 4.6 (12.4K
                        reviews)
                      </p>
                    </div>
                  </div>
                  {job.companyDescription ? (
                    <div
                      className="text-[15px] sm:text-[13px] font-medium text-gray-700 leading-relaxed mb-4 w-full"
                      dangerouslySetInnerHTML={{
                        __html: job.companyDescription.replace(
                          /<img[^>]*>/g,
                          "",
                        ),
                      }}
                    />
                  ) : (
                    <p className="text-[15px] sm:text-[13px] font-medium text-gray-700 leading-relaxed mb-4">
                      {job.companyInfo ||
                        "A leading company providing exceptional services and opportunities across multiple sectors. Join us to build impactful solutions at scale."}
                    </p>
                  )}
                  <div className="space-y-2.5 text-[14px] sm:text-[12px] font-medium text-gray-700 mb-4">
                    <div className="flex items-center gap-2.5">
                      <HiOfficeBuilding className="w-[18px] h-[18px] text-gray-400" />{" "}
                      <div>
                        <p className="text-[12px] sm:text-[10px] text-gray-400 leading-none">
                          Industry
                        </p>
                        <p className="font-bold text-gray-700">
                          IT Services & Consulting
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <HiUsers className="w-[18px] h-[18px] text-gray-400" />{" "}
                      <div>
                        <p className="text-[12px] sm:text-[10px] text-gray-400 leading-none">
                          Company Size
                        </p>
                        <p className="font-bold text-gray-700">
                          10,001+ employees
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <HiLocationMarker className="w-[18px] h-[18px] text-gray-400" />{" "}
                      <div>
                        <p className="text-[12px] sm:text-[10px] text-gray-400 leading-none">
                          Headquarters
                        </p>
                        <p className="font-bold text-gray-700">
                          {job.city || "India"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Similar Jobs for You (Desktop) ── */}
          <div className="hidden xl:block mt-6">
            {similarJobsSection}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-4">
          {/* ── AI Summary ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-[17px] sm:text-[15px] text-gray-900">
                AI Summary
              </h3>
              <span className="text-[12px] sm:text-[10px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full flex items-center gap-1">
                <HiSparkles className="w-3 h-3" /> AI
              </span>
            </div>
            <div className="space-y-4">
              {/* AI Match Score */}
              <div className={hasActivePlan ? "text-[15px] sm:text-[13px] leading-relaxed w-full" : "flex items-start gap-2 w-full"}>
                {!hasActivePlan && <HiSparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />}
                <span className={hasActivePlan ? "font-semibold text-gray-700 mr-1.5" : "font-semibold text-[15px] sm:text-[13px] text-gray-700 whitespace-nowrap shrink-0"}>
                  {hasActivePlan && <HiSparkles className="inline-block w-4 h-4 text-purple-500 mr-1.5 align-text-bottom sm:align-text-top" />}
                  AI Match Score {hasActivePlan && <span className="text-gray-300 ml-0.5 font-normal">•</span>}
                </span>
                {!hasActivePlan && <span className="text-gray-300 shrink-0 text-[15px] sm:text-[13px]">•</span>}
                <div
                  className={hasActivePlan ? "inline" : "flex-1 blur-sm select-none opacity-60"}
                >
                  <span className={`font-bold text-gray-900 ${!hasActivePlan ? 'text-[15px] sm:text-[13px] leading-snug' : ''}`}>
                    {matchScore}% match based on your profile
                  </span>
                </div>
              </div>

              {/* Top Strength */}
              <div className={hasActivePlan ? "text-[15px] sm:text-[13px] leading-relaxed w-full" : "flex items-start gap-2 w-full"}>
                {!hasActivePlan && <HiCheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
                <span className={hasActivePlan ? "font-semibold text-gray-700 mr-1.5" : "font-semibold text-[15px] sm:text-[13px] text-gray-700 whitespace-nowrap shrink-0"}>
                  {hasActivePlan && <HiCheckCircle className="inline-block w-4 h-4 text-green-500 mr-1.5 align-text-bottom sm:align-text-top" />}
                  Top Strength {hasActivePlan && <span className="text-gray-300 ml-0.5 font-normal">•</span>}
                </span>
                {!hasActivePlan && <span className="text-gray-300 shrink-0 text-[15px] sm:text-[13px]">•</span>}
                <div
                  className={hasActivePlan ? "inline" : "flex-1 blur-sm select-none opacity-60"}
                >
                  <span className={`text-gray-500 ${!hasActivePlan ? 'text-[15px] sm:text-[13px] leading-snug' : ''}`}>
                    {!hasActivePlan
                      ? "React, UI/UX Design, JavaScript"
                      : aiInsights
                        ? aiInsights.matchedSkills?.length > 0
                          ? aiInsights.matchedSkills.join(", ")
                          : "General experience"
                        : "Generating..."}
                  </span>
                </div>
              </div>

              {/* Most Demanded Skill */}
              <div className={hasActivePlan ? "text-[15px] sm:text-[13px] leading-relaxed w-full" : "flex items-start gap-2 w-full"}>
                {!hasActivePlan && <HiOutlineBriefcase className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />}
                <span className={hasActivePlan ? "font-semibold text-gray-700 mr-1.5" : "font-semibold text-[15px] sm:text-[13px] text-gray-700 whitespace-nowrap shrink-0"}>
                  {hasActivePlan && <HiOutlineBriefcase className="inline-block w-4 h-4 text-pink-500 mr-1.5 align-text-bottom sm:align-text-top" />}
                  Most Demanded Skill {hasActivePlan && <span className="text-gray-300 ml-0.5 font-normal">•</span>}
                </span>
                {!hasActivePlan && <span className="text-gray-300 shrink-0 text-[15px] sm:text-[13px]">•</span>}
                <div
                  className={hasActivePlan ? "inline" : "flex-1 blur-sm select-none opacity-60"}
                >
                  <span className={`text-gray-500 ${!hasActivePlan ? 'text-[15px] sm:text-[13px] leading-snug' : ''}`}>
                    {!hasActivePlan
                      ? "Java / Spring Boot"
                      : aiInsights
                        ? aiInsights.most_demanded_skill || "Generating..."
                        : job.skill ||
                          (job.requirements && job.requirements.length > 0
                            ? job.requirements[0]
                            : "Not specified")}
                  </span>
                </div>
              </div>
              {/* Interview Probability */}
              <div className={hasActivePlan ? "text-[15px] sm:text-[13px] leading-relaxed w-full" : "flex items-start gap-2 w-full"}>
                {!hasActivePlan && <HiPhone className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />}
                <span className={hasActivePlan ? "font-semibold text-gray-700 mr-1.5" : "font-semibold text-[15px] sm:text-[13px] text-gray-700 whitespace-nowrap shrink-0"}>
                  {hasActivePlan && <HiPhone className="inline-block w-4 h-4 text-teal-500 mr-1.5 align-text-bottom sm:align-text-top" />}
                  Interview Probability {hasActivePlan && <span className="text-gray-300 ml-0.5 font-normal">•</span>}
                </span>
                {!hasActivePlan && <span className="text-gray-300 shrink-0 text-[15px] sm:text-[13px]">•</span>}
                <div
                  className={hasActivePlan ? "inline" : "flex-1 blur-sm select-none opacity-60"}
                >
                  <span className={`font-bold text-gray-900 ${!hasActivePlan ? 'text-[15px] sm:text-[13px] leading-snug' : ''}`}>
                    {!hasActivePlan
                      ? "Good Chance (78%)"
                      : aiInsights
                        ? `${aiInsights.interviewProbability >= 70 ? "Good Chance" : aiInsights.interviewProbability >= 40 ? "Fair Chance" : "Low Chance"} (${aiInsights.interviewProbability}%)`
                        : "Generating..."}
                  </span>
                </div>
              </div>

              {/* Missing Skills */}
              <div className={hasActivePlan ? "text-[15px] sm:text-[13px] leading-relaxed w-full" : "flex items-start gap-2 w-full"}>
                {!hasActivePlan && <HiExclamationCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
                <span className={hasActivePlan ? "font-semibold text-gray-700 mr-1.5" : "font-semibold text-[15px] sm:text-[13px] text-gray-700 whitespace-nowrap shrink-0"}>
                  {hasActivePlan && <HiExclamationCircle className="inline-block w-4 h-4 text-orange-500 mr-1.5 align-text-bottom sm:align-text-top" />}
                  Missing Skills {hasActivePlan && <span className="text-gray-300 ml-0.5 font-normal">•</span>}
                </span>
                {!hasActivePlan && <span className="text-gray-300 shrink-0 text-[15px] sm:text-[13px]">•</span>}
                <div
                  className={hasActivePlan ? "inline" : "flex-1 blur-sm select-none opacity-60"}
                >
                  <span className={`text-gray-500 ${!hasActivePlan ? 'text-[15px] sm:text-[13px] leading-snug' : ''}`}>
                    {!hasActivePlan
                      ? "Figma, Bootstrap, HTML5"
                      : aiInsights
                        ? aiInsights.missingSkills?.length > 0
                          ? aiInsights.missingSkills.join(", ")
                          : "None"
                        : "Generating..."}
                  </span>
                </div>
              </div>

              {/* Why you may get rejected */}
              <div className={hasActivePlan ? "text-[15px] sm:text-[13px] leading-relaxed w-full" : "flex items-start gap-2 w-full"}>
                {!hasActivePlan && <HiOutlineMail className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />}
                <span className={hasActivePlan ? "font-semibold text-gray-700 mr-1.5" : "font-semibold text-[15px] sm:text-[13px] text-gray-700 whitespace-nowrap shrink-0"}>
                  {hasActivePlan && <HiOutlineMail className="inline-block w-4 h-4 text-red-700 mr-1.5 align-text-bottom sm:align-text-top" />}
                  Why you may get rejected {hasActivePlan && <span className="text-gray-300 ml-0.5 font-normal">•</span>}
                </span>
                {!hasActivePlan && <span className="text-gray-300 shrink-0 text-[15px] sm:text-[13px]">•</span>}
                <div
                  className={hasActivePlan ? "inline" : "flex-1 blur-sm select-none opacity-60"}
                >
                  <span className={`text-gray-500 ${!hasActivePlan ? 'text-[15px] sm:text-[13px] leading-snug' : ''}`}>
                    {!hasActivePlan
                      ? "Portfolio lacks strong mobile UI/UX examples."
                      : aiInsights
                        ? aiInsights.hireBlocker || "No major blockers found."
                        : "Generating..."}
                  </span>
                </div>
              </div>

              {/* Salary Benchmark */}
              <div className={hasActivePlan ? "text-[15px] sm:text-[13px] leading-relaxed w-full" : "flex items-start gap-2 w-full"}>
                {!hasActivePlan && <HiCurrencyRupee className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                <span className={hasActivePlan ? "font-semibold text-gray-700 mr-1.5" : "font-semibold text-[15px] sm:text-[13px] text-gray-700 whitespace-nowrap shrink-0"}>
                  {hasActivePlan && <HiCurrencyRupee className="inline-block w-4 h-4 text-emerald-600 mr-1.5 align-text-bottom sm:align-text-top" />}
                  Salary Benchmark {hasActivePlan && <span className="text-gray-300 ml-0.5 font-normal">•</span>}
                </span>
                {!hasActivePlan && <span className="text-gray-300 shrink-0 text-[15px] sm:text-[13px]">•</span>}
                <div
                  className={hasActivePlan ? "inline" : "flex-1 blur-sm select-none opacity-60"}
                >
                  <span className={`text-gray-500 ${!hasActivePlan ? 'text-[15px] sm:text-[13px] leading-snug' : ''}`}>
                    {!hasActivePlan
                      ? "₹12L - ₹18L per annum"
                      : aiInsights
                        ? aiInsights.salaryInsight ||
                          budgetText ||
                          "Data not available"
                        : "Generating..."}
                  </span>
                </div>
              </div>

              {!hasActivePlan && (
                <button
                  onClick={() => navigate("/provider/plans")}
                  className="w-full mt-4 text-[15px] sm:text-[13px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  Unlock AI Insights <HiLockClosed className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── AI Insights for You (Sidebar) ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex flex-col mb-4 gap-2">
              <h2 className="font-extrabold text-[17px] sm:text-[15px] text-gray-900 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center">
                  <span className="text-orange-500 text-[12px] sm:text-[10px]">🎯</span>
                </div>
                AI Insights for You
              </h2>
              <div className="flex gap-2">
                {hasActivePlan ? (
                  <span className="text-[12px] sm:text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full flex items-center gap-1 w-fit">
                    <HiSparkles className="w-3 h-3" /> Premium
                  </span>
                ) : (
                  <span className="text-[12px] sm:text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full flex items-center gap-1 w-fit">
                    <HiLockClosed className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Why Great Match */}
              <div className="col-span-2 bg-[#f8fafc] rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                    <HiSparkles className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <p className="text-[13px] sm:text-[11px] font-bold text-gray-900">
                    Why this job is a great match
                  </p>
                </div>
                <p
                  className={`text-[13px] sm:text-[11px] text-gray-700 leading-relaxed font-medium line-clamp-3 sm:line-clamp-none ${!hasActivePlan ? "blur-md opacity-50 select-none" : ""}`}
                >
                  {hasActivePlan
                    ? aiInsights?.whyMatch?.[0] ||
                      "Your skills align with this role"
                    : "Your UI/UX skills, Figma experience and portfolio strongly match this role."}
                </p>
              </div>

              {/* Skills You Have */}
              <div className="bg-[#f8fafc] rounded-xl p-3 border border-gray-100">
                <p className="text-[12px] sm:text-[10px] font-bold text-gray-900 mb-2 line-clamp-1">
                  Skills you have
                </p>
                <ul
                  className={`space-y-1 ${!hasActivePlan ? "blur-md opacity-50 select-none" : ""}`}
                >
                  {(hasActivePlan
                    ? aiInsights?.matchedSkills || [
                        job.skill,
                        ...(job.requirements?.slice(0, 2) || []),
                      ]
                    : ["UI/UX Design", "Figma", "User Research"]
                  )
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s, i) => (
                      <li
                        key={i}
                        className="text-[12px] sm:text-[10px] font-medium text-gray-700 flex items-center gap-1"
                      >
                        <HiCheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{s}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {/* Skills to Improve */}
              <div className="bg-[#f8fafc] rounded-xl p-3 border border-gray-100">
                <p className="text-[12px] sm:text-[10px] font-bold text-gray-900 mb-2 line-clamp-1">
                  Skills to improve
                </p>
                <ul
                  className={`space-y-1 ${!hasActivePlan ? "blur-md opacity-50 select-none" : ""}`}
                >
                  {(hasActivePlan
                    ? aiInsights?.missingSkills || []
                    : ["Design Systems", "Prototyping"]
                  )
                    .slice(0, 2)
                    .map((s, i) => (
                      <li
                        key={i}
                        className="text-[12px] sm:text-[10px] font-medium text-gray-700 flex items-center gap-1"
                      >
                        <HiCheckCircle className="w-3 h-3 text-orange-400 shrink-0" />
                        <span className="truncate">{s}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {/* Interview Chance */}
              <div className="col-span-2 bg-[#f8fafc] rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[13px] sm:text-[11px] font-bold text-gray-900 mb-1">
                    Interview chance
                  </p>
                  <span
                    className={`text-[12px] sm:text-[10px] font-bold flex items-center gap-1 ${!hasActivePlan ? "blur-md opacity-50 select-none text-gray-700" : aiInsights?.interviewProbability >= 70 ? "text-emerald-600" : aiInsights?.interviewProbability >= 40 ? "text-orange-500" : "text-red-700"}`}
                  >
                    {hasActivePlan
                      ? aiInsights?.interviewProbability >= 70
                        ? "Good Chance"
                        : aiInsights?.interviewProbability >= 40
                          ? "Fair Chance"
                          : "Low Chance"
                      : "Good Chance"}
                    {!hasActivePlan && (
                      <HiLockClosed className="w-3 h-3 text-gray-400" />
                    )}
                  </span>
                </div>
                <div className="relative w-[46px] h-[46px]">
                  <svg
                    className="w-[46px] h-[46px] -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="4"
                      strokeDasharray={`${hasActivePlan ? aiInsights?.interviewProbability || 65 : 78} ${100 - (hasActivePlan ? aiInsights?.interviewProbability || 65 : 78)}`}
                      strokeLinecap="round"
                      className={!hasActivePlan ? "blur-md opacity-50" : ""}
                    />
                  </svg>
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-gray-900 tracking-tighter ${!hasActivePlan ? "blur-md opacity-50" : ""}`}
                  >
                    {hasActivePlan
                      ? `${aiInsights?.interviewProbability || 65}%`
                      : "78%"}
                  </span>
                </div>
              </div>

              {/* Salary Insight */}
              <div className="col-span-2 bg-[#f8fafc] rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 mb-0.5">
                    Salary insight
                  </p>
                  <p
                    className={`text-[13px] font-extrabold text-gray-900 ${!hasActivePlan ? "blur-md opacity-50 select-none" : ""}`}
                  >
                    {hasActivePlan
                      ? aiInsights?.salaryInsight ||
                        budgetText ||
                        "Salary not disclosed"
                      : aiInsights?.salaryInsight ||
                        budgetText ||
                        "₹14 – 18 LPA"}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <HiTrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>

            </div>
            
            <button
              onClick={() => {
                if (hasActivePlan) {
                  setShowFullReport(true);
                } else {
                  navigate("/provider/plans");
                }
              }}
              className="w-full mt-4 text-[12px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              View Full Report{" "}
              {!hasActivePlan && <HiLockClosed className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Share this job */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 mb-3">
              Share this job
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleShare("whatsapp")}
                className="w-9 h-9 flex items-center justify-center bg-green-50 hover:bg-green-100 border border-green-100 rounded-xl transition text-green-700"
              >
                <FaWhatsapp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleShare("linkedin")}
                className="w-9 h-9 flex items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition text-blue-600"
              >
                <FaLinkedin className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleShare("twitter")}
                className="w-9 h-9 flex items-center justify-center bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl transition text-sky-500"
              >
                <FaTwitter className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleShare("copy")}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-xl transition flex-1 justify-center"
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Job Safety Tips */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 mb-3">
              Job Safety Tips
            </h3>
            <ul className="space-y-1.5">
              {[
                "Verified company",
                "No registration fee",
                "No interview fee",
                "No payment required",
              ].map((tip, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs text-gray-700"
                >
                  <HiShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{" "}
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

    {/* ── Similar Jobs for You ── */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="font-extrabold text-[17px] sm:text-[15px] text-gray-900">
              Similar Jobs for You
            </h2>
            <Link
              to="/provider/jobs"
              className="text-[14px] sm:text-[12px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
            >
              View all <HiArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {similarJobs.length > 0
              ? similarJobs.map((sJob, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                    onClick={() => navigate(`/provider/job/${sJob._id}`)}
                  >
                    <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {sJob.companyLogo ? (
                          <img
                            src={sJob.companyLogo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-gray-700">
                            {sJob.companyName?.substring(0, 1) || "C"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-extrabold text-[15px] sm:text-[13px] text-gray-900 line-clamp-1 truncate">
                            {sJob.title}
                          </p>

                        </div>
                        <p className="text-[13px] sm:text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                          {sJob.companyName || "Company"}{" "}
                          <HiCheckCircle className="w-3 h-3 text-blue-500 shrink-0" />
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <p className="text-[13px] sm:text-[11px] text-gray-500 flex items-center gap-1.5 truncate">
                        <HiLocationMarker className="w-3.5 h-3.5 text-gray-400 shrink-0" />{" "}
                        {sJob.city || "Remote"}
                      </p>
                      <p className="text-[13px] sm:text-[11px] text-gray-500 flex items-center gap-1.5 truncate">
                        <HiCurrencyRupee className="w-3.5 h-3.5 text-gray-400 shrink-0" />{" "}
                        {sJob.budgetMax
                          ? `₹${sJob.budgetMin / 100000} - ${sJob.budgetMax / 100000} LPA`
                          : "Negotiable"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                      <span className="text-[13px] sm:text-[11px] font-bold text-emerald-600">
                        {sJob.matchScore || 80}% Match
                      </span>
                      <HiArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </div>
                ))
              : [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between h-[160px]"
                  >
                    <div className="animate-pulse flex gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="animate-pulse space-y-2 mt-4">
                      <div className="h-2 bg-gray-100 rounded w-2/3"></div>
                      <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {showFullReport && (
        <FullReportModal
          job={job}
          aiInsights={aiInsights}
          onClose={() => setShowFullReport(false)}
        />
      )}
    </div>
  </div>
  );
}
