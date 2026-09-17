import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect } from 'react';
import { FiUsers, FiAward, FiChevronDown, FiChevronUp, FiLoader, FiUser, FiMapPin, FiBriefcase } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { recruiterAPI } from '../../services/api';
import toast from 'react-hot-toast';
import CandidateProfileModal from '../../components/recruiter/CandidateProfileModal';

const TalentPool = () => {
  const {
    t
  } = useTranslation();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [runningAI, setRunningAI] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await recruiterAPI.getTalentPoolJobs();
      setJobs(res.data?.data || []);
      if (res.data?.data?.length > 0) {
        setExpandedJobId(res.data.data[0]._id); // Expand first job by default
      }
    } catch (err) {
      toast.error('Failed to load talent pool data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAI = async (jobId, e) => {
    e.stopPropagation();
    try {
      setRunningAI(jobId);
      await recruiterAPI.runAIEvaluation(jobId);
      toast.success('AI Analysis complete!');
      await fetchData(); // Refresh data to show new scores
      
      recruiterAPI.getAiUsage().then(usageRes => {
        if (usageRes.data?.success) {
          setAiUsage({ limits: usageRes.data.limits || {}, usage: usageRes.data.usage || {} });
        }
      });
    } catch (err) {
      toast.error('Failed to run AI analysis');
    } finally {
      setRunningAI(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-gray-100 px-6 py-8">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">{t("AI Talent Pool")}<HiSparkles className="text-indigo-600 w-8 h-8" />
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">{t(
            "Automatically rank and evaluate the top candidates for every job you post using Lucohire's AI Matching Engine."
          )}</p>
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-900 font-bold mb-1">{t("No Jobs Found")}</h3>
            <p className="text-gray-500 text-sm">{t("Post a job to start building your AI-ranked talent pool.")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map(job => {
              const isExpanded = expandedJobId === job._id;
              const hasCandidates = job.candidates && job.candidates.length > 0;
              const topCandidates = job.aiTopCandidates || [];
              const hasEvaluations = topCandidates.length > 0;

              return (
                <div key={job._id} className={`bg-white rounded-2xl border ${isExpanded ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-gray-200 shadow-sm'} transition-all overflow-hidden`}>
                  {/* ACCORDION HEADER */}
                  <div 
                    onClick={() => setExpandedJobId(isExpanded ? null : job._id)}
                    className="p-6 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">{typeof job.location === 'object' ? (job.location?.city || job.location?.name || job.location?.formattedAddress || 'Remote') : (job.location || 'Remote')}</span>
                        <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {job.candidates?.length || 0}{t("Total Applicants")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {job.candidates?.length > topCandidates.length && (
                        <button 
                          onClick={(e) => handleRunAI(job._id, e)}
                          disabled={runningAI === job._id || (aiUsage.limits.aiJdParsing !== -1 && aiUsage.usage.aiJdParsing >= (aiUsage.limits.aiJdParsing || 0))}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition flex flex-col items-center justify-center gap-0.5"
                        >
                          {runningAI === job._id ? (
                            <div className="flex items-center gap-2"><FiLoader className="w-4 h-4 animate-spin" />{t("Analyzing...")}</div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <HiSparkles className="w-4 h-4" />{t("Run AI Analysis")}
                              </div>
                              {!usageLoading && aiUsage.limits.aiJdParsing !== undefined && aiUsage.limits.aiJdParsing !== -1 && (
                                <span className="text-[10px] opacity-80 mt-[-2px] font-medium">
                                  ({Math.max(0, aiUsage.limits.aiJdParsing - (aiUsage.usage.aiJdParsing || 0))} left)
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      )}
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </div>
                    </div>
                  </div>
                  {/* EXPANDED CONTENT - AI TOP 5 */}
                  {isExpanded && (
                    <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                      
                      {!hasCandidates ? (
                        <div className="text-center py-8 text-gray-500 text-sm font-medium">{t("No candidates have applied for this job yet.")}</div>
                      ) : (
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-6">
                            <FiUsers className="text-indigo-500 w-5 h-5" /> {job.candidates.length}{t("Candidates")}</h3>
                          
                          <div className="grid grid-cols-1 gap-4">
                            {job.candidates.map((candidateInfo, index) => {
                              const providerProfile = candidateInfo.providerProfile;
                              if (!providerProfile) return null;
                              const candidateUser = providerProfile.user;
                              if (!candidateUser) return null;
                              
                              // Check if there is an AI evaluation for this candidate
                              const evaluation = topCandidates.find(e => e.candidateId?._id === providerProfile._id);
                              const isParsingLimitReached = !usageLoading && aiUsage.limits.aiJdParsing !== -1 && aiUsage.usage.aiJdParsing >= (aiUsage.limits.aiJdParsing || 0);

                              return (
                                <div key={providerProfile._id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row gap-6 shadow-sm hover:shadow-md transition">
                                  {/* Left: Candidate Info & Score */}
                                  <div className="flex flex-col md:w-1/4 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6 shrink-0">
                                    <div className="flex items-center gap-4 mb-4">
                                      {candidateUser.profilePhoto ? (
                                        <img src={candidateUser.profilePhoto} alt={candidateUser.name} className="w-12 h-12 rounded-full object-cover" />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                                          {candidateUser.name?.charAt(0) || '?'}
                                        </div>
                                      )}
                                      <div>
                                        <h4 className="font-bold text-gray-900">{candidateUser.name || 'Candidate'}</h4>
                                        <span className="text-xs text-gray-500">{providerProfile.designation || 'Candidate'}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                      <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">{t("AI Match Score")}</div>
                                      {evaluation ? (
                                        <div className={`flex items-end gap-1 ${isParsingLimitReached ? 'blur-sm select-none' : ''}`}>
                                          <span className="text-3xl font-black text-emerald-600 leading-none">{evaluation.score}</span>
                                          <span className="text-sm font-bold text-gray-400 mb-1">/100</span>
                                        </div>
                                      ) : (
                                        <div className="text-sm font-bold text-amber-500">{t("Pending Analysis")}</div>
                                      )}
                                    </div>
                                  </div>
                                  {/* Right: AI Reasoning & Profile Details */}
                                  <div className="flex-1 flex flex-col">
                                    <div className="flex items-center gap-2 mb-2">
                                      <HiSparkles className="text-indigo-500 w-4 h-4" />
                                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{t("AI Reasoning")}</span>
                                    </div>
                                    {evaluation ? (
                                      <p className={`text-gray-700 text-sm leading-relaxed mb-4 ${isParsingLimitReached ? 'blur-sm select-none' : ''}`}>
                                        {evaluation.reasoning}
                                      </p>
                                    ) : (
                                      <p className="text-gray-400 text-sm italic mb-4">{t(
                                        "Run AI Analysis to see how well this candidate matches your job requirements."
                                      )}</p>
                                    )}

                                    {/* Candidate Profile Details */}
                                    <div className="mt-2 pt-4 border-t border-gray-100 flex-1">
                                      <h5 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                        <FiUser className="text-indigo-500 w-4 h-4" />{t("Complete Profile")}</h5>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                        {/* Skills */}
                                        {providerProfile.skills && providerProfile.skills.length > 0 && (
                                          <div>
                                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">{t("Top Skills")}</div>
                                            <div className="flex flex-wrap gap-1.5">
                                              {providerProfile.skills.slice(0, 5).map((skill, i) => (
                                                <span key={i} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
                                                  {skill}
                                                </span>
                                              ))}
                                              {providerProfile.skills.length > 5 && (
                                                <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-100">
                                                  +{providerProfile.skills.length - 5}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Experience & Location */}
                                        <div className="space-y-3">
                                          {providerProfile.experience && (
                                            <div>
                                              <div className="text-[10px] font-bold text-gray-500 uppercase mb-0.5 flex items-center gap-1"><FiBriefcase className="w-3 h-3"/>{t("Total Experience")}</div>
                                              <div className="text-xs font-medium text-gray-900">{providerProfile.experience}</div>
                                            </div>
                                          )}
                                          {(providerProfile.city || candidateUser.city) && (
                                            <div>
                                              <div className="text-[10px] font-bold text-gray-500 uppercase mb-0.5 flex items-center gap-1"><FiMapPin className="w-3 h-3"/>{t("Location")}</div>
                                              <div className="text-xs font-medium text-gray-900">{providerProfile.city || candidateUser.city}</div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Recent Work Experience */}
                                        {providerProfile.previousExperience && providerProfile.previousExperience.length > 0 && (
                                          <div className="md:col-span-2">
                                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">{t("Recent Experience")}</div>
                                            {providerProfile.previousExperience.slice(0, 2).map((exp, i) => (
                                              <div key={i} className="mb-2 last:mb-0">
                                                <div className="text-xs font-bold text-gray-900">{exp.role} <span className="font-normal text-gray-500">{t("at")}</span> {exp.company}</div>
                                                {exp.duration && <div className="text-[10px] text-gray-500">{exp.duration}</div>}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3">
                                      <button onClick={() => setSelectedCandidate(candidateInfo)} className="text-indigo-600 text-xs font-bold hover:underline">{t("View Full Profile & Resume")}</button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <CandidateProfileModal
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        candidateProfile={selectedCandidate?.providerProfile}
        candidateUser={selectedCandidate?.providerProfile?.user}
      />
    </div>
  );
};

export default TalentPool;
