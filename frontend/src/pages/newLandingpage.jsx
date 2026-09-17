import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, ChevronDown, ArrowRight, Star, ShieldCheck,
  Phone, Check, Sparkles, Zap, Brain, Wrench, ChevronRight,
  Hammer, GraduationCap, Car, Utensils, Brush, Briefcase,
  Paintbrush, Scissors, WashingMachine, MoreHorizontal, Plug,
  Share2, Users, Wallet, Trophy, Medal, Award, Quote, Plus,
  Globe2, ShieldAlert, Repeat, Languages, MessageCircle,
  BarChart3, Lock, CheckCircle2, Flame,
} from "lucide-react";
import LandingFaqSection from "../components/landing/LandingFaqSection";

/* ─────────── Mock data (keeps providers.map dynamic) ─────────── */
// type Provider = {
//   _id: string;
//   initials: string;
//   name: string;
//   role: string;
//   experience: number;
//   rating: number;
//   reviews: number;
//   city: string;
//   distanceKm: number;
//   tags: string[];
//   rate: number;
//   tier: "skilled" | "semi-skilled";
//   avatarBg: string;
// };

const ALL_PROVIDERS = [
  { _id: "1", initials: "RS", name: "Rajat Singh", role: "Electrician • 6 yrs", experience: 6, rating: 4.9, reviews: 128, city: "Gaur City, Noida", distanceKm: 10, tags: ["Wiring", "AC Repair", "Inverter"], rate: 300, tier: "skilled", avatarBg: "bg-[#FFE9D6] text-[#B45309]" },
  { _id: "2", initials: "AY", name: "Anita Yadav", role: "House Maid • 5 yrs", experience: 5, rating: 4.7, reviews: 220, city: "Sector 62, Noida", distanceKm: 15, tags: ["Cleaning", "Cooking", "Dishes"], rate: 180, tier: "semi-skilled", avatarBg: "bg-[#DCFCE7] text-[#15803D]" },
  { _id: "3", initials: "VK", name: "Vinod Kumar", role: "Plumber • 8 yrs", experience: 8, rating: 4.8, reviews: 96, city: "Vasundhara, Ghz", distanceKm: 9, tags: ["Fittings", "Leak Fix", "Bathroom"], rate: 350, tier: "skilled", avatarBg: "bg-[#FEF3C7] text-[#B45309]" },
  { _id: "4", initials: "SV", name: "Sandeep Verma", role: "Personal Driver • 4 yrs", experience: 4, rating: 4.9, reviews: 154, city: "Greater Noida", distanceKm: 5, tags: ["Sedan", "SUV", "Outstation"], rate: 220, tier: "semi-skilled", avatarBg: "bg-[#E0E7FF] text-[#4338CA]" },
];

const CATEGORIES = [
  { name: "Maid", Icon: Brush, count: "650+ pros" },
  { name: "Driver", Icon: Car, count: "700+ pros" },
  { name: "Cook", Icon: Utensils, count: "800+ pros" },
  { name: "Electrician", Icon: Plug, count: "320+ pros" },
  { name: "Plumber", Icon: Wrench, count: "380+ pros" },
  { name: "Carpenter", Icon: Hammer, count: "150+ pros" },
  { name: "Tutor", Icon: GraduationCap, count: "440+ pros" },
  { name: "Labour", Icon: Briefcase, count: "200+ pros" },
  { name: "Painter", Icon: Paintbrush, count: "120+ pros" },
  { name: "Salon", Icon: Scissors, count: "180+ pros" },
  { name: "Laundry", Icon: WashingMachine, count: "60+ pros" },
  { name: "More", Icon: MoreHorizontal, count: "All pros" },
];

const SUGGESTIONS = [
  "Maid near me",
  "Driver tomorrow 6am",
  "Electrician AC repair",
  "Cook part-time evening",
];

const CITIES = [
  { name: "Noida", count: "12,400+ pros" },
  { name: "Greater Noida", count: "8,500+ pros" },
  { name: "Delhi", count: "21,300+ pros" },
  { name: "Gurugram", count: "15,700+ pros" },
  { name: "Ghaziabad", count: "9,260+ pros" },
  { name: "Faridabad", count: "5,500+ pros" },
  { name: "Bengaluru", count: "19,400+ pros" },
  { name: "Mumbai", count: "26,800+ pros" },
  { name: "Pune", count: "10,860+ pros" },
  { name: "Hyderabad", count: "11,600+ pros" },
];

/* ─────────── Reusable atoms ─────────── */
// const SectionLabel = ({ children }: { children: React.ReactNode }) => (
//   <p className="text-[11px] font-bold tracking-[0.2em] text-[#1677FF] uppercase mb-3">{children}</p>
// );
const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-bold tracking-[0.2em] text-[#1677FF] uppercase mb-3">
    {children}
  </p>
);

