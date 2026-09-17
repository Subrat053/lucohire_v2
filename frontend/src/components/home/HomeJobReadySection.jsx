import React from 'react';

const STEPS = [
  {
    num: 1,
    title: 'Batao — kya padhna hai',
    desc: 'We compare the job to your profile and name the exact gaps — not a generic syllabus everyone gets.',
    isActive: false,
  },
  {
    num: 2,
    title: 'Padhaao',
    badge: 'IN PROGRESS',
    desc: "Bite-sized lessons on just those gaps — SQL joins, System Design basics, whatever's actually missing.",
    isActive: true,
  },
  {
    num: 3,
    title: 'Practice karao',
    desc: 'Real interview-style questions and scenarios, not flashcards — until it actually sticks.',
    isActive: false,
  },
  {
    num: 4,
    title: 'Test karo',
    desc: 'A timed test built like what recruiters actually screen for — no guessing your own score.',
    isActive: false,
  },
  {
    num: 5,
    title: 'Bata do — ready hoon ya nahi',
    desc: "One straight verdict: job-ready, or exactly what's left before you can say yes.",
    isActive: false,
  },
];

export default function HomeJobReadySection() {
  return (
    <section className="py-8 px-5 sm:px-8 max-w-[460px] md:max-w-3xl lg:max-w-4xl mx-auto">
      {/* Badge */}
      <div>
        <span className="inline-flex items-center gap-2 border-[1.5px] border-[#D8D2FA] rounded-full py-2 px-4 text-[12px] font-bold tracking-[0.03em] text-[#4A3AE0] bg-white">
          <span className="w-[7px] h-[7px] rounded-full bg-gradient-to-br from-[#4A3AE0] to-[#F5C445]" />
          YOUR PATH TO JOB-READY
        </span>
      </div>

      <h3 className="font-space text-[24px] sm:text-[28px] font-extrabold tracking-[-0.3px] text-[#1C1733] mt-4">
        One flow, start to finish.
      </h3>
      <p className="text-[13.5px] sm:text-[14px] text-[#75708F] mt-2 leading-[1.6] max-w-[42ch]">
        So you're not jumping across 5 apps just to prep for one job.
      </p>

      {/* Steps List */}
      <div className="mt-6 flex flex-col">
        {STEPS.map((step, idx) => {
          const isLast = idx === STEPS.length - 1;
          return (
            <div key={step.num} className="flex gap-4 relative pb-6 last:pb-0">
              {/* Connecting Line */}
              {!isLast && (
                <div className="absolute left-[17px] top-[38px] bottom-0 w-[1.5px] bg-[#ECEAF9]" />
              )}

              {/* Number Circle */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-space font-bold text-[14.5px] shrink-0 z-10 ${
                  step.isActive
                    ? 'bg-[#4A3AE0] border-[1.5px] border-[#4A3AE0] text-white shadow-sm'
                    : 'bg-[#F7F6FF] border-[1.5px] border-[#D8D2FA] text-[#4A3AE0]'
                }`}
              >
                {step.num}
              </div>

              {/* Step Content */}
              <div className="pt-0.5">
                <h4 className="font-space text-[16px] sm:text-[17px] font-bold text-[#1C1733] flex items-center gap-2.5 flex-wrap">
                  <span>{step.title}</span>
                  {step.badge && (
                    <span className="text-[10.5px] font-bold tracking-[0.02em] bg-[#F1EDFF] text-[#4A3AE0] py-1 px-2.5 rounded-full">
                      {step.badge}
                    </span>
                  )}
                </h4>
                <p className="text-[13px] sm:text-[13.5px] text-[#75708F] leading-[1.55] mt-1.5 max-w-[44ch]">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Progress Card */}
      <div className="mt-6 rounded-[18px] bg-[#F7F6FF] border border-[#ECEAF9] p-4 sm:p-5 flex flex-wrap items-center gap-3.5 relative">
        <div className="w-[46px] h-[46px] rounded-full bg-white border-[1.5px] border-[#ECEAF9] flex items-center justify-center text-[20px] shrink-0 shadow-xs">
          🎯
        </div>
        <p className="flex-1 min-w-[200px] text-[13.5px] text-[#75708F] leading-[1.55]">
          Right now: <b className="font-space text-[#4A3AE0] font-bold">68% ready</b> for Senior UX Designer roles — 2 topics left before we say "go apply."
        </p>
        <div className="w-full h-[7px] rounded-full bg-[#D8D2FA] overflow-hidden mt-1">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4A3AE0] to-[#6C5CE8]"
            style={{ width: '68%' }}
          />
        </div>
      </div>
    </section>
  );
}
