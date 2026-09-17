import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  HiSearch,
  HiLocationMarker,
  HiStar,
  HiBadgeCheck,
  HiFilter,
  HiX,
  HiChevronRight,
} from "react-icons/hi";
import {
  POPULAR_SKILLS,
  filterDummyProviders,
  DUMMY_PROVIDERS,
} from "../data/skillsData";
import { normalizeProviderData } from "../utils/providerData";
import { getProviders as fetchProviderResults } from "../services/providerService";
import api, { categoriesAPI } from "../services/api";
import SharedProviderCard from "../components/providers/ProviderCard";
import useTranslation from "../hooks/useTranslation";
import Seo from "../components/common/Seo";
import { useAuth } from "../context/AuthContext";
import LocationAutocomplete from "../components/common/LocationAutocomplete";

const SearchPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();



  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }
  const initialQuery =
    searchParams.get("query") ||
    searchParams.get("skill") ||
    searchParams.get("category") ||
    "";
  const [queryText, setQueryText] = useState(initialQuery);
  const [skill, setSkill] = useState(
    searchParams.get("skill") || searchParams.get("category") || initialQuery,
  );
  const [city, setCity] = useState(
    searchParams.get("location") || searchParams.get("city") || ""
  );
  // Stores full location object (with lat/lng) from LocationAutocomplete selection
  const [locationFull, setLocationFull] = useState(null);
  const [tierFilter, setTierFilter] = useState(searchParams.get("tier") || "");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "",
  );
  const [results, setResults] = useState({
    rotation: [],
    featured: [],
    providers: [],
    pagination: {},
  });
  const [searchMeta, setSearchMeta] = useState({});
  const [interpretedIntent, setInterpretedIntent] = useState({
    skill: "",
    city: "",
    confidence: 0,
  });
  const [loading, setLoading] = useState(false);
  // true when a real query was made but API returned 0 results (don't show dummies)
  const [isRealEmpty, setIsRealEmpty] = useState(false);
  const [filters, setFilters] = useState({
    rating: searchParams.get("rating") || "",
    experience: searchParams.get("experience") || "",
    verified: searchParams.get("verified") || "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeSkillPill, setActiveSkillPill] = useState(
    searchParams.get("category") || searchParams.get("skill") || ""
  );
  const [showAllResults, setShowAllResults] = useState(false);
  const debounceRef = useRef(null);
  const rotationTimerRef = useRef(null);
  const latestRequestRef = useRef(0);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState([]);
  const [adminRoles, setAdminRoles] = useState([]);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const skillDropdownRef = useRef(null);

  const allSkills = useMemo(() => {
    const fromCategories = categories
      .filter((cat) => cat.isActive !== false)
      .flatMap((cat) =>
        (cat.skills || [])
          .filter((s) => s.isActive !== false)
          .map((s) => ({ name: s.name, tier: cat.tier, category: cat.name }))
      );
      
    const fromRoles = adminRoles
      .filter(r => r.isActive !== false)
      .map(r => ({ name: r.roleName, tier: 'pro', category: 'Roles' }));
      
    return [...fromCategories, ...fromRoles];
  }, [categories, adminRoles]);

  const filteredSkills = useMemo(() => {
    const q = (queryText || "").trim().toLowerCase();
    if (!q) return allSkills;
    return allSkills.filter((s) => s.name.toLowerCase().includes(q));
  }, [allSkills, queryText]);

  useEffect(() => {
    const handler = (e) => {
      if (skillDropdownRef.current && !skillDropdownRef.current.contains(e.target)) {
        setSkillDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSkillSelect = (skillName, skillTier) => {
    setQueryText(skillName);
    setSkill(skillName);
    setSkillDropdownOpen(false);

    if (debouncedUpdateSearchQueryRef.current) {
      clearTimeout(debouncedUpdateSearchQueryRef.current);
    }

    if (skillTier) {
      setTierFilter(skillTier);
    }

    updateSearchQuery({
      query: skillName,
      skill: skillName,
      city,
      tier: skillTier || tierFilter,
      category: "",
      rating: filters.rating,
      experience: filters.experience,
      verified: filters.verified,
    });
  };


  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      try {
        const { data } = await categoriesAPI.getCategories();
        if (isMounted && Array.isArray(data)) {
          setCategories(data);
        }
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    const fetchRoles = async () => {
      try {
        const { data } = await api.get('/job-roles');
        if (isMounted && Array.isArray(data)) {
          setAdminRoles(data);
        }
      } catch (err) {
        console.error("Failed to fetch admin roles", err);
      }
    };
    fetchCats();
    fetchRoles();
    return () => { isMounted = false; };
  }, []);

  const debouncedUpdateSearchQueryRef = useRef(null);

  const updateSearchQuery = useCallback(
    (nextState) => {
      const nextParams = new URLSearchParams();

      if (nextState.query) nextParams.set("query", nextState.query);
      if (nextState.skill) nextParams.set("skill", nextState.skill);
      if (nextState.category) nextParams.set("category", nextState.category);
      if (nextState.city) nextParams.set("location", nextState.city);
      if (nextState.tier) nextParams.set("tier", nextState.tier);
      if (nextState.rating) nextParams.set("rating", nextState.rating);
      if (nextState.experience) nextParams.set("experience", nextState.experience);
      if (nextState.verified) nextParams.set("verified", nextState.verified);

      setSearchParams(nextParams, { replace: true });
    },
    [setSearchParams],
  );

  const debouncedUpdateSearchQuery = useCallback(
    (nextState) => {
      if (debouncedUpdateSearchQueryRef.current) {
        clearTimeout(debouncedUpdateSearchQueryRef.current);
      }
      debouncedUpdateSearchQueryRef.current = setTimeout(() => {
        updateSearchQuery(nextState);
      }, 400);
    },
    [updateSearchQuery]
  );

  useEffect(() => {
    return () => {
      if (debouncedUpdateSearchQueryRef.current) {
        clearTimeout(debouncedUpdateSearchQueryRef.current);
      }
    };
  }, []);

  const fetchProviders = useCallback(
    async (
      queryVal,
      cityVal,
      filtersVal,
      tierVal,
      categoryVal = "",
      options = {},
      locationFullVal = null,
    ) => {
      const requestId = latestRequestRef.current + 1;
      latestRequestRef.current = requestId;
      if (!options.silent && !options.append) setLoading(true);
      if (options.append) setLoadingMore(true);
      const effectiveSearch = queryVal || categoryVal;
      const hasActiveQuery = !!(
        effectiveSearch ||
        categoryVal ||
        cityVal ||
        tierVal ||
        filtersVal?.rating ||
        filtersVal?.experience ||
        filtersVal?.verified
      );

      const normalizeList = (list = [], isDummy = false) =>
        list.map((provider, index) =>
          normalizeProviderData(provider, index, { isDummy }),
        );

      try {
        const searchParams = {
          query: queryVal,
          skill: categoryVal || queryVal,
          category: categoryVal,
          city: cityVal,
          location: cityVal,
          tier: tierVal,
          rating: filtersVal.rating,
          experience: filtersVal.experience,
          verified: filtersVal.verified,
          page: options.page || 1,
          limit: 16,
        };

        // Pass lat/lng from selected location for geospatial search
        if (locationFullVal?.latitude && locationFullVal?.longitude) {
          searchParams.lat = locationFullVal.latitude;
          searchParams.lng = locationFullVal.longitude;
        }

        const data = await fetchProviderResults(searchParams);
        const providers = Array.isArray(data?.providers) ? data.providers : [];
        const rotation = Array.isArray(data?.rotation) ? data.rotation : [];
        const featured = Array.isArray(data?.featured) ? data.featured : [];
        const hasAny =
          providers.length > 0 || rotation.length > 0 || featured.length > 0;

        if (latestRequestRef.current !== requestId) return;

        if (!hasAny) {
          // If there was a real query/filter active, show empty state — do NOT show dummies
          if (hasActiveQuery) {
            setIsRealEmpty(true);
            if (options.append) {
              setResults((prev) => ({
                ...prev,
                pagination: data?.pagination || {},
              }));
            } else {
              setResults({ rotation: [], featured: [], providers: [], pagination: {} });
            }
            setSearchMeta({
              locationMessage: cityVal
                ? t("search.nearbyResults", `Showing nearby results for ${cityVal}.`)
                : "",
              locationLevel: "empty",
            });
          } else {
            // No query at all — show empty state when there are no providers in the database
            setIsRealEmpty(true);
            if (!options.append) {
              setResults({
                rotation: [],
                featured: [],
                providers: [],
                pagination: {},
              });
            }
            setSearchMeta({});
          }
        } else {
          setIsRealEmpty(false);
          const interpretedSkill = String(data?.intent?.skill || "").trim();
          const interpretedCity = String(data?.intent?.city || "").trim();

          setInterpretedIntent({
            skill: interpretedSkill,
            city: interpretedCity,
            confidence: Number(data?.intent?.confidence || 0),
          });

          setSkill(categoryVal || interpretedSkill || queryVal || "");

          let finalCity = cityVal || interpretedCity || "";
          setCity(finalCity);

          if (options.append) {
            setResults((prev) => ({
              ...prev,
              providers: [...prev.providers, ...normalizeList(providers)],
              pagination: data?.pagination || {},
            }));
          } else {
            setResults({
              rotation: normalizeList(rotation),
              featured: normalizeList(featured),
              providers: normalizeList(providers),
              pagination: data?.pagination || {},
            });
          }
          setSearchMeta(data?.searchMeta || {});
        }
      } catch {
        if (latestRequestRef.current !== requestId) return;
        setInterpretedIntent({ skill: "", city: "", confidence: 0 });
        // On error, show empty state (not dummies)
        setIsRealEmpty(true);
        if (!options.append) {
          setResults({ rotation: [], featured: [], providers: [], pagination: {} });
        }
      } finally {
        if (latestRequestRef.current === requestId) {
          if (!options.silent) setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [t],
  );

  useEffect(() => {
    const query = searchParams.get("query") || "";
    const queryCategory = searchParams.get("category") || "";
    const querySkill = searchParams.get("skill") || "";
    const queryCity =
      searchParams.get("location") || searchParams.get("city") || "";
    const queryTier = searchParams.get("tier") || "";
    const queryRating = searchParams.get("rating") || "";
    const queryExperience = searchParams.get("experience") || "";
    const queryVerified = searchParams.get("verified") || "";
    const resolvedSearch = query || querySkill || queryCategory;

    setSelectedCategory(queryCategory);
    setQueryText(resolvedSearch);
    setSkill(querySkill || queryCategory || resolvedSearch);
    setCity(queryCity);
    setTierFilter(queryTier);
    setFilters({
      rating: queryRating,
      experience: queryExperience,
      verified: queryVerified,
    });
    setActiveSkillPill(queryCategory || querySkill || resolvedSearch);
    setPage(1);

    if (queryCity)
      localStorage.setItem("servicehub:lastSearchLocation", queryCity);

    fetchProviders(
      resolvedSearch,
      queryCity,
      {
        rating: queryRating,
        experience: queryExperience,
        verified: queryVerified,
      },
      queryTier,
      queryCategory,
      { page: 1, append: false },
      queryCity ? locationFull : null,
    );
  }, [searchParams, fetchProviders, locationFull]);

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Auto-refresh rotation providers every 60 seconds
  useEffect(() => {
    if (!results.rotation || results.rotation.length === 0) return undefined;

    rotationTimerRef.current = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      fetchProviders(
        queryText || skill,
        city,
        filters,
        tierFilter,
        selectedCategory,
        { silent: true },
        city ? locationFull : null,
      );
    }, 60000);

    return () => clearInterval(rotationTimerRef.current);
  }, [
    queryText,
    skill,
    city,
    filters,
    tierFilter,
    selectedCategory,
    fetchProviders,
    results.rotation,
    locationFull,
  ]);

  const handleSkillChange = (val) => {
    setQueryText(val);
    const nextCategory =
      selectedCategory &&
        val.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
        ? selectedCategory
        : "";

    setSelectedCategory(nextCategory);
    setSkill(val);
    debouncedUpdateSearchQuery({
      query: val,
      skill: val,
      city,
      tier: tierFilter,
      category: nextCategory,
      rating: filters.rating,
      experience: filters.experience,
      verified: filters.verified,
    });
  };

  const handleCityChange = (val, locFullObj = null) => {
    setCity(val);
    localStorage.setItem("servicehub:lastSearchLocation", val);

    if (locFullObj) {
      setLocationFull(locFullObj);
      if (debouncedUpdateSearchQueryRef.current) {
        clearTimeout(debouncedUpdateSearchQueryRef.current);
      }
      updateSearchQuery({
        query: queryText || skill,
        skill,
        city: val,
        tier: tierFilter,
        category: selectedCategory,
        rating: filters.rating,
        experience: filters.experience,
        verified: filters.verified,
      });
    } else {
      setLocationFull(null);
      debouncedUpdateSearchQuery({
        query: queryText || skill,
        skill,
        city: val,
        tier: tierFilter,
        category: selectedCategory,
        rating: filters.rating,
        experience: filters.experience,
        verified: filters.verified,
      });
    }
  };

  const handleFilterChange = (key, val) => {
    const f = { ...filters, [key]: val };
    setFilters(f);
    if (debouncedUpdateSearchQueryRef.current) {
      clearTimeout(debouncedUpdateSearchQueryRef.current);
    }
    updateSearchQuery({
      query: queryText || skill,
      skill,
      city,
      tier: tierFilter,
      category: selectedCategory,
      rating: f.rating,
      experience: f.experience,
      verified: f.verified,
    });
  };

  const handleTierChange = (val) => {
    setTierFilter(val);
    if (debouncedUpdateSearchQueryRef.current) {
      clearTimeout(debouncedUpdateSearchQueryRef.current);
    }
    updateSearchQuery({
      query: queryText || skill,
      skill,
      city,
      tier: val,
      category: selectedCategory,
      rating: filters.rating,
      experience: filters.experience,
      verified: filters.verified,
    });
  };

  const handlePillClick = (s) => {
    const v = activeSkillPill === s ? "" : s;
    setActiveSkillPill(v);
    setSelectedCategory(v);
    setQueryText(v);
    setSkill(v);
    if (debouncedUpdateSearchQueryRef.current) {
      clearTimeout(debouncedUpdateSearchQueryRef.current);
    }
    updateSearchQuery({
      query: v,
      skill: v,
      city,
      tier: tierFilter,
      category: v,
      rating: filters.rating,
      experience: filters.experience,
      verified: filters.verified,
    });
  };

  const handleLoadMore = () => {
    if (loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProviders(
      queryText || skill,
      city,
      filters,
      tierFilter,
      selectedCategory,
      { page: nextPage, append: true },
      city ? locationFull : null,
    );
  };

  const clearAll = () => {
    setQueryText("");
    setSkill("");
    setCity("");
    setLocationFull(null);
    setIsRealEmpty(false);
    setFilters({ rating: "", experience: "", verified: "" });
    setTierFilter("");
    setSelectedCategory("");
    setActiveSkillPill("");
    setPage(1);
    if (debouncedUpdateSearchQueryRef.current) {
      clearTimeout(debouncedUpdateSearchQueryRef.current);
    }
    const hasActiveParams = searchParams.get("query") || 
                            searchParams.get("skill") || 
                            searchParams.get("category") || 
                            searchParams.get("location") || 
                            searchParams.get("city") || 
                            searchParams.get("tier") || 
                            searchParams.get("rating") || 
                            searchParams.get("experience") || 
                            searchParams.get("verified");

    updateSearchQuery({
      query: "",
      skill: "",
      city: "",
      tier: "",
      category: "",
      rating: "",
      experience: "",
      verified: "",
    });

    if (!hasActiveParams) {
      fetchProviders(
        "",
        "",
        { rating: "", experience: "", verified: "" },
        "",
        "",
        { page: 1, append: false },
        null
      );
    }
  };

  const displayedSkills = (() => {
    if (tierFilter) {
      const filteredCats = categories.filter(
        (c) => c.isActive !== false && (c.tier === tierFilter || c.type === tierFilter)
      );
      const skills = [];
      filteredCats.forEach((cat) => {
        const catSkills = Array.isArray(cat.skills) ? cat.skills : [];
        catSkills.forEach((sk) => {
          if (sk.isActive !== false && sk.name && !skills.includes(sk.name)) {
            skills.push(sk.name);
          }
        });
      });
      return skills.slice(0, 24);
    }
    if (categories.length > 0) {
      const skills = [];
      categories.forEach((cat) => {
        if (cat.isActive !== false) {
          const catSkills = Array.isArray(cat.skills) ? cat.skills : [];
          catSkills.forEach((sk) => {
            if (sk.isActive !== false && sk.name && !skills.includes(sk.name)) {
              skills.push(sk.name);
            }
          });
        }
      });
      return skills.slice(0, 16);
    }
    return POPULAR_SKILLS.slice(0, 16);
  })();

  const hasFilters =
    queryText ||
    skill ||
    city ||
    filters.rating ||
    filters.experience ||
    filters.verified ||
    tierFilter;
  const allProviders = [
    ...(results.rotation || []),
    ...(results.featured || []),
    ...(results.providers || []),
  ];
  const searchMessage = searchMeta?.locationMessage || "";

  const tiers = [
    { k: "", l: t("search.all") },
    { k: "unskilled", l: t("search.tierUnskilled") },
    { k: "semi-skilled", l: t("search.tierSemiSkilled") },
    { k: "skilled", l: t("search.tierSkilled") },
  ];

  const columns =
    windowSize.width >= 1280 ? 3 : windowSize.width >= 1024 ? 3 : windowSize.width >= 640 ? 2 : 1;
  const rowHeight =
    columns === 1 ? 300 : columns === 2 ? 310 : columns === 3 ? 320 : 330;
  const listHeight = Math.min(
    900,
    Math.max(200, Math.round(windowSize.height * 0.6)),
  );
  const useVirtualizedList =
    results.providers.length > 18 && windowSize.width > 0 && !showAllResults;
  const rowCount = Math.ceil(results.providers.length / columns);

  const renderRow = ({ index, style }) => {
    const start = index * columns;
    const rowItems = results.providers.slice(start, start + columns);

    return (
      <div
        style={{ ...style, width: "100%" }}
        className={`grid gap-5 pb-5 ${columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}
      >
        {rowItems.map((p, i) => (
          <Link key={p._id || `${index}-${i}`} to={`/p/${p._id || p.user?._id}`} className="block h-full text-inherit">
            <SharedProviderCard
              provider={p}
              t={t}
            />
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <Seo
        title={t("search.pageTitle", "Search Jobs & Freelancers in India")}
        description={t(
          "search.pageDescription",
          "Browse thousands of verified jobs and freelancers across India. Filter by skill, location, and budget on Lucohire."
        )}
        canonicalPath={location.pathname}
      />
      {/* Search bar */}
      <div className="bg-white border-b border-stone-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div ref={skillDropdownRef} className="relative flex-1 min-w-0">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                value={queryText}
                onChange={(e) => {
                  handleSkillChange(e.target.value);
                  setSkillDropdownOpen(true);
                }}
                onFocus={() => setSkillDropdownOpen(true)}
                placeholder={t("search.searchSkillPlaceholder")}
                aria-label={t("search.searchSkillPlaceholder")}
                className="w-full pl-10 pr-10 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-sm bg-[#faf9f7]"
              />
              {queryText && (
                <button
                  type="button"
                  onClick={() => {
                    handleSkillChange("");
                    setSkillDropdownOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer z-10"
                >
                  <HiX className="w-4 h-4" />
                </button>
              )}

              {/* Skill suggestions dropdown */}
              {skillDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-2xl shadow-xl border border-stone-100 z-50 max-h-[300px] overflow-y-auto">
                  {filteredSkills.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-stone-400 italic">
                      {queryText.trim() ? `No matches for "${queryText}"` : 'Start typing to search skills…'}
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
                        <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-stone-400 bg-stone-50 sticky top-0">
                          {catName}
                        </div>
                        {group.map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => handleSkillSelect(s.name, s.tier)}
                            className="w-full text-left px-4 py-2 text-xs text-stone-700 font-medium hover:bg-amber-50 hover:text-amber-700 transition flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span>{s.name}</span>
                            <span className="text-[9px] text-stone-400 font-bold uppercase px-1.5 py-0.5 rounded-full bg-stone-100 shrink-0">
                              {s.tier}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="relative flex-1 min-w-0">
              <LocationAutocomplete
                value={city}
                onChange={(val) => {
                  if (typeof val === 'string') {
                    // Typed text only — no lat/lng yet, clear locationFull
                    setLocationFull(null);
                    handleCityChange(val, null);
                  }
                }}
                onSelect={(locationObj) => {
                  if (locationObj) {
                    // Full location object with lat/lng from autocomplete selection
                    const cityText = locationObj.city || locationObj.label || '';
                    handleCityChange(cityText, locationObj);
                  }
                }}
                placeholder={t("search.cityPlaceholder")}
                className="w-full"
                inputClassName="pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-sm bg-[#faf9f7]"
                iconClassName="w-5 h-5 text-stone-400"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 border rounded-xl flex items-center gap-2 transition text-sm font-medium ${showFilters ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 hover:bg-stone-50 text-stone-600"}`}
            >
              <HiFilter className="w-4 h-4" /> {t("search.filters")}
            </button>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="px-4 py-2.5 border border-red-200 text-red-400 rounded-xl flex items-center gap-1 hover:bg-red-50 transition text-sm font-medium"
              >
                <HiX className="w-4 h-4" /> {t("search.clear")}
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-stone-100">
              <select
                value={tierFilter}
                onChange={(e) => handleTierChange(e.target.value)}
                className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400 bg-white text-stone-700 font-medium"
              >
                {tiers.map((t) => (
                  <option key={t.k} value={t.k}>
                    {t.l}
                  </option>
                ))}
              </select>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange("rating", e.target.value)}
                className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400 bg-white text-stone-700 font-medium"
              >
                <option value="">{t("search.anyRating")}</option>
                <option value="4">{t("search.rating4")}</option>
                <option value="3">{t("search.rating3")}</option>
              </select>
              <select
                value={filters.experience}
                onChange={(e) =>
                  handleFilterChange("experience", e.target.value)
                }
                className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400 bg-white text-stone-700 font-medium"
              >
                <option value="">{t("search.anyExperience")}</option>
                <option value="1">{t("search.years1")}</option>
                <option value="3">{t("search.years3")}</option>
                <option value="5">{t("search.years5")}</option>
              </select>
              <select
                value={filters.verified}
                onChange={(e) => handleFilterChange("verified", e.target.value)}
                className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400 bg-white text-stone-700 font-medium"
              >
                <option value="">{t("search.allProviders")}</option>
                <option value="true">{t("search.verifiedOnly")}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Popular skill pills */}
        <div
          className="flex gap-2 overflow-x-auto pb-1 mb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {displayedSkills.map((s) => (
            <button
              key={s}
              onClick={() => handlePillClick(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition whitespace-nowrap ${activeSkillPill === s ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-200 text-stone-600 hover:border-stone-800 hover:bg-stone-50"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Active chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-1">
            {queryText && (
              <span className="px-1 py-1 bg-amber-50 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1">
                {t("search.skill")}: {queryText}
                <button onClick={() => handleSkillChange("")}>
                  <HiX className="w-3 h-3" />
                </button>
              </span>
            )}
            {city && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1">
                {t("search.city")}: {city}
                <button onClick={() => handleCityChange("")}>
                  <HiX className="w-3 h-3" />
                </button>
              </span>
            )}
            {tierFilter && (
              <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs rounded-full font-medium capitalize flex items-center gap-1">
                {tierFilter.replace("-", " ")}
                <button onClick={() => handleTierChange("")}>
                  <HiX className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.rating && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1">
                {filters.rating}+ {t("search.stars")}
                <button onClick={() => handleFilterChange("rating", "")}>
                  <HiX className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Results summary */}
        {/* <div className="text-sm text-stone-500 mb-2 px-1">
          <span className="font-semibold text-stone-700">
            {allProviders.length}
          </span>{" "}
          {t("search.providersFound")}
          {(interpretedIntent.skill || interpretedIntent.city) && (
            <span>
              {" "}
              {t("search.for")}{" "}
              <span className="font-medium text-stone-800">
                {[
                  interpretedIntent.skill || skill,
                  interpretedIntent.city || city,
                ]
                  .filter(Boolean)
                  .join(` ${t("search.in")} `)}
              </span>
            </span>
          )}
        </div> */}



        {searchMessage && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium mb-1">
              📍 {t("search.locationInfo", "Location Info")}
            </p>
            <p className="text-xs text-amber-700">{searchMessage}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-stone-100 p-5 animate-pulse"
              >
                <div className="flex gap-3 mb-4">
                  <div className="w-14 h-14 bg-stone-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-stone-200 rounded w-3/4" />
                    <div className="h-2 bg-stone-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-stone-100 rounded mb-3" />
                <div className="flex gap-1.5">
                  <div className="h-6 bg-stone-100 rounded-full w-20" />
                  <div className="h-6 bg-stone-100 rounded-full w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {results.providers?.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 items-stretch">
                  {results.providers.map((p, i) => (
                    <Link key={p._id || i} to={`/p/${p._id || p.user?._id}`} className="block h-full text-inherit">
                      <SharedProviderCard
                        provider={p}
                        index={i}
                        t={t}
                      />
                    </Link>
                  ))}
                </div>

                {results.pagination?.page < results.pagination?.pages && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-2.5 bg-[#1677FF] hover:bg-[#0E5FCC] text-white font-semibold text-sm rounded-xl transition shadow-sm flex items-center gap-2"
                    >
                      {loadingMore && (
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      )}
                      {t("search.loadMore", "Load More")}
                    </button>
                  </div>
                )}
              </>
            ) : isRealEmpty ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-3">🔍</div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">
                  {t("search.noProvidersFound", "No providers found")}
                </h3>
                <p className="text-stone-500 text-sm max-w-md mx-auto mb-2">
                  {city
                    ? t(
                      "search.noResultsForLocation",
                      `No providers found for "${queryText || skill}" in "${city}". Try a different location or broaden your filters.`,
                    )
                    : t(
                      "search.tryDifferent",
                      "Try a different skill, location, or adjust your filters.",
                    )}
                </p>
                {(queryText || skill || city || tierFilter) && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4 mb-6">
                    {(queryText || skill) && (
                      <span className="px-3 py-1 bg-stone-100 text-stone-600 text-xs rounded-full">
                        Skill: {queryText || skill}
                      </span>
                    )}
                    {city && (
                      <span className="px-3 py-1 bg-stone-100 text-stone-600 text-xs rounded-full">
                        Location: {city}
                      </span>
                    )}
                    {tierFilter && (
                      <span className="px-3 py-1 bg-stone-100 text-stone-600 text-xs rounded-full capitalize">
                        Tier: {tierFilter}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 bg-stone-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-stone-700 transition"
                >
                  {t("search.clearAllFilters", "Clear all filters")} <HiX className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">&#128269;</div>
                <h3 className="text-lg font-bold text-stone-700 mb-2">
                  {t("search.noProvidersFound")}
                </h3>
                <p className="text-stone-400 text-sm">
                  {t("search.tryDifferent")}
                </p>
                <button
                  onClick={clearAll}
                  className="mt-5 inline-flex items-center gap-2 bg-stone-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-stone-700 transition"
                >
                  {t("search.clearAllFilters")} <HiX className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
