import React, { useEffect, useState } from 'react';
import ScoreGauge from '../../common/ScoreGauge';

export default function TestResultsCard({
  score = 0,
  total = 5,
  timeUsed = 180,
  topicBreakdown = {},
  questionReviews = [],
  onProceedToVerdict,
  onRetake,
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPassed = pct >= 70;

  useEffect(() => {
    if (isPassed) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isPassed]);

  const mm = Math.floor(timeUsed / 60);
  const ss = String(timeUsed % 60).padStart(2, '0');

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs relative overflow-hidden space-y-6">
      {/* Confetti Banner */}
      {showConfetti && (
        <div className="absolute inset-x-0 top-0 py-1.5 bg-gradient-to-r from-[#5B21D6] via-[#0E8F5F] to-[#1B4FE0] text-white text-[11px] font-bold uppercase tracking-wider text-center animate-pulse shadow-xs">
          ✨ Assessment Cleared! 70%+ Benchmark Achieved — Verified Credential Ready ✨
        </div>
      )}

      {/* Top Banner / Verdict */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#ECEAF9] pb-4 ${showConfetti ? 'pt-4' : ''}`}>
        <div>
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            isPassed ? 'text-[#0E8F5F] bg-[#E5F6EE]' : 'text-[#B9791A] bg-[#FBF1DF]'
          }`}>
            {isPassed ? '✓ Official Assessment Cleared' : 'Assessment Completed'}
          </span>
          <h2
            className="text-[20px] sm:text-[24px] font-bold text-[#141A33] mt-1 m-0"
            style={{ fontFamily: 'Fraunces, serif' }}
          >
            {isPassed ? '🏆 High Engineering Benchmark Cleared!' : '👍 Assessment Completed — Targeted Review Ahead'}
          </h2>
          <p className="text-[12.5px] text-[#767B8A] mt-0.5 m-0">
            You scored {score} of {total} ({pct}%) in {mm}:{ss} minutes. Passing benchmark: 70%.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={onRetake}
            className="py-2.5 px-4 rounded-xl border border-[#D8D2FA] text-[12px] font-semibold text-[#5B21D6] hover:bg-[#F0EDFC] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Retake Assessment</span>
          </button>

          <button
            type="button"
            onClick={onProceedToVerdict}
            className="py-2.5 px-5 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[12.5px] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Proceed to Step 5: Final Verdict</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Score Gauge & Key Verdict */}
        <div className="lg:col-span-5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-2xl p-5 text-center space-y-4">
          <div>
            <div className="text-[14px] font-bold text-[#141A33]">
              Assessment Performance Gauge
            </div>
            <div className="text-[11.5px] text-[#767B8A]">
              Server-authoritative evaluation
            </div>
          </div>

          <div className="flex justify-center py-2">
            <ScoreGauge
              score={pct}
              max={100}
              size={114}
              strokeWidth={9}
              labelSuffix="%"
              status={isPassed ? 'good' : 'mid'}
            />
          </div>

          <div className="p-3 bg-white border border-[#ECEAF9] rounded-xl text-left space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#767B8A]">Correct Answers:</span>
              <span className="font-bold text-[#141A33]">{score} of {total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#767B8A]">Time Elapsed:</span>
              <span className="font-bold text-[#141A33]">{mm}m {ss}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#767B8A]">Passing Benchmark:</span>
              <span className="font-bold text-[#0E8F5F]">70% Required</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-[#767B8A]">Hiring Credential Status:</span>
              <span className={`font-bold ${isPassed ? 'text-[#0E8F5F]' : 'text-[#B9791A]'}`}>
                {isPassed ? '✓ Qualified for Verified Badge' : 'Review recommended'}
              </span>
            </div>
          </div>

          {/* Action Box to Step 5 */}
          <div className="p-4 bg-[#F0EDFC] border border-[#D8D2FA] rounded-xl text-left space-y-3">
            <div>
              <div className="text-[13px] font-bold text-[#141A33]">
                Ready for Step 5: Final Verdict
              </div>
              <p className="text-[11.5px] text-[#767B8A] mt-0.5 m-0 leading-relaxed">
                Step 5 synthesizes your ATS score and Assessment score into your official Verified Hiring Certificate and tailored 30-Day Action Plan.
              </p>
            </div>

            <button
              type="button"
              onClick={onProceedToVerdict}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[12.5px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Proceed to Step 5: Final Verdict</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Right Column: Topic Mastery & Detailed Solution Review */}
        <div className="lg:col-span-7 space-y-5">
          {/* Topic Breakdown */}
          {topicBreakdown && Object.keys(topicBreakdown).length > 0 && (
            <div className="p-4 bg-white border border-[#ECEAF9] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[13.5px] font-bold text-[#141A33] m-0">
                  Topic Mastery Breakdown
                </h4>
                <span className="text-[11px] text-[#767B8A]">
                  Benchmark: 70%
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(topicBreakdown).map(([topic, data], idx) => {
                  const topicPct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                  const isGood = topicPct >= 70;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#181B24]">{topic}</span>
                        <span className={isGood ? 'text-[#0E8F5F] font-bold' : 'text-[#B9791A] font-bold'}>
                          {data.correct}/{data.total} ({topicPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#ECEAF9] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${isGood ? 'bg-[#0E8F5F]' : 'bg-[#B9791A]'}`}
                          style={{ width: `${topicPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Question & Solution Review */}
          {questionReviews && questionReviews.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[13.5px] font-bold text-[#141A33] m-0">
                  Questions &amp; Solution Review
                </h4>
                <span className="text-[11px] text-[#767B8A]">
                  {questionReviews.length} questions evaluated
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {questionReviews.map((item, idx) => {
                  const isCorrect = item.isCorrect;
                  const chosenText = item.selectedOptionIndex !== null && item.options?.[item.selectedOptionIndex]
                    ? item.options[item.selectedOptionIndex]
                    : 'Unanswered';
                  const correctText = item.options?.[item.correctOptionIndex] || 'Option ' + item.correctOptionIndex;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-left transition-colors space-y-2.5 ${
                        isCorrect
                          ? 'bg-[#F7FBF9] border-[#0E8F5F]/30'
                          : 'bg-[#FAF9FE] border-[#B3492F]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#141A33] flex items-center gap-1.5">
                          <span className="text-[#767B8A]">#{idx + 1}</span>
                          <span>{item.topic}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] ${
                          isCorrect ? 'bg-[#E5F6EE] text-[#0E8F5F]' : 'bg-[#FBEAE8] text-[#B3492F]'
                        }`}>
                          {isCorrect ? '✓ Correct' : '✕ Missed'}
                        </span>
                      </div>

                      <div className="text-[13px] text-[#181B24] font-medium leading-snug">
                        {item.scenario}
                      </div>

                      <div className="text-[11.5px] text-[#767B8A] pt-2 border-t border-gray-100 space-y-1">
                        <div>
                          <strong className="text-[#141A33]">Your Answer:</strong>{' '}
                          <span className={isCorrect ? 'text-[#0E8F5F] font-semibold' : 'text-[#B3492F] font-semibold'}>
                            {chosenText}
                          </span>
                        </div>

                        {!isCorrect && (
                          <div>
                            <strong className="text-[#141A33]">Correct Answer:</strong>{' '}
                            <span className="text-[#0a6c47] font-semibold">{correctText}</span>
                          </div>
                        )}

                        {item.explain && (
                          <div className="text-[11.5px] text-[#4A4F60] leading-relaxed pt-0.5">
                            💡 <strong className="text-[#141A33]">Explanation:</strong> {item.explain}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
