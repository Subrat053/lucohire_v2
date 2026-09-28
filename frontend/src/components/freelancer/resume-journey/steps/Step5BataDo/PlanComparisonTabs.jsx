import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { ROLE_BY_PATH, PLAN_B_BY_PATH } from '../../data/batadoData';

export default function PlanComparisonTabs() {
  const navigate = useNavigate();
  const { selectedPaths, readinessVerdict, serverReadiness } = useResumeJourney();
  const [activeTab, setActiveTab] = useState('planA');

  const activePathId = selectedPaths[0] || 'p1';
  const roleA = serverReadiness?.planA || readinessVerdict?.planA || ROLE_BY_PATH[activePathId] || ROLE_BY_PATH.p1;
  const roleB = serverReadiness?.planB || readinessVerdict?.planB || PLAN_B_BY_PATH[activePathId] || PLAN_B_BY_PATH.p1;

  const planAScore = readinessVerdict.combinedScore || 70;
  const planBScore = Math.min(97, planAScore + 18);

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
            Strategic Pathways
          </span>
          <h3 className="text-[17px] sm:text-[19px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            Two Feasible Ways to Proceed
          </h3>
          <p className="text-[12px] text-[#767B8A] mt-0.5 m-0">
            Compare your primary target jump against an immediate, high-probability safety track.
          </p>
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
          Plan A: {roleA.role} (Target)
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
        <div className="p-4 bg-[#F7F6FF] border border-[#D8D2FA] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-bold text-[#141A33]">{roleA.role}</div>
              <div className="text-[11px] text-[#767B8A]">Primary Aspirational Jump</div>
            </div>
            <span className="text-xs font-bold text-[#5B21D6] bg-white border border-[#D8D2FA] px-2.5 py-0.5 rounded-full">
              {roleA.pay}
            </span>
          </div>

          <p className="text-[12px] text-[#5B6168] leading-relaxed m-0">
            Targeting top tier product companies and startups. Requires mastering remaining gaps in system design, state caching, and live code reviews.
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#D8D2FA]/50">
            <div className="p-2 bg-white/80 rounded-lg">
              <span className="text-[10.5px] text-[#767B8A] block">Feasibility Timeline</span>
              <span className="font-bold text-[#5B21D6] text-[12px]">3–4 Weeks Prep</span>
            </div>
            <div className="p-2 bg-white/80 rounded-lg">
              <span className="text-[10.5px] text-[#767B8A] block">Match Probability</span>
              <span className="font-bold text-[#5B21D6] text-[12px]">{planAScore}% Benchmark</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#E5F6EE]/50 border border-[#A7E5CB] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-bold text-[#141A33]">{roleB.role}</div>
              <div className="text-[11px] text-[#0E8F5F] font-semibold">Immediate Safety Track</div>
            </div>
            <span className="text-xs font-bold text-[#0E8F5F] bg-white border border-[#0E8F5F]/30 px-2.5 py-0.5 rounded-full">
              {roleB.pay}
            </span>
          </div>

          <div className="text-[11px] font-medium text-[#767B8A]">
            Context: {roleB.context}
          </div>

          <p className="text-[12px] text-[#181B24] leading-relaxed m-0">
            {roleB.why}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#A7E5CB]/60">
            <div className="p-2 bg-white/90 rounded-lg">
              <span className="text-[10.5px] text-[#767B8A] block">Feasibility Timeline</span>
              <span className="font-bold text-[#0E8F5F] text-[12px]">Immediate (0 Days)</span>
            </div>
            <div className="p-2 bg-white/90 rounded-lg">
              <span className="text-[10.5px] text-[#767B8A] block">Shortlist Probability</span>
              <span className="font-bold text-[#0E8F5F] text-[12px]">{planBScore}% (Near 100%)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/freelancer/leads')}
            className="w-full mt-2 py-2 px-3 bg-[#0E8F5F] hover:bg-[#0B7A51] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <span>⚡ Apply to Plan B Verified Leads Today</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

