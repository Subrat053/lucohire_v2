import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCalendar, FiUsers, FiCheckSquare, FiUserPlus,
  FiMessageSquare, FiTrendingUp,
  FiChevronDown, FiChevronRight, FiCheckCircle,
  FiAlertCircle, FiMoreVertical, FiClock, FiCode, FiArrowRight, FiPaperclip,
  FiMail, FiMessageCircle
} from 'react-icons/fi';
import { HiSparkles, HiBriefcase } from 'react-icons/hi2';
import { HiBookmark } from 'react-icons/hi';
import { recruiterAPI, notificationAPI, aiAPI } from "../../services/api";

const timeAgo = (date) => {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

const PriorityBadge = ({ priority }) => {
  const colors = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-orange-100 text-orange-700',
    Low: 'bg-emerald-100 text-emerald-700'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[priority] || 'bg-gray-100 text-gray-700'}`}>
      {priority || 'Medium'}
    </span>
  );
};

const DashboardTaskCard = ({ task, jobs, t }) => {
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const associatedJob = jobs.find(j => j._id === task.jobId);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col gap-3 h-full">
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center flex-wrap">
          <PriorityBadge priority={task.priority} />
          {task.aiSuggested && (
            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              <HiSparkles className="w-3 h-3" />{t("AI Pick")}</span>
          )}
        </div>
      </div>
      <h4 className="text-sm font-bold text-gray-900 leading-snug">{task.title}</h4>
      {(task.candidateName || associatedJob) && (
        <div className="flex items-center gap-2 mt-1">
          {task.candidateName && (
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0">
              {getInitials(task.candidateName)}
            </div>
          )}
          <div className="text-xs font-medium text-gray-700 truncate">
            {task.candidateName ? `${task.candidateName} ` : ''}
            {associatedJob && (
              <>
                <span className="text-gray-400 font-normal">{t("for")}</span> <span className="font-semibold text-gray-700">{associatedJob.title}</span>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 text-gray-500">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <FiCalendar className="w-3.5 h-3.5" />
          <span className={task.dueDate === 'Today' ? 'text-orange-600 font-bold' : ''}>{task.dueDate}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          {task.comments > 0 && (
            <div className="flex items-center gap-1">
              <FiMessageSquare className="w-3.5 h-3.5" /> {task.comments}
            </div>
          )}
          {task.attachments > 0 && (
            <div className="flex items-center gap-1">
              <FiPaperclip className="w-3.5 h-3.5" /> {task.attachments}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { t } = useTranslation();
  const [prioritiesCollapsed, setPrioritiesCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs');
  
  const [activeJobs, setActiveJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [shortlistedCount, setShortlistedCount] = useState(0);
  
  const [aiInsights, setAiInsights] = useState([]);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(true);
  
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recruiterAPI.getAiUsage().then(res => {
      if (res.data?.success) {
        setAiUsage({ limits: res.data.limits || {}, usage: res.data.usage || {} });
      }
    }).catch(err => console.error(err))
      .finally(() => setUsageLoading(false));
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [jobsRes, tasksRes, notifRes, shortlistRes] = await Promise.all([
        recruiterAPI.getJobPostings().catch(() => ({ data: [] })),
        recruiterAPI.getTasks().catch(() => ({ data: [] })),
        notificationAPI.getMyNotifications({ page: 1, limit: 5 }).catch(() => ({ data: { notifications: [] }})),
        recruiterAPI.getShortlistedCandidates().catch(() => ({ data: [] }))
      ]);
      
      setActiveJobs(Array.isArray(jobsRes?.data) ? jobsRes.data : jobsRes?.data?.jobs || []);
      setTasks(Array.isArray(tasksRes?.data) ? tasksRes.data : tasksRes?.data?.tasks || []);
      const notifData = notifRes?.data?.notifications || notifRes?.data?.data || [];
      setNotifications(Array.isArray(notifData) ? notifData : []);
      
      const shortlistData = shortlistRes?.data?.shortlisted || shortlistRes?.data?.candidates || (Array.isArray(shortlistRes?.data) ? shortlistRes.data : []);
      setShortlistedCount(shortlistData.length || 0);

      // Fetch dynamic insights
      recruiterAPI.getDashboardInsights()
        .then(res => {
          try {
            if (res.data && res.data.success && Array.isArray(res.data.insights) && res.data.insights.length > 0) {
              setAiInsights(res.data.insights.map((item, i) => ({
                ...item,
                icon: i === 0 ? FiTrendingUp : i === 1 ? FiClock : FiCode
              })));
            }
          } catch (e) {
            console.error('Failed to parse AI insights. Error:', e, 'Response:', res.data);
          }
        }).catch(err => {
          console.error('Failed to fetch AI insights API error:', err);
        }).finally(() => {
          setAiInsightsLoading(false);
        });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const topStats = {
    jobs: activeJobs.length,
    candidates: activeJobs.reduce((acc, job) => acc + (job.interestedCount || 0), 0),
    shortlisted: shortlistedCount,
    aiTasks: tasks.filter(t => t.aiSuggested).length || tasks.length,
    pendingTasks: tasks.filter(t => t.status !== 'done').length || 0,
    interviews: activeJobs.reduce((acc, job) => acc + (job.candidates?.filter(c => c.status === 'interview').length || 0), 0),
    offers: activeJobs.reduce((acc, job) => acc + (job.candidates?.filter(c => c.status === 'offer' || c.status === 'hired').length || 0), 0),
  };

  const getMatchScore = (job) => {
    if (job.matchScore) return job.matchScore;
    const hash = String(job._id || job.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 65 + (hash % 31);
  };

  const TYPE_ICON = {
    JOB_POSTED: 'bg-indigo-500',
    NEW_LEAD: 'bg-emerald-500',
    CONTACT_UNLOCKED: 'bg-cyan-500',
    PROFILE_VIEWED: 'bg-blue-500',
    PLAN_PURCHASED: 'bg-purple-500',
    PLAN_EXPIRY_REMINDER: 'bg-red-500',
    ADMIN_ALERT: 'bg-slate-500',
  };

  // eslint-disable-next-line react/prop-types
  const StatBox = ({ title, count, actionText, actionLink, icon: Icon, colorClass, bgClass }) => (

    <div className="bg-white rounded-[2rem] border border-gray-100 p-5 shadow-sm flex flex-col hover:shadow-md transition h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgClass}`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <span className="text-sm font-semibold text-gray-700">{title}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-4">{count}</div>
      <Link to={actionLink} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-auto">
        {actionText} <FiChevronRight />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t("Hiring Workspace")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("Here's your hiring workspace. Let's get things done!")}</p>
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* ROW 1: Top Metrics & Priorities + AI Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Top Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatBox 
                title="My Active Jobs" count={topStats.jobs} 
                actionText="View all jobs" actionLink="/recruiter/jobs"
                icon={HiBriefcase} bgClass="bg-indigo-700" colorClass="text-white"
              />
              <StatBox 
                title="Shortlisted Candidates" count={topStats.shortlisted} 
                actionText="View list" actionLink="/recruiter/shortlisted-candidates"
                icon={HiBookmark} bgClass="bg-blue-700" colorClass="text-white"
              />
              <StatBox 
                title="Set Reminders" count={topStats.aiTasks} 
                actionText="See suggestions" actionLink="/recruiter/tasks"
                icon={HiSparkles} bgClass="bg-emerald-700" colorClass="text-white"
              />
            </div>

            {/* Today's Priorities */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{t("Today's Priorities")}</h2>
                  <FiAlertCircle className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
                  <button onClick={() => setPrioritiesCollapsed(!prioritiesCollapsed)} className="flex items-center gap-1 hover:text-indigo-600 ml-2">
                    {prioritiesCollapsed ? 'Expand' : 'Collapse'} {prioritiesCollapsed ? <FiChevronDown /> : <FiChevronRight className="-rotate-90" />}
                  </button>
                </div>
              </div>
              {!prioritiesCollapsed && (
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 p-2">
                  <div className="p-4 text-center flex flex-col items-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
                        <FiUserPlus className="text-emerald-600 w-4 h-4" />
                      </div>
                      <div className="text-xs text-gray-900 font-bold">{t("New Applications")}</div>
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-2">{topStats.candidates || 0}</div>
                    <Link to="/recruiter/jobs" className="text-xs font-bold text-indigo-600 hover:underline mt-auto">{t("View application list →")}</Link>
                  </div>
                  <div className="p-4 text-center flex flex-col items-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                        <FiCalendar className="text-blue-600 w-4 h-4" />
                      </div>
                      <div className="text-xs text-gray-900 font-bold">{t("Interviews")}</div>
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-2">{topStats.interviews || 0}</div>
                    <Link to="/recruiter/interviews" className="text-xs font-bold text-indigo-600 hover:underline mt-auto">{t("View schedule →")}</Link>
                  </div>
                  <div className="p-4 text-center flex flex-col items-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center">
                        <FiCheckSquare className="text-orange-600 w-4 h-4" />
                      </div>
                      <div className="text-xs text-gray-900 font-bold">{t("Offers")}</div>
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-2">{topStats.offers || 0}</div>
                    <Link to="/recruiter/offers" className="text-xs font-bold text-indigo-600 hover:underline mt-auto">{t("View offers →")}</Link>
                  </div>
                  <div className="p-4 text-center flex flex-col items-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
                        <FiMessageSquare className="text-purple-600 w-4 h-4" />
                      </div>
                      <div className="text-xs text-gray-900 font-bold">{t("Follow-ups")}</div>
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-2">{topStats.pendingTasks}</div>
                    <Link to="/recruiter/tasks" className="text-xs font-bold text-indigo-600 hover:underline mt-auto">{t("Respond now →")}</Link>
                  </div>
                </div>
              )}
            </div>


          </div>

          {/* Right Column (1/3 width) - AI Insights */}
          <div className="bg-gradient-to-b from-indigo-50/50 to-white rounded-2xl border border-indigo-100 shadow-sm p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <HiSparkles className="w-5 h-5 text-indigo-500" />
                {t("Luco AI Insights")}
              </h2>
            </div>
            
            <div className="flex-1 flex flex-col justify-center space-y-4 mb-4 relative">
              {aiInsightsLoading ? (
                <>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 shrink-0"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : aiInsights.length > 0 ? (
                aiInsights.map((insight, idx) => {
                  const Icon = insight.icon || FiTrendingUp;
                  return (
                    <div key={idx} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full bg-${insight.color || 'indigo'}-50 text-${insight.color || 'indigo'}-600 flex items-center justify-center shrink-0 border border-${insight.color || 'indigo'}-100`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 mb-0.5">{t(insight.title)}</h4>
                        <p className="text-[11px] font-medium text-gray-500">{t(insight.desc)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 text-center">{t("No insights available at the moment.")}</div>
              )}
            </div>
            
            <div className="text-center mt-auto pt-2">
              <Link to="/recruiter/ai" className="text-sm font-bold text-indigo-600 hover:underline flex items-center justify-center gap-1">{t("View AI Workspace →")}</Link>
            </div>
          </div>
        </div>

        {/* ROW 2: Active Jobs + Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* My Active Jobs */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{t("My Active Jobs")}</h2>
              <Link to="/recruiter/jobs" className="text-sm font-semibold text-indigo-600 hover:underline">{t("View all jobs →")}</Link>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-2 pr-2">{t("Job Title")}</th>
                    <th className="py-2 px-2 text-center">{t("Applicants")}</th>
                    <th className="py-2 px-2 text-center">{t("Interviews")}</th>
                    <th className="py-2 px-2 text-center">{t("AI Health")}</th>
                    <th className="py-2 pl-2 text-center">{t("Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeJobs.map((job, i) => (
                    <tr key={job._id || job.id || i} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 pr-2 font-bold text-gray-900 text-xs whitespace-nowrap">{job.title}</td>
                      <td className="py-3 px-2 text-center font-bold text-gray-900 text-xs">{job.interestedCount || 0}</td>
                      <td className="py-3 px-2 text-center font-bold text-gray-900 text-xs">{job.interviews || 0}</td>
                      <td className="py-3 px-2 text-center">
                        <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full border-2 text-[10px] font-bold relative mx-auto ${getMatchScore(job) >= 85 ? 'border-emerald-400 text-emerald-600' : 'border-orange-400 text-orange-600'}`}>
                          {getMatchScore(job)}%
                        </div>
                      </td>
                      <td className="py-3 pl-2 text-center whitespace-nowrap flex items-center gap-1 justify-center">
                        <span className={`inline-flex items-center text-[10px] font-bold ${job.status === 'published' || job.status === 'Active' ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {job.status === 'published' ? 'Active' : job.status || 'Active'}
                        </span>
                        <FiMoreVertical className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                      </td>
                    </tr>
                  ))}
                  {activeJobs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-sm text-gray-500">
                        No active jobs right now. Create one to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 text-center shrink-0">
              <Link to="/recruiter/post-job" className="text-sm font-bold text-indigo-600 flex items-center justify-center gap-1 hover:underline">{t("+ Create New Job")}</Link>
            </div>
          </div>

          {/* Notifications */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{t("Notifications")}</h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {notifications.slice(0, 5).map((n) => (
                <div key={n._id || Math.random()} className="flex items-start gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0 pt-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${TYPE_ICON[n.type] || 'bg-indigo-500'}`}></div>
                  <div className="flex-1 flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-800 leading-snug">{n.title || n.message}</div>
                    <div className="text-[10px] font-bold text-gray-400 shrink-0">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))}
              {(!notifications || notifications.length === 0) && (
                <div className="text-center text-sm text-gray-500 py-4">
                  No recent notifications
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 3: Follow-ups Pending */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* Hiring Snapshot */}
          {/* Follow-ups Pending */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">{t("Follow-ups Pending")}</h2>
              <Link to="/recruiter/tasks" className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700 transition">
                {t("View all")} <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-5">
              {tasks.filter(t => t.status !== 'done').slice(0, 5).map((task, idx) => {
                const iconStyle = idx % 3 === 0 
                  ? "bg-purple-50 text-purple-600 border-purple-100" 
                  : idx % 3 === 1 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : "bg-orange-50 text-orange-600 border-orange-100";
                const Icon = idx % 3 === 0 ? FiMail : idx % 3 === 1 ? FiMessageCircle : FiCalendar;
                const actionLabel = idx % 3 === 0 ? "Respond" : idx % 3 === 1 ? "Reply" : "Provide Feedback";

                return (
                  <div key={task._id || idx} className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${iconStyle}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 mb-0.5">{task.title}</div>
                        <div className="text-xs font-medium text-gray-500">
                          {task.candidateName ? `Candidate: ${task.candidateName}` : (task.dueDate ? `Due: ${task.dueDate}` : 'Pending action')}
                        </div>
                      </div>
                    </div>
                    <Link to="/recruiter/tasks" className="px-4 py-2 rounded-lg border border-gray-200 text-indigo-700 bg-white text-xs font-bold hover:bg-gray-50 transition shadow-sm">
                      {actionLabel}
                    </Link>
                  </div>
                );
              })}
              
              {(!tasks || tasks.filter(t => t.status !== 'done').length === 0) && (
                <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
                  {t("No pending follow-ups or tasks right now. You're all caught up!")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
