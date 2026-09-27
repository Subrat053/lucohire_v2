import React from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import ScoreGauge from '../../common/ScoreGauge';
import { ROLE_BY_PATH } from '../../data/batadoData';

export default function VerdictHeroCard() {
  const { readinessVerdict, selectedPaths, atsScore, testState, practiceState } = useResumeJourney();
  const activePathId = selectedPaths[0] || 'p1';
  const roleInfo = ROLE_BY_PATH[activePathId] || ROLE_BY_PATH.p1;

  const hasTestData = testState?.score !== null && testState?.total && testState?.total > 0;
  const testPct = hasTestData ? Math.round((testState.score / testState.total) * 100) : null;

  const hasPracticeData = Boolean(practiceState?.pTotal && practiceState?.pTotal > 0);
  const practicePct = hasPracticeData ? Math.round((practiceState.pScore / practiceState.pTotal) * 100) : null;

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-5 sm:p-7 shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Side: Verdict & Evaluated Pillars */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                  readinessVerdict.bandClass === 'good'
                    ? 'bg-[#E5F6EE] text-[#0E8F5F]'
                    : readinessVerdict.bandClass === 'mid'
                    ? 'bg-[#FBF1DF] text-[#B9791A]'
                    : 'bg-[#FBEAE8] text-[#B3492F]'
                }`}
              >
                {readinessVerdict.bandLabel}
              </span>
              <span className="text-[11px] font-semibold text-[#767B8A]">
                Step 5 of 5 · Verdict Dashboard
              </span>
            </div>

            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#141A33] m-0" style={{ fontFamily: 'Fraunces, serif' }}>
              Bata Do: Ready Hoon Ya Nahi?
            </h2>

            <div className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#5B21D6] bg-[#F0EDFC] px-3 py-1 rounded-xl">
              <span>🎯 Target Role: {roleInfo.role}</span>
              <span className="text-[#141A33]">({roleInfo.pay})</span>
            </div>

            <p className="text-[12px] text-[#767B8A] m-0 leading-relaxed">
              {readinessVerdict.rankText}
            </p>
          </div>

          {/* Evaluated Pillars in a compact 3-bar strip */}
          <div className="p-4 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl space-y-2.5">
            <div className="text-[12px] font-bold text-[#141A33]">
              Evaluated Pillars
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* ATS */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#767B8A]">Resume ATS</span>
                  <span className="font-bold text-[#5B21D6]">{atsScore}/100</span>
                </div>
                <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5B21D6]" style={{ width: `${atsScore}%` }} />
                </div>
              </div>

              {/* Practice */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#767B8A]">Practice Reps</span>
                  <span className="font-bold text-[#0E8F5F]">
                    {hasPracticeData ? `${practicePct}%` : 'Pending'}
                  </span>
                </div>
                <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0E8F5F]" style={{ width: `${practicePct || 0}%` }} />
                </div>
              </div>

              {/* Assessment */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#767B8A]">Timed Test</span>
                  <span className="font-bold text-[#1B4FE0]">
                    {hasTestData ? `${testPct}%` : 'Pending'}
                  </span>
                </div>
                <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1B4FE0]" style={{ width: `${testPct || 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Large Composite Readiness Gauge */}
        <div className="lg:col-span-5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
          <ScoreGauge
            score={readinessVerdict.combinedScore}
            max={100}
            size={120}
            strokeWidth={10}
            labelSuffix="/100"
            status={readinessVerdict.bandClass}
          />

          <div className="space-y-1">
            <div className="text-[15px] font-bold text-[#141A33]">
              Composite Readiness Score
            </div>
            <div className="text-[11.5px] text-[#767B8A]">
              Weighted formula: <strong>40% ATS</strong> + <strong>60% Assessment</strong>
            </div>
            <div className="flex items-center gap-1.5 justify-center pt-1 text-[11.5px] font-semibold text-[#0E8F5F]">
              <span>✓</span>
              <span>Verified LucoHire Benchmark</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
