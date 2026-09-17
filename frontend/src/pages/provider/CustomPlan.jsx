import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { providerAPI } from '../../services/api';
import { checkoutPlan, confirmPaymentSuccess, getMyPlan } from '../../services/providerPlanService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import axios from 'axios';
import { 
  ArrowLeft, Gift, Layers, MapPin, Building2, Globe, Trash2, Plus, Sparkles, 
  ChevronDown, ChevronUp, Lock, CheckCircle, Shield, RefreshCw, X, Search 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

// Helper to get initials
const getInitials = (skillName) => {
  if (!skillName) return 'SK';
  return skillName
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const createLocalityRow = (placeData = {}) => ({
  id: Date.now() + Math.random(),
  placeId: placeData.placeId || '',
  locality: placeData.locality || placeData.name || '',
  formattedAddress: placeData.formattedAddress || '',
  durationMonths: Number(placeData.durationMonths || 1),
  price: Number(placeData.price || 300),
  lat: placeData.lat ?? null,
  lng: placeData.lng ?? null,
  isDraft: !placeData.placeId,
});

const createCityRow = (placeData = {}) => ({
  id: Date.now() + Math.random(),
  placeId: placeData.placeId || '',
  city: placeData.city || placeData.name || '',
  formattedAddress: placeData.formattedAddress || '',
  durationMonths: Number(placeData.durationMonths || 1),
  price: Number(placeData.price || 350),
  lat: placeData.lat ?? null,
  lng: placeData.lng ?? null,
  isTrial: Boolean(placeData.isTrial),
  isDraft: !placeData.placeId,
});

const createCountryRow = (placeData = {}) => ({
  id: Date.now() + Math.random(),
  placeId: placeData.placeId || '',
  country: placeData.country || placeData.name || '',
  formattedAddress: placeData.formattedAddress || '',
  durationMonths: Number(placeData.durationMonths || 6),
  price: Number(placeData.price || 3500),
  lat: placeData.lat ?? null,
  lng: placeData.lng ?? null,
  isDraft: !placeData.placeId,
});

/**
 * Reusable Autocomplete for Skills Search
 */
const SkillSearchSelect = ({ options = [], selected, onChange, placeholder, icon: Icon }) => {
  const {
    t
  } = useTranslation();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const clickAway = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', clickAway);
    return () => document.removeEventListener('mousedown', clickAway);
  }, []);

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative w-full z-25">
      <div className="relative">
        <input
          type="text"
          value={open ? query : (selected || '')}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-violet-500 outline-none focus:ring-4 focus:ring-violet-100 bg-white shadow-sm transition"
        />
        {Icon && <Icon className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-700 transition"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto z-50">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-400 italic">{t("No matches found.")}</div>
          )}
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setQuery('');
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-violet-50 text-gray-700 transition"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Reusable Autocomplete for Google Places
 */
