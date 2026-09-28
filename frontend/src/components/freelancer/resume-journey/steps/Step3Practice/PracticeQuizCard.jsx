import React, { useState } from 'react';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function PracticeQuizCard({
  question,
  currentIndex,
  totalQuestions,
  streak,
  onAnswer,
  onNext,
  isFlagged,
  onToggleFlag,
  isSubmitting = false,
}) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handlePickOption = (idx) => {
    if (hasAnswered) return;
    setSelectedIdx(idx);
    setHasAnswered(true);
    const isCorrect = idx === question.correct;
    onAnswer(idx, isCorrect);
  };

  const handleNextClick = () => {
    setSelectedIdx(null);
    setHasAnswered(false);
    onNext();
  };

  const progressPct = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const explanationText = question.explain || question.explanation;

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs space-y-5 max-w-3xl mx-auto">
      {/* Top Header & Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[11px]">
              {question.topic || 'Engineering Rep'}
            </span>
            <span className={`text-[10.5px] font-bold uppercase px-2 py-0.5 rounded-full ${
              question.difficulty === 'easy'
                ? 'bg-[#E5F6EE] text-[#0E8F5F]'
                : question.difficulty === 'hard'
                ? 'bg-[#FBEAE8] text-[#B3492F]'
                : 'bg-[#F0EDFC] text-[#5B21D6]'
            }`}>
              {question.difficulty || 'medium'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#B9791A] bg-[#FBF1DF] px-3 py-1 rounded-xl border border-[#F5E6CC]">
              <span>🔥</span>
              <span>{streak} in a row</span>
            </div>

            <button
              type="button"
              onClick={onToggleFlag}
              className={`p-1.5 px-2.5 rounded-xl border text-xs cursor-pointer transition-colors flex items-center gap-1 ${
                isFlagged
                  ? 'bg-[#FBEAE8] border-[#B3492F] text-[#B3492F] font-bold'
                  : 'border-[#ECEAF9] text-[#767B8A] hover:bg-gray-50'
              }`}
              title="Flag for review"
            >
              <span>🚩</span>
              <span className="hidden sm:inline">{isFlagged ? 'Flagged' : 'Flag'}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between text-[11.5px] text-[#767B8A] pt-1">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{progressPct}% complete</span>
        </div>
        <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5B21D6] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Scenario / Prompt */}
      <div className="space-y-3 pt-1">
        <h3
          className="text-[17px] sm:text-[19px] font-bold text-[#141A33] leading-snug m-0"
          style={{ fontFamily: 'Fraunces, serif' }}
        >
          {question.scenario}
        </h3>

        {question.codeSnippet && (
          <div className="p-4 bg-[#141A33] text-[#E4DFFB] rounded-xl font-mono text-[12px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-[#2D334A]">
            {question.codeSnippet}
          </div>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-2.5 pt-1">
        {question.options?.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === question.correct;

          let btnStyles = 'border-[#E6E3F7] bg-white hover:border-[#D8D2FA] text-[#141A33] shadow-2xs';

          if (hasAnswered) {
            if (isCorrect) {
              btnStyles = 'border-[#0E8F5F] bg-[#E5F6EE] text-[#0a6c47] font-semibold shadow-xs ring-1 ring-[#0E8F5F]/40';
            } else if (isSelected) {
              btnStyles = 'border-[#B3492F] bg-[#FBEAE8] text-[#B3492F] font-semibold shadow-xs ring-1 ring-[#B3492F]/40';
            } else {
              btnStyles = 'border-[#ECEAF9] bg-gray-50 text-[#767B8A] opacity-60';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handlePickOption(idx)}
              disabled={hasAnswered}
              className={`w-full p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${btnStyles}`}
            >
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border ${
                  hasAnswered && isCorrect
                    ? 'bg-[#0E8F5F] text-white border-[#0E8F5F]'
                    : hasAnswered && isSelected
                    ? 'bg-[#B3492F] text-white border-[#B3492F]'
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

      {/* Immediate Feedback Card Revealed on Answer */}
      {hasAnswered && (
        <div className="space-y-3 pt-2 animate-in fade-in duration-200">
          {/* Explanation Box */}
          <div className={`p-4 rounded-xl border space-y-1.5 ${
            selectedIdx === question.correct
              ? 'bg-[#F7FBF9] border-[#0E8F5F]/40'
              : 'bg-[#FAF9FE] border-[#5B21D6]/30'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                {selectedIdx === question.correct ? '🎉 Correct Answer!' : '💡 Technical Explanation'}
              </span>
            </div>
            <p className="text-[12.5px] text-[#181B24] leading-relaxed m-0">
              {explanationText || 'Mastering this architectural principle ensures robust production systems.'}
            </p>
          </div>

          {/* Recruiter Trap Alert */}
          {question.mistake && (
            <div className="p-3.5 bg-[#FBF1DF]/70 border border-[#F5E6CC] rounded-xl space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#935D0F]">
                <span>⚠️</span>
                <span>Recruiter Trap &amp; Common Candidate Pitfall</span>
              </div>
              <p className="text-[12px] text-[#784E0C] leading-relaxed m-0">
                {question.mistake}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Next Button */}
      {hasAnswered && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleNextClick}
            disabled={isSubmitting}
            className="py-2.5 px-6 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[13px] shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
          >
            <span>
              {currentIndex + 1 >= totalQuestions
                ? isSubmitting
                  ? 'Saving Practice Round...'
                  : 'View Practice Results'
                : 'Next Question'}
            </span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
