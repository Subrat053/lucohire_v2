import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PRICING_DATA = {
  freelancer: {
    color: '#16A34A',
    tint: '#EAFBF1',
    freeAmt: '₹0',
    freeUnit: '/forever',
    free: [
      'Create your full profile',
      'Show up in search & get notified of matching requirements',
      'Accept requirements & message clients',
      'Unlimited applications',
    ],
    premAmt: 'From ₹49',
    premUnit: '/month',
    prem: [
      'Verified badge — ID, payment & portfolio checked',
      'Profile boost — placed above unverified profiles',
      'Priority on new matching requirements',
    ],
    why: (
      <>
        <b className="text-[#1C1733]">Free</b> gets you listed and matched.{' '}
        <b className="text-[#1C1733]">Verified + Boosted</b> gets you picked first.
      </>
    ),
    social: '2,300+ freelancers already verified or boosted',
    cta: 'Get Verified — from ₹49/month',
    ctaLink: '/provider/plans',
  },
  recruiter: {
    color: '#B9791A',
    tint: '#FBF1DF',
    freeAmt: '₹0',
    freeUnit: '/forever',
    free: [
      'Post unlimited requirements',
      'Search & browse every profile',
      'Open full profiles, no limit',
      'Message your first 4 freelancers per requirement',
    ],
    premAmt: '₹1,499',
    premUnit: '/month',
    prem: [
      'Unlimited messages to freelancers',
      'AI-shortlisted top 5–6 matches per requirement',
      'Priority support',
    ],
    why: (
      <>
        <b className="text-[#1C1733]">Free</b> lets you browse everyone.{' '}
        <b className="text-[#1C1733]">Premium</b> tells you exactly who to message first.
      </>
    ),
    social: '1,100+ businesses hiring on LucoHire',
    cta: 'Upgrade — ₹1,499/month',
    ctaLink: '/recruiter/plans',
  },
};

export default function HomePricingSection() {
  const [activeTab, setActiveTab] = useState('freelancer');
  const navigate = useNavigate();

  const data = PRICING_DATA[activeTab];

  return (
    <section className="py-8 px-5 sm:px-8 max-w-[460px] md:max-w-3xl lg:max-w-4xl mx-auto">
      <p className="text-[11.5px] font-bold tracking-[0.04em] text-[#4A3AE0] uppercase mb-2">
        Free vs Paid
      </p>
      <h3 className="font-space text-[20px] sm:text-[24px] font-bold text-[#1C1733]">
        What's free, and what's worth paying for
      </h3>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-[#F7F6FF] border border-[#ECEAF9] rounded-[13px] p-1 mt-4">
        <button
          type="button"
          onClick={() => setActiveTab('freelancer')}
          className={`flex-1 text-center py-2.5 px-2 rounded-[10px] text-[12.5px] sm:text-[13px] font-bold transition-all cursor-pointer ${
            activeTab === 'freelancer'
              ? 'bg-[#16A34A] text-white shadow-sm'
              : 'text-[#75708F] hover:text-[#1C1733]'
          }`}
        >
          Freelancer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recruiter')}
          className={`flex-1 text-center py-2.5 px-2 rounded-[10px] text-[12.5px] sm:text-[13px] font-bold transition-all cursor-pointer ${
            activeTab === 'recruiter'
              ? 'bg-[#B9791A] text-white shadow-sm'
              : 'text-[#75708F] hover:text-[#1C1733]'
          }`}
        >
          Recruiter / Client
        </button>
      </div>

      {/* Price Card */}
      <div className="bg-white border border-[#ECEAF9] rounded-[18px] mt-4 overflow-hidden shadow-[0_4px_18px_rgba(20,15,80,0.05)]">
        <div className="flex flex-col sm:flex-row">
          {/* Free Column */}
          <div className="flex-1 p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-[#ECEAF9]">
            <div className="text-[10.5px] font-bold tracking-[0.03em] text-[#75708F] uppercase">
              Free
            </div>
            <div className="font-space text-[20px] sm:text-[22px] font-bold text-[#1C1733] my-2">
              {data.freeAmt}
              <span className="text-[11.5px] font-medium text-[#75708F] ml-1">
                {data.freeUnit}
              </span>
            </div>
            <div className="space-y-2 mt-3">
              {data.free.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[12px] sm:text-[12.5px] text-[#75708F] leading-snug">
                  <svg className="shrink-0 mt-0.5 text-[#0E8F5F]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Paid / Premium Column */}
          <div 
            className="flex-1 p-4 sm:p-5 relative"
            style={{ backgroundColor: data.tint }}
          >
            <div className="absolute top-0 right-3 bg-[#F5C445] text-[#3d2e00] text-[9px] font-extrabold tracking-[0.02em] px-2 py-0.5 rounded-b-[7px]">
              WORTH IT
            </div>
            <div 
              className="text-[10.5px] font-bold tracking-[0.03em] uppercase"
              style={{ color: data.color }}
            >
              Paid
            </div>
            <div 
              className="font-space text-[20px] sm:text-[22px] font-bold my-2"
              style={{ color: data.color }}
            >
              {data.premAmt}
              <span className="text-[11.5px] font-medium ml-1 opacity-70">
                {data.premUnit}
              </span>
            </div>
            <div className="space-y-2 mt-3">
              {data.prem.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[12px] sm:text-[12.5px] text-[#75708F] leading-snug">
                  <svg className="shrink-0 mt-0.5" style={{ color: data.color }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why Explanation */}
        <div className="p-3.5 sm:p-4 border-t border-[#ECEAF9] bg-[#F7F6FF] text-[11.5px] sm:text-[12px] text-[#75708F] leading-[1.5]">
          {data.why}
        </div>

        {/* Social Proof */}
        <div className="flex items-center gap-2 px-4 pt-3 text-[11.5px] text-[#75708F]">
          <div className="flex -space-x-1.5 shrink-0">
            <span className="w-5 h-5 rounded-full bg-[#D8D2FA] border-2 border-white inline-block" />
            <span className="w-5 h-5 rounded-full bg-[#6C5CE8] border-2 border-white inline-block" />
            <span className="w-5 h-5 rounded-full bg-[#4A3AE0] border-2 border-white inline-block" />
          </div>
          <span>{data.social}</span>
        </div>

        {/* CTA Button */}
        <div className="p-4 sm:p-5">
          <button
            type="button"
            onClick={() => navigate(data.ctaLink)}
            className="w-full text-white py-3 px-4 rounded-[12px] font-bold text-[13.5px] shadow-sm transition-all cursor-pointer hover:opacity-95 text-center"
            style={{ backgroundColor: data.color }}
          >
            {data.cta}
          </button>
        </div>
      </div>
    </section>
  );
}
