import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, ChevronLeft, ChevronRight, BadgeCheck, MoreVertical, Clock, Briefcase, Calendar, Zap, Wallet, CheckCircle2, MessageCircle, Phone, Eye, ArrowRight, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useTranslation from '../../hooks/useTranslation';
import { POPULAR_SKILLS, ALL_SKILLS } from '../../data/skillsData';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

const FilterDropdown = ({ label, icon: Icon, value, setValue, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (searchTerm && !options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase())) {
          setValue(searchTerm);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm, options, setValue]);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center text-xs bg-white border rounded-lg px-3 py-2 cursor-pointer transition whitespace-nowrap ${isOpen ? 'border-blue-500 shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
      >
        {Icon && <Icon className="w-3 h-3 mr-1 text-gray-400" />}
        <span className={value ? "text-gray-900 font-medium" : ""}>
          {value || label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 left-0 w-48 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500"
              placeholder={placeholder || `Type...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setValue(searchTerm);
                  setIsOpen(false);
                }
              }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <li 
                  key={i}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                  onClick={() => {
                    setValue(opt);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                >
                  {opt}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">Press Enter to use "{searchTerm}"</li>
            )}
            {value && (
              <li 
                className="px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 cursor-pointer border-t border-gray-50 mt-1"
                onClick={() => {
                  setValue('');
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                Clear selection
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default function TopTalentCarousel({ displayTalent, talentSearch, setTalentSearch, handleTalentSearch, setSelectedCandidate }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const carouselRef = useRef(null);

  const handleContactClick = async (e, candidate, type) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error(t("Please login to contact candidate"));
      navigate('/login');
      return;
    }

    try {
      const res = await api.post(`/provider/public/${candidate._id || candidate.id}/contact-click`, { actionType: type });
      if (res.data.success && res.data.url) {
        if (type === 'whatsapp') {
          window.open(res.data.url, '_blank');
        } else {
          window.location.href = res.data.url;
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t("Action failed"));
    }
  };

  const [skillFilter, setSkillFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [rateFilter, setRateFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);
  
  const [adminRoles, setAdminRoles] = useState([]);

  useEffect(() => {
    api.get('/job-roles')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setAdminRoles(res.data.map(r => r.roleName));
        }
      })
      .catch(err => console.error("Failed to fetch admin roles", err));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (talentSearch) params.append('query', talentSearch);
    if (skillFilter) params.append('skill', skillFilter);
    if (experienceFilter) params.append('experience', experienceFilter);
    if (rateFilter) params.append('rate', rateFilter);
    if (availabilityFilter) params.append('availability', availabilityFilter);
    if (locationFilter) params.append('location', locationFilter);
    navigate(`/search?${params.toString()}`);
  };

  const allAvailableSkills = [...adminRoles, ...ALL_SKILLS];
  const popularAvailableSkills = [...new Set([...adminRoles, ...POPULAR_SKILLS])];
  const matchingSkills = Array.from(new Set(talentSearch ? allAvailableSkills.filter(s => s.toLowerCase().includes(talentSearch.toLowerCase())) : popularAvailableSkills)).slice(0, 30);

  return (
    <div className="bg-white py-12 sm:py-16 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">
          {t("Top Talent Available for")} <span className="text-blue-600">{t("Hourly Work")}</span>
        </h2>
      
        {/* Filters Bar */}
        <form onSubmit={onSearchSubmit} className="bg-white p-2.5 sm:p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 mb-8 sm:mb-10">
          <div className="flex-1 min-w-[180px] relative" ref={searchContainerRef}>
            <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder={t("Search talent by skills or name")} 
                className="bg-transparent border-none focus:ring-0 text-lg sm:text-sm w-full outline-none truncate"
                value={talentSearch}
                onChange={(e) => {
                  setTalentSearch(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                onFocus={() => setSearchDropdownOpen(true)}
              />
            </div>
            
            {/* Smart Dropdown */}
            {searchDropdownOpen && matchingSkills.length > 0 && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-full sm:w-[480px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-3 flex justify-between items-center backdrop-blur-sm">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {talentSearch ? t("Matching Skills & Roles") : t("Trending Skills & Roles")}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full border border-gray-200">Select to search</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto py-1.5">
                  {matchingSkills.map((skill, idx) => (
                    <div 
                      key={idx}
                      className="px-4 py-2.5 hover:bg-blue-50/50 cursor-pointer text-sm text-gray-700 border-b border-gray-50/60 last:border-none flex items-center gap-2.5 transition-colors duration-150"
                      onClick={() => {
                        setTalentSearch(skill);
                        setSearchDropdownOpen(false);
                      }}
                    >
                      <Search className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-medium text-gray-700 truncate">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="hidden lg:flex flex-wrap items-center gap-2">
            <FilterDropdown 
              label={t('Skills')} 
              value={skillFilter} 
              setValue={setSkillFilter} 
              options={POPULAR_SKILLS} 
            />
            <FilterDropdown 
              label={t('Experience')} 
              value={experienceFilter} 
              setValue={setExperienceFilter} 
              options={['Fresher', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years']} 
            />
            <FilterDropdown 
              label={t('Hourly Rate')} 
              value={rateFilter} 
              setValue={setRateFilter} 
              options={['Under ₹500/hr', '₹500 - ₹1000/hr', '₹1000 - ₹2000/hr', '₹2000+/hr']} 
            />
            <FilterDropdown 
              label={t('Availability')} 
              value={availabilityFilter} 
              setValue={setAvailabilityFilter} 
              options={['Full-time', 'Part-time', 'Contract', 'Freelance']} 
            />
            <FilterDropdown 
              label={t('All Locations')} 
              icon={MapPin}
              value={locationFilter} 
              setValue={setLocationFilter} 
              options={['Remote', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune']} 
            />
          </div>
          
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg sm:ml-auto transition whitespace-nowrap">
            {t("Search Talent")}
          </button>
        </form>


        {/* Candidate Cards Carousel */}
        <div className="relative">
          {/* Left Arrow */}
          <div 
            role="button"
            aria-label="Previous"
            onClick={() => scrollCarousel('left')}
            className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition shrink-0 overflow-hidden cursor-pointer"
            style={{ borderRadius: '50%', width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </div>

          <div ref={carouselRef} className="flex space-x-4 overflow-x-auto pb-4 hide-scrollbar scroll-smooth px-1">
            {displayTalent.map(candidate => (
              <div key={candidate._id} className="w-full sm:w-[420px] sm:max-w-[420px] bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex-shrink-0 flex flex-col relative overflow-hidden">
                
                {/* Top Section */}
                <div className="flex gap-4 mb-4 sm:mb-5">
                  <div className="relative shrink-0 sm:pb-0 pb-6">
                    {candidate.profilePhoto ? (
                      <img 
                        src={candidate.profilePhoto} 
                        alt={candidate.profileName} 
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-1 ring-gray-100" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.profileName || 'U')}&background=e0e7ff&color=4f46e5`;
                        }}
                      />
                    ) : (
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl font-bold ring-1 ring-gray-100 ${candidate.avatarBg || 'bg-blue-100 text-blue-700'}`}>
                        {candidate.profileName?.substring(0, 2).toUpperCase() || 'UN'}
                      </div>
                    )}
                    {/* Mobile: Absolute position below Avatar */}
                    <div className="flex sm:hidden absolute -bottom-3 left-1/2 -translate-x-1/2 items-center gap-1 bg-green-50 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-green-200 uppercase tracking-wider text-center whitespace-nowrap z-10 shadow-sm">
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                      {t("Available")}
                    </div>
                  </div>
                  
                  {/* Right: Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate">{candidate.profileName}</h3>
                        <BadgeCheck className="w-4 h-4 text-blue-600 fill-blue-600/10" strokeWidth={2.5} />
                      </div>
                      {/* Desktop: Right-aligned Available Badge */}
                      <div className="hidden sm:flex items-center gap-1 bg-green-50 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-green-200 uppercase tracking-wider shrink-0 mt-1">
                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                        {t("Available")}
                      </div>
                    </div>
                    
                    <p className="text-[12px] font-bold text-indigo-700 mb-1 sm:mb-1.5 truncate">
                      {(candidate.roles && candidate.roles.length > 0) ? candidate.roles.join(', ') : (candidate.primaryRole || t('Freelancer'))}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-[11px] text-gray-700 font-medium">
                      <div className="flex items-center gap-1.5 leading-none">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{candidate.city || t('India')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1 sm:mt-0 leading-none">
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{t("Last active:")} <span className="text-gray-900 font-bold">{t("Today")}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-gray-900 truncate">{candidate.experienceYears || 0}+ {t("Yrs")}</div>
                      <div className="text-[10px] text-gray-500 font-medium truncate">{t("Experience")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50/50 p-2 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-gray-900 truncate">25{t("h/wk")}</div>
                      <div className="text-[10px] text-gray-500 font-medium truncate">{t("Availability")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50/50 p-2 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-green-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-gray-900 truncate">{t("Ready")}</div>
                      <div className="text-[10px] text-gray-500 font-medium truncate">{t("To Start")}</div>
                    </div>
                  </div>
                </div>

                {/* Top Skills */}
                <div className="mb-5">
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills?.slice(0, 4).map((tag, idx) => (
                      <span key={idx} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        {tag}
                      </span>
                    ))}
                    {(candidate.skills?.length || 0) > 4 && (
                      <span className="bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        +{candidate.skills.length - 4} {t("More")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rate & Verifications */}
                <div className="flex items-center gap-3 mb-4 border-t border-gray-100 pt-3">
                  <div className="flex-1 bg-[#f0fdf4] rounded-xl p-2.5 flex flex-col justify-center border border-green-100">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Wallet className="w-3.5 h-3.5 text-green-700" />
                      <span className="text-[10px] text-green-800 font-bold uppercase tracking-wider">{t("Hourly Rate")}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-gray-900">₹{candidate.hourlyRate || '1200'}</span>
                      <span className="text-[11px] font-bold text-gray-500">{t("/hr")}</span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
                      <span className="text-[11px] text-gray-700 font-medium">{t("Resume Verified")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
                      <span className="text-[11px] text-gray-700 font-medium">{t("Mobile Verified")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
                      <span className="text-[11px] text-gray-700 font-medium">{t("Email Verified")}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto flex flex-col gap-2.5">
                  <div className="flex gap-2.5">
                    <button 
                      onClick={(e) => handleContactClick(e, candidate, 'whatsapp')}
                      className="flex-[1.5] py-2.5 rounded-xl bg-[#075E54] text-white font-bold hover:bg-[#04433B] transition-colors text-[13px] flex items-center justify-center gap-2 shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" fill="currentColor" strokeWidth={0} /> {t("Chat on WhatsApp")}
                    </button>
                    <button 
                      onClick={(e) => handleContactClick(e, candidate, 'call')}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-[13px] flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Phone className="w-4 h-4" /> {t("Call")}
                    </button>
                  </div>
                  <button 
                    onClick={() => setSelectedCandidate(candidate)}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-[13px] flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" strokeWidth={2.5} /> {t("View Full Profile")}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel dots */}
          <div className="flex justify-center mt-4 mb-6 gap-1.5">
            {displayTalent.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            ))}
          </div>

          {/* View All Button */}
          {displayTalent.length > 0 && (
            <div className="flex justify-center">
              <Link 
                to="/search"
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-2.5 px-6 rounded-2xl shadow-sm text-sm transition-all flex items-center gap-2 block"
              >
                View All Talent <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Right Arrow */}
          <div 
            role="button"
            aria-label="Next"
            onClick={() => scrollCarousel('right')}
            className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition shrink-0 overflow-hidden cursor-pointer"
            style={{ borderRadius: '50%', width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
