import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'design', label: 'Design' },
  { id: 'dev', label: 'Development' },
  { id: 'content', label: 'Content' },
  { id: 'video', label: 'Video & Audio' },
  { id: 'marketing', label: 'Marketing' },
];

export default function HomeFreelancersSection({
  freelancers = [],
  isLoading = false,
  onViewProfile,
  onMessageFreelancer,
  activeCategory = 'all',
  onSelectCategory,
}) {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(new Set());

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="py-8 px-5 sm:px-8 max-w-[460px] md:max-w-4xl lg:max-w-6xl mx-auto">
      {/* Section Head */}
      <div className="flex items-end justify-between mb-1">
        <h3 className="font-space text-[19px] sm:text-[22px] font-bold tracking-[-0.2px] text-[#1C1733]">
          Freelancers on LucoHire
        </h3>
        <span className="text-[12px] sm:text-[13px] text-[#75708F] font-semibold">
          6,200+ live
        </span>
      </div>

      {/* Filter Chips Row */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 -mx-1 px-1">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              className={`shrink-0 text-[12px] sm:text-[13px] font-semibold py-1.5 px-3.5 rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#F1EDFF] border-[1.5px] border-[#4A3AE0] text-[#4A3AE0] shadow-sm'
                  : 'bg-[#F7F6FF] border-[1.5px] border-[#ECEAF9] text-[#75708F] hover:text-[#1C1733] hover:border-[#D8D2FA]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-4">
        {isLoading ? (
          // Loading Skeleton
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-[20px] border-[1.5px] border-[#ECEAF9] p-5 animate-pulse min-h-[360px]"
            >
              <div className="flex gap-3 items-center">
                <div className="w-[52px] h-[52px] bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="w-24 h-4 bg-gray-200 rounded" />
                  <div className="w-32 h-3 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="w-full h-8 bg-gray-100 rounded" />
                <div className="w-full h-12 bg-gray-100 rounded" />
              </div>
            </div>
          ))
        ) : (
          freelancers.map((f) => {
            const isFav = favorites.has(f._id || f.id);
            return (
              <div
                key={f._id || f.id}
                className="bg-white rounded-[20px] border-[1.5px] border-[#ECEAF9] shadow-[0_16px_32px_-18px_rgba(20,15,80,0.14)] overflow-hidden relative flex flex-col justify-between hover:shadow-[0_20px_36px_-16px_rgba(20,15,80,0.2)] hover:border-[#D8D2FA] transition-all duration-200"
              >
                {/* Boosted Banner */}
                {f.isBoosted && (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#FFF3CE] to-[#FDE9B0] text-[#8A6300] text-[11px] font-bold px-4 py-2 border-b border-[#ECEAF9]">
                    <span>⚡</span>
                    <span>Boosted profile · Responds fast</span>
                  </div>
                )}

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  {/* Top Profile Header */}
                  <div>
                    <div className="flex gap-3 items-start">
                      {/* Photo Wrap */}
                      <div className="relative w-[52px] h-[52px] shrink-0 rounded-full p-[2px] bg-gradient-to-br from-[#6C5CE8] to-[#D8D2FA]">
                        <img
                          src={f.profilePhoto || 'https://randomuser.me/api/portraits/lego/1.jpg'}
                          alt={f.name}
                          className="w-full h-full rounded-full object-cover block border-2 border-white"
                          loading="lazy"
                        />
                        {f.isOnline && (
                          <span
                            className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-[#16A34A] border-2 border-white"
                            title="Online now"
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-space text-[15px] sm:text-[15.5px] font-bold leading-tight truncate text-[#1C1733]">
                            {f.name}
                          </span>
                          {/* Verified Checkmark Icon */}
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0">
                            <circle cx="10" cy="10" r="10" fill="#4A3AE0" />
                            <path d="M6 10.2l2.4 2.4L14 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="text-[12.5px] text-[#75708F] mt-1 font-medium truncate">
                          {f.primaryRole}
                        </div>
                        <div className="text-[11.5px] text-[#75708F] mt-0.5 truncate">
                          {f.location || `📍 ${f.city || 'India'} · 🌐 Remote`}
                        </div>
                      </div>

                      {/* Rating Column */}
                      <div className="shrink-0 text-right">
                        <div className="font-space text-[15.5px] sm:text-[16px] font-bold text-[#1C1733]">
                          <span className="text-[#F5C445]">★</span> {f.rating || '4.9'}
                        </div>
                        <div className="text-[9.5px] text-[#75708F] mt-0.5">
                          {f.reviewCount ? `${f.reviewCount} jobs` : 'Verified Pro'}
                        </div>
                      </div>
                    </div>

                    {/* 3-Column Meta Row */}
                    <div className="flex mt-3.5 pt-3.5 border-t border-[#ECEAF9]">
                      <div className="flex-1 text-center border-r border-[#ECEAF9]">
                        <div className="font-space text-[13.5px] sm:text-[14px] font-bold text-[#1C1733]">
                          {f.experienceYears || '3+ Yrs'}
                        </div>
                        <div className="text-[9.5px] text-[#75708F] mt-0.5">Experience</div>
                      </div>
                      <div className="flex-1 text-center border-r border-[#ECEAF9]">
                        <div className="font-space text-[13.5px] sm:text-[14px] font-bold text-[#1C1733]">
                          {f.responseRate || '98%'}
                        </div>
                        <div className="text-[9.5px] text-[#75708F] mt-0.5">Response rate</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="font-space text-[13.5px] sm:text-[14px] font-bold text-[#1C1733]">
                          {f.canStart || 'Today'}
                        </div>
                        <div className="text-[9.5px] text-[#75708F] mt-0.5">Can start</div>
                      </div>
                    </div>

                    {/* Skills Chips */}
                    <div className="flex gap-1.5 flex-wrap mt-3.5">
                      {(f.skills || []).slice(0, 4).map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F7F6FF] text-[#75708F]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Pricing & Availability Boxes */}
                    <div className="flex gap-2.5 mt-3.5">
                      <div className="flex-1 rounded-[12px] p-2.5 sm:p-3 bg-[#E5F6EE]">
                        <div className="font-space text-[14px] sm:text-[14.5px] font-bold text-[#0E8F5F] leading-tight">
                          {f.startingRate || '₹500'}
                          <span className="text-[10.5px] font-medium text-[#75708F] ml-0.5">
                            {f.rateUnit || '/hr'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#75708F] mt-0.5">Starting rate</div>
                      </div>

                      <div className="flex-1 rounded-[12px] p-2.5 sm:p-3 bg-[#FBF1DF]">
                        <div className="font-space text-[14px] sm:text-[14.5px] font-bold text-[#B9791A] leading-tight">
                          {f.availableSlots || '3 slots'}
                          <span className="text-[10.5px] font-medium text-[#75708F] ml-0.5">open</span>
                        </div>
                        <div className="text-[10px] text-[#75708F] mt-0.5">{f.slotPeriod || 'This month'}</div>
                      </div>
                    </div>

                    {/* Verified Badges Row */}
                    <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-3.5 text-[11px] font-semibold text-[#75708F]">
                      <div className="flex items-center gap-1">
                        <span className="text-[#0E8F5F] font-bold">✔</span> ID Verified
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#0E8F5F] font-bold">✔</span> Portfolio Verified
                      </div>
                      {f.isPaymentVerified && (
                        <div className="flex items-center gap-1">
                          <span className="text-[#0E8F5F] font-bold">✔</span> Payment Verified
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-[#ECEAF9]">
                    <button
                      type="button"
                      onClick={() => onViewProfile && onViewProfile(f)}
                      className="flex-1 flex items-center justify-center gap-1.5 border-[1.5px] border-[#ECEAF9] hover:border-[#D8D2FA] text-[#1C1733] bg-white rounded-[12px] py-2.5 px-2 text-[12.5px] font-bold transition-all cursor-pointer"
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => onMessageFreelancer && onMessageFreelancer(f)}
                      className="flex-[1.6] flex items-center justify-center gap-1.5 bg-[#4A3AE0] hover:bg-[#3D2DC9] text-white rounded-[12px] py-2.5 px-2 text-[12.5px] font-bold transition-all cursor-pointer shadow-[0_6px_14px_-6px_rgba(74,58,224,0.5)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Message</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(f._id || f.id, e)}
                      className={`shrink-0 w-10 border-[1.5px] rounded-[12px] flex items-center justify-center text-[15px] transition-all cursor-pointer ${
                        isFav
                          ? 'border-[#C0392B] bg-[#FBEAE8] text-[#C0392B]'
                          : 'border-[#ECEAF9] text-[#75708F] bg-white hover:border-[#D8D2FA]'
                      }`}
                      title={isFav ? 'Saved' : 'Save freelancer'}
                    >
                      {isFav ? '♥' : '♡'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* View More: card in mobile view, full width across grid in desktop view */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 rounded-[20px] border-[1.5px] border-dashed border-[#6C5CE8] bg-[#F7F6FF] flex flex-col md:flex-row items-center justify-center md:justify-between text-center md:text-left p-6 sm:p-7 md:px-10 md:py-6 gap-3 sm:gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <div className="font-space text-[28px] sm:text-[32px] font-bold text-[#4A3AE0] leading-none shrink-0">
              +6,197
            </div>
            <div>
              <div className="text-[14px] sm:text-[15px] font-bold text-[#1C1733]">
                More freelancers waiting
              </div>
              <div className="text-[12px] sm:text-[12.5px] text-[#75708F] max-w-[32ch] md:max-w-none leading-[1.5] mt-0.5">
                Browse everyone, filtered by skill, rate, rating or location.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="mt-2 md:mt-0 bg-[#4A3AE0] hover:bg-[#3D2DC9] text-white px-6 py-3 rounded-[12px] font-bold text-[13px] transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
          >
            View All Freelancers →
          </button>
        </div>
      </div>
    </section>
  );
}
