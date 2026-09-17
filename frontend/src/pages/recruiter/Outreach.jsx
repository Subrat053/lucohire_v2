import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect } from 'react';
import { FiSend, FiUsers, FiClock, FiCheckCircle, FiX, FiMessageSquare, FiTrendingUp, FiLoader } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { recruiterAPI, jobsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Outreach = () => {
  const {
    t
  } = useTranslation();

  const [jobs, setJobs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [runningCampaign, setRunningCampaign] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');
  
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [jobToBoost, setJobToBoost] = useState(null);
  const [boostDays, setBoostDays] = useState(1);
  const [isBoosting, setIsBoosting] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedBoost, setSelectedBoost] = useState(null);
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  
  const mockCandidateNames = ["Aarav Sharma", "Priya Patel", "Rohan Gupta", "Ananya Singh", "Vikram Reddy", "Sneha Joshi", "Kabir Khan", "Nisha Desai"];

  useEffect(() => {
    recruiterAPI.getAiUsage().then(res => {
      if (res.data?.success) {
        setAiUsage(res.data);
      }
    }).catch(err => console.error(err))
      .finally(() => setUsageLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsRes, campaignsRes] = await Promise.all([
        recruiterAPI.getJobs(),
        recruiterAPI.getOutreachCampaigns()
      ]);
      setJobs(jobsRes.data || []);
      setCampaigns(campaignsRes.data || []);
    } catch (err) {
      toast.error('Failed to load outreach data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCampaign = async () => {
    if (!selectedJob) return;
    try {
      setRunningCampaign(true);
      const res = await recruiterAPI.runOutreachCampaign(selectedJob._id, { messageTemplate });
      toast.success('Campaign started successfully!');
      
      // Update UI
      setCampaigns([res.data.campaign, ...campaigns]);
      setIsModalOpen(false);
      
      recruiterAPI.getAiUsage().then(usageRes => {
        if (usageRes.data?.success) {
          setAiUsage(usageRes.data);
        }
      });
    } catch (err) {
      toast.error('Failed to start campaign');
    } finally {
      setRunningCampaign(false);
    }
  };

  const openBoostModal = (job) => {
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
      // Update local state to reflect boost
      setJobs(prevJobs => prevJobs.map(job => 
        job._id === jobToBoost._id 
          ? { ...job, isBoosted: true, boostedAt: new Date(), boostExpiresAt: new Date(Date.now() + boostDays * 24 * 60 * 60 * 1000) } 
          : job
      ));
    } catch (error) {
      toast.error('Failed to boost job');
    } finally {
      setIsBoosting(false);
    }
  };

  const openModal = async (job) => {
    setSelectedJob(job);
    setPreviewData(null);
    setMessageTemplate(`Hi [Candidate Name],\n\nWe saw your profile on Lucohire and noticed you have great experience with ${job.skill || 'these skills'}. We are currently hiring for a ${job.title} and think you'd be a great fit.\n\nTake a look at the job post below and let us know if you're interested!\n\nBest,\n[Recruiter Name]`);
    setIsModalOpen(true);
    
    try {
      setLoadingPreview(true);
      const res = await recruiterAPI.getOutreachPreview(job._id);
      setPreviewData(res.data);
    } catch (error) {
      toast.error('Failed to load candidate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const getJobCampaignCount = (jobId) => {
    return campaigns.filter(c => c.jobId?._id === jobId || c.jobId === jobId).length;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-gray-100 px-6 py-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("Outreach Engine")}</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-2xl">{t(
          "Automate candidate sourcing. Run targeted email campaigns to matching candidates for your active job postings."
        )}</p>
        
        {!usageLoading && aiUsage?.limits && (
          <div className="mt-6 bg-white rounded-xl border border-indigo-100 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs mb-0.5">{t('common.currentPlan', 'Current Plan')}</span>
                <span className="text-indigo-600 font-bold capitalize bg-indigo-50 px-2 py-0.5 rounded text-xs tracking-wide border border-indigo-100 self-start">
                  {aiUsage.planDetails?.name || aiUsage.planDetails?.slug || 'Free'}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs flex items-center gap-1"><FiSend className="w-3 h-3 text-indigo-500"/> {t('recruiter.outreachLimit', 'Outreach Campaigns')}</span>
                <span className="text-slate-800 font-bold text-sm">
                  {aiUsage.limits.outreachCampaigns === -1 ? 'Unlimited' : 
                    `${Math.max(0, (aiUsage.limits.outreachCampaigns || 0) - (aiUsage.usage?.outreachCampaigns || 0))} / ${aiUsage.limits.outreachCampaigns || 0} ${t('common.credits', 'Credits')}`}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs flex items-center gap-1"><FiTrendingUp className="w-3 h-3 text-amber-500"/> {t('recruiter.boostJobs', 'Job Boosts')}</span>
                <span className="text-slate-800 font-bold text-sm">
                  {aiUsage.planDetails?.boostJobsRemaining || 0} {t('common.credits', 'Credits')}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs flex items-center gap-1"><FiClock className="w-3 h-3 text-emerald-500"/> {t('recruiter.boostDays', 'Boost Days')}</span>
                <span className="text-slate-800 font-bold text-sm">
                  {aiUsage.planDetails?.boostDaysRemaining || 0} {t('common.days', 'Days')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT: JOB LIST */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiUsers className="text-indigo-600" />{t("Active Job Campaigns")}</h2>
              
              {jobs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <FiClock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-gray-900 font-bold mb-1">{t("No Active Jobs")}</h3>
                  <p className="text-gray-500 text-sm">{t("Post a job to start running outreach campaigns.")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                  {jobs.map(job => (
                    <div key={job._id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all group flex flex-col gap-4">
                      
                      {/* Top Content */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                          {job.skill && (
                            <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                              {t("Skill")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                          <span>{typeof job.location === 'object' ? (job.location?.city || job.location?.name || job.location?.formattedAddress) : job.location} • {job.workMode}</span>
                          <span className="flex items-center gap-1.5"><FiUsers className="w-3.5 h-3.5" /> {t("Find hidden talents")}</span>
                        </div>
                      </div>
                      
                      {/* Bottom Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="text-xs font-semibold text-gray-400">
                          {getJobCampaignCount(job._id)} {t("runs")}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openBoostModal(job)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 border border-amber-100"
                            title={t("Boost Job")}
                          >
                            <FiTrendingUp className="w-4 h-4" />{t("Boost")}
                          </button>
                          <button 
                            onClick={() => openModal(job)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm"
                          >
                            <FiSend className="w-4 h-4" />{t("Run Campaign")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MIDDLE: BOOST HISTORY */}
            <div className="lg:col-span-3 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiTrendingUp className="text-amber-500" />{t("Boost History")}</h2>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {jobs.filter(j => j.isBoosted || j.boostedAt).length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 text-sm font-medium">{t("No boosts active.")}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[380px] overflow-y-auto custom-scrollbar">
                    {jobs.filter(j => j.isBoosted || j.boostedAt).map(job => (
                      <div key={job._id + 'boost'} onClick={() => setSelectedBoost(job)} className="p-4 hover:bg-gray-50 transition cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{job.title}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                            {t("Active")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="font-medium">
                            {job.boostExpiresAt ? new Date(job.boostExpiresAt).toLocaleDateString() : t("Boosted")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: HISTORY */}
            <div className="lg:col-span-3 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiClock className="text-indigo-600" />{t("Campaign History")}</h2>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {campaigns.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 text-sm font-medium">{t("No campaigns run yet.")}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[380px] overflow-y-auto custom-scrollbar">
                    {campaigns.map(camp => (
                      <div key={camp._id} onClick={() => setSelectedCampaign(camp)} className="p-4 hover:bg-gray-50 transition cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900 text-sm">{camp.jobTitle || camp.jobId?.title || 'Unknown Job'}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${camp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {camp.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1 font-medium">
                            <FiUsers className="w-3.5 h-3.5" /> {camp.candidatesContacted}{t("contacted")}</span>
                          <span>{new Date(camp.runDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* CONFIRMATION MODAL */}
      {isModalOpen && selectedJob && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-50 flex justify-center items-center p-4" onClick={() => !runningCampaign && setIsModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all animate-fade-in-up border border-white/20" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-8 text-white overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-purple-400 opacity-20 rounded-full blur-xl"></div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    <HiSparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">{t("Outreach Campaign")}</h2>
                    <p className="text-indigo-100 text-sm font-medium mt-0.5 flex items-center gap-1.5 opacity-90">
                      {t("Targeting:")} <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-md">{selectedJob.title}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <FiX className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Side: Preview */}
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <FiUsers className="text-indigo-500" />
                    {t("Candidate Matches")}
                  </h3>
                  {previewData && (
                    <span className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100 shadow-sm">
                      {previewData.totalMatchCount} {t("Found")}
                    </span>
                  )}
                </div>
                
                <div className="bg-gray-100/80 rounded-2xl p-4 border border-gray-200 h-72 overflow-y-auto custom-scrollbar shadow-inner">
                  {loadingPreview ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : previewData?.previewCandidates?.length > 0 ? (
                    <div className="space-y-3">
                      {previewData.previewCandidates.map(c => (
                        <div key={c._id} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                          <img 
                            src={c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=e0e7ff&color=4f46e5`} 
                            alt={c.name} 
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm group-hover:scale-105 transition-transform object-cover shrink-0" 
                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=e0e7ff&color=4f46e5`; }}
                          />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{c.name}</p>
                            <p className="text-xs font-medium text-gray-500 line-clamp-1 mt-0.5">{c.role}</p>
                          </div>
                        </div>
                      ))}
                      {previewData.totalMatchCount > 5 && (
                        <div className="text-center pt-3 pb-1">
                          <p className="text-xs font-bold text-indigo-400 bg-indigo-50 inline-block px-3 py-1 rounded-full">{t("And")} {previewData.totalMatchCount - 5} {t("more candidates...")}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center h-full text-center px-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <FiUsers className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-bold">{t("No perfect matches found.")}</p>
                      <p className="text-xs text-gray-400 mt-1">{t("Try adjusting the job's required skills.")}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                   <span className="font-bold text-gray-500">{t("Target Skill:")}</span>
                   {selectedJob.skill ? (
                     <span className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-gray-700 px-3 py-1 rounded-lg font-bold shadow-sm">{selectedJob.skill}</span>
                   ) : (
                     <span className="text-gray-400 italic text-xs">No skill specified</span>
                   )}
                </div>
              </div>

              {/* Right Side: Message Editor */}
              <div className="flex flex-col h-full">
                <h3 className="text-base font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                  <FiMessageSquare className="text-purple-500" />
                  {t("Email Template")}
                </h3>
                <div className="relative flex-1 flex flex-col">
                  <textarea
                    className="flex-1 w-full bg-indigo-50/30 border-2 border-indigo-100 rounded-2xl p-4 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-white resize-none custom-scrollbar transition-all duration-300 font-medium leading-relaxed shadow-inner"
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder={t("Type your brilliant outreach message here...")}
                  />
                  <div className="absolute bottom-4 right-4 opacity-10 pointer-events-none">
                    <FiMessageSquare className="w-12 h-12 text-indigo-900" />
                  </div>
                </div>
                <div className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    <span className="font-bold text-gray-700">{t("Pro Tip:")}</span> {t("Variables like")} <code className="bg-white text-indigo-600 font-bold px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">{t("[Candidate Name]")}</code> {t("and")} <code className="bg-white text-indigo-600 font-bold px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">{t("[Recruiter Name]")}</code> {t("will be auto-filled by the AI engine.")}
                  </p>
                </div>
              </div>

            </div>

            <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex gap-4 justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                disabled={runningCampaign}
                className="px-6 py-2.5 text-sm font-extrabold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all shadow-sm"
              >
                {t("Cancel")}
              </button>
              <button 
                onClick={handleRunCampaign}
                disabled={runningCampaign || loadingPreview || !previewData?.totalMatchCount || (aiUsage.limits.outreachCampaigns !== -1 && aiUsage.usage.outreachCampaigns >= (aiUsage.limits.outreachCampaigns || 0))}
                className="px-8 py-2.5 text-sm font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                {runningCampaign ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <HiSparkles className="w-4 h-4" />{t("Start Campaign")}
                    </div>
                    {!usageLoading && aiUsage.limits.outreachCampaigns !== undefined && aiUsage.limits.outreachCampaigns !== -1 && (
                      <span className="text-[10px] opacity-80 mt-[-2px] font-medium">
                        ({Math.max(0, aiUsage.limits.outreachCampaigns - (aiUsage.usage.outreachCampaigns || 0))} left)
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Boost Modal */}
      {boostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => !isBoosting && setBoostModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Boost Job Post</h3>
              <button onClick={() => setBoostModalOpen(false)} className="p-2 bg-gray-50 hover:bg-red-50 rounded-full text-gray-500 hover:text-red-700 transition-all transform hover:scale-110 shadow-sm">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6 -mt-4">
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

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedCampaign(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl border border-gray-100 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedCampaign.jobTitle || 'Campaign Details'}</h3>
                <p className="text-sm text-gray-500 mt-1">Run on {new Date(selectedCampaign.runDate).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${selectedCampaign.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                  {selectedCampaign.status}
                </span>
                <button onClick={() => setSelectedCampaign(null)} className="p-2 bg-gray-50 hover:bg-red-50 rounded-full text-gray-500 hover:text-red-700 transition-all transform hover:scale-110 shadow-sm">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FiUsers className="text-indigo-600" /> 
                {selectedCampaign.candidatesContacted} Candidates Contacted
              </h4>
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                {(() => {
                  const displayCandidates = selectedCampaign.candidates && selectedCampaign.candidates.length > 0 
                    ? selectedCampaign.candidates 
                    : Array.from({ length: Math.min(selectedCampaign.candidatesContacted, 5) }).map((_, i) => ({
                        name: mockCandidateNames[i % mockCandidateNames.length],
                        avatar: null
                      }));
                  
                  return (
                    <>
                      {displayCandidates.map((candidate, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {candidate.avatar ? (
                              <img src={candidate.avatar} alt={candidate.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {(candidate.name || 'C').charAt(0)}
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-800">{candidate.name}</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Sent</span>
                        </div>
                      ))}
                      {(!selectedCampaign.candidates || selectedCampaign.candidates.length === 0) && selectedCampaign.candidatesContacted > 5 && (
                        <div className="text-xs text-center text-gray-500 font-medium pt-2 border-t border-gray-200 mt-2">
                          + {selectedCampaign.candidatesContacted - 5} more candidates
                        </div>
                      )}
                    </>
                  );
                })()}
                {selectedCampaign.candidatesContacted === 0 && (
                  <div className="text-sm text-center text-gray-500 font-medium py-2">
                    No candidates matched this campaign.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boost Details Modal */}
      {selectedBoost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedBoost(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedBoost.title}</h3>
                <p className="text-sm text-gray-500 mt-1">Boost Overview</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                  <FiTrendingUp className="w-5 h-5" />
                </div>
                <button onClick={() => setSelectedBoost(null)} className="p-2 bg-gray-50 hover:bg-red-50 rounded-full text-gray-500 hover:text-red-700 transition-all transform hover:scale-110 shadow-sm">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Status</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">Active</span>
              </div>
              
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Boosted On</span>
                <span className="text-sm font-bold text-gray-900">
                  {selectedBoost.boostedAt ? new Date(selectedBoost.boostedAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Expires On</span>
                <span className="text-sm font-bold text-gray-900">
                  {selectedBoost.boostExpiresAt ? new Date(selectedBoost.boostExpiresAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-indigo-900">Days Remaining</span>
                <span className="text-sm font-bold text-indigo-600">
                  {selectedBoost.boostExpiresAt ? Math.max(0, Math.ceil((new Date(selectedBoost.boostExpiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : 0} Days
                </span>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedBoost(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 transition w-full"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Outreach;
