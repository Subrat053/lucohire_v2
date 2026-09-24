import React from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { TRACKS, TRACK_ORDER } from '../../data/padhaaoData';

export default function TrackTabs({ layout = 'horizontal' }) {
  const { activeTrack, setActiveTrack, completedChapters } = useResumeJourney();

  if (layout === 'vertical') {
    return (
      <div className="space-y-3">
        {TRACK_ORDER.map((tk) => {
          const track = TRACKS[tk];
          if (!track) return null;

          const totalChapters = track.chapters.length;
          const doneCount = track.chapters.filter((_, idx) =>
            completedChapters.includes(`${tk}-${idx}`)
          ).length;
          const pct = Math.round((doneCount / totalChapters) * 100);
          const isActive = activeTrack === tk;

          return (
            <button
              key={tk}
              type="button"
              onClick={() => setActiveTrack(tk)}
              className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'bg-[#F0EDFC] border-[#5B21D6] shadow-xs ring-1 ring-[#5B21D6]/40'
                  : 'bg-white border-[#E6E3F7] hover:border-[#D8D2FA]'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isActive ? 'bg-[#5B21D6] text-white' : 'bg-[#ECEAF9] text-[#5B21D6]'
                }`}>
                  {track.impact}
                </span>
                <span className="text-[11px] font-semibold text-[#767B8A]">
                  {doneCount}/{totalChapters} done
                </span>
              </div>

              <div className="text-[14.5px] font-bold text-[#141A33] mt-1">
                {track.label}
              </div>

              <p className="text-[11.5px] text-[#767B8A] line-clamp-2 mt-1 m-0">
                {track.banner}
              </p>

              <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-[#0E8F5F] transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Horizontal Grid (Mobile / Compact)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {TRACK_ORDER.map((tk) => {
        const track = TRACKS[tk];
        if (!track) return null;

        const totalChapters = track.chapters.length;
        const doneCount = track.chapters.filter((_, idx) =>
          completedChapters.includes(`${tk}-${idx}`)
        ).length;
        const pct = Math.round((doneCount / totalChapters) * 100);
        const isActive = activeTrack === tk;

        return (
          <button
            key={tk}
            type="button"
            onClick={() => setActiveTrack(tk)}
            className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              isActive
                ? 'bg-[#F0EDFC] border-[#5B21D6] shadow-xs ring-1 ring-[#5B21D6]/40'
                : 'bg-white border-[#E6E3F7] hover:border-[#D8D2FA]'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isActive ? 'bg-[#5B21D6] text-white' : 'bg-[#ECEAF9] text-[#5B21D6]'
              }`}>
                {track.impact}
              </span>
              <span className="text-[11px] font-semibold text-[#767B8A]">
                {doneCount}/{totalChapters} done
              </span>
            </div>

            <div className="text-[14px] font-bold text-[#141A33] mt-1">
              {track.label}
            </div>

            <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-[#0E8F5F] transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
