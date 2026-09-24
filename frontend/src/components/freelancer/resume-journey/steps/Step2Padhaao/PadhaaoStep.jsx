import React, { useState } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { TRACKS, TRACK_ORDER } from '../../data/padhaaoData';
import TrackTabs from './TrackTabs';
import ChapterCardList from './ChapterCardList';
import LessonPlayerModal from './LessonPlayerModal';

export default function PadhaaoStep() {
  const { goToStep, completedChapters, activeTrack, setActiveTrack } = useResumeJourney();
  const [activeModalChapter, setActiveModalChapter] = useState(null);

  const totalChaptersAcrossAll = Object.values(TRACKS).reduce(
    (sum, t) => sum + (t.chapters?.length || 0),
    0
  );
  const completedTotal = completedChapters.length;
  const overallPct = Math.round((completedTotal / totalChaptersAcrossAll) * 100);

  const handleNextChapterInPlayer = () => {
    if (!activeModalChapter) return;
    const [tk, idxStr] = activeModalChapter.split('-');
    const nextIdx = parseInt(idxStr, 10) + 1;
    if (TRACKS[tk]?.chapters?.[nextIdx]) {
      setActiveModalChapter(`${tk}-${nextIdx}`);
    } else {
      setActiveModalChapter(null);
    }
  };

  // Find next incomplete chapter across tracks
  const handleJumpNextIncomplete = () => {
    for (const tk of TRACK_ORDER) {
      const track = TRACKS[tk];
      for (let i = 0; i < track.chapters.length; i++) {
        const key = `${tk}-${i}`;
        if (!completedChapters.includes(key)) {
          setActiveTrack(tk);
          setActiveModalChapter(key);
          return;
        }
      }
    }
    // if all done, open first
    setActiveModalChapter('qw-0');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (All viewports) */}
      <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
            Step 2 of 5 · Padhaao
          </span>
          <h2 className="text-[18px] sm:text-[21px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            Targeted Skill Upgrade Syllabus
          </h2>
          <p className="text-[12px] text-[#767B8A] mt-0.5 m-0">
            Each chapter targets the high-impact keyword &amp; architecture gaps identified in Step 1.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <div className="text-[13.5px] font-bold text-[#141A33]">
              {completedTotal}/{totalChaptersAcrossAll} complete ({overallPct}%)
            </div>
            <div className="text-[11px] text-[#0E8F5F] font-semibold">
              Closes 85%+ recruiter filter gaps
            </div>
          </div>
          <button
            type="button"
            onClick={handleJumpNextIncomplete}
            className="py-2 px-3.5 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white text-[12px] font-semibold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            Study Next →
          </button>
        </div>
      </div>

      {/* Mobile Track Selector (< 1024px) */}
      <div className="block lg:hidden">
        <TrackTabs layout="horizontal" />
      </div>

      {/* Main Responsive Layout: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Sticky Sidebar on Desktop: Track Navigator) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6]">
                Learning Tracks
              </span>
              <span className="text-[11px] font-semibold text-[#767B8A]">
                {TRACK_ORDER.length} tracks
              </span>
            </div>
            <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5B21D6] to-[#0E8F5F] transition-all duration-300"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <TrackTabs layout="vertical" />
          </div>

          {/* Quick Advancement in Sidebar */}
          <div className="bg-gradient-to-br from-[#F7F6FF] to-[#FAF9FE] border border-[#D8D2FA] rounded-2xl p-4 shadow-xs space-y-2">
            <div className="text-[12px] font-bold text-[#141A33]">
              Ready to test your comprehension?
            </div>
            <p className="text-[11.5px] text-[#767B8A] leading-relaxed m-0">
              Practice scenario-based questions with instant feedback in Step 3.
            </p>
            <button
              type="button"
              onClick={() => goToStep(3)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[12.5px] shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Step 3: Practice Karao</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Right Column (Chapters List & Actions) */}
        <div className="lg:col-span-8 space-y-4">
          <ChapterCardList onOpenLesson={(chKey) => setActiveModalChapter(chKey)} />

          {/* Bottom Step Advancement CTA */}
          <div className="bg-gradient-to-r from-[#141A33] to-[#241A5E] text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#D8D2FA]">
                Step 2 Complete
              </div>
              <h3 className="text-[17px] sm:text-[19px] font-bold text-white mt-0.5 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
                Next: Hands-On Practice Reps
              </h3>
              <p className="text-[12px] text-[#ECEAF9]/80 mt-1 m-0">
                Solve practical questions, build answer streaks, and identify weak spots.
              </p>
            </div>

            <button
              type="button"
              onClick={() => goToStep(3)}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#5B21D6] hover:bg-[#6C5CE8] text-white font-semibold text-[13px] shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <span>Go to Step 3: Practice Karao</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Reader */}
      {activeModalChapter && (
        <LessonPlayerModal
          chapterKey={activeModalChapter}
          onClose={() => setActiveModalChapter(null)}
          onNextChapter={handleNextChapterInPlayer}
        />
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <button
          type="button"
          onClick={() => goToStep(1)}
          className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-[#E6E3F7] text-[12.5px] font-semibold text-[#5B6168] hover:bg-gray-50 transition-colors cursor-pointer"
        >
          ← Back to Step 1: Resume Check
        </button>

        <button
          type="button"
          onClick={() => goToStep(3)}
          className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[13px] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Proceed to Step 3: Practice Karao</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
