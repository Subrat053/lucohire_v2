import React, { useState } from 'react';
import { Search, Sparkles, AlertCircle, CheckCircle2, Briefcase, TrendingUp, Zap, Award, Target, PlusCircle } from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import toast from 'react-hot-toast';
import useTranslation from '../../hooks/useTranslation';
import { getAtsOptimizer, getResumeToolkit } from '../../services/providerAIService';

export default function AtsOptimizerPanel({ fileHash, parsedData }) {
  const { t } = useTranslation();
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [toolkitAtsScore, setToolkitAtsScore] = useState(null);
  const [toolkitTips, setToolkitTips] = useState([]);

  React.useEffect(() => {
    // Fetch the baseline ATS score that matches the Resume Toolkit page
    getResumeToolkit()
      .then(res => {
        const stats = res?.data?.data?.resumeStats;
        if (stats && stats.atsScore) {
          setToolkitAtsScore(stats.atsScore);
        }
        if (res?.data?.data?.aiSuggestions) {
          setToolkitTips(res.data.data.aiSuggestions);
        }
      })
      .catch(err => console.error("Error fetching toolkit ATS score", err));
  }, []);

  const handleOptimize = async () => {
    if (!jd.trim()) return;
    try {
      setLoading(true);
      const res = await getAtsOptimizer({ fileHash, parsedData, jobDescription: jd });
      if (res.success || res.data) {
        const resData = res.data?.data || res.data || res;
        setData(resData);
        const keywords = resData.added_keywords?.length > 0 ? resData.added_keywords : (resData.missing_keywords || []);
        setSelectedSkills(keywords);
      }
    } catch (error) {
      console.error("Failed to fetch ATS Optimizer data:", error);
      toast.error(error.response?.data?.message || "Failed to analyze ATS compatibility. Please ensure resume is uploaded.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-50/50 p-4 sm:p-6 rounded-2xl border border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Search className="text-emerald-600 w-5 h-5" />{t("ATS Resume Optimizer")}</h3>
          <p className="text-gray-500 mb-5 text-[12px] font-medium">{t(
            "Paste the target Job Description to see how an ATS evaluates your resume. We will suggest actionable improvements."
          )}</p>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-[12px] outline-none transition shadow-inner font-medium text-gray-700"
            placeholder={t("Paste Target Job Description here...")}
          />
          <button
            onClick={handleOptimize}
            disabled={loading || !jd.trim()}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{t("Optimizing...")}</>
            ) : (
              <><Sparkles className="w-4 h-4" />{t("Optimize for ATS")}</>
            )}
          </button>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm">
          <h3 className="text-[14px] font-bold text-gray-800 mb-4">{t("Profile ATS Score")}</h3>
          <div className="w-[100px] h-[100px] relative mb-4">
            <CircularProgressbar 
              value={toolkitAtsScore || parsedData?.profileCompletion || 65} 
              strokeWidth={8} 
              styles={buildStyles({ pathColor: '#059669', trailColor: '#ccfbf1' })}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[24px] font-black text-emerald-600">{toolkitAtsScore || parsedData?.profileCompletion || 65}</span>
            </div>
          </div>
          <p className="text-[12px] text-gray-500 font-medium px-4">
            {t("Baseline match based on your resume data and profile completeness.")}
          </p>
        </div>
      </div>

      {toolkitTips && toolkitTips.length > 0 && !data && (() => {
        const tipBoosts = toolkitTips.map((tip, idx) => {
          if (typeof tip === 'object' && tip?.scoreBoost) return parseInt(tip.scoreBoost) || 3;
          const text = typeof tip === 'string' ? tip : (tip?.title || '');
          return text.length > 80 ? 4 : text.length > 40 ? 3 : 2;
        });
        const totalBoost = tipBoosts.reduce((a, b) => a + b, 0);

        return (
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {t("Personalized Profile Improvements")}
                </h3>
                <p className="text-[12px] text-gray-500 font-medium mt-0.5">
                  {t("Our AI analyzed your profile data. Applying these suggestions will boost your ATS match score:")}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shrink-0 self-start sm:self-auto shadow-xs">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>{t("Potential Score Boost")}: <strong className="text-emerald-700 font-black text-sm">+{totalBoost} {t("Pts")}</strong></span>
              </div>
            </div>

            <ul className="space-y-3">
              {toolkitTips.map((tip, idx) => {
                let bulletText = typeof tip === 'string' ? tip : (tip?.title || tip?.suggestion || JSON.stringify(tip));
                if (typeof bulletText !== 'string') bulletText = String(bulletText);
                const pts = tipBoosts[idx] || 3;

                return (
                  <li key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] text-gray-700 bg-gray-50/70 p-3.5 px-4 rounded-xl border border-gray-100/80 font-medium leading-relaxed hover:bg-emerald-50/30 transition">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="text-emerald-600 w-4.5 h-4.5 shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: bulletText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-800 text-[11px] font-bold shrink-0 border border-emerald-200/80 self-end sm:self-auto">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t("Estimated Boost")}: <strong>+{pts} pts</strong></span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}
      {data && (
        <div className="animate-fadeIn space-y-8">
          
          {data.warnings?.length > 0 && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[13px] font-bold text-red-800 mb-1">{t("AI Integrity Warnings")}</h3>
                <ul className="text-[11px] text-red-700 font-medium space-y-1">
                  {data.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-5 shadow-sm">
              <div className="w-[64px] h-[64px] shrink-0 relative">
                <CircularProgressbar 
                  value={data.ats_score_before || 0} strokeWidth={8} 
                  styles={buildStyles({ pathColor: '#64748b', trailColor: '#f1f5f9' })}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[18px] font-black text-gray-700">{data.ats_score_before}</span>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-[13px] text-gray-900 mb-1">{t("Original ATS Score")}</h4>
                <p className="text-[11px] font-medium text-gray-500">{t("Your current match percentage.")}</p>
              </div>
            </div>

            <div className="bg-teal-50/50 border border-teal-100 p-5 rounded-2xl flex items-center gap-5 shadow-sm">
              <div className="w-[64px] h-[64px] shrink-0 relative">
                <CircularProgressbar 
                  value={data.ats_score_after || 0} strokeWidth={8} 
                  styles={buildStyles({ pathColor: '#059669', trailColor: '#ccfbf1' })}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[18px] font-black text-emerald-600">{data.ats_score_after}</span>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-[13px] text-gray-900 mb-1">{t("Potential ATS Score")}</h4>
                <p className="text-[11px] font-medium text-teal-700">{t("Score after applying improvements.")}</p>
              </div>
            </div>
          </div>

          {/* Skill Addition & ATS Score Boost Estimator Card */}
          {(() => {
            const scoreBefore = data.ats_score_before || 60;
            const scoreAfterMax = data.ats_score_after || 85;
            const recommendedKeywords = data.added_keywords?.length > 0 
              ? data.added_keywords 
              : (data.missing_keywords || []);
            const totalSkillCount = recommendedKeywords.length || 1;
            const totalScoreDiff = Math.max(0, scoreAfterMax - scoreBefore);
            const perSkillBoost = totalScoreDiff > 0 ? (totalScoreDiff / totalSkillCount) : 3.5;
            
            const activeCount = selectedSkills.length;
            const currentEstimatedBoost = Math.round(activeCount * perSkillBoost);
            const currentProjectedScore = Math.min(100, Math.round(scoreBefore + currentEstimatedBoost));

            return (
              <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-teal-700/40 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-teal-700/50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-400/20 text-teal-300 border border-teal-400/30">
                        {t("Skill Boost Estimator")}
                      </span>
                      <span className="text-[11px] font-semibold text-teal-200 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> +{totalScoreDiff}% {t("Potential Gain")}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight">
                      {t("Skill Addition & ATS Score Projection")}
                    </h3>
                    <p className="text-xs text-teal-200/80 font-medium mt-0.5">
                      {t("Select skills below to see how adding them boosts your ATS score step by step.")}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 backdrop-blur-md px-5 py-3 rounded-xl border border-teal-500/30 flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-teal-300 block">{t("Projected ATS Score")}</span>
                      <span className="text-2xl font-black text-white">{currentProjectedScore}%</span>
                    </div>
                    <div className="h-8 w-px bg-teal-800" />
                    <div className="text-left">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">{t("Selected Boost")}</span>
                      <span className="text-lg font-black text-emerald-400">+{currentEstimatedBoost}%</span>
                    </div>
                  </div>
                </div>

                {/* Summary Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div className="bg-teal-950/40 p-3.5 rounded-xl border border-teal-800/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-300 shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-teal-300">{t("Total Skills Suggested")}</p>
                      <p className="text-base font-extrabold text-white">{totalSkillCount} {t("Skills")}</p>
                    </div>
                  </div>

                  <div className="bg-teal-950/40 p-3.5 rounded-xl border border-teal-800/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-teal-300">{t("Estimated Boost / Skill")}</p>
                      <p className="text-base font-extrabold text-white">+{perSkillBoost.toFixed(1)}% {t("per skill")}</p>
                    </div>
                  </div>

                  <div className="bg-teal-950/40 p-3.5 rounded-xl border border-teal-800/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-teal-300">{t("Max Achievable Match")}</p>
                      <p className="text-base font-extrabold text-emerald-300">{scoreAfterMax}% {t("Match")}</p>
                    </div>
                  </div>
                </div>

                {/* Interactive Skill Selection & Impact List */}
                {recommendedKeywords.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-100">
                        {t("Toggle skills to preview dynamic ATS score increase")} ({selectedSkills.length}/{totalSkillCount} {t("selected")}):
                      </span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedSkills(recommendedKeywords)}
                          className="text-[11px] font-bold text-teal-300 hover:text-white transition underline"
                        >
                          {t("Select All")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSkills([])}
                          className="text-[11px] font-bold text-teal-400/70 hover:text-teal-200 transition underline"
                        >
                          {t("Clear")}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {recommendedKeywords.map((skill, idx) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                              isSelected
                                ? 'bg-teal-700/60 border-teal-400 text-white font-bold shadow-sm'
                                : 'bg-slate-900/40 border-teal-900/60 text-teal-200/60 font-medium hover:border-teal-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <PlusCircle className="w-4 h-4 text-teal-500/50 shrink-0" />
                              )}
                              <span className="truncate">{skill}</span>
                            </div>
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                              isSelected ? 'bg-emerald-400/20 text-emerald-300' : 'bg-teal-950 text-teal-400/60'
                            }`}>
                              +{perSkillBoost.toFixed(1)}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-[13px] text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="text-orange-500 w-4 h-4" />{t("Missing Keywords")}</h4>
              <div className="flex flex-wrap gap-1.5">
                {(data.missing_keywords || []).map((keyword, i) => (
                  <span key={i} className="px-2 py-1 bg-orange-50 border border-orange-100 text-orange-700 rounded-md text-[10px] font-bold">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-[13px] text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="text-green-500 w-4 h-4" />{t("Recommended to Add")}</h4>
              <div className="flex flex-wrap gap-1.5">
                {(data.added_keywords || []).map((keyword, i) => (
                  <span key={i} className="px-2 py-1 bg-green-50 border border-green-100 text-green-700 rounded-md text-[10px] font-bold">
                    + {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
              <h4 className="text-[14px] font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="text-indigo-600 w-4 h-4" />{t("Optimized Resume Summary")}</h4>
              <p className="text-indigo-900 leading-relaxed text-[12px] font-medium">
                {data.improved_summary || "No summary improvements suggested."}
              </p>
            </div>

            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
              <h4 className="text-[14px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="text-emerald-600 w-4 h-4" />
                {t("Specific Recommendations (Bullet Points)")}
              </h4>
              <ul className="space-y-3">
                {(data.specific_recommendations || data.improved_experience_bullets || []).map((bullet, i) => {
                  if (typeof bullet !== 'string') return null;
                  return (
                    <li key={i} className="flex gap-3 text-[12px] text-gray-700 bg-gray-50/50 p-3 rounded-xl border border-gray-100 font-medium leading-relaxed">
                      <CheckCircle2 className="text-emerald-600 w-4 h-4 shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
