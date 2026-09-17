import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect } from 'react';
import { 
  FiMapPin, FiClock, FiCalendar, FiExternalLink, FiMoreHorizontal, 
  FiSearch, FiFilter, FiChevronDown, FiFileText, FiMessageSquare, 
  FiLoader, FiChevronRight, FiCheckCircle, FiEye, FiUsers, FiTrendingUp, FiBarChart2, FiUser, FiPlus, FiMinus, FiTrash2, FiPower
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { useParams, Link } from 'react-router-dom';
import { recruiterAPI, jobsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import CandidateProfileModal from '../../components/recruiter/CandidateProfileModal';

const SCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

// Map backend statuses to Kanban columns
const STATUS_COLUMNS = [
  { id: 'pending', title: 'Applied', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
  { id: 'reviewed', title: 'Reviewed', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  { id: 'contacted', title: 'Contacted', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
  { id: 'shortlisted', title: 'Shortlisted', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
  { id: 'hired', title: 'Hired', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  { id: 'rejected', title: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
];

export default function JobDetails() {
  const {
    t
  } = useTranslation();

  const { id: jobId } = useParams();
  const [activeTab, setActiveTab] = useState('pipeline');

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedAppId, setDraggedAppId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [boostDays, setBoostDays] = useState(1);
  const [isBoosting, setIsBoosting] = useState(false);

  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setUsageLoading(true);
      const [jobRes, appsRes, usageRes] = await Promise.all([
        recruiterAPI.getJobById(jobId),
        recruiterAPI.getJobApplications(jobId),
        recruiterAPI.getAiUsage().catch(() => ({ data: { limits: {}, usage: {} } }))
      ]);
      setJob(jobRes.data);
      // The backend returns an array directly, so appsRes.data IS the array
      setApplications(Array.isArray(appsRes.data) ? appsRes.data : (appsRes.data.applications || []));
      if (usageRes.data?.success) {
        setAiUsage({ limits: usageRes.data.limits || {}, usage: usageRes.data.usage || {} });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
      setUsageLoading(false);
    }
  };

  const handleDragStart = (e, appId) => {
    setDraggedAppId(appId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedAppId) return;

    const appToMove = applications.find(a => a._id === draggedAppId);
    if (!appToMove || appToMove.status === newStatus) {
      setDraggedAppId(null);
      return;
    }

    // Optimistic UI update
    const previousApps = [...applications];
    setApplications(apps => apps.map(a => 
      a._id === draggedAppId ? { ...a, status: newStatus } : a
    ));
    setDraggedAppId(null);

    try {
      await recruiterAPI.updateApplicationStatus(draggedAppId, { status: newStatus });
      toast.success('Status updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
      setApplications(previousApps); // Revert on error
    }
  };

  const handleMoveCandidate = async (appId, newStatus) => {
    const appToMove = applications.find(a => a._id === appId);
    if (!appToMove || appToMove.status === newStatus) {
      return;
    }

    const previousApps = [...applications];
    setApplications(apps => apps.map(a => 
      a._id === appId ? { ...a, status: newStatus } : a
    ));

    try {
      await recruiterAPI.updateApplicationStatus(appId, { status: newStatus });
      toast.success('Status updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
      setApplications(previousApps);
    }
  };

  const handleDeleteJob = async () => {
    if (window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      try {
        await recruiterAPI.deleteJob(jobId);
        toast.success("Job deleted successfully");
        navigate("/recruiter/jobs");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete job");
      }
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = job.status === 'active' ? 'inactive' : 'active';
    if (window.confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this job?`)) {
      try {
        await recruiterAPI.updateJob(jobId, { status: newStatus });
        toast.success(`Job ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        fetchData();
      } catch (err) {
        console.error(err);
        toast.error(`Failed to ${newStatus === 'active' ? 'activate' : 'deactivate'} job`);
      }
    }
  };

  const executeBoost = async () => {
    if (!boostDays || boostDays <= 0) {
      return toast.error("Please enter a valid number of days");
    }

    setIsBoosting(true);
    try {
      await jobsAPI.boostJob(jobId, boostDays);
      toast.success("Job boosted successfully!");
      setBoostModalOpen(false);
      fetchData();
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error(error.response.data.message || "You need an active premium plan to boost jobs.");
      } else {
        console.error("Boost error:", error);
        toast.error("Failed to boost job. Please try again.");
      }
    } finally {
      setIsBoosting(false);
    }
  };

  const isBoostLimitReached = !usageLoading && 
    aiUsage.limits?.jobBoostJobsLimit !== -1 && 
    (aiUsage.usage?.jobBoostJobsLimit || 0) >= (aiUsage.limits?.jobBoostJobsLimit || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-24">
        <FiLoader className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!job) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-24">
      <div className="text-gray-500 font-bold">{t("Job not found")}</div>
    </div>
  );

  // Filter applications by search query
  const filteredApplications = applications.filter(app => {
    if (!searchQuery.trim()) return true;
    const name = app.provider?.name || 'Unknown User';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group applications by status
  const groupedApps = STATUS_COLUMNS.map(col => ({
    ...col,
    candidates: filteredApplications.filter(app => app.status === col.id)
  }));

  const totalCandidates = applications.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        {/* Subtle background gradient and patterns */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/40 via-transparent to-purple-50/40 pointer-events-none"></div>
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm">{job.title}</h1>
                <span className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>{t("Active")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-gray-500 mt-3">
                <div className="flex items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-md border border-gray-100 shadow-sm"><FiMapPin className="text-indigo-400" /> {job.city || job.location?.city || 'Location N/A'}</div>
                <div className="flex items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-md border border-gray-100 shadow-sm"><FiClock className="text-indigo-400" /> {job.workMode || 'Full-time'}</div>
                <div className="flex items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-md border border-gray-100 shadow-sm"><FiCalendar className="text-indigo-400" />{t("Created on")}{format(new Date(job.createdAt), 'dd MMM yyyy')}</div>
                <div className="flex items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-md border border-gray-100 shadow-sm text-gray-400"><span className="text-indigo-400 font-bold">ID:</span>{job._id.slice(-6).toUpperCase()}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0 w-full md:w-auto justify-start md:justify-end">
              <Link to={`/job/${job._id}`} target="_blank" className="flex-1 md:flex-none justify-center items-center flex gap-1.5 bg-white border border-gray-200 text-indigo-600 hover:text-indigo-700 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all duration-200">
                <FiExternalLink className="w-4 h-4" /> {t("View Job Page")}
              </Link>
              {job.isBoosted && (
                <span className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 border border-purple-200 shadow-sm">
                  <HiSparkles className="mr-1.5 w-4 h-4" />{t("BOOSTED")}
                </span>
              )}
              {!job.isBoosted && (
                <button 
                  onClick={() => {
                    if (isBoostLimitReached) {
                      toast.error(`Boost limit reached (${aiUsage.usage?.jobBoostJobsLimit}/${aiUsage.limits?.jobBoostJobsLimit}). Please upgrade your plan.`);
                      return;
                    }
                    setBoostModalOpen(true);
                  }}
                  disabled={isBoostLimitReached}
                  className="flex-1 md:flex-none justify-center items-center flex gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
                >
                  <HiSparkles className="w-4 h-4" />{t("Boost Job")}
                </button>
              )}
              <button 
                onClick={handleToggleStatus}
                className="flex-1 md:flex-none justify-center items-center flex gap-1.5 bg-white border border-gray-200 text-orange-600 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-200 hover:shadow-md hover:-translate-y-0.5 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all duration-200"
              >
                <FiPower className="w-4 h-4" /> {job.status === 'active' ? t("Deactivate") : t("Activate")}
              </button>
              <button 
                onClick={handleDeleteJob}
                className="flex-1 md:flex-none justify-center items-center flex gap-1.5 bg-white border border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 hover:shadow-md hover:-translate-y-0.5 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all duration-200"
              >
                <FiTrash2 className="w-4 h-4" /> {t("Delete")}
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-8 mt-8 overflow-x-auto whitespace-nowrap custom-scrollbar pb-0">
            {[
              { id: 'pipeline', label: 'Pipeline' },
              { id: 'details', label: 'Job Details' },
              { id: 'applicants', label: `Applicants (${totalCandidates})` },
              { id: 'analytics', label: 'Job Analytics' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-extrabold border-b-2 transition-all duration-200 relative ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-700' 
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 shadow-[0_-2px_10px_rgba(79,70,229,0.5)]"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'pipeline' && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input 
                type="text" 
                placeholder={t("Search candidates...")} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-indigo-50/30 border-2 border-indigo-100 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm transition-all text-indigo-900 placeholder:text-indigo-300" 
              />
            </div>
          </div>
        </div>

        {/* Kanban Board Container */}
        <div className="flex gap-5 overflow-x-auto pb-6 custom-scrollbar min-h-[500px]">
          {groupedApps.map((col) => (
            <div 
              key={col.id} 
              className={`shrink-0 w-[340px] flex flex-col rounded-2xl border ${col.border} ${col.bg} p-2.5 transition-colors duration-200`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-3">
                <h3 className="font-bold text-gray-900 text-sm">{col.title}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md bg-white border ${col.border} ${col.text}`}>
                  {col.candidates.length}
                </span>
              </div>

              {/* Candidates List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mt-1 min-h-[100px]">
                {col.candidates.length === 0 && (
                  <div className="text-[11px] font-medium text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-xl mx-2">{t("Drop candidates here")}</div>
                )}
                {col.candidates.map((cand) => {
                  const initial = cand.provider?.name ? cand.provider.name.charAt(0).toUpperCase() : 'U';
                  const currentStatusIndex = STATUS_COLUMNS.findIndex(c => c.id === cand.status);
                  
                  return (
                    <div 
                      key={cand._id} 
                      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300 relative group flex flex-col gap-4 overflow-hidden"
                    >
                      {/* Left accent border */}
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-purple-500"></div>
                      
                      {/* Top section: Avatar & Details */}
                      <div className="flex justify-between items-start pl-1 pr-16">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-50 to-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0 border border-indigo-100">
                            {initial}
                          </div>
                          <div className="truncate">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{cand.provider?.name || 'Unknown User'}</h4>
                            <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                              {cand.appliedAt ? formatDistanceToNow(new Date(cand.appliedAt), { addSuffix: true }) : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Move Buttons (Absolute positioned so they don't push content) */}
                      <div className="absolute top-4 right-3 flex items-center gap-1.5">
                        <button 
                          onClick={() => handleMoveCandidate(cand._id, STATUS_COLUMNS[currentStatusIndex - 1].id)}
                          disabled={currentStatusIndex <= 0}
                          className={`p-1.5 rounded-md shadow-sm transition-all duration-200 ${currentStatusIndex <= 0 ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100' : 'bg-white text-red-700 border border-red-100 hover:bg-red-50 hover:border-red-200'}`}
                          title="Move back"
                        >
                          <FiMinus className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleMoveCandidate(cand._id, STATUS_COLUMNS[currentStatusIndex + 1].id)}
                          disabled={currentStatusIndex >= STATUS_COLUMNS.length - 1}
                          className={`p-1.5 rounded-md shadow-sm transition-all duration-200 ${currentStatusIndex >= STATUS_COLUMNS.length - 1 ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200'}`}
                          title="Move forward"
                        >
                          <FiPlus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      {/* Bottom section: Actions & Match */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50 pl-1">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedCandidate(cand)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors text-xs font-semibold shadow-sm" title="View Profile">
                            <FiUser className="w-3.5 h-3.5" /> View
                          </button>
                          <button onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${cand.provider?.email}`, '_blank', 'noopener,noreferrer')} className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors shadow-sm" title="Contact">
                            <FiMessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {cand.aiMatch !== undefined && cand.aiMatch !== null && (
                          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100" title="AI Match Score">
                             <span className="text-[10px] font-bold text-gray-400 uppercase">Match</span>
                             <span className={`text-xs font-bold ${cand.aiMatch >= 80 ? 'text-emerald-600' : cand.aiMatch >= 60 ? 'text-emerald-500' : 'text-amber-500'}`}>{cand.aiMatch}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Panels (Summary) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <SCard className="p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-6">{t("Pipeline Summary")}</h3>
            <div className="flex items-center justify-between">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#E0E7FF" strokeWidth="8" />
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#4F46E5" strokeWidth="8" strokeDasharray="100 0" strokeDashoffset="0" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-medium text-gray-500 leading-none">{t("Total")}</span>
                  <span className="text-xl font-bold text-gray-900 leading-none mt-1">{totalCandidates}</span>
                </div>
              </div>
              <div className="flex-1 ml-6 space-y-2">
                {groupedApps.map((col, i) => {
                  const pct = totalCandidates ? Math.round((col.candidates.length / totalCandidates) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-gray-700">{col.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{col.candidates.length}</span>
                        <span className="text-gray-500 w-8 text-right">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SCard>
          
          <SCard className="p-5">
             <div className="flex items-center justify-between mb-5">
               <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                 <HiSparkles className="text-indigo-600" />{t("AI Recommendations")}</h3>
             </div>
             <div className="space-y-4 mt-2">
               {totalCandidates < 5 && (
                  <div className="flex gap-3 text-xs font-bold text-gray-700">
                    <FiCheckCircle className="text-indigo-500 w-4 h-4 shrink-0" />{t(
                    "Review and refresh your job posting. Try updating the salary bounds to attract more candidates."
                  )}</div>
               )}
               {groupedApps.find(a => a.id === 'applied')?.candidates.length > 0 && (
                  <div className="flex gap-3 text-xs font-bold text-gray-700">
                    <FiCheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />{t(
                    "You have candidates waiting in the Applied stage. Review their AI scores to fast-track them."
                  )}</div>
               )}
               {groupedApps.find(a => a.id === 'contacted')?.candidates.length > 0 && (
                  <div className="flex gap-3 text-xs font-bold text-gray-700">
                    <FiCheckCircle className="text-amber-500 w-4 h-4 shrink-0" />{t("Don't forget to follow up with your Contacted candidates!")}</div>
               )}
             </div>
          </SCard>
        </div>
        </>
        )}

        {activeTab === 'details' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h2 className="text-xl font-extrabold text-gray-900 mb-6">{t("Job Details")}</h2>
            <div className="prose text-sm text-gray-700 max-w-none space-y-4">
              <div className="flex flex-wrap gap-x-8 gap-y-4 p-4 bg-gray-50 rounded-lg border border-gray-100 mb-6 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs mb-0.5">{t("Title")}</span>
                  <span className="font-medium text-gray-900">{job.title}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs mb-0.5">{t("Location")}</span>
                  <span className="font-medium text-gray-900">{job.city || job.location?.city}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs mb-0.5">{t("Work Mode")}</span>
                  <span className="font-medium text-gray-900">{job.workMode}</span>
                </div>
              </div>
              
              <div>
                <p className="font-semibold text-gray-900 mb-2">{t("Description")}</p>
                <div className="whitespace-pre-wrap leading-relaxed text-gray-700">{job.description || 'No description provided.'}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applicants' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">{t("All Applicants")}</h2>
              <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">{applications.length} {t("Total")}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {applications.map(app => {
                const initial = app.provider?.name ? app.provider.name.charAt(0).toUpperCase() : 'U';
                return (
                  <div key={app._id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 relative group flex flex-col h-full overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-700 flex items-center justify-center text-lg font-extrabold shrink-0 border border-indigo-100 shadow-sm">
                        {initial}
                      </div>
                      <div className="truncate pt-1">
                        <h4 className="text-base font-bold text-gray-900 truncate">{app.provider?.name || 'Unknown User'}</h4>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">{t("Applied")} {app.appliedAt ? formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true }) : ''}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="text-xs font-bold capitalize px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 shadow-sm">
                        {app.status}
                      </span>
                      {app.aiMatch !== undefined && app.aiMatch !== null && (
                        <span className="text-xs font-bold px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-gray-700 shadow-sm flex items-center gap-1.5">
                           Match <span className={app.aiMatch >= 80 ? 'text-emerald-600' : app.aiMatch >= 60 ? 'text-emerald-500' : 'text-amber-500'}>{app.aiMatch}%</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-50 flex gap-2">
                      <button onClick={() => setSelectedCandidate(app)} className="flex-1 flex justify-center items-center gap-2 bg-white border border-gray-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">
                        <FiUser className="w-4 h-4" /> View Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {applications.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                <FiUsers className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold text-lg">{t("No applicants yet.")}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SCard className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <FiUsers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t("Total Applicants")}</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCandidates}</p>
                </div>
              </SCard>

              <SCard className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                  <FiTrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t("Shortlisted")}</p>
                  <p className="text-2xl font-bold text-gray-900">{groupedApps.find(a => a.id === 'shortlisted')?.candidates.length || 0}</p>
                </div>
              </SCard>
              
              <SCard className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <FiCheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t("Hired")}</p>
                  <p className="text-2xl font-bold text-gray-900">{groupedApps.find(a => a.id === 'hired')?.candidates.length || 0}</p>
                </div>
              </SCard>

              <SCard className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <FiBarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t("Avg. AI Match")}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalCandidates > 0 
                      ? Math.round(applications.reduce((acc, a) => acc + (a.aiMatch || 0), 0) / totalCandidates) + '%'
                      : 'N/A'
                    }
                  </p>
                </div>
              </SCard>
            </div>

            <SCard className="p-6">
              <h3 className="font-bold text-gray-900 mb-6">{t("Funnel Drop-off")}</h3>
              <div className="space-y-4">
                {groupedApps.map(col => {
                  const pct = totalCandidates ? Math.round((col.candidates.length / totalCandidates) * 100) : 0;
                  return (
                    <div key={col.id}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-semibold text-gray-700">{col.title}</span>
                        <span className="text-gray-500 font-medium">{col.candidates.length}{t("candidates (")}{pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${col.bg.replace('50', '500')}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SCard>
          </div>
        )}
      </div>
      <CandidateProfileModal
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        candidateProfile={selectedCandidate?.provider}
        candidateUser={selectedCandidate?.provider}
      />
      {/* Boost Modal */}
      {boostModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Boost Job Post</h3>
            <p className="text-sm text-gray-700 mb-6">
              Boosting <span className="font-semibold text-gray-700">{job.title}</span> will increase its visibility and reach more candidates.
              Each day of boost costs 1 credit.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Duration (Days)</label>
              <input 
                type="number" 
                min="1" 
                max="30"
                value={boostDays}
                onChange={(e) => setBoostDays(parseInt(e.target.value) || '')}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setBoostModalOpen(false)}
                disabled={isBoosting}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={executeBoost}
                disabled={isBoosting || !boostDays || boostDays <= 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isBoosting && <FiLoader className="w-4 h-4 animate-spin" />}
                Confirm Boost ({boostDays} Credit{boostDays > 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
