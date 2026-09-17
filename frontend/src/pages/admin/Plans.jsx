import { useState, useEffect } from 'react';
import { HiPlus, HiPencil, HiTrash, HiX, HiCheck, HiStar } from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useLocale } from '../../context/LocaleContext';

const emptyPlan = {
  name: '',
  slug: '',
  type: 'provider',
  price: '',
  duration: 30,
  features: [''],
  maxSkills: 10,
  boostWeight: 1,
  unlockCredits: 0,
  isActive: true,
  showOnLandingPage: false,
  availableCountries: [],
  countryPricing: [],
  aiLimits: {
    // Limits will be undefined by default
  }
};
const PLAN_TIERS = [
  { label: 'Basic', slug: 'basic' },
  { label: 'Pro', slug: 'pro' },
  { label: 'Max', slug: 'max' },
];
const DURATION_OPTIONS = [
  { label: 'Monthly', value: 30 },
  { label: '3 Monthly', value: 90 },
  { label: 'Annually', value: 365 },
];
const DURATION_LABEL_BY_VALUE = {
  30: 'Monthly',
  90: '3 Monthly',
  365: 'Annually'
};
const TIER_ORDER = { basic: 0, pro: 1, max: 2 };

const SEED_COUNTRY_CURRENCIES = {
  IN: { name: "India", currency: "INR", symbol: "₹", tax: 18, taxName: "GST" },
  US: { name: "United States", currency: "USD", symbol: "$", tax: 0, taxName: "Sales Tax" },
  CA: { name: "Canada", currency: "CAD", symbol: "C$", tax: 0, taxName: "Sales Tax" },
  GB: { name: "United Kingdom", currency: "GBP", symbol: "£", tax: 20, taxName: "VAT" },
  AU: { name: "Australia", currency: "AUD", symbol: "A$", tax: 10, taxName: "GST" },
  DE: { name: "Germany", currency: "EUR", symbol: "€", tax: 19, taxName: "VAT" },
  FR: { name: "France", currency: "EUR", symbol: "€", tax: 20, taxName: "VAT" },
  AE: { name: "United Arab Emirates", currency: "AED", symbol: "د.إ", tax: 5, taxName: "VAT" },
  SA: { name: "Saudi Arabia", currency: "SAR", symbol: "ر.स", tax: 15, taxName: "VAT" },
  SG: { name: "Singapore", currency: "SGD", symbol: "S$", tax: 9, taxName: "GST" },
  MY: { name: "Malaysia", currency: "MYR", symbol: "RM", tax: 6, taxName: "SST" },
  BD: { name: "Bangladesh", currency: "BDT", symbol: "৳", tax: 15, taxName: "VAT" },
  PK: { name: "Pakistan", currency: "PKR", symbol: "₨", tax: 17, taxName: "GST" },
  NP: { name: "Nepal", currency: "NPR", symbol: "₨", tax: 13, taxName: "VAT" },
  LK: { name: "Sri Lanka", currency: "LKR", symbol: "₨", tax: 15, taxName: "VAT" },
  NG: { name: "Nigeria", currency: "NGN", symbol: "₦", tax: 7.5, taxName: "VAT" },
  ZA: { name: "South Africa", currency: "ZAR", symbol: "R", tax: 15, taxName: "VAT" },
  KE: { name: "Kenya", currency: "KES", symbol: "KSh", tax: 16, taxName: "VAT" },
  GH: { name: "Ghana", currency: "GHS", symbol: "GH₵", tax: 15, taxName: "VAT" },
  EG: { name: "Egypt", currency: "EGP", symbol: "E£", tax: 14, taxName: "VAT" },
  QA: { name: "Qatar", currency: "QAR", symbol: "ر.ق", tax: 0, taxName: "Sales Tax" },
  KW: { name: "Kuwait", currency: "KWD", symbol: "د.ك", tax: 0, taxName: "Sales Tax" },
  BH: { name: "Bahrain", currency: "BHD", symbol: ".د.ب", tax: 10, taxName: "VAT" },
  OM: { name: "Oman", currency: "OMR", symbol: "ر.ع.", tax: 5, taxName: "VAT" },
  JP: { name: "Japan", currency: "JPY", symbol: "¥", tax: 10, taxName: "Consumption Tax" },
  CN: { name: "China", currency: "CNY", symbol: "¥", tax: 13, taxName: "VAT" },
  KR: { name: "South Korea", currency: "KRW", symbol: "₩", tax: 10, taxName: "VAT" },
  ID: { name: "Indonesia", currency: "IDR", symbol: "Rp", tax: 11, taxName: "VAT" },
  PH: { name: "Philippines", currency: "PHP", symbol: "₱", tax: 12, taxName: "VAT" },
  TH: { name: "Thailand", currency: "THB", symbol: "฿", tax: 7, taxName: "VAT" },
  VN: { name: "Vietnam", currency: "VND", symbol: "₫", tax: 10, taxName: "VAT" },
  MM: { name: "Myanmar", currency: "MMK", symbol: "K", tax: 5, taxName: "Commercial Tax" },
  KH: { name: "Cambodia", currency: "KHR", symbol: "៛", tax: 10, taxName: "VAT" },
  IT: { name: "Italy", currency: "EUR", symbol: "€", tax: 22, taxName: "IVA" },
  ES: { name: "Spain", currency: "EUR", symbol: "€", tax: 21, taxName: "IVA" },
  NL: { name: "Netherlands", currency: "EUR", symbol: "€", tax: 21, taxName: "BTW" },
  SE: { name: "Sweden", currency: "SEK", symbol: "kr", tax: 25, taxName: "Moms" },
  NO: { name: "Norway", currency: "NOK", symbol: "kr", tax: 25, taxName: "MVA" },
  CH: { name: "Switzerland", currency: "CHF", symbol: "CHF", tax: 8.1, taxName: "MWST" },
  RU: { name: "Russia", currency: "RUB", symbol: "₽", tax: 20, taxName: "VAT" },
  BR: { name: "Brazil", currency: "BRL", symbol: "R$", tax: 0, taxName: "ICMS" },
  MX: { name: "Mexico", currency: "MXN", symbol: "$", tax: 16, taxName: "IVA" },
  AR: { name: "Argentina", currency: "ARS", symbol: "$", tax: 21, taxName: "IVA" },
  CL: { name: "Chile", currency: "CLP", symbol: "$", tax: 19, taxName: "IVA" },
  CO: { name: "Colombia", currency: "COP", symbol: "$", tax: 19, taxName: "IVA" },
  NZ: { name: "New Zealand", currency: "NZD", symbol: "$", tax: 15, taxName: "GST" },
  TR: { name: "Turkey", currency: "TRY", symbol: "₺", tax: 20, taxName: "KDV" },
  IR: { name: "Iran", currency: "IRR", symbol: "﷼", tax: 9, taxName: "VAT" },
  IQ: { name: "Iraq", currency: "IQD", symbol: "ع.د", tax: 0, taxName: "Sales Tax" },
  IL: { name: "Israel", currency: "ILS", symbol: "₪", tax: 17, taxName: "VAT" },
  PL: { name: "Poland", currency: "PLN", symbol: "zł", tax: 23, taxName: "VAT" },
  UA: { name: "Ukraine", currency: "UAH", symbol: "₴", tax: 20, taxName: "VAT" },
  RO: { name: "Romania", currency: "RON", symbol: "lei", tax: 19, taxName: "TVA" },
  HU: { name: "Hungary", currency: "HUF", symbol: "Ft", tax: 27, taxName: "ÁFA" },
  PT: { name: "Portugal", currency: "EUR", symbol: "€", tax: 23, taxName: "IVA" },
  CZ: { name: "Czech Republic", currency: "CZK", symbol: "Kč", tax: 21, taxName: "DPH" },
  AT: { name: "Austria", currency: "EUR", symbol: "€", tax: 20, taxName: "MwSt." },
  BE: { name: "Belgium", currency: "EUR", symbol: "€", tax: 21, taxName: "BTW" },
  DK: { name: "Denmark", currency: "DKK", symbol: "kr.", tax: 25, taxName: "Moms" },
  FI: { name: "Finland", currency: "EUR", symbol: "€", tax: 24, taxName: "ALV" },
  GR: { name: "Greece", currency: "EUR", symbol: "€", tax: 24, taxName: "FPA" },
  ZW: { name: "Zimbabwe", currency: "ZWG", symbol: "ZiG", tax: 15, taxName: "VAT" },
  ET: { name: "Ethiopia", currency: "ETB", symbol: "Br", tax: 15, taxName: "VAT" },
  TZ: { name: "Tanzania", currency: "TZS", symbol: "TSh", tax: 18, taxName: "VAT" },
  UG: { name: "Uganda", currency: "UGX", symbol: "USh", tax: 18, taxName: "VAT" },
  MA: { name: "Morocco", currency: "MAD", symbol: "د.م.", tax: 20, taxName: "TVA" },
  DZ: { name: "Algeria", currency: "DZD", symbol: "د.ج", tax: 19, taxName: "TVA" },
  TN: { name: "Tunisia", currency: "TND", symbol: "د.ت", tax: 19, taxName: "TVA" },
  LY: { name: "Libya", currency: "LYD", symbol: "ل.د", tax: 0, taxName: "Sales Tax" },
  SD: { name: "Sudan", currency: "SDG", symbol: "ج.स.", tax: 17, taxName: "VAT" },
  SN: { name: "Senegal", currency: "XOF", symbol: "CFA", tax: 18, taxName: "TVA" },
  CM: { name: "Cameroon", currency: "XAF", symbol: "FCFA", tax: 19.25, taxName: "TVA" },
  CI: { name: "Ivory Coast", currency: "XOF", symbol: "CFA", tax: 18, taxName: "TVA" },
  MU: { name: "Mauritius", currency: "MUR", symbol: "₨", tax: 15, taxName: "VAT" },
  MV: { name: "Maldives", currency: "MVR", symbol: ".ރ", tax: 8, taxName: "GST" },
  AF: { name: "Afghanistan", currency: "AFN", symbol: "؋", tax: 4, taxName: "BRT" }
};

const FALLBACK_COUNTRIES_CURRENCIES = Object.entries(SEED_COUNTRY_CURRENCIES).map(([code, info]) => ({
  countryCode: code,
  countryName: info.name,
  currency: info.currency,
  currencySymbol: info.symbol,
  defaultTaxName: info.taxName,
  defaultTaxPercent: info.tax
})).sort((a, b) => a.countryName.localeCompare(b.countryName));

const AdminPlans = () => {
  const { formatPrice } = useLocale();
  const [plans, setPlans] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({ ...emptyPlan });
  const [deleteModal, setDeleteModal] = useState({ open: false, planId: null, planName: '' });

  useEffect(() => {
    fetchPlans();
    fetchCountries();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await adminAPI.getPlans();
      setPlans(Array.isArray(data) ? data : data.plans || []);
    } catch (err) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://restcountries.com/v3.1/all?fields=name,cca2,currencies,flag"), {
        signal: AbortSignal.timeout(10000)
      });
      
      let apiCountries = [];
      if (res.ok) {
        const data = await res.json();
        
        if (Array.isArray(data)) {
          apiCountries = data
            .filter(c => c.cca2 && c.name?.common)
          .map(c => {
            const countryCode = c.cca2.toUpperCase();
            const countryName = c.name.common;
            
            // Try local metadata first
            const localMeta = SEED_COUNTRY_CURRENCIES[countryCode];
            let currency = 'USD';
            let currencySymbol = '$';
            let defaultTaxName = 'GST';
            let defaultTaxPercent = 0;
            
            if (localMeta) {
              currency = localMeta.currency;
              currencySymbol = localMeta.symbol;
              defaultTaxName = localMeta.taxName || 'GST';
              defaultTaxPercent = localMeta.tax !== undefined ? localMeta.tax : 0;
            } else if (c.currencies && typeof c.currencies === 'object') {
              const keys = Object.keys(c.currencies);
              if (keys.length > 0) {
                currency = keys[0].toUpperCase();
                currencySymbol = c.currencies[keys[0]].symbol || currency;
              }
            }
            
            return {
              countryCode,
              countryName,
              currency,
              currencySymbol,
              defaultTaxPercent
            };
          });
        } else {
          // Silently fallback if allorigins returns unexpected format
        }
      } else {
        throw new Error("RestCountries API returned non-ok status");
      }

      const { data: dbData } = await adminAPI.getCountries();
      const dbCountries = dbData?.countries || [];
      const dbMap = new Map(dbCountries.map(c => [c.countryCode.toUpperCase(), c]));

      const processedCodes = new Set();
      let mergedList = apiCountries.map(item => {
        processedCodes.add(item.countryCode);
        const dbItem = dbMap.get(item.countryCode);
        if (dbItem) {
          return {
            ...item,
            currency: dbItem.currency || item.currency,
            currencySymbol: dbItem.currencySymbol || item.currencySymbol,
            defaultTaxName: dbItem.defaultTaxName || item.defaultTaxName,
            defaultTaxPercent: dbItem.defaultTaxPercent !== undefined ? dbItem.defaultTaxPercent : item.defaultTaxPercent
          };
        }
        return item;
      });

      dbCountries.forEach(dbItem => {
        const code = dbItem.countryCode.toUpperCase();
        if (!processedCodes.has(code)) {
          mergedList.push({
            countryCode: code,
            countryName: dbItem.countryName,
            currency: dbItem.currency,
            currencySymbol: dbItem.currencySymbol,
            defaultTaxName: dbItem.defaultTaxName || 'GST',
            defaultTaxPercent: dbItem.defaultTaxPercent !== undefined ? dbItem.defaultTaxPercent : 0
          });
        }
      });

      mergedList.sort((a, b) => a.countryName.localeCompare(b.countryName));
      setCountriesList(mergedList);
    } catch (err) {
      console.error('Failed to load countries via REST API, using fallback list', err);
      try {
        const { data: dbData } = await adminAPI.getCountries();
        const dbCountries = dbData?.countries || [];
        const dbMap = new Map(dbCountries.map(c => [c.countryCode.toUpperCase(), c]));

        let mergedList = FALLBACK_COUNTRIES_CURRENCIES.map(item => {
          const dbItem = dbMap.get(item.countryCode);
          if (dbItem) {
            return {
              ...item,
              currency: dbItem.currency || item.currency,
              currencySymbol: dbItem.currencySymbol || item.currencySymbol,
              defaultTaxName: dbItem.defaultTaxName || item.defaultTaxName,
              defaultTaxPercent: dbItem.defaultTaxPercent !== undefined ? dbItem.defaultTaxPercent : item.defaultTaxPercent
            };
          }
          return item;
        });

        const fallbackCodes = new Set(FALLBACK_COUNTRIES_CURRENCIES.map(c => c.countryCode));
        dbCountries.forEach(dbItem => {
          const code = dbItem.countryCode.toUpperCase();
          if (!fallbackCodes.has(code)) {
            mergedList.push({
              countryCode: code,
              countryName: dbItem.countryName,
              currency: dbItem.currency,
              currencySymbol: dbItem.currencySymbol,
              defaultTaxName: dbItem.defaultTaxName || 'GST',
              defaultTaxPercent: dbItem.defaultTaxPercent !== undefined ? dbItem.defaultTaxPercent : 0
            });
          }
        });

        mergedList.sort((a, b) => a.countryName.localeCompare(b.countryName));
        setCountriesList(mergedList);
      } catch (dbErr) {
        console.error('Failed to load from DB in fallback', dbErr);
        setCountriesList(FALLBACK_COUNTRIES_CURRENCIES);
      }
    }
  };

  const openCreate = () => { setEditingPlan(null); setForm({ ...emptyPlan }); setShowForm(true); };
  const openEdit = (plan) => {
    const isPaidTier = ['starter', 'business', 'enterprise'].includes(plan.slug);
    const target = isPaidTier && Number(plan.duration) !== 30
      ? (plans.find((p) => p.type === plan.type && p.slug === plan.slug && Number(p.duration) === 30) || plan)
      : plan;

    setEditingPlan(target);
    setForm({
      name: target.name || '',
      slug: target.slug || '',
      type: target.type || 'provider',
      price: target.price || '',
      duration: target.duration || 30,
      features: target.features?.length ? [...target.features] : [''],
      maxSkills: target.maxSkills || 10,
      boostWeight: target.boostWeight || 1,
      unlockCredits: target.unlockCredits || 0,
      isActive: target.isActive !== false,
      showOnLandingPage: target.showOnLandingPage === true,
      availableCountries: target.availableCountries || [],
      countryPricing: target.countryPricing || [],
      aiLimits: target.aiLimits ? { ...target.aiLimits } : { ...emptyPlan.aiLimits },
    });
    setShowForm(true);
  };

  const addFeature = () => setForm(f => ({ ...f, features: [...f.features, ''] }));
  const removeFeature = (i) => setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  const updateFeature = (i, val) => setForm(f => ({ ...f, features: f.features.map((v, idx) => idx === i ? val : v) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.slug) {
      toast.error('Please select a plan tier');
      return;
    }
    if (!DURATION_OPTIONS.some((opt) => opt.value === Number(form.duration))) {
      toast.error('Duration must be Monthly, 3 Monthly, or Annually');
      return;
    }

    const isPaidTier = ['starter', 'business', 'enterprise', 'basic', 'pro', 'featured'].includes(form.slug);
    const isMonthly = Number(form.duration) === 30;

    if (isPaidTier && Number(form.price) <= 0) {
      toast.error('Paid plan price must be greater than 0');
      return;
    }

    if (isPaidTier && !isMonthly) {
      toast.error('Set monthly price only. Other billing categories auto-calculate from discounts.');
      return;
    }

    // Validate countryPricing entries
    const seenCountries = new Set();
    for (const cp of form.countryPricing) {
      if (!cp.countryCode) {
        toast.error('Please select a country for all pricing entries');
        return;
      }
      if (seenCountries.has(cp.countryCode)) {
        toast.error(`Duplicate pricing entry for country code: ${cp.countryCode}`);
        return;
      }
      seenCountries.add(cp.countryCode);

      if (Number(cp.basePrice) < 0 || Number(cp.discountedPrice) < 0 || Number(cp.taxPercent) < 0) {
        toast.error('Prices and tax percentages must be greater than or equal to 0');
        return;
      }
    }

    const payload = {
      ...form,
      price: Number(form.price),
      features: form.features.filter(f => f.trim()),
      slug: form.slug,
      availableCountries: form.availableCountries,
      countryPricing: form.countryPricing.map(cp => ({
        ...cp,
        basePrice: Number(cp.basePrice),
        discountedPrice: Number(cp.discountedPrice),
        taxPercent: Number(cp.taxPercent)
      }))
    };

    if (payload.type === 'provider') {
      payload.maxSkills = 50;
      payload.boostWeight = 50;
      
      const hiddenProviderFeatures = [
        'chatAssistant', 'aiCareerAnalysis', 'atsScore', 'skillGapReport', 
        'whyNotHired', 'interviewCallProb', 'resumeImprovement', 'careerGps', 
        'salaryInsights', 'mockInterview', 'careerHealth', 'refreshInsight', 
        'careerReport', 'claudeDeepReports'
      ];
      
      payload.aiLimits = payload.aiLimits || {};
      hiddenProviderFeatures.forEach(key => {
        payload.aiLimits[key] = 50;
      });
    }
    try {
      if (editingPlan) {
        await adminAPI.updatePlan(editingPlan._id, payload);
        toast.success('Plan updated');
      } else {
        await adminAPI.createPlan(payload);
        toast.success('Plan created');
      }
      setShowForm(false);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    }
  };

  const handleDeleteClick = (plan) => {
    setDeleteModal({
      open: true,
      planId: plan._id,
      planName: plan.name,
    });
  };

  const confirmDelete = async () => {
    const { planId } = deleteModal;
    if (!planId) return;
    try {
      await adminAPI.deletePlan(planId);
      toast.success('Plan deleted');
      fetchPlans();
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setDeleteModal({ open: false, planId: null, planName: '' });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const providerPlans = plans.filter(p => p.type === 'provider');
  const recruiterPlans = plans.filter(p => p.type === 'recruiter');

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plan Management</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">
          <HiPlus className="w-5 h-5" /> New Plan
        </button>
      </div>

      {/* Plan Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm">
                    <option value="provider">Provider</option>
                    <option value="recruiter">Recruiter</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (Base / Default)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    disabled={['starter', 'business', 'enterprise'].includes(form.slug) && Number(form.duration) !== 30}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" />
                  {['starter', 'business', 'enterprise'].includes(form.slug) && Number(form.duration) !== 30 && (
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated from monthly base price using configured discounts.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Category</label>
                  <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                    disabled={['starter', 'business', 'enterprise'].includes(form.slug)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm">
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Tier</label>
                <select
                  value={form.slug}
                  onChange={e => {
                    const tier = PLAN_TIERS.find((item) => item.slug === e.target.value);
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value,
                      duration: ['starter', 'business', 'enterprise'].includes(e.target.value) ? 30 : f.duration,
                      name: tier ? tier.label : f.name,
                    }));
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Select plan tier</option>
                  {PLAN_TIERS.map((tier) => (
                    <option key={tier.slug} value={tier.slug}>{tier.label}</option>
                  ))}
                  {form.slug && !PLAN_TIERS.some(t => t.slug === form.slug) && (
                    <option value={form.slug}>{form.slug} (Current)</option>
                  )}
                </select>
              </div>


              {form.type === 'provider' && (
                <>
                  {/* AI Limits Section - Page Wise */}
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mt-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-purple-900 flex items-center gap-2">
                        <HiStar className="w-4 h-4 text-purple-600" />
                        AI Feature Limits (-1 for unlimited)
                      </h3>
                      <div className="text-sm font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                        Est. Cost: $
                        {(() => {
                          const features = [
                            'resumeOptimization', 'careerHealthRefresh', 'interviewQuestionsRefresh', 'careerGpsRefresh',
                            'whyNotHiredRefresh', 'skillGapRefresh', 'atsOptimizerRefresh', 'chatMessagesLimit',
                            'dailyTasksRefresh', 'careerPlanRefresh', 'resourcesRefresh', 'progressRefresh',
                            'aiTipsRefresh', 'resumeScoreRefresh', 'autoAnalysisLimit'
                          ];
                          let totalCredits = 0;
                          let hasUnlimited = false;
                          features.forEach(f => {
                            const val = form.aiLimits?.[f] || 0;
                            if (val === -1) hasUnlimited = true;
                            else if (val > 0) totalCredits += val;
                          });
                          if (hasUnlimited) return "Unlimited (Varies)";
                          return '₹' + (totalCredits * 0.42).toFixed(2);
                        })()}
                        <span className="text-xs text-purple-500 font-normal ml-1">(@ ₹0.42/credit)</span>
                      </div>
                    </div>
                    
                    {[
                      { page: 'Profile', features: [ { key: 'resumeOptimization', label: 'AI Optimize Resume' }, { key: 'autoAnalysisLimit', label: 'Profile Auto-Analysis' } ] },
                      { page: 'Career Health', features: [ { key: 'careerHealthRefresh', label: 'Refresh Insights' } ] },
                      { page: 'Grow With AI', features: [ 
                          { key: 'interviewQuestionsRefresh', label: 'Interview Questions' },
                          { key: 'careerGpsRefresh', label: 'AI Career GPS' },
                          { key: 'whyNotHiredRefresh', label: 'Why Not Hired' },
                          { key: 'skillGapRefresh', label: 'Skill Gap Report' },
                          { key: 'atsOptimizerRefresh', label: 'ATS Optimizer' }
                      ] },
                      { page: 'AI Career Coach', features: [
                          { key: 'chatMessagesLimit', label: 'Chat Messages Limit' },
                          { key: 'dailyTasksRefresh', label: 'Daily Tasks' },
                          { key: 'careerPlanRefresh', label: 'Career Plan' },
                          { key: 'resourcesRefresh', label: 'Resources' },
                          { key: 'progressRefresh', label: 'Progress' }
                      ] },
                      { page: 'AI Tips', features: [ { key: 'aiTipsRefresh', label: 'Refresh Insight' } ] },
                      { page: 'Resume Toolkit', features: [ { key: 'resumeScoreRefresh', label: 'Resume Score Refresh' } ] }
                    ].map((group, gIdx) => (
                      <div key={gIdx} className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                        <h4 className="font-semibold text-xs text-gray-800 mb-2 border-b pb-1">{group.page}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.features.map(field => {
                            const isEnabled = form.aiLimits?.[field.key] !== undefined;
                            return (
                              <div key={field.key} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border border-gray-100">
                                <input 
                                  type="checkbox" 
                                  checked={isEnabled}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setForm(f => ({
                                      ...f,
                                      aiLimits: { ...f.aiLimits, [field.key]: checked ? 0 : undefined }
                                    }));
                                  }}
                                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                />
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <span className="text-xs font-medium text-gray-700 truncate" title={field.label}>{field.label}</span>
                                  {isEnabled && (
                                    <input 
                                      type="number" min="-1" 
                                      value={form.aiLimits?.[field.key] !== undefined ? form.aiLimits[field.key] : 0} 
                                      onChange={e => {
                                        const val = e.target.value;
                                        setForm(f => ({ 
                                          ...f, 
                                          aiLimits: { ...f.aiLimits, [field.key]: val === "" ? "" : Number(val) } 
                                        }));
                                      }}
                                      className="w-16 px-1.5 py-1 text-xs border border-purple-300 rounded focus:ring-1 focus:ring-purple-500" 
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {form.type === 'recruiter' && (
                <>
                  {/* Recruiter Usage Limits Section */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                        <HiStar className="w-4 h-4 text-blue-600" />
                        Recruiter Feature Limits (-1 for unlimited)
                      </h3>
                      <div className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                        Est. AI Cost: 
                        {(() => {
                          const aiFeatures = [
                            'aiJdGenerator',
                            'aiJdParsing',
                            'aiCopilot',
                            'interviewKits',
                            'customReports'
                          ];
                          let totalCredits = 0;
                          let hasUnlimited = false;
                          
                          aiFeatures.forEach(key => {
                            const val = form.aiLimits?.[key] || 0;
                            if (val === -1) hasUnlimited = true;
                            else if (val > 0) totalCredits += val;
                          });

                          if (hasUnlimited) return " Unlimited (Varies)";
                          return ' ₹' + (totalCredits * 0.42).toFixed(2);
                        })()}
                        <span className="text-xs text-blue-500 font-normal ml-1">(@ ₹0.42/call)</span>
                      </div>
                    </div>

                    {[
                      { 
                        category: 'Core Allowances', 
                        features: [
                          { key: 'unlockCredits', label: 'Profile Unlock Credits', isTopLevel: true },
                          { key: 'jobPostLimit', label: 'Active Job Posts Limit' }
                        ]
                      },
                      { 
                        category: 'Job Sourcing & Boosts', 
                        features: [
                          { key: 'jobBoostJobsLimit', label: 'Total Jobs to Boost' },
                          { key: 'jobBoostDaysLimit', label: 'Total Boost Days' },
                          { key: 'outreachCampaigns', label: 'Outreach Campaigns' },
                          { key: 'directMessaging', label: 'Direct Messaging' }
                        ]
                      },
                      { 
                        category: 'AI Suite & Reports', 
                        features: [
                          { key: 'aiJdGenerator', label: 'AI JD Generator' },
                          { key: 'aiJdParsing', label: 'JD Parsing & Smart Match' },
                          { key: 'aiCopilot', label: 'AI Copilot Assistant' },
                          { key: 'interviewKits', label: 'AI Interview Kits' },
                          { key: 'customReports', label: 'Custom Data Reports' }
                        ]
                      }
                    ].map((group, gIdx) => (
                      <div key={gIdx} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                        <h4 className="font-semibold text-xs text-gray-800 mb-2 border-b pb-1">{group.category}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.features.map(field => {
                            const isEnabled = field.isTopLevel ? form[field.key] !== undefined : form.aiLimits?.[field.key] !== undefined;
                            
                            return (
                              <div key={field.key} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border border-gray-100">
                                <input 
                                  type="checkbox" 
                                  checked={isEnabled}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    if (field.isTopLevel) {
                                      setForm(f => ({ ...f, [field.key]: checked ? 0 : undefined }));
                                    } else {
                                      setForm(f => ({
                                        ...f,
                                        aiLimits: { ...f.aiLimits, [field.key]: checked ? 0 : undefined }
                                      }));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <span className="text-xs font-medium text-gray-700 truncate" title={field.label}>{field.label}</span>
                                  {isEnabled && (
                                    <input 
                                      type="number" min="-1" 
                                      value={field.isTopLevel ? (form[field.key] !== undefined ? form[field.key] : 0) : (form.aiLimits?.[field.key] !== undefined ? form.aiLimits[field.key] : 0)} 
                                      onChange={e => {
                                        const val = e.target.value;
                                        const numVal = val === "" ? "" : Number(val);
                                        if (field.isTopLevel) {
                                          setForm(f => ({ ...f, [field.key]: numVal }));
                                        } else {
                                          setForm(f => ({ 
                                            ...f, 
                                            aiLimits: { ...f.aiLimits, [field.key]: numVal } 
                                          }));
                                        }
                                      }}
                                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Active Status toggle removed as per admin rules */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showOnLandingPage} onChange={e => setForm(f => ({ ...f, showOnLandingPage: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-medium text-gray-700">Show on Landing Page</span>
                </label>
              </div>
              {/* Check plan limits for creation */}
              {!editingPlan && (() => {
                const addonSlugs = ['top-in-city', 'one-pincode-top', 'show-top-in-country', 'add-multiple-skills', 'whatsapp-alerts'];
                const providerCount = plans.filter(p => p.type === 'provider' && p.isActive && !addonSlugs.includes(p.slug)).length;
                const recruiterCount = plans.filter(p => p.type === 'recruiter' && p.isActive && !addonSlugs.includes(p.slug)).length;
                const atLimit = (form.type === 'provider' && providerCount >= 3) || (form.type === 'recruiter' && recruiterCount >= 3);
                return atLimit ? (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg mt-2 border border-red-100">
                    Maximum of 3 active plans allowed for {form.type}. You cannot create any more.
                  </div>
                ) : null;
              })()}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-sm text-gray-750">Cancel</button>
                <button 
                  type="submit" 
                  disabled={!editingPlan && (() => {
                    const addonSlugs = ['top-in-city', 'one-pincode-top', 'show-top-in-country', 'add-multiple-skills', 'whatsapp-alerts'];
                    const count = plans.filter(p => p.type === form.type && p.isActive && !addonSlugs.includes(p.slug)).length;
                    return count >= 3;
                  })()}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plans Display */}
      {(() => {
        const topPlanSlugs = ['top-in-city', 'one-pincode-top', 'show-top-in-country', 'add-multiple-skills', 'whatsapp-alerts'];
        const landingPlans = plans.filter(p => p.showOnLandingPage && !topPlanSlugs.includes(p.slug));
        const otherProviderPlans = plans.filter(p => p.type === 'provider' && !p.showOnLandingPage && !topPlanSlugs.includes(p.slug));
        const topPlans = plans.filter(p => topPlanSlugs.includes(p.slug));
        const otherRecruiterPlans = plans.filter(p => p.type === 'recruiter' && !p.showOnLandingPage);

        return (
          <>
            {landingPlans.length > 0 && (
              <div className="mb-10 bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <HiStar className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-gray-900">Landing Page Featured Plans</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {landingPlans.sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(plan => (
                    <PlanCard key={plan._id} plan={plan} formatPrice={formatPrice} openEdit={openEdit} handleDelete={handleDeleteClick} isLanding />
                  ))}
                </div>
              </div>
            )}

            {topPlans.length > 0 && (
              <div className="mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Top Plans (Add-ons)</h2>
                <div className="flex flex-col gap-3">
                  {topPlans.map(plan => (
                    <TopPlanRow key={plan._id} plan={plan} loadPlans={fetchPlans} />
                  ))}
                </div>
              </div>
            )}

            {[{ title: 'All Provider Plans', list: otherProviderPlans }, { title: 'All Recruiter Plans', list: otherRecruiterPlans }].map((section) => (
              <div key={section.title} className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{section.title}</h2>
                {section.list.length === 0 ? (
                  <p className="text-gray-500">No other plans yet</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.list
                      .slice()
                      .sort((a, b) => {
                        const byDuration = Number(a.duration || 0) - Number(b.duration || 0);
                        if (byDuration !== 0) return byDuration;
                        return (TIER_ORDER[a.slug] || 99) - (TIER_ORDER[b.slug] || 99);
                      })
                      .map((plan) => (
                        <PlanCard key={plan._id} plan={plan} formatPrice={formatPrice} openEdit={openEdit} handleDelete={handleDeleteClick} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        );
      })()}

      {/* Delete Confirm Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mx-auto mb-4">
              <HiTrash className="w-7 h-7 text-red-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Plan</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              Are you sure you want to permanently delete
            </p>
            <p className="text-sm font-semibold text-gray-800 text-center mb-4">
              &ldquo;{deleteModal.planName}&rdquo;?
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
              This will permanently remove the plan from the system. Users currently subscribed to this plan will remain subscribed, but new subscriptions or renewals will no longer be possible. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, planId: null, planName: '' })}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlanCard = ({ plan, formatPrice, openEdit, handleDelete, isLanding }) => (
  <div className={`bg-white rounded-2xl border-2 p-5 relative transition-all hover:shadow-md flex flex-col justify-between ${isLanding ? 'border-indigo-200 shadow-sm' : 'border-gray-100'}`}>
    <div>
      {isLanding && <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full font-bold uppercase tracking-wider">On Landing Page</span>}
      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-0.5">{plan.type} • {plan.slug}</p>
      
      {/* Default Base Price */}
      <p className="text-3xl font-bold text-indigo-600 mt-2">
        ₹{plan.price}
        <span className="text-sm text-gray-400 font-normal">/{DURATION_LABEL_BY_VALUE[plan.duration] || `${plan.duration}d`}</span>
      </p>

      {/* Configured Country Specific Pricing */}
      {plan.countryPricing && plan.countryPricing.length > 0 && (
        <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs space-y-1.5">
          <div className="flex justify-between items-center border-b border-gray-200/60 pb-1">
            <span className="font-bold text-gray-700">Country Pricing</span>
            <span className="text-[10px] bg-indigo-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
              {plan.countryPricing.filter(cp => cp.isActive).length} Active
            </span>
          </div>
          <div className="space-y-1 text-gray-700">
            {plan.countryPricing.map((cp, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span>{cp.countryName || cp.countryCode}:</span>
                <span className="font-bold text-gray-800">
                  {cp.currencySymbol || cp.currency || '₹'}{cp.discountedPrice > 0 ? cp.discountedPrice : cp.basePrice}
                  {cp.discountedPrice > 0 && (
                    <span className="text-[10px] text-gray-400 line-through ml-1">{cp.currencySymbol || cp.currency || '₹'}{cp.basePrice}</span>
                  )}
                  <span className="text-[10px] text-gray-400 font-normal ml-1">({cp.taxName || 'Tax'} {cp.taxPercent}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability restrictions */}
      {plan.availableCountries && plan.availableCountries.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-gray-500 font-bold">Available in:</span>
          {plan.availableCountries.map((code, idx) => (
            <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
              {code}
            </span>
          ))}
        </div>
      )}

      <ul className="mt-3 space-y-1 text-sm">
        {plan.features?.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-gray-700">
            <HiCheck className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> {f}
          </li>
        ))}
      </ul>
    </div>

    <div className="mt-4 space-y-2">
      {/* AI Limits Display */}
      {plan.aiLimits && Object.entries(plan.aiLimits).some(([_, val]) => val !== 0 && val !== undefined && val !== null) && (
        <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 text-xs">
          <div className="font-bold text-purple-900 border-b border-purple-200/60 pb-1 mb-1.5">Feature Limits</div>
          <div className="space-y-1 text-purple-800">
            {Object.entries(plan.aiLimits).map(([key, val]) => {
              if (val === 0 || val === undefined || val === null) return null;
              const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              return (
                <div key={key} className="flex justify-between items-center">
                  <span>{formattedKey}</span>
                  <span className="font-bold">{val === -1 ? 'Unlimited' : val}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {plan.type === 'recruiter' && plan.unlockCredits > 0 && (
        <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-block">
          Unlock Credits: {plan.unlockCredits}
        </div>
      )}
    </div>

    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
      <button onClick={() => openEdit(plan)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition text-sm font-medium">
        <HiPencil className="w-4 h-4" /> Edit
      </button>
      {String(plan.slug).toLowerCase() !== 'free' && (
        <button onClick={() => handleDelete(plan)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition text-sm font-medium">
          <HiTrash className="w-4 h-4" /> Delete
        </button>
      )}
    </div>
  </div>
);

const TopPlanRow = ({ plan, loadPlans }) => {
  const [price, setPrice] = useState(plan.price || plan.priceMonthly || 0);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await adminAPI.updatePlan(plan._id, { price: Number(price), priceMonthly: Number(price) });
      toast.success(`${plan.name} price updated successfully`);
      loadPlans();
    } catch (err) {
      toast.error('Failed to update price');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
      <div className="flex flex-col">
        <span className="font-bold text-gray-900 text-sm">{plan.name}</span>
        <span className="text-xs text-gray-500">{plan.slug}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
          <span className="px-3 text-gray-500 bg-gray-50 border-r border-gray-300 font-medium">₹</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 px-3 py-1.5 focus:outline-hidden"
            placeholder="Price"
          />
        </div>
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default AdminPlans;