// const Pill = ({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) => (
//   <button
//     onClick={onClick}
//     className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition whitespace-nowrap ${
//       active
//         ? "bg-[#081B3A] text-white border-[#081B3A]"
//         : "bg-white text-[#374151] border-[#E7ECF4] hover:border-[#1677FF] hover:text-[#1677FF]"
//     }`}
//   >
//     {children}
//   </button>
// );
const Pill = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition whitespace-nowrap ${
      active
        ? "bg-[#081B3A] text-white border-[#081B3A]"
        : "bg-white text-[#374151] border-[#E7ECF4] hover:border-[#1677FF] hover:text-[#1677FF]"
    }`}
  >
    {children}
  </button>
);

/* ─────────── Provider Card ─────────── */
// const ProviderCard = ({ p, onClick }: { p: Provider; onClick: () => void }) => (
//   <div
//     onClick={onClick}
//     className="bg-white rounded-2xl border border-[#E7ECF4] p-5 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition cursor-pointer flex flex-col gap-3"
//   >
//     <div className="flex items-center gap-3">
//       <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${p.avatarBg}`}>
//         {p.initials}
//       </div>
//       <div className="flex-1 min-w-0">
//         <div className="flex items-center gap-1.5">
//           <h3 className="font-bold text-[#081B3A] text-sm truncate">{p.name}</h3>
//           <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0" />
//         </div>
//         <p className="text-xs text-[#6B7280] truncate">{p.role}</p>
//       </div>
//     </div>

//     <div className="flex items-center gap-1.5 text-xs">
//       <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
//       <span className="font-bold text-[#081B3A]">{p.rating}</span>
//       <span className="text-[#6B7280]">({p.reviews} reviews)</span>
//     </div>

//     <div className="flex items-center gap-1 text-xs text-[#6B7280]">
//       <MapPin className="w-3 h-3" /> {p.city}
//     </div>

//     <div className="flex flex-wrap gap-1.5">
//       {p.tags.map((t) => (
//         <span key={t} className="text-[11px] font-medium text-[#374151] bg-[#F3F6FB] border border-[#E7ECF4] px-2 py-0.5 rounded-md">
//           {t}
//         </span>
//       ))}
//     </div>

//     <div className="flex items-baseline justify-between pt-1">
//       <div>
//         <span className="text-lg font-extrabold text-[#081B3A]">₹{p.rate}</span>
//         <span className="text-xs text-[#6B7280]"> /hr</span>
//       </div>
//       <span className="text-xs text-[#6B7280]">~{p.distanceKm}m</span>
//     </div>

//     <div className="flex gap-2 pt-1">
//       <button
//         onClick={(e) => { e.stopPropagation(); }}
//         className="flex-1 flex items-center justify-center gap-1.5 border border-[#E7ECF4] text-[#374151] text-xs font-semibold py-2 rounded-xl hover:bg-[#F7F9FC] transition"
//       >
//         <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
//       </button>
//       <button
//         onClick={(e) => { e.stopPropagation(); onClick(); }}
//         className="flex-1 flex items-center justify-center gap-1.5 bg-[#1677FF] hover:bg-[#0E5FCC] text-white text-xs font-bold py-2 rounded-xl transition"
//       >
//         <Phone className="w-3.5 h-3.5" /> Call Now
//       </button>
//     </div>
//   </div>
// );

const formatDistance = (dist) => {
  if (dist == null || !Number.isFinite(Number(dist))) return '';
  const num = Number(dist);
  if (num < 1) {
    return `~${Math.round(num * 1000)} m`;
  }
  return `~${num.toFixed(1)} km`;
};

