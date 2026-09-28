import React, { useMemo, useState, useEffect } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { generateDynamicActionPlan } from '../../engine/readinessEngine';

const STORAGE_TASK_KEY = 'lh_action_plan_completed_tasks';

export default function DynamicActionPlan() {
  const { testState, practiceState, selectedPaths, serverReadiness, readinessVerdict } = useResumeJourney();

  const weakTopics = useMemo(() => {
    const combined = [
      ...(practiceState?.weakTopics || []),
      ...(testState?.weakTopics || []),
      ...(serverReadiness?.weakTopics || []),
    ];
    return [...new Set(combined)];
  }, [practiceState?.weakTopics, testState?.weakTopics, serverReadiness?.weakTopics]);

  const rawActionPlan = useMemo(() => {
    if (serverReadiness?.actionPlan && Array.isArray(serverReadiness.actionPlan) && serverReadiness.actionPlan.length > 0) {
      return serverReadiness.actionPlan;
    }
    return generateDynamicActionPlan(weakTopics, selectedPaths[0] || 'p1');
  }, [serverReadiness?.actionPlan, weakTopics, selectedPaths]);

  // Interactive checked tasks tracker
  const [completedTaskIds, setCompletedTaskIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_TASK_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleTask = (taskId) => {
    setCompletedTaskIds((prev) => {
      const next = prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId];
      try {
        localStorage.setItem(STORAGE_TASK_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isCached = Boolean(serverReadiness?.isCached || readinessVerdict?.isCached);

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
              Tailored Schedule
            </span>
            {isCached && (
              <span className="text-[10px] font-bold text-[#0E8F5F] bg-[#E5F6EE] px-2 py-0.5 rounded-full">
                ⚡ DB Stored Plan (0 Extra Tokens)
              </span>
            )}
          </div>
          <h3 className="text-[17px] sm:text-[19px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            Your 30-Day Closing-the-Gap Action Plan
          </h3>
          <p className="text-[12px] text-[#767B8A] mt-0.5 m-0">
            Generated dynamically from your actual test misses, uncompleted lessons, and missing ATS skills.
          </p>
        </div>
      </div>

      {weakTopics.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl text-xs">
          <span className="font-semibold text-[#141A33] text-[11px]">Identified Gap Topics:</span>
          {weakTopics.slice(0, 4).map((topic, i) => (
            <span key={i} className="bg-white border border-[#D8D2FA] text-[#5B21D6] text-[10.5px] font-medium px-2 py-0.5 rounded-md">
              {topic}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {rawActionPlan.map((step, idx) => (
          <div key={idx} className="p-3.5 sm:p-4 rounded-xl border border-[#ECEAF9] bg-[#FAF9FE] space-y-2.5">
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

            <ul className="space-y-1.5 pl-1 list-none text-[12px] text-[#5B6168]">
              {step.items.map((item, itemIdx) => {
                const taskId = `${step.week}_task_${itemIdx}`;
                const isChecked = completedTaskIds.includes(taskId);

                return (
                  <li
                    key={itemIdx}
                    onClick={() => toggleTask(taskId)}
                    className="flex items-start gap-2.5 cursor-pointer select-none group"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 w-3.5 h-3.5 rounded text-[#5B21D6] border-gray-300 focus:ring-[#5B21D6] cursor-pointer"
                    />
                    <span className={`leading-relaxed transition-colors ${isChecked ? 'line-through text-[#767B8A]' : 'group-hover:text-[#141A33]'}`}>
                      {item}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

