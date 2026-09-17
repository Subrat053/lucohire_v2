import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SKILLS = [
  "Logo Design", "React Developer", "Video Editing", "Content Writing", "SEO Expert",
  "UI/UX Designer", "WordPress Developer", "Social Media Marketing", "Voice-over Artist",
  "Data Entry", "App Developer", "Python Developer", "Graphic Designer", "Photographer",
  "Translator", "Virtual Assistant", "Copywriter", "Illustrator", "3D Animator",
  "Digital Marketer", "Video Editor", "Brand Designer", "SaaS Content Writer"
];

const BUDGETS = [
  "Any budget", "Under ₹2,000", "₹2,000 – ₹5,000", "₹5,000 – ₹10,000",
  "₹10,000 – ₹20,000", "₹20,000 – ₹50,000", "₹50,000 – ₹1,00,000", "₹1,00,000+"
];

const CITIES = [
  "Remote", "Anywhere in India", "Bengaluru", "Mumbai", "Delhi NCR", "Pune",
  "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh",
  "Lucknow", "Surat", "Indore", "Kochi", "Nagpur", "Bhopal", "Noida", "Gurugram"
];

export default function HomeHeroSection({
  onSearch,
  onListAsFreelancer,
  stats = {
    totalFreelancersListed: "6,200+",
    totalRequirementsPosted: "1,800+",
    avgResponseTime: "~12 min"
  }
}) {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [budget, setBudget] = useState('Any budget');
  const [location, setLocation] = useState('Remote');

  const [activeDropdown, setActiveDropdown] = useState(null); // 'search' | 'budget' | 'location' | null

  const searchBoxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setActiveDropdown(null);
    if (onSearch) {
      onSearch({ skill: searchQuery, budget, location });
    } else {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (location && location !== 'Remote') params.append('location', location);
      navigate(`/search?${params.toString()}`);
    }
  };

  const handleRegisterFreelancer = () => {
    if (onListAsFreelancer) {
      onListAsFreelancer();
    } else {
      navigate('/signup?role=provider');
    }
  };

  // Filter lists
  const filteredSkills = searchQuery.trim()
    ? SKILLS.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 7)
    : SKILLS.slice(0, 7);

  const filteredBudgets = budget.trim() && budget !== 'Any budget'
    ? BUDGETS.filter(b => b.toLowerCase().includes(budget.toLowerCase())).slice(0, 7)
    : BUDGETS.slice(0, 7);

  const filteredCities = location.trim() && location !== 'Remote'
    ? CITIES.filter(c => c.toLowerCase().includes(location.toLowerCase())).slice(0, 7)
    : CITIES.slice(0, 7);

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <b className="text-[#4A3AE0] font-semibold">{text.slice(idx, idx + query.length)}</b>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <section className="relative text-white overflow-hidden bg-[radial-gradient(130%_95%_at_50%_100%,#4A3AE0_0%,#2C2078_42%,#170F3E_100%)] pt-7 pb-9 px-5 sm:px-8 lg:py-16">
      {/* Golden subtle ambient glow */}
      <div 
        className="absolute top-[-20%] right-[-15%] w-[70%] h-[60%] pointer-events-none rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(245,196,69,0.16) 0%, rgba(245,196,69,0) 70%)'
        }}
      />

      <div className="max-w-[460px] md:max-w-3xl lg:max-w-5xl mx-auto relative z-10">
        <div className="text-center lg:text-left lg:grid lg:grid-cols-12 lg:gap-12 lg:items-center">
          
          {/* Main Hero Typography */}
          <div className="lg:col-span-6 xl:col-span-7">
            <h1 className="font-space text-[28px] sm:text-[34px] lg:text-[42px] font-extrabold tracking-[-0.4px] leading-[1.18] text-white">
              Hire Verified Freelancers or Meet Real Clients.<br />
              <span className="text-[#F5C445]">Just Post Your Work.</span>
            </h1>
            <p className="mt-3 text-[14.5px] sm:text-[16px] text-[#D8D2FA] leading-[1.55] max-w-[38ch] mx-auto lg:mx-0">
              India's trusted platform to hire freelancers online and find freelance jobs that actually pays.
            </p>

            {/* Desktop-only stats placement if on wide screen */}
            <div className="hidden lg:grid grid-cols-3 gap-6 mt-10 pt-8 border-t border-white/10">
              <div>
                <div className="font-space text-[26px] font-bold text-white">{stats.totalFreelancersListed}</div>
                <div className="text-[12px] text-white/70 mt-0.5">Freelancers listed</div>
              </div>
              <div>
                <div className="font-space text-[26px] font-bold text-white">{stats.totalRequirementsPosted}</div>
                <div className="text-[12px] text-white/70 mt-0.5">Requirements posted</div>
              </div>
              <div>
                <div className="font-space text-[26px] font-bold text-white">{stats.avgResponseTime}</div>
                <div className="text-[12px] text-white/70 mt-0.5">Avg. response time</div>
              </div>
            </div>
          </div>

          {/* Interactive Search Card */}
          <div className="mt-6 sm:mt-8 lg:mt-0 lg:col-span-6 xl:col-span-5" ref={searchBoxRef}>
            <div className="bg-white text-[#1C1733] rounded-[22px] p-5 sm:p-6 shadow-[0_24px_48px_-18px_rgba(14,12,51,0.5)] text-left relative z-20">
              <form onSubmit={handleSearchSubmit}>
                {/* Search input field */}
                <div className="relative mb-3">
                  <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75708F] pointer-events-none"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="What do you need done? (e.g. Logo design)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveDropdown('search');
                    }}
                    onFocus={() => setActiveDropdown('search')}
                    className="w-full border-[1.5px] border-[#ECEAF9] rounded-[16px] py-4 pr-4 pl-11 text-[14.5px] sm:text-[15.5px] text-[#1C1733] outline-none transition-all duration-200 bg-[#F7F6FF] placeholder-[#A6A1C4] focus:border-[#6C5CE8] focus:bg-white focus:ring-4 focus:ring-[#6C5CE8]/15"
                  />

                  {/* Skills Autosuggest Dropdown */}
                  {activeDropdown === 'search' && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white border-[1.5px] border-[#ECEAF9] rounded-[14px] shadow-[0_18px_36px_-14px_rgba(20,15,80,0.3)] max-h-[230px] overflow-y-auto z-50">
                      {filteredSkills.length > 0 ? (
                        filteredSkills.map((item) => (
                          <div
                            key={item}
                            onMouseDown={() => {
                              setSearchQuery(item);
                              setActiveDropdown(null);
                            }}
                            className="px-4 py-3 text-[13.5px] text-[#1C1733] border-b border-[#ECEAF9] last:border-b-0 hover:bg-[#F7F6FF] active:bg-[#F7F6FF] cursor-pointer transition-colors"
                          >
                            {highlightMatch(item, searchQuery)}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-[12px] text-[#75708F]">
                          No exact match — press Find to search anyway
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[12px] text-[#75708F] -mt-1 mb-3.5 ml-1">
                  e.g. Logo design, React developer, Video editing, Content writer
                </p>

                {/* Pill row: Budget + Location */}
                <div className="flex gap-2 mb-3.5">
                  {/* Budget Pill */}
                  <div className="flex-1 relative">
                    <div
                      onClick={() => setActiveDropdown(activeDropdown === 'budget' ? null : 'budget')}
                      className="flex items-center gap-1.5 bg-[#F7F6FF] border-[1.5px] border-[#ECEAF9] rounded-[13px] py-2.5 px-3 cursor-pointer hover:border-[#D8D2FA] transition-all"
                    >
                      <span className="text-[14px] shrink-0">💰</span>
                      <input
                        type="text"
                        value={budget}
                        onChange={(e) => {
                          setBudget(e.target.value);
                          setActiveDropdown('budget');
                        }}
                        onFocus={() => setActiveDropdown('budget')}
                        placeholder="Any budget"
                        className="w-full bg-transparent border-none outline-none text-[12.5px] sm:text-[13px] font-bold text-[#1C1733] cursor-pointer truncate placeholder-[#A6A1C4]"
                      />
                      <svg className="text-[#75708F] shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {activeDropdown === 'budget' && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border-[1.5px] border-[#ECEAF9] rounded-[14px] shadow-[0_18px_36px_-14px_rgba(20,15,80,0.3)] max-h-[220px] overflow-y-auto z-50">
                        {filteredBudgets.map((b) => (
                          <div
                            key={b}
                            onMouseDown={() => {
                              setBudget(b);
                              setActiveDropdown(null);
                            }}
                            className="px-3.5 py-2.5 text-[13px] text-[#1C1733] border-b border-[#ECEAF9] last:border-b-0 hover:bg-[#F7F6FF] cursor-pointer"
                          >
                            {b}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Location Pill */}
                  <div className="flex-1 relative">
                    <div
                      onClick={() => setActiveDropdown(activeDropdown === 'location' ? null : 'location')}
                      className="flex items-center gap-1.5 bg-[#F7F6FF] border-[1.5px] border-[#ECEAF9] rounded-[13px] py-2.5 px-3 cursor-pointer hover:border-[#D8D2FA] transition-all"
                    >
                      <span className="text-[14px] shrink-0">📍</span>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          setActiveDropdown('location');
                        }}
                        onFocus={() => setActiveDropdown('location')}
                        placeholder="Remote"
                        className="w-full bg-transparent border-none outline-none text-[12.5px] sm:text-[13px] font-bold text-[#1C1733] cursor-pointer truncate placeholder-[#A6A1C4]"
                      />
                      <svg className="text-[#75708F] shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {activeDropdown === 'location' && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border-[1.5px] border-[#ECEAF9] rounded-[14px] shadow-[0_18px_36px_-14px_rgba(20,15,80,0.3)] max-h-[220px] overflow-y-auto z-50">
                        {filteredCities.map((c) => (
                          <div
                            key={c}
                            onMouseDown={() => {
                              setLocation(c);
                              setActiveDropdown(null);
                            }}
                            className="px-3.5 py-2.5 text-[13px] text-[#1C1733] border-b border-[#ECEAF9] last:border-b-0 hover:bg-[#F7F6FF] cursor-pointer"
                          >
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Search Button */}
                <button
                  type="submit"
                  className="w-full bg-[#4A3AE0] hover:bg-[#3D2DC9] active:scale-[0.99] text-white py-3.5 sm:py-4 px-4 rounded-[14px] font-bold text-[15.5px] sm:text-[16px] shadow-[0_14px_26px_-12px_rgba(74,58,224,0.55)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Find Freelancers</span>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-2.5 my-4">
                <div className="flex-1 h-[1px] bg-[#ECEAF9]" />
                <span className="text-[11.5px] text-[#75708F] font-semibold tracking-wide lowercase">
                  are you a freelancer?
                </span>
                <div className="flex-1 h-[1px] bg-[#ECEAF9]" />
              </div>

              {/* Get Listed Button */}
              <button
                type="button"
                onClick={handleRegisterFreelancer}
                className="w-full flex items-center justify-center gap-2 bg-[#F7F6FF] hover:bg-[#ECEAF9]/70 border-[1.5px] border-dashed border-[#6C5CE8] text-[#4A3AE0] py-3.5 px-4 rounded-[14px] font-bold text-[14px] sm:text-[14.5px] transition-all cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Get Listed as a Freelancer</span>
              </button>

              <p className="text-center text-[11.5px] text-[#75708F] mt-2 leading-[1.5]">
                Free forever, <b className="text-[#1C1733] font-semibold">2 minutes</b> to set up. Pay only if you want a verified badge or to boost your profile.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Stats Row */}
        <div className="lg:hidden flex justify-between items-center mt-6 pt-2 border-t border-white/10 px-1">
          <div className="text-left">
            <div className="font-space text-[18px] sm:text-[21px] font-bold">{stats.totalFreelancersListed}</div>
            <div className="text-[10.5px] text-white/65 mt-0.5">Freelancers listed</div>
          </div>
          <div className="text-center">
            <div className="font-space text-[18px] sm:text-[21px] font-bold">{stats.totalRequirementsPosted}</div>
            <div className="text-[10.5px] text-white/65 mt-0.5">Requirements posted</div>
          </div>
          <div className="text-right">
            <div className="font-space text-[18px] sm:text-[21px] font-bold">{stats.avgResponseTime}</div>
            <div className="text-[10.5px] text-white/65 mt-0.5">Avg. response time</div>
          </div>
        </div>
      </div>
    </section>
  );
}
