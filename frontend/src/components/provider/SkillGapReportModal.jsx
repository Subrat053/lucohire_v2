import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Sparkles, 
  Lock, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  BookOpen, 
  TrendingUp, 
  Activity,
  ArrowRight
} from "lucide-react";
import { providerAPI } from "../../services/api";
import toast from "react-hot-toast";

export default function SkillGapReportModal({ isOpen, onClose, plan }) {
  const {
    t
  } = useTranslation();

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const isPaid = plan && plan !== "free" && plan !== "provider-free-default";

  // Loading animation phrases
  const loadingSteps = [
    "Analyzing candidate profile details...",
    "Scanning active jobs in your area...",
    "Comparing skills and experience gaps...",
    "Synthesizing customized career roadmap...",
    "Finalizing report contents..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (isOpen && isPaid && !report) {
      fetchReport();
    }
  }, [isOpen, isPaid]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await providerAPI.getSkillGapReport();
      if (data?.success && data?.report) {
        setReport(data.report);
      } else {
        toast.error("Failed to load skill-gap analysis.");
      }
    } catch (err) {
      console.error("[Fetch Skill Gap Failed]:", err);
      toast.error(err.response?.data?.message || "Error generating skill-gap report.");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 tracking-tight">{t("AI Skill-Gap Analyzer")}</h2>
              <p className="text-[10px] text-slate-400 font-semibold">{t("Premium Career Accelerator Tools")}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded-xl transition duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paywall View for Unsubscribed Users */}
        {!isPaid ? (
          <div className="p-8 text-center bg-gradient-to-b from-indigo-50/20 to-white">
            <div className="relative w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/20 border-2 border-white/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-indigo-600 opacity-90"></div>
              <Lock className="w-8 h-8 text-white relative z-10 animate-pulse" />
            </div>
            
            <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">{t("Unlock AI Skill-Gap Analysis")}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-6">{t(
              "Compare your current profile with actual job postings in your city. Get actionable missing skills reports, role readiness scores, and high-priority learning roadmaps powered by Claude 3.5 Sonnet."
            )}</p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-8 text-left">
              <div className="flex gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Award className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800">{t("Direct Role Match Scores")}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{t(
                    "See exactly how prepared you are for active local postings as a percentage."
                  )}</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800">{t("Actionable Skill Roadmap")}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{t(
                    "Get step-by-step guidance on which skills to study first to maximize matches."
                  )}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                navigate("/provider/plans");
              }}
              className="py-3.5 px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-600/20 tracking-wider uppercase transition-all duration-200 inline-flex items-center gap-2"
            >{t("Upgrade to Visibility Plans")}<ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Subscribed User View */
          (<div className="min-h-[400px]">
            {loading ? (
              /* Loading State */
              (<div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                </div>
                <h3 className="font-black text-slate-800 text-sm animate-pulse">{t("Generating Skill Gap Report...")}</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">{loadingSteps[loadingStep]}</p>
              </div>)
            ) : report ? (
              /* Main Content */
              (<div className="flex flex-col">
                {/* Dashboard Stats Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50/50 border-b border-slate-100">
                  {/* Readiness Score Dial */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-500"
                          strokeDasharray={`${report.rawAiResponse?.roleReadinessScore || 75}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-sm font-black text-slate-800">
                        {report.rawAiResponse?.roleReadinessScore || 75}%
                      </span>
                    </div>
                    <div>
                      <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{t("Role Readiness")}</h4>
                      <p className="text-xs text-slate-800 font-bold mt-0.5">{t("Overall Fit Score")}</p>
                    </div>
                  </div>

                  {/* Confidence Index */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      report.confidence === "high" 
                        ? "bg-green-50 text-green-700" 
                        : report.confidence === "medium"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-blue-50 text-blue-600"
                    }`}>
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{t("Confidence Index")}</h4>
                      <p className="text-xs text-slate-800 font-bold capitalize mt-0.5">{report.confidence || "Medium"}{t("Match")}</p>
                    </div>
                  </div>

                  {/* Active Jobs Scanned */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{t("Local Benchmarks")}</h4>
                      <p className="text-xs text-slate-800 font-bold mt-0.5">{report.matchedJobIds?.length || 5}{t("Jobs Scanned")}</p>
                    </div>
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex px-6 border-b border-slate-100">
                  {["overview", "skills", "roadmap"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 px-6 font-bold text-xs capitalize border-b-2 transition-all duration-200 ${
                        activeTab === tab 
                          ? "border-indigo-600 text-indigo-600" 
                          : "border-transparent text-slate-400 hover:text-slate-650"
                      }`}
                    >
                      {tab === "skills" ? "Skills Analysis" : tab === "roadmap" ? "Learning Roadmap" : "Analysis Summary"}
                    </button>
                  ))}
                </div>
                {/* Tab Contents */}
                <div className="p-6 max-h-[420px] overflow-y-auto">
                  {activeTab === "overview" && (
                    <div className="space-y-5 text-left">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800 mb-2">{t("Executive Summary")}</h4>
                        <p className="text-xs text-slate-650 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          {report.reportSummary}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800 mb-2">{t("Detailed Gap Analysis")}</h4>
                        <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-line font-medium bg-indigo-50/10 p-4 rounded-2xl border border-indigo-100/30">
                          {report.detailedAnalysis}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "skills" && (
                    <div className="space-y-6 text-left">
                      {/* Missing Skills */}
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800 mb-3 flex items-center gap-1.5 text-rose-600">
                          <AlertTriangle className="w-4 h-4" />{t("Missing Key Skills")}</h4>
                        {report.missingSkills?.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {report.missingSkills.map((skill, index) => (
                              <span 
                                key={index} 
                                className="px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-wider"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-450 italic">{t("No critical missing skills detected compared to scanned jobs.")}</p>
                        )}
                      </div>

                      {/* Recommended Skills */}
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800 mb-3 flex items-center gap-1.5 text-indigo-600">
                          <Sparkles className="w-4 h-4" />{t("Recommended Skill Upgrades")}</h4>
                        {report.recommendedSkills?.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {report.recommendedSkills.map((skill, index) => (
                              <span 
                                key={index} 
                                className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-wider"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-450 italic">{t("No additional recommended skills.")}</p>
                        )}
                      </div>

                      {/* Verified Skills Match */}
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800 mb-3 flex items-center gap-1.5 text-emerald-605">
                          <CheckCircle2 className="w-4 h-4" />{t("Matched Skills Found")}</h4>
                        <div className="flex flex-wrap gap-2">
                          {report.candidateSkills?.map((skill, index) => (
                            <span 
                              key={index} 
                              className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-wider"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "roadmap" && (
                    <div className="space-y-4 text-left">
                      <h4 className="font-extrabold text-xs text-slate-800 mb-1">{t("Personalized Step-by-Step Training Pathway")}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mb-4">{t("Follow this priority roadmap to qualify for higher-paying postings.")}</p>

                      <div className="relative pl-6 border-l border-slate-100 space-y-5 ml-3">
                        {report.rawAiResponse?.learningRoadmap?.map((step, index) => (
                          <div key={index} className="relative">
                            {/* Dot indicator */}
                            <span className={`absolute -left-[30px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm ${
                              step.priority === "high" 
                                ? "bg-rose-500" 
                                : step.priority === "medium"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}>
                              {index + 1}
                            </span>

                            <div className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all duration-200">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <h5 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">{step.skill}</h5>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  step.priority === "high" 
                                    ? "bg-rose-100 text-rose-800" 
                                    : step.priority === "medium"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-200 text-slate-800"
                                }`}>
                                  {step.priority}{t("Priority")}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-2">{step.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>)
            ) : null}
          </div>)
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button 
            onClick={onClose} 
            className="py-2.5 px-5 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-black transition duration-200 shadow-sm"
          >{t("Close")}</button>
        </div>
      </div>
    </div>
  );
}
