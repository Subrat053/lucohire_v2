import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from "react";
import { X, Sparkles, Target, Briefcase, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { getAICareerReport } from "../../services/providerAIService";
import toast from "react-hot-toast";

export default function AiCareerReportModal({ isOpen, onClose, fileHash, parsedData }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (isOpen && !report) {
      fetchReport();
    }
  }, [isOpen]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await getAICareerReport({ fileHash, parsedData });
      if (data?.success && data?.data) {
        setReport(data.data);
      } else {
        toast.error("Failed to load AI career report.");
      }
    } catch (err) {
      console.error("[Fetch AI Career Report Failed]:", err);
      toast.error(err.response?.data?.message || "Error generating AI career report.");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{t("Full AI Career Analysis")}</h2>
              <p className="text-xs text-slate-500 font-medium">{t("Comprehensive insights based on your profile")}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
              </div>
              <h3 className="font-bold text-slate-800 text-sm animate-pulse">{t("Generating your AI Career Report...")}</h3>
            </div>
          ) : report ? (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Overall Score */}
              <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    {t("Resume Score")}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">{t("Overall presentation and alignment")}</p>
                </div>
                <div className="text-3xl font-black text-teal-700">
                  {report.resume_score?.overall || 0}<span className="text-lg text-teal-400">/100</span>
                </div>
              </div>

              {/* Sub Scores */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{t("Impact")}</p>
                  <p className="text-lg font-black text-slate-800">{report.resume_score?.impact || 0}%</p>
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{t("Brevity")}</p>
                  <p className="text-lg font-black text-slate-800">{report.resume_score?.brevity || 0}%</p>
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{t("Skills Match")}</p>
                  <p className="text-lg font-black text-slate-800">{report.resume_score?.skills_match || 0}%</p>
                </div>
              </div>

              {/* Skills Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {t("Top Skills")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(report.top_skills || []).map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100">
                        {skill}
                      </span>
                    ))}
                    {(!report.top_skills || report.top_skills.length === 0) && (
                      <span className="text-xs text-slate-500 italic">{t("No specific skills identified.")}</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    {t("Missing Skills")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(report.missing_skills || []).map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-100">
                        {skill}
                      </span>
                    ))}
                    {(!report.missing_skills || report.missing_skills.length === 0) && (
                      <span className="text-xs text-slate-500 italic">{t("You're well covered!")}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommended Roles */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  {t("Recommended Job Roles")}
                </h4>
                <div className="space-y-3">
                  {(report.top_job_roles || []).map((role, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shrink-0">
                        {role.match_percentage}%
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-slate-800 mb-1">{role.role}</h5>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{role.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm text-slate-500">{t("No report data available.")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
