import React from 'react';

export default function HomeTrustSection({
  stats = {
    responseRate: '98%',
    avgResponseTime: '~12 min',
    avgRating: '4.7★',
  },
}) {
  return (
    <section className="py-8 px-5 sm:px-8 max-w-[460px] md:max-w-3xl lg:max-w-4xl mx-auto">
      <p className="text-[11.5px] font-bold tracking-[0.04em] text-[#4A3AE0] uppercase mb-2">
        Why LucoHire
      </p>
      <h3 className="font-space text-[18px] sm:text-[22px] font-bold text-[#1C1733] mb-4">
        Built so both sides show up serious
      </h3>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="text-center bg-[#F7F6FF] rounded-[14px] p-3.5 sm:p-5 border border-[#ECEAF9]">
          <div className="font-space text-[17px] sm:text-[22px] font-bold text-[#4A3AE0]">
            {stats.responseRate || '98%'}
          </div>
          <div className="text-[10.5px] sm:text-[12px] text-[#75708F] mt-1 leading-[1.3]">
            Requirements get a response
          </div>
        </div>

        <div className="text-center bg-[#F7F6FF] rounded-[14px] p-3.5 sm:p-5 border border-[#ECEAF9]">
          <div className="font-space text-[17px] sm:text-[22px] font-bold text-[#4A3AE0]">
            {stats.avgResponseTime || '~12 min'}
          </div>
          <div className="text-[10.5px] sm:text-[12px] text-[#75708F] mt-1 leading-[1.3]">
            Avg. freelancer response time
          </div>
        </div>

        <div className="text-center bg-[#F7F6FF] rounded-[14px] p-3.5 sm:p-5 border border-[#ECEAF9]">
          <div className="font-space text-[17px] sm:text-[22px] font-bold text-[#4A3AE0]">
            {stats.avgRating || '4.7★'}
          </div>
          <div className="text-[10.5px] sm:text-[12px] text-[#75708F] mt-1 leading-[1.3]">
            Avg. freelancer rating
          </div>
        </div>
      </div>
    </section>
  );
}
