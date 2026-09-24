import React, { useEffect, useState } from 'react';
import ScoreGauge from '../../common/ScoreGauge';

export default function TestResultsCard({
  score,
  total,
  timeUsed,
  topicBreakdown,
  onProceedToVerdict,
  onRetake,
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const pct = Math.round((score / total) * 100);
  const isPassed = pct >= 70;

  useEffect(() => {
    if (isPassed) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isPassed]);

  const mm = Math.floor(timeUsed / 60);
  const ss = String(timeUsed % 60).padStart(2, '0');

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
      {/* Confetti Banner */}
      {showConfetti && (
        <div className="absolute inset-x-0 top-0 py-1.5 bg-gradient-to-r from-[#5B21D6] via-[#0E8F5F] to-[#1B4FE0] text-white text-[11px] font-bold uppercase tracking-wider text-center animate-pulse">
          ✨ Assessment Passed! High Hiring Match Unlocked ✨
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 items-start ${showConfetti ? 'pt-4' : ''}`}>
        {/* Left Column: Score Gauge & Key Verdict */}
        <div className="md:col-span-5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl p-5 text-center space-y-4">
          <div>
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              isPassed ? 'text-[#0E8F5F] bg-[#E5F6EE]' : 'text-[#B9791A] bg-[#FBF1DF]'
            }`}>
              {isPassed ? '✓ Official Assessment Cleared' : 'Assessment Completed'}
            </span>
            <h2 className="text-[19px] sm:text-[21px] font-bold text-[#141A33] mt-2 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
              {isPassed ? 'Technical Benchmark Cleared!' : 'Targeted Review Recommended'}
            </h2>
            <p className="text-[12px] text-[#767B8A] mt-1 m-0">
              Scored {score} of {total} ({pct}%) in {mm}:{ss} min.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <ScoreGauge
              score={pct}
              max={100}
              size={110}
              strokeWidth={9}
              labelSuffix="%"
              status={isPassed ? 'good' : 'mid'}
            />
          </div>

          <div className="pt-2 border-t border-[#ECEAF9]">
            <button
              type="button"
              onClick={onRetake}
              className="w-full py-2.5 px-4 rounded-xl border border-[#D8D2FA] text-[12px] font-semibold text-[#5B21D6] hover:bg-[#F0EDFC] transition-colors cursor-pointer"
            >
              🔄 Retake Assessment
            </button>
          </div>
        </div>

        {/* Right Column: Topic Mastery Breakdown & Primary Step 5 Action */}
        <div className="md:col-span-7 space-y-5">
          {/* Topic Breakdown */}
          {topicBreakdown && Object.keys(topicBreakdown).length > 0 && (
            <div className="p-4 bg-white border border-[#ECEAF9] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-bold text-[#141A33] m-0">
                  Topic Mastery Breakdown
                </h4>
                <span className="text-[11px] text-[#767B8A]">
                  Benchmark: 70%
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(topicBreakdown).map(([topic, data], idx) => {
                  const topicPct = Math.round((data.correct / data.total) * 100);
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

          {/* Action Box to Step 5 */}
          <div className="p-4 bg-[#F0EDFC] border border-[#D8D2FA] rounded-xl space-y-3">
            <div>
              <div className="text-[13px] font-bold text-[#141A33]">
                Your Assessment is Recorded in Your Composite Verdict
              </div>
              <p className="text-[12px] text-[#767B8A] mt-0.5 m-0 leading-relaxed">
                Step 5 synthesizes your ATS score and Assessment score into your verified hiring readiness certificate and customized 30-day plan.
              </p>
            </div>

            <button
              type="button"
              onClick={onProceedToVerdict}
              className="w-full py-3 px-5 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[13px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Proceed to Step 5: Final Readiness Verdict</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
