import React, { useState } from 'react';
import ScoreGauge from '../../common/ScoreGauge';

export default function PracticeResultsCard({
  score,
  total,
  weakTopics,
  answersHistory,
  onPracticeAgain,
  onProceedToTest,
}) {
  const [showReview, setShowReview] = useState(true);
  const pct = Math.round((score / total) * 100);

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#ECEAF9] pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
            Practice Round Complete
          </span>
          <h2 className="text-[20px] sm:text-[24px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            {pct >= 80 ? '🔥 Strong Technical Grasp!' : pct >= 50 ? '👍 Solid Effort, Ready to Refine' : '💪 Good Reps, Targeted Review Ahead'}
          </h2>
          <p className="text-[12.5px] text-[#767B8A] mt-0.5 m-0">
            You answered {score} out of {total} questions correctly ({pct}%).
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={onPracticeAgain}
            className="py-2.5 px-4 rounded-xl border border-[#D8D2FA] text-[12px] font-semibold text-[#5B21D6] hover:bg-[#F0EDFC] transition-colors cursor-pointer"
          >
            🔄 Practice Again
          </button>

          <button
            type="button"
            onClick={onProceedToTest}
            className="py-2.5 px-5 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[12.5px] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Proceed to Step 4: Test</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* 2-Column Responsive Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Score Gauge & Weak Topics */}
        <div className="lg:col-span-5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-2xl p-5 space-y-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ScoreGauge
              score={pct}
              max={100}
              size={84}
              strokeWidth={7}
              labelSuffix="%"
              status={pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low'}
            />
            <div>
              <div className="text-[15px] font-bold text-[#141A33]">
                Practice Accuracy
              </div>
              <div className="text-[12px] text-[#767B8A]">
                {score} of {total} scenario questions correct
              </div>
              <div className="text-[11.5px] font-semibold text-[#5B21D6] mt-1">
                {pct >= 80 ? '✓ Ready for timed assessment' : 'Review missed questions before testing'}
              </div>
            </div>
          </div>

          {/* Weak Topics Callout */}
          {weakTopics && weakTopics.length > 0 ? (
            <div className="p-3.5 bg-[#FBF1DF]/60 border border-[#FBF1DF] rounded-xl text-left space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚠️</span>
                <h4 className="text-[12.5px] font-bold text-[#141A33] m-0">
                  Targeted Weak Topics Detected
                </h4>
              </div>
              <p className="text-[11.5px] text-[#767B8A] m-0 leading-relaxed">
                These topics will be highlighted in your Step 5 30-Day Action Plan:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {weakTopics.map((topic, idx) => (
                  <span key={idx} className="text-[11px] font-semibold text-[#B9791A] bg-white border border-[#B9791A]/30 px-2 py-0.5 rounded-md">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-[#E5F6EE]/40 border border-[#E5F6EE] rounded-xl text-left text-[12px] text-[#0E8F5F] font-semibold">
              ✓ No weak topics detected! High readiness across all tested domains.
            </div>
          )}
        </div>

        {/* Right Column: Detailed Question Review */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[14px] font-bold text-[#141A33] m-0">
              Questions &amp; Solution Review
            </h4>
            <span className="text-[11.5px] text-[#767B8A]">
              {answersHistory.length} questions answered
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {answersHistory.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  item.isCorrect ? 'bg-[#F7FBF9] border-[#0E8F5F]/30' : 'bg-[#FAF9FE] border-[#B3492F]/30'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-[#141A33]">#{idx + 1} · {item.question.topic}</span>
                  <span className={item.isCorrect ? 'text-[#0E8F5F]' : 'text-[#B3492F]'}>
                    {item.isCorrect ? '✓ Correct' : '✕ Missed'}
                  </span>
                </div>
                <div className="text-[13px] text-[#181B24] font-medium leading-snug">
                  {item.question.scenario}
                </div>
                <div className="text-[11.5px] text-[#767B8A] mt-2 pt-2 border-t border-gray-100 space-y-1">
                  <div>
                    <strong className="text-[#141A33]">Correct Answer:</strong>{' '}
                    <span className="text-[#0a6c47] font-semibold">{item.question.options[item.question.correct]}</span>
                  </div>
                  {item.question.explanation && (
                    <div className="text-[11.5px] text-[#767B8A] italic">
                      💡 {item.question.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
