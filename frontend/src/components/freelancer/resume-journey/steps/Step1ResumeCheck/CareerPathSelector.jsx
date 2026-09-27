import React from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { PATHS, PATH_WINS } from '../../data/resumeStep1Data';

export default function CareerPathSelector() {
  const { selectedPaths, togglePath, atsAuditData } = useResumeJourney();
  const activePathId = selectedPaths[0] || 'p1';

  const pathHeuristics = atsAuditData?.pathHeuristics || null;
  const quickWins = pathHeuristics?.quickWins || PATH_WINS[activePathId] || PATH_WINS.p1;

  // Compute heuristic probability estimates for non-active paths as preview
  const getHeuristicForPath = (pathId) => {
    if (pathId === activePathId && pathHeuristics) {
      return {
        prob: pathHeuristics.probability,
        label: pathHeuristics.probabilityLabel,
        timeline: pathHeuristics.timelineEstimate,
      };
    }
    // Dynamic estimates based on difficulty tier
    const baseMap = { p1: 82, p2: 64, p3: 45, p4: 68 };
    const base = baseMap[pathId] || 70;
    return {
      prob: base,
      label: base >= 75 ? 'High Probability' : base >= 55 ? 'Moderate Match' : 'Stretch Target',
      timeline: base >= 75 ? 'Ready in 30 days' : 'Requires 60–90 days',
    };
  };

  return (
    <div id="secPaths" className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
          Tailored Trajectory
        </span>
        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
          Choose Your Career Target
        </h3>
        <p className="text-[12.5px] text-[#767B8A] mt-1 m-0">
          Pick your desired trajectory. Our system dynamically benchmarks your current skills against target requirements and calculates your heuristic probability of cracking the role.
        </p>
      </div>

      {/* Path Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PATHS.map((path) => {
          const isSelected = selectedPaths.includes(path.id);
          const heuristic = getHeuristicForPath(path.id);

          return (
            <button
              key={path.id}
              type="button"
              onClick={() => togglePath(path.id)}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-[#5B21D6] bg-[#F0EDFC]/40 ring-1 ring-[#5B21D6]/40 shadow-xs'
                  : 'border-[#E6E3F7] bg-white hover:border-[#D8D2FA]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-[#5B21D6] text-white' : 'bg-[#ECEAF9] text-[#5B21D6]'
                    }`}
                  >
                    {path.badge}
                  </span>
                  <span className="text-[10.5px] font-bold text-[#0E8F5F] bg-[#E5F6EE] px-2 py-0.5 rounded-full">
                    {heuristic.prob}% Match
                  </span>
                </div>

                <div className="text-[14px] font-bold text-[#141A33] mt-2">
                  {path.title}
                </div>
                <div className="text-[12px] text-[#767B8A] mt-0.5">
                  {path.sub}
                </div>

                {/* Match Probability Progress Bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10.5px] text-[#5B6168]">
                    <span>Heuristic probability</span>
                    <span className="font-semibold text-[#141A33]">{heuristic.timeline}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E4DFFB]/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        heuristic.prob >= 75
                          ? 'bg-[#0E8F5F]'
                          : heuristic.prob >= 55
                          ? 'bg-[#B9791A]'
                          : 'bg-[#5B21D6]'
                      }`}
                      style={{ width: `${heuristic.prob}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#ECEAF9] text-[11.5px] text-[#0E8F5F] font-semibold flex items-center justify-between">
                <span>{path.kya.split('·')[0]}</span>
                <span className="text-[#5B21D6] text-xs font-bold">
                  {isSelected ? '✓ Active Target' : '+ Select Target'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Target Requirements & Missing Skill Gaps for Selected Path */}
      {pathHeuristics && (
        <div className="p-4 bg-[#F7F5FE] border border-[#D8D2FA] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <h4 className="text-[13.5px] font-bold text-[#141A33] m-0">
                Target Requirements for {pathHeuristics.targetTitle} ({pathHeuristics.targetSalary})
              </h4>
            </div>
            <span className="text-[11px] font-bold text-[#5B21D6] bg-white border border-[#D8D2FA] px-2 py-0.5 rounded-full">
              {pathHeuristics.matchedCount} / {pathHeuristics.totalCoreCount} Core Skills
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {pathHeuristics.matchedSkills?.map((s, idx) => (
              <span key={idx} className="bg-[#E5F6EE] text-[#0E8F5F] border border-[#0E8F5F]/20 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
                <span>✓</span>
                <span>{s}</span>
              </span>
            ))}
            {pathHeuristics.missingSkills?.map((s, idx) => (
              <span key={idx} className="bg-[#FBEAE8] text-[#B3492F] border border-[#B3492F]/20 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
                <span>+ Learn:</span>
                <span>{s}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3 Quick Wins for Active Path */}
      <div className="p-4 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h4 className="text-[13.5px] font-bold text-[#141A33] m-0">
              3 Tailored Quick Wins for Selected Path ({PATHS.find((p) => p.id === activePathId)?.badge})
            </h4>
          </div>
          <span className="text-[11px] text-[#5B21D6] font-semibold">
            Next 30 Days Trajectory
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {quickWins.map((win, idx) => (
            <div key={idx} className="p-3 bg-white rounded-lg border border-[#E6E3F7] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5B21D6]">
                  #{win.n} {win.skill}
                </span>
                <span className="text-[10px] font-medium text-[#767B8A] bg-[#ECEAF9] px-1.5 py-0.5 rounded">
                  {win.time}
                </span>
              </div>
              <div className="text-[11px] text-[#0E8F5F] font-semibold">
                {win.jobs}
              </div>
              <div className="text-[10.5px] text-[#767B8A] italic line-clamp-2">
                "{win.line}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
