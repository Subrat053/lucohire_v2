import React from 'react';
import ScoreGauge from '../../common/ScoreGauge';

export default function PracticeResultsCard({
  score,
  total,
  weakTopics = [],
  answersHistory = [],
  currentStreak = 0,
  roundStreak = 0,
  techStack = '',
  onPracticeAgain,
  onProceedToTest,
}) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPerfect = score === total && total > 0;

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#ECEAF9] pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
              Practice Round Complete
            </span>
            {techStack && (
              <span className="text-[11px] font-semibold text-[#0E8F5F] bg-[#E5F6EE] px-2.5 py-0.5 rounded-full">
                Stack: {techStack}
              </span>
            )}
          </div>
          <h2
            className="text-[20px] sm:text-[24px] font-bold text-[#141A33] mt-1 m-0"
            style={{ fontFamily: 'Fraunces, serif' }}
          >
            {isPerfect
              ? '🏆 Flawless Round! Interview Ready'
              : pct >= 80
              ? '🔥 Strong Technical Grasp!'
              : pct >= 50
              ? '👍 Solid Effort, Ready to Refine'
              : '💪 Good Reps, Targeted Review Ahead'}
          </h2>
          <p className="text-[12.5px] text-[#767B8A] mt-0.5 m-0">
            You completed {total} dynamic reps, scoring {score} correct ({pct}% accuracy).
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={onPracticeAgain}
            className="py-2.5 px-4 rounded-xl border border-[#D8D2FA] text-[12px] font-semibold text-[#5B21D6] hover:bg-[#F0EDFC] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Practice Another Round</span>
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
        {/* Left Column: Score Gauge, Streak Stats & Weak Topics */}
        <div className="lg:col-span-5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-2xl p-5 space-y-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ScoreGauge
              score={pct}
              max={100}
              size={88}
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

          {/* Real-time Streak Stats Card */}
          <div className="p-3.5 bg-white border border-[#ECEAF9] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <div>
                <div className="text-[11px] text-[#767B8A] uppercase font-bold tracking-wider">
                  Live Streak Status
                </div>
                <div className="text-[13.5px] font-bold text-[#141A33]">
                  {currentStreak} Question Streak
                </div>
              </div>
            </div>
            {isPerfect && (
              <span className="text-[10.5px] font-bold text-[#0E8F5F] bg-[#E5F6EE] px-2 py-0.5 rounded-full">
                Round Clean Sweep!
              </span>
            )}
          </div>

          {/* Weak Topics Callout */}
          {weakTopics && weakTopics.length > 0 ? (
            <div className="p-3.5 bg-[#FBF1DF]/70 border border-[#F5E6CC] rounded-xl text-left space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚠️</span>
                <h4 className="text-[12.5px] font-bold text-[#935D0F] m-0">
                  Targeted Weak Topics Identified
                </h4>
              </div>
              <p className="text-[11.5px] text-[#784E0C] m-0 leading-relaxed">
                These topics will be weighted in your Step 4 assessment and automatically prioritized in your Step 5 30-Day Action Plan:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {weakTopics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-semibold text-[#935D0F] bg-white border border-[#E9CCA0] px-2.5 py-0.5 rounded-md shadow-2xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-[#E5F6EE]/60 border border-[#C5E9D8] rounded-xl text-left text-[12px] text-[#0E8F5F] font-semibold flex items-center gap-2">
              <span>✓</span>
              <span>No weak topics detected! High interview readiness across all tested domains.</span>
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

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {answersHistory.map((item, idx) => {
              const q = item.question || {};
              const isCorrect = item.isCorrect;
              const explanationText = q.explain || q.explanation;

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
                      <span>{q.topic || item.topic}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] ${
                      isCorrect ? 'bg-[#E5F6EE] text-[#0E8F5F]' : 'bg-[#FBEAE8] text-[#B3492F]'
                    }`}>
                      {isCorrect ? '✓ Correct' : '✕ Missed'}
                    </span>
                  </div>

                  <div className="text-[13px] text-[#181B24] font-medium leading-snug">
                    {q.scenario}
                  </div>

                  <div className="text-[11.5px] text-[#767B8A] pt-2 border-t border-gray-100 space-y-1.5">
                    <div>
                      <strong className="text-[#141A33]">Correct Answer:</strong>{' '}
                      <span className="text-[#0a6c47] font-semibold">
                        {q.options?.[q.correct] || 'Option ' + q.correct}
                      </span>
                    </div>

                    {explanationText && (
                      <div className="text-[11.5px] text-[#4A4F60] leading-relaxed">
                        💡 <strong className="text-[#141A33]">Explanation:</strong> {explanationText}
                      </div>
                    )}

                    {q.mistake && (
                      <div className="text-[11px] text-[#935D0F] bg-[#FBF1DF]/60 p-2 rounded-lg border border-[#F5E6CC] leading-relaxed">
                        ⚠️ <strong className="text-[#784E0C]">Recruiter Insight:</strong> {q.mistake}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
