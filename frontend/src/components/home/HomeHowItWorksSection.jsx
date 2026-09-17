import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomeHowItWorksSection({ onScrollToPost }) {
  const navigate = useNavigate();

  return (
    <section className="py-8 px-5 sm:px-8 max-w-[460px] md:max-w-4xl lg:max-w-6xl mx-auto">
      <p className="text-[11.5px] font-bold tracking-[0.04em] text-[#4A3AE0] uppercase mb-2">
        How LucoHire Works
      </p>
      <h3 className="font-space text-[20px] sm:text-[24px] font-bold text-[#1C1733] leading-snug">
        One platform. Two sides. Real work, done fast.
      </h3>
      <p className="text-[13px] sm:text-[14px] text-[#75708F] mt-1.5 leading-[1.55] max-w-[50ch]">
        Whether you're here to hire freelancers online or find freelance jobs that pay — here's what you get.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mt-5">
        {/* Card 1: For Freelancers */}
        <div className="rounded-[20px] p-6 text-white relative overflow-hidden bg-[#241A5E] shadow-sm flex flex-col justify-between">
          <div 
            className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] pointer-events-none rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)'
            }}
          />

          <div className="relative z-10">
            <span className="inline-block text-[11px] font-bold tracking-[0.04em] bg-white/16 text-white px-2.5 py-1 rounded-full">
              FOR FREELANCERS
            </span>
            <h3 className="font-space text-[18px] sm:text-[20px] font-bold leading-[1.32] mt-3">
              Find freelance jobs online and get hired faster.
            </h3>
            <p className="text-[12.5px] sm:text-[13px] text-white/80 mt-2 leading-[1.55] max-w-[42ch]">
              Create your free profile, get discovered by verified clients, and start earning from home — no bidding wars, no fee to apply.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex gap-2.5 items-start text-[12px] sm:text-[12.5px] text-white leading-[1.5]">
                <span className="w-5 h-5 rounded-[6px] bg-white/16 flex items-center justify-center text-[10.5px] shrink-0">
                  ✓
                </span>
                <span>Get notified the instant a client posts work matching your skill</span>
              </div>
              <div className="flex gap-2.5 items-start text-[12px] sm:text-[12.5px] text-white leading-[1.5]">
                <span className="w-5 h-5 rounded-[6px] bg-white/16 flex items-center justify-center text-[10.5px] shrink-0">
                  ✓
                </span>
                <span>A verified profile ranks higher and gets picked first</span>
              </div>
              <div className="flex gap-2.5 items-start text-[12px] sm:text-[12.5px] text-white leading-[1.5]">
                <span className="w-5 h-5 rounded-[6px] bg-white/16 flex items-center justify-center text-[10.5px] shrink-0">
                  ⚡
                </span>
                <span>List every skill you freelance in — design, writing, dev, more</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/signup?role=provider')}
            className="mt-6 w-full bg-white text-[#241A5E] hover:bg-gray-100 py-3.5 px-4 rounded-[12px] font-bold text-[13px] sm:text-[13.5px] transition-all cursor-pointer relative z-10 shadow-sm text-center"
          >
            Register as a Freelancer →
          </button>
        </div>

        {/* Card 2: For Clients & Recruiters */}
        <div className="rounded-[20px] p-6 text-white relative overflow-hidden bg-gradient-to-br from-[#B9791A] to-[#7A4E0D] shadow-sm flex flex-col justify-between">
          <div 
            className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] pointer-events-none rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)'
            }}
          />

          <div className="relative z-10">
            <span className="inline-block text-[11px] font-bold tracking-[0.04em] bg-white/16 text-white px-2.5 py-1 rounded-full">
              FOR CLIENTS & RECRUITERS
            </span>
            <h3 className="font-space text-[18px] sm:text-[20px] font-bold leading-[1.32] mt-3">
              Hire freelancers online — fast, free and verified.
            </h3>
            <p className="text-[12.5px] sm:text-[13px] text-white/80 mt-2 leading-[1.55] max-w-[42ch]">
              Post a job for free and get matched with ID-verified freelancers across design, development, content, video and marketing.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex gap-2.5 items-start text-[12px] sm:text-[12.5px] text-white leading-[1.5]">
                <span className="w-5 h-5 rounded-[6px] bg-white/16 flex items-center justify-center text-[10.5px] shrink-0">
                  ✓
                </span>
                <span>
                  Message your first <b className="text-white font-bold">4 freelancers</b> free on any requirement
                </span>
              </div>
              <div className="flex gap-2.5 items-start text-[12px] sm:text-[12.5px] text-white leading-[1.5]">
                <span className="w-5 h-5 rounded-[6px] bg-white/16 flex items-center justify-center text-[10.5px] shrink-0">
                  ✓
                </span>
                <span>Every matching freelancer is notified the moment you post</span>
              </div>
              <div className="flex gap-2.5 items-start text-[12px] sm:text-[12.5px] text-white leading-[1.5]">
                <span className="w-5 h-5 rounded-[6px] bg-white/16 flex items-center justify-center text-[10.5px] shrink-0">
                  ⚡
                </span>
                <span>Too many applicants? Let us shortlist the top 5–6 for you</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onScrollToPost) {
                onScrollToPost();
              } else {
                navigate('/recruiter/post-job');
              }
            }}
            className="mt-6 w-full bg-white text-[#7A4E0D] hover:bg-gray-100 py-3.5 px-4 rounded-[12px] font-bold text-[13px] sm:text-[13.5px] transition-all cursor-pointer relative z-10 shadow-sm text-center"
          >
            Post Your Requirement — Free
          </button>
        </div>
      </div>
    </section>
  );
}