const ProviderCard = ({ p, onClick }) => {
  const navigate = useNavigate();
  const maxSkillsToShow = 2;
  const visibleSkills = p.tags ? p.tags.slice(0, maxSkillsToShow) : [];
  const remainingSkills = p.tags ? Math.max(0, p.tags.length - maxSkillsToShow) : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-[#E7ECF4] p-5 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition cursor-pointer flex flex-col h-full gap-3 justify-between"
    >
      {/* Header section */}
      <div className="flex items-center gap-3 min-h-[44px]">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${p.avatarBg}`}>
          {p.initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-[#081B3A] text-sm truncate" title={p.name}>{p.name}</h3>
            <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0" />
          </div>
          <p className="text-xs text-[#6B7280] truncate" title={p.role}>{p.role}</p>
        </div>
      </div>

      {/* Rating section */}
      <div className="flex items-center gap-1.5 text-xs h-4">
        <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B] shrink-0" />
        <span className="font-bold text-[#081B3A]">{p.rating}</span>
        <span className="text-[#6B7280]">({p.reviews} reviews)</span>
      </div>

      {/* Location section */}
      <div className="flex items-center gap-1 text-xs text-[#6B7280] h-4 truncate">
        <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{p.city}</span>
      </div>

      {/* Skills/badges section (fixed height) */}
      <div className="flex flex-wrap items-center gap-1.5 h-7 overflow-hidden">
        {visibleSkills.map((t) => (
          <span
            key={t}
            className="text-[11px] font-medium text-[#374151] bg-[#F3F6FB] border border-[#E7ECF4] px-2 py-0.5 rounded-md truncate max-w-[100px]"
            title={t}
          >
            {t}
          </span>
        ))}
        {remainingSkills > 0 && (
          <span className="text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-md shrink-0">
            +{remainingSkills} more
          </span>
        )}
      </div>

      {/* Price and distance section */}
      <div className="flex items-baseline justify-between pt-1 border-t border-[#F3F6FB] mt-auto">
        <div>
          <span className="text-lg font-extrabold text-[#081B3A]">₹{p.rate}</span>
          <span className="text-xs text-[#6B7280]"> /hr</span>
        </div>
        <span className="text-xs text-[#6B7280]">{formatDistance(p.distanceKm)}</span>
      </div>

      {/* CTA buttons row */}
      <div className="flex gap-2 pt-1 mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); navigate('/contact'); }}
          className="flex-1 flex items-center justify-center gap-1.5 border border-[#E7ECF4] text-[#374151] text-xs font-semibold py-2 rounded-xl hover:bg-[#F7F9FC] transition h-9"
        >
          <MessageCircle className="w-3.5 h-3.5" /> Contact Us
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#1677FF] hover:bg-[#0E5FCC] text-white text-xs font-bold py-2 rounded-xl transition h-9"
        >
          <Phone className="w-3.5 h-3.5" /> Call Now
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════ MAIN PAGE ════════════════════════════════════ */
const Index = () => {
  const navigate = useNavigate();

  const [skill, setSkill] = useState("");
  const [location] = useState("Noida, IN");
  const [providers, setProviders] = useState([]);
  const [activeTier, setActiveTier] = useState("all");
  const [openFaq, setOpenFaq] = useState(0);
  const [email, setEmail] = useState("");

  const debounceRef = useRef(null);

  const fetchProviders = useCallback((s = "") => {
    const q = s.trim().toLowerCase();

    const list = q
      ? ALL_PROVIDERS.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.role.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        )
      : ALL_PROVIDERS;

    setProviders(list);
  }, []);

  useEffect(() => {
    fetchProviders("");
  }, [fetchProviders]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => fetchProviders(skill), 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [skill, fetchProviders]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(skill)}`);
  };

  const displayedProviders = providers.filter(
    (p) => activeTier === "all" || p.tier === activeTier
  );

  return (
    <div className="min-h-screen bg-white text-[#081B3A] font-sans antialiased">
      {/* ━━━━━━━━ NAVBAR ━━━━━━━━ */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E7ECF4]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#081B3A] flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <p className="font-extrabold text-[#081B3A] tracking-tight">Lucohire</p>
              <p className="text-[9px] font-semibold tracking-[0.2em] text-[#6B7280] mt-0.5">AI HIRING</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#6B7280]">
            <MapPin className="w-3.5 h-3.5 text-[#1677FF]" />
            {location}
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#374151]">
            <a className="flex items-center gap-1 text-[#F59E0B]"><Wallet className="w-4 h-4" /> Earn 40%</a>
            <a className="flex items-center gap-1 text-[#1677FF]"><Trophy className="w-4 h-4" /> Win ₹1 Lakh</a>
            <a className="hover:text-[#081B3A]">Plans</a>
            <a className="hover:text-[#081B3A]">Login</a>
            <button className="bg-[#1677FF] hover:bg-[#0E5FCC] text-white px-4 py-2 rounded-full transition shadow-[0_4px_12px_rgba(22,119,255,0.35)]">
              Start Earning
            </button>
          </nav>
        </div>
      </header>

      {/* ━━━━━━━━ HERO ━━━━━━━━ */}
      <section className="bg-[#F7F9FC] py-16 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 bg-white border border-[#E7ECF4] rounded-full px-3 py-1 text-xs font-semibold text-[#374151] shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-pulse" />
              1,264 verified pros online now
            </span>
          </div>

          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-[#E7ECF4] shadow-[0_20px_60px_rgba(8,27,58,0.08)] p-8 md:p-10">
            <div className="flex items-center justify-between mb-5">
              <span className="inline-flex items-center gap-1.5 bg-[#EAF2FF] text-[#1677FF] text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3" /> AI Match Engine
              </span>
              <span className="text-xs text-[#6B7280]">Average match in ~1.2s</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-[#081B3A]">
              Tell us what you need.
            </h1>
            <p className="text-[#1677FF] font-semibold mt-2 text-lg">Get 5 best matches instantly.</p>

            <form onSubmit={handleSearch} className="mt-6">
              <div className="bg-[#F7F9FC] border border-[#E7ECF4] rounded-2xl p-1.5 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3">
                  <Search className="w-4 h-4 text-[#6B7280]" />
                  <input
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    placeholder="Type like you speak… e.g 'maid morning time Noida'"
                    className="flex-1 bg-transparent text-sm text-[#081B3A] placeholder-[#9CA3AF] py-3 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#1677FF] hover:bg-[#0E5FCC] text-white text-sm font-bold px-5 py-3 rounded-xl flex items-center gap-1.5 transition shadow-[0_4px_12px_rgba(22,119,255,0.3)]"
                >
                  Find Match <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-[#6B7280] tracking-wider">TRY:</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSkill(s)}
                  className="text-xs text-[#374151] border border-[#E7ECF4] bg-white px-3 py-1 rounded-full hover:border-[#1677FF] hover:text-[#1677FF] transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ VERIFIED PROS ━━━━━━━━ */}
      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <SectionLabel>Top Pool</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#081B3A]">
                Verified pros, ready right now
              </h2>
              <p className="text-[#6B7280] mt-2 text-sm">Top 5 per skill + city — rotates every 60s for fair lead distribution.</p>
            </div>
            <a className="text-sm font-semibold text-[#1677FF] hover:underline cursor-pointer">View all →</a>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-[#6B7280] mb-6">
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" /> 4.8 avg rating</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A]" /> Aadhaar verified</span>
            <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-[#12B76A]" /> WhatsApp reply ~10 min</span>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <Pill active={activeTier === "all"} onClick={() => setActiveTier("all")}>All</Pill>
            <Pill active={activeTier === "skilled"} onClick={() => setActiveTier("skilled")}>Skilled</Pill>
            <Pill active={activeTier === "semi-skilled"} onClick={() => setActiveTier("semi-skilled")}>Semi-skilled</Pill>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
            {displayedProviders.map((p) => (
              <ProviderCard key={p._id} p={p} onClick={() => navigate(`/p/${p._id}`)} />
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ CATEGORY GRID ━━━━━━━━ */}
      <section className="bg-[#F7F9FC] py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <SectionLabel>Categories</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Every household & business need
              </h2>
            </div>
            <a className="text-sm font-semibold text-[#1677FF] hover:underline cursor-pointer">View all →</a>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(({ name, Icon, count }) => (
              <button
                key={name}
                onClick={() => setSkill(name)}
                className="bg-white border border-[#E7ECF4] rounded-2xl p-5 flex flex-col items-center gap-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition"
              >
                <Icon className="w-6 h-6 text-[#1677FF]" />
                <p className="font-bold text-sm text-[#081B3A] mt-1">{name}</p>
                <p className="text-[11px] text-[#6B7280]">{count}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ TWO SIDES ━━━━━━━━ */}
      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Two sides. <span className="italic font-serif text-[#1677FF]">One simple flow.</span>
            </h2>
            <p className="text-[#6B7280] mt-3 text-sm max-w-xl mx-auto">
              Whether you're hiring or earning — Lucohire's AI handles matching, alerts and follow-ups.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Recruiters */}
            <div className="bg-white border border-[#E7ECF4] rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
              <SectionLabel>For Recruiters</SectionLabel>
              <h3 className="text-2xl font-extrabold tracking-tight mb-6">Find. Match. Hire.</h3>
              {[
                { Icon: Search, title: "Search or post", desc: "Type your need in plain Hinglish — AI parses skill, city, budget." },
                { Icon: CheckCircle2, title: "Get 5 best matches", desc: "Auto-ranked by trust score, distance, response speed." },
                { Icon: Lock, title: "Unlock & WhatsApp", desc: "Pay-per-unlock or plan. Chat directly. Hire same day." },
              ].map((s, i) => (
                <div key={s.title} className="flex gap-4 py-4 border-t border-[#E7ECF4] first:border-t-0">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center shrink-0">
                    <s.Icon className="w-4.5 h-4.5 text-[#1677FF]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-[#6B7280]">0{i + 1}</p>
                    <p className="font-bold text-[#081B3A]">{s.title}</p>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Providers */}
            <div className="bg-[#081B3A] text-white border border-[#081B3A] rounded-3xl p-8 shadow-[0_20px_60px_rgba(8,27,58,0.25)]">
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#1677FF] uppercase mb-3">For Service Providers</p>
              <h3 className="text-2xl font-extrabold tracking-tight mb-6">Get found. Get paid.</h3>
              {[
                { Icon: Users, title: "Sign up in 60s", desc: "WhatsApp / Google / Email. Pick role, add 2-4 skills. Free." },
                { Icon: BarChart3, title: "Get rotating leads", desc: "Top pool of 5 rotates every 60s — fair lead distribution." },
                { Icon: MessageCircle, title: "Reply, deal, earn", desc: "Lead lands on WhatsApp. Confirm deal — rating unlocks." },
              ].map((s, i) => (
                <div key={s.title} className="flex gap-4 py-4 border-t border-white/10 first:border-t-0">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <s.Icon className="w-4.5 h-4.5 text-[#1677FF]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-white/50">0{i + 1}</p>
                    <p className="font-bold">{s.title}</p>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ AI ENGINE ━━━━━━━━ */}
      <section className="bg-[#F7F9FC] py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <SectionLabel>The Engine</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Not just a directory.<br />
              <span className="italic font-serif text-[#1677FF]">An AI that hires for you.</span>
            </h2>
            <p className="text-[#6B7280] mt-3 text-sm max-w-2xl mx-auto">
              We replaced manual sorting with a learning system that ranks, routes and follows up — so you spend seconds, not hours.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { Icon: Globe2, title: "AI Best Match", desc: "Weighted scoring on skill, distance, rating, response speed & boost — picks top 5 instantly." },
              { Icon: Zap, title: "Auto Lead Distribution", desc: "No manual routing. System rotates leads fairly so every verified pro gets a fair chance." },
              { Icon: ShieldCheck, title: "AI Trust Score", desc: "Every provider has a 0-100 score from completion, reviews & response time. Fully transparent." },
              { Icon: Languages, title: "Hinglish Search", desc: "Search the way you speak — 'maid evening part time' just works. No filters needed." },
              { Icon: ShieldAlert, title: "Fraud Detection", desc: "Spots fake profiles, duplicate accounts and spam patterns automatically." },
              { Icon: Repeat, title: "Repeat Hire Memory", desc: "Hired before? We remember. One tap to rebook the same provider — or a similar one nearby." },
            ].map((f) => (
              <div key={f.title} className="bg-white border border-[#E7ECF4] rounded-2xl p-6 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] transition">
                <f.Icon className="w-5 h-5 text-[#1677FF] mb-4" />
                <h3 className="font-bold text-[#081B3A] mb-1.5">{f.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ STATS DARK BAR ━━━━━━━━ */}
      <section className="bg-[#081B3A] text-white py-10">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          {[
            { v: "1,25,000+", l: "Households served" },
            { v: "50,000+", l: "Jobs posted" },
            { v: "4.8★", l: "Average rating" },
            { v: "~10 min", l: "Avg WhatsApp reply" },
            { v: "24/7", l: "Verified support" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-2xl md:text-3xl font-extrabold tracking-tight">{s.v}</p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 mt-1.5">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] text-white/40">
          {["Aadhaar Verified", "Razorpay Secure", "Meta WhatsApp API", "MSME Registered", "ISO 27001 Aligned"].map((b) => (
            <span key={b} className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#1677FF]" />{b}</span>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━ WHATSAPP NATIVE ━━━━━━━━ */}
      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <SectionLabel>WhatsApp · Native</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Every lead lands where you actually reply — <span className="italic font-serif text-[#1677FF]">WhatsApp.</span>
            </h2>
            <p className="text-[#6B7280] mt-4 text-sm leading-relaxed">
              Built on Meta's Cloud API. From signup to renewal, every moment is a clean, branded message with delivery status and opt-out.
            </p>

            <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                "Signup welcome + verification",
                "Job post confirmation",
                "Plan / credit expiry reminder",
                "Payment success & invoice",
                "New lead alert (skill, city, budget)",
                "Daily performance summary",
              ].map((b) => (
                <div key={b} className="flex items-start gap-2 text-[#374151]">
                  <Check className="w-4 h-4 text-[#12B76A] mt-0.5 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[#6B7280]">
              <span>● Meta Cloud API</span>
              <span>● Multi-language</span>
              <span>● Two-way replies</span>
            </div>
          </div>

          {/* Phone mock */}
          <div className="flex justify-center">
            <div className="relative w-[280px] bg-[#081B3A] rounded-[42px] p-3 shadow-[0_30px_80px_rgba(8,27,58,0.25)]">
              <div className="bg-[#FAF7F2] rounded-[32px] overflow-hidden">
                <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">L</div>
                  <div>
                    <p className="text-sm font-semibold">Lucohire</p>
                    <p className="text-[10px] opacity-70">online</p>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[320px]">
                  {[
                    { t: "🎉 Welcome Anita! Your provider profile is verified.", c: "bg-[#FFF8E1]" },
                    { t: "🔔 New lead — Maid in Gaur City\nBudget ₹6,000/mo · Mornings", c: "bg-[#FFF8E1]" },
                    { t: "Yes, available. Can start Monday.", c: "bg-[#DCF8C6] ml-auto", me: true },
                    { t: "✅ Reply forwarded to client", c: "bg-[#FFF8E1]" },
                    { t: "💰 Payment ₹499 received · Pro Boost active", c: "bg-[#FFF8E1]" },
                  ].map((m, i) => (
                    <div key={i} className={`text-[11px] leading-snug px-2.5 py-1.5 rounded-lg max-w-[80%] whitespace-pre-line text-[#081B3A] shadow-sm ${m.c}`}>
                      {m.t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ PRICING ━━━━━━━━ */}
      <section className="bg-[#F7F9FC] py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <SectionLabel>Plans</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Pay only when you grow.</h2>
            <p className="text-[#6B7280] mt-2 text-sm">Transparent pricing. No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { name: "Starter", price: "Free", note: "For first-time providers", featured: false, perks: ["Profile + 2 skills", "Basic ranking", "WhatsApp lead alerts", "1 city / area"], cta: "Start free" },
              { name: "Pro Boost", price: "₹499", per: "per month", note: "Most popular", featured: true, perks: ["All Starter features", "Top-pool rotation (60s)", "Up to 5 skills", "Priority lead distribution", "AI profile builder"], cta: "Boost my profile" },
              { name: "Business", price: "₹1,999", per: "per month", note: "Teams & agencies", featured: false, perks: ["Unlimited skills & areas", "Featured placement", "Bulk hire & unlocks", "Team accounts", "Dedicated success manager"], cta: "Talk to sales" },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative rounded-3xl p-7 border ${
                  p.featured
                    ? "bg-[#081B3A] text-white border-[#081B3A] shadow-[0_30px_70px_rgba(8,27,58,0.25)] md:scale-105"
                    : "bg-white border-[#E7ECF4]"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F59E0B] text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${p.featured ? "bg-white/10" : "bg-[#EAF2FF]"}`}>
                  {p.featured ? <Sparkles className="w-5 h-5 text-[#1677FF]" /> : <Sparkles className="w-5 h-5 text-[#1677FF]" />}
                </div>
                <p className={`font-bold ${p.featured ? "text-white" : "text-[#081B3A]"}`}>{p.name}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
                  {p.per && <span className={`text-xs ${p.featured ? "text-white/60" : "text-[#6B7280]"}`}>{p.per}</span>}
                </div>
                <p className={`text-xs mt-1 ${p.featured ? "text-white/60" : "text-[#6B7280]"}`}>{p.note}</p>

                <ul className="mt-6 space-y-2.5">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.featured ? "text-[#1677FF]" : "text-[#12B76A]"}`} />
                      <span className={p.featured ? "text-white/85" : "text-[#374151]"}>{perk}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-7 w-full py-3 rounded-xl font-bold text-sm transition ${
                    p.featured
                      ? "bg-white text-[#081B3A] hover:bg-white/90"
                      : "bg-[#1677FF] text-white hover:bg-[#0E5FCC]"
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ REFERRAL ━━━━━━━━ */}
      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 bg-[#EAF2FF] text-[#1677FF] text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-5">
            <Share2 className="w-3 h-3" /> Referral Partner Program
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Refer & Earn <span className="text-[#1677FF]">40% Commission</span> 💰
          </h2>
          <p className="text-[#6B7280] mt-3 text-sm max-w-xl mx-auto">
            दूसरों का registration करवाओ और हर paid plan पर <b>40% referral commission</b> कमाओ!
          </p>

          <div className="mt-12 grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { Icon: Share2, step: "Step 1", title: "अपना Referral Link शेयर करो", desc: "Sign up करो और WhatsApp, Facebook पर share करो" },
              { Icon: Users, step: "Step 2", title: "लोगों को Register करवाओ", desc: "Friends, family — जो भी worker या employer है" },
              { Icon: Wallet, step: "Step 3", title: "40% Commission कमाओ", desc: "Referred user के paid plan पर तुरंत 40% directly!" },
            ].map((s) => (
              <div key={s.step} className="bg-white border border-[#E7ECF4] rounded-2xl p-6 text-left">
                <s.Icon className="w-6 h-6 text-[#1677FF] mb-4" />
                <p className="text-[10px] font-bold tracking-widest text-[#6B7280] uppercase">{s.step}</p>
                <p className="font-bold mt-1 text-[#081B3A]">{s.title}</p>
                <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-3xl mx-auto bg-white border border-[#E7ECF4] rounded-2xl p-8">
            <p className="text-[11px] font-bold tracking-widest text-[#1677FF] uppercase mb-2">Unlimited Earning Potential</p>
            <p className="text-3xl md:text-4xl font-extrabold tracking-tight">₹10,000 – ₹1,00,000+ <span className="text-[#6B7280] font-bold text-2xl">/ month</span></p>
            <p className="text-xs text-[#6B7280] mt-2">Top referral partners earn lakhs — no limit on referrals.</p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button className="bg-white border border-[#E7ECF4] text-[#374151] px-5 py-3 rounded-xl text-sm font-semibold hover:border-[#1677FF] hover:text-[#1677FF] transition">Learn More</button>
            <button className="bg-[#1677FF] hover:bg-[#0E5FCC] text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-[0_4px_12px_rgba(22,119,255,0.3)]">
              Become Referral Partner <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ COVERAGE ━━━━━━━━ */}
      <section className="bg-[#F7F9FC] py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <SectionLabel>Coverage</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Live in your city. Growing fast.</h2>
            </div>
            <a className="text-sm font-semibold text-[#1677FF] hover:underline cursor-pointer">Request your city →</a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {CITIES.map((c) => (
              <div key={c.name} className="bg-white border border-[#E7ECF4] rounded-2xl p-5 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition">
                <p className="font-bold text-[#081B3A]">{c.name}</p>
                <p className="text-xs text-[#6B7280] mt-1">{c.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ TESTIMONIALS ━━━━━━━━ */}
      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <SectionLabel>Voices</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Real people. Real results.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: "Priya Sharma", role: "Recruiter · Gaur City, Noida", text: "Maid mil gayi 20 minute me. WhatsApp pe seedha baat hui, agle din join kar liya. Game changer!", initials: "P", bg: "bg-[#FFE4E6] text-[#9F1239]" },
              { name: "Manoj Plumber", role: "Provider · Noida Extension", text: "Pehle din bekar lagta tha. Pro Boost liya, 6-8 hafte me jobs aati hain. Income double ho gayi.", initials: "M", bg: "bg-[#DCFCE7] text-[#15803D]" },
              { name: "Amit Verma", role: "Recruiter · Greater Noida", text: "Verified profiles, fair pricing — trust banta hai. Apartment ke 14 flats ne yahin se hire kiya.", initials: "A", bg: "bg-[#081B3A] text-white" },
            ].map((t) => (
              <div key={t.name} className="bg-white border border-[#E7ECF4] rounded-2xl p-6 relative">
                <Quote className="absolute top-4 right-4 w-7 h-7 text-[#E7ECF4]" />
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />)}
                </div>
                <p className="text-sm text-[#374151] leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-[#E7ECF4]">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${t.bg}`}>{t.initials}</div>
                  <div>
                    <p className="font-bold text-sm text-[#081B3A]">{t.name}</p>
                    <p className="text-[11px] text-[#6B7280]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ FAQ ━━━━━━━━ */}
      <LandingFaqSection />

      {/* ━━━━━━━━ CONTEST ━━━━━━━━ */}
      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 bg-[#EAF2FF] text-[#1677FF] text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-5">
            <Trophy className="w-3 h-3" /> Registration Champion Contest
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight inline-flex items-center gap-3 flex-wrap justify-center">
            Complete Profile & Win Cash Rewards <Flame className="w-9 h-9 text-[#F59E0B]" />
          </h2>
          <p className="text-[#6B7280] mt-3 text-sm max-w-xl mx-auto">
            अपने friends, family और जानने वालों का registration करवाओ — जितने ज्यादा profiles, उतना ऊपर rank!
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["1️⃣ अपना account बनाओ", "2️⃣ Friends/Family से register करवाओ", "3️⃣ सबसे ज्यादा = Cash Prize 🏆"].map((s) => (
              <span key={s} className="bg-white border border-[#E7ECF4] text-sm font-semibold text-[#374151] px-4 py-2 rounded-full">{s}</span>
            ))}
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { place: "1st Place", color: "bg-[#FEF3C7] border-[#F59E0B]", Icon: Trophy, iconColor: "text-[#F59E0B]", label: "Most Registrations", prize: "₹10,000" },
              { place: "2nd Place", color: "bg-[#F3F4F6] border-[#9CA3AF]", Icon: Medal, iconColor: "text-[#6B7280]", label: "2nd Highest", prize: "₹5,000" },
              { place: "Next 5", color: "bg-[#FFEDD5] border-[#F59E0B]", Icon: Award, iconColor: "text-[#B45309]", label: "₹2,000 each", prize: "₹10,000" },
            ].map((p) => (
              <div key={p.place} className={`rounded-2xl border-2 ${p.color} p-6`}>
                <span className="inline-block bg-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full text-[#374151] border border-[#E7ECF4]">{p.place}</span>
                <p.Icon className={`w-12 h-12 ${p.iconColor} mx-auto mt-5`} />
                <p className="text-xs text-[#6B7280] mt-3">{p.label}</p>
                <p className="text-3xl font-extrabold text-[#081B3A] mt-2">{p.prize}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 max-w-3xl mx-auto bg-white border border-[#E7ECF4] rounded-2xl p-6">
            <p className="text-[11px] font-bold tracking-widest text-[#1677FF] uppercase">Annual Grand Champion 🏆</p>
            <p className="text-4xl font-extrabold mt-2 tracking-tight">₹1,00,000</p>
            <p className="text-xs text-[#6B7280] mt-1">Yearly mega prize for the top performer</p>
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {[
              { v: "07", l: "Days" }, { v: "11", l: "Hrs" }, { v: "58", l: "Min" }, { v: "27", l: "Sec" },
            ].map((t) => (
              <div key={t.l} className="bg-white border border-[#E7ECF4] rounded-xl px-4 py-2 min-w-[60px]">
                <p className="text-xl font-extrabold text-[#081B3A]">{t.v}</p>
                <p className="text-[9px] tracking-widest uppercase text-[#6B7280]">{t.l}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button className="bg-white border border-[#E7ECF4] text-[#374151] px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"><Trophy className="w-4 h-4" /> View Leaderboard</button>
            <button className="bg-[#1677FF] hover:bg-[#0E5FCC] text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_4px_12px_rgba(22,119,255,0.3)]">Register Now <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ FINAL CTA ━━━━━━━━ */}
      <section className="px-6 lg:px-8 pb-20">
        <div className="max-w-[1280px] mx-auto rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg,#0A1B3D 0%,#102A5E 60%,#1E3A8A 100%)" }}>
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 30% 50%, rgba(22,119,255,0.4), transparent 60%)" }} />
          <div className="relative px-6 py-20 text-center text-white">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-6 backdrop-blur">
              <Users className="w-3 h-3" /> Join 1,25,000+ on Lucohire
            </span>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              Hire smarter.<br />
              <span className="italic font-serif text-[#1677FF]">Earn faster.</span>
            </h2>
            <p className="text-white/70 text-sm mt-4 max-w-md mx-auto">
              One AI engine for both sides of hiring. Sign up in 60 seconds — your first match arrives on WhatsApp.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button className="bg-white/10 border border-white/20 backdrop-blur text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/20 transition">
                I'm Hiring <ArrowRight className="w-4 h-4" />
              </button>
              <button className="bg-[#1677FF] hover:bg-[#0E5FCC] text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_4px_20px_rgba(22,119,255,0.5)] transition">
                I Provide Services <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-white/40 mt-6">No credit card · Free forever plan · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ FOOTER ━━━━━━━━ */}
      <footer className="border-t border-[#E7ECF4] bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-14 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#081B3A] flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <p className="font-extrabold text-[#081B3A] tracking-tight">Lucohire</p>
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              India's AI-powered hiring platform. Verified providers, fair distribution, WhatsApp-first.
            </p>
          </div>

          {[
            { title: "Recruiters", links: ["Post a Job", "Find Providers", "Bulk Hire", "Pricing", "Help Center"] },
            { title: "Providers", links: ["Create Profile", "Get Leads", "Pro Boost", "Success Stories", "Renewal"] },
            { title: "Company", links: ["About", "Careers", "Press", "Privacy", "Terms"] },
          ].map((c) => (
            <div key={c.title}>
              <p className="text-[11px] font-bold tracking-widest uppercase text-[#1677FF] mb-4">{c.title}</p>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}><a className="text-sm text-[#374151] hover:text-[#1677FF] cursor-pointer">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#1677FF] mb-4">Stay Updated</p>
            <p className="text-xs text-[#6B7280] mb-3 leading-relaxed">Product news & city launches — once a month.</p>
            <form onSubmit={(e) => { e.preventDefault(); setEmail(""); }} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 min-w-0 border border-[#E7ECF4] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#1677FF]"
              />
              <button className="bg-[#081B3A] text-white text-xs font-bold px-4 rounded-lg">Go</button>
            </form>
          </div>
        </div>

        <div className="border-t border-[#E7ECF4]">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B7280]">
            <span>© 2026 Lucohire. All rights reserved.</span>
            <span>Made with care in India 🇮🇳</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;