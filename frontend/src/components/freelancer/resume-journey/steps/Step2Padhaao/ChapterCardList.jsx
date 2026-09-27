import React from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { TRACKS as FALLBACK_TRACKS } from '../../data/padhaaoData';

export default function ChapterCardList({ onOpenLesson }) {
  const { activeTrack, completedChapters, toggleChapterComplete, padhaaoSyllabus } = useResumeJourney();

  // Resolve track with fallback and alias normalization (basic <-> qw, medium <-> fp, premium <-> pm)
  const tracks = padhaaoSyllabus?.tracks || FALLBACK_TRACKS;
  const track =
    tracks[activeTrack] ||
    (activeTrack === 'basic' ? tracks.qw : activeTrack === 'qw' ? tracks.basic : null) ||
    (activeTrack === 'medium' ? tracks.fp : activeTrack === 'fp' ? tracks.medium : null) ||
    (activeTrack === 'premium' ? tracks.pm : activeTrack === 'pm' ? tracks.premium : null) ||
    FALLBACK_TRACKS[activeTrack] ||
    FALLBACK_TRACKS.qw;

  if (!track) return null;

  return (
    <div className="space-y-3">
      {/* Track Banner */}
      <div className="p-3.5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl text-[12.5px] text-[#767B8A] leading-relaxed">
        💡 <strong className="text-[#141A33]">{track.label}:</strong> {track.banner}
      </div>

      {/* Chapters Grid */}
      <div className="space-y-3">
        {track.chapters?.map((chapter, idx) => {
          const chapterKey = chapter.key || chapter.id || `${activeTrack}-${idx}`;
          const isDone =
            completedChapters.includes(chapterKey) ||
            (chapter.id && completedChapters.includes(chapter.id)) ||
            (chapter.key && completedChapters.includes(chapter.key)) ||
            completedChapters.includes(`${activeTrack}-${idx}`);

          return (
            <div
              key={chapter.id || chapterKey || idx}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isDone
                  ? 'bg-[#F7FBF9] border-[#0E8F5F]/40'
                  : 'bg-white border-[#E6E3F7] hover:border-[#D8D2FA]'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Completion Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleChapterComplete(chapterKey)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 cursor-pointer transition-colors border ${
                      isDone
                        ? 'bg-[#0E8F5F] border-[#0E8F5F] text-white'
                        : 'border-[#D8D2FA] bg-white text-transparent hover:border-[#5B21D6]'
                    }`}
                  >
                    ✓
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14.5px] font-bold text-[#141A33]">
                        {chapter.name}
                      </span>
                      {chapter.isCvGap && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9381E] bg-[#FDF2F0] border border-[#F6D0CA] px-2 py-0.5 rounded">
                          🎯 CV Gap
                        </span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2 py-0.5 rounded">
                        {chapter.tagLbl || chapter.tag}
                      </span>
                      <span className="text-[11.5px] text-[#767B8A]">
                        ⏱ {chapter.time}
                      </span>
                    </div>

                    <p className="text-[12.5px] text-[#767B8A] line-clamp-2 m-0">
                      {chapter.why}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => onOpenLesson(chapterKey)}
                    className="flex-1 sm:flex-initial py-2 px-4 rounded-xl text-[12px] font-semibold bg-[#5B21D6] hover:bg-[#4A3AE0] text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    {isDone ? 'Review Lesson' : 'Study Lesson →'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

