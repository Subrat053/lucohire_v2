import React, { useState, useMemo } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { TRACKS as FALLBACK_TRACKS, TRACK_ORDER as FALLBACK_ORDER } from '../../data/padhaaoData';
import TrackTabs from './TrackTabs';
import ChapterCardList from './ChapterCardList';
import LessonPlayerModal from './LessonPlayerModal';

export default function PadhaaoStep() {
  const {
    goToStep,
    completedChapters,
    activeTrack,
    setActiveTrack,
    padhaaoSyllabus,
    isLoadingSyllabus,
    atsAuditData,
  } = useResumeJourney();
  const [activeModalChapter, setActiveModalChapter] = useState(null);

  const tracks = padhaaoSyllabus?.tracks || FALLBACK_TRACKS;
  const trackOrder = padhaaoSyllabus?.trackOrder || FALLBACK_ORDER;

  // Flatten all chapters into a single sequential list across tracks (Basic -> Medium -> Premium)
  const flattenedChapters = useMemo(() => {
    const list = [];
    for (const tk of trackOrder) {
      const trk = tracks[tk];
      if (!trk?.chapters) continue;
      trk.chapters.forEach((ch, idx) => {
        list.push({
          trackKey: tk,
          trackLabel: trk.label,
          chapter: ch,
          key: ch.key || ch.id || `${tk}-${idx}`,
          id: ch.id,
          indexInTrack: idx,
        });
      });
    }
    return list;
  }, [tracks, trackOrder]);

  const totalChaptersAcrossAll = flattenedChapters.length;
  const completedTotal = completedChapters.length;
  const overallPct = totalChaptersAcrossAll > 0
    ? Math.round((completedTotal / totalChaptersAcrossAll) * 100)
    : 0;

  // Locate current chapter in the flattened sequence
  const currentGlobalIdx = useMemo(() => {
    if (!activeModalChapter) return -1;
    return flattenedChapters.findIndex(
      (item) =>
        item.key === activeModalChapter ||
        item.id === activeModalChapter ||
        item.chapter.key === activeModalChapter ||
        item.chapter.id === activeModalChapter
    );
  }, [activeModalChapter, flattenedChapters]);

  const isLastOverallChapter =
    flattenedChapters.length > 0 && currentGlobalIdx === flattenedChapters.length - 1;

  // Consecutive lesson progression across tracks (e.g. 3*x + 1)
  const handleNextChapterInPlayer = () => {
    if (currentGlobalIdx === -1) {
      setActiveModalChapter(null);
      return;
    }

    if (currentGlobalIdx + 1 < flattenedChapters.length) {
      const nextItem = flattenedChapters[currentGlobalIdx + 1];
      // Switch active track tab if transitioning across sections (e.g. Basic -> Medium -> Premium)
      if (nextItem.trackKey !== activeTrack) {
        setActiveTrack(nextItem.trackKey);
      }
      setActiveModalChapter(nextItem.key);
    } else {
      // Reached the final lesson of the syllabus
      setActiveModalChapter(null);
      goToStep(3);
    }
  };

  // Find next incomplete chapter across tracks in sequence
  const handleJumpNextIncomplete = () => {
    const nextIncomplete = flattenedChapters.find((item) => {
      const isDone =
        completedChapters.includes(item.key) ||
        (item.id && completedChapters.includes(item.id)) ||
        (item.chapter.key && completedChapters.includes(item.chapter.key));
      return !isDone;
    });

    if (nextIncomplete) {
      setActiveTrack(nextIncomplete.trackKey);
      setActiveModalChapter(nextIncomplete.key);
    } else if (flattenedChapters.length > 0) {
      // If all completed, open first
      setActiveTrack(flattenedChapters[0].trackKey);
      setActiveModalChapter(flattenedChapters[0].key);
    }
  };

  const detectedGapsCount = atsAuditData?.pathHeuristics?.missingSkills?.length || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner (All viewports) */}
      <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
              Step 2 of 5 · Padhaao
            </span>
            {detectedGapsCount > 0 && (
              <span className="text-[11px] font-bold text-[#B9791A] bg-[#FBF1DF] px-2.5 py-0.5 rounded-full">
                🎯 {detectedGapsCount} CV Gaps Targeted
              </span>
            )}
          </div>
          <h2 className="text-[18px] sm:text-[21px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            Targeted Skill Upgrade Syllabus
          </h2>
          <p className="text-[12px] text-[#767B8A] mt-0.5 m-0">
            {detectedGapsCount > 0
              ? `Personalized from your CV analysis: Closing ${detectedGapsCount} recruiter filter & architecture gaps for your target role.`
              : 'Targeted syllabus dynamically tailored to your CV gaps, market demand weightage, and target role benchmarks.'}
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
                {trackOrder.length} tracks
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
        </div>

        {/* Right Column (Chapters List & Actions) */}
        <div className="lg:col-span-8 space-y-4">
          <ChapterCardList onOpenLesson={(chKey) => setActiveModalChapter(chKey)} />

          {/* Bottom Step Advancement CTA */}
          <div className="bg-gradient-to-r from-[#141A33] to-[#241A5E] text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D8D2FA]">
                  {overallPct >= 100
                    ? 'All Lessons Completed · Step 3 Ready'
                    : overallPct >= 80
                    ? 'Step 2 Ready · High Syllabus Coverage'
                    : 'Step 2 · Targeted Syllabus'}
                </span>
                <span className="text-[10px] font-semibold text-[#A594F9] bg-white/10 px-2 py-0.5 rounded">
                  Testing Flow: Unrestricted
                </span>
              </div>
              <h3 className="text-[17px] sm:text-[19px] font-bold text-white mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
                {overallPct >= 100
                  ? 'All Lessons Mastered: Ready for Technical Practice'
                  : 'Continue Learning or Advance to Practice'}
              </h3>
              <p className="text-[12px] text-[#ECEAF9]/80 mt-1 m-0">
                {overallPct >= 100
                  ? 'Outstanding! You have completed all syllabus chapters across Basic, Medium, and Premium tiers. Advance to Step 3 for interactive scenario drills.'
                  : `You have completed ${completedTotal} of ${totalChaptersAcrossAll} chapters (${overallPct}%). In production, all lessons will be required to unlock Step 3; currently open for full-flow testing.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => goToStep(3)}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#5B21D6] hover:bg-[#6C5CE8] text-white font-semibold text-[13px] shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <span>{overallPct >= 100 ? 'Proceed to Step 3: Practice Karao' : 'Go to Step 3: Practice Karao'}</span>
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
          isLastChapter={isLastOverallChapter}
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

