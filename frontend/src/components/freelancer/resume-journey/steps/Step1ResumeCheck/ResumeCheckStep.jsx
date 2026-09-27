import React, { useState, useEffect } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import ResumeUploadCard from './ResumeUploadCard';
import LineFixesList from './LineFixesList';
import SkillsMatrixCard from './SkillsMatrixCard';
import CareerPathSelector from './CareerPathSelector';
import RoadmapTimeline from './RoadmapTimeline';

export default function ResumeCheckStep() {
  const {
    hasResume,
    resumeFileInputRef,
    handleResumeUpload,
    uploadingResume,
    goToStep,
  } = useResumeJourney();

  const [activeSection, setActiveSection] = useState('secPaths');
  const [isDragging, setIsDragging] = useState(false);

  const scrollToAnchor = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -80; // offset for sticky header
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  // Scroll spy to highlight active section in sticky index
  useEffect(() => {
    if (!hasResume) return;
    const sectionIds = ['secPaths', 'secLineFixes', 'secSkillsMatrix', 'secRoadmap'];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasResume]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const syntheticEvent = { target: { files: [file] } };
      handleResumeUpload(syntheticEvent);
    }
  };

  // ─── First-Time Hero State (When no resume is uploaded yet) ─────────────────
  if (!hasResume) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-[#E6E3F7] rounded-3xl p-6 sm:p-10 shadow-sm text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0EDFC] text-[#5B21D6] text-[12px] font-bold uppercase tracking-wider">
            <span>🚀 Step 1 of 5 · Batao</span>
          </div>

          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-[24px] sm:text-[32px] font-bold text-[#141A33] tracking-tight m-0" style={{ fontFamily: 'Fraunces, serif' }}>
              Upload Your Resume to Begin
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[#5B6168] leading-relaxed m-0">
              Upload your resume first. Our system will extract your real experience, benchmark against 18,000+ developer job listings, calculate your dynamic corporate ATS score, and personalize your entire 5-step journey.
            </p>
          </div>

          {/* Interactive Drag & Drop Hero Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
            className={`p-8 sm:p-12 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center gap-4 ${
              isDragging
                ? 'border-[#5B21D6] bg-[#F7F5FE] scale-[1.01]'
                : 'border-[#D8D2FA] bg-[#FAF9FE] hover:border-[#5B21D6] hover:bg-[#F6F5FC]'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#ECEAF9] text-[#5B21D6] flex items-center justify-center text-3xl shadow-xs">
              📄
            </div>

            <div className="space-y-1">
              <div className="text-[16px] font-bold text-[#141A33]">
                Drag &amp; drop your resume document here
              </div>
              <div className="text-[12.5px] text-[#767B8A]">
                Supports PDF or DOCX (Max 10MB)
              </div>
            </div>

            <input
              ref={resumeFileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleResumeUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => resumeFileInputRef?.current?.click()}
              disabled={uploadingResume}
              className="mt-2 py-3 px-6 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[13.5px] shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {uploadingResume ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Parsing &amp; Benchmarking...</span>
                </>
              ) : (
                <>
                  <span>Select Resume File</span>
                  <span>↗</span>
                </>
              )}
            </button>
          </div>

          {/* Dynamic Analysis Pillars Teaser */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left pt-2">
            <div className="p-3.5 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9] space-y-1">
              <div className="text-base">🎯</div>
              <div className="text-[12.5px] font-bold text-[#141A33]">5-Pillar ATS Engine</div>
              <div className="text-[11px] text-[#767B8A]">Keyword match, action verbs, metrics, and structural parsing.</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9] space-y-1">
              <div className="text-base">⚡</div>
              <div className="text-[12.5px] font-bold text-[#141A33]">Career Path Heuristics</div>
              <div className="text-[11px] text-[#767B8A]">Instant match probability calculated for 4 distinct salary tiers.</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9] space-y-1">
              <div className="text-base">✍️</div>
              <div className="text-[12.5px] font-bold text-[#141A33]">Personalized Fixes</div>
              <div className="text-[11px] text-[#767B8A]">Tailored before/after rewrites derived from your actual experience.</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9] space-y-1">
              <div className="text-base">📊</div>
              <div className="text-[12.5px] font-bold text-[#141A33]">Market Skills Matrix</div>
              <div className="text-[11px] text-[#767B8A]">Identify outdated clutter to drop and high-velocity rising skills to learn.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Dynamic Audit View (When resume is present) ────────────────────
  return (
    <div className="space-y-6">
      {/* Main Responsive Layout: 2 Columns on Desktop, 1 Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Sticky Sidebar on Desktop) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          <ResumeUploadCard />

          {/* Sticky Section Index (Desktop only) */}
          <div className="hidden lg:block bg-white border border-[#E6E3F7] rounded-2xl p-4 shadow-xs space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6]">
              Section Navigation
            </div>
            <div className="space-y-1 text-[12.5px]">
              <button
                type="button"
                onClick={() => scrollToAnchor('secPaths')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  activeSection === 'secPaths'
                    ? 'bg-[#F0EDFC] text-[#5B21D6] font-bold'
                    : 'text-[#5B6168] hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🎯</span>
                  <span>1. Career Target Path</span>
                </span>
                <span className="text-[10px] bg-[#ECEAF9] text-[#5B21D6] px-1.5 py-0.5 rounded font-semibold">
                  4 paths
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollToAnchor('secLineFixes')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  activeSection === 'secLineFixes'
                    ? 'bg-[#F0EDFC] text-[#5B21D6] font-bold'
                    : 'text-[#5B6168] hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>✍️</span>
                  <span>2. Bullet Rewrites</span>
                </span>
                <span className="text-[10px] bg-[#ECEAF9] text-[#5B21D6] px-1.5 py-0.5 rounded font-semibold">
                  Dynamic fixes
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollToAnchor('secSkillsMatrix')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  activeSection === 'secSkillsMatrix'
                    ? 'bg-[#F0EDFC] text-[#5B21D6] font-bold'
                    : 'text-[#5B6168] hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📊</span>
                  <span>3. Skills Matrix &amp; Tiers</span>
                </span>
                <span className="text-[10px] bg-[#ECEAF9] text-[#5B21D6] px-1.5 py-0.5 rounded font-semibold">
                  Market data
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollToAnchor('secRoadmap')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  activeSection === 'secRoadmap'
                    ? 'bg-[#F0EDFC] text-[#5B21D6] font-bold'
                    : 'text-[#5B6168] hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🚀</span>
                  <span>4. 2026–2030 Roadmap</span>
                </span>
                <span className="text-[10px] bg-[#ECEAF9] text-[#5B21D6] px-1.5 py-0.5 rounded font-semibold">
                  Future-proof
                </span>
              </button>
            </div>
          </div>

          {/* Quick Advancement Action in Sidebar */}
          <div className="hidden lg:block bg-gradient-to-br from-[#F7F6FF] to-[#FAF9FE] border border-[#D8D2FA] rounded-2xl p-4 shadow-xs space-y-2">
            <div className="text-[12px] font-bold text-[#141A33]">
              Ready for the next step?
            </div>
            <p className="text-[11.5px] text-[#767B8A] leading-relaxed m-0">
              Close your keyword gaps in Step 2 with tailored syllabus chapters.
            </p>
            <button
              type="button"
              onClick={() => goToStep(2)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[12.5px] shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Step 2: Padhaao Syllabus</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Right Column (Detailed Review & Actionable Content) */}
        <div className="lg:col-span-8 space-y-6">
          <CareerPathSelector />
          <LineFixesList />
          <SkillsMatrixCard />
          <RoadmapTimeline />

          {/* Bottom Step Advancement CTA */}
          <div className="bg-gradient-to-r from-[#141A33] to-[#241A5E] text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#D8D2FA]">
                Step 1 Complete · Free Navigation Active
              </div>
              <h3 className="text-[17px] sm:text-[19px] font-bold text-white mt-0.5 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
                Next: Targeted Syllabus &amp; Lessons
              </h3>
              <p className="text-[12px] text-[#ECEAF9]/80 mt-1 m-0">
                Close your high-priority keyword and framework gaps in Step 2.
              </p>
            </div>

            <button
              type="button"
              onClick={() => goToStep(2)}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#5B21D6] hover:bg-[#6C5CE8] text-white font-semibold text-[13px] shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <span>Go to Step 2: Padhaao</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
