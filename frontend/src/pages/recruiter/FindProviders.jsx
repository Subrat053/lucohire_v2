import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiSearch, HiLocationMarker, HiStar, HiBadgeCheck,
  HiLockOpen, HiPhone, HiChevronRight, HiChevronLeft,
  HiUsers, HiSparkles, HiRefresh, HiX,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { recruiterAPI, searchAPI, subscriptionAPI, categoriesAPI } from '../../services/api';
import { toOptimizedMediaUrl } from '../../utils/media';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LocationSearch from '../../components/LocationSearch';
import InstantHirePanel from '../../components/recruiter/InstantHirePanel';
import CompareProvidersModal from '../../components/recruiter/CompareProvidersModal';
import SubscriptionPlansPopup from '../../components/common/SubscriptionPlansPopup';

const TIER_COLORS = {
  unskilled: 'bg-emerald-100 text-emerald-700',
  'semi-skilled': 'bg-amber-100 text-amber-700',
  skilled: 'bg-indigo-100 text-indigo-700',
};

const POPULAR_SKILLS = [
  'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Driver',
  'Cook', 'Maid', 'AC Technician', 'Welder', 'Mason',
  'Gardener', 'Security Guard', 'Delivery Boy', 'Tailor', 'Mechanic',
];

/* ── Provider Card ───────────────────────────────────────────────────── */
const ProviderCardBase = ({ provider, onView, onUnlock, unlocking }) => {
  const {
    t
  } = useTranslation();

  const navigate = useNavigate();
  const name = provider.user?.name || provider.name || 'Provider';

  // Limit skills to 2 or 3
  const skills = Array.isArray(provider.skills) ? provider.skills : [];
  const maxSkillsToShow = 2;
  const visibleSkills = skills.slice(0, maxSkillsToShow);
  const remainingSkills = skills.length - maxSkillsToShow;

  return (
    <div
      onClick={() => onView(provider)}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer flex flex-col h-full gap-3 justify-between"
    >
      <div>
        <div className="flex items-start gap-3 mb-1">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
            {(provider.photo || provider.profilePhoto) ? (
              <img
                src={toOptimizedMediaUrl(provider.photo || provider.profilePhoto, { width: 112, height: 112, crop: 'fill', dpr: 'auto' })}
                alt={name}
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold text-xl">
                {name[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-bold text-gray-900 text-sm truncate" title={name}>{name}</h3>
              {provider.isVerified && <HiBadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
              {provider.subscriptionBadge && (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200 font-medium truncate" title={provider.subscriptionBadge}>
                  {provider.subscriptionBadge}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <HiStar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-medium text-gray-700">{provider.rating || provider.averageRating || '0.0'}</span>
              <span className="text-xs text-gray-400">({provider.totalReviews || 0})</span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-0.5 truncate" title={provider.city || 'Location N/A'}>
              <HiLocationMarker className="w-3 h-3 shrink-0" /> <span className="truncate">{provider.city || 'Location N/A'}</span>
            </p>
          </div>

          {/* Tier badge */}
          {provider.tier && (
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TIER_COLORS[provider.tier] || 'bg-gray-100 text-gray-700'}`}>
              {provider.tier.replace('-', ' ')}
            </span>
          )}
        </div>
      </div>
      {/* Skills (fixed height) */}
      <div className="flex flex-wrap items-center gap-1.5 h-7 overflow-hidden">
        {visibleSkills.map((s, i) => (
          <span key={i} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-700 rounded-full border border-gray-100 truncate max-w-[100px]" title={s}>
            {s}
          </span>
        ))}
        {remainingSkills > 0 && (
          <span className="text-xs text-gray-400 font-medium shrink-0">
            +{remainingSkills}{t("more")}</span>
        )}
      </div>
      {/* Pricing / rate per hour (fixed vertical position) */}
      <div className="flex items-baseline justify-between pt-1 border-t border-gray-50 mt-auto">
        <div>
          {provider.pricing ? (
            <p className="text-sm font-bold text-stone-800">
              ₹{provider.pricing}{provider.pricingType ? ` / ${provider.pricingType}` : ''}
            </p>
          ) : (
            <p className="text-xs text-gray-400">{t("Rate N/A")}</p>
          )}
        </div>
      </div>
      {/* Contact & Actions (always at bottom) */}
      <div className="flex gap-2 pt-1 mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const whatsappEnabled = provider.whatsappAlerts !== false;
            const waNum = provider.whatsapp || provider.whatsappNumber || provider.phone || provider.user?.whatsappNumber || provider.user?.phone;
            if (provider.isUnlocked && whatsappEnabled && waNum) {
              const cleanNum = String(waNum).replace(/\D/g, '');
              window.open(`https://wa.me/${cleanNum}`, '_blank');
            } else {
              onUnlock(provider);
            }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 border border-gray-100 text-[#ffffff] text-xs font-semibold py-2 rounded-xl bg-[#04433B] hover:bg-[#075E54] transition h-9 group"
        >
          <FaWhatsapp className="w-3.5 h-3.5" /> 
          {provider.isUnlocked ? 'WhatsApp' : (
            <span className="flex items-center gap-1 opacity-90 blur-[0.5px]">
               {provider.phone || 'WhatsApp'} <div className="text-[8px]">🔒</div>
            </span>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const phone = provider.phone || provider.user?.phone;
            if (provider.isUnlocked && phone) {
              window.location.href = `tel:${phone}`;
            } else {
              onUnlock(provider);
            }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#0096FF] hover:bg-[#0E5FCC] text-white text-xs font-bold py-2 rounded-xl transition h-9 group"
        >
          <HiPhone className="w-3.5 h-3.5" /> 
          {provider.isUnlocked ? 'Call Now' : (
            <span className="flex items-center gap-1 opacity-90 blur-[0.5px]">
              {provider.phone || 'Call Now'} <div className="text-[8px]">🔒</div>
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

const ProviderCard = memo(ProviderCardBase);

/* ── Main Page ───────────────────────────────────────────────────────── */
const FindProviders = () => {
  const {
    t
  } = useTranslation();

  const navigate = useNavigate();
  const [skill, setSkill] = useState('');
  const [skillQuery, setSkillQuery] = useState('');
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [city, setCity] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [unlocking, setUnlocking] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCoords, setSelectedCoords] = useState({ lat: null, lon: null });
  const [compareOpen, setCompareOpen] = useState(false);
  const [topMatches, setTopMatches] = useState([]);
  const [showMatchesDropdown, setShowMatchesDropdown] = useState(false);
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {}, planDetails: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  const searchRef = useRef(null);
  const skillDropdownRef = useRef(null);

  // Flat skill list with tier info from categories
  const allSkills = categories
    .filter(cat => cat.isActive !== false)
    .flatMap(cat =>
      (cat.skills || [])
        .filter(s => s.isActive !== false)
        .map(s => ({ name: s.name, tier: cat.tier, category: cat.name }))
    );

  const filteredSkills = allSkills.filter(s =>
    s.name.toLowerCase().includes(skillQuery.toLowerCase())
  );

  const handleSkillSelect = (skillName, skillTier) => {
    setSkill(skillName);
    setSkillQuery(skillName);
    setSkillDropdownOpen(false);
    if (skillTier) setTierFilter(skillTier);
  };

  const handleSkillInputChange = (e) => {
    const val = e.target.value;
    setSkillQuery(val);
    setSkill(val);
    setSkillDropdownOpen(true);
    // Clear auto-tier if user types manually
  };

  const handleSkillClear = () => {
    setSkill('');
    setSkillQuery('');
    setSkillDropdownOpen(false);
  };

  // Close skill dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (skillDropdownRef.current && !skillDropdownRef.current.contains(e.target)) {
        setSkillDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    subscriptionAPI.getMySubscription()
      .then(r => setSubscription(r.data))
      .catch(() => {});

    recruiterAPI.getAiUsage()
      .then(res => {
        if (res.data?.success) {
          setAiUsage(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setUsageLoading(false));

    // Fetch skill categories for autocomplete
    categoriesAPI.getCategories()
      .then(res => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to fetch skill categories', err));

    // Fetch generic top providers for the search dropdown
    searchAPI.providers({ limit: 10, sortBy: 'rating' }).then(res => {
      if (res.data?.providers) {
        setTopMatches(res.data.providers);
      }
    }).catch(err => console.error('Failed to fetch top providers', err));
  }, []);

  const doSearch = useCallback(async (page = 1) => {
    if (!skill.trim() && !city.trim()) {
      toast('Enter a skill or city to search', { icon: 'ℹ️' });
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const params = {
        skill: skill.trim() || undefined,
        city: city.trim() || undefined,
        ...(selectedCoords.lat !== null && selectedCoords.lon !== null ? {
          lat: selectedCoords.lat,
          lng: selectedCoords.lon,
        } : {}),
        tier: tierFilter || undefined,
        rating: ratingFilter || undefined,
        sortBy: 'match',
        availability: true,
        page,
        limit: 12,
      };

      const { data } = await searchAPI.providers(params);
      const list = data.providers || [];
      setProviders(list);
      setPagination(data.pagination || { page, pages: 1, total: list.length });
      setCurrentPage(page);
    } catch (primaryErr) {
      // Backward-compatible fallback to legacy recruiter search.
      try {
        const { data } = await recruiterAPI.search({
          skill: skill.trim(),
          city: city.trim(),
          ...(selectedCoords.lat !== null && selectedCoords.lon !== null ? {
            lat: selectedCoords.lat,
            lon: selectedCoords.lon,
          } : {}),
          tier: tierFilter,
          rating: ratingFilter,
          page,
          limit: 12,
        });
        const list = data.providers || data.results || (Array.isArray(data) ? data : []);
        setProviders(list);
        setPagination(data.pagination || { page, pages: 1, total: list.length });
        setCurrentPage(page);
      } catch (err) {
        toast.error(err.response?.data?.message || primaryErr.response?.data?.message || 'Search failed');
      }
    } finally {
      setLoading(false);
    }
  }, [skill, city, tierFilter, ratingFilter, selectedCoords]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    doSearch(1);
  }, [doSearch]);

  const handleSkillPill = useCallback((s) => {
    setSkill(s);
    setTimeout(() => searchRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })), 50);
  }, []);

  const handleLocationSelect = useCallback((item) => {
    if (!item) return;
    setCity(item.name || '');
    setSelectedCoords({
      lat: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
      lon: Number.isFinite(Number(item.lon)) ? Number(item.lon) : null,
    });
  }, []);

  const handleView = useCallback((provider) => {
    const id = provider._id || provider.user?._id;
    navigate(`/recruiter/provider/${id}`);
  }, [navigate]);

  const handleUnlock = useCallback(async (provider) => {
    const providerId = provider._id || provider.user?._id;
    setUnlocking(providerId);
    try {
      const { data } = await recruiterAPI.unlockContact(providerId);
      toast.success(data.message || 'Contact unlocked!');
      setProviders(prev =>
        prev.map(p => {
          const pid = p.user?._id || p._id;
          if (pid === providerId) {
            return { ...p, isUnlocked: true, phone: data.phone, whatsapp: data.whatsapp, whatsappAlerts: data.whatsappAlerts !== false };
          }
          return p;
        })
      );
      if (subscription) {
        setSubscription(prev => ({
          ...prev,
          remainingUnlocks: Math.max(0, (prev.remainingUnlocks || 0) - 1),
        }));
      }
    } catch (err) {
      if (err.response?.data?.upgradeRequired) {
        toast.error(err.response.data.message || 'Limit reached');
        setShowPlans(true);
      } else {
        const msg = err.response?.data?.message || 'Failed to unlock';
        toast.error(msg);
      }
    } finally {
      setUnlocking(null);
      // refresh usage limits after unlock attempt
      recruiterAPI.getAiUsage().then(res => {
        if (res.data?.success) setAiUsage(res.data);
      });
    }
  }, [subscription]);

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => setShowMatchesDropdown(false)}>
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-700 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-extrabold text-white mb-1">{t("Find Providers")}</h1>
          <p className="text-blue-100 text-sm">{t("Search skilled professionals for your requirements")}</p>
          
          {!usageLoading && (
            <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-blue-100 text-xs mb-0.5">{t('common.currentPlan', 'Current Plan')}</span>
                  <span className="text-white font-bold bg-white/20 px-2 py-0.5 rounded text-xs uppercase tracking-wide border border-white/30 self-start">
                    {aiUsage.planDetails?.name || aiUsage.planDetails?.slug || 'Free'}
                  </span>
                </div>
                <div className="h-8 w-px bg-white/20 hidden md:block"></div>
                <div className="flex flex-col">
                  <span className="text-blue-100 text-xs flex items-center gap-1"><HiLockOpen className="w-3 h-3 text-blue-200"/> {t('recruiter.profileUnlocks', 'Profile Unlocks')}</span>
                  <span className="text-white font-bold text-sm">
                    {aiUsage.limits?.unlockCredits === -1 ? 'Unlimited' : 
                      `${Math.max(0, aiUsage.planDetails?.unlocksRemaining || 0)} / ${aiUsage.limits?.unlockCredits || 0} ${t('common.credits', 'Credits')}`}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => navigate('/recruiter/plans')} className="text-xs font-bold text-indigo-700 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                {t('common.upgrade', 'Upgrade Plan')}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-2 lg:px-4 py-2 lg:py-6">
        {/* Search Form */}
        <form ref={searchRef} onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-100 p-4 mb-4" onClick={e => e.stopPropagation()}>
          <div className="flex flex-wrap gap-3 items-end">

            {/* Skill Autocomplete */}
            <div ref={skillDropdownRef} className="flex-1 min-w-40 relative">
              <label className="block text-xs text-gray-500 font-medium mb-1">{t("Skill / Profession")}</label>
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("e.g. Plumber, Electrician…")}
                  value={skillQuery}
                  onChange={handleSkillInputChange}
                  onFocus={() => setSkillDropdownOpen(true)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {skillQuery && (
                  <button
                    type="button"
                    onClick={handleSkillClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <HiX className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Skill Suggestions Dropdown */}
              {skillDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[280px] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-[300px] overflow-y-auto">
                  {filteredSkills.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-400 italic">
                      {skillQuery.trim() ? `No matches for "${skillQuery}"` : 'Start typing to search skills…'}
                    </div>
                  ) : (
                    Object.entries(
                      filteredSkills.reduce((acc, s) => {
                        if (!acc[s.category]) acc[s.category] = [];
                        acc[s.category].push(s);
                        return acc;
                      }, {})
                    ).map(([catName, group]) => (
                      <div key={catName}>
                        <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50 sticky top-0">
                          {catName}
                        </div>
                        {group.map(s => (
                          <button
                            key={s.name}
                            type="button"
                            onMouseDown={() => handleSkillSelect(s.name, s.tier)}
                            className="w-full text-left px-4 py-2 text-xs text-gray-700 font-medium hover:bg-blue-50 hover:text-blue-700 transition flex items-center justify-between gap-2"
                          >
                            <span>{s.name}</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase px-1.5 py-0.5 rounded-full bg-gray-100 shrink-0">{s.tier}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-gray-500 font-medium mb-1">{t("City / Location")}</label>
              <LocationSearch
                value={city}
                onChange={(value) => {
                  setCity(value);
                  if (!String(value || '').trim()) {
                    setSelectedCoords({ lat: null, lon: null });
                  }
                }}
                onSelect={handleLocationSelect}
                placeholder={t("e.g. Mumbai, Delhi…")}
              />
            </div>
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">{t("Tier")}</label>
                <select
                  value={tierFilter}
                  onChange={e => setTierFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 h-9.5"
                >
                  <option value="">{t("All Tiers")}</option>
                  <option value="unskilled">{t("Unskilled")}</option>
                  <option value="semi-skilled">{t("Semi-Skilled")}</option>
                  <option value="skilled">{t("Skilled")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">{t("Min Rating")}</label>
                <select
                  value={ratingFilter}
                  onChange={e => setRatingFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 h-9.5"
                >
                  <option value="">{t("Any")}</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </div>
              <button
                type="submit"
                className="h-9.5 px-5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition flex items-center gap-1.5"
              >
                <HiSearch className="w-4 h-4" />{t("Search")}</button>
            </div>
          </div>
        </form>

        <div className="mb-4">
          <InstantHirePanel
            onResults={(topProviders) => {
              setProviders(topProviders || []);
              setHasSearched(true);
              setPagination({ page: 1, pages: 1, total: (topProviders || []).length });
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Popular Skill Pills */}
        {!hasSearched && (
          <div className="mb-6">
            <p className="text-xs text-gray-500 font-medium mb-2">{t("Popular skills")}</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SKILLS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSkillPill(s)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:text-blue-700 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : hasSearched && providers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <HiUsers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700">{t("No providers found")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("Try different skill or location keywords")}</p>
          </div>
        ) : providers.length > 0 ? (
          <>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-700 font-semibold">
                  {pagination.total ?? providers.length}{t("provider")}{providers.length !== 1 ? 's' : ''}{t("found")}</p>
              </div>
              <div className="flex items-center gap-3">
                {providers.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    className="text-xs text-indigo-600 font-semibold hover:underline"
                  >{t("Compare Top Providers")}</button>
                )}
                <button
                  onClick={() => doSearch(1)}
                  className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline"
                >
                  <HiRefresh className="w-3.5 h-3.5" />{t("Refresh")}</button>
              </div>
            </div>
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 items-stretch">
              {providers.map(p => (
                <ProviderCard
                  key={p._id}
                  provider={p}
                  onView={handleView}
                  onUnlock={handleUnlock}
                  unlocking={unlocking}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => doSearch(currentPage - 1)}
                  className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  <HiChevronLeft className="w-4 h-4 text-gray-700" />
                </button>
                <span className="text-sm text-gray-700 font-medium">{t("Page")}{currentPage}{t("of")}{pagination.pages}
                </span>
                <button
                  disabled={currentPage >= pagination.pages}
                  onClick={() => doSearch(currentPage + 1)}
                  className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  <HiChevronRight className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            )}
          </>
        ) : null}

        {/* Empty initial state */}
        {!hasSearched && !loading && (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <HiSearch className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-gray-700">{t("Search for providers")}</p>
            <p className="text-sm mt-1">{t("Enter a skill or location above to get started")}</p>
          </div>
        )}
      </div>
      <CompareProvidersModal
        open={compareOpen}
        providers={providers.slice(0, 5)}
        onClose={() => setCompareOpen(false)}
      />
    </div>
  );
};

export default FindProviders;
