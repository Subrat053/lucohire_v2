import React, { useState } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { ROLE_BY_PATH, PLAN_B_BY_PATH } from '../../data/batadoData';

export default function PlanComparisonTabs() {
  const { selectedPaths, readinessVerdict } = useResumeJourney();
  const [activeTab, setActiveTab] = useState('planA');

  const activePathId = selectedPaths[0] || 'p1';
  const roleA = ROLE_BY_PATH[activePathId] || ROLE_BY_PATH.p1;
  const roleB = PLAN_B_BY_PATH[activePathId] || PLAN_B_BY_PATH.p1;

  const planAScore = readinessVerdict.combinedScore;
  const planBScore = Math.min(97, planAScore + 18);

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
            Strategic Pathways
          </span>
          <h3 className="text-[17px] sm:text-[19px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            Plan A (Moonshot) vs. Plan B (Immediate Safety)
          </h3>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border border-[#ECEAF9] rounded-xl p-1 bg-[#FAF9FE] gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('planA')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'planA'
              ? 'bg-white text-[#5B21D6] shadow-xs border border-[#D8D2FA]'
              : 'text-[#767B8A] hover:text-[#141A33]'
          }`}
        >
          Plan A: {roleA.role}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('planB')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'planB'
              ? 'bg-white text-[#0E8F5F] shadow-xs border border-[#0E8F5F]/30'
              : 'text-[#767B8A] hover:text-[#141A33]'
          }`}
        >
          Plan B: {roleB.role} (Fast-Track)
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'planA' ? (
        <div className="p-4 bg-[#F7F6FF] border border-[#D8D2FA] rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-bold text-[#141A33]">{roleA.role}</div>
            <span className="text-xs font-bold text-[#5B21D6] bg-white border border-[#D8D2FA] px-2.5 py-0.5 rounded-full">
              {roleA.pay}
            </span>
          </div>
          <p className="text-[12px] text-[#767B8A] leading-relaxed m-0">
            Top tier product companies and startups (e.g. Swiggy, Razorpay, CRED type bars). Requires disciplined depth in system design, caching, and server components.
          </p>
          <div className="text-[11.5px] font-semibold text-[#5B21D6] pt-1">
            Current Match Probability: {planAScore}%
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#E5F6EE]/40 border border-[#E5F6EE] rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-bold text-[#141A33]">{roleB.role}</div>
            <span className="text-xs font-bold text-[#0E8F5F] bg-white border border-[#0E8F5F]/30 px-2.5 py-0.5 rounded-full">
              {roleB.pay}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-[#767B8A] uppercase">
            Context: {roleB.context}
          </div>
          <p className="text-[12px] text-[#181B24] leading-relaxed m-0">
            {roleB.why}
          </p>
          <div className="text-[11.5px] font-semibold text-[#0E8F5F] pt-1">
            Immediate Hiring Probability: {planBScore}% (Near 100% Shortlist)
          </div>
        </div>
      )}
    </div>
  );
}
