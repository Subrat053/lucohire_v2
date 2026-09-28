import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import VerdictHeroCard from './VerdictHeroCard';
import PlanComparisonTabs from './PlanComparisonTabs';
import DynamicActionPlan from './DynamicActionPlan';
import JobReadyCertificate from './JobReadyCertificate';

export default function BataDoStep() {
  const navigate = useNavigate();
  const { goToStep, resetJourney, loadReadinessVerdict, isLoadingReadiness } = useResumeJourney();

  return (
    <div className="space-y-6">
      {/* Top Banner with Refresh Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0E8F5F] animate-pulse" />
          <span className="text-[12px] font-semibold text-[#141A33]">
            Step 5: Dynamic Job-Ready Assessment &amp; Action Plan
          </span>
        </div>

        <button
          type="button"
          onClick={() => loadReadinessVerdict(true)}
          disabled={isLoadingReadiness}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#5B21D6] hover:text-[#4A3AE0] bg-[#F0EDFC] hover:bg-[#E6E0FA] px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          <span className={isLoadingReadiness ? 'animate-spin' : ''}>🔄</span>
          <span>{isLoadingReadiness ? 'Recalculating...' : 'Recalculate Verdict'}</span>
        </button>
      </div>

      {/* Tier 1: Full-Width Top Executive Verdict Hero */}
      <VerdictHeroCard />

      {/* Tier 2: Middle 2-Column Responsive Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Job Ready Certificate & Strategic Pathways) */}
        <div className="lg:col-span-6 space-y-6">
          <JobReadyCertificate />
          <PlanComparisonTabs />
        </div>

        {/* Right Column (Dynamic 30-Day Closing-the-Gap Action Plan) */}
        <div className="lg:col-span-6 space-y-6">
          <DynamicActionPlan />
        </div>
      </div>

      {/* Tier 3: High-Impact Full-Width Live Hiring Lead CTA */}
      <div className="bg-gradient-to-r from-[#5B21D6] via-[#4A3AE0] to-[#2563EB] text-white rounded-2xl p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#D8D2FA] bg-white/10 px-2.5 py-0.5 rounded-full">
            <span>🚀 Direct Hiring Priority</span>
          </div>
          <h3 className="text-[20px] sm:text-[22px] font-bold text-white m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            Your Profile is Primed for Verified Client Leads
          </h3>
          <p className="text-[13px] text-[#ECEAF9]/85 m-0 max-w-xl">
            Direct client requirements in India are live right now matching your validated skillset. Apply directly with your LucoHire verified credentials.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={() => navigate('/freelancer/leads')}
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-white text-[#5B21D6] hover:bg-[#FAF9FE] font-bold text-[13px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Browse &amp; Apply to Leads</span>
            <span>→</span>
          </button>

          <button
            type="button"
            onClick={() => goToStep(4)}
            className="w-full sm:w-auto py-3.5 px-4 rounded-xl border border-white/30 text-white hover:bg-white/10 font-semibold text-[12.5px] transition-colors cursor-pointer text-center"
          >
            Retake Assessment
          </button>
        </div>
      </div>

      {/* Bottom Step Navigation Bar */}
      <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <button
          type="button"
          onClick={() => goToStep(4)}
          className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-[#E6E3F7] text-[12.5px] font-semibold text-[#5B6168] hover:bg-gray-50 transition-colors cursor-pointer"
        >
          ← Back to Step 4: Test Karo
        </button>

        <button
          type="button"
          onClick={resetJourney}
          className="text-[12px] font-semibold text-[#767B8A] hover:text-[#B3492F] cursor-pointer"
        >
          Reset Journey Progress
        </button>
      </div>
    </div>
  );
}

