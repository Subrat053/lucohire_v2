import React from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { TRACKS } from '../../data/padhaaoData';
import { toast } from 'react-hot-toast';

export default function LessonPlayerModal({ chapterKey, onClose, onNextChapter }) {
  const { completedChapters, toggleChapterComplete } = useResumeJourney();

  if (!chapterKey) return null;
  const [trackKey, chapterIdxStr] = chapterKey.split('-');
  const chapterIdx = parseInt(chapterIdxStr, 10);
  const track = TRACKS[trackKey];
  const chapter = track?.chapters?.[chapterIdx];

  if (!chapter) return null;

  const isCompleted = completedChapters.includes(chapterKey);

  const handleToggleComplete = () => {
    toggleChapterComplete(chapterKey);
    if (!isCompleted) {
      toast.success(`Completed "${chapter.name}"!`);
    }
  };

  const copyResumeLine = () => {
    if (chapter.resumeLine) {
      navigator.clipboard.writeText(chapter.resumeLine);
      toast.success('Resume bullet copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E6E3F7] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#ECEAF9] bg-[#FAF9FE] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2 py-0.5 rounded-md">
                {track.label} · Chapter {chapterIdx + 1}
              </span>
              <span className="text-[11px] font-medium text-[#767B8A]">
                ⏱ {chapter.time}
              </span>
            </div>
            <h3 className="text-[17px] sm:text-[19px] font-bold text-[#141A33] truncate m-0" style={{ fontFamily: 'Fraunces, serif' }}>
              {chapter.name}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#D8D2FA] bg-white text-[#767B8A] hover:text-[#141A33] flex items-center justify-center font-bold text-sm cursor-pointer shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-[#181B24]">
          {/* Market Stats Comparison Callout */}
          {chapter.stat1 && (
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl text-center">
              <div className="p-2 bg-white rounded-lg border border-[#ECEAF9]">
                <div className="text-[16px] font-bold text-[#5B21D6]" style={{ fontFamily: 'Fraunces, serif' }}>
                  {chapter.stat1.v}
                </div>
                <div className="text-[11px] text-[#767B8A] mt-0.5">{chapter.stat1.l}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#ECEAF9]">
                <div className="text-[16px] font-bold text-[#B3492F]" style={{ fontFamily: 'Fraunces, serif' }}>
                  {chapter.stat2?.v || '0'}
                </div>
                <div className="text-[11px] text-[#767B8A] mt-0.5">{chapter.stat2?.l || 'in your profile'}</div>
              </div>
            </div>
          )}

          {/* Why This Matters */}
          <div className="space-y-1.5">
            <h4 className="text-[13px] font-bold text-[#141A33] uppercase tracking-wider text-[#5B21D6] m-0">
              Why Recruiters Filter For This
            </h4>
            <p className="text-[13px] text-[#767B8A] leading-relaxed m-0">
              {chapter.why}
            </p>
          </div>

          {/* Company Work / Real Job Expectations */}
          {chapter.companyWork && chapter.companyWork.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[13px] font-bold text-[#141A33] m-0">
                What You Actually Do on the Job
              </h4>
              <ul className="space-y-1.5 pl-4 text-[12.5px] text-[#767B8A] list-disc marker:text-[#5B21D6]">
                {chapter.companyWork.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Core Concept Notes */}
          {chapter.core && chapter.core.length > 0 && (
            <div className="space-y-2 p-4 bg-[#F7F6FF] rounded-xl border border-[#D8D2FA]">
              <h4 className="text-[13px] font-bold text-[#141A33] m-0">
                Core Conceptual Breakdown
              </h4>
              <div className="space-y-2 text-[12.5px] text-[#181B24] leading-relaxed">
                {chapter.core.map((para, idx) => (
                  <p key={idx} dangerouslySetInnerHTML={{ __html: para }} className="m-0" />
                ))}
              </div>
            </div>
          )}

          {/* Code Example (Before vs After) */}
          {(chapter.before || chapter.after) && (
            <div className="space-y-2">
              <h4 className="text-[13px] font-bold text-[#141A33] m-0">
                Code Comparison: Junior vs Hireable
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {chapter.before && (
                  <div className="p-3 bg-[#1C1733] text-[#FBEAE8] rounded-xl font-mono text-[11px] overflow-x-auto space-y-1">
                    <div className="text-[10px] uppercase font-bold text-[#B3492F]">✕ Before (Fragile)</div>
                    <pre className="m-0 whitespace-pre-wrap">{chapter.before}</pre>
                  </div>
                )}
                {chapter.after && (
                  <div className="p-3 bg-[#141A33] text-[#E5F6EE] rounded-xl font-mono text-[11px] overflow-x-auto space-y-1 border border-[#0E8F5F]/40">
                    <div className="text-[10px] uppercase font-bold text-[#0E8F5F]">✓ After (Production Ready)</div>
                    <pre className="m-0 whitespace-pre-wrap">{chapter.after}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interview Questions */}
          {chapter.interviewQs && chapter.interviewQs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[13px] font-bold text-[#141A33] m-0">
                Target Interview Questions to Practice
              </h4>
              <div className="space-y-1.5">
                {chapter.interviewQs.map((q, idx) => (
                  <div key={idx} className="p-2.5 bg-[#FAF9FE] rounded-lg border border-[#ECEAF9] text-[12px] text-[#181B24]">
                    💬 "{q}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume Line Proof */}
          {chapter.resumeLine && (
            <div className="p-3.5 bg-[#E5F6EE]/40 border border-[#E5F6EE] rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#0E8F5F]">
                  Resume Bullet to Add Once Completed
                </span>
                <button
                  type="button"
                  onClick={copyResumeLine}
                  className="text-[11px] font-semibold text-[#0E8F5F] hover:underline cursor-pointer"
                >
                  📋 Copy
                </button>
              </div>
              <div className="text-[12px] font-medium text-[#141A33] italic">
                "{chapter.resumeLine}"
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-[#ECEAF9] bg-[#FAF9FE] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleToggleComplete}
            className={`py-2 px-4 rounded-xl text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              isCompleted
                ? 'bg-[#E5F6EE] text-[#0E8F5F] border border-[#0E8F5F]/40'
                : 'bg-white text-[#5B21D6] border border-[#D8D2FA] hover:bg-[#F0EDFC]'
            }`}
          >
            <span>{isCompleted ? '✓ Completed' : '○ Mark as Completed'}</span>
          </button>

          <div className="flex items-center gap-2">
            {onNextChapter && (
              <button
                type="button"
                onClick={onNextChapter}
                className="py-2 px-4 rounded-xl text-[12.5px] font-semibold bg-[#5B21D6] hover:bg-[#4A3AE0] text-white shadow-xs cursor-pointer"
              >
                Next Lesson →
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 rounded-xl text-[12.5px] font-semibold text-[#767B8A] hover:bg-gray-100 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
