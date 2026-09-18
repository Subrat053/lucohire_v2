import { useState, useEffect } from "react";

export default function FreelancerDashboard() {
  // Navigation & Views
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' | 'leads'
  const [iframeView, setIframeView] = useState(null); // 'resume' | 'signup' | null
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Animated profile strength ring
  const [strengthPct, setStrengthPct] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setStrengthPct(72);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Resume conversion state
  const [convertedToResume, setConvertedToResume] = useState(false);

  // Accordion state (one open at a time, or none)
  const [openManageItem, setOpenManageItem] = useState(null);
  const toggleManage = (index) => {
    setOpenManageItem((prev) => (prev === index ? null : index));
  };

  // Editable lists inside Manage Profile
  const [skillsList, setSkillsList] = useState([
    { id: 1, title: "Figma UI Design", level: "Expert", exp: "3–5 yrs", price: "8000", type: "Per project" },
    { id: 2, title: "Logo Design", level: "Expert", exp: "3–5 yrs", price: "3000", type: "Per project" },
    { id: 3, title: "Brand Identity", level: "Intermediate", exp: "1–3 yrs", price: "12000", type: "Per project" },
  ]);

  const [eduList, setEduList] = useState([
    { id: 1, type: "Education", degree: "B.Des", institution: "Design Studio Noida", year: "2018–2022" },
    { id: 2, type: "Work experience", degree: "UI Designer", institution: "Freelance", year: "2022–Present" },
  ]);

  const [certList, setCertList] = useState([
    { id: 1, type: "Behance", link: "behance.net/rahulkumar" },
  ]);

  const [langTags, setLangTags] = useState([
    { id: 1, lang: "Hindi", level: "Expert" },
    { id: 2, lang: "English", level: "Fluent" },
  ]);
  const [selectedLang, setSelectedLang] = useState("Hindi");
  const [selectedLevel, setSelectedLevel] = useState("Expert");

  const [selectedDays, setSelectedDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Leads Filter State
  const [selectedSkillFilter, setSelectedSkillFilter] = useState("All skills");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");

  // Leads Data
  const initialLeads = [
    {
      id: "lead-1",
      name: "Priya Malhotra",
      avatar: "P",
      time: "12 min ago",
      skills: ["Logo Design", "Brand Identity"],
      brief: "Needs a logo + basic brand kit for a new D2C skincare label, launching next month.",
      offered: "Offered ₹12,000",
      timeline: "needed within 10 days",
      status: "new",
      statusLabel: "New",
      initialPrice: "14000",
      defaultTimeline: "Same as asked — 10 days",
      acceptPrice: "12000",
      quoteSent: false,
    },
    {
      id: "lead-2",
      name: "Arjun Studios",
      avatar: "A",
      time: "2 hr ago",
      skills: ["Figma UI Design"],
      brief: "Looking for ongoing Figma support, roughly 10 hrs/week for an internal dashboard product.",
      offered: "Offered ₹8,000/project",
      timeline: "needed within 5 days",
      status: "new",
      statusLabel: "New",
      initialPrice: "8000",
      defaultTimeline: "Same as asked — 5 days",
      acceptPrice: "8000",
      quoteSent: false,
    },
    {
      id: "lead-3",
      name: "Simran Kaur",
      avatar: "S",
      time: "Yesterday",
      skills: ["Figma UI Design"],
      brief: "Wants a full UI redesign for a booking app — sent over a Notion doc with references.",
      offered: "Offered ₹25,000",
      timeline: "needed within 15 days",
      status: "replied",
      statusLabel: "Replied",
      quotedSummary: "You quoted: ₹27,000 · 12 days — waiting on Simran's reply",
      initialPrice: "27000",
      defaultTimeline: "Same as asked — 15 days",
      acceptPrice: "25000",
      quoteSent: false,
    },
    {
      id: "lead-4",
      name: "Nimbus Foods",
      avatar: "N",
      time: "3 days ago",
      skills: ["Logo Design"],
      brief: "Packaging design for 4 SKUs — confirmed and advance paid.",
      offered: "Agreed ₹18,000 · paid",
      status: "won",
      statusLabel: "Won",
      initialPrice: "18000",
      defaultTimeline: "Same as agreed",
      quoteSent: false,
    },
  ];

  const [leads, setLeads] = useState(initialLeads);
  const [openQuoteId, setOpenQuoteId] = useState(null);

  const toggleQuote = (id) => {
    setOpenQuoteId((prev) => (prev === id ? null : id));
  };

  const handleSendQuote = (id) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, quoteSent: true } : lead))
    );
  };

  // Add / Remove Handlers
  const addSkill = () => {
    const newId = Date.now();
    setSkillsList((prev) => [
      ...prev,
      { id: newId, title: "New skill", level: "Expert", exp: "3–5 yrs", price: "5000", type: "Per project" },
    ]);
  };
  const removeSkill = (id) => {
    setSkillsList((prev) => prev.filter((s) => s.id !== id));
  };

  const addEdu = () => {
    const newId = Date.now();
    setEduList((prev) => [
      ...prev,
      { id: newId, type: "Education", degree: "", institution: "", year: "" },
    ]);
  };
  const removeEdu = (id) => {
    setEduList((prev) => prev.filter((e) => e.id !== id));
  };

  const addCert = () => {
    const newId = Date.now();
    setCertList((prev) => [...prev, { id: newId, type: "Certification", link: "" }]);
  };
  const removeCert = (id) => {
    setCertList((prev) => prev.filter((c) => c.id !== id));
  };

  const addLang = () => {
    const newId = Date.now();
    setLangTags((prev) => [...prev, { id: newId, lang: selectedLang, level: selectedLevel }]);
  };
  const removeLang = (id) => {
    setLangTags((prev) => prev.filter((l) => l.id !== id));
  };

  // Filtering Leads
  const filteredLeads = leads.filter((lead) => {
    if (selectedSkillFilter !== "All skills" && !lead.skills.includes(selectedSkillFilter)) {
      return false;
    }
    if (selectedStatusFilter === "New" && lead.status !== "new") return false;
    if (selectedStatusFilter === "Replied" && lead.status !== "replied") return false;
    if (selectedStatusFilter === "Won" && lead.status !== "won") return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F6F6F3] text-[#1B1F23] font-['Inter',sans-serif] antialiased selection:bg-[#ECE8FB] selection:text-[#2A1B85] flex flex-col">
      {/* ========================================================================= */}
      {/* RESPONSIVE TOP NAVIGATION HEADER (MOBILE + TABLET + DESKTOP) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E4E3DD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[12px] sm:text-[12.5px] text-[#9BA0A6] mb-[1px]">Wednesday, 6 May</p>
            <h1 className="font-['Fraunces',serif] font-medium text-[19px] sm:text-[23px] text-[#1B1F23] tracking-tight">
              Namaste, Rahul
            </h1>
          </div>

          {/* Desktop & Tablet Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#F6F6F3] p-1.5 rounded-2xl border border-[#E4E3DD]">
            <button
              type="button"
              onClick={() => {
                setActiveView("dashboard");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                activeView === "dashboard"
                  ? "text-white bg-gradient-to-r from-[#4C2FD9] to-[#2A1B85] shadow-sm"
                  : "text-[#5B6168] hover:text-[#1B1F23] hover:bg-white/60"
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView("leads");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                activeView === "leads"
                  ? "text-white bg-gradient-to-r from-[#4C2FD9] to-[#2A1B85] shadow-sm"
                  : "text-[#5B6168] hover:text-[#1B1F23] hover:bg-white/60"
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4H12a8.7 8.7 0 0 1-4-1L3 20l1.2-3.6a8.3 8.3 0 0 1-1.2-4.4A8.4 8.4 0 0 1 11.5 3h.5a8.4 8.4 0 0 1 8.4 8Z" />
              </svg>
              Leads
              <span className="w-[6px] h-[6px] rounded-full bg-[#1FA854]" />
            </button>

            <button
              type="button"
              onClick={() => setIframeView("resume")}
              className="flex items-center gap-2 py-2 px-4 rounded-xl text-[13px] font-semibold text-[#5B6168] hover:text-[#1B1F23] hover:bg-white/60 transition-all duration-200 cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6M9 17h6" />
              </svg>
              Resume Journey
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#4C2FD9] hover:bg-[#ECE8FB] px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Preview as client
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notifications"
              className="w-[38px] h-[38px] rounded-full bg-white border border-[#E4E3DD] flex items-center justify-center relative cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <span className="absolute top-[8px] right-[8px] w-[7px] h-[7px] rounded-full bg-[#4C2FD9] border-[1.5px] border-white" />
            </button>

            {/* User Avatar Chip */}
            <button
              type="button"
              onClick={() => setIframeView("signup")}
              title="Account & sign-in"
              className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] text-[#F3F1FC] font-['Fraunces',serif] text-[15px] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
            >
              R
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN RESPONSIVE CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 flex-1">
        {/* ========================================================================= */}
        {/* VIEW 1: CANDIDATE DASHBOARD */}
        {/* ========================================================================= */}
        {activeView === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT / MAIN COLUMN (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Profile Strength Banner */}
              <div className="bg-white border border-[#E4E3DD] rounded-[18px] p-[16px_18px] sm:p-5 flex items-center gap-[14px] sm:gap-5 shadow-xs">
                <div
                  className="w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full shrink-0 flex items-center justify-center transition-all duration-1000 ease-out"
                  style={{
                    background: `conic-gradient(#4C2FD9 ${strengthPct * 3.6}deg, #ECE8FB 0deg)`,
                  }}
                >
                  <div className="w-[40px] h-[40px] sm:w-[46px] sm:h-[46px] rounded-full bg-white flex items-center justify-center text-[13px] sm:text-[14px] font-bold text-[#1B1F23]">
                    {strengthPct}%
                  </div>
                </div>
                <div className="space-y-[3px] flex-1">
                  <p className="text-[14px] sm:text-[15px] font-semibold text-[#1B1F23] m-0">
                    Your profile is 72% complete
                  </p>
                  <p className="text-[12.5px] sm:text-[13px] text-[#5B6168] leading-[1.5] m-0">
                    Add a <b className="text-[#2A1B85] font-semibold">voice intro</b> and finish{" "}
                    <b className="text-[#2A1B85] font-semibold">ID verification</b> — complete profiles get replies 4.5x more often.
                  </p>
                </div>
              </div>

              {/* Candidate Hero Card */}
              <div className="bg-white border border-[#E4E3DD] rounded-[20px] p-5 sm:p-7 shadow-[0_18px_40px_-22px_rgba(42,27,133,0.25)]">
                {/* Header Row */}
                <div className="flex gap-4 sm:gap-5 items-start">
                  <div className="relative shrink-0">
                    <div className="w-[58px] h-[58px] sm:w-[68px] sm:h-[68px] rounded-[16px] sm:rounded-[20px] bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] flex items-center justify-center font-['Fraunces',serif] text-[21px] sm:text-[24px] text-[#F3F1FC] shadow-sm">
                      RK
                    </div>
                    <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 bg-[#1FA854] text-white text-[8.5px] sm:text-[9.5px] font-bold py-[3px] px-[8px] rounded-full whitespace-nowrap shadow-[0_2px_6px_rgba(31,168,84,0.35)]">
                      Available Now
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[6px] sm:gap-2 flex-wrap">
                      <span className="font-['Fraunces',serif] font-medium text-[20px] sm:text-[24px] text-[#1B1F23]">
                        Rahul Kumar
                      </span>
                      <span className="w-[18px] h-[18px] rounded-full bg-[#1FA854] flex items-center justify-center shrink-0" title="Identity verified">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    </div>
                    <p className="text-[13.5px] sm:text-[14.5px] text-[#5B6168] mt-[2px] m-0">UI Designer &amp; Brand Specialist</p>
                    <p className="text-[12px] sm:text-[13px] text-[#9BA0A6] mt-[6px] flex items-center gap-[8px] flex-wrap m-0">
                      <span>📍 Noida, Uttar Pradesh</span>
                      <span className="w-[3px] h-[3px] rounded-full bg-[#9BA0A6]" />
                      <span>🌐 Remote OK</span>
                    </p>
                  </div>

                  {/* Profile Strength Mini Chip */}
                  <div className="ml-auto text-center bg-[#F6F6F3] border border-[#E4E3DD] rounded-[12px] p-[8px_14px] shrink-0 hidden sm:block">
                    <div className="text-[18px] font-bold text-[#1FA854] font-['Fraunces',serif] leading-none">
                      72%
                    </div>
                    <div className="text-[9px] text-[#9BA0A6] mt-[3px] whitespace-nowrap">Profile Strength</div>
                    <div className="h-[3px] w-[60px] bg-[#E4E3DD] rounded-full mt-[6px] overflow-hidden">
                      <div className="h-full bg-[#1FA854] w-[72%]" />
                    </div>
                  </div>
                </div>

                {/* Candidate Stats Row */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 my-5 py-4 border-y border-[#E4E3DD]">
                  <div className="text-center">
                    <div className="text-[15px] sm:text-[17px] font-bold text-[#1B1F23]">3–5 yrs</div>
                    <div className="text-[11px] sm:text-[12px] text-[#9BA0A6] mt-[2px]">Experience</div>
                  </div>
                  <div className="text-center border-l border-[#E4E3DD]">
                    <div className="text-[15px] sm:text-[17px] font-bold text-[#1B1F23]">Full-time</div>
                    <div className="text-[11px] sm:text-[12px] text-[#9BA0A6] mt-[2px]">Availability</div>
                  </div>
                  <div className="text-center border-l border-[#E4E3DD]">
                    <div className="text-[15px] sm:text-[17px] font-bold text-[#1B1F23]">Today</div>
                    <div className="text-[11px] sm:text-[12px] text-[#9BA0A6] mt-[2px]">Available to start</div>
                  </div>
                </div>

                {/* Top Skills */}
                <div className="mb-5">
                  <p className="text-[12px] font-semibold text-[#9BA0A6] mb-2.5 m-0">Top Skills</p>
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    <span className="inline-flex items-center gap-[7px] px-3.5 py-2 rounded-full border border-[#E4E3DD] text-[12.5px] sm:text-[13px] text-[#1B1F23] bg-[#F6F6F3]">
                      Figma UI Design <span className="text-[#2A1B85] font-semibold">₹8,000/project</span>
                    </span>
                    <span className="inline-flex items-center gap-[7px] px-3.5 py-2 rounded-full border border-[#E4E3DD] text-[12.5px] sm:text-[13px] text-[#1B1F23] bg-[#F6F6F3]">
                      Logo Design <span className="text-[#2A1B85] font-semibold">₹3,000/project</span>
                    </span>
                    <span className="inline-flex items-center gap-[7px] px-3.5 py-2 rounded-full border border-[#E4E3DD] text-[12.5px] sm:text-[13px] text-[#1B1F23] bg-[#F6F6F3]">
                      Brand Identity <span className="text-[#2A1B85] font-semibold">₹12,000/project</span>
                    </span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="mb-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#E5F5EB]">
                      <span className="text-[20px] shrink-0">💰</span>
                      <div>
                        <b className="block text-[13.5px] sm:text-[14px] text-[#1B1F23] leading-tight">₹3,000</b>
                        <span className="text-[10px] sm:text-[11px] text-[#9BA0A6]">Starting price</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#FBF0DF]">
                      <span className="text-[20px] shrink-0">🗣️</span>
                      <div>
                        <b className="block text-[13.5px] sm:text-[14px] text-[#1B1F23] leading-tight">Hindi, English</b>
                        <span className="text-[10px] sm:text-[11px] text-[#9BA0A6]">2 Languages</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verifications Checklist */}
                <div className="mb-0">
                  <div className="flex flex-wrap gap-2.5 sm:gap-6">
                    <div className="flex items-center gap-2 text-[12px] sm:text-[12.5px] text-[#5B6168]">
                      <span className="w-4 h-4 rounded-full bg-[#1FA854] flex items-center justify-center shrink-0">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      Resume Verified
                    </div>
                    <div className="flex items-center gap-2 text-[12px] sm:text-[12.5px] text-[#5B6168]">
                      <span className="w-4 h-4 rounded-full bg-[#1FA854] flex items-center justify-center shrink-0">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      Mobile Verified
                    </div>
                    <div className="flex items-center gap-2 text-[12px] sm:text-[12.5px] text-[#5B6168]">
                      <span className="w-4 h-4 rounded-full bg-[#1FA854] flex items-center justify-center shrink-0">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      Email Verified
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-[12px] text-[#9BA0A6] mt-3 m-0">Profile updated: 2 days ago</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 sm:gap-3.5 mt-5">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    className="flex-1 text-center py-3 px-4 rounded-xl text-[13.5px] font-semibold bg-white text-[#1B1F23] border border-[#E4E3DD] cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
                  >
                    👁️ View Profile
                  </button>
                  <button
                    type="button"
                    className="flex-1 text-center py-3 px-4 rounded-xl text-[13.5px] font-semibold bg-[#1FA854] text-white border border-transparent cursor-pointer hover:bg-[#198f46] transition-colors shadow-xs"
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    type="button"
                    title="Call"
                    className="w-[46px] py-3 rounded-xl bg-white text-[#1B1F23] border border-[#E4E3DD] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
                  >
                    📞
                  </button>
                </div>
              </div>

              {/* Edit Profile Card Accordion Section */}
              <div className="bg-white border border-[#E4E3DD] rounded-[20px] p-5 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[15px] sm:text-[16px] font-semibold text-[#1B1F23] m-0">Edit profile card</h2>
                    <p className="text-[12px] text-[#9BA0A6] mt-0.5 m-0">Keep your details fresh to attract more recruiter leads</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleManage(0)}
                    className="bg-[#4C2FD9] text-white py-2 px-4 rounded-xl text-[12px] font-semibold cursor-pointer hover:bg-[#3d24b5] transition-colors shadow-xs"
                  >
                    Edit
                  </button>
                </div>

                <div className="flex flex-col border-t border-[#E4E3DD]">
                  {/* 1. Skills & Pricing */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(0)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Skills &amp; pricing</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">{skillsList.length} skills added</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#E5F5EB] text-[#137A3D]">
                        Complete
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 0 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 0 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="space-y-3">
                          {skillsList.map((skill) => (
                            <div key={skill.id} className="bg-[#FAFAF8] border border-[#E4E3DD] rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <b className="text-[14px] font-semibold text-[#1B1F23]">{skill.title}</b>
                                <button
                                  type="button"
                                  onClick={() => removeSkill(skill.id)}
                                  className="w-6 h-6 rounded-full hover:bg-[#E4E3DD] text-[#9BA0A6] hover:text-[#1B1F23] flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                <div>
                                  <span className="block text-[11px] text-[#9BA0A6] mb-1">Skill level</span>
                                  <select
                                    defaultValue={skill.level}
                                    className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                  >
                                    <option>Expert</option>
                                    <option>Intermediate</option>
                                    <option>Beginner</option>
                                  </select>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-[#9BA0A6] mb-1">Experience</span>
                                  <select
                                    defaultValue={skill.exp}
                                    className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                  >
                                    <option>3–5 yrs</option>
                                    <option>5+ yrs</option>
                                    <option>1–3 yrs</option>
                                  </select>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-[#9BA0A6] mb-1">Starting price</span>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA0A6] text-[13px]">₹</span>
                                    <input
                                      type="number"
                                      defaultValue={skill.price}
                                      className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] py-2.5 pr-3 pl-7 outline-none focus:border-[#4C2FD9]"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-[#9BA0A6] mb-1">Price type</span>
                                  <select
                                    defaultValue={skill.type}
                                    className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                  >
                                    <option>Per project</option>
                                    <option>Per hour</option>
                                    <option>Per day</option>
                                    <option>Negotiable</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={addSkill}
                          className="w-full mt-3 p-3 border border-dashed border-[#E4E3DD] rounded-xl bg-transparent text-[#2A1B85] text-[13px] font-medium cursor-pointer hover:bg-[#F6F6F3] transition-colors"
                        >
                          + Add another skill
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. Education & Work Experience */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(1)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M22 10 12 4 2 10l10 6 10-6Z" />
                          <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Education &amp; work experience</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">B.Des, Design Studio Noida</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#E5F5EB] text-[#137A3D]">
                        Complete
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 1 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 1 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="space-y-3">
                          {eduList.map((edu) => (
                            <div key={edu.id} className="bg-[#FAFAF8] border border-[#E4E3DD] rounded-xl p-4">
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <select
                                  defaultValue={edu.type}
                                  className="flex-1 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2 outline-none"
                                >
                                  <option>Education</option>
                                  <option>Work experience</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeEdu(edu.id)}
                                  className="w-6 h-6 rounded-full hover:bg-[#E4E3DD] text-[#9BA0A6] hover:text-[#1B1F23] flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                                <input
                                  type="text"
                                  defaultValue={edu.degree}
                                  placeholder="Degree / Role"
                                  className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                />
                                <input
                                  type="text"
                                  defaultValue={edu.institution}
                                  placeholder="Institution / Company"
                                  className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                />
                              </div>
                              <input
                                type="text"
                                defaultValue={edu.year}
                                placeholder="Year or duration"
                                className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={addEdu}
                          className="w-full mt-3 p-3 border border-dashed border-[#E4E3DD] rounded-xl bg-transparent text-[#2A1B85] text-[13px] font-medium cursor-pointer hover:bg-[#F6F6F3] transition-colors"
                        >
                          + Add another entry
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. Certifications & Portfolio */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(2)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <circle cx="12" cy="8" r="5" />
                          <path d="M20 21a8 8 0 0 0-16 0" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Certifications &amp; portfolio</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">1 link added · Behance connected</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#FBF0DF] text-[#C9821A]">
                        Add more
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 2 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 2 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="space-y-3">
                          {certList.map((cert) => (
                            <div key={cert.id} className="bg-[#FAFAF8] border border-[#E4E3DD] rounded-xl p-4">
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <select
                                  defaultValue={cert.type}
                                  className="flex-1 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2 outline-none"
                                >
                                  <option>Certification</option>
                                  <option>Portfolio website</option>
                                  <option>LinkedIn</option>
                                  <option>GitHub</option>
                                  <option>Behance</option>
                                  <option>Dribbble</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeCert(cert.id)}
                                  className="w-6 h-6 rounded-full hover:bg-[#E4E3DD] text-[#9BA0A6] hover:text-[#1B1F23] flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                              <input
                                type="text"
                                defaultValue={cert.link}
                                placeholder="Paste link"
                                className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                              />
                            </div>
                          ))}
                        </div>

                        <p className="text-[12.5px] text-[#5B6168] leading-[1.55] my-3">
                          Adding 2 more portfolio links or a certification usually lifts profile strength by another 6–8%.
                        </p>

                        <button
                          type="button"
                          onClick={addCert}
                          className="w-full p-3 border border-dashed border-[#E4E3DD] rounded-xl bg-transparent text-[#2A1B85] text-[13px] font-medium cursor-pointer hover:bg-[#F6F6F3] transition-colors"
                        >
                          + Add certification or link
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4. Languages */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(3)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M5 8h14M5 12h14M5 16h9" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Languages</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">
                          {langTags.map((l) => l.lang).join(", ")}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#E5F5EB] text-[#137A3D]">
                        Complete
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 3 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 3 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                          <select
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value)}
                            className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none"
                          >
                            <option>Hindi</option>
                            <option>English</option>
                            <option>Bengali</option>
                            <option>Marathi</option>
                            <option>Tamil</option>
                            <option>Telugu</option>
                          </select>
                          <select
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none"
                          >
                            <option>Basic</option>
                            <option>Fluent</option>
                            <option>Expert</option>
                          </select>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-1">
                          {langTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1.5 bg-[#ECE8FB] text-[#2A1B85] text-[12px] font-medium py-1.5 px-3 rounded-full"
                            >
                              {tag.lang} · {tag.level}
                              <button
                                type="button"
                                onClick={() => removeLang(tag.id)}
                                className="text-[#2A1B85] hover:text-red-600 cursor-pointer text-[11px] leading-none"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={addLang}
                          className="w-full mt-3 p-3 border border-dashed border-[#E4E3DD] rounded-xl bg-transparent text-[#2A1B85] text-[13px] font-medium cursor-pointer hover:bg-[#F6F6F3] transition-colors"
                        >
                          + Add another language
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 5. Availability & Work Preferences */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(4)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 3" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Availability &amp; work preferences</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">Full-time · available now</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#E5F5EB] text-[#137A3D]">
                        Complete
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 4 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 4 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                          <select className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none">
                            <option>Full-time</option>
                            <option>Part-time</option>
                            <option>Weekends only</option>
                          </select>
                          <select className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none">
                            <option>Available now</option>
                            <option>Within 1 week</option>
                            <option>Within 1 month</option>
                          </select>
                        </div>

                        <div className="bg-[#FAFAF8] border border-[#E4E3DD] rounded-xl p-4 mb-3">
                          <div className="font-semibold text-[13px] text-[#1B1F23] mb-2.5">Availability calendar</div>
                          <div className="flex gap-2 mb-3 flex-wrap">
                            {allDays.map((day) => {
                              const active = selectedDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleDay(day)}
                                  className={`py-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                                    active
                                      ? "bg-[#4C2FD9] border-[#4C2FD9] text-white shadow-xs"
                                      : "bg-white border-[#E4E3DD] text-[#5B6168] hover:bg-gray-50"
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <select defaultValue="10:00 AM" className="flex-1 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2 outline-none">
                              <option>9:00 AM</option>
                              <option>10:00 AM</option>
                              <option>11:00 AM</option>
                            </select>
                            <span className="text-[12px] text-[#9BA0A6]">to</span>
                            <select defaultValue="6:00 PM" className="flex-1 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2 outline-none">
                              <option>5:00 PM</option>
                              <option>6:00 PM</option>
                              <option>7:00 PM</option>
                            </select>
                          </div>
                        </div>

                        <div className="text-[12.5px] text-[#5B6168]">
                          Preferred project size: <b className="text-[#1B1F23] font-semibold">₹3,000 – ₹15,000</b>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. Voice & Video Intro */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(5)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z" />
                          <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Voice &amp; video intro</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">Adds about 8% to your profile strength</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#FBF0DF] text-[#C9821A]">
                        Not added
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 5 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 5 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="border border-dashed border-[#E4E3DD] rounded-xl p-5 text-center text-[#9BA0A6] cursor-pointer hover:bg-white transition-colors">
                            <div className="text-[22px]">🎙️</div>
                            <p className="mt-1.5 text-[13px] font-semibold text-[#1B1F23] m-0">7s Voice intro</p>
                            <p className="text-[11px] text-[#9BA0A6] mt-1 m-0">Hold to record</p>
                          </div>
                          <div className="border border-dashed border-[#E4E3DD] rounded-xl p-5 text-center text-[#9BA0A6] cursor-pointer hover:bg-white transition-colors">
                            <div className="text-[22px]">🎥</div>
                            <p className="mt-1.5 text-[13px] font-semibold text-[#1B1F23] m-0">15s Video intro</p>
                            <p className="text-[11px] text-[#9BA0A6] mt-1 m-0">Tap to upload</p>
                          </div>
                        </div>
                        <p className="text-[12.5px] text-[#5B6168] mt-3 m-0">
                          Clients reply about 40% more often when a voice or video intro is added.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 7. Resume */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(6)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                          <path d="M14 2v6h6" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Resume</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">rahul_kumar_resume.pdf</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#E5F5EB] text-[#137A3D]">
                        Uploaded
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 6 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 6 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="border border-solid border-[#1FA854] bg-[#F3FBF5] text-[#1FA854] rounded-xl p-5 text-center cursor-pointer">
                          <svg className="mx-auto" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M14 3v5a1 1 0 0 0 1 1h5" />
                            <path d="M6 21h12a1 1 0 0 0 1-1V7l-5-5H6a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1z" />
                          </svg>
                          <p className="mt-2 text-[13px] font-semibold m-0">rahul_kumar_resume.pdf</p>
                          <p className="text-[11px] text-[#9BA0A6] mt-1 m-0">Tap to replace</p>
                        </div>

                        <div className="text-[12.5px] text-[#5B6168] mt-3">
                          Want to know how this resume actually performs?{" "}
                          <button
                            type="button"
                            onClick={() => setIframeView("resume")}
                            className="text-[#4C2FD9] font-semibold hover:underline bg-transparent border-none cursor-pointer p-0"
                          >
                            Open Resume Journey →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 8. ID Verification */}
                  <div>
                    <div
                      onClick={() => toggleManage(7)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">ID verification</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">Adds about 12% and the verified tick</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#FBF0DF] text-[#C9821A]">
                        Pending
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 7 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 7 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="flex flex-col gap-2 mb-3">
                          <label className="text-[12px] font-semibold text-[#1B1F23]">Government ID number</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Aadhaar / PAN number"
                              className="flex-1 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                            />
                            <button
                              type="button"
                              className="px-4 py-2.5 rounded-xl text-[12.5px] font-semibold bg-[#4C2FD9] text-white cursor-pointer hover:bg-[#3d24b5] transition-colors"
                            >
                              Verify
                            </button>
                          </div>
                        </div>

                        <div className="border border-dashed border-[#E4E3DD] rounded-xl p-5 text-center text-[#9BA0A6] cursor-pointer hover:bg-white transition-colors">
                          <svg className="mx-auto" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                          </svg>
                          <p className="mt-2 text-[13px] font-semibold text-[#1B1F23] m-0">Upload ID photo</p>
                          <p className="text-[11px] text-[#9BA0A6] mt-1 m-0">Aadhaar, PAN, or Passport</p>
                        </div>

                        <div className="text-[12.5px] text-[#5B6168] mt-3">
                          Verify to get the blue tick and a <b className="font-semibold text-[#1B1F23]">12% strength boost</b> — verified profiles get replies 4.5x more often.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resume Conversion Banner */}
              <div className="bg-white border border-[#E4E3DD] rounded-[20px] p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1B1F23] m-0">Instant ATS-Ready Resume</h3>
                    <p className="text-[12.5px] text-[#5B6168] mt-1 m-0">Turn your verified profile card into a shareable, downloadable resume PDF in 1 click.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConvertedToResume(true)}
                    className="w-full sm:w-auto shrink-0 py-3 px-6 rounded-xl text-[13.5px] font-semibold bg-[#4C2FD9] text-white border border-transparent cursor-pointer hover:bg-[#3d24b5] transition-colors shadow-sm"
                  >
                    {convertedToResume ? "✓ Converted to resume" : "📝 Convert my details into resume"}
                  </button>
                </div>

                {convertedToResume && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-[#E4E3DD]">
                    <button
                      type="button"
                      className="flex-1 py-2.5 px-4 rounded-xl text-[13px] font-semibold bg-[#F6F6F3] text-[#1B1F23] border border-[#E4E3DD] cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      ⬇️ Download PDF
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2.5 px-4 rounded-xl text-[13px] font-semibold bg-[#F6F6F3] text-[#1B1F23] border border-[#E4E3DD] cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      🔗 Copy Share Link
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT / SIDEBAR COLUMN (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Metrics Strip */}
              <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
                <div className="bg-white border border-[#E4E3DD] rounded-[16px] p-4 shadow-xs">
                  <div className="text-[20px] sm:text-[22px] font-bold text-[#1B1F23] font-['Fraunces',serif]">128</div>
                  <div className="text-[12px] text-[#9BA0A6] mt-1 leading-snug">Profile views this week</div>
                  <div className="text-[11px] text-[#1FA854] font-semibold mt-2 flex items-center gap-1">
                    <span>↑ 18%</span>
                    <span className="text-[10px] text-[#9BA0A6]">vs last week</span>
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3DD] rounded-[16px] p-4 shadow-xs">
                  <div className="text-[20px] sm:text-[22px] font-bold text-[#1B1F23] font-['Fraunces',serif]">6</div>
                  <div className="text-[12px] text-[#9BA0A6] mt-1 leading-snug">WhatsApp leads this week</div>
                  <div className="text-[11px] text-[#1FA854] font-semibold mt-2 flex items-center gap-1">
                    <span>↑ 2</span>
                    <span className="text-[10px] text-[#9BA0A6]">new clients</span>
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3DD] rounded-[16px] p-4 shadow-xs">
                  <div className="text-[20px] sm:text-[22px] font-bold text-[#1B1F23] font-['Fraunces',serif]">92%</div>
                  <div className="text-[12px] text-[#9BA0A6] mt-1 leading-snug">Response rate</div>
                  <div className="text-[11px] text-[#1FA854] font-semibold mt-2">Steady (Top 5%)</div>
                </div>
              </div>

              {/* LucoHire Pro Subscription Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#2A1B85] via-[#3B22A8] to-[#4C2FD9] rounded-[20px] p-6 text-[#F3F1FC] shadow-md">
                <div className="absolute -right-8 -top-8 w-40 h-40 border border-white/15 rounded-full pointer-events-none" />

                <div className="flex items-start justify-between relative z-1">
                  <div>
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#CFC7F5] bg-white/10 py-1 px-2.5 rounded-full">
                      LucoHire Pro
                    </span>
                    <h3 className="font-['Fraunces',serif] text-[22px] mt-2 font-medium text-white m-0">Get seen first</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-bold text-white">₹399</div>
                    <div className="text-[11px] text-[#CFC7F5]">per month</div>
                  </div>
                </div>

                <p className="text-[13px] text-[#DCD6F7] leading-[1.6] my-4 relative z-1">
                  Move to the top of category search and clear your WhatsApp lead cap for the month.
                </p>

                <div className="flex flex-col gap-2.5 mb-5 relative z-1">
                  <div className="flex items-center gap-2.5 text-[12.5px] text-[#F3F1FC]">
                    <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Unlimited WhatsApp leads, no monthly cap
                  </div>
                  <div className="flex items-center gap-2.5 text-[12.5px] text-[#F3F1FC]">
                    <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Priority placement in category search
                  </div>
                  <div className="flex items-center gap-2.5 text-[12.5px] text-[#F3F1FC]">
                    <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Featured verified badge on your card
                  </div>
                  <div className="flex items-center gap-2.5 text-[12.5px] text-[#F3F1FC]">
                    <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Platform fee drops from 10% to 5%
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/10 rounded-xl p-3 text-[12px] text-[#DCD6F7] mb-5 relative z-1">
                  <span>Currently on <b className="text-white font-semibold">Free plan</b></span>
                  <span><b className="text-white font-semibold">2</b> of 3 leads used</span>
                </div>

                <button
                  type="button"
                  className="w-full bg-white text-[#2A1B85] border-none py-3.5 px-4 rounded-xl text-[14px] font-bold cursor-pointer hover:bg-gray-100 transition-colors relative z-1 shadow"
                >
                  Upgrade to Pro
                </button>
              </div>

              {/* Quick Resume Toolkit Banner on Desktop */}
              <div className="bg-white border border-[#E4E3DD] rounded-[20px] p-5 shadow-xs">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[22px]">🚀</span>
                  <h4 className="font-semibold text-[14px] text-[#1B1F23] m-0">Resume Journey</h4>
                </div>
                <p className="text-[12.5px] text-[#5B6168] leading-relaxed mb-3">
                  Score your resume against high-paying client contracts and get instant AI recommendations.
                </p>
                <button
                  type="button"
                  onClick={() => setIframeView("resume")}
                  className="w-full py-2.5 px-4 rounded-xl text-[12.5px] font-semibold text-[#4C2FD9] bg-[#ECE8FB] hover:bg-[#ded7fa] transition-colors cursor-pointer"
                >
                  Launch Resume Check →
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: LEADS VIEW */}
        {/* ========================================================================= */}
        {activeView === "leads" && (
          <div className="space-y-6">
            
            {/* Leads Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#2A1B85] via-[#3B22A8] to-[#4C2FD9] rounded-[22px] p-6 sm:p-8 text-[#F3F1FC] shadow-md">
              <div className="absolute -right-12 -top-12 w-48 h-48 border border-white/15 rounded-full pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-1">
                <div>
                  <div className="font-['Fraunces',serif] text-[36px] sm:text-[44px] font-semibold leading-none text-white">6</div>
                  <div className="text-[13px] sm:text-[14px] text-[#CFC7F5] mt-1.5">WhatsApp leads this week</div>
                </div>
                <div className="sm:text-right">
                  <span className="inline-block text-[12px] font-bold text-white bg-white/15 py-2 px-4 rounded-full whitespace-nowrap">
                    2 of 3 used on Free
                  </span>
                </div>
              </div>

              <div className="mt-5 relative z-1 max-w-2xl">
                <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-white rounded-full w-[67%]" />
                </div>
                <div className="text-[11.5px] text-[#CFC7F5] mt-2">
                  1 lead left this week · resets in 3 days ·{" "}
                  <button type="button" className="text-white font-bold underline bg-transparent border-none cursor-pointer p-0">
                    go unlimited
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6 relative z-1 max-w-lg">
                <div className="bg-white/10 rounded-xl p-3 sm:p-3.5">
                  <div className="text-[16px] sm:text-[18px] font-bold text-white">92%</div>
                  <div className="text-[10px] sm:text-[11px] text-[#CFC7F5] mt-0.5 leading-tight">Response rate</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-3.5">
                  <div className="text-[16px] sm:text-[18px] font-bold text-white">1</div>
                  <div className="text-[10px] sm:text-[11px] text-[#CFC7F5] mt-0.5 leading-tight">Won this week</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-3.5">
                  <div className="text-[16px] sm:text-[18px] font-bold text-white">12m</div>
                  <div className="text-[10px] sm:text-[11px] text-[#CFC7F5] mt-0.5 leading-tight">Avg. reply time</div>
                </div>
              </div>

              <div className="flex gap-2 mt-5 flex-wrap relative z-1">
                <span className="text-[11px] text-[#F3F1FC] bg-white/15 py-1 px-3 rounded-full font-medium">
                  <b className="text-white font-bold">3</b> Figma UI Design
                </span>
                <span className="text-[11px] text-[#F3F1FC] bg-white/15 py-1 px-3 rounded-full font-medium">
                  <b className="text-white font-bold">2</b> Logo Design
                </span>
                <span className="text-[11px] text-[#F3F1FC] bg-white/15 py-1 px-3 rounded-full font-medium">
                  <b className="text-white font-bold">1</b> Brand Identity
                </span>
              </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white border border-[#E4E3DD] rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-[#9BA0A6] uppercase tracking-wider m-0">Filter by skill</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-wrap">
                    {["All skills", "Figma UI Design", "Logo Design", "Brand Identity"].map((skill) => {
                      const active = selectedSkillFilter === skill;
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => setSelectedSkillFilter(skill)}
                          className={`text-[12px] font-semibold py-1.5 px-3.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            active
                              ? "bg-[#2A1B85] text-white shadow-xs"
                              : "bg-[#F6F6F3] text-[#5B6168] hover:text-[#1B1F23]"
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-[#9BA0A6] uppercase tracking-wider m-0">Filter by status</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-wrap">
                    {[
                      { key: "All", label: "All · 6" },
                      { key: "New", label: "New · 2" },
                      { key: "Replied", label: "Replied · 3" },
                      { key: "Won", label: "Won · 1" },
                    ].map((st) => {
                      const active = selectedStatusFilter === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => setSelectedStatusFilter(st.key)}
                          className={`text-[12px] font-semibold py-1.5 px-3.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            active
                              ? "bg-[#4C2FD9] text-white shadow-xs"
                              : "bg-[#F6F6F3] text-[#5B6168] hover:text-[#1B1F23]"
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Cards Grid (Responsive: 1 col on mobile, 2 cols on tablet/desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="bg-white border border-[#E4E3DD] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    {/* Skills match */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {lead.skills.map((s) => (
                        <span key={s} className="text-[11px] font-semibold text-[#2A1B85] bg-[#ECE8FB] py-1 px-2.5 rounded-full">
                          🎯 {s}
                        </span>
                      ))}
                    </div>

                    {/* Client top info */}
                    <div className="flex items-start gap-3">
                      <div className="w-[42px] h-[42px] rounded-full shrink-0 bg-[#ECE8FB] text-[#2A1B85] flex items-center justify-center font-['Fraunces',serif] text-[16px]">
                        {lead.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[14px] font-semibold text-[#1B1F23]">{lead.name}</span>
                          <span className="text-[11px] text-[#9BA0A6] whitespace-nowrap">{lead.time}</span>
                        </div>
                        <p className="text-[13px] text-[#5B6168] mt-1 leading-relaxed m-0">{lead.brief}</p>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2.5 mt-3.5 flex-wrap">
                      <span className="text-[12.5px] font-semibold text-[#2A1B85]">{lead.offered}</span>
                      {lead.timeline && <span className="text-[12px] text-[#9BA0A6]">⏱ {lead.timeline}</span>}
                      <span
                        className={`text-[11px] font-semibold py-0.5 px-2.5 rounded-full ml-auto ${
                          lead.status === "new"
                            ? "bg-[#FBF0DF] text-[#C9821A]"
                            : lead.status === "replied"
                            ? "bg-[#ECE8FB] text-[#2A1B85]"
                            : "bg-[#E5F5EB] text-[#137A3D]"
                        }`}
                      >
                        {lead.statusLabel}
                      </span>
                    </div>

                    {/* Quoted summary */}
                    {lead.quotedSummary && (
                      <div className="mt-3 text-[12.5px] text-[#5B6168] bg-[#F6F6F3] rounded-xl p-2.5 leading-relaxed">
                        <b className="text-[#1B1F23]">You quoted:</b> {lead.quotedSummary.replace("You quoted:", "")}
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="mt-4 pt-3 border-t border-[#E4E3DD]/70">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 py-2.5 px-3.5 rounded-xl text-[13px] font-semibold bg-[#1FA854] text-white border border-transparent cursor-pointer hover:bg-[#198f46] transition-colors"
                      >
                        💬 Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleQuote(lead.id)}
                        className="flex-1 py-2.5 px-3.5 rounded-xl text-[13px] font-semibold bg-white text-[#2A1B85] border border-[#ECE8FB] cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
                      >
                        💰 Send my quote
                      </button>
                      <button
                        type="button"
                        title="Request a call"
                        className="w-[42px] py-2.5 rounded-xl bg-white text-[#1B1F23] border border-[#E4E3DD] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
                      >
                        📞
                      </button>
                    </div>

                    <button
                      type="button"
                      className="w-full mt-2 py-2 rounded-xl text-[12.5px] font-semibold bg-[#F6F6F3] text-[#1B1F23] hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      View project details
                    </button>

                    {/* Quote Composer Panel (Accordion) */}
                    {openQuoteId === lead.id && (
                      <div className="pt-3 mt-3 border-t border-dashed border-[#E4E3DD] transition-all">
                        {!lead.quoteSent ? (
                          <>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[11px] font-semibold text-[#9BA0A6] block mb-1">Your price</label>
                                <input
                                  type="text"
                                  defaultValue={`₹ ${lead.initialPrice}`}
                                  className="w-full text-[13px] text-[#1B1F23] bg-[#F6F6F3] border border-[#E4E3DD] rounded-xl p-2 outline-none focus:border-[#4C2FD9]"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-[#9BA0A6] block mb-1">Your timeline</label>
                                <select
                                  defaultValue={lead.defaultTimeline}
                                  className="w-full text-[13px] text-[#1B1F23] bg-[#F6F6F3] border border-[#E4E3DD] rounded-xl p-2 outline-none focus:border-[#4C2FD9]"
                                >
                                  <option>{lead.defaultTimeline}</option>
                                  <option>3 days</option>
                                  <option>7 days</option>
                                  <option>14 days</option>
                                  <option>Custom</option>
                                </select>
                              </div>
                            </div>
                            <div className="mt-2.5">
                              <textarea
                                placeholder="Optional note — e.g. what's included, or why the price differs"
                                className="w-full text-[13px] text-[#1B1F23] bg-[#F6F6F3] border border-[#E4E3DD] rounded-xl p-2 min-h-[52px] resize-none outline-none focus:border-[#4C2FD9]"
                              />
                            </div>
                            <div className="flex items-center gap-2.5 mt-2.5">
                              <button
                                type="button"
                                onClick={() => handleSendQuote(lead.id)}
                                className="text-[12px] text-[#5B6168] font-semibold hover:underline bg-transparent border-none cursor-pointer whitespace-nowrap p-0"
                              >
                                {lead.acceptPrice ? `Accept ₹${lead.acceptPrice} as-is instead` : "Deal already agreed"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendQuote(lead.id)}
                                className="flex-1 py-2 px-3 rounded-xl text-[12.5px] font-semibold bg-[#4C2FD9] text-white cursor-pointer hover:bg-[#3d24b5] transition-colors"
                              >
                                {lead.status === "replied" ? "Send updated quote" : "Send quote"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#137A3D] bg-[#E5F5EB] p-2.5 rounded-xl">
                            ✓ Quote sent — {lead.name} will see it on WhatsApp
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* VIEW PROFILE MODAL (CENTERED DIALOG ON DESKTOP, BOTTOM SHEET ON MOBILE) */}
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
                  <div className="w-[58px] h-[58px] sm:w-[68px] sm:h-[68px] rounded-[16px] bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] flex items-center justify-center font-['Fraunces',serif] text-[21px] sm:text-[24px] text-[#F3F1FC]">
                    RK
                  </div>
                  <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 bg-[#1FA854] text-white text-[8.5px] font-bold py-0.5 px-2 rounded-full whitespace-nowrap shadow-sm">
                    Available Now
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-['Fraunces',serif] font-medium text-[20px] sm:text-[22px] text-[#1B1F23]">
                      Rahul Kumar
                    </span>
                    <span className="w-4 h-4 rounded-full bg-[#1FA854] flex items-center justify-center shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-[13.5px] text-[#5B6168] mt-0.5 m-0">UI Designer &amp; Brand Specialist</p>
                  <p className="text-[12px] text-[#9BA0A6] mt-1 flex items-center gap-1.5 flex-wrap m-0">
                    <span>📍 Noida, Uttar Pradesh</span>
                    <span className="w-1 h-1 rounded-full bg-[#9BA0A6]" />
                    <span>🌐 Remote OK</span>
                  </p>
                </div>

                <div className="ml-auto text-center bg-[#F6F6F3] border border-[#E4E3DD] rounded-xl p-2.5 shrink-0">
                  <div className="text-[18px] font-bold text-[#1FA854] font-['Fraunces',serif] leading-none">
                    72%
                  </div>
                  <div className="text-[9px] text-[#9BA0A6] mt-1 whitespace-nowrap">Profile Strength</div>
                  <div className="h-1 w-14 bg-[#E4E3DD] rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-[#1FA854] w-[72%]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-4 py-3 border-y border-[#E4E3DD]">
                <div className="text-center">
                  <div className="text-[15px] font-bold text-[#1B1F23]">3–5 yrs</div>
                  <div className="text-[11px] text-[#9BA0A6] mt-0.5">Experience</div>
                </div>
                <div className="text-center border-l border-[#E4E3DD]">
                  <div className="text-[15px] font-bold text-[#1B1F23]">Full-time</div>
                  <div className="text-[11px] text-[#9BA0A6] mt-0.5">Availability</div>
                </div>
                <div className="text-center border-l border-[#E4E3DD]">
                  <div className="text-[15px] font-bold text-[#1B1F23]">Today</div>
                  <div className="text-[11px] text-[#9BA0A6] mt-0.5">Available to start</div>
                </div>
              </div>

              {/* About block */}
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#9BA0A6] mb-1 m-0">About</p>
                <p className="text-[13px] leading-relaxed text-[#5B6168] m-0">
                  Helps early-stage brands look credible, fast — 80+ logo and UI projects delivered for founders and small teams across India.
                </p>
              </div>

              {/* Top Skills */}
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#9BA0A6] mb-2 m-0">Top Skills</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E4E3DD] text-[12.5px] text-[#1B1F23] bg-[#F6F6F3]">
                    Figma UI Design <span className="text-[#2A1B85] font-semibold">₹8,000/project</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E4E3DD] text-[12.5px] text-[#1B1F23] bg-[#F6F6F3]">
                    Logo Design <span className="text-[#2A1B85] font-semibold">₹3,000/project</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E4E3DD] text-[12.5px] text-[#1B1F23] bg-[#F6F6F3]">
                    Brand Identity <span className="text-[#2A1B85] font-semibold">₹12,000/project</span>
                  </span>
                </div>
              </div>

              {/* Highlight */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#E5F5EB]">
                    <span className="text-[18px] shrink-0">💰</span>
                    <div>
                      <b className="block text-[13px] text-[#1B1F23] leading-tight">₹3,000</b>
                      <span className="text-[10px] text-[#9BA0A6]">Starting price</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FBF0DF]">
                    <span className="text-[18px] shrink-0">🗣️</span>
                    <div>
                      <b className="block text-[13px] text-[#1B1F23] leading-tight">Hindi, English</b>
                      <span className="text-[10px] text-[#9BA0A6]">2 Languages</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verifications */}
              <div className="mb-0">
                <div className="flex flex-wrap gap-3 sm:gap-6">
                  <div className="flex items-center gap-1.5 text-[12px] text-[#5B6168]">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#1FA854] flex items-center justify-center shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Resume Verified
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-[#5B6168]">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#1FA854] flex items-center justify-center shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Mobile Verified
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-[#5B6168]">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#1FA854] flex items-center justify-center shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Email Verified
                  </div>
                </div>
                <p className="text-[11px] text-[#9BA0A6] mt-2.5 m-0">Profile updated: 2 days ago</p>
              </div>

              <div className="flex gap-2.5 mt-4">
                <button
                  type="button"
                  className="flex-1 text-center py-3 px-4 rounded-xl text-[13.5px] font-semibold bg-[#1FA854] text-white border border-transparent cursor-pointer hover:bg-[#198f46] transition-colors"
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  title="Call"
                  className="w-11 py-3 rounded-xl bg-white text-[#1B1F23] border border-[#E4E3DD] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  📞
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EMBEDDED IFRAME FULLSCREEN VIEW (Resume Journey / Sign in) */}
      {/* ========================================================================= */}
      {iframeView && (
        <div className="fixed inset-0 bg-[#F6F6F3] z-50 flex flex-col">
          <div className="h-[56px] shrink-0 flex items-center px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-[#E4E3DD]">
            <button
              type="button"
              onClick={() => setIframeView(null)}
              className="flex items-center gap-2 text-[13px] font-semibold text-[#1B1F23] bg-white border border-[#E4E3DD] rounded-full py-2 px-4 cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <iframe
            src={iframeView === "resume" ? "/embedded/resume.html" : "/embedded/signup.html"}
            title={iframeView === "resume" ? "Resume Journey" : "Sign in or create account"}
            className="flex-1 w-full h-full border-none bg-white"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (md:hidden - only shown on mobile devices) */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E4E3DD] flex gap-1 p-2 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(20,15,60,0.06)] z-20">
        <button
          type="button"
          onClick={() => {
            setActiveView("dashboard");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
            activeView === "dashboard"
              ? "text-white bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] shadow-xs"
              : "text-[#9BA0A6] hover:text-[#1B1F23]"
          }`}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
          Dashboard
          {activeView === "dashboard" && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView("leads");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
            activeView === "leads"
              ? "text-white bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] shadow-xs"
              : "text-[#9BA0A6] hover:text-[#1B1F23]"
          }`}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4H12a8.7 8.7 0 0 1-4-1L3 20l1.2-3.6a8.3 8.3 0 0 1-1.2-4.4A8.4 8.4 0 0 1 11.5 3h.5a8.4 8.4 0 0 1 8.4 8Z" />
          </svg>
          Leads
          {activeView === "leads" && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => setIframeView("resume")}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl text-[11px] font-semibold text-[#9BA0A6] hover:text-[#1B1F23] transition-all duration-200 cursor-pointer"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M9 13h6M9 17h6" />
          </svg>
          Resume Journey
        </button>
      </nav>
    </div>
  );
}
