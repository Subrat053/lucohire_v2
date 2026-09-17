import React, { useState, useEffect } from "react";
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import useTranslation from "../../hooks/useTranslation";
import { HiOutlineDownload } from "react-icons/hi";
import { ResumeProvider, useResume, ResumeContext } from "./ResumeContext";
import { getAtsOptimizer, optimizeFullResume } from "../../services/providerAIService";
import { Sparkles, X, CheckCircle2, Bot } from "lucide-react";
import toast from "react-hot-toast";
import ClassicProTemplate from "./ClassicProTemplate";
import TemplateJane from "./templates/TemplateJane";
import TemplateRichard from "./templates/TemplateRichard";
import TemplateHarvard from "./templates/TemplateHarvard";
import TemplateOlivia from "./templates/TemplateOlivia";
import TemplateDavid from "./templates/TemplateDavid";
import TemplateAnaisha from "./templates/TemplateAnaisha";
import TemplateTech from "./templates/TemplateTech";
import TemplateIvana from "./templates/TemplateIvana";
import AtsOptimizerPanel from "../provider/AtsOptimizerPanel";
import html2pdf from "html2pdf.js";

const templates = [
  // Base themeable layouts
  { id: "classic-pro", name: "Classic Professional", desc: "ATS optimized, traditional layout." },
  { id: "modern", name: "Modern Clear", desc: "Clean lines, good for tech." },
  // Custom structural layouts
  { id: "jane", name: "Jane Structured", desc: "Clean 2-column layout." },
  { id: "richard", name: "Richard Sidebar", desc: "Dark blue sidebar with timeline." },
  { id: "harvard", name: "Harvard Academic", desc: "Strict, professional single column." },
  { id: "olivia", name: "Olivia Elegant", desc: "Pink bordered 2-column layout." },
  { id: "david", name: "David Anderson", desc: "Clean minimalistic, 2-column." },
  { id: "anaisha", name: "Anaisha Parvati", desc: "Centered header, single column." },
  { id: "tech", name: "Tech Professional", desc: "Computer Science Resume layout." },
  { id: "ivana", name: "Ivana Johnson", desc: "Professional HR layout." },
];

