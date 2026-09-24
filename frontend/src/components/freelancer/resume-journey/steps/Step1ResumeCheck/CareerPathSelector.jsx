import React from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { PATHS, PATH_WINS } from '../../data/resumeStep1Data';

export default function CareerPathSelector() {
  const { selectedPaths, togglePath } = useResumeJourney();
  const activePathId = selectedPaths[0] || 'p1';
  const quickWins = PATH_WINS[activePathId] || PATH_WINS.p1;

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
          Pick your desired speed and salary tier. Modules and assessments will personalize to your choice.
        </p>
      </div>

      {/* Path Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PATHS.map((path) => {
          const isSelected = selectedPaths.includes(path.id);

          return (
            <button
              key={path.id}
              type="button"
              onClick={() => togglePath(path.id)}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'border-[#5B21D6] bg-[#F0EDFC]/40 ring-1 ring-[#5B21D6]/40 shadow-xs'
                  : 'border-[#E6E3F7] bg-white hover:border-[#D8D2FA]'
              }`}
            >
              {path.recommended && (
                <span className="absolute top-2 right-2 text-[9.5px] font-bold uppercase tracking-wider bg-[#5B21D6] text-white px-2 py-0.5 rounded-full shadow-xs">
                  Recommended
                </span>
              )}

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isSelected ? 'bg-[#5B21D6] text-white' : 'bg-[#ECEAF9] text-[#5B21D6]'
                  }`}
                >
                  {path.badge}
                </span>
                <span className="text-[11.5px] text-[#767B8A]">
                  {path.lessons} core modules
                </span>
              </div>

              <div className="text-[14px] font-bold text-[#141A33] mt-2">
                {path.title}
              </div>
              <div className="text-[12px] text-[#767B8A] mt-0.5">
                {path.sub}
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#ECEAF9] text-[11.5px] text-[#0E8F5F] font-semibold flex items-center justify-between">
                <span>{path.kya.split('·')[0]}</span>
                <span className="text-[#5B21D6] text-xs font-bold">
                  {isSelected ? '✓ Selected' : '+ Select'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3 Quick Wins for Active Path */}
      <div className="p-4 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <h4 className="text-[13.5px] font-bold text-[#141A33] m-0">
              3 Quick Wins for Selected Path ({PATHS.find((p) => p.id === activePathId)?.badge})
            </h4>
          </div>
          <span className="text-[11px] text-[#5B21D6] font-semibold">
            Next 30 Days
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
