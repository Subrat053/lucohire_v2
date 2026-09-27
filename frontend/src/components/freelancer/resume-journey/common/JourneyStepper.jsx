import React from 'react';
import { useResumeJourney } from '../context/ResumeJourneyContext';

const STEPS = [
  { id: 1, key: 'resume', title: 'Resume Check', subtitle: 'ATS & Skills Audit' },
  { id: 2, key: 'padhaao', title: 'Padhaao', subtitle: 'Targeted Syllabus' },
  { id: 3, key: 'practice', title: 'Practice Karao', subtitle: 'Hands-on Reps' },
  { id: 4, key: 'test', title: 'Test Karo', subtitle: 'Timed Assessment' },
  { id: 5, key: 'batado', title: 'Bata Do', subtitle: 'Job-Ready Verdict' },
];

export default function JourneyStepper() {
  const { activeStep, goToStep, highestUnlockedStep, testState, serverData, readinessVerdict } = useResumeJourney();

  return (
    <div className="w-full bg-white border border-[#E6E3F7] rounded-2xl p-3 sm:p-4 shadow-xs">
      {/* Desktop Stepper (>= 768px) */}
      <div className="hidden md:grid grid-cols-5 gap-2">
        {STEPS.map((s) => {
          const isActive = activeStep === s.id;
          const isDone =
            activeStep > s.id ||
            (s.id === 4 && activeStep === 4 && testState?.status === 'submitted') ||
            (s.id === 5 && activeStep === 5 && (serverData?.certificate || readinessVerdict?.compositeScore >= 70));
          const isUnlocked = s.id <= (highestUnlockedStep || 1);

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => isUnlocked && goToStep(s.id)}
              disabled={!isUnlocked}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-[#F0EDFC] border-[#5B21D6] shadow-xs'
                  : isDone
                  ? 'bg-[#F7F6FF] border-[#E6E3F7] hover:border-[#D8D2FA]'
                  : isUnlocked
                  ? 'bg-white border-[#E6E3F7] hover:border-[#D8D2FA]'
                  : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#5B21D6] text-white shadow-xs'
                    : isDone
                    ? 'bg-[#0E8F5F] text-white'
                    : 'bg-[#ECEAF9] text-[#767B8A]'
                }`}
              >
                {isDone ? '✓' : s.id}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-[12.5px] font-semibold truncate ${
                    isActive ? 'text-[#141A33]' : isDone ? 'text-[#0E8F5F]' : 'text-[#767B8A]'
                  }`}
                >
                  {s.title}
                </div>
                <div className="text-[10.5px] text-[#9A9FAE] truncate">
                  {s.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile Stepper (< 768px) */}
      <div className="flex md:hidden items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => activeStep > 1 && goToStep(activeStep - 1)}
          disabled={activeStep <= 1}
          className="p-2 rounded-xl border border-[#E6E3F7] text-[#5B6168] bg-[#F6F5FC] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex-1 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B21D6]">
            Step {activeStep} of 5 · {STEPS[activeStep - 1]?.title}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            {STEPS.map((s) => {
              const isStepDone =
                activeStep > s.id ||
                (s.id === 4 && activeStep === 4 && testState?.status === 'submitted') ||
                (s.id === 5 && activeStep === 5 && (serverData?.certificate || readinessVerdict?.compositeScore >= 70));

              return (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${
                    activeStep === s.id
                      ? 'w-6 bg-[#5B21D6]'
                      : isStepDone
                      ? 'w-2 bg-[#0E8F5F]'
                      : 'w-2 bg-[#ECEAF9]'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => activeStep < 5 && goToStep(activeStep + 1)}
          disabled={activeStep >= 5 || activeStep >= (highestUnlockedStep || 1)}
          className="p-2 rounded-xl border border-[#E6E3F7] text-[#5B6168] bg-[#F6F5FC] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