function AdvancedResumeBuilderInner({ profileData }) {
  const { t } = useTranslation();
  const { resumeData, setResumeData, updatePersonal } = useResume();
  const [activeTemplate, setActiveTemplate] = useState("classic-pro");
  const [isDownloading, setIsDownloading] = useState(false);

  // AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [jd, setJd] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem('scroll_to_ats') === 'true') {
      sessionStorage.removeItem('scroll_to_ats');
      setTimeout(() => {
        const el = document.getElementById('ats-optimizer-panel');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 800);
    }
  }, []);

  const handleAiOptimize = async () => {
    try {
      setAiLoading(true);
      
      const payload = { 
        parsedData: resumeData, 
        jobDescription: jd.trim() || "General resume optimization for a professional role" 
      };
      
      const res = await optimizeFullResume(payload);
      
      if (res.data?.success || res.data?.data) {
        const optimizedResume = res.data.data;
        console.log("AI Output:", optimizedResume);
        // Verify it looks like our schema before applying
        if (optimizedResume && optimizedResume.personal && optimizedResume.sections) {
          setAiSuggestions(optimizedResume);
          toast.success("AI has prepared your new resume. Please review the changes.");
        } else {
          toast.error("AI returned invalid structure. Please try again.");
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
      toast.error(error.response?.data?.message || "AI Optimization failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestions = () => {
    if (aiSuggestions) {
      setResumeData(aiSuggestions);
      toast.success("Resume completely rewritten and optimized!");
      setAiSuggestions(null);
      setShowAiModal(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      const content = document.getElementById("resume-preview-content");
      const scrollParent = content.closest('.overflow-y-auto');
      if (!content || !scrollParent) throw new Error("Could not find resume container elements.");

      const originalClass = content.className;
      const originalScrollStyle = scrollParent.style.cssText;
      
      content.className = "bg-[#ffffff] text-left flex flex-col";
      // CRITICAL FIX: Temporarily remove scroll constraints from parent so the browser fully renders off-screen content
      scrollParent.style.overflow = 'visible';
      scrollParent.style.maxHeight = 'none';
      
      // Wait a moment for the DOM to fully expand and render the hidden sections
      await new Promise(resolve => setTimeout(resolve, 150));

      const scale = 2;
      const dataUrl = await htmlToImage.toPng(content, {
        height: content.scrollHeight * scale,
        width: content.scrollWidth * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: content.scrollWidth + 'px',
          height: content.scrollHeight + 'px'
        }
      });

      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error("Image generation failed (dataUrl is empty).");
      }

      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      });

      const pdfPageWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      const contentRatio = content.scrollHeight / content.scrollWidth;
      
      let finalWidth = pdfPageWidth;
      let finalHeight = finalWidth * contentRatio;

      if (finalHeight > pdfPageHeight) {
        finalHeight = pdfPageHeight;
        finalWidth = finalHeight / contentRatio;
      }
      
      const xOffset = (pdfPageWidth - finalWidth) / 2;

      pdf.addImage(dataUrl, 'PNG', xOffset, 0, finalWidth, finalHeight);
      
      const links = content.querySelectorAll('a');
      const contentRect = content.getBoundingClientRect();
      
      links.forEach(link => {
        const rect = link.getBoundingClientRect();
        const xPercent = (rect.left - contentRect.left) / contentRect.width;
        const yPercent = (rect.top - contentRect.top) / contentRect.height;
        const wPercent = rect.width / contentRect.width;
        const hPercent = rect.height / contentRect.height;
        
        const absoluteY = yPercent * finalHeight;

        pdf.link(
          xOffset + (xPercent * finalWidth), 
          absoluteY, 
          wPercent * finalWidth, 
          hPercent * finalHeight, 
          { url: link.href }
        );
      });

      pdf.save('professional-resume.pdf');
      content.className = originalClass;
      scrollParent.style.cssText = originalScrollStyle;
    } catch (error) {
      console.error("PDF download failed:", error);
      alert("PDF Error: " + (error.message || error.toString()));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-h-[85vh]">
        <div className="flex flex-col lg:flex-row gap-8 items-start h-full">
          {/* Left Sidebar: Controls */}
          <div className="w-full lg:w-72 shrink-0 space-y-8 sticky top-24">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xl mb-2 tracking-tight">{t("Resume Builder")}</h3>
              <p className="text-sm text-slate-500 font-medium">
                {t("Click any section directly on the resume to edit it inline.")}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t("Select Template")}</label>
              <div className="flex flex-col gap-2">
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setActiveTemplate(tmpl.id)}
                    className={`text-left px-4 py-3 rounded-xl transition-all duration-300 relative border ${
                      activeTemplate === tmpl.id
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-sm mb-0.5">{t(tmpl.name)}</div>
                    <div className={`text-xs ${activeTemplate === tmpl.id ? "text-emerald-700" : "text-slate-500"}`}>
                      {t(tmpl.desc)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-3.5 rounded-xl font-bold shadow-md transition-all active:scale-[0.98]"
              >
                <HiOutlineDownload className="text-lg" />
                {isDownloading ? t("Generating PDF...") : t("Download PDF")}
              </button>

              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold shadow-md transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-5 h-5" />
                {t("AI Optimize Resume")}
              </button>
            </div>

          {/* Right Area: Preview Container */}
          <div className="w-full lg:flex-1 bg-slate-100/50 rounded-2xl p-2 sm:p-6 lg:p-8 flex overflow-x-auto overflow-y-auto custom-scrollbar border border-slate-200 shadow-inner max-h-[85vh]">
            <div className="mx-auto flex flex-col min-w-[794px] gap-4 py-4 [zoom:0.42] sm:[zoom:0.65] md:[zoom:0.85] lg:[zoom:1]">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm animate-pulse">
                <span>{t("Hover over a block and click to open the inline editor form.")}</span>
              </div>
              <div
                id="resume-preview-content"
                className="bg-white shadow-2xl rounded-sm text-left ring-1 ring-slate-900/5 transition-all flex flex-col h-fit"
                style={{ width: "794px", minHeight: "1123px" }}
              >
                {/* Dynamically render the active template component */}
                {activeTemplate === 'jane' ? (
                  <TemplateJane />
                ) : activeTemplate === 'richard' ? (
                  <TemplateRichard />
                ) : activeTemplate === 'harvard' ? (
                  <TemplateHarvard />
                ) : activeTemplate === 'olivia' ? (
                  <TemplateOlivia />
                ) : activeTemplate === 'david' ? (
                  <TemplateDavid />
                ) : activeTemplate === 'anaisha' ? (
                  <TemplateAnaisha />
                ) : activeTemplate === 'tech' ? (
                  <TemplateTech />
                ) : activeTemplate === 'ivana' ? (
                  <TemplateIvana />
                ) : (
                  <ClassicProTemplate themeId={activeTemplate} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="ats-optimizer-panel" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <AtsOptimizerPanel fileHash={profileData?.fileHash || undefined} parsedData={profileData} />
      </div>

      {/* AI Optimize Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fadeIn">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-800">{t("AI Resume Optimizer")}</h2>
                  <p className="text-sm text-slate-500">{t("Powered by your backend ATS Engine")}</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {!aiSuggestions ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t("Target Job Description (Optional)")}
                    </label>
                    <textarea 
                      value={jd}
                      onChange={(e) => setJd(e.target.value)}
                      placeholder={t("Paste the job description you are targeting here for better alignment...")}
                      className="w-full h-32 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <button 
                    onClick={handleAiOptimize}
                    disabled={aiLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
                  >
                    {aiLoading ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t("Rewriting Entire Resume...")}</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> {t("Rewrite & Optimize Resume")}</>
                    )}
                  </button>
                  <p className="text-xs text-slate-500 text-center font-medium">
                    {t("This will intelligently rewrite all descriptions in your resume for brevity and impact.")}
                  </p>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="h-[400px] overflow-y-auto overflow-x-hidden border border-slate-200 rounded-xl bg-slate-100 relative">
                    <ResumeContext.Provider value={{
                      resumeData: aiSuggestions,
                      updatePersonal: () => {},
                      updateSectionTitle: () => {},
                      toggleSectionVisibility: () => {},
                      updateSectionData: () => {},
                      reorderSections: () => {},
                      activeElementId: null,
                      setActiveElementId: () => {}
                    }}>
                        <div className="scale-75 origin-top-left w-[133.33%] pointer-events-none bg-white min-h-[533px] flex flex-col">
                          {activeTemplate === 'jane' ? (
                            <TemplateJane />
                          ) : activeTemplate === 'richard' ? (
                            <TemplateRichard />
                          ) : activeTemplate === 'harvard' ? (
                            <TemplateHarvard />
                          ) : activeTemplate === 'olivia' ? (
                            <TemplateOlivia />
                          ) : (
                            <ClassicProTemplate themeId={activeTemplate} />
                          )}
                        </div>
                    </ResumeContext.Provider>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => setAiSuggestions(null)}
                      className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition"
                    >
                      {t("Discard")}
                    </button>
                    <button 
                      onClick={applyAiSuggestions}
                      className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {t("Apply Changes")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdvancedResumeGenerator({ profileData }) {
  return (
    <ResumeProvider initialProfileData={profileData}>
      <AdvancedResumeBuilderInner profileData={profileData} />
    </ResumeProvider>
  );
}
