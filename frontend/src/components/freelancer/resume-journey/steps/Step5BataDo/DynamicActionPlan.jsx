import React, { useMemo } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { generateDynamicActionPlan } from '../../engine/readinessEngine';

export default function DynamicActionPlan() {
  const { testState, practiceState, selectedPaths } = useResumeJourney();

  const weakTopics = useMemo(() => {
    const combined = [
      ...(practiceState?.weakTopics || []),
      ...(testState?.weakTopics || []),
    ];
    return [...new Set(combined)];
  }, [practiceState?.weakTopics, testState?.weakTopics]);

  const actionPlan = useMemo(() => {
    return generateDynamicActionPlan(weakTopics, selectedPaths[0] || 'p1');
  }, [weakTopics, selectedPaths]);

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
          Tailored Schedule
        </span>
        <h3 className="text-[17px] sm:text-[19px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
          Your 30-Day Closing-the-Gap Action Plan
        </h3>
        <p className="text-[12px] text-[#767B8A] mt-0.5 m-0">
          Generated dynamically from the specific questions and topics you missed.
        </p>
      </div>

      <div className="space-y-3">
        {actionPlan.map((step, idx) => (
          <div key={idx} className="p-3.5 sm:p-4 rounded-xl border border-[#ECEAF9] bg-[#FAF9FE] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#5B21D6] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="text-[13px] font-bold text-[#141A33]">
                  {step.week}: {step.title}
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#5B21D6] bg-[#F0EDFC] px-2 py-0.5 rounded">
                {step.badge}
              </span>
            </div>

            <ul className="space-y-1 pl-6 list-disc text-[12px] text-[#767B8A]">
              {step.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
