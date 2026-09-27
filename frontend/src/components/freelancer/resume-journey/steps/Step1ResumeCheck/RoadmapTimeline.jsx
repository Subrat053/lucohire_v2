import React from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { ROADMAP as FALLBACK_ROADMAP } from '../../data/resumeStep1Data';

export default function RoadmapTimeline() {
  const { atsAuditData } = useResumeJourney();
  const roadmap = atsAuditData?.roadmap && atsAuditData.roadmap.length > 0
    ? atsAuditData.roadmap
    : FALLBACK_ROADMAP;

  return (
    <div id="secRoadmap" className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
          Future Proofing · 4 to 6 Year Outlook
        </span>
        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
          Staying Relevant Through 2030
        </h3>
        <p className="text-[12.5px] text-[#767B8A] mt-1 m-0">
          The engineering market is pivoting toward AI agentic orchestration, performance resilience, and full-stack ownership. Here is your tailored trajectory:
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {roadmap.map((item, idx) => (
          <div key={idx} className="p-3.5 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9] space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="inline-block text-[11px] font-bold text-[#5B21D6] bg-white border border-[#D8D2FA] px-2 py-0.5 rounded-md">
                {item.year}
              </span>
              {idx === 0 && (
                <span className="text-[9.5px] font-bold uppercase tracking-wider bg-[#E5F6EE] text-[#0E8F5F] px-1.5 py-0.5 rounded">
                  Current Baseline
                </span>
              )}
            </div>
            <div className="text-[13.5px] font-bold text-[#141A33]">
              {item.title}
            </div>
            <div className="text-[11.5px] text-[#767B8A] leading-relaxed">
              {item.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
