import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  HiSearch, HiFilter, HiOutlineDotsVertical, HiCheckCircle, HiOutlineClock,
  HiLocationMarker, HiOfficeBuilding, HiOutlineChat, HiOutlineCalendar,
  HiLightningBolt, HiOutlineSparkles, HiOutlineExternalLink, HiX
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { providerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TABS = [
  { id: 'all', label: 'All Applications' },
  { id: 'review', label: 'Reviewed' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'hired', label: 'Hired' },
  { id: 'rejected', label: 'Rejected' }
];

const mapStatusToTab = (status) => {
  const s = (status || '').toLowerCase();
  if (['pending', 'applied'].includes(s)) return 'all'; 
  if (['reviewed', 'screening'].includes(s)) return 'review';
  if (['contacted', 'interview'].includes(s)) return 'contacted';
  if (['shortlisted'].includes(s)) return 'shortlisted';
  if (['hired', 'offered'].includes(s)) return 'hired';
  if (['rejected'].includes(s)) return 'rejected';
  return 'all';
};

const getStatusIndex = (status) => {
  const s = (status || '').toLowerCase();
  if (['rejected'].includes(s)) return -1;
  if (['hired', 'offered'].includes(s)) return 5;
  if (['shortlisted'].includes(s)) return 4;
  if (['contacted', 'interview'].includes(s)) return 3;
  if (['reviewed', 'screening'].includes(s)) return 2;
  return 1; // default to applied
};

const STEPS = ['Applied', 'Reviewed', 'Contacted', 'Shortlisted', 'Hired'];

export default function AppliedJobs() {
  const {
    t
  } = useTranslation();

  const [activeTab, setActiveTab] = useState('all');
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    providerAPI.getApplications()
      .then(r => setApps(r.data?.applications || []))
      .catch(() => toast.error("Failed to load applications"))
      .finally(() => setLoading(false));
  }, []);

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const mapped = mapStatusToTab(app.status);
      const matchesTab = activeTab === 'all' || mapped === activeTab;
      const term = search.toLowerCase();
      const matchesSearch = !term || 
        app.jobPost?.title?.toLowerCase().includes(term) ||
        app.jobPost?.companyName?.toLowerCase().includes(term);
      return matchesTab && matchesSearch;
    });
  }, [apps, activeTab, search]);

  const counts = useMemo(() => {
    const c = { all: apps.length, review: 0, contacted: 0, shortlisted: 0, hired: 0, rejected: 0 };
    apps.forEach(app => {
      const tab = mapStatusToTab(app.status);
      if (tab !== 'all' && c[tab] !== undefined) c[tab]++;
    });
    return c;
  }, [apps]);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-4 md:p-6 xl:p-8">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Content Area */}
        <div className="flex-1 min-w-0">
          
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">{t("Applied Jobs")}<span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {counts.all}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t("Track your applications and stay updated")}
              <br className="sm:hidden" />
              {t("on their progress")}
            </p>
          </div>
          
          {/* Tabs & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-sm font-semibold pb-2 whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'text-emerald-700 border-emerald-600' 
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  {tab.label} ({counts[tab.id] || 0})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                {t("Sort by")}
                <div className="relative">
                  <select className="bg-white border border-slate-200 rounded-md sm:rounded-lg pl-2 pr-6 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none">
                    <option>{t("Recently Applied")}</option>
                    <option>{t("Status Updates")}</option>
                  </select>
                  <div className="absolute inset-y-0 right-1.5 flex items-center pointer-events-none">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {filteredApps.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">{t("No applications found in this category.")}</p>
              </div>
            ) : (
              filteredApps.map((app, index) => {
                const job = app.jobPost || {};
                const statusIndex = getStatusIndex(app.status);
                const isRejected = statusIndex === -1;
                
                // Determine pill color and label
                let statusLabel = 'Applied';
                let statusColor = 'bg-blue-50 text-blue-600';
                if (statusIndex === 2) { statusLabel = 'In Review'; statusColor = 'bg-indigo-50 text-indigo-600'; }
                if (statusIndex === 3) { statusLabel = 'Interview'; statusColor = 'bg-orange-50 text-orange-600'; }
                if (statusIndex === 4) { statusLabel = 'Offered'; statusColor = 'bg-emerald-50 text-emerald-700'; }
                if (isRejected) { statusLabel = 'Rejected'; statusColor = 'bg-red-50 text-red-600'; }

                // Mock AI stats if not present
                const aiChance = [78, 65, 88, 90][index % 4];
                const aiLabel = ['Good Chance', 'Average Chance', 'High Chance', 'Excellent'][index % 4];

                return (
                  <div key={app._id || index} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative">
                    <div className="flex flex-col lg:flex-row gap-6">
                      
                      {/* Left: Job Info */}
                      <div className="flex flex-col gap-4 min-w-[200px] xl:min-w-[240px]">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {job.companyLogo ? (
                              <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-extrabold text-xl text-slate-800 capitalize">
                                {(job.companyName || 'CO').substring(0,2)}
                              </span>
                            )}
                          </div>
                          <div className="pt-0.5">
                            <h3 className="font-bold text-slate-900 text-[15px] leading-tight">{job.title || 'Job Title'}</h3>
                            <div className="flex items-center gap-1 text-[13px] font-medium text-slate-600 mt-1">
                              {job.companyName || job.recruiter?.name || 'Company Name'}
                              <HiCheckCircle className="text-blue-500 w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2.5 mt-2 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5"><HiLocationMarker className="w-3.5 h-3.5 text-slate-400" /> {job.city || 'Remote'}{job.state ? `, ${job.state}` : ''} ({job.workMode || 'Hybrid'})</span>
                          <span className="flex items-center gap-1.5"><HiOutlineCalendar className="w-3.5 h-3.5 text-slate-400" />{t("Applied on")} {new Date(app.appliedAt || app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>

                      {/* Middle: Progress Tracker & AI Stats */}
                      <div className="flex-1 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                        <div className="flex items-center gap-3 mb-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor}`}>
                            {statusLabel}
                          </span>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {isRejected ? 'This application was not successful.' : 
                             statusIndex === 5 ? 'Congratulations! You have an offer.' :
                             statusIndex === 4 ? 'Great! You have been shortlisted.' :
                             statusIndex === 3 ? 'You are invited for an interview.' :
                             statusIndex === 2 ? 'Your application is being screened.' :
                             'Your application is under review.'}
                          </p>
                        </div>
                        
                        {/* Horizontal Stepper */}
                        <div className="relative mt-2 mb-8">
                          <div className="flex w-full items-center justify-between text-[10px] font-bold">
                            {STEPS.map((step, idx) => {
                              const stepNum = idx + 1;
                              const isCompleted = !isRejected && statusIndex >= stepNum;
                              const isCurrent = !isRejected && statusIndex === stepNum;
                              const isFailed = isRejected && statusIndex === -1 && idx === 0;
                              
                              return (
                                <div key={step} className="flex flex-col items-center gap-2 relative z-10 w-8">
                                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 ${
                                    isFailed ? 'bg-white border-red-500' :
                                    isCompleted ? 'bg-emerald-500 border-emerald-500' : 
                                    isCurrent ? 'bg-white border-blue-600' : 
                                    'bg-white border-slate-300'
                                  }`}>
                                    {isCompleted && <HiCheckCircle className="w-3.5 h-3.5 text-white shrink-0 absolute" />}
                                    {isFailed && <HiX className="w-2.5 h-2.5 text-red-700 shrink-0 absolute" />}
                                  </div>
                                  <span className={`absolute top-6 text-center left-1/2 -translate-x-1/2 w-16 text-[9px] xl:text-[10px] leading-tight ${isCurrent || isCompleted ? 'text-slate-800' : isFailed ? 'text-red-600' : 'text-slate-400'}`}>
                                    {step}
                                  </span>
                                </div>
                              );
                            })}
                            
                            {/* Connecting Lines Container (Absolute positioned behind circles) */}
                            <div className="absolute top-[6px] left-4 right-4 h-0.5 flex z-0">
                               {STEPS.slice(0, -1).map((_, idx) => {
                                 const stepNum = idx + 1;
                                 const isPassed = !isRejected && statusIndex > stepNum;
                                 return (
                                   <div key={idx} className={`flex-1 h-full ${isPassed ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                 );
                               })}
                            </div>
                          </div>
                        </div>

                        {/* AI Stats / Job Snapshot */}
                        <div className="grid grid-cols-2 gap-4 mt-auto">
                          {isRejected ? (
                            <div className="col-span-2">
                              <span className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">{t("Feedback")}</span>
                              <span className="text-[13px] font-medium text-slate-700">{t("Not a match for this role.")}</span>
                            </div>
                          ) : (
                            <>
                              <div>
                                <span className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">AI {statusIndex >= 3 ? 'Match Score' : 'Interview Chance'}</span>
                                <div className="flex items-center gap-2 text-[13px] font-bold text-emerald-600">
                                  {aiChance}% <span className="text-[11px] font-medium text-slate-600">{aiLabel}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">
                                  {statusIndex === 5 ? 'Offered Salary' : statusIndex >= 3 ? 'Next Step' : 'Expected Response'}
                                </span>
                                <span className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
                                  {statusIndex === 5 ? '$' + (job.salary || 'Negotiable') : statusIndex >= 3 ? 'Technical Round' : 'Within 3 Days'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="shrink-0 w-full lg:w-40 flex flex-row lg:flex-col items-center justify-center lg:items-stretch gap-3 lg:gap-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 mt-4 lg:mt-0">
                        <Link to={`/provider/job/${job._id}`} className="flex-1 lg:flex-none text-center py-2.5 lg:py-2 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm">View Job</Link>
                        <Link to={`/provider/application-success/${app._id}`} state={{ job, application: app }} className="flex-1 lg:flex-none text-center py-2.5 lg:py-2 px-4 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition shadow-sm">View Application</Link>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Pagination Mock */}
          {filteredApps.length > 0 && (
            <div className="flex items-center justify-between mt-8 text-sm text-slate-500">
              <span>{t("Showing 1 to")}{Math.min(5, filteredApps.length)}{t("of")}{filteredApps.length}{t("applications")}</span>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">&lt;</button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-emerald-600 text-white font-bold">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">3</button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">&gt;</button>
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-[320px] shrink-0 space-y-4">
          
          {/* AI Application Overview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">AI Application Overview</h3>
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded flex items-center justify-center text-xs font-bold">AI</span>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-[72px] h-[72px] shrink-0 relative">
                {(() => {
                  const progressPercent = Math.round(((counts.review + counts.contacted + counts.shortlisted + counts.hired) / (counts.all || 1)) * 100) || 0;
                  const getProgressText = (percent) => {
                    if (percent >= 80) return { title: "Excellent Progress", desc: "You're doing great! Keep applying to increase your chances.", color: '#10b981', trail: '#ecfdf5' };
                    if (percent >= 50) return { title: "Good Progress", desc: "You are on the right track. Keep pushing forward.", color: '#3b82f6', trail: '#eff6ff' };
                    if (percent >= 20) return { title: "Getting Started", desc: "Your applications are moving. Keep building momentum!", color: '#f59e0b', trail: '#fffbeb' };
                    return { title: "Keep Applying", desc: "Apply to more jobs to increase your chances of getting hired.", color: '#64748b', trail: '#f8fafc' };
                  };
                  const progressData = getProgressText(progressPercent);
                  
                  return (
                    <>
                      <CircularProgressbar 
                        value={progressPercent} 
                        styles={buildStyles({
                          pathColor: progressData.color,
                          trailColor: progressData.trail,
                          strokeLinecap: 'round',
                        })} 
                      />
                      <span className="absolute inset-0 flex items-center justify-center font-bold text-slate-800 text-lg">
                        {progressPercent}%
                      </span>
                    </>
                  );
                })()}
              </div>
              <div>
                {(() => {
                  const progressPercent = Math.round(((counts.review + counts.contacted + counts.shortlisted + counts.hired) / (counts.all || 1)) * 100) || 0;
                  const getProgressText = (percent) => {
                    if (percent >= 80) return { title: "Excellent Progress", desc: "You're doing great! Keep applying to increase your chances." };
                    if (percent >= 50) return { title: "Good Progress", desc: "You are on the right track. Keep pushing forward." };
                    if (percent >= 20) return { title: "Getting Started", desc: "Your applications are moving. Keep building momentum!" };
                    return { title: "Keep Applying", desc: "Apply to more jobs to increase your chances of getting hired." };
                  };
                  const progressData = getProgressText(progressPercent);
                  return (
                    <>
                      <p className="font-bold text-slate-800 text-sm">{progressData.title}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{progressData.desc}</p>
                    </>
                  );
                })()}
              </div>
            </div>

            {(() => {
              let cApplied = 0, cReviewed = 0, cContacted = 0, cShortlisted = 0, cHired = 0;
              apps.forEach(app => {
                const idx = getStatusIndex(app.status);
                if (idx === 1) cApplied++;
                else if (idx === 2) cReviewed++;
                else if (idx === 3) cContacted++;
                else if (idx === 4) cShortlisted++;
                else if (idx === 5) cHired++;
              });
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600 font-medium"><HiCheckCircle className="text-emerald-500 w-4 h-4" /> Applied</span>
                    <span className="font-bold text-slate-800">{cApplied}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600 font-medium"><HiCheckCircle className="text-emerald-500 w-4 h-4" /> Reviewed</span>
                    <span className="font-bold text-slate-800">{cReviewed}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600 font-medium"><HiCheckCircle className="text-emerald-500 w-4 h-4" /> Contacted</span>
                    <span className="font-bold text-slate-800">{cContacted}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600 font-medium"><HiCheckCircle className="text-emerald-500 w-4 h-4" /> Shortlisted</span>
                    <span className="font-bold text-slate-800">{cShortlisted}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600 font-medium"><HiCheckCircle className="text-emerald-500 w-4 h-4" /> Hired</span>
                    <span className="font-bold text-slate-800">{cHired}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Stay Updated on WhatsApp */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#075E54]/10 flex items-center justify-center">
                <FaWhatsapp className="w-5 h-5 text-[#075E54]" />
              </div>
              <h3 className="font-bold text-slate-900">Stay Updated on WhatsApp</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">Get real-time updates about your applications, interviews & job alerts.</p>
            
            <ul className="space-y-2 mb-4 text-xs font-medium text-slate-600">
              <li className="flex items-center gap-2"><HiCheckCircle className="text-emerald-500 w-3.5 h-3.5" /> Application status updates</li>
              <li className="flex items-center gap-2"><HiCheckCircle className="text-emerald-500 w-3.5 h-3.5" /> Interview reminders</li>
              <li className="flex items-center gap-2"><HiCheckCircle className="text-emerald-500 w-3.5 h-3.5" /> New job matches</li>
            </ul>
            
            <button 
              onClick={() => setWhatsappEnabled(!whatsappEnabled)}
              className={`w-full text-xs font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 transition shadow-sm border ${
                whatsappEnabled 
                  ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100' 
                  : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {whatsappEnabled ? (
                <>Updates Enabled <HiCheckCircle className="w-4 h-4 text-emerald-500" /></>
              ) : (
                <>Enable WhatsApp Updates <FaWhatsapp className="w-4 h-4 text-emerald-500" /></>
              )}
            </button>
          </div>

          {/* Need Help? */}
          <div className="bg-emerald-100 rounded-2xl border border-emerald-200 p-5 shadow-sm relative overflow-hidden flex items-center gap-4 text-emerald-950">
             <div className="flex-1 relative z-10">
               <h3 className="font-bold text-sm mb-1">Need Help?</h3>
               <p className="text-[11px] font-medium text-emerald-800 mb-3 leading-relaxed">Chat with us on WhatsApp.<br/>We're here to help you 9 AM - 9 PM</p>
               <button onClick={() => toast('Feature in progress')} className="text-[11px] font-bold text-white bg-[#0f766e] border border-[#0b5952] rounded-lg px-4 py-2 flex items-center gap-1.5 hover:bg-[#0b5952] shadow-sm transition w-fit">
                 Chat Now on WhatsApp <FaWhatsapp className="w-4 h-4 text-white" />
               </button>
             </div>
             <div className="w-[80px] shrink-0 flex items-end justify-end pt-2 relative z-10">
                <div className="w-16 h-16 rounded-full bg-emerald-200/60 flex items-center justify-center">
                  <span className="text-3xl">👩‍💼</span>
                </div>
             </div>
             {/* Decorative circles */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full translate-y-1/2 -translate-x-1/4"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
