import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiFilter, FiBookmark, FiChevronDown, FiList, FiGrid,
  FiMoreVertical, FiEye, FiEdit2, FiTrendingUp, FiArrowUpRight,
  FiClock, FiCheckCircle, FiPauseCircle, FiBriefcase, FiPlus, FiLoader, FiMapPin,
  FiArrowRight, FiUsers, FiMail, FiMessageCircle, FiTarget, FiCalendar, FiX
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { recruiterAPI, jobsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const getMatchScore = (job) => {
  if (job.topAiMatch) return job.topAiMatch;
  if (!job.interestedCount || job.interestedCount === 0) return 0;
  // Deterministic mock score between 65 and 95 based on job id
  let hash = 0;
  const idStr = String(job._id || job.title || '');
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 65 + (Math.abs(hash) % 31);
};

const JobPostings = () => {
  const {
    t
  } = useTranslation();

  const [activeTab, setActiveTab] = useState('All Jobs');
  const [activeAIHealthTooltip, setActiveAIHealthTooltip] = useState(null);

  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [jobToBoost, setJobToBoost] = useState(null);
  const [boostDays, setBoostDays] = useState(1);
  const [isBoosting, setIsBoosting] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterWorkMode, setFilterWorkMode] = useState('All');

  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('recent');
  const [layout, setLayout] = useState('list');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setUsageLoading(true);
      const [jobsRes, tasksRes, usageRes] = await Promise.all([
        recruiterAPI.getJobPostings(),
        recruiterAPI.getTasks().catch(() => ({ data: [] })),
        recruiterAPI.getAiUsage().catch(() => ({ data: { limits: {}, usage: {} } }))
      ]);
      setJobs(jobsRes.data.jobs || []);
      setTasks(tasksRes.data || []);
      if (usageRes.data?.success) {
        setAiUsage({ limits: usageRes.data.limits || {}, usage: usageRes.data.usage || {} });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setUsageLoading(false);
    }
  };

  const isBoostLimitReached = !usageLoading && 
    aiUsage.limits?.jobBoostJobsLimit !== -1 && 
    (aiUsage.usage?.jobBoostJobsLimit || 0) >= (aiUsage.limits?.jobBoostJobsLimit || 0);

  const openBoostModal = (job) => {
    if (isBoostLimitReached) {
      toast.error(`Boost limit reached (${aiUsage.usage?.jobBoostJobsLimit}/${aiUsage.limits?.jobBoostJobsLimit}). Please upgrade your plan.`);
      return;
    }
    setJobToBoost(job);
    setBoostDays(1);
    setBoostModalOpen(true);
  };

  const executeBoost = async () => {
    if (!boostDays || boostDays <= 0) {
      toast.error("Please enter a valid number of days.");
      return;
    }
    
    setIsBoosting(true);
    try {
      await jobsAPI.boostJob(jobToBoost._id, boostDays);
      toast.success("Job boosted successfully!");
      setBoostModalOpen(false);
      fetchJobs();
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error(error.response.data.message || "You need an active premium plan to boost jobs.");
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || "Invalid request.");
      } else {
        toast.error("Failed to boost job. Please try again.");
      }
    } finally {
      setIsBoosting(false);
    }
  };

  const handleEvaluate = async (jobId) => {
    try {
      await recruiterAPI.runAIEvaluation(jobId);
      // Wait a moment then refresh
      setTimeout(fetchJobs, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const draftJobs = jobs.filter(j => j.status === 'draft').length;
  const closedJobs = jobs.filter(j => j.status === 'closed').length;
  const onHoldJobs = jobs.filter(j => j.status === 'onHold').length;
  const totalJobs = jobs.length || 1;

  const jobStats = [
    { title: 'Active Jobs', count: activeJobs, percent: Math.round((activeJobs/totalJobs)*100)+'%', icon: <FiBriefcase className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50' },
    { title: 'Draft Jobs', count: draftJobs, percent: Math.round((draftJobs/totalJobs)*100)+'%', icon: <FiClock className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
    { title: 'Closed Jobs', count: closedJobs, percent: Math.round((closedJobs/totalJobs)*100)+'%', icon: <FiCheckCircle className="w-5 h-5 text-gray-700" />, bg: 'bg-gray-100' },
    { title: 'On Hold', count: onHoldJobs, percent: Math.round((onHoldJobs/totalJobs)*100)+'%', icon: <FiPauseCircle className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50' },
  ];

  let filteredJobs = activeTab === 'All Jobs' 
    ? jobs 
    : jobs.filter(j => (j.status || '').toLowerCase() === activeTab.toLowerCase().replace(' ', ''));

  if (filterCity) {
    filteredJobs = filteredJobs.filter(j => (j.city || '').toLowerCase().includes(filterCity.toLowerCase()));
  }
  if (filterWorkMode !== 'All') {
    filteredJobs = filteredJobs.filter(j => (j.workMode || '').toLowerCase() === filterWorkMode.toLowerCase());
  }

  const activeFilterCount = (filterCity ? 1 : 0) + (filterWorkMode !== 'All' ? 1 : 0);

  // Sorting logic
  const sortedJobs = [...filteredJobs];
  if (sortBy === 'recent') {
    sortedJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === 'applicants') {
    sortedJobs.sort((a, b) => (b.interestedCount || 0) - (a.interestedCount || 0));
  } else if (sortBy === 'match') {
    sortedJobs.sort((a, b) => (b.topAiMatch || 0) - (a.topAiMatch || 0));
  }

  // Pagination logic
  const totalPages = Math.ceil(sortedJobs.length / rowsPerPage);
  const paginatedJobs = sortedJobs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const totalApplicants = jobs.reduce((sum, job) => sum + (job.interestedCount || 0), 0);
  const screening = Math.floor(totalApplicants * 0.4);
  const interview = Math.floor(totalApplicants * 0.1);
  const offer = Math.floor(totalApplicants * 0.02);
  const hired = Math.floor(totalApplicants * 0.01);

  const pipeline = [
    { label: 'Applications', count: totalApplicants, color: 'bg-purple-500', width: totalApplicants ? '100%' : '0%' },
    { label: 'Screening', count: screening, color: 'bg-blue-500', width: totalApplicants ? `${Math.max(5, (screening/totalApplicants)*100)}%` : '0%' },
    { label: 'Interview', count: interview, color: 'bg-emerald-500', width: totalApplicants ? `${Math.max(5, (interview/totalApplicants)*100)}%` : '0%' },
    { label: 'Offer', count: offer, color: 'bg-orange-500', width: totalApplicants ? `${Math.max(5, (offer/totalApplicants)*100)}%` : '0%' },
    { label: 'Hired', count: hired, color: 'bg-teal-500', width: totalApplicants ? `${Math.max(5, (hired/totalApplicants)*100)}%` : '0%' },
  ];

  const jobsNeedingAttention = [...jobs].sort((a,b) => (a.topAiMatch || 0) - (b.topAiMatch || 0)).slice(0, 3);

  const chartPoints = [0, 0, 0, 0, 0];
  const now = new Date();
  jobs.forEach(job => {
    const jobDate = new Date(job.createdAt || new Date());
    const diffTime = Math.abs(now - jobDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weekIndex = 4 - Math.floor(diffDays / 7);
    if (weekIndex >= 0 && weekIndex < 5) {
      chartPoints[weekIndex] += (job.interestedCount || 0);
    }
  });

  const maxPoint = Math.max(...chartPoints, 10);
  const getY = (val) => 35 - ((val / maxPoint) * 30);

  const pathD = `M0,${getY(chartPoints[0])} C12,${getY(chartPoints[0])} 12,${getY(chartPoints[1])} 25,${getY(chartPoints[1])} S37,${getY(chartPoints[2])} 50,${getY(chartPoints[2])} S62,${getY(chartPoints[3])} 75,${getY(chartPoints[3])} S87,${getY(chartPoints[4])} 100,${getY(chartPoints[4])}`;
  const fillPathD = `${pathD} L100,40 L0,40 Z`;

  const chartWeeks = Array.from({length: 5}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (4 - i) * 7);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 relative">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t("Post Jobs")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("Manage your jobs and hiring pipeline")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/recruiter/post-job" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition flex items-center gap-2">
            <FiPlus className="w-4 h-4" />{t("Create New Job")}<FiChevronDown className="ml-1 opacity-70" />
          </Link>
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl w-full overflow-x-auto custom-scrollbar">
              {['All Jobs', 'Active', 'Draft', 'Closed', 'On Hold'].map((tab, idx) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap flex-1 px-4 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === tab ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {tab} {idx === 0 ? '' : <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-500">{[activeJobs, draftJobs, closedJobs, onHoldJobs][idx-1]}</span>}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setFilterModalOpen(true)} className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
              <FiFilter />{t("Filters")}
              {activeFilterCount > 0 && <span className="bg-indigo-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        {/* JOBS OVERVIEW */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">{t("Jobs Overview")}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {jobStats.map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${stat.bg}`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-0.5">{stat.title}</div>
                  <div className="text-2xl font-extrabold text-gray-900">{stat.count}</div>
                  <div className="text-[10px] font-bold text-gray-400 mt-0.5">{stat.percent}{t("of total jobs")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* LEFT COLUMN: MY JOBS TABLE */}
          <div className="xl:col-span-3 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-900">{t("My Jobs (")}{filteredJobs.length})</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="hidden sm:flex items-center bg-white border border-gray-200 rounded-lg p-1 shrink-0">
                  <button onClick={() => setLayout('list')} className={`p-1.5 rounded ${layout === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-700'}`}><FiList className="w-4 h-4" /></button>
                  <button onClick={() => setLayout('grid')} className={`p-1.5 rounded ${layout === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-700'}`}><FiGrid className="w-4 h-4" /></button>
                </div>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 sm:flex-none bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition focus:outline-none cursor-pointer"
                >
                  <option value="recent">{t("Sort by: Recent")}</option>
                  <option value="applicants">{t("Sort by: Applicants")}</option>
                  <option value="match">{t("Sort by: AI Match")}</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className={layout === 'list' ? 'hidden sm:block overflow-x-auto' : 'hidden'}>
                  <table className="w-full text-left border-collapse border border-gray-200 bg-white shadow-sm">
                    <thead className="bg-gradient-to-r from-gray-50 via-gray-100/50 to-gray-50 shadow-sm">
                      <tr className="text-sm font-bold text-gray-700 whitespace-nowrap">
                        <th className="py-3 px-4 border border-gray-200 min-w-[200px]">{t("Job Title")}</th>
                        <th className="py-3 px-4 border border-gray-200 min-w-[120px]">{t("Location")}</th>
                        <th className="py-3 px-4 border border-gray-200 text-center">{t("Applicants")}</th>
                        <th className="py-3 px-4 border border-gray-200 text-center">{t("AI Match")}</th>
                        <th className="py-3 px-4 border border-gray-200">{t("Status")}</th>
                        <th className="py-3 px-4 border border-gray-200">{t("Created On")}</th>
                        <th className="py-3 px-4 border border-gray-200 text-center">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedJobs.map((job) => (
                        <tr key={job._id} className="hover:bg-gradient-to-r hover:from-indigo-50/40 hover:to-white transition-all duration-300">
                          <td className="py-3 px-4 border border-gray-200 font-semibold text-gray-800">
                            <div className="flex items-center">
                              {job.title}
                            </div>
                          </td>
                          <td className="py-3 px-4 border border-gray-200 text-gray-700 font-medium">
                            {job.city || 'N/A'}
                          </td>
                          <td className="py-3 px-4 border border-gray-200 text-center font-bold text-gray-700">
                            {job.interestedCount || 0}
                          </td>
                          <td className="py-3 px-4 border border-gray-200 text-center text-gray-700">
                            <div className="flex justify-center">
                              <div className="w-10 h-10 font-bold drop-shadow-sm">
                                <CircularProgressbar
                                  value={getMatchScore(job)}
                                  text={`${getMatchScore(job)}%`}
                                  strokeWidth={10}
                                  styles={buildStyles({
                                    textSize: '26px',
                                    pathColor: getMatchScore(job) >= 80 ? '#10b981' : getMatchScore(job) >= 60 ? '#f59e0b' : '#ef4444',
                                    textColor: getMatchScore(job) >= 80 ? '#10b981' : getMatchScore(job) >= 60 ? '#f59e0b' : '#ef4444',
                                    trailColor: '#f3f4f6',
                                  })}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 border border-gray-200 text-center text-gray-700">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-[11px] font-bold shadow-sm ${job.status === 'active' ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border border-emerald-200' : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'}`}>
                              {(job.status || 'active').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 border border-gray-200 text-gray-500 text-sm font-medium">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 border border-gray-200 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link to={`/recruiter/jobs/${job._id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-gradient-to-br from-white to-indigo-50 text-xs font-bold text-indigo-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                                <FiEye className="w-3.5 h-3.5" />{t("View")}
                              </Link>
                              <button 
                                onClick={() => openBoostModal(job)} 
                                disabled={isBoostLimitReached}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-gradient-to-br from-white to-purple-50 text-xs font-bold text-purple-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
                              >
                                <HiSparkles className="w-3.5 h-3.5" />{t("Boost")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              
              <div className={layout === 'grid' ? 'block' : 'block sm:hidden'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 sm:p-6">
                  {paginatedJobs.map((job) => (
                    <div key={job._id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 transition-all duration-300 flex flex-col h-full relative group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {job.companyLogo ? (
                            <img src={job.companyLogo} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xl border border-indigo-200 shadow-sm shrink-0">
                              {(job.companyName || 'L')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold shadow-sm ${job.status === 'active' ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border border-emerald-200' : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'}`}>
                          {(job.status || 'active').toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{job.title}</h3>
                      <div className="text-xs text-gray-500 flex items-center gap-3 mb-4">
                        <span className="flex items-center gap-1 font-medium"><FiMapPin className="w-3 h-3 text-gray-400" /> {job.city || 'N/A'}</span>
                        <span className="flex items-center gap-1 font-medium"><FiClock className="w-3 h-3 text-gray-400" /> {job.workMode || 'onsite'}</span>
                      </div>
                      
                      <div className="flex items-center gap-6 mt-4 mb-6 p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                        <div className="flex-1">
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">{t("Applicants")}</div>
                          <div className="text-2xl font-extrabold text-gray-800">{job.interestedCount || 0}</div>
                        </div>
                        <div className="w-px h-10 bg-gray-200"></div>
                        <div className="flex-1">
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t("AI Match")}</div>
                          <div className="w-9 h-9 font-bold drop-shadow-sm">
                            <CircularProgressbar
                              value={getMatchScore(job)}
                              text={`${getMatchScore(job)}%`}
                              strokeWidth={12}
                              styles={buildStyles({
                                textSize: '28px',
                                pathColor: getMatchScore(job) >= 80 ? '#10b981' : getMatchScore(job) >= 60 ? '#f59e0b' : '#ef4444',
                                textColor: getMatchScore(job) >= 80 ? '#10b981' : getMatchScore(job) >= 60 ? '#f59e0b' : '#ef4444',
                                trailColor: '#f3f4f6',
                              })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2">
                        <Link to={`/recruiter/jobs/${job._id}`} className="flex-1 flex justify-center items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-gradient-to-br from-white to-indigo-50 text-xs font-bold text-indigo-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                          <FiEye className="w-4 h-4" />{t("View")}
                        </Link>
                        <button 
                          onClick={() => openBoostModal(job)} 
                          disabled={isBoostLimitReached}
                          className="flex-1 flex justify-center items-center gap-2 px-3 py-2 rounded-lg border border-purple-200 bg-gradient-to-br from-white to-purple-50 text-xs font-bold text-purple-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
                        >
                          <HiSparkles className="w-4 h-4" />{t("Boost")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Pagination */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4">
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-500">
                  {t("Rows per page:")} 
                  <select 
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                  <div className="text-xs font-semibold text-gray-500 truncate">
                    {t("Showing")} {filteredJobs.length > 0 ? ((currentPage - 1) * rowsPerPage) + 1 : 0}-{Math.min(currentPage * rowsPerPage, filteredJobs.length)} {t("of")} {filteredJobs.length}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-bold flex items-center justify-center transition shrink-0"
                    >
                      &lt;
                    </button>
                    <div className="text-xs font-bold px-1 sm:px-2 text-gray-700 whitespace-nowrap">
                      {currentPage} / {totalPages || 1}
                    </div>
                    <button 
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-bold flex items-center justify-center transition shrink-0"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </div>



          </div>

          {/* RIGHT COLUMN: ANALYTICS & ALERTS */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Jobs Needing Attention */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">{t("Jobs Needing Attention")}</h3>
                <Link to="#" className="text-[10px] font-bold text-indigo-600 hover:underline">{t("View all (")}{jobsNeedingAttention.length}) &rarr;</Link>
              </div>
              <div className="space-y-4">
                {jobsNeedingAttention.map((job, idx) => (
                  <div key={job._id || idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 font-bold text-red-600">
                      {(job.companyName || 'L')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{job.title}</div>
                      <div className="text-[10px] font-bold text-red-700 mt-0.5">
                        {job.topAiMatch ? `AI Match: ${job.topAiMatch}% (Needs improvement)` : 'Evaluate applicants to see match score'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hiring Pipeline Snapshot */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-gray-900">{t("Hiring Pipeline Snapshot")}</h3>
                <Link to="#" className="text-[10px] font-bold text-indigo-600 hover:underline">{t("View full pipeline →")}</Link>
              </div>
              <div className="space-y-4">
                {pipeline.map(stage => (
                  <div key={stage.label} className="relative">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[11px] font-bold text-gray-700">{stage.label}</span>
                      <span className="text-[11px] font-bold text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded">{stage.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`${stage.color} h-1.5 rounded-full`} style={{ width: stage.width }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Job Performance */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">{t("Job Performance")}<span className="block text-[10px] text-gray-500 font-medium">{t("(This Month)")}</span></h3>
                <Link to="#" className="text-[10px] font-bold text-indigo-600 hover:underline">{t("View analytics →")}</Link>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 mb-1">{t("Total Applicants")}</div>
                  <div className="text-lg font-extrabold text-gray-900">{totalApplicants}</div>
                  <div className="text-[10px] font-bold text-emerald-600 flex items-center mt-1"><FiTrendingUp className="mr-0.5" /> 24%</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 mb-1">{t("Interviews")}</div>
                  <div className="text-lg font-extrabold text-gray-900">{interview}</div>
                  <div className="text-[10px] font-bold text-emerald-600 flex items-center mt-1"><FiTrendingUp className="mr-0.5" /> 18%</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 mb-1">{t("Hires")}</div>
                  <div className="text-lg font-extrabold text-gray-900">{hired}</div>
                  <div className="text-[10px] font-bold text-emerald-600 flex items-center mt-1"><FiTrendingUp className="mr-0.5" /> 14%</div>
                </div>
              </div>

              {/* Line Chart */}
              <div className="h-24 w-full bg-gray-50/50 rounded-xl border border-gray-100 relative overflow-hidden flex items-end mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d={pathD} fill="none" stroke="#4F46E5" strokeWidth="2" />
                  <path d={fillPathD} fill="url(#gradient)" stroke="none" opacity="0.2" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Axes Labels */}
                <div className="absolute inset-y-0 left-0 flex flex-col justify-between py-2 px-1 text-[8px] text-gray-400 font-bold">
                  <span>{maxPoint}</span>
                  <span>{Math.round(maxPoint / 2)}</span>
                  <span>0</span>
                </div>
                <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 pb-1 text-[8px] text-gray-400 font-bold">
                  {chartWeeks.map((week, idx) => (
                    <span key={idx}>{week}</span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Boost Modal */}
      {boostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Boost Job Post</h3>
            <p className="text-sm text-gray-500 mb-6">
              Boosting <span className="font-semibold text-gray-700">{jobToBoost?.title}</span> will increase its visibility and reach more candidates.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Number of Days
              </label>
              <input
                type="number"
                min="1"
                value={boostDays}
                onChange={(e) => setBoostDays(parseInt(e.target.value) || '')}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="Enter days"
              />
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button
                onClick={() => setBoostModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition"
                disabled={isBoosting}
              >
                Cancel
              </button>
              <button
                onClick={executeBoost}
                disabled={isBoosting || !boostDays || boostDays <= 0}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isBoosting && <FiLoader className="w-4 h-4 animate-spin" />}
                {isBoosting ? "Boosting..." : "Confirm Boost"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Filter Jobs</h3>
              <button 
                onClick={() => setFilterModalOpen(false)} 
                className="p-2 bg-red-50 hover:bg-red-100 rounded-full text-red-700 hover:text-red-600 transition-all transform hover:scale-110 shadow-sm"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City / Location
                </label>
                <input
                  type="text"
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="e.g. New York, Remote"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Work Mode
                </label>
                <select
                  value={filterWorkMode}
                  onChange={(e) => setFilterWorkMode(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                >
                  <option value="All">All Modes</option>
                  <option value="onsite">On-site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button
                onClick={() => {
                  setFilterCity('');
                  setFilterWorkMode('All');
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition mr-auto"
              >
                Clear All
              </button>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostings;