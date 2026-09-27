import React, { useState } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { TRACKS as FALLBACK_TRACKS } from '../../data/padhaaoData';
import { resumeJourneyAPI } from '../../../../../services/resumeJourneyAPI';
import { toast } from 'react-hot-toast';

export default function LessonPlayerModal({ chapterKey, onClose, onNextChapter, isLastChapter = false }) {
  const { completedChapters, toggleChapterComplete, padhaaoSyllabus, activeTrack } = useResumeJourney();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [userQuery, setUserQuery] = useState('');

  if (!chapterKey) return null;

  const tracks = padhaaoSyllabus?.tracks || FALLBACK_TRACKS;

  // Resolve chapter and track across all available tracks dynamically
  let track = null;
  let chapter = null;
  let trackKey = activeTrack || 'basic';
  let chapterIdx = 0;

  // 1. Try trackKey-index pattern
  const parts = (chapterKey || '').split('-');
  const candidateTrackKey = parts[0];
  const candidateIdx = parseInt(parts[1], 10);

  if (!isNaN(candidateIdx) && tracks[candidateTrackKey]?.chapters?.[candidateIdx]) {
    track = tracks[candidateTrackKey];
    chapter = track.chapters[candidateIdx];
    trackKey = candidateTrackKey;
    chapterIdx = candidateIdx;
  } else {
    // 2. Search all tracks by id or key
    for (const [tk, tObj] of Object.entries(tracks)) {
      if (!tObj?.chapters) continue;
      const foundIdx = tObj.chapters.findIndex(
        (c, idx) => c.key === chapterKey || c.id === chapterKey || `${tk}-${idx}` === chapterKey
      );
      if (foundIdx !== -1) {
        track = tObj;
        chapter = tObj.chapters[foundIdx];
        trackKey = tk;
        chapterIdx = foundIdx;
        break;
      }
    }
  }

  // 3. Fallback search in FALLBACK_TRACKS
  if (!chapter) {
    for (const [tk, tObj] of Object.entries(FALLBACK_TRACKS)) {
      if (!tObj?.chapters) continue;
      const foundIdx = tObj.chapters.findIndex(
        (c, idx) => c.key === chapterKey || c.id === chapterKey || `${tk}-${idx}` === chapterKey
      );
      if (foundIdx !== -1) {
        track = tObj;
        chapter = tObj.chapters[foundIdx];
        trackKey = tk;
        chapterIdx = foundIdx;
        break;
      }
    }
  }

  if (!chapter) return null;

  const resolvedKey = chapter.key || chapter.id || chapterKey;
  const isCompleted =
    completedChapters.includes(resolvedKey) ||
    (chapter.id && completedChapters.includes(chapter.id)) ||
    (chapter.key && completedChapters.includes(chapter.key)) ||
    completedChapters.includes(chapterKey);

  const handleToggleComplete = () => {
    toggleChapterComplete(resolvedKey, chapter.id);
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

  // Interactive AI Concept Explainer Handler
  const handleAskAi = async (customPrompt) => {
    const questionText = customPrompt || userQuery.trim() || 'Explain this concept clearly with common interview pitfalls';
    setAiLoading(true);
    try {
      const res = await resumeJourneyAPI.explainConcept({
        topicKey: chapter.id || chapter.key || chapterKey,
        topicName: chapter.name,
        question: questionText,
      });
      if (res?.data?.success && res.data.data) {
        setAiData(res.data.data);
      } else {
        toast.error('AI Tutor could not generate explanation. Try again.');
      }
    } catch (err) {
      console.error('AI Explain error:', err);
      toast.error('AI Tutor is temporarily busy. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E6E3F7] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#ECEAF9] bg-[#FAF9FE] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2 py-0.5 rounded-md">
                {track?.label || 'Target Track'} · Chapter {chapterIdx + 1}
              </span>
              {chapter.isCvGap && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9381E] bg-[#FDF2F0] border border-[#F6D0CA] px-2 py-0.5 rounded-md">
                  🎯 Closes CV Gap
                </span>
              )}
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
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#5B21D6] m-0">
              Why Recruiters Filter For This
            </h4>
            <p className="text-[13px] text-[#767B8A] leading-relaxed m-0">
              {chapter.why}
            </p>
          </div>

          {/* Interactive AI Concept Explainer Card */}
          <div className="space-y-3 p-4 bg-gradient-to-br from-[#FAF9FE] to-[#F5F2FD] border border-[#D8D2FA] rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#5B21D6] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  🤖
                </span>
                <div>
                  <h4 className="text-[13px] font-bold text-[#141A33] m-0">
                    Interactive AI Concept Tutor
                  </h4>
                  <p className="text-[11px] text-[#767B8A] m-0">
                    Real-time AI breakdown, production edge-cases, and interview traps
                  </p>
                </div>
              </div>
              {!aiData && !aiLoading && (
                <button
                  type="button"
                  onClick={() => handleAskAi()}
                  className="py-1.5 px-3 rounded-lg bg-[#5B21D6] hover:bg-[#4A3AE0] text-white text-[11.5px] font-semibold transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  Explain Concept ✨
                </button>
              )}
            </div>

            {/* Quick Prompts Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#767B8A]">Quick Drills:</span>
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => handleAskAi("Explain this in plain English with an everyday analogy")}
                className="text-[11px] font-medium text-[#5B21D6] bg-white border border-[#D8D2FA] hover:bg-[#F0EDFC] px-2 py-0.5 rounded-md cursor-pointer transition-colors"
              >
                💡 Plain English
              </button>
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => handleAskAi("What is the most common production bug or outage caused by this?")}
                className="text-[11px] font-medium text-[#B3492F] bg-white border border-[#F6D0CA] hover:bg-[#FDF2F0] px-2 py-0.5 rounded-md cursor-pointer transition-colors"
              >
                ⚠️ Production Outages
              </button>
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => handleAskAi("What tricky follow-up questions do Senior Interviewers ask on this?")}
                className="text-[11px] font-medium text-[#0E8F5F] bg-white border border-[#C7EADB] hover:bg-[#F0FDF4] px-2 py-0.5 rounded-md cursor-pointer transition-colors"
              >
                🎯 Interview Follow-ups
              </button>
            </div>

            {/* Custom Question Input */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAskAi(); }}
                placeholder={`Ask AI Tutor a question about ${chapter.name}...`}
                className="flex-1 bg-white border border-[#D8D2FA] rounded-xl px-3 py-2 text-[12px] text-[#141A33] placeholder:text-[#767B8A] focus:outline-none focus:border-[#5B21D6]"
              />
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => handleAskAi()}
                className="py-2 px-3.5 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] disabled:opacity-60 text-white text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                {aiLoading ? 'Thinking...' : 'Ask AI'}
              </button>
            </div>

            {/* AI Response Output */}
            {aiLoading && (
              <div className="p-3 bg-white/90 rounded-xl border border-[#D8D2FA] text-center text-[12px] text-[#5B21D6] animate-pulse">
                ✦ Synthesizing deep dive explanation & interview pitfalls...
              </div>
            )}

            {aiData && !aiLoading && (
              <div className="space-y-3 p-3.5 bg-white rounded-xl border border-[#D8D2FA] mt-2 text-[12.5px] animate-in fade-in duration-150">
                {aiData.isFeatureDisabled ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#767B8A]">
                      <span>✦</span>
                      <span>AI Feature Setting</span>
                    </div>
                    <p className="m-0 text-[#181B24] leading-relaxed">
                      {aiData.explanation || 'The AI Lesson Tutor is currently paused in administrator settings. All verified lesson notes, code samples, and interview questions below remain fully accessible.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          aiData.isOffTopic
                            ? 'text-[#B9791A] bg-[#FBF1DF]'
                            : 'text-[#5B21D6] bg-[#F0EDFC]'
                        }`}
                      >
                        {aiData.isOffTopic ? '💡 Lesson Focus Guidance' : 'AI Concept Breakdown'}
                      </span>
                      <p className="mt-1.5 text-[#181B24] leading-relaxed">
                        {aiData.explanation}
                      </p>
                    </div>

                    {aiData.keyTakeaways && aiData.keyTakeaways.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#0E8F5F]">
                          {aiData.isOffTopic ? 'Topic Focus Reminders:' : 'Key Engineering Takeaways:'}
                        </span>
                        <ul className="space-y-1 pl-4 list-disc marker:text-[#0E8F5F] text-[#444955] text-[12px]">
                          {aiData.keyTakeaways.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiData.isOffTopic && aiData.suggestedQuestions && aiData.suggestedQuestions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5B21D6]">
                          Explore Recommended Questions for {chapter.name}:
                        </span>
                        <div className="flex flex-col gap-1">
                          {aiData.suggestedQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAskAi(q)}
                              className="text-left p-2 rounded-lg bg-[#FAF9FE] hover:bg-[#F0EDFC] border border-[#ECEAF9] text-[11.5px] text-[#141A33] transition-colors cursor-pointer"
                            >
                              💬 "{q}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiData.interviewTip && (
                      <div className="p-2.5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-lg text-[11.5px] text-[#5B21D6] flex items-start gap-1.5">
                        <span className="shrink-0">💡</span>
                        <span><strong>Interview Tip:</strong> {aiData.interviewTip}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
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
                className="py-2 px-4 rounded-xl text-[12.5px] font-semibold bg-[#5B21D6] hover:bg-[#4A3AE0] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>{isLastChapter ? 'Proceed to Step 3: Practice Karao' : 'Next Lesson'}</span>
                <span>→</span>
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

