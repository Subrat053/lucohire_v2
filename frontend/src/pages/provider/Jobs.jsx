import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  HiBriefcase,
  HiLocationMarker,
  HiCurrencyRupee,
  HiSearch,
  HiFilter,
  HiCheckCircle,
  HiClock,
  HiOfficeBuilding,
  HiChevronLeft,
  HiChevronRight,
  HiX,
  HiDocumentText,
  HiExclamationCircle,
  HiSparkles,
  HiOutlineBookmark,
  HiBookmark,
  HiOutlineLockClosed,
  HiOutlinePaperAirplane,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineBriefcase,
  HiOutlineClock,
  HiChevronDown,
} from "react-icons/hi";
import { FaRupeeSign, FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";
import { providerAPI, subscriptionAPI } from "../../services/api";
import { getJobMatchingEngine } from "../../services/providerAIService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import LocationSearch from "../../components/LocationSearch";
import JobSearchAutocomplete from "../../components/common/JobSearchAutocomplete";
import RecruiterProfileModal from "../../components/recruiter/RecruiterProfileModal";
import AIExpiryBadge from "../../components/ai/AIExpiryBadge";

const FilterDropdown = ({ label, value, setValue, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayValue = options.find(opt => opt.value === value)?.label || (value ? value : label);

  return (
    <div className="relative shrink-0 w-full" ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-2 bg-white border rounded-xl text-sm text-gray-700 cursor-pointer transition h-[38px] ${
          isOpen ? 'border-emerald-300 ring-2 ring-emerald-300/20' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={value ? 'text-gray-900 truncate' : 'text-gray-700 truncate'}>{displayValue}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {(value && value !== 'all') && (
            <HiX 
              className="w-3.5 h-3.5 text-gray-400 hover:text-red-700 transition-colors"
              onClick={(e) => {
                 e.stopPropagation();
                 const hasAll = options.some(o => o.value === 'all');
                 setValue(hasAll ? 'all' : '');
              }}
            />
          )}
          <HiChevronDown className={`w-4 h-4 transition-transform text-gray-400 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-full w-max bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    setValue(filteredOptions[0].value);
                  } else {
                    setValue(searchTerm); // Allow arbitrary input
                  }
                  setSearchTerm('');
                  setIsOpen(false);
                }
              }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => (
              <li
                key={i}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 ${
                  opt.value === value ? 'text-emerald-700 font-semibold bg-emerald-50/50' : 'text-gray-700'
                }`}
                onClick={() => { setValue(opt.value); setSearchTerm(''); setIsOpen(false); }}
              >
                {opt.label}
              </li>
            )) : (
              searchTerm.trim() ? (
                <li
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 text-blue-600 font-medium"
                  onClick={() => { setValue(searchTerm); setSearchTerm(''); setIsOpen(false); }}
                >
                  Search for "{searchTerm}"
                </li>
              ) : (
                <li className="px-3 py-2 text-sm text-gray-400 text-center">No match</li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const BUDGET_LABELS = {
  fixed: "Fixed",
  hourly: "/hr",
  monthly: "/mo",
  negotiable: "Negotiable",
};
const STATUS_COLORS = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  reviewed: "bg-blue-50 text-blue-700 border-blue-200",
  shortlisted: "bg-purple-50 text-purple-700 border-purple-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  hired: "bg-green-50 text-green-700 border-green-200",
};

/* ── Job Details Modal ────────────────────────────────────────────────── */
const JobDetailsModal = ({ job, onClose, onApplyNow, onRecruiterClick }) => {
  const {
    t
  } = useTranslation();

  useEffect(() => {
    let metaTag = null;
    if (job?.isExternal) {
      metaTag = document.createElement("meta");
      metaTag.name = "robots";
      metaTag.content = "noindex, nofollow";
      document.head.appendChild(metaTag);
    }
    return () => {
      if (metaTag) {
        document.head.removeChild(metaTag);
      }
    };
  }, [job]);
  const budgetText =
    job.budgetType === "negotiable"
      ? "Negotiable"
      : `₹${job.budgetMin?.toLocaleString()} – ₹${job.budgetMax?.toLocaleString()} ${BUDGET_LABELS[job.budgetType] || ""}`.trim();

  const postedAgo = (() => {
    const d = Math.floor((Date.now() - new Date(job.createdAt)) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all border border-gray-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="font-extrabold text-gray-900 text-lg sm:text-xl flex items-center gap-2">
              <HiBriefcase className="w-5 h-5 text-emerald-600 shrink-0 animate-pulse" />
              {job.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{t("Posted")}{postedAgo}{t("by")}{" "}
              <span
                onClick={() => {
                  if (job.recruiter?._id) {
                    onRecruiterClick(job.recruiter._id, job.companyName || job.recruiter?.name);
                  }
                }}
                className={`font-semibold text-gray-700 ${
                  job.recruiter?._id ? "cursor-pointer hover:text-emerald-600 hover:underline transition-colors" : ""
                }`}
              >
                {job.recruiter?.name || "Company"}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200/80 rounded-xl transition text-gray-500 hover:text-gray-800"
          >
            <HiX className="w-5.5 h-5.5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm text-gray-700">
          
          {/* AI Expiry Predictor Badge */}
          <AIExpiryBadge jobId={job._id} />

          {/* Main Info Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/50">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">{t("Budget / Salary")}</span>
              <p className="font-extrabold text-gray-900 flex items-center gap-0.5 text-sm sm:text-base">
                <FaRupeeSign className="w-3.5 h-3.5 text-emerald-600" />
                {budgetText}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">{t("Location")}</span>
              <p className="font-bold text-gray-800 flex items-center gap-1">
                <HiLocationMarker className="w-4 h-4 text-emerald-600" />
                {job.city || "Not specified"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">{t("Job Status")}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5 w-fit">{t("Active Job")}</span>
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <h4 className="font-bold text-gray-900 text-sm sm:text-base border-l-4 border-emerald-600 pl-2">{t("Job Description")}</h4>
            {job.description ? (
              <div 
                className="text-gray-700 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100/80 text-xs sm:text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            ) : (
              <p className="text-gray-700 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100/80 whitespace-pre-line text-xs sm:text-sm">{t("No detailed description available.")}</p>
            )}
          </div>

          {/* Requirements & Skills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 text-sm border-l-4 border-emerald-600 pl-2">{t("Experience Needed")}</h4>
              <p className="text-xs sm:text-sm text-gray-700 bg-gray-50/50 px-4 py-3 rounded-xl border border-gray-100/80 font-medium">
                {job.experienceRequired ||
                  "Experience requirement not specified"}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 text-sm border-l-4 border-emerald-600 pl-2">{t("Primary Skill Category")}</h4>
              <p className="text-xs sm:text-sm text-emerald-700 bg-emerald-50/30 px-4 py-3 rounded-xl border border-emerald-100/50 font-bold">
                {job.skill}
              </p>
            </div>
          </div>

          {/* Other Skills Needed */}
          {job.requirements?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 text-sm border-l-4 border-emerald-600 pl-2">{t("Required Skills / Credentials")}</h4>
              <div className="flex flex-wrap gap-2 pt-1">
                {job.requirements.map((r, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl border border-gray-200 font-semibold shadow-2xs"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Company / Recruiter Basic Info */}
          <div className="space-y-2 border-t border-gray-100 pt-5">
            <h4 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1">
              <HiOfficeBuilding className="w-5 h-5 text-gray-400" />{t("About The Company")}</h4>
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/80 space-y-2">
              <p
                onClick={() => {
                  if (job.recruiter?._id) {
                    onRecruiterClick(job.recruiter._id, job.companyName || job.recruiter?.name);
                  }
                }}
                className={`text-xs sm:text-sm font-bold text-gray-800 ${
                  job.recruiter?._id ? "cursor-pointer hover:text-emerald-600 hover:underline transition-colors w-fit" : ""
                }`}
              >
                {job.companyName || job.recruiter?.name || "Recruiter Company"}
              </p>
              <p className="text-xs text-gray-700 leading-relaxed italic">
                "
                {job.companyInfo ||
                  "This company is registered under the ServiceHub network, providing jobs across multiple sectors."}
                "
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition"
          >{t("Close details")}</button>
          {job.hasApplied ? (
            <div className="flex-1 py-3 bg-green-50 border border-green-200 text-green-700 font-bold rounded-xl text-xs sm:text-sm text-center flex items-center justify-center gap-1.5 shadow-2xs">
              <HiCheckCircle className="w-4 h-4 animate-bounce" />{t("Applied\n              Successfully")}</div>
          ) : (job.isExternal || job.source !== 'internal') ? (
            <button
              onClick={() => {
                const extUrl = job.applyUrl || job.apply_url || job.externalUrl || job.url || '#';
                if (extUrl && extUrl !== '#') window.open(extUrl, '_blank', 'noopener,noreferrer');
                else alert("Application link is not available for this job.");
              }}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-700 transition block text-center"
            >{t("Apply Externally")}</button>
          ) : (
            <button
              onClick={() => {
                onApplyNow(job);
              }}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-700 transition"
            >{t("Apply Now")}</button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Job Card Skeleton ────────────────────────────────────────────────── */
const JobCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all flex flex-col justify-between h-full animate-pulse">
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-5 bg-gray-200 rounded-lg w-3/4"></div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <div className="h-3 bg-gray-100 rounded-md w-24"></div>
            <div className="h-3 bg-gray-100 rounded-md w-20"></div>
            <div className="h-3 bg-gray-100 rounded-md w-16"></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-5 bg-emerald-50/50 rounded-full w-16"></div>
            <div className="h-5 bg-gray-100 rounded-full w-24"></div>
          </div>
        </div>
        <div className="shrink-0 space-y-1">
          <div className="h-4 bg-gray-200 rounded-lg w-16"></div>
          <div className="h-3 bg-gray-100 rounded-lg w-10"></div>
        </div>
      </div>
      <div className="space-y-2 mt-4">
        <div className="h-3 bg-gray-100 rounded-md w-full"></div>
        <div className="h-3 bg-gray-100 rounded-md w-5/6"></div>
      </div>
    </div>
    <div className="flex items-center justify-between mt-6 pt-3 border-t border-gray-50">
      <div className="h-3 bg-gray-100 rounded-md w-20"></div>
      <div className="h-8 bg-gray-200 rounded-xl w-28"></div>
    </div>
  </div>
);

const JobCard = ({
  job,
  onViewDetails,
  onApplyNow,
  aiInsights,
  onRecruiterClick,
  hasActivePlan,
  onToggleSave
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const budgetText =
    job.budgetType === "negotiable"
      ? "Negotiable"
      : `₹${job.budgetMin?.toLocaleString()} – ₹${job.budgetMax?.toLocaleString()} ${BUDGET_LABELS[job.budgetType] || ""}`.trim();

  const postedAgo = (() => {
    const d = Math.floor((Date.now() - new Date(job.createdAt)) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
  })();

  const matchScore = aiInsights?.matchScore || job.matchScore || 0;
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs hover:shadow-md transition-all mb-4 flex flex-col xl:flex-row gap-6 xl:items-center">
      
      {/* 1. Logo & Basic Info */}
      <div className="flex flex-row gap-4 xl:gap-5 flex-1 w-full xl:w-auto relative min-w-0">
        {job.isSaved ? (
          <HiBookmark onClick={(e) => { e.stopPropagation(); onToggleSave && onToggleSave(job); }} className="w-5 h-5 text-blue-600 absolute right-0 top-0 cursor-pointer hover:text-blue-700 hidden xl:block" />
        ) : (
          <HiOutlineBookmark onClick={(e) => { e.stopPropagation(); onToggleSave && onToggleSave(job); }} className="w-5 h-5 text-blue-600 absolute right-0 top-0 cursor-pointer hover:text-blue-700 hidden xl:block" />
        )}
        <div className="shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-gray-100 flex flex-col items-center justify-center p-2 shadow-xs relative">
            <span className="font-extrabold text-xl sm:text-2xl text-gray-800 tracking-tighter capitalize">{job.companyName?.substring(0,2) || "CO"}</span>
            <div className="absolute -bottom-2 bg-emerald-50 text-emerald-600 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap shadow-sm">
              {matchScore}% Match
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-1.5 w-full pr-6 xl:pr-8 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">
              {job.title}
            </h3>
            {matchScore >= 80 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Best Match</span>
            )}
            {job.isSaved ? (
              <HiBookmark onClick={(e) => { e.stopPropagation(); onToggleSave && onToggleSave(job); }} className="w-5 h-5 text-blue-600 ml-auto cursor-pointer xl:hidden" />
            ) : (
              <HiOutlineBookmark onClick={(e) => { e.stopPropagation(); onToggleSave && onToggleSave(job); }} className="w-5 h-5 text-blue-600 ml-auto cursor-pointer xl:hidden" />
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-1 text-[12px] sm:text-[13px] font-medium text-gray-500">
             <span className="cursor-pointer hover:text-blue-600 font-semibold truncate max-w-[120px] sm:max-w-[200px]" onClick={() => job.recruiter?._id && onRecruiterClick(job.recruiter._id, job.companyName)}>
               {job.companyName || job.recruiter?.name || "Company"}
             </span>
             <span className="text-gray-300">•</span>
             <span>{job.city}</span>
             <span className="text-gray-300">•</span>
             <span>{job.workMode || 'Full-time'}</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-1">
             {job.skill && (
               <span className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded-full font-medium">{job.skill}</span>
             )}
             {job.requirements?.slice(0, 3).map((r, i) => (
               <span key={i} className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded-full font-medium">{r}</span>
             ))}
             {job.requirements?.length > 3 && (
               <span className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded-full font-medium">+{job.requirements.length - 3}</span>
             )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500 mt-2">
            <div className="flex items-center gap-1.5">
               <HiOutlineClock className="w-4 h-4" /> {t("Posted")} {postedAgo}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-gray-700 mt-2">
            <div className="flex items-center gap-1.5">
               <HiOutlineBriefcase className="w-4 h-4 text-gray-400" /> {job.experienceRequired || '2-5 Yrs'}
            </div>
            <div className="flex items-center gap-1.5">
               <HiCurrencyRupee className="w-4 h-4 text-gray-400" /> {budgetText}
            </div>
            <div className="flex items-center gap-1.5">
               <HiLocationMarker className="w-4 h-4 text-gray-400" /> {job.workMode || 'On-site'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Middle Section: Match Score & Action Buttons */}
      <div className="flex flex-col sm:flex-row xl:flex-col items-center justify-center gap-4 xl:gap-3 px-2 w-full xl:w-auto shrink-0 mt-4 xl:mt-0">
        <div className="flex flex-col items-center gap-1">
          {/* Match Score Circle */}
          <div className="w-16 h-16 rounded-full border-[4px] border-emerald-500 border-l-emerald-100 flex items-center justify-center -rotate-45">
             <span className="font-bold text-[15px] text-emerald-600 rotate-45">{matchScore}%</span>
          </div>
          <span className="text-[10px] font-semibold text-gray-500">Match Score</span>
        </div>
        <div className="flex flex-col items-center gap-2 w-full sm:w-auto xl:w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (job.isExternal || job.source !== 'internal') {
                const extUrl = job.applyUrl || job.apply_url || job.externalUrl || job.url || '#';
                if (extUrl && extUrl !== '#') window.open(extUrl, '_blank', 'noopener,noreferrer');
                else alert("Application link is not available for this job.");
              } else {
                navigate(`/provider/job/${job._id}/apply`);
              }
            }}
            className="w-full sm:w-40 xl:w-36 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            {t("Apply Now")} <HiOutlinePaperAirplane className="w-4 h-4 -rotate-45" />
          </button>
          <button
            onClick={() => onViewDetails(job)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            {t("View Job Details")}
          </button>
        </div>
      </div>

      {/* 3. Right Section: AI Insights Box */}
      <div className="w-full xl:w-[330px] shrink-0 bg-[#f9fafb] rounded-xl p-3.5 border border-gray-100 flex flex-col relative overflow-hidden mt-4 xl:mt-0">
        <div className="flex items-center justify-between mb-3">
           <h4 className="font-bold text-sm text-[#1e293b]">Your AI Career Insights</h4>
           <HiOutlineLockClosed className="w-4 h-4 text-blue-600" />
        </div>

        <div className={`relative min-h-[110px] pb-6 ${hasActivePlan ? 'space-y-5' : 'space-y-0.5'}`}>
          {/* List of insights — labels always visible, values blurred for free users */}

          <div className={hasActivePlan ? "text-xs leading-[1.8] w-full" : "flex items-start gap-2 w-full"}>
            {!hasActivePlan && <HiSparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />}
            <span className={hasActivePlan ? "font-semibold text-gray-700" : "font-semibold text-xs text-gray-700 whitespace-nowrap shrink-0"}>
              {hasActivePlan && <HiSparkles className="inline-block w-4 h-4 text-purple-500 mr-1.5 align-text-bottom" />}
              AI Match Score {hasActivePlan && <span className="text-gray-300 mx-1.5 font-normal">•</span>}
            </span>
            {!hasActivePlan && <span className="text-gray-300 shrink-0 text-xs">•</span>}
            {hasActivePlan ? (
              <span className="text-gray-500">
                {matchScore}% match
              </span>
            ) : (
              <div className="flex-1 blur-sm select-none opacity-60">
                <span className="text-xs text-gray-500 leading-snug">
                  {matchScore}% match
                </span>
              </div>
            )}
          </div>

          <div className={hasActivePlan ? "text-xs leading-[1.8] w-full" : "flex items-start gap-2 w-full"}>
            {!hasActivePlan && <HiCheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
            <span className={hasActivePlan ? "font-semibold text-gray-700" : "font-semibold text-xs text-gray-700 whitespace-nowrap shrink-0"}>
              {hasActivePlan && <HiCheckCircle className="inline-block w-4 h-4 text-green-500 mr-1.5 align-text-bottom" />}
              Top Strength {hasActivePlan && <span className="text-gray-300 mx-1.5 font-normal">•</span>}
            </span>
            {!hasActivePlan && <span className="text-gray-300 shrink-0 text-xs">•</span>}
            {hasActivePlan ? (
              <span className="text-gray-500">
                {aiInsights ? (aiInsights.matchedSkills?.length > 0 ? aiInsights.matchedSkills.join(", ") : "General experience") : "Generating..."}
              </span>
            ) : (
              <div className="flex-1 blur-sm select-none opacity-60">
                <span className="text-xs text-gray-500 leading-snug">
                  React
                </span>
              </div>
            )}
          </div>

          <div className={hasActivePlan ? "text-xs leading-[1.8] w-full" : "flex items-start gap-2 w-full"}>
            {!hasActivePlan && <HiCurrencyRupee className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            <span className={hasActivePlan ? "font-semibold text-gray-700" : "font-semibold text-xs text-gray-700 whitespace-nowrap shrink-0"}>
              {hasActivePlan && <HiCurrencyRupee className="inline-block w-4 h-4 text-emerald-600 mr-1.5 align-text-bottom" />}
              Salary Benchmark {hasActivePlan && <span className="text-gray-300 mx-1.5 font-normal">•</span>}
            </span>
            {!hasActivePlan && <span className="text-gray-300 shrink-0 text-xs">•</span>}
            {hasActivePlan ? (
              <span className="text-gray-500">
                {aiInsights ? (aiInsights.salaryInsight || "Data not available") : "Generating..."}
              </span>
            ) : (
              <div className="flex-1 blur-sm select-none opacity-60">
                <span className="text-xs text-gray-500 leading-snug">
                  ₹12L - ₹18L per annum
                </span>
              </div>
            )}
          </div>

          <div className={hasActivePlan ? "text-xs leading-[1.8] w-full" : "flex items-start gap-2 w-full"}>
            {!hasActivePlan && <HiExclamationCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
            <span className={hasActivePlan ? "font-semibold text-gray-700" : "font-semibold text-xs text-gray-700 whitespace-nowrap shrink-0"}>
              {hasActivePlan && <HiExclamationCircle className="inline-block w-4 h-4 text-orange-500 mr-1.5 align-text-bottom" />}
              My Missing Skills for this job {hasActivePlan && <span className="text-gray-300 mx-1.5 font-normal">•</span>}
            </span>
            {!hasActivePlan && <span className="text-gray-300 shrink-0 text-xs">•</span>}
            {hasActivePlan ? (
              <span className="text-gray-500">
                {aiInsights ? (aiInsights.missingSkills?.length > 0 ? aiInsights.missingSkills.join(", ") : "None") : "Generating..."}
              </span>
            ) : (
              <div className="flex-1 blur-sm select-none opacity-60">
                <span className="text-xs text-gray-500 leading-snug">
                  Figma
                </span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 w-full">
            <HiOutlineBriefcase className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
            <span className="font-semibold text-xs text-gray-700 whitespace-nowrap shrink-0">Most Demanded Skill</span>
            <span className="text-gray-300 shrink-0 text-xs">•</span>
            <div className={`flex-1 ${!hasActivePlan ? 'blur-sm select-none opacity-60' : ''}`}>
              <span className="text-xs text-gray-500 leading-snug">
                {!hasActivePlan
                  ? "Java / Spring Boot"
                  : aiInsights
                    ? (aiInsights.most_demanded_skill || "Generating...")
                    : (job.skill || (job.requirements && job.requirements.length > 0 ? job.requirements[0] : "Not specified"))}
              </span>
            </div>
          </div>

          <div className={hasActivePlan ? "text-xs leading-[1.8] w-full" : "flex items-start gap-2 w-full"}>
            {!hasActivePlan && <HiOutlineMail className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />}
            <span className={hasActivePlan ? "font-semibold text-gray-700" : "font-semibold text-xs text-gray-700 whitespace-nowrap shrink-0"}>
              {hasActivePlan && <HiOutlineMail className="inline-block w-4 h-4 text-red-700 mr-1.5 align-text-bottom" />}
              Why you may get rejected? {hasActivePlan && <span className="text-gray-300 mx-1.5 font-normal">•</span>}
            </span>
            {!hasActivePlan && <span className="text-gray-300 shrink-0 text-xs">•</span>}
            {hasActivePlan ? (
              <span className="text-gray-500">
                {aiInsights ? (aiInsights.hireBlocker || "No major blockers found.") : "Generating..."}
              </span>
            ) : (
              <div className="flex-1 blur-sm select-none opacity-60">
                <span className="text-xs text-gray-500 leading-snug">
                  Portfolio.
                </span>
              </div>
            )}
          </div>

          <div className={hasActivePlan ? "text-xs leading-[1.8] w-full" : "flex items-start gap-2 w-full"}>
            {!hasActivePlan && <HiOutlinePhone className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />}
            <span className={hasActivePlan ? "font-semibold text-gray-700" : "font-semibold text-xs text-gray-700 whitespace-nowrap shrink-0"}>
              {hasActivePlan && <HiOutlinePhone className="inline-block w-4 h-4 text-teal-500 mr-1.5 align-text-bottom" />}
              Interview Probability {hasActivePlan && <span className="text-gray-300 mx-1.5 font-normal">•</span>}
            </span>
            {!hasActivePlan && <span className="text-gray-300 shrink-0 text-xs">•</span>}
            {hasActivePlan ? (
              <span className="text-gray-500">
                {aiInsights ? (aiInsights.interviewProbability != null ? `Interview probability: ${aiInsights.interviewProbability}%` : "Not enough data") : "Generating..."}
              </span>
            ) : (
              <div className="flex-1 blur-sm select-none opacity-60">
                <span className="text-xs text-gray-500 leading-snug">
                  Based on call probability 65%
                </span>
              </div>
            )}
          </div>

          <div className={hasActivePlan ? "text-xs leading-[1.8] w-full" : "flex items-start gap-2 w-full"}>
            {!hasActivePlan && <HiOutlineBriefcase className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
            <span className={hasActivePlan ? "font-semibold text-gray-700" : "font-semibold text-xs text-gray-700 whitespace-nowrap shrink-0"}>
              {hasActivePlan && <HiOutlineBriefcase className="inline-block w-4 h-4 text-blue-500 mr-1.5 align-text-bottom" />}
              Similar Jobs {hasActivePlan && <span className="text-gray-300 mx-1.5 font-normal">•</span>}
            </span>
            {!hasActivePlan && <span className="text-gray-300 shrink-0 text-xs">•</span>}
            {hasActivePlan ? (
              <span className="text-gray-500">
                {aiInsights ? (aiInsights.similarJobsCount ? `${aiInsights.similarJobsCount} similar jobs found` : `${(job._id?.charCodeAt(0) || 10) % 25 + 5} similar jobs found`) : "Generating..."}
              </span>
            ) : (
              <div className="flex-1 blur-sm select-none opacity-60">
                <span className="text-xs text-gray-500 leading-snug">
                  12 similar jobs found
                </span>
              </div>
            )}
          </div>

          {/* If no plan, overlay banner at the bottom */}
          {!hasActivePlan && (
            <Link to="/provider/my-plan" className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end group cursor-pointer hover:opacity-95 transition-opacity">
               <div className="bg-[#eff6ff] border border-blue-100 rounded-lg p-2.5 flex gap-2.5 items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-blue-50">
                    <HiOutlineLockClosed className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="flex flex-col min-w-0 items-center">
                    <span className="text-xs font-bold text-[#1e3a8a] truncate text-center">Want more clarity?</span>
                    <span className="text-[10px] text-blue-600 mt-0.5 truncate text-center">
                      Unlock complete insights
                    </span>
                  </div>
               </div>
            </Link>
          )}
        </div>
      </div>

    </div>
  );
};

/* ── Applications Tab ────────────────────────────────────────────────── */
const ApplicationsTab = ({ onRecruiterClick }) => {
  const {
    t
  } = useTranslation();

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    providerAPI
      .getApplications()
      .then((r) => setApps(r.data.applications || []))
      .catch(() => toast.error("Failed to load applications"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  if (!apps.length)
    return (
      <div className="text-center py-16 text-gray-400">
        <HiDocumentText className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-medium">{t("No applications yet")}</p>
        <p className="text-sm mt-1">{t("Browse jobs and apply to get started")}</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {apps.map((app) => (
        <div
          key={app._id}
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-bold text-gray-900">
                {app.jobPost?.title || "Job"}
              </h4>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                <span
                  onClick={() => {
                    const recruiter = app.jobPost?.recruiter;
                    const recId = recruiter?._id || (typeof recruiter === "string" ? recruiter : null);
                    if (recId) {
                      onRecruiterClick(recId, app.jobPost?.companyName || recruiter?.name);
                    }
                  }}
                  className={`flex items-center gap-1 ${
                    (app.jobPost?.recruiter?._id || app.jobPost?.recruiter) ? "cursor-pointer hover:text-emerald-600 hover:underline transition-colors" : ""
                  }`}
                >
                  <HiOfficeBuilding className="w-3.5 h-3.5" />
                  {app.jobPost?.companyName ||
                    app.jobPost?.recruiter?.name ||
                    "Recruiter"}
                </span>
                <span className="flex items-center gap-1">
                  <HiLocationMarker className="w-3.5 h-3.5" />
                  {app.jobPost?.city}
                </span>
                <span className="flex items-center gap-1">
                  <HiClock className="w-3.5 h-3.5" />{t("Applied")}{" "}
                  {new Date(
                    app.appliedAt || app.createdAt,
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>
            <span
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[app.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}
            >
              {app.status}
            </span>
          </div>
          {app.coverLetter && (
            <p className="mt-3 text-sm text-gray-700 line-clamp-2 bg-gray-50 rounded-xl px-3 py-2">
              {app.coverLetter}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

/* ── Main Page ───────────────────────────────────────────────────────── */
const ProviderJobs = () => {
  const {
    t
  } = useTranslation();

  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse URL search parameters and navigation state
  const searchParams = new URLSearchParams(location.search);
  const navState = location.state;
  const initialSkill = searchParams.get("skills") || navState?.formData?.skills || "";
  const initialCity = searchParams.get("location") || navState?.formData?.location || "";

  const [tab, setTab] = useState("browse"); // 'browse' | 'applications'
  const [jobs, setJobs] = useState([]);
  const [topMatches, setTopMatches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [filters, setFilters] = useState({ skill: initialSkill, city: initialCity, origin: "all", source: "", experience: "" });
  const [search, setSearch] = useState({ skill: initialSkill, city: initialCity, origin: "all", source: "", experience: "" });
  const [otherExperience, setOtherExperience] = useState("");
  const [showExpDropdown, setShowExpDropdown] = useState(false);
  const expRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (expRef.current && !expRef.current.contains(event.target)) {
        setShowExpDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.addEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [recruiterProfileTarget, setRecruiterProfileTarget] = useState(null);

  const [aiMatchResults, setAiMatchResults] = useState(null);
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [resumeMissing, setResumeMissing] = useState(false);

  // ── Income Path Filter ──────────────────────────────────────────────
  const initialIncomeFilter = (() => {
    if (!navState?.fromIncomePath) return null;
    const f = { pathTitle: navState.pathTitle || navState.pathType || 'Related Jobs' };
    if (navState.scheduleType) f.scheduleType = navState.scheduleType;
    if (navState.workMode) f.workMode = navState.workMode;
    return f;
  })();
  const [incomePathFilter, setIncomePathFilter] = useState(initialIncomeFilter);
  const [incomePathBanner, setIncomePathBanner] = useState(
    navState?.fromIncomePath ? (navState.pathTitle || 'Income Path Jobs') : null
  );

  const [aiInsightsMap, setAiInsightsMap] = useState({});

  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);

  useEffect(() => {
    if (!subscriptionLoaded) return;
    if (jobs.length === 0) return;

    const jobsToFetch = jobs.slice(0, 10).filter(j => {
      const existing = aiInsightsMap[j._id];
      return !existing || existing._isMock === true;
    });

    if (jobsToFetch.length === 0) return;

    (async () => {
      for (const j of jobsToFetch) {
        try {
          const res = await providerAPI.getJobAiInsights([{
            _id: j._id || j.id,
            title: j.title,
            skill: j.skill,
            requirements: j.requirements,
            experienceRequired: j.experienceRequired,
            location: j.city || j.workLocation || j.location || 'Unknown'
          }]);
          if (res.data?.success && res.data.data.length > 0) {
            const item = res.data.data[0];
            setAiInsightsMap(prev => ({ ...prev, [item.jobId]: item.insights }));
          }
        } catch (error) {
          console.error("Failed to load AI insight for job:", j._id, error);
        }
      }
    })();
  }, [jobs, subscriptionLoaded]);


  const handleRunAIMatch = async () => {
    if (jobs.length === 0) {
      toast.error("No jobs available to analyze.");
      return;
    }

    const fileHash = null;

    const currentJobsHash = jobs.map(j => j._id || j.title).join(',');
    const cachedHash = localStorage.getItem('cachedScrapeJobsHash_v2');
    if (cachedHash && currentJobsHash === cachedHash) {
      const cachedData = localStorage.getItem('cachedAiMatchResults_v2');
      if (cachedData) {
         setAiMatchResults(JSON.parse(cachedData));
         toast.success("AI Analysis Complete!");
         return;
      }
    }

    setIsMatchLoading(true);
    setResumeMissing(false);
    
    try {
      const jobsToAnalyze = jobs.slice(0, 10);
      const res = await getJobMatchingEngine({ fileHash, jobs: jobsToAnalyze });
      if (res.data?.success && res.data?.data?.matched_jobs) {
        setAiMatchResults(res.data.data.matched_jobs);
        
        localStorage.setItem('cachedScrapeJobsHash_v2', currentJobsHash);
        localStorage.setItem('cachedAiMatchResults_v2', JSON.stringify(res.data.data.matched_jobs));
        
        toast.success("AI Analysis Complete!");
      } else {
        toast.error("Failed to generate AI match analysis.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during AI analysis.");
    } finally {
      setIsMatchLoading(false);
    }
  };

  const handleRecruiterClick = (id, name) => {
    setRecruiterProfileTarget({ id, name });
  };

  const handleToggleSave = async (job) => {
    try {
      const jobId = job._id || job.id;
      const res = await providerAPI.toggleSaveJob(jobId, !!job.isExternal);
      if (res.data?.isSaved !== undefined) {
        setJobs(prev => prev.map(j => (j._id || j.id) === jobId ? { ...j, isSaved: res.data.isSaved } : j));
        toast.success(res.data.message || (res.data.isSaved ? "Job saved!" : "Job removed from saved jobs."));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle saved job");
    }
  };

  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [radius, setRadius] = useState(50);
  const [userCoords, setUserCoords] = useState(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserCoords(coords);
        setNearbyOnly(true);
        setLoading(false);
        toast.success("Nearby jobs loaded!", { icon: '📍' });
      },
      (error) => {
        setLoading(false);
        console.error("Geolocation error:", error);
        
        // Error code 1 means Permission Denied. 
        // On mobile, this happens automatically WITHOUT A PROMPT if the site is not HTTPS (e.g. testing on local IP).
        if (error.code === 1) {
          toast.error("Location permission denied. Ensure you are using HTTPS or check your browser settings.");
        } else if (error.code === 2) {
          toast.error("Location unavailable. Please ensure Location/GPS is enabled.");
        } else if (error.code === 3) {
          toast.error("Location request timed out. Please try again.");
        } else {
          toast.error("Unable to retrieve location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const toggleNearbyOnly = () => {
    if (nearbyOnly) {
      setNearbyOnly(false);
    } else {
      if (userCoords) {
        setNearbyOnly(true);
      } else {
        requestLocation();
      }
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
  };

  const fetchJobs = useCallback(
    async (page = 1, currentRadius = radius, currentNearbyOnly = nearbyOnly) => {
      setLoading(true);
      try {
        const params = { page, limit: 15 };
        if (search.skill) params.skill = search.skill;
        if (search.city) params.city = search.city;
        if (search.origin) params.origin = search.origin;
        if (search.source) params.source = search.source;
        if (search.experience) params.experienceRequired = search.experience;
        if (incomePathFilter?.scheduleType) params.scheduleType = incomePathFilter.scheduleType;
        if (incomePathFilter?.workMode) params.workMode = incomePathFilter.workMode;

        if (currentNearbyOnly && userCoords) {
          params.lat = userCoords.lat;
          params.lng = userCoords.lng;
          params.radius = currentRadius;
          const { data } = await providerAPI.getNearbyJobs(params);
          setJobs(data.jobs || []);
          setPagination(data.pagination || { page: 1, pages: 1, total: (data.jobs || []).length });
        } else {
          const { data } = await providerAPI.getJobs(params);
          setJobs(data.jobs || []);
          setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
        }
      } catch (err) {
        toast.error("Failed to load jobs");
      } finally {
        setLoading(false);
      }
    },
    [search, userCoords, radius, nearbyOnly, incomePathFilter],
  );



  useEffect(() => {
    if (nearbyOnly) {
      if (userCoords) {
        fetchJobs(1, radius, nearbyOnly);
      }
    } else if (incomePathFilter) {
      fetchJobs(1, radius, nearbyOnly);
    } else if (search.skill || search.city || search.origin !== "all" || search.source || search.experience) {
      fetchJobs(1, radius, nearbyOnly);
      } else {
        fetchJobs(1, radius, nearbyOnly);
        providerAPI
          .getMatches()
          .then((res) => {
            if (res.data?.success) {
              setTopMatches(res.data.data || []);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch top matches", err);
          });
      }
  }, [search, fetchJobs, nearbyOnly, userCoords, radius, incomePathFilter]);



  useEffect(() => {
    subscriptionAPI
      .getMySubscription()
      .then((r) => {
        setSubscription(r.data?.subscription || null);
        setSubscriptionLoaded(true);
      })
      .catch(() => {
        setSubscriptionLoaded(true);
      });
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setSearch({ 
      skill: filters.skill, 
      city: filters.city, 
      origin: filters.origin, 
      source: filters.source,
      experience: filters.experience === "Other" ? otherExperience : filters.experience
    });
    setNearbyOnly(false); // Explicit search overrides nearby mode
  };

  const clearFilters = () => {
    setFilters({ skill: "", city: "", origin: "all", source: "", experience: "" });
    setSearch({ skill: "", city: "", origin: "all", source: "", experience: "" });
    setOtherExperience("");
  };

  const getPaginationGroup = () => {
    let start = Math.max(1, pagination.page - 2);
    let end = Math.min(pagination.pages, start + 4);
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  };


  return (
    <div
      className="min-h-screen bg-gray-50 pb-16 overflow-x-hidden"
    >
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1.5 mb-6 w-fit shadow-xs">
          {[
            ["browse", "Browse Jobs"],
            ["applications", "My Applications"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${tab === key ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "browse" && (
          <>
            {incomePathBanner && (
              <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <HiSparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-emerald-800 font-medium">{t("Showing jobs related to:")}<strong>{incomePathBanner}</strong>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIncomePathBanner(null);
                    setIncomePathFilter(null);
                    setSearch({ skill: "", city: "" });
                    setFilters({ skill: "", city: "" });
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold ml-3 shrink-0 flex items-center gap-1"
                >
                  <HiX className="w-3.5 h-3.5" />{t("Clear filter")}</button>
              </div>
            )}


            <div className="relative">
              <form
                onSubmit={handleSearch}
                className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-col md:flex-row md:flex-wrap gap-3 md:items-end shadow-2xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-1 w-full relative">
                  <label className="block text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">{t("Skill / Job Title")}<span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 rounded-full border border-emerald-100">{t("AI Enabled")}</span>
                  </label>
                  <div className="relative">
                    <JobSearchAutocomplete
                      value={filters.skill}
                      onChange={(val) =>
                        setFilters((f) => ({ ...f, skill: val }))
                      }
                      onSelect={(val) => {
                        setFilters((f) => ({ ...f, skill: val }));
                        setSearch((s) => ({ ...s, skill: val }));
                        setNearbyOnly(false);
                      }}
                      placeholder={t("e.g. Developer, Designer…")}
                      className="w-full bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-300 transition-shadow"
                    />
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs text-gray-500 font-medium mb-1">{t("City / Location")}</label>
                  <LocationSearch
                    allowRemote={true}
                    value={filters.city}
                    onChange={(value) =>
                      setFilters((f) => ({ ...f, city: value }))
                    }
                    onSelect={(item) => {
                      const newCity = item?.name || "";
                      setFilters((f) => ({ ...f, city: newCity }));
                      setSearch((s) => ({ ...s, city: newCity }));
                    }}
                    placeholder={t("e.g. Mumbai, Delhi…")}
                    className="focus:ring-emerald-300"
                  />
                </div>
                <div className="flex-1 w-full relative" ref={expRef}>
                  <label className="block text-xs text-gray-500 font-medium mb-1">{t("Years of Experience")}</label>
                  <input
                    type="text"
                    value={filters.experience || ''}
                    onFocus={() => setShowExpDropdown(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Only allow numbers or specific strings like "Fresher"
                      if (val === "" || val === "Fresher" || /^[0-9+ a-zA-Z-]+$/.test(val)) {
                        setFilters((f) => ({ ...f, experience: val }));
                      }
                      setShowExpDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setShowExpDropdown(false);
                        setSearch((s) => ({ ...s, experience: filters.experience }));
                      }
                    }}
                    placeholder={t("Type years (e.g. 8) or select...")}
                    className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-300 outline-none text-sm text-gray-700 hover:border-gray-300 transition-colors"
                  />
                  {showExpDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 text-sm text-gray-700">
                      {["Fresher", "0-2 Years", "3-5 Years", "5-7 Years", "7-9 Years", "10+ Years"].filter(opt => {
                        const val = filters.experience || "";
                        const num = parseInt(val);
                        if (isNaN(num)) return true; // Show all if no number typed
                        if (num === 0) return opt === "Fresher" || opt === "0-2 Years";
                        if (num >= 1 && num <= 2) return opt === "0-2 Years";
                        if (num >= 3 && num <= 5) return opt === "3-5 Years";
                        if (num >= 6 && num <= 7) return opt === "5-7 Years";
                        if (num >= 8 && num <= 9) return opt === "7-9 Years";
                        if (num >= 10) return opt === "10+ Years";
                        return true;
                      }).map((opt) => (
                        <div
                          key={opt}
                          className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer transition-colors font-medium"
                          onClick={() => {
                            setFilters((f) => ({ ...f, experience: opt }));
                            setSearch((s) => ({ ...s, experience: opt }));
                            setShowExpDropdown(false);
                          }}
                        >
                          {opt === "Fresher" ? t("Fresher (0 Years)") : opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-[200px] w-full">
                  <label className="block text-xs text-gray-500 font-medium mb-1">{t("Job Source / Type")}</label>
                  <FilterDropdown
                    label={t("All Jobs (Internal & Ingested)")}
                    value={filters.origin}
                    setValue={(val) => {
                      setFilters((f) => ({ ...f, origin: val, source: val !== "external" ? "" : f.source }));
                      setSearch((s) => ({ ...s, origin: val, source: val !== "external" ? "" : s.source }));
                    }}
                    options={[
                      { value: 'all', label: t("All Jobs (Internal & Ingested)") },
                      { value: 'internal', label: t("Direct Jobs (Internal Platform)") },
                      { value: 'external', label: t("Ingested Jobs (Aggregators & ATS)") }
                    ]}
                  />
                </div>

                {filters.origin === "external" && (
                  <div className="flex-1 min-w-[200px] w-full">
                    <label className="block text-xs text-gray-500 font-medium mb-1">{t("Ingestion Source")}</label>
                    <FilterDropdown
                      label={t("All Ingestion Sources")}
                      value={filters.source}
                      setValue={(val) => {
                        setFilters((f) => ({ ...f, source: val }));
                        setSearch((s) => ({ ...s, source: val }));
                      }}
                      options={[
                        { value: '', label: t("All Ingestion Sources") },
                        { value: 'adzuna', label: t("Adzuna") },
                        { value: 'jooble', label: t("Jooble") },
                        { value: 'remoteok', label: t("RemoteOK") },
                        { value: 'remotive', label: t("Remotive") },
                        { value: 'arbeitnow', label: t("Arbeitnow") },
                        { value: 'themuse', label: t("The Muse") },
                        { value: 'greenhouse', label: t("Greenhouse") },
                        { value: 'lever', label: t("Lever") },
                        { value: 'ashby', label: t("Ashby") },
                        { value: 'smartrecruiters', label: t("SmartRecruiters") },
                        { value: 'workable', label: t("Workable") }
                      ]}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0 items-center">
                  <button
                    type="button"
                    onClick={toggleNearbyOnly}
                    className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold border rounded-xl transition duration-200 flex items-center gap-1.5 ${
                      nearbyOnly
                        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-md"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <HiLocationMarker className={`w-4 h-4 ${nearbyOnly ? "text-white" : "text-gray-400"}`} />
                    {nearbyOnly ? `Nearby` : "Show Nearby"}
                  </button>

                  {nearbyOnly && (
                    <select
                      value={radius}
                      onChange={(e) => handleRadiusChange(Number(e.target.value))}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 outline-none"
                    >
                      <option value={10}>{t("Within 10 km")}</option>
                      <option value={25}>{t("Within 25 km")}</option>
                      <option value={50}>{t("Within 50 km")}</option>
                      <option value={100}>{t("Within 100 km")}</option>
                    </select>
                  )}

                  {(search.skill || search.city || nearbyOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        clearFilters();
                        setNearbyOnly(false);
                      }}
                      className="flex-1 md:flex-none px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-center"
                    >{t("Clear")}</button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 md:flex-none justify-center px-5 py-2 text-sm font-bold text-white bg-[#081B3A] rounded-xl hover:bg-[#0E2854] transition flex items-center gap-2"
                  >
                    <HiFilter className="w-4 h-4" />{t("Search")}</button>
                </div>
              </form>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((n) => (
                  <JobCardSkeleton key={n} />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                <HiBriefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium text-gray-700">{t("No jobs found")}</p>
                {nearbyOnly ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm">{t("There are no jobs within")}{radius}{t("km of your location.")}</p>
                    {radius < 100 && (
                      <button
                        onClick={() => handleRadiusChange(100)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md"
                      >{t("Expand Search to 100 km")}</button>
                    )}
                  </div>
                ) : (
                  (search.skill || search.city) && (
                    <p className="text-sm mt-1">{t("Try different keywords or")}{" "}
                      <button
                        onClick={clearFilters}
                        className="text-emerald-600 font-medium"
                      >{t("clear filters")}</button>
                    </p>
                  )
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  {pagination.total}{t("job")}{pagination.total !== 1 ? "s" : ""}{" "}{t("found")}</p>
                <div className="flex flex-col gap-4">
                  {jobs.map((job) => {
                    const jobId = job._id || job.id;
                    return (
                    <JobCard
                      key={jobId}
                      job={job}
                      onViewDetails={() => navigate(`/provider/job/${jobId}`)}
                      onApplyNow={() => navigate(`/provider/job/${jobId}/apply`)}
                      aiInsights={aiInsightsMap[jobId]}
                      onRecruiterClick={handleRecruiterClick}
                      hasActivePlan={aiInsightsMap[jobId]?._isMock !== true}
                      onToggleSave={handleToggleSave}
                    />
                  )})}
                </div>
                {/* Pagination */}
                {pagination.pages > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => fetchJobs(pagination.page - 1)}
                      className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      <HiChevronLeft className="w-4 h-4 text-gray-700" />
                    </button>
                    
                    {getPaginationGroup().map((pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => fetchJobs(pageNumber)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition ${
                          pagination.page === pageNumber
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => fetchJobs(pagination.page + 1)}
                      className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      <HiChevronRight className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                )}
                

              </>
            )}
          </>
        )}

        {tab === "applications" && (
          <ApplicationsTab onRecruiterClick={handleRecruiterClick} />
        )}
      </div>
      {/* View Details navigates to dedicated page — no modal here */}

      {/* Recruiter Profile Modal */}
      {recruiterProfileTarget && (
        <RecruiterProfileModal
          recruiterId={recruiterProfileTarget.id}
          companyFallbackName={recruiterProfileTarget.name}
          onClose={() => setRecruiterProfileTarget(null)}
        />
      )}
    </div>
  );
};

export default ProviderJobs;
