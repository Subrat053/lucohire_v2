import React from 'react';
import { ROADMAP } from '../../data/resumeStep1Data';

export default function RoadmapTimeline() {
  return (
    <div id="secRoadmap" className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
          Future Proofing
        </span>
        <h3 className="text-[18px] sm:text-[20px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
          Staying Relevant Through 2030
        </h3>
        <p className="text-[12.5px] text-[#767B8A] mt-1 m-0">
          The engineering tech stack is shifting toward AI orchestration, performance resilience, and full-stack ownership.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {ROADMAP.map((item, idx) => (
          <div key={idx} className="p-3.5 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9] space-y-2">
            <span className="inline-block text-[11px] font-bold text-[#5B21D6] bg-white border border-[#D8D2FA] px-2 py-0.5 rounded-md">
              {item.year}
            </span>
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
