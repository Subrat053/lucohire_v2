import React from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { SALARY } from '../../data/resumeStep1Data';

export default function SkillsMatrixCard() {
  const { skillsAnalysis } = useResumeJourney();
  const { outdatedFound, fadingFound, risingAnalyzed } = skillsAnalysis;

  return (
    <div id="secSkillsMatrix" className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
          Market Intelligence
        </span>
        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
          Skills Matrix: What to Drop vs. What to Learn
        </h3>
        <p className="text-[12.5px] text-[#767B8A] mt-1 m-0">
          Cross-referenced against current hiring trends across 18,000+ job listings in India.
        </p>
      </div>

      {/* 1. Skills to Drop */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B3492F]" />
            <h4 className="text-[14px] font-bold text-[#141A33] m-0">
              Skills to Drop (Hurting ATS Score)
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-[#B3492F] bg-[#FBEAE8] px-2 py-0.5 rounded-full">
            Declining Demand
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {outdatedFound.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-all ${
                item.inProfile
                  ? 'bg-[#FBEAE8]/40 border-[#B3492F]/40 ring-1 ring-[#B3492F]/20'
                  : 'bg-[#FAF9FE] border-[#ECEAF9]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[13px] font-bold text-[#141A33] truncate">
                  {item.skill}
                </span>
                <span className="text-[10.5px] font-bold text-[#B3492F]">
                  {item.trend}
                </span>
              </div>
              <div className="text-[11px] text-[#767B8A] mt-0.5">
                {item.jobs}
              </div>
              <div className="text-[10.5px] font-medium text-[#B3492F] mt-2 pt-1 border-t border-[#ECEAF9]">
                💡 {item.action}
              </div>
              {item.inProfile && (
                <div className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-[#B3492F] bg-[#FBEAE8] px-1.5 py-0.5 rounded text-center">
                  Found in your profile
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Fading Skills */}
      <div className="space-y-3 pt-2 border-t border-[#ECEAF9]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B9791A]" />
            <h4 className="text-[14px] font-bold text-[#141A33] m-0">
              Fading Skills (Keep, But Pair With Modern Tooling)
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-[#B9791A] bg-[#FBF1DF] px-2 py-0.5 rounded-full">
            Upgrade Required
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {fadingFound.map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[13px] font-bold text-[#141A33] truncate">
                  {item.skill}
                </span>
                <span className="text-[10.5px] font-bold text-[#B9791A]">
                  {item.trend}
                </span>
              </div>
              <div className="text-[11px] text-[#767B8A] mt-0.5">
                {item.jobs}
              </div>
              <div className="text-[10.5px] text-[#767B8A] mt-2 pt-1 border-t border-[#ECEAF9] line-clamp-2">
                {item.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Skills on the Rise */}
      <div className="space-y-3 pt-2 border-t border-[#ECEAF9]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E8F5F]" />
            <h4 className="text-[14px] font-bold text-[#141A33] m-0">
              High-Velocity Skills (Unlocking Top LPA Offers)
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-[#0E8F5F] bg-[#E5F6EE] px-2 py-0.5 rounded-full">
            High Growth
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {risingAnalyzed.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all ${
                item.acquired
                  ? 'bg-[#E5F6EE]/30 border-[#0E8F5F]/40'
                  : 'bg-white border-[#E6E3F7] hover:border-[#D8D2FA]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-bold text-[#141A33]">
                  {item.skill}
                </span>
                <span className="text-[11px] font-bold text-[#0E8F5F] bg-[#E5F6EE] px-2 py-0.5 rounded-md">
                  {item.trend}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11.5px] text-[#767B8A] mt-2">
                <span>{item.jobs}</span>
                <span className="font-semibold text-[#141A33]">
                  Avg: {item.salary}
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-[#ECEAF9] flex items-center justify-between">
                <span className="text-[11px] text-[#5B21D6] font-medium">
                  {item.acquired ? '✓ Verified in profile' : '⚡ Unlocks high-paying leads'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.acquired ? 'bg-[#0E8F5F] text-white' : 'bg-[#F0EDFC] text-[#5B21D6]'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Salary Tiers */}
      <div className="p-4 bg-[#F7F6FF] border border-[#D8D2FA] rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-bold text-[#141A33] m-0">
            Higher Salary Unlocks (15+ LPA Bracket)
          </h4>
          <span className="text-[11px] font-bold text-[#5B21D6]">
            System Design &amp; AI
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SALARY.map((s, idx) => (
            <div key={idx} className="p-2.5 bg-white rounded-lg border border-[#E6E3F7]">
              <div className="text-[12px] font-bold text-[#141A33]">{s.title}</div>
              <div className="text-[10.5px] text-[#0E8F5F] font-semibold">{s.jobs}</div>
              <div className="text-[10px] text-[#767B8A] mt-1 line-clamp-2">{s.add}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
