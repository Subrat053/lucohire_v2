import React, { useState, useEffect } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import ResumeUploadCard from './ResumeUploadCard';
import LineFixesList from './LineFixesList';
import SkillsMatrixCard from './SkillsMatrixCard';
import CareerPathSelector from './CareerPathSelector';
import RoadmapTimeline from './RoadmapTimeline';

export default function ResumeCheckStep() {
  const { goToStep } = useResumeJourney();
  const [activeSection, setActiveSection] = useState('secPaths');

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
  }, []);

  return (
    <div className="space-y-6">
      {/* Main Responsive Layout: 2 Columns on Desktop, 1 Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Sticky Sidebar on Desktop: max-height controlled to fit 730px viewport) */}
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
                  5 fixes
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
                  <span>4. 2030 Career Roadmap</span>
                </span>
                <span className="text-[10px] bg-[#ECEAF9] text-[#5B21D6] px-1.5 py-0.5 rounded font-semibold">
                  Trends
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
                Step 1 Complete
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
