import { useState, useRef, useEffect } from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FreelancerProvider, useFreelancer } from "../context/FreelancerContext";

function FreelancerLayoutContent({ children }) {
  const {
    user,
    profile,
    leads,
    strengthPct,
    skillsList,
    langTags,
    availabilityMode,
    startTimeline,
    startingRate,
    displayName,
    initials,
    profilePhotoUrl,
    displayTitle,
    displayLocation,
    formattedToday,
    profileModalOpen,
    setProfileModalOpen,
    handleSignOut,
    loading,
  } = useFreelancer();

  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-[#F6F6F3] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#4C2FD9] border-t-transparent animate-spin mb-4" />
        <p className="font-['Fraunces',serif] text-[18px] font-medium text-[#1B1F23]">
          Loading your Freelancer Portal...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F3] text-[#1B1F23] font-['Inter',sans-serif] antialiased selection:bg-[#ECE8FB] selection:text-[#2A1B85] flex flex-col">
      {/* ========================================================================= */}
      {/* RESPONSIVE TOP NAVIGATION HEADER (MOBILE + TABLET + DESKTOP) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E4E3DD]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 sm:flex-initial">
            <p className="text-[11px] sm:text-[12.5px] text-[#9BA0A6] mb-[1px] truncate">{formattedToday}</p>
            <h1 className="font-['Fraunces',serif] font-medium text-[18px] sm:text-[23px] text-[#1B1F23] tracking-tight truncate">
              Namaste, {displayName.split(" ")[0]}
            </h1>
          </div>

          {/* Desktop & Tablet Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#F6F6F3] p-1.5 rounded-2xl border border-[#E4E3DD]">
            <NavLink
              to="/freelancer/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-4 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-white bg-gradient-to-r from-[#4C2FD9] to-[#2A1B85] shadow-sm"
                    : "text-[#5B6168] hover:text-[#1B1F23] hover:bg-white/60"
                }`
              }
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
              Dashboard
            </NavLink>

            <NavLink
              to="/freelancer/leads"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-4 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-white bg-gradient-to-r from-[#4C2FD9] to-[#2A1B85] shadow-sm"
                    : "text-[#5B6168] hover:text-[#1B1F23] hover:bg-white/60"
                }`
              }
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4H12a8.7 8.7 0 0 1-4-1L3 20l1.2-3.6a8.3 8.3 0 0 1-1.2-4.4A8.4 8.4 0 0 1 11.5 3h.5a8.4 8.4 0 0 1 8.4 8Z" />
              </svg>
              Leads
              {leads.some((l) => l.status === "new") && (
                <span className="w-[6px] h-[6px] rounded-full bg-[#1FA854] animate-pulse" />
              )}
            </NavLink>

            <NavLink
              to="/freelancer/resume"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-4 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-white bg-gradient-to-r from-[#4C2FD9] to-[#2A1B85] shadow-sm"
                    : "text-[#5B6168] hover:text-[#1B1F23] hover:bg-white/60"
                }`
              }
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6M9 17h6" />
              </svg>
              Resume Journey
            </NavLink>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#4C2FD9] hover:bg-[#ECE8FB] px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              👁️ Preview as client
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => toast("You are on the latest platform updates!", { icon: "🔔" })}
              className="w-[38px] h-[38px] rounded-full bg-white border border-[#E4E3DD] flex items-center justify-center relative cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <span className="absolute top-[8px] right-[8px] w-[7px] h-[7px] rounded-full bg-[#4C2FD9] border-[1.5px] border-white" />
            </button>

            {/* User Avatar Chip & Dropdown Menu (All Devices) */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                title="Account menu & profile options"
                aria-expanded={userMenuOpen}
                className="w-[38px] h-[38px] sm:w-[40px] sm:h-[40px] rounded-full bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] text-[#F3F1FC] font-['Fraunces',serif] text-[15px] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shadow-sm overflow-hidden border-2 border-white ring-1 ring-[#4C2FD9]/20"
              >
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-[#E4E3DD] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User details header */}
                  <div className="p-3 bg-[#F6F6F3] rounded-xl mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] text-white font-['Fraunces',serif] text-[16px] flex items-center justify-center shrink-0">
                      {profilePhotoUrl ? (
                        <img src={profilePhotoUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-[#1B1F23] truncate m-0">{displayName}</p>
                      <p className="text-[11.5px] text-[#5B6168] truncate m-0">{user?.email || "Candidate"}</p>
                      <span className="inline-block text-[10px] font-semibold text-[#1FA854] bg-[#E5F5EB] px-2 py-0.5 rounded-full mt-1">
                        Candidate / Freelancer
                      </span>
                    </div>
                  </div>

                  {/* Quick menu navigation items */}
                  <div className="space-y-1 text-[13px]">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#1B1F23] hover:bg-[#F6F6F3] transition-colors cursor-pointer text-left"
                    >
                      <span className="text-[16px]">👁️</span>
                      <span>Preview Profile as Client</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/freelancer/leads");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[#1B1F23] hover:bg-[#F6F6F3] transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[16px]">💼</span>
                        <span>Direct Recruiter Leads</span>
                      </div>
                      <span className="text-[11px] font-bold bg-[#ECE8FB] text-[#2A1B85] px-2 py-0.5 rounded-full">
                        {leads.length}
                      </span>
                    </button>

                    <Link
                      to="/provider/plans"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#1B1F23] hover:bg-[#F6F6F3] transition-colors cursor-pointer"
                    >
                      <span className="text-[16px]">💎</span>
                      <span>Manage / Upgrade Subscription</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/freelancer/resume");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#1B1F23] hover:bg-[#F6F6F3] transition-colors cursor-pointer text-left"
                    >
                      <span className="text-[16px]">📄</span>
                      <span>Resume Journey &amp; AI Score</span>
                    </button>

                    <div className="border-t border-[#E4E3DD] my-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left font-semibold"
                      >
                        <span className="text-[16px]">🚪</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN RESPONSIVE CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:pb-12 flex-1">
        {children || <Outlet />}
      </main>

      {/* ========================================================================= */}
      {/* VIEW PROFILE MODAL (PREVIEW AS CLIENT WITH LIVE DATA) */}
      {/* ========================================================================= */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-[#1B1F23]/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-[#F6F6F3] w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl p-5 sm:p-7 relative animate-in slide-in-from-bottom duration-300 shadow-2xl">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-[#E4E3DD] flex items-center justify-center cursor-pointer hover:bg-gray-100 z-10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <p className="text-[11px] font-semibold text-[#9BA0A6] uppercase tracking-wider mb-3 m-0">
              Your profile — as clients see it
            </p>

            {/* Full Candidate Card Preview */}
            <div className="bg-white border border-[#E4E3DD] rounded-2xl p-5 sm:p-6 shadow-md">
              <div className="flex gap-4 items-start">
                <div className="relative shrink-0">
                  <div className="w-[58px] h-[58px] sm:w-[68px] sm:h-[68px] rounded-[16px] bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] flex items-center justify-center font-['Fraunces',serif] text-[21px] sm:text-[24px] text-[#F3F1FC] overflow-hidden">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 bg-[#1FA854] text-white text-[8.5px] font-bold py-0.5 px-2 rounded-full whitespace-nowrap shadow-sm">
                    {availabilityMode}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-['Fraunces',serif] font-medium text-[20px] sm:text-[22px] text-[#1B1F23]">
                      {displayName}
                    </span>
                    {(profile?.isVerified || profile?.idVerification?.status === "verified") && (
                      <span className="w-4 h-4 rounded-full bg-[#1FA854] flex items-center justify-center shrink-0">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-[13.5px] text-[#5B6168] mt-0.5 m-0">{displayTitle}</p>
                  <p className="text-[12px] text-[#9BA0A6] mt-1 flex items-center gap-1.5 flex-wrap m-0">
                    <span>📍 {displayLocation}</span>
                    <span className="w-1 h-1 rounded-full bg-[#9BA0A6]" />
                    <span>🌐 Remote OK</span>
                  </p>
                </div>

                <div className="ml-auto text-center bg-[#F6F6F3] border border-[#E4E3DD] rounded-xl p-2.5 shrink-0">
                  <div className="text-[18px] font-bold text-[#1FA854] font-['Fraunces',serif] leading-none">
                    {strengthPct}%
                  </div>
                  <div className="text-[9px] text-[#9BA0A6] mt-1 whitespace-nowrap">Profile Strength</div>
                  <div className="h-1 w-14 bg-[#E4E3DD] rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-[#1FA854]" style={{ width: `${strengthPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-4 py-3 border-y border-[#E4E3DD]">
                <div className="text-center">
                  <div className="text-[15px] font-bold text-[#1B1F23]">{profile?.experience || "3–5 yrs"}</div>
                  <div className="text-[11px] text-[#9BA0A6] mt-0.5">Experience</div>
                </div>
                <div className="text-center border-l border-[#E4E3DD]">
                  <div className="text-[15px] font-bold text-[#1B1F23]">{availabilityMode || "Full-time"}</div>
                  <div className="text-[11px] text-[#9BA0A6] mt-0.5">Availability</div>
                </div>
                <div className="text-center border-l border-[#E4E3DD]">
                  <div className="text-[15px] font-bold text-[#1B1F23]">{startTimeline || "Today"}</div>
                  <div className="text-[11px] text-[#9BA0A6] mt-0.5">Available to start</div>
                </div>
              </div>

              {/* Top Skills */}
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#9BA0A6] mb-2 m-0">Top Skills &amp; Starting Rates</p>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E4E3DD] text-[12.5px] text-[#1B1F23] bg-[#F6F6F3]">
                      {s.title} <span className="text-[#2A1B85] font-semibold">₹{Number(s.price).toLocaleString("en-IN")}/{s.type}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Highlight */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#E5F5EB]">
                    <span className="text-[18px] shrink-0">💰</span>
                    <div>
                      <b className="block text-[13px] text-[#1B1F23] leading-tight">₹{startingRate}</b>
                      <span className="text-[10px] text-[#9BA0A6]">Starting price</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FBF0DF]">
                    <span className="text-[18px] shrink-0">🗣️</span>
                    <div>
                      <b className="block text-[13px] text-[#1B1F23] leading-tight">
                        {langTags.map((l) => l.lang).join(", ") || "Hindi, English"}
                      </b>
                      <span className="text-[10px] text-[#9BA0A6]">{langTags.length} Languages</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 mt-4">
                <a
                  href={`https://wa.me/?text=Hi,%20check%20out%20my%20profile%20on%20LucoHire:%20${window.location.origin}/freelancer/dashboard`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-3 px-4 rounded-xl text-[13.5px] font-semibold bg-[#1FA854] text-white border border-transparent cursor-pointer hover:bg-[#198f46] transition-colors"
                >
                  💬 Share on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (md:hidden - 100% PARITY WITH PREVIOUS BAR) */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E4E3DD] flex items-center justify-around gap-1 p-2 px-3 pb-[calc(10px+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_24px_rgba(20,15,60,0.08)] z-40">
        <NavLink
          to="/freelancer/dashboard"
          className={({ isActive }) =>
            `flex-1 min-h-[46px] flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
              isActive
                ? "text-white bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] shadow-xs"
                : "text-[#9BA0A6] hover:text-[#1B1F23]"
            }`
          }
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
          Dashboard
        </NavLink>

        <NavLink
          to="/freelancer/leads"
          className={({ isActive }) =>
            `flex-1 min-h-[46px] flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all duration-200 cursor-pointer relative ${
              isActive
                ? "text-white bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] shadow-xs"
                : "text-[#9BA0A6] hover:text-[#1B1F23]"
            }`
          }
        >
          <div className="relative">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4H12a8.7 8.7 0 0 1-4-1L3 20l1.2-3.6a8.3 8.3 0 0 1-1.2-4.4A8.4 8.4 0 0 1 11.5 3h.5a8.4 8.4 0 0 1 8.4 8Z" />
            </svg>
            {leads.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#1FA854] border border-white" />
            )}
          </div>
          Leads ({leads.length})
        </NavLink>

        <NavLink
          to="/freelancer/resume"
          className={({ isActive }) =>
            `flex-1 min-h-[46px] flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
              isActive
                ? "text-white bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] shadow-xs"
                : "text-[#9BA0A6] hover:text-[#1B1F23]"
            }`
          }
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M9 13h6M9 17h6" />
          </svg>
          Resume
        </NavLink>

        <button
          type="button"
          onClick={() => setProfileModalOpen(true)}
          className="flex-1 min-h-[46px] flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-semibold text-[#9BA0A6] hover:text-[#1B1F23] transition-all duration-200 cursor-pointer"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Preview
        </button>
      </nav>
    </div>
  );
}

export default function FreelancerLayout({ children }) {
  return (
    <FreelancerProvider>
      <FreelancerLayoutContent>{children}</FreelancerLayoutContent>
    </FreelancerProvider>
  );
}
