import React from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import ScoreGauge from '../../common/ScoreGauge';
import { ROLE_BY_PATH } from '../../data/batadoData';

export default function VerdictHeroCard() {
  const { readinessVerdict, selectedPaths, atsScore, testState, practiceState, completedChapters } = useResumeJourney();
  const activePathId = selectedPaths[0] || 'p1';
  const roleInfo = readinessVerdict.planA || ROLE_BY_PATH[activePathId] || ROLE_BY_PATH.p1;

  const hasTestData = testState?.score !== null && testState?.total && testState?.total > 0;
  const testPct = hasTestData ? Math.round((testState.score / testState.total) * 100) : (readinessVerdict?.testPct ?? null);

  const hasPracticeData = Boolean(practiceState?.pTotal && practiceState?.pTotal > 0);
  const practicePct = hasPracticeData ? Math.round((practiceState.pScore / practiceState.pTotal) * 100) : null;
  const practiceReps = practiceState?.pTotal || readinessVerdict?.practiceReps || 0;
  const streakDays = practiceState?.streak || 0;

  const lessonsCount = Array.isArray(completedChapters) && completedChapters.length > 0
    ? completedChapters.length
    : (readinessVerdict?.lessonsCompleted || 0);
  const totalLessons = readinessVerdict?.totalLessons || 12;

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
                {readinessVerdict.bandLabel || 'Job-Ready Range'}
              </span>
              <span className="text-[11px] font-semibold text-[#767B8A]">
                Step 5 of 5 · What You Got
              </span>
              {readinessVerdict.isCached && (
                <span className="text-[10px] font-bold text-[#0E8F5F] bg-[#E5F6EE] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>⚡</span>
                  <span>Saved in Database (0 Tokens)</span>
                </span>
              )}
            </div>

            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#141A33] m-0" style={{ fontFamily: 'Fraunces, serif' }}>
              Bata Do: Your Job-Readiness Verdict
            </h2>

            <div className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#5B21D6] bg-[#F0EDFC] px-3 py-1 rounded-xl">
              <span>🎯 Target Role: {roleInfo.role}</span>
              <span className="text-[#141A33]">({roleInfo.pay || '₹4–8 LPA'})</span>
            </div>

            <p className="text-[12px] text-[#767B8A] m-0 leading-relaxed">
              {readinessVerdict.rankText || `Better than ${readinessVerdict.percentile || 86}% of candidate applications in this bracket.`}
            </p>
          </div>

          {/* Evaluated Pillars in a 4-pillar responsive grid */}
          <div className="p-4 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#141A33]">
                Evaluated Journey Pillars (What You Achieved)
              </span>
              <span className="text-[11px] text-[#767B8A]">Comprehensive Synthesis</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. ATS Score */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-[#ECEAF9]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#767B8A]">Resume ATS</span>
                  <span className="font-bold text-[#5B21D6]">{atsScore}/100</span>
                </div>
                <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5B21D6]" style={{ width: `${Math.min(100, atsScore)}%` }} />
                </div>
                <div className="text-[10px] text-[#767B8A]">Step 1 Audit</div>
              </div>

              {/* 2. Lessons Mastered */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-[#ECEAF9]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#767B8A]">Lessons</span>
                  <span className="font-bold text-[#9333EA]">{lessonsCount}/{totalLessons}</span>
                </div>
                <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#9333EA]" style={{ width: `${Math.min(100, Math.round((lessonsCount / totalLessons) * 100))}%` }} />
                </div>
                <div className="text-[10px] text-[#767B8A]">Step 2 Padhaao</div>
              </div>

              {/* 3. Practice Drills & Streak */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-[#ECEAF9]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#767B8A]">Practice</span>
                  <span className="font-bold text-[#0E8F5F]">
                    {hasPracticeData ? `${practiceReps} Reps` : `${practiceReps || 0} Drills`}
                  </span>
                </div>
                <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0E8F5F]" style={{ width: `${Math.min(100, (practiceReps / 20) * 100 || 50)}%` }} />
                </div>
                <div className="text-[10px] text-[#0E8F5F] font-semibold">
                  {streakDays > 0 ? `🔥 ${streakDays}-Day Streak` : 'Active Prep'}
                </div>
              </div>

              {/* 4. Skill Assessment Test */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-[#ECEAF9]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#767B8A]">Skill Test</span>
                  <span className="font-bold text-[#1B4FE0]">
                    {testPct !== null ? `${testPct}%` : 'Pending'}
                  </span>
                </div>
                <div className="w-full bg-[#ECEAF9] h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1B4FE0]" style={{ width: `${testPct || 0}%` }} />
                </div>
                <div className="text-[10px] text-[#1B4FE0] font-semibold">
                  {testPct !== null ? 'Verified Exam' : 'Step 4 Test'}
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
              Synthesized from <strong>ATS</strong>, <strong>Lessons</strong>, <strong>Practice</strong> &amp; <strong>Skill Test</strong>
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

