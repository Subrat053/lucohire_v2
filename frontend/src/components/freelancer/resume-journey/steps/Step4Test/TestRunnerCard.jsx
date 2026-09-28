import React, { useState, useEffect } from 'react';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function TestRunnerCard({
  questions = [],
  currentIndex = 0,
  onJumpToIndex,
  answers = {},
  onPickAnswer,
  flags = {},
  onToggleFlag,
  onPromptSubmit,
  totalSeconds = 900,
  onTimeExpired,
  isSubmitting = false,
}) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);

  // Sync internal countdown if totalSeconds changes
  useEffect(() => {
    setTimeLeft(totalSeconds);
  }, [totalSeconds]);

  // Real-time countdown timer tick
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeExpired();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeExpired]);

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  const currentPicked = answers[currentIndex];
  const isFlagged = Boolean(flags[currentIndex]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isLowTime = timeLeft <= 60;
  const answeredTotal = Object.keys(answers).length;

  return (
    <div className="space-y-6">
      {/* Top Fixed / Sticky Bar with Real-Time Timer & Submit */}
      <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-[12px] font-semibold text-[#141A33] bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg">
            {currentQ.topic || 'Engineering Competency'}
          </span>
          {currentQ.difficulty && (
            <span className="text-[10.5px] font-bold text-[#767B8A] uppercase">
              {currentQ.difficulty}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Active Real-Time Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border font-mono text-[13.5px] font-bold shadow-2xs transition-colors ${
              isLowTime
                ? 'bg-[#FBEAE8] border-[#B3492F] text-[#B3492F] animate-pulse'
                : 'bg-[#F7F6FF] border-[#D8D2FA] text-[#5B21D6]'
            }`}
          >
            <span className="text-sm">⏱</span>
            <span>{formatTimer(timeLeft)}</span>
            {isLowTime && <span className="text-[10px] uppercase font-bold tracking-wider ml-1">Ending Soon</span>}
          </div>

          <button
            type="button"
            onClick={onPromptSubmit}
            disabled={isSubmitting}
            className="py-2 px-4 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[12.5px] shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
          >
            <span>Review &amp; Submit</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Question (8 cols), Right Question Palette Grid (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Question & Options) */}
        <div className="lg:col-span-8 bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h3
              className="text-[16px] sm:text-[18px] font-bold text-[#141A33] leading-snug m-0"
              style={{ fontFamily: 'Fraunces, serif' }}
            >
              {currentQ.scenario}
            </h3>

            <button
              type="button"
              onClick={() => onToggleFlag(currentIndex)}
              className={`p-2 px-3 rounded-xl border text-xs cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
                isFlagged
                  ? 'bg-[#FBEAE8] border-[#B3492F] text-[#B3492F] font-bold shadow-2xs'
                  : 'border-[#ECEAF9] text-[#767B8A] hover:bg-gray-50'
              }`}
              title="Flag for review before submission"
            >
              <span>🚩</span>
              <span className="hidden sm:inline">{isFlagged ? 'Flagged' : 'Flag'}</span>
            </button>
          </div>

          {currentQ.codeSnippet && (
            <div className="p-4 bg-[#141A33] text-[#E4DFFB] rounded-xl font-mono text-[12px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-[#2D334A]">
              {currentQ.codeSnippet}
            </div>
          )}

          {/* Options (Formal Exam Flow: Selected Choice Highlighted, Correctness Masked) */}
          <div className="space-y-2.5 pt-1">
            {currentQ.options?.map((opt, idx) => {
              const isSelected = currentPicked === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onPickAnswer(currentIndex, idx)}
                  className={`w-full p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#F0EDFC] border-[#5B21D6] text-[#141A33] ring-1 ring-[#5B21D6]/40 shadow-xs'
                      : 'bg-white border-[#E6E3F7] hover:border-[#D8D2FA] text-[#181B24]'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border ${
                      isSelected
                        ? 'bg-[#5B21D6] text-white border-[#5B21D6]'
                        : 'bg-[#ECEAF9] text-[#5B21D6] border-transparent'
                    }`}
                  >
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span className="text-[13px] sm:text-[13.5px] leading-relaxed flex-1 pt-0.5">
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Prev / Next Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[#ECEAF9]">
            <button
              type="button"
              onClick={() => onJumpToIndex(currentIndex - 1)}
              disabled={currentIndex <= 0}
              className="py-2.5 px-4 rounded-xl border border-[#E6E3F7] text-[12.5px] font-semibold text-[#5B6168] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              ← Previous
            </button>

            <div className="text-[11.5px] text-[#767B8A] hidden sm:block">
              {answeredTotal} of {questions.length} answered
            </div>

            <button
              type="button"
              onClick={() => {
                if (currentIndex + 1 < questions.length) {
                  onJumpToIndex(currentIndex + 1);
                } else {
                  onPromptSubmit();
                }
              }}
              className="py-2.5 px-5 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[12.5px] shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>{currentIndex + 1 >= questions.length ? 'Review & Submit →' : 'Next Question →'}</span>
            </button>
          </div>
        </div>

        {/* Right Column (Question Palette Grid) */}
        <div className="lg:col-span-4 bg-white border border-[#E6E3F7] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#ECEAF9] pb-2.5">
            <div>
              <h4 className="text-[13.5px] font-bold text-[#141A33] m-0">
                Question Palette
              </h4>
              <p className="text-[11px] text-[#767B8A] mt-0.5 m-0">
                Click any number to jump directly
              </p>
            </div>
            <div className="text-right">
              <span className="text-[12px] font-bold text-[#5B21D6]">
                {answeredTotal}/{questions.length}
              </span>
              <div className="text-[10px] text-[#767B8A]">Answered</div>
            </div>
          </div>

          {/* Grid of question bubbles */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, qIdx) => {
              const isCurrent = currentIndex === qIdx;
              const hasAnswer = answers[qIdx] !== undefined;
              const isFlag = Boolean(flags[qIdx]);

              let btnStyle = 'bg-white border-[#E6E3F7] text-[#767B8A] hover:border-[#D8D2FA]';
              if (isCurrent) {
                btnStyle = 'bg-[#5B21D6] border-[#5B21D6] text-white font-bold ring-2 ring-[#5B21D6]/30 shadow-xs';
              } else if (hasAnswer) {
                btnStyle = 'bg-[#F0EDFC] border-[#D8D2FA] text-[#5B21D6] font-semibold';
              }

              return (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => onJumpToIndex(qIdx)}
                  className={`h-9 rounded-xl border flex items-center justify-center text-xs transition-all relative cursor-pointer ${btnStyle}`}
                >
                  <span>{qIdx + 1}</span>
                  {isFlag && (
                    <span
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#B3492F] ring-1 ring-white"
                      title="Flagged"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-2 border-t border-[#ECEAF9] space-y-1.5 text-[11px] text-[#767B8A]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#5B21D6]" />
              <span>Current Active Question</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#F0EDFC] border border-[#D8D2FA]" />
              <span>Answered &amp; Synced</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-white border border-[#E6E3F7]" />
              <span>Unanswered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B3492F]" />
              <span>Flagged for Review</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