const GooglePlaceSearchInput = ({ type, placeholder, onSelect, value = '' }) => {
  const {
    t
  } = useTranslation();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const clickAway = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', clickAway);
    return () => document.removeEventListener('mousedown', clickAway);
  }, []);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (!query || query.trim().length < 2 || !open) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/provider/custom-plan/place-suggestions`, {
          params: { input: query, type },
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuggestions(res.data || []);
      } catch (err) {
        console.error('Places Autocomplete Error:', err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open, type]);

  const handleSuggestionClick = async (place) => {
    setLoading(true);
    setOpen(false);
    setQuery(place.formattedAddress || place.name);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/provider/custom-plan/place-details`, {
        params: { placeId: place.placeId, type },
        headers: { Authorization: `Bearer ${token}` }
      });
      onSelect(res.data);
      setQuery(res.data.formattedAddress || res.data.name || '');
    } catch (err) {
      toast.error('Failed to load place geocoding details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="relative w-full z-20">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-violet-500 outline-none focus:ring-4 focus:ring-violet-100 bg-white shadow-sm transition"
        />
        <div className="absolute right-3.5 top-3.5">
          {loading ? (
            <RefreshCw className="w-4 h-4 text-violet-600 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      {open && (query.trim().length >= 2) && (
        <div className="absolute left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto z-50">
          {suggestions.length === 0 && !loading && (
            <div className="px-4 py-3 text-xs text-gray-400 italic">{t("No matches found.")}</div>
          )}
          {suggestions.map(place => (
            <button
              key={place.placeId}
              type="button"
              onClick={() => handleSuggestionClick(place)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-violet-50 text-gray-700 transition"
            >
              <div className="font-semibold text-xs text-slate-800">{place.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{place.formattedAddress}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomPlan = () => {
  const {
    t
  } = useTranslation();

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [customisePlanObj, setCustomisePlanObj] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [profile, setProfile] = useState(null);

  // Options lists from API
  const [allSkills, setAllSkills] = useState([]);
  const [durationsConfig, setDurationsConfig] = useState({ locality: [], city: [], country: [] });
  const [trialAvailable, setTrialAvailable] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const isRedirected = params.get('redirected') === 'true';

  // Selection states
  const [selectedAchievements, setSelectedAchievements] = useState({
    multipleSkills: true,
    locality: true,
    city: true,
    country: true
  });

  const [multipleSkillsList, setMultipleSkillsList] = useState([]);

  // Table items states
  const [localitySkill, setLocalitySkill] = useState('');
  const [localityItems, setLocalityItems] = useState([]);

  const [citySkill, setCitySkill] = useState('');
  const [cityItems, setCityItems] = useState([]);

  const [countrySkill, setCountrySkill] = useState('');
  const [countryItems, setCountryItems] = useState([]);

  // Live Summary Panel Calculations states
  const [pricingBreakdown, setPricingBreakdown] = useState({
    subtotal: 0,
    gstPercent: 18,
    gstAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    savingsAmount: 0
  });

  // Expandable summary blocks
  const [expandedSummary, setExpandedSummary] = useState({
    locality: true,
    city: true,
    country: true
  });

  const hasLocality = selectedAchievements.locality && localitySkill && localityItems.some(item => item.placeId);
  const hasCity = selectedAchievements.city && citySkill && cityItems.some(item => item.placeId);
  const hasCountry = selectedAchievements.country && countrySkill && countryItems.some(item => item.placeId);
  const hasMultipleSkills = selectedAchievements.multipleSkills && multipleSkillsList.length > 0;
  const hasSelectedItems = hasLocality || hasCity || hasCountry || hasMultipleSkills;

  // Proceed to Payment disabled rules
  const atLeastOneSkillSelected = 
    (selectedAchievements.locality && !!localitySkill) || 
    (selectedAchievements.city && !!citySkill) || 
    (selectedAchievements.country && !!countrySkill) || 
    (selectedAchievements.multipleSkills && multipleSkillsList.length > 0);

  const atLeastOneVisibilityItemSelected = 
    (selectedAchievements.locality && localityItems.some(item => item.placeId)) || 
    (selectedAchievements.city && cityItems.some(item => item.placeId)) || 
    (selectedAchievements.country && countryItems.some(item => item.placeId));

  const isDurationSelected = 
    (!selectedAchievements.locality || localityItems.every(item => Number(item.durationMonths) > 0)) &&
    (!selectedAchievements.city || cityItems.every(item => Number(item.durationMonths) > 0)) &&
    (!selectedAchievements.country || countryItems.every(item => Number(item.durationMonths) > 0));

  const proceedDisabled = 
    checkoutLoading || 
    pricingLoading || 
    !atLeastOneSkillSelected || 
    !atLeastOneVisibilityItemSelected || 
    !isDurationSelected || 
    pricingBreakdown.totalAmount <= 0;

  const lastPayloadRef = useRef('');

  useEffect(() => {
    loadInitialData();
  }, []);

  // Recalculate price with debouncer and prevent loop on price update
  useEffect(() => {
    if (loading) return;

    const hasLocality = selectedAchievements.locality && localitySkill && localityItems.some(item => item.placeId);
    const hasCity = selectedAchievements.city && citySkill && cityItems.some(item => item.placeId);
    const hasCountry = selectedAchievements.country && countrySkill && countryItems.some(item => item.placeId);
    const hasMultipleSkills = selectedAchievements.multipleSkills && multipleSkillsList.length > 0;

    if (!hasLocality && !hasCity && !hasCountry && !hasMultipleSkills) {
      setPricingBreakdown({
        subtotal: 0,
        gstPercent: 18,
        gstAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        savingsAmount: 0
      });
      return;
    }

    const timer = setTimeout(() => {
      calculateLivePrice();
    }, 400);

    return () => clearTimeout(timer);
  }, [
    localitySkill,
    JSON.stringify(localityItems.map(i => ({ name: i.locality, duration: i.durationMonths }))),
    citySkill,
    JSON.stringify(cityItems.map(i => ({ name: i.city, duration: i.durationMonths, isTrial: i.isTrial }))),
    countrySkill,
    JSON.stringify(countryItems.map(i => ({ name: i.country, duration: i.durationMonths }))),
    JSON.stringify(multipleSkillsList),
    selectedAchievements
  ]);

  useEffect(() => {
    if (selectedAchievements.locality && localitySkill && localityItems.length === 0) {
      setLocalityItems([createLocalityRow()]);
    }
  }, [selectedAchievements.locality, localitySkill, localityItems.length]);

  useEffect(() => {
    if (selectedAchievements.city && citySkill && cityItems.length === 0) {
      setCityItems([createCityRow()]);
    }
  }, [selectedAchievements.city, citySkill, cityItems.length]);

  useEffect(() => {
    if (selectedAchievements.country && countrySkill && countryItems.length === 0) {
      setCountryItems([createCountryRow()]);
    }
  }, [selectedAchievements.country, countrySkill, countryItems.length]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const [plansList, myPlan, profData, optionsRes] = await Promise.all([
        providerAPI.getPlans(),
        getMyPlan(),
        providerAPI.getProfile(),
        axios.get(`${API_BASE_URL}/provider/custom-plan/options`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setProfile(profData.data || null);
      
      const customPlan = plansList.data?.find(p => p.slug === 'customise-plan');
      if (customPlan) {
        setCustomisePlanObj(customPlan);
      }

      if (optionsRes.data) {
        setAllSkills(optionsRes.data.skills || []);
        setDurationsConfig(optionsRes.data.durations || { locality: [], city: [], country: [] });
        setTrialAvailable(optionsRes.data.trialAvailable || false);
      }

      if (myPlan?.subscription?.planSnapshot?.slug === 'customise-plan' || profData.data?.currentPlan === 'customise-plan') {
        setActivePlan({
          subscription: myPlan.subscription,
          config: myPlan.subscription?.customConfig || profData.data?.customConfig
        });
      }

    } catch (err) {
      toast.error('Failed to sync customised plan specifications.');
    } finally {
      setLoading(false);
    }
  };

  const calculateLivePrice = async () => {
    const items = [];
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');

    const committedLocalities = localityItems.filter(item => item.placeId);
    const committedCities = cityItems.filter(item => item.placeId);
    const committedCountries = countryItems.filter(item => item.placeId);

    if (selectedAchievements.locality && localitySkill && committedLocalities.length > 0) {
      items.push({
        skillName: localitySkill,
        visibilityType: 'locality',
        locations: committedLocalities.map(item => ({
          placeId: item.placeId || 'placeholder_' + item.id,
          name: item.locality,
          formattedAddress: item.formattedAddress || item.locality,
          locality: item.locality,
          lat: item.lat || 19.0,
          lng: item.lng || 73.0,
          durationMonths: Number(item.durationMonths),
          isTrial: false
        }))
      });
    }

    if (selectedAchievements.city && citySkill && committedCities.length > 0) {
      items.push({
        skillName: citySkill,
        visibilityType: 'city',
        locations: committedCities.map(item => ({
          placeId: item.placeId || 'placeholder_' + item.id,
          name: item.city,
          formattedAddress: item.formattedAddress || item.city,
          city: item.city,
          lat: item.lat || 18.0,
          lng: item.lng || 74.0,
          durationMonths: Number(item.durationMonths),
          isTrial: !!item.isTrial
        }))
      });
    }

    if (selectedAchievements.country && countrySkill && committedCountries.length > 0) {
      items.push({
        skillName: countrySkill,
        visibilityType: 'country',
        locations: committedCountries.map(item => ({
          placeId: item.placeId || 'placeholder_' + item.id,
          name: item.country,
          formattedAddress: item.formattedAddress || item.country,
          country: item.country,
          lat: item.lat || 20.0,
          lng: item.lng || 77.0,
          durationMonths: Number(item.durationMonths),
          isTrial: false
        }))
      });
    }

    if (selectedAchievements.multipleSkills && multipleSkillsList.length > 0) {
      multipleSkillsList.forEach(skill => {
        items.push({
          skillName: skill,
          visibilityType: 'multipleSkills',
          locations: []
        });
      });
    }

    const payloadStr = JSON.stringify({ items, selectedAchievements });
    if (payloadStr === lastPayloadRef.current) return;
    lastPayloadRef.current = payloadStr;

    setPricingLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/provider/custom-plan/price`, { items }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.success) {
        setPricingBreakdown(res.data);
        
        // Sync calculated priced items back into grid rows safely without loop
        const localityGroup = res.data.lineItems?.find(i => i.visibilityType === 'locality');
        if (localityGroup) {
          setLocalityItems(prev => prev.map((item, idx) => ({
            ...item,
            price: item.placeId ? (localityGroup.locations.find(loc => loc.placeId === item.placeId)?.price || item.price) : item.price
          })));
        }

        const cityGroup = res.data.lineItems?.find(i => i.visibilityType === 'city');
        if (cityGroup) {
          setCityItems(prev => prev.map((item, idx) => ({
            ...item,
            price: item.placeId ? (cityGroup.locations.find(loc => loc.placeId === item.placeId)?.price || item.price) : item.price
          })));
        }

        const countryGroup = res.data.lineItems?.find(i => i.visibilityType === 'country');
        if (countryGroup) {
          setCountryItems(prev => prev.map((item, idx) => ({
            ...item,
            price: item.placeId ? (countryGroup.locations.find(loc => loc.placeId === item.placeId)?.price || item.price) : item.price
          })));
        }
      }
    } catch (err) {
      toast.error('Pricing calculations failed. Check items connection.');
    } finally {
      setPricingLoading(false);
    }
  };

  const handleAddLocality = (rowId, placeData) => {
    const isDuplicate = localityItems.some(i => i.id !== rowId && i.placeId && i.locality === placeData.locality);
    if (isDuplicate) {
      toast.error('This locality is already added.');
      return;
    }
    setLocalityItems((prev) => prev.map((item) => (item.id === rowId ? {
      ...item,
      placeId: placeData.placeId,
      locality: placeData.locality || placeData.name,
      formattedAddress: placeData.formattedAddress,
      durationMonths: Number(item.durationMonths || 1),
      price: Number(item.price || 300),
      lat: placeData.lat,
      lng: placeData.lng,
      isDraft: false,
    } : item)));
    toast.success('Locality added.');
  };

  const handleAddCity = (rowId, placeData) => {
    const isDuplicate = cityItems.some(i => i.id !== rowId && i.placeId && i.city === placeData.city);
    if (isDuplicate) {
      toast.error('This city is already added.');
      return;
    }
    setCityItems((prev) => prev.map((item) => (item.id === rowId ? {
      ...item,
      placeId: placeData.placeId,
      city: placeData.city || placeData.name,
      formattedAddress: placeData.formattedAddress,
      durationMonths: Number(item.durationMonths || 1),
      price: Number(item.price || 350),
      lat: placeData.lat,
      lng: placeData.lng,
      isTrial: false,
      isDraft: false,
    } : item)));
    toast.success('City added.');
  };

  const handleAddCountry = (rowId, placeData) => {
    const isDuplicate = countryItems.some(i => i.id !== rowId && i.placeId && i.country === placeData.country);
    if (isDuplicate) {
      toast.error('This country is already added.');
      return;
    }
    setCountryItems((prev) => prev.map((item) => (item.id === rowId ? {
      ...item,
      placeId: placeData.placeId,
      country: placeData.country || placeData.name,
      formattedAddress: placeData.formattedAddress,
      durationMonths: Number(item.durationMonths || 6),
      price: Number(item.price || 3500),
      lat: placeData.lat,
      lng: placeData.lng,
      isDraft: false,
    } : item)));
    toast.success('Country added.');
  };

  const handleDeleteLocality = (id) => {
    setLocalityItems(localityItems.filter(item => item.id !== id));
  };

  const handleDeleteCity = (id) => {
    setCityItems(cityItems.filter(item => item.id !== id));
  };

  const handleDeleteCountry = (id) => {
    setCountryItems(countryItems.filter(item => item.id !== id));
  };

  const addDraftRow = (type) => {
    if (type === 'locality') {
      setLocalityItems((prev) => [...prev, createLocalityRow()]);
      return;
    }
    if (type === 'city') {
      setCityItems((prev) => [...prev, createCityRow()]);
      return;
    }
    if (type === 'country') {
      setCountryItems((prev) => [...prev, createCountryRow()]);
    }
  };

  const handleLocalityItemChange = (id, field, value) => {
    setLocalityItems(localityItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleCityItemChange = (id, field, value) => {
    setCityItems(cityItems.map(item => {
      if (item.id === id) {
        const updated = { ...item };
        if (value === '1_trial') {
          updated.durationMonths = 1;
          updated.isTrial = true;
        } else {
          updated.durationMonths = Number(value);
          updated.isTrial = false;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleCountryItemChange = (id, field, value) => {
    setCountryItems(countryItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleClearAll = () => {
    setSelectedAchievements({
      multipleSkills: false,
      locality: false,
      city: false,
      country: false
    });
    setLocalitySkill('');
    setLocalityItems([]);
    setCitySkill('');
    setCityItems([]);
    setCountrySkill('');
    setCountryItems([]);
    setMultipleSkillsList([]);
    setPricingBreakdown({
      subtotal: 0,
      gstPercent: 18,
      gstAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      savingsAmount: 0
    });
    toast.success('Configuration cleared.');
  };

  const handleProceedToPayment = async () => {
    const { subtotal } = pricingBreakdown;
    if (subtotal <= 0) {
      toast.error('Please configure at least one active visibility boost plan to proceed.');
      return;
    }
    if (!customisePlanObj) {
      toast.error('Custom plan object templates not loaded.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const items = [];

      if (selectedAchievements.locality && localitySkill && localityItems.some(item => item.placeId)) {
        items.push({
          skillName: localitySkill,
          visibilityType: 'locality',
          locations: localityItems.map(item => ({
            placeId: item.placeId || 'placeholder_' + item.id,
            name: item.locality,
            formattedAddress: item.formattedAddress || item.locality,
            locality: item.locality,
            lat: item.lat || 19.0,
            lng: item.lng || 73.0,
            durationMonths: Number(item.durationMonths)
          }))
        });
      }

      if (selectedAchievements.city && citySkill && cityItems.some(item => item.placeId)) {
        items.push({
          skillName: citySkill,
          visibilityType: 'city',
          locations: cityItems.map(item => ({
            placeId: item.placeId || 'placeholder_' + item.id,
            name: item.city,
            formattedAddress: item.formattedAddress || item.city,
            city: item.city,
            lat: item.lat || 18.0,
            lng: item.lng || 74.0,
            durationMonths: Number(item.durationMonths),
            isTrial: !!item.isTrial
          }))
        });
      }

      if (selectedAchievements.country && countrySkill && countryItems.some(item => item.placeId)) {
        items.push({
          skillName: countrySkill,
          visibilityType: 'country',
          locations: countryItems.map(item => ({
            placeId: item.placeId || 'placeholder_' + item.id,
            name: item.country,
            formattedAddress: item.formattedAddress || item.country,
            country: item.country,
            lat: item.lat || 20.0,
            lng: item.lng || 77.0,
            durationMonths: Number(item.durationMonths)
          }))
        });
      }

      if (selectedAchievements.multipleSkills && multipleSkillsList.length > 0) {
        multipleSkillsList.forEach(skill => {
          items.push({
            skillName: skill,
            visibilityType: 'multipleSkills',
            locations: []
          });
        });
      }

      const selectedGoals = Object.keys(selectedAchievements).filter(k => selectedAchievements[k]);

      const res = await axios.post(`${API_BASE_URL}/provider/custom-plan/create`, {
        items,
        selectedGoals
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { checkout, subscription } = res.data || {};

      if (checkout?.simulationMode) {
        const confirm = window.confirm('Simulation Mode: Click OK to simulate successful payment and instantly activate customized plan.');
        if (confirm) {
          await confirmPaymentSuccess({
            subscriptionId: subscription?._id,
            placeId: subscription?._id, // compatibility
            paymentId: 'sim_' + Date.now(),
            orderId: 'sim_order_' + Date.now()
          });
          toast.success('Dynamic custom visibility plan activated successfully!');
          
          const updatedPlan = await getMyPlan();
          if (updatedPlan?.subscription) {
            setActivePlan({
              subscription: updatedPlan.subscription,
              config: updatedPlan.subscription.customConfig
            });
          }
          return;
        }
      }

      if (checkout?.paymentRequired && checkout?.url) {
        toast.success('Redirecting to secure stripe checkout...');
        window.location.href = checkout.url;
      } else {
        toast.success(checkout?.message || 'Custom plan request created successfully.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout creation failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Active Plan Dashboard View
  if (activePlan) {
    const config = activePlan.config || {};
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/provider/plans')}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-violet-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />{t("Back to My Plan")}</button>
            <div className="bg-emerald-50 text-emerald-600 font-semibold px-4 py-1.5 rounded-full border border-emerald-200 text-sm flex items-center gap-2 shadow-sm">
              <CheckCircle className="w-4 h-4" />{t("Active Customised Plan")}</div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-10 mb-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-600 shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t("Your Smart Visibility Boosts Are Active!")}</h1>
              <p className="mt-3 text-slate-500">{t(
                "Enjoy top-tier priority rankings across all of your configured custom visibility levels."
              )}</p>
            </div>

            <hr className="border-slate-100 mb-8" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Multiple Skills Showcase Info Card */}
              {config.multipleSkills?.length > 0 && (
                <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-violet-700">
                    <Layers className="w-5 h-5" />
                    <h3 className="font-bold text-lg">{t("Showcase Skills")}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.multipleSkills.map((skill, idx) => (
                      <span key={idx} className="bg-white px-3 py-1.5 rounded-xl border border-violet-100 shadow-sm text-xs font-bold text-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Localities Boost Info Card */}
              {config.localities?.length > 0 && (
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-purple-700">
                    <MapPin className="w-5 h-5" />
                    <h3 className="font-bold text-lg">{t("Locality Boosts")}</h3>
                  </div>
                  <div className="space-y-4">
                    {config.localities.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                        <div className="font-bold text-slate-800 text-sm">{item.skill}</div>
                        <div className="text-slate-600 text-xs mt-1">{item.locality}</div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50 text-xs">
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">{item.durationMonths}{t("Month")}{item.durationMonths > 1 ? 's' : ''}</span>
                          <span className="font-bold text-slate-700">₹{item.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cities Boost Info Card */}
              {config.cities?.length > 0 && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-blue-700">
                    <Building2 className="w-5 h-5" />
                    <h3 className="font-bold text-lg">{t("City Boosts")}</h3>
                  </div>
                  <div className="space-y-4">
                    {config.cities.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                        <div className="font-bold text-slate-800 text-sm">{item.skill}</div>
                        <div className="text-slate-600 text-xs mt-1">{item.city}</div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50 text-xs">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                            {item.isTrial ? '1 Month (Trial)' : `${item.durationMonths} Month${item.durationMonths > 1 ? 's' : ''}`}
                          </span>
                          <span className="font-bold text-slate-700">₹{item.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Countries Boost Info Card */}
              {config.countries?.length > 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-emerald-700">
                    <Globe className="w-5 h-5" />
                    <h3 className="font-bold text-lg">{t("Country Boosts")}</h3>
                  </div>
                  <div className="space-y-4">
                    {config.countries.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                        <div className="font-bold text-slate-800 text-sm">{item.skill}</div>
                        <div className="text-slate-600 text-xs mt-1">{item.country}</div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50 text-xs">
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">{item.durationMonths}{t("Month")}{item.durationMonths > 1 ? 's' : ''}</span>
                          <span className="font-bold text-slate-700">₹{item.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 mt-8 flex flex-col md:flex-row md:items-center md:justify-between border border-slate-100">
              <div className="text-sm text-slate-500 mb-4 md:mb-0">
                <div className="font-bold text-slate-700">{t("Renewal Info")}</div>
                <div>{t("Your plan will remain active until")}<span className="font-bold text-slate-700">{activePlan.subscription?.endDate ? new Date(activePlan.subscription.endDate).toLocaleDateString() : 'N/A'}</span>.</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePlan(null)} 
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition shadow-md"
                >{t("Create New Custom Plan")}</button>
                <button
                  onClick={() => navigate('/provider/profile')}
                  className="px-6 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition"
                >{t("Go to Profile")}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Builder Plan View
  return (
    <div className="min-h-screen bg-[#F7F8FC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <button
              onClick={() => navigate('/provider/plans')}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-600 hover:text-violet-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />{t("Back to My Plan")}</button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t("Customise Your Plan")}</h1>
              <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">{t(
                "Create a personalised visibility plan by choosing skills, locations and duration as per your goals."
              )}</p>
            </div>
          </div>

          <div className="bg-white text-violet-700 font-semibold px-4 py-3 rounded-2xl border border-violet-100 text-xs flex items-center gap-2 shadow-sm w-fit lg:mt-1">
            <Gift className="w-4 h-4 text-violet-600" />
            <span>{t("Your one skill for one pin code is")}<span className="font-black">{t("FREE!")}</span></span>
          </div>
        </div>

        {isRedirected && (
          <div className="mb-8 bg-linear-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">{t("Plan Activated Successfully!")}</h2>
                <p className="text-slate-500 text-sm mt-1">{t(
                  "Enjoy top visibility rankings across your configured custom specifications."
                )}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/provider/profile')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md"
            >{t("Go to Profile")}</button>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Configurator Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Choose Achievements */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4">{t("Choose What You Want to Achieve")}</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Achievement Card 1: Multiple Skills */}
                <button
                  type="button"
                  onClick={() => setSelectedAchievements(s => ({ ...s, multipleSkills: !s.multipleSkills }))}
                  className={`relative p-5 rounded-2xl border text-left transition-all ${
                    selectedAchievements.multipleSkills
                      ? 'border-violet-600 bg-violet-50/20 ring-2 ring-violet-600/10'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {selectedAchievements.multipleSkills && (
                    <div className="absolute top-3 right-3 bg-violet-600 text-white rounded-full p-0.5">
                      <CheckCircle className="w-3.5 h-3.5 fill-white text-violet-600" />
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 mb-3">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">{t("Multiple Skills")}</h3>
                  <p className="text-slate-400 text-xs mt-1">{t("Showcase multiple skills in your profile")}</p>
                </button>

                {/* Achievement Card 2: Top in Locality */}
                <button
                  type="button"
                  onClick={() => setSelectedAchievements(s => ({ ...s, locality: !s.locality }))}
                  className={`relative p-5 rounded-2xl border text-left transition-all ${
                    selectedAchievements.locality
                      ? 'border-pink-500 bg-pink-50/10 ring-2 ring-pink-500/10'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {selectedAchievements.locality && (
                    <div className="absolute top-3 right-3 bg-pink-500 text-white rounded-full p-0.5">
                      <CheckCircle className="w-3.5 h-3.5 fill-white text-pink-500" />
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500 mb-3">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">{t("Top in Locality")}</h3>
                  <p className="text-slate-400 text-xs mt-1">{t("Be a top choice in selected locality(ies)")}</p>
                </button>

                {/* Achievement Card 3: Top in City */}
                <button
                  type="button"
                  onClick={() => setSelectedAchievements(s => ({ ...s, city: !s.city }))}
                  className={`relative p-5 rounded-2xl border text-left transition-all ${
                    selectedAchievements.city
                      ? 'border-blue-500 bg-blue-50/10 ring-2 ring-blue-500/10'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {selectedAchievements.city && (
                    <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full p-0.5">
                      <CheckCircle className="w-3.5 h-3.5 fill-white text-blue-500" />
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500 mb-3">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">{t("Top in City")}</h3>
                  <p className="text-slate-400 text-xs mt-1">{t("Rank on top across selected city(ies)")}</p>
                </button>

                {/* Achievement Card 4: Top in Country */}
                <button
                  type="button"
                  onClick={() => setSelectedAchievements(s => ({ ...s, country: !s.country }))}
                  className={`relative p-5 rounded-2xl border text-left transition-all ${
                    selectedAchievements.country
                      ? 'border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/10'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {selectedAchievements.country && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full p-0.5">
                      <CheckCircle className="w-3.5 h-3.5 fill-white text-emerald-500" />
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-500 mb-3">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">{t("Top in Country")}</h3>
                  <p className="text-slate-400 text-xs mt-1">{t("Max visibility across selected country(ies)")}</p>
                </button>

              </div>
            </div>

            {/* Config Sections */}
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-800">{t("Build Your Smart Visibility Plan")}</h2>
                <span className="bg-violet-50 text-violet-600 border border-violet-100 text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />{t("Smart Filters")}</span>
              </div>

              {/* Section: Multiple Skills Showcase */}
              {selectedAchievements.multipleSkills && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  
                  {/* Skill Search Selection Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-violet-600 text-white font-bold text-xs rounded-full flex items-center justify-center shadow-md">★</div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">{t("Multiple Skills")}</h3>
                        <p className="text-xs text-slate-400">{t("Showcase multiple skills on your profile.")}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">{t("Add Secondary Skill")}</span>
                      <div className="w-full sm:w-64">
                        <SkillSearchSelect
                          options={allSkills}
                          selected=""
                          onChange={(s) => {
                            if (!s) return;
                            if (multipleSkillsList.includes(s)) {
                              toast.error('Skill already added.');
                              return;
                            }
                            setMultipleSkillsList([...multipleSkillsList, s]);
                            toast.success('Skill added.');
                          }}
                          placeholder={t("Search skill (e.g. Electrician)")}
                          icon={Search}
                        />
                      </div>
                    </div>
                  </div>

                  {multipleSkillsList.length > 0 ? (
                    <div className="flex flex-wrap gap-2 animate-fade-in">
                      {multipleSkillsList.map(skill => (
                        <div key={skill} className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full animate-fade-in">
                          <span>{getInitials(skill)}</span>
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMultipleSkillsList(multipleSkillsList.filter(s => s !== skill));
                              toast.success('Skill removed.');
                            }}
                            className="hover:text-red-700 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">{t("No secondary skills added yet. Search and select skills above.")}</div>
                  )}

                </div>
              )}

              {/* Section 01: Locality Boost */}
              {selectedAchievements.locality && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  
                  {/* Skill Search Selection Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-violet-600 text-white font-bold text-xs rounded-full flex items-center justify-center shadow-md">01</div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">{t("Top in One Locality")}</h3>
                        <p className="text-xs text-slate-400">{t("Be visible at the top in selected localities.")}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">{t("Search Skill with AI")}</span>
                      <div className="w-full sm:w-64">
                        <SkillSearchSelect
                          options={allSkills}
                          selected={localitySkill}
                          onChange={(s) => setLocalitySkill(s)}
                          placeholder={t("Search skill (e.g. Graphic Design)")}
                          icon={Search}
                        />
                      </div>
                    </div>
                  </div>

                  {localitySkill ? (
                    <div>
                      {/* Selected Skill Pill */}
                      <div className="mb-4 inline-flex items-center gap-2 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full animate-fade-in">
                        <span>{getInitials(localitySkill)}</span>
                        <span>{localitySkill}</span>
                        <button type="button" onClick={() => setLocalitySkill('')} className="hover:text-red-700">
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Locality Table */}
                      {localityItems.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <th className="py-3 px-4">{t("Locality")}</th>
                                <th className="py-3 px-4">{t("Duration")}</th>
                                <th className="py-3 px-4">{t("Price")}</th>
                                <th className="py-3 px-4 w-12"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {localityItems.map(item => (
                                <tr key={item.id} className="text-sm">
                                  <td className="py-3 px-4 font-semibold text-slate-700">
                                    <GooglePlaceSearchInput
                                      type="locality"
                                      value={item.locality || ''}
                                      placeholder={item.isDraft ? 'Add your first locality' : 'Search locality to replace'}
                                      onSelect={(place) => handleAddLocality(item.id, place)}
                                    />
                                    {item.formattedAddress && (
                                      <span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs mt-1">{item.formattedAddress}</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      value={item.durationMonths}
                                      onChange={(e) => handleLocalityItemChange(item.id, 'durationMonths', e.target.value)}
                                      className="bg-transparent font-medium text-slate-700 outline-none border border-slate-200 rounded px-2 py-1 text-xs"
                                    >
                                      {durationsConfig.locality?.map(d => (
                                        <option key={d.months} value={d.months}>{d.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-3 px-4 font-bold text-slate-800">
                                    ₹{item.price}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLocality(item.id)}
                                      className="text-slate-300 hover:text-red-700 transition"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">{t("Select a skill first.")}</div>
                      )}

                      {localityItems.some(item => item.placeId) && (
                        <button
                          type="button"
                          onClick={() => addDraftRow('locality')}
                          className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-violet-700 hover:text-violet-900"
                        >
                          <Plus className="w-3.5 h-3.5" />{t("Add Another Locality")}</button>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div />
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-400">{t("Locality Total")}</span>
                          <span className="font-extrabold text-violet-700 text-lg">₹{localityItems.reduce((a, b) => a + b.price, 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <div className="bg-slate-50/50 border-b border-slate-100 grid grid-cols-[1.6fr_0.9fr_0.5fr_40px] gap-3 px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>{t("Locality")}</span>
                        <span>{t("Duration")}</span>
                        <span>{t("Price")}</span>
                        <span />
                      </div>
                      <div className="grid grid-cols-[1.6fr_0.9fr_0.5fr_40px] gap-3 px-4 py-4 items-center bg-white">
                        <div>
                          <div className="font-semibold text-slate-700">{t("Add your first locality")}</div>
                          <div className="text-[10px] text-slate-400">{t("Search a locality above to populate this row")}</div>
                        </div>
                        <select disabled className="bg-slate-50 text-slate-400 outline-none border border-slate-200 rounded-lg px-2 py-2 text-xs">
                          <option>{durationsConfig.locality?.[0]?.label || '1 Month'}</option>
                        </select>
                        <span className="font-bold text-slate-800">₹0</span>
                        <button type="button" disabled className="text-slate-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Section 02: City Boost */}
              {selectedAchievements.city && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  
                  {/* Skill Search Selection Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-violet-600 text-white font-bold text-xs rounded-full flex items-center justify-center shadow-md">02</div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">{t("Top in City")}</h3>
                        <p className="text-xs text-slate-400">{t("Be visible at the top in selected cities.")}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">{t("Search Skill with AI")}</span>
                      <div className="w-full sm:w-64">
                        <SkillSearchSelect
                          options={allSkills}
                          selected={citySkill}
                          onChange={(s) => setCitySkill(s)}
                          placeholder={t("Search skill (e.g. Video Editing)")}
                          icon={Search}
                        />
                      </div>
                    </div>
                  </div>

                  {citySkill ? (
                    <div>
                      {/* Selected Skill Pill */}
                      <div className="mb-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full animate-fade-in">
                        <span>{getInitials(citySkill)}</span>
                        <span>{citySkill}</span>
                        <button type="button" onClick={() => setCitySkill('')} className="hover:text-red-700">
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* City Table */}
                      {cityItems.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <th className="py-3 px-4">{t("City")}</th>
                                <th className="py-3 px-4">{t("Duration")}</th>
                                <th className="py-3 px-4">{t("Price")}</th>
                                <th className="py-3 px-4 w-12"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {cityItems.map(item => (
                                <tr key={item.id} className="text-sm">
                                  <td className="py-3 px-4 font-semibold text-slate-700">
                                    <GooglePlaceSearchInput
                                      type="city"
                                      value={item.city || ''}
                                      placeholder={item.isDraft ? 'Add your first city' : 'Search city to replace'}
                                      onSelect={(place) => handleAddCity(item.id, place)}
                                    />
                                    {item.formattedAddress && (
                                      <span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs mt-1">{item.formattedAddress}</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      value={item.isTrial ? '1_trial' : item.durationMonths}
                                      onChange={(e) => handleCityItemChange(item.id, 'durationMonths', e.target.value)}
                                      className="bg-transparent font-medium text-slate-700 outline-none border border-slate-200 rounded px-2 py-1 text-xs"
                                    >
                                      {durationsConfig.city?.map(d => (
                                        <option key={d.isTrial ? '1_trial' : d.months} value={d.isTrial ? '1_trial' : d.months}>{d.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-3 px-4 font-bold text-slate-800">
                                    ₹{item.price}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCity(item.id)}
                                      className="text-slate-300 hover:text-red-700 transition"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">{t("Select a skill first.")}</div>
                      )}

                      {cityItems.some(item => item.placeId) && (
                        <button
                          type="button"
                          onClick={() => addDraftRow('city')}
                          className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-violet-700 hover:text-violet-900"
                        >
                          <Plus className="w-3.5 h-3.5" />{t("Add Another City")}</button>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div />
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-400">{t("City Total")}</span>
                          <span className="font-extrabold text-violet-700 text-lg">₹{cityItems.reduce((a, b) => a + b.price, 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <div className="bg-slate-50/50 border-b border-slate-100 grid grid-cols-[1.6fr_0.9fr_0.5fr_40px] gap-3 px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>{t("City")}</span>
                        <span>{t("Duration")}</span>
                        <span>{t("Price")}</span>
                        <span />
                      </div>
                      <div className="grid grid-cols-[1.6fr_0.9fr_0.5fr_40px] gap-3 px-4 py-4 items-center bg-white">
                        <div>
                          <div className="font-semibold text-slate-700">{t("Add your first city")}</div>
                          <div className="text-[10px] text-slate-400">{t("Search a city above to populate this row")}</div>
                        </div>
                        <select disabled className="bg-slate-50 text-slate-400 outline-none border border-slate-200 rounded-lg px-2 py-2 text-xs">
                          <option>{durationsConfig.city?.[0]?.label || '1 Month'}</option>
                        </select>
                        <span className="font-bold text-slate-800">₹0</span>
                        <button type="button" disabled className="text-slate-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Section 03: Country Boost */}
              {selectedAchievements.country && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  
                  {/* Skill Search Selection Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-violet-600 text-white font-bold text-xs rounded-full flex items-center justify-center shadow-md">03</div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">{t("Top in Country")}</h3>
                        <p className="text-xs text-slate-400">{t("Be visible at the top in selected countries.")}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">{t("Search Skill with AI")}</span>
                      <div className="w-full sm:w-64">
                        <SkillSearchSelect
                          options={allSkills}
                          selected={countrySkill}
                          onChange={(s) => setCountrySkill(s)}
                          placeholder={t("Search skill (e.g. UI/UX Design)")}
                          icon={Search}
                        />
                      </div>
                    </div>
                  </div>

                  {countrySkill ? (
                    <div>
                      {/* Selected Skill Pill */}
                      <div className="mb-4 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full animate-fade-in">
                        <span>{getInitials(countrySkill)}</span>
                        <span>{countrySkill}</span>
                        <button type="button" onClick={() => setCountrySkill('')} className="hover:text-red-700">
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Country Table */}
                      {countryItems.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <th className="py-3 px-4">{t("Country")}</th>
                                <th className="py-3 px-4">{t("Duration")}</th>
                                <th className="py-3 px-4">{t("Price")}</th>
                                <th className="py-3 px-4 w-12"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {countryItems.map(item => (
                                <tr key={item.id} className="text-sm">
                                  <td className="py-3 px-4 font-semibold text-slate-700">
                                    <GooglePlaceSearchInput
                                      type="country"
                                      value={item.country || ''}
                                      placeholder={item.isDraft ? 'Add your first country' : 'Search country to replace'}
                                      onSelect={(place) => handleAddCountry(item.id, place)}
                                    />
                                    {item.formattedAddress && (
                                      <span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs mt-1">{item.formattedAddress}</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      value={item.durationMonths}
                                      onChange={(e) => handleCountryItemChange(item.id, 'durationMonths', e.target.value)}
                                      className="bg-transparent font-medium text-slate-700 outline-none border border-slate-200 rounded px-2 py-1 text-xs"
                                    >
                                      {durationsConfig.country?.map(d => (
                                        <option key={d.months} value={d.months}>{d.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-3 px-4 font-bold text-slate-800">
                                    ₹{item.price}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCountry(item.id)}
                                      className="text-slate-300 hover:text-red-700 transition"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">{t("Select a skill first.")}</div>
                      )}

                      {countryItems.some(item => item.placeId) && (
                        <button
                          type="button"
                          onClick={() => addDraftRow('country')}
                          className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-violet-700 hover:text-violet-900"
                        >
                          <Plus className="w-3.5 h-3.5" />{t("Add Another Country")}</button>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div />
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-400">{t("Country Total")}</span>
                          <span className="font-extrabold text-violet-700 text-lg">₹{countryItems.reduce((a, b) => a + b.price, 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <div className="bg-slate-50/50 border-b border-slate-100 grid grid-cols-[1.6fr_0.9fr_0.5fr_40px] gap-3 px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>{t("Country")}</span>
                        <span>{t("Duration")}</span>
                        <span>{t("Price")}</span>
                        <span />
                      </div>
                      <div className="grid grid-cols-[1.6fr_0.9fr_0.5fr_40px] gap-3 px-4 py-4 items-center bg-white">
                        <div>
                          <div className="font-semibold text-slate-700">{t("Add your first country")}</div>
                          <div className="text-[10px] text-slate-400">{t("Search a country above to populate this row")}</div>
                        </div>
                        <select disabled className="bg-slate-50 text-slate-400 outline-none border border-slate-200 rounded-lg px-2 py-2 text-xs">
                          <option>{durationsConfig.country?.[0]?.label || '1 Month'}</option>
                        </select>
                        <span className="font-bold text-slate-800">₹0</span>
                        <button type="button" disabled className="text-slate-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Add Another Skill Button */}
            <button
              type="button"
              onClick={() => toast.success('You can configure combinations dynamically above. Add skills or items inside Locality, City, or Country sections.')}
              className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 rounded-3xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 bg-white shadow-sm"
            >
              <Plus className="w-4 h-4" />{t("Add Another Skill / Combination")}</button>

            {/* AI Smart Tip Bar */}
            <div className="bg-violet-50 border border-violet-100 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-violet-600 text-white rounded-full p-2.5 shadow-md shrink-0 animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs text-violet-800 block">{t("AI Smart Tip")}</span>
                  <span className="text-xs text-slate-500">{t(
                    "Mixing longer durations with shorter trial periods helps improve visibility and budget efficiency."
                  )}</span>
                </div>
              </div>
              <button 
                onClick={() => toast.success('Smart plans bundle multiple locales and categories to provide maximum rotation exposure.')}
                className="text-xs font-extrabold text-violet-700 hover:text-violet-900 transition shrink-0"
              >{t("View Details →")}</button>
            </div>

          </div>

          {/* Right Summary Column */}
          <div className="space-y-6 lg:sticky lg:top-6">
            
            {/* Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6">
              
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-violet-600" />{t("Your Plan Summary")}</h2>
                {pricingLoading && (
                  <RefreshCw className="w-4 h-4 text-violet-600 animate-spin" />
                )}
                <button
                  onClick={handleClearAll}
                  className="text-xs font-extrabold text-red-700 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />{t("Clear All")}</button>
              </div>

              {/* Items Breakdown list */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1 mb-6">
                
                {/* Multiple Skills list in summary */}
                {selectedAchievements.multipleSkills && multipleSkillsList.length > 0 && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm animate-fade-in">
                    <div className="w-full flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100 text-left font-bold text-slate-700 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-violet-100 text-violet-700 w-6 h-6 rounded-lg flex items-center justify-center font-bold">{t("MS")}</span>
                        <span>{t("Multiple Skills")}</span>
                      </div>
                      <span className="bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded animate-fade-in">
                        {multipleSkillsList.length}{t("Skill")}{multipleSkillsList.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="p-3 bg-white space-y-1.5 text-xs animate-fade-in flex flex-wrap gap-1.5">
                      {multipleSkillsList.map(skill => (
                        <span key={skill} className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 animate-fade-in">
                          {skill}
                          <button
                            type="button"
                            onClick={() => {
                              setMultipleSkillsList(multipleSkillsList.filter(s => s !== skill));
                              toast.success('Skill removed.');
                            }}
                            className="text-slate-400 hover:text-red-700 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Locality items list in summary */}
                {selectedAchievements.locality && localitySkill && localityItems.some(item => item.placeId) && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setExpandedSummary(e => ({ ...e, locality: !e.locality }))}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100 text-left font-bold text-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-lg flex items-center justify-center font-bold">
                          {getInitials(localitySkill)}
                        </span>
                        <span className="truncate max-w-30">{localitySkill}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">₹{localityItems.filter(item => item.placeId).reduce((a,b)=>a+b.price,0)}</span>
                        {expandedSummary.locality ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    
                    {expandedSummary.locality && (
                      <div className="p-3 bg-white space-y-2 text-xs divide-y divide-slate-50 animate-fade-in">
                        {localityItems.map(item => (
                          <div key={item.id} className="pt-2 flex justify-between items-start gap-4">
                            <div>
                              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-pink-500 shrink-0" /> <span className="truncate max-w-35">{item.locality}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 ml-4.5">{item.durationMonths}{t("Months")}</span>
                            </div>
                            <span className="font-bold text-slate-600">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* City items list in summary */}
                {selectedAchievements.city && citySkill && cityItems.some(item => item.placeId) && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setExpandedSummary(e => ({ ...e, city: !e.city }))}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100 text-left font-bold text-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-lg flex items-center justify-center font-bold">
                          {getInitials(citySkill)}
                        </span>
                        <span className="truncate max-w-30">{citySkill}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">₹{cityItems.filter(item => item.placeId).reduce((a,b)=>a+b.price,0)}</span>
                        {expandedSummary.city ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    
                    {expandedSummary.city && (
                      <div className="p-3 bg-white space-y-2 text-xs divide-y divide-slate-50 animate-fade-in">
                        {cityItems.map(item => (
                          <div key={item.id} className="pt-2 flex justify-between items-start gap-4">
                            <div>
                              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 text-blue-500 shrink-0" /> <span className="truncate max-w-35">{item.city}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 ml-4.5">
                                {item.isTrial ? '1 Month (Trial)' : `${item.durationMonths} Month${item.durationMonths > 1 ? 's' : ''}`}
                              </span>
                            </div>
                            <span className="font-bold text-slate-600">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Country items list in summary */}
                {selectedAchievements.country && countrySkill && countryItems.some(item => item.placeId) && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setExpandedSummary(e => ({ ...e, country: !e.country }))}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100 text-left font-bold text-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-lg flex items-center justify-center font-bold">
                          {getInitials(countrySkill)}
                        </span>
                        <span className="truncate max-w-30">{countrySkill}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">₹{countryItems.filter(item => item.placeId).reduce((a,b)=>a+b.price,0)}</span>
                        {expandedSummary.country ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    
                    {expandedSummary.country && (
                      <div className="p-3 bg-white space-y-2 text-xs divide-y divide-slate-50 animate-fade-in">
                        {countryItems.map(item => (
                          <div key={item.id} className="pt-2 flex justify-between items-start gap-4">
                            <div>
                              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-emerald-500 shrink-0" /> <span className="truncate max-w-35">{item.country}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 ml-4.5">{item.durationMonths}{t("Months")}</span>
                            </div>
                            <span className="font-bold text-slate-600">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(!hasSelectedItems) && (
                  <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">{t("No custom plan items selected yet.")}</div>
                )}

              </div>

              {/* Dynamic Calculations */}
              <div className="space-y-3.5 pt-4 border-t border-slate-100 text-sm">
                
                <div className="flex justify-between text-slate-500">
                  <span>{t("Subtotal")}</span>
                  <span className="font-bold text-slate-700">₹{pricingBreakdown.subtotal.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="flex justify-between text-slate-500">
                  <span className="flex items-center gap-1.5">{t("GST (")}{pricingBreakdown.gstPercent || 18}%) 
                    <button type="button" onClick={() => toast.info(`Goods and Services Tax of ${pricingBreakdown.gstPercent || 18}% is applicable on digital advertising visibility services.`)} className="text-slate-400 hover:text-slate-600">
                      ⓘ
                    </button>
                  </span>
                  <span className="font-bold text-slate-700">₹{pricingBreakdown.gstAmount.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="flex justify-between items-end pt-3 border-t border-slate-50">
                  <span className="font-black text-slate-800">{t("Total Amount")}</span>
                  <span className="font-black text-violet-700 text-2xl">
                    {pricingLoading ? (
                      <span className="text-xs text-violet-400 animate-pulse font-normal">{t("Recalculating...")}</span>
                    ) : (
                      `₹${pricingBreakdown.totalAmount.toLocaleString('en-IN')}`
                    )}
                  </span>
                </div>

              </div>

              {/* Smart Plan Promo Ticket Banner */}
              {pricingBreakdown.subtotal > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 mt-6">
                  <div className="bg-emerald-600 text-white rounded-full p-1.5 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-50 bg-emerald-600 rounded-full" />
                  </div>
                  <span className="text-xs font-bold text-emerald-800">{t("You Save")}<span className="underline">₹{pricingBreakdown.savingsAmount?.toLocaleString('en-IN')}</span>{t("with this smart plan")}</span>
                </div>
              )}

              {/* Proceed Button */}
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={proceedDisabled}
                className="w-full bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:from-violet-400 disabled:to-indigo-400 text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-violet-200 mt-6 flex items-center justify-center gap-2 text-base"
              >
                {checkoutLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{t("Processing...")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("Proceed to Payment")}</span>
                    <span>→</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-slate-300" />{t("Secure & Safe Payments")}</div>

            </div>

            {/* Bottom mini-footer inside right panel */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4 text-xs font-bold text-slate-500">
              
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-violet-600 mt-0.5" />
                <div>
                  <h4 className="text-slate-700 text-xs font-extrabold">{t("Secure Payments")}</h4>
                  <p className="text-[10px] font-normal text-slate-400">{t("100% safe & secure transaction")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-violet-600 mt-0.5" />
                <div>
                  <h4 className="text-slate-700 text-xs font-extrabold">{t("Instant Activation")}</h4>
                  <p className="text-[10px] font-normal text-slate-400">{t("Boosts apply automatically")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <RefreshCw className="w-4 h-4 text-violet-600 mt-0.5" />
                <div>
                  <h4 className="text-slate-700 text-xs font-extrabold">{t("Cancel Anytime")}</h4>
                  <p className="text-[10px] font-normal text-slate-400">{t("Refund within 24 hours")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-violet-600 mt-0.5" />
                <div>
                  <h4 className="text-slate-700 text-xs font-extrabold">{t("Best Price Guarantee")}</h4>
                  <p className="text-[10px] font-normal text-slate-400">{t("Get maximum rotation value")}</p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default CustomPlan;
