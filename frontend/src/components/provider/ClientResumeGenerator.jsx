import useTranslation from "../../hooks/useTranslation";
import React, { useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { HiX, HiDownload, HiTemplate, HiEye } from "react-icons/hi";
import toast from "react-hot-toast";

export default function ClientResumeGenerator({ user, profile, onClose }) {
  const {
    t
  } = useTranslation();

  const [template, setTemplate] = useState("ats"); // "ats" or "color"
  const previewRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    const toastId = toast.loading("Generating your PDF resume...");

    try {
      const element = previewRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${(user?.name || "Candidate").replace(/\s+/g, "_")}_Resume.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().from(element).set(opt).save();
      toast.success("Resume downloaded successfully!", { id: toastId });
      onClose();
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF. Please try again.", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  // Helper values
  const name = user?.name || "John Doe";
  const email = user?.email || "";
  const phone = user?.phone || "";
  const location = [profile?.city, profile?.state].filter(Boolean).join(", ") || "India";
  const skills = profile?.skills || [];
  const experience = profile?.experience || "No professional experience listed yet.";
  const description = profile?.description || "Dedicated professional ready to deliver top-quality services.";
  const languages = profile?.languages || [];
  const portfolioLinks = profile?.portfolioLinks || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-800 flex flex-col md:flex-row h-[90vh] overflow-hidden transform transition-all duration-300">
        
        {/* Left Side: Controller Panel */}
        <div className="w-full md:w-80 bg-slate-900 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 text-white shrink-0">
          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-extrabold tracking-tight flex items-center gap-2 text-indigo-400">
                <HiTemplate className="w-6 h-6" />{t("Resume PDF")}</h3>
              <button onClick={onClose} className="md:hidden p-1 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-400">
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-6">{t(
              "Select a professional layout to generate your PDF resume. All generation is processed securely on your device."
            )}</p>

            {/* Template Selector */}
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">{t("Choose Template")}</label>
              
              <button
                onClick={() => setTemplate("ats")}
                className={`w-full text-left p-4 rounded-2xl border transition duration-200 ${
                  template === "ats"
                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600 text-slate-300"
                }`}
              >
                <div className="font-bold text-sm">{t("ATS Single-Column")}</div>
                <div className="text-[11px] text-slate-400 mt-1">{t("Minimalist, optimized for automated screening and clean formatting.")}</div>
              </button>

              <button
                onClick={() => setTemplate("color")}
                className={`w-full text-left p-4 rounded-2xl border transition duration-200 ${
                  template === "color"
                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600 text-slate-300"
                }`}
              >
                <div className="font-bold text-sm">{t("Modern Accent Layout")}</div>
                <div className="text-[11px] text-slate-400 mt-1">{t("Stylish sidebar design with custom typography and clean highlights.")}</div>
              </button>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30"
            >
              <HiDownload className="w-5 h-5" />
              {downloading ? "Downloading..." : "Download Resume PDF"}
            </button>
            
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-semibold transition text-center text-xs"
            >{t("Close Window")}</button>
          </div>
        </div>

        {/* Right Side: Resume Live Preview */}
        <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex justify-center items-start">
          {/* Printable Element Wrapper */}
          <div className="w-full max-w-[800px] bg-white text-slate-900 shadow-2xl rounded-2xl overflow-hidden border border-slate-800/20 min-h-[1050px]">
            <div ref={previewRef} className="p-8 md:p-12 text-slate-900 font-sans leading-relaxed" style={{ fontSize: "14px" }}>
              {template === "ats" ? (
                /* ATS Single-Column Template */
                (<div className="space-y-6">
                  {/* Header */}
                  <div className="text-center border-b pb-4">
                    <h1 className="text-3xl font-extrabold uppercase tracking-wide text-slate-900 m-0">{name}</h1>
                    <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-600 mt-2">
                      <span>{location}</span>
                      {phone && <span>• {phone}</span>}
                      {email && <span>• {email}</span>}
                    </div>
                    {portfolioLinks.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 text-xs text-indigo-600 mt-1">
                        {portfolioLinks.map((link, idx) => (
                          <span key={idx}>
                            <a href={link.url} target="_blank" rel="noreferrer" className="hover:underline">
                              {link.platform}
                            </a>
                            {idx < portfolioLinks.length - 1 && " |"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Summary */}
                  <div className="space-y-2">
                    <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b pb-1">{t("Professional Summary")}</h2>
                    <p className="text-slate-700 text-sm whitespace-pre-line m-0">{description}</p>
                  </div>
                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="space-y-2">
                      <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b pb-1">{t("Core Competencies & Skills")}</h2>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-800 px-3 py-1 rounded-md text-xs font-semibold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Experience */}
                  <div className="space-y-2">
                    <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b pb-1">{t("Professional Experience")}</h2>
                    <p className="text-slate-700 text-sm whitespace-pre-line m-0">{experience}</p>
                  </div>
                  {/* Languages */}
                  {languages.length > 0 && (
                    <div className="space-y-2">
                      <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b pb-1">{t("Languages")}</h2>
                      <p className="text-slate-700 text-sm m-0">{languages.join(", ")}</p>
                    </div>
                  )}
                </div>)
              ) : (
                /* Modern Color Accent Template */
                (<div className="grid grid-cols-1 md:grid-cols-3 gap-8 min-h-[950px]">
                  {/* Left Column (Accent Sidebar) */}
                  <div className="md:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
                    <div className="space-y-6">
                      {/* Contact Info */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t("Contact Info")}</h3>
                        <div className="space-y-2 text-xs text-slate-600">
                          <div>
                            <div className="font-bold text-slate-800">{t("Location")}</div>
                            <div>{location}</div>
                          </div>
                          {phone && (
                            <div>
                              <div className="font-bold text-slate-800">{t("Phone")}</div>
                              <div>{phone}</div>
                            </div>
                          )}
                          {email && (
                            <div>
                              <div className="font-bold text-slate-800">{t("Email")}</div>
                              <div className="break-all">{email}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Skills */}
                      {skills.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t("Expertise")}</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {skills.map((skill, idx) => (
                              <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {languages.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t("Languages")}</h3>
                          <div className="text-xs text-slate-700 space-y-1 font-medium">
                            {languages.map((lang, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                {lang}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer watermark */}
                    <div className="text-[10px] text-slate-400 mt-8 border-t pt-4">{t("Generated via ServiceHub Career Platform")}</div>
                  </div>
                  {/* Right Column (Details) */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Header */}
                    <div>
                      <h1 className="text-4xl font-extrabold text-slate-900 leading-tight m-0">{name}</h1>
                      <div className="text-indigo-600 font-extrabold text-sm uppercase tracking-wider mt-1">
                        {skills[0] || "Professional Partner"}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 border-b-2 border-indigo-500 w-fit pb-0.5">{t("About Me")}</h3>
                      <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed m-0">{description}</p>
                    </div>

                    {/* Experience */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 border-b-2 border-indigo-500 w-fit pb-0.5">{t("Work Experience")}</h3>
                      <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed m-0">{experience}</p>
                    </div>

                    {/* Portfolio/Social */}
                    {portfolioLinks.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 border-b-2 border-indigo-500 w-fit pb-0.5">{t("Websites & Portfolios")}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {portfolioLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                            >
                              <HiEye className="w-4 h-4 shrink-0" />
                              <span className="truncate">{link.platform}: {link.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>)
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
