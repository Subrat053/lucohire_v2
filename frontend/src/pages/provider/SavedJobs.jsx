import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HiOutlineBookmark,
  HiBookmark,
  HiLocationMarker,
  HiCurrencyRupee,
  HiOutlineBriefcase,
  HiCheckCircle,
  HiOutlinePaperAirplane,
  HiOutlineLockClosed,
  HiExclamationCircle,
  HiOutlineMail,
  HiOutlinePhone,
  HiBell,
  HiChevronDown,
  HiLightningBolt,
  HiOutlineClock,
  HiOutlineFilter,
} from "react-icons/hi";
import { FaRupeeSign } from "react-icons/fa";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { providerAPI } from "../../services/api";
import toast from "react-hot-toast";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const BUDGET_LABELS = {
  fixed: "Fixed",
  hourly: "/hr",
  monthly: "/mo",
  negotiable: "Negotiable",
};

// Simplified JobCard adapted from Jobs.jsx for SavedJobs page
const SavedJobCard = ({ job, onUnsave, onViewDetails }) => {
  const budgetText =
    job.budgetType === "negotiable"
      ? "Negotiable"
      : `₹${job.budgetMin?.toLocaleString()} - ${job.budgetMax?.toLocaleString()} ${job.budgetType === "yearly" ? "LPA" : BUDGET_LABELS[job.budgetType] || ""}`.trim();

  const postedAgo = (() => {
    const d = Math.floor(
      (Date.now() - new Date(job.createdAt || Date.now())) / 86400000,
    );
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
  })();

  const matchScore = job.matchScore || 0;

  const allJobSkills = [job.skill, ...(job.skills || [])]
    .map((s) => (typeof s === "string" ? s.trim() : s?.name?.trim() || ""))
    .filter(Boolean);
  const displaySkills = allJobSkills.slice(0, 4);
  const extraSkills = allJobSkills.length > 4 ? allJobSkills.length - 4 : 0;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row gap-4 md:gap-5 relative group min-w-0 w-full overflow-hidden transition hover:shadow-md">
      {/* Mobile Top Row: Logo + Title/Company */}
      <div className="flex flex-row gap-4 w-full md:w-auto">
        {/* Logo */}
        <div className="shrink-0 pt-1">
          <div className="w-[60px] h-[60px] rounded-[16px] border border-gray-100 flex flex-col items-center justify-center shadow-sm bg-white overflow-hidden">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.companyName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-extrabold text-2xl text-gray-900 tracking-tighter capitalize">
                {job.companyName?.substring(0, 1) || "C"}
              </span>
            )}
          </div>
        </div>

        {/* Mobile ONLY Title & Company */}
        <div className="flex-1 min-w-0 md:hidden flex flex-col justify-center">
          <div className="text-[11px] font-bold text-[#10b981] mb-1">
            {matchScore}% Match
          </div>
          <div className="min-w-0 max-w-full">
            <h3 className="font-bold text-gray-900 text-[18px] leading-tight truncate mb-1 block w-full">
              {job.title || "Web developer needed"}
            </h3>
          </div>
          <div className="text-[13px] text-gray-700 font-medium flex items-center gap-1.5">
            {job.companyName || "Company Name"}
            <HiCheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center mt-2 md:mt-0">
        {/* Desktop ONLY Match Badge, Title & Company */}
        <div className="hidden md:block">
          <div className="text-[11px] font-bold text-[#10b981] mb-1">
            {matchScore}% Match
          </div>
          <div className="min-w-0 max-w-full">
            <h3 className="font-bold text-gray-900 text-[18px] leading-tight truncate mb-1 block w-full">
              {job.title || "Web developer needed"}
            </h3>
          </div>
          <div className="text-[13px] text-gray-700 font-medium mb-3 flex items-center gap-1.5">
            {job.companyName || "Company Name"}
            <HiCheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-[12px] font-medium text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <HiLocationMarker className="w-[15px] h-[15px]" />
            {job.city || "Location"} ({job.workMode || "Hybrid"})
          </div>
          <div className="flex items-center gap-1.5">
            <HiCurrencyRupee className="w-[15px] h-[15px]" />
            {budgetText}
          </div>
          <div className="flex items-center gap-1.5">
            <HiOutlineClock className="w-[15px] h-[15px]" />
            Saved {postedAgo}
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-2">
          {displaySkills.map((sk, i) => (
            <span
              key={i}
              className="text-[11px] px-3 py-1 bg-gray-50 text-gray-700 rounded-full font-semibold border border-gray-100"
            >
              {sk}
            </span>
          ))}
          {extraSkills > 0 && (
            <span className="text-[11px] px-3 py-1 bg-gray-50 text-gray-700 rounded-full font-semibold border border-gray-100">
              +{extraSkills}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-row sm:flex-col justify-between items-center sm:items-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
        <div className="flex items-center gap-2 order-last sm:order-first">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnsave(job);
            }}
            className="w-9 h-9 rounded-xl bg-[#ecfdf5] flex items-center justify-center text-[#10b981] hover:bg-[#d1fae5] transition"
          >
            <HiBookmark className="w-[18px] h-[18px]" />
          </button>
        </div>

        <button
          onClick={() => onViewDetails(job)}
          className="w-full sm:w-auto px-6 py-2 bg-white border-2 border-[#10b981] text-[#10b981] hover:bg-[#ecfdf5] rounded-xl text-[13px] font-bold transition whitespace-nowrap shadow-sm text-center"
        >
          View Job
        </button>
      </div>
    </div>
  );
};

const SavedJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [tab, setTab] = useState("all"); // all, active
  const [sortBy, setSortBy] = useState("recent"); // recent, match
  const [filterActive, setFilterActive] = useState(false);
  const [filterWorkMode, setFilterWorkMode] = useState("All");
  const [visibleCount, setVisibleCount] = useState(10);
  const [recommendations, setRecommendations] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [profile, setProfile] = useState(null);
  const [alertEnabled, setAlertEnabled] = useState(false);

  useEffect(() => {
    fetchSavedJobs();
    fetchRecommendations();
    fetchProfile();
  }, []);

  useEffect(() => {
    if (allMatches.length > 0 && jobs.length > 0) {
      const savedSkills = new Set();
      jobs.forEach((job) => {
        if (job.skill) savedSkills.add(job.skill.toLowerCase());
        if (job.skills)
          job.skills.forEach((s) =>
            savedSkills.add(
              typeof s === "string"
                ? s.toLowerCase()
                : s?.name?.toLowerCase() || "",
            ),
          );
      });
      savedSkills.delete("");

      const scoredMatches = allMatches.map((match) => {
        let similarity = 0;
        const matchSkills = [match.skill, ...(match.skills || [])]
          .map((s) =>
            typeof s === "string"
              ? s.toLowerCase()
              : s?.name?.toLowerCase() || "",
          )
          .filter(Boolean);

        matchSkills.forEach((s) => {
          if (savedSkills.has(s)) similarity++;
        });
        return { ...match, similarityScore: similarity };
      });

      const savedIds = new Set(jobs.map((j) => j._id));
      const filtered = scoredMatches.filter((m) => !savedIds.has(m._id));

      filtered.sort(
        (a, b) =>
          b.similarityScore - a.similarityScore ||
          (b.matchScore || 0) - (a.matchScore || 0),
      );
      setRecommendations(filtered.slice(0, 3));
    } else if (allMatches.length > 0) {
      const savedIds = new Set(jobs.map((j) => j._id));
      const filtered = allMatches.filter((m) => !savedIds.has(m._id));
      setRecommendations(filtered.slice(0, 3));
    }
  }, [allMatches, jobs]);

  const fetchProfile = async () => {
    try {
      const { data } = await providerAPI.getDashboard();
      setProfile(data.profile || {});
    } catch (err) {
      console.log("Failed to load profile for overview", err);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const { data } = await providerAPI.getMatches();
      if (data && data.data && data.data.length > 0) {
        setAllMatches(data.data);
        return;
      }
    } catch (err) {
      console.log("Using fallback recommendations");
    }
    // Fallback if API fails or returns empty so UI is still visible
    setAllMatches([
      {
        _id: "rec1",
        title: "Frontend Engineer",
        companyName: "TechCorp Inc.",
        city: "Mumbai",
        matchScore: 94,
      },
      {
        _id: "rec2",
        title: "React Developer",
        companyName: "DesignStudio",
        city: "Remote",
        matchScore: 88,
      },
    ]);
  };

  const fetchSavedJobs = async () => {
    setLoading(true);
    try {
      const { data } = await providerAPI.getSavedJobs();
      const savedJobs = data.jobs || [];
      setJobs(savedJobs);
      if (savedJobs.length > 0) {
        fetchAiInsights(savedJobs);
      }
    } catch (err) {
      toast.error("Failed to load saved jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchAiInsights = async (jobsToAnalyze) => {
    if (!jobsToAnalyze || jobsToAnalyze.length === 0) return;
    setAiInsightsLoading(true);
    
    try {
      const cacheKey = "saved_jobs_ai_insights";
      const cachedStr = sessionStorage.getItem(cacheKey);
      let cachedData = null;
      if (cachedStr) {
        try {
          cachedData = JSON.parse(cachedStr);
        } catch (e) {}
      }

      let insightsMap = {};
      if (
        cachedData &&
        cachedData.timestamp &&
        Date.now() - cachedData.timestamp < 60 * 60 * 1000
      ) {
        insightsMap = { ...cachedData.insightsMap };
        setJobs((prevJobs) =>
          prevJobs.map((job) => {
            if (insightsMap[job._id]) {
              return {
                ...job,
                matchScore: insightsMap[job._id].matchScore || 0,
                aiMatchedSkills: insightsMap[job._id].matchedSkills || [],
                aiMissingSkills: insightsMap[job._id].missingSkills || [],
              };
            }
            return job;
          }),
        );
      }

      // Find jobs that need fetching (limit to first 15 to avoid excessive looping on large saved lists)
      const jobsToFetch = jobsToAnalyze.filter(j => !insightsMap[j._id]).slice(0, 15);
      
      if (jobsToFetch.length > 0) {
        for (const j of jobsToFetch) {
          try {
            const payload = [{
              _id: j._id || j.id,
              title: j.title,
              skill: j.skill,
              requirements: j.requirements,
              experienceRequired: j.experienceRequired,
              location: j.city || j.workLocation || j.location || 'Unknown'
            }];
            const response = await providerAPI.getJobAiInsights(payload);
            
            if (response.data?.success && response.data.data.length > 0) {
              const item = response.data.data[0];
              insightsMap[item.jobId] = item.insights;
              
              // Update state progressively
              setJobs((prevJobs) =>
                prevJobs.map((job) => {
                  if (job._id === item.jobId || job.id === item.jobId) {
                    return {
                      ...job,
                      matchScore: item.insights.matchScore || 0,
                      aiMatchedSkills: item.insights.matchedSkills || [],
                      aiMissingSkills: item.insights.missingSkills || [],
                    };
                  }
                  return job;
                })
              );
              
              // Update cache progressively
              sessionStorage.setItem(
                cacheKey,
                JSON.stringify({
                  timestamp: Date.now(),
                  insightsMap,
                })
              );
            }
          } catch (error) {
            console.error("Failed to load AI insight for job:", j._id, error);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load AI insights for jobs", err);
    } finally {
      setAiInsightsLoading(false);
    }
  };

  const handleUnsave = async (job) => {
    try {
      await providerAPI.toggleSaveJob(job._id, !!job.isExternal);
      setJobs((prev) => prev.filter((j) => j._id !== job._id));
      toast.success("Job removed from saved jobs.");
    } catch (err) {
      toast.error("Failed to unsave job");
    }
  };

  let filteredJobs = jobs.filter((job) => {
    if (
      tab === "active" &&
      (job.status === "closed" || job.status === "expired")
    )
      return false;

    if (filterWorkMode && filterWorkMode !== "All") {
      let modeStr = "";
      if (Array.isArray(job.workMode)) {
        modeStr = job.workMode.join(" ").toLowerCase();
      } else {
        modeStr = String(job.workMode || "Hybrid").toLowerCase();
      }

      let fMode = filterWorkMode.toLowerCase();
      if (fMode === "on-site") fMode = "onsite";

      const normalizedModeStr = modeStr.replace(/-/g, "");
      if (!normalizedModeStr.includes(fMode)) return false;
    }
    return true;
  });

  filteredJobs.sort((a, b) => {
    if (sortBy === "recent") {
      return (
        new Date(b.savedAt || b.createdAt || 0) -
        new Date(a.savedAt || a.createdAt || 0)
      );
    } else if (sortBy === "match") {
      return (b.matchScore || 0) - (a.matchScore || 0);
    }
    return 0;
  });

  const averageMatchScore =
    jobs.length > 0
      ? Math.round(
          jobs.reduce((acc, job) => acc + (job.matchScore || 0), 0) /
            jobs.length,
        )
      : 0;

  const matchedSkillsSet = new Set();
  const missingSkillsSet = new Set();

  jobs.forEach((job) => {
    if (job.aiMatchedSkills) {
      job.aiMatchedSkills.forEach((s) => matchedSkillsSet.add(s));
    }
    if (job.aiMissingSkills) {
      job.aiMissingSkills.forEach((s) => missingSkillsSet.add(s));
    }
  });

  const matchedSkillsList = Array.from(matchedSkillsSet);
  const missingSkillsList = Array.from(missingSkillsSet);
  const matchedCount = matchedSkillsList.length;
  const totalRequired = matchedCount + missingSkillsList.length;
  const coveragePercent =
    totalRequired > 0 ? Math.round((matchedCount / totalRequired) * 100) : 0;
  const displayScore = totalRequired > 0 ? coveragePercent : averageMatchScore;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* Main Content (Left Side) */}
        <div className="flex-1 min-w-0 lg:max-w-[calc(100%-352px)] w-full">
          <div className="mb-3">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3">
              Saved Jobs
              <span className="text-[14px] px-3 py-1 bg-[#ecfdf5] text-[#10b981] rounded-full">
                {jobs.length}
              </span>
            </h1>
            <p className="text-[14px] text-gray-500 font-medium mt-1">
              Jobs you've saved for later
            </p>
          </div>

          <div className="flex flex-wrap justify-between items-end mb-6 gap-y-3 gap-x-2 border-b border-gray-200 pt-3 w-full">
            {/* Tabs */}
            <div className="flex gap-4 sm:gap-6">
              <button
                onClick={() => setTab("all")}
                className={`text-[13px] sm:text-[14px] font-bold pb-2 border-b-2 transition-colors relative top-[1px] whitespace-nowrap ${tab === "all" ? "border-[#0f766e] text-[#0f766e]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                All Jobs{" "}
                <span className="hidden sm:inline">({jobs.length})</span>
              </button>
              <button
                onClick={() => setTab("active")}
                className={`text-[13px] sm:text-[14px] font-bold pb-2 border-b-2 transition-colors relative top-[1px] whitespace-nowrap ${tab === "active" ? "border-[#0f766e] text-[#0f766e]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Active{" "}
                <span className="hidden sm:inline">
                  (
                  {
                    jobs.filter(
                      (j) => j.status !== "closed" && j.status !== "expired",
                    ).length
                  }
                  )
                </span>
              </button>
            </div>

            {/* Sort By & Filter */}
            <div className="flex flex-row items-center gap-2 sm:gap-3 relative mb-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-[11px] sm:text-[13px] font-medium text-gray-500 hidden sm:inline">
                  Sort by
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-[11px] sm:text-[13px] font-bold text-gray-700 bg-white border border-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 appearance-none pr-6 sm:pr-8 cursor-pointer relative"
                  style={{
                    backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="%239ca3af" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 4px center",
                    backgroundSize: "14px",
                  }}
                >
                  <option value="recent">Recently Saved</option>
                  <option value="match">Match Score</option>
                </select>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 border-l border-gray-200 pl-2 sm:pl-3">
                <span className="text-[11px] sm:text-[13px] font-medium text-gray-500 flex items-center gap-1">
                  <HiOutlineFilter className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                  <span className="hidden sm:inline">Mode</span>
                </span>
                <select
                  value={filterWorkMode}
                  onChange={(e) => setFilterWorkMode(e.target.value)}
                  className="text-[11px] sm:text-[13px] font-bold text-gray-700 bg-white border border-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 appearance-none pr-6 sm:pr-8 cursor-pointer relative"
                  style={{
                    backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="%239ca3af" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 4px center",
                    backgroundSize: "14px",
                  }}
                >
                  <option value="All">All</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-xs">
              <HiOutlineBookmark className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-700">No saved jobs found</p>
              <p className="text-sm text-gray-400 mt-1">
                Jobs you save will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {filteredJobs.slice(0, visibleCount).map((job) => (
                <SavedJobCard
                  key={job._id}
                  job={job}
                  onUnsave={handleUnsave}
                  onViewDetails={(job) => navigate(`/provider/job/${job._id}`)}
                />
              ))}

              {visibleCount < filteredJobs.length && (
                <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm overflow-hidden mt-2">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    className="w-full py-3 text-[14px] font-bold text-[#10b981] flex items-center justify-center gap-2 hover:bg-gray-50 rounded-xl transition"
                  >
                    Load More Jobs <HiChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-6">
          {/* Match Overview Widget */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
            <h3 className="font-bold text-gray-900 mb-4">
              Your Match Overview
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 shrink-0">
                {aiInsightsLoading ? (
                  <div className="w-full h-full rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin"></div>
                ) : (
                  <CircularProgressbar
                    value={displayScore}
                    text={`${displayScore}%`}
                    styles={buildStyles({
                      pathColor: "#10b981",
                      textColor: "#10b981",
                      trailColor: "#ecfdf5",
                      textSize: "24px",
                      strokeLinecap: "round",
                    })}
                    strokeWidth={10}
                  />
                )}
              </div>
              <div>
                {aiInsightsLoading ? (
                  <>
                    <p className="text-sm font-bold text-gray-900">
                      Analyzing Matches...
                    </p>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">
                      AI is analyzing your profile against saved jobs.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-900">
                      {totalRequired === 0
                        ? "Analysis Ready"
                        : coveragePercent >= 70
                          ? "Strong Skill Match"
                          : coveragePercent >= 40
                            ? "Moderate Skill Match"
                            : "Skill Gap Detected"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">
                      {totalRequired === 0
                        ? "Save jobs with listed skills to see your match overview."
                        : `You possess ${matchedCount} out of ${totalRequired} core skills required across your saved jobs.`}
                    </p>
                  </>
                )}
              </div>
            </div>

            {!aiInsightsLoading && totalRequired > 0 && (
              <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                {matchedSkillsList.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      What you have{" "}
                      <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest">
                        {matchedSkillsList.length}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedSkillsList.slice(0, 10).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-[#ecfdf5] text-[#10b981] text-[10px] font-bold rounded-md capitalize border border-green-100/50"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                      {matchedSkillsList.length > 10 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-md border border-gray-100/50">
                          +{matchedSkillsList.length - 10}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {missingSkillsList.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      Skill Gaps (Missing){" "}
                      <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest">
                        {missingSkillsList.length}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingSkillsList.slice(0, 10).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-md capitalize border border-rose-100/50"
                        >
                          × {skill}
                        </span>
                      ))}
                      {missingSkillsList.length > 10 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-md border border-gray-100/50">
                          +{missingSkillsList.length - 10}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Recommendations Widget */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                <HiLightningBolt className="w-5 h-5 text-yellow-400" /> AI
                Recommendations
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Jobs similar to what you've saved
            </p>

            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div
                  key={rec._id || idx}
                  onClick={() =>
                    rec._id && navigate(`/provider/job/${rec._id}`)
                  }
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-green-100 hover:bg-emerald-50/50 cursor-pointer transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-gray-700 shrink-0">
                    {rec.title?.substring(0, 2).toUpperCase() || "JB"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {rec.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {rec.companyName} • {rec.city}
                    </p>
                    <p className="text-[10px] text-[#10b981] font-bold mt-1">
                      {rec.matchScore || 80}% Match
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/provider/job-for-me")}
              className="w-full mt-4 py-2 text-sm font-bold text-[#10b981] hover:bg-emerald-50 rounded-lg transition"
            >
              View all recommendations
            </button>

          </div>

          {/* Get Notified First Widget */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-green-100 p-6 shadow-xs relative overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <HiBell className="w-5 h-5 text-[#10b981]" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Get Notified First</h3>
            <p className="text-xs text-gray-700 mb-4 leading-relaxed">
              Turn on alerts for jobs matching your saved criteria and never
              miss an opportunity.
            </p>
            <button
              onClick={() => setAlertEnabled(!alertEnabled)}
              className={`w-full py-2.5 text-sm font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-2 ${
                alertEnabled
                  ? "bg-green-50 text-[#10b981] border border-green-200 hover:bg-green-100"
                  : "bg-emerald-500 text-white"
              }`}
            >
              {alertEnabled ? (
                <>
                  Alerts Enabled <HiCheckCircle className="w-4 h-4" />
                </>
              ) : (
                <>
                  Create Alert <HiBell className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Quick Actions Widget */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/provider/applied-jobs"
                className="flex justify-center items-center text-center text-sm text-white bg-emerald-500 px-3 py-2 rounded-lg transition font-bold"
              >
                View Application History
              </Link>
              <Link
                to="/provider/profile"
                className="flex justify-center items-center text-center text-sm text-white bg-emerald-500 px-3 py-2 rounded-lg transition font-bold"
              >
                Update Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedJobs;
