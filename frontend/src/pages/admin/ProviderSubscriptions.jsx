import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HiBriefcase, HiChevronDown, HiChevronLeft, HiChevronRight,
  HiChevronUp, HiDownload, HiFilter, HiRefresh, HiSearch,
  HiUsers, HiX, HiCheck, HiMail, HiPhone, HiExclamation,
  HiCheckCircle, HiClock, HiCash, HiTrendingUp, HiGlobe,
} from 'react-icons/hi';
import { adminAPI, unlockProfileAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const FilterDropdown = ({ label, icon: Icon, value, setValue, options, placeholder, fullWidth = false, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (searchTerm && !options.some(opt => opt.label.toLowerCase() === searchTerm.toLowerCase())) {
          setValue(searchTerm);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm, options, setValue]);

  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const displayValue = options.find(opt => opt.value === value)?.label || value;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'w-full sm:w-auto min-w-[150px]'}`} ref={wrapperRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center text-sm bg-white border rounded-xl px-3 py-2.5 transition whitespace-nowrap ${fullWidth ? 'w-full justify-between' : 'justify-between'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${isOpen && !disabled ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm' : 'border-gray-200 text-gray-700'}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {Icon && <Icon className="w-4 h-4 shrink-0 text-gray-400" />}
          <span className={`truncate ${value ? "text-gray-900 font-medium" : "text-gray-700"}`}>
            {displayValue || label}
          </span>
        </div>
        <HiChevronDown className={`w-4 h-4 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`} />
      </div>

      {isOpen && (
        <div className={`absolute z-50 top-full mt-1 left-0 w-full min-w-[160px] bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col`}>
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={placeholder || `Search...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const matched = filteredOptions.find(opt => opt.label.toLowerCase() === searchTerm.toLowerCase());
                  setValue(matched ? matched.value : searchTerm);
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
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer"
                  onClick={() => {
                    setValue(opt.value);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-gray-400 text-center font-medium">No match found</li>
            )}
            {value && (
              <li 
                className="px-3 py-2 text-sm text-red-700 hover:bg-red-50 cursor-pointer border-t border-gray-50 mt-1 font-medium"
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

const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CURRENCY = { INR: '₹', USD: '$', AED: 'د.إ', EUR: '€', GBP: '£', CAD: 'C$' };
const fmtMoney = (amount, currency = 'INR') => {
  const sym = CURRENCY[String(currency).toUpperCase()] || currency + ' ';
  return `${sym}${Number(amount || 0).toLocaleString('en-IN')}`;
};

const COUNTRIES = [
  { code: 'IN', name: 'India' }, { code: 'AE', name: 'UAE' },
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' }, { code: 'CA', name: 'Canada' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'last_7', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const resolvePresetDates = (preset) => {
  const now = new Date();
  const s = new Date(now), e = new Date(now);
  if (preset === 'today') { s.setHours(0,0,0,0); e.setHours(23,59,59,999); }
  else if (preset === 'last_7') { s.setDate(now.getDate()-6); s.setHours(0,0,0,0); }
  else if (preset === 'this_month') { s.setDate(1); s.setHours(0,0,0,0); }
  else if (preset === 'last_month') { s.setMonth(now.getMonth()-1,1); e.setDate(0); s.setHours(0,0,0,0); e.setHours(23,59,59,999); }
  else { s.setDate(now.getDate()-29); s.setHours(0,0,0,0); }
  return { startDate: s.toISOString().slice(0,10), endDate: e.toISOString().slice(0,10) };
};

const DEFAULT_FILTERS = {
  search: '', userType: '', planId: '', planCategory: '', duration: '',
  paymentStatus: '', subscriptionStatus: '', country: '', state: '', city: '',
  locality: '', referralType: '', referrer: '', amountMin: '', amountMax: '',
  datePreset: 'last_30', startDate: '', endDate: '',
  skill: '', serviceCategory: '', visibilityArea: '',
  hiringCategory: '', jobCategory: '', industry: '',
};

// ─── Badge Components ────────────────────────────────────────────────────────

const Badge = ({ children, variant = 'gray', size = 'sm' }) => {
  const styles = {
    gray:     'bg-gray-100 text-gray-700 border-gray-200',
    blue:     'bg-indigo-50 text-indigo-700 border-indigo-100',
    indigo:   'bg-indigo-50 text-indigo-700 border-indigo-100',
    purple:   'bg-purple-50 text-purple-700 border-purple-100',
    green:    'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:    'bg-amber-50 text-amber-700 border-amber-100',
    red:      'bg-red-50 text-red-700 border-red-100',
    slate:    'bg-slate-50 text-slate-500 border-slate-100',
  };
  const sz = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wide border rounded-full ${sz} ${styles[variant] || styles.gray}`}>
      {children}
    </span>
  );
};

const SubStatusBadge = ({ status }) => {
  const map = {
    active:          { variant: 'green',  label: 'Active' },
    expired:         { variant: 'amber',  label: 'Expired' },
    cancelled:       { variant: 'red',    label: 'Cancelled' },
    pending_payment: { variant: 'amber',  label: 'Pending' },
    paused:          { variant: 'slate',  label: 'Paused' },
  };
  const { variant, label } = map[status] || { variant: 'gray', label: status || '—' };
  return <Badge variant={variant}>{label}</Badge>;
};

const PayStatusBadge = ({ status }) => {
  const map = {
    paid:    { variant: 'green', label: 'Paid' },
    free:    { variant: 'blue',  label: 'Free' },
    pending: { variant: 'amber', label: 'Pending' },
    failed:  { variant: 'red',   label: 'Failed' },
    refunded:{ variant: 'slate', label: 'Refunded' },
  };
  const { variant, label } = map[status] || { variant: 'gray', label: status || '—' };
  return <Badge variant={variant}>{label}</Badge>;
};

const RoleBadge = ({ role }) => (
  <Badge variant={role === 'recruiter' ? 'indigo' : 'purple'} size="xs">
    {role === 'recruiter' ? <HiUsers className="w-3 h-3" /> : <HiBriefcase className="w-3 h-3" />}
    {role === 'recruiter' ? 'Recruiter' : 'Provider'}
  </Badge>
);

const SourceBadge = ({ type }) => {
  const map = {
    direct:         { variant: 'slate',  label: 'Direct' },
    partner:        { variant: 'indigo', label: 'Partner' },
    provider:       { variant: 'purple', label: 'Provider Ref' },
    recruiter:      { variant: 'blue',   label: 'Recruiter Ref' },
    admin_created:  { variant: 'amber',  label: 'Admin Created' },
  };
  const { variant, label } = map[type] || { variant: 'gray', label: type || 'Direct' };
  return <Badge variant={variant} size="xs">{label}</Badge>;
};

const CommissionBadge = ({ status }) => {
  const map = {
    pending:        { variant: 'amber', label: 'Pending' },
    approved:       { variant: 'blue',  label: 'Approved' },
    paid:           { variant: 'green', label: 'Paid' },
    cancelled:      { variant: 'red',   label: 'Cancelled' },
    not_applicable: { variant: 'slate', label: 'N/A' },
  };
  const { variant, label } = map[status] || { variant: 'gray', label: status || 'N/A' };
  return <Badge variant={variant} size="xs">{label}</Badge>;
};

// ─── Summary Card ────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, icon: Icon, color = 'indigo', sub }) => {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-600',
    green:  'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    blue:   'from-blue-500 to-blue-600',
    amber:  'from-amber-500 to-amber-600',
    red:    'from-red-500 to-red-600',
    slate:  'from-slate-400 to-slate-500',
  };
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start gap-3 shadow-xs hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${colors[color]} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 mt-0.5 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Reminder Modal ──────────────────────────────────────────────────────────

const ReminderModal = ({ selectedIds, onClose, onSent }) => {
  const [channel, setChannel] = useState('email');
  const [offerCode, setOfferCode] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (selectedIds.length === 0) return toast.error('No subscriptions selected');
    setSending(true);
    try {
      const { data } = await adminAPI.sendUserSubscriptionReminder({ subscriptionIds: selectedIds, channel, offerCode });
      const sent = data.results?.filter(r => r.status === 'sent').length || 0;
      const failed = data.results?.filter(r => r.status === 'failed' || r.status === 'skipped').length || 0;
      toast.success(`Reminders sent: ${sent}${failed ? `, skipped: ${failed}` : ''}`);
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Send Renewal Reminder</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition"><HiX className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-700 mb-4">
          Sending reminder to <strong>{selectedIds.length}</strong> subscription(s).
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Channel</label>
            <div className="flex gap-3">
              {['email', 'whatsapp'].map(c => (
                <button key={c} type="button" onClick={() => setChannel(c)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${channel === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}`}>
                  {c === 'email' ? '📧 Email' : '💬 WhatsApp'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Offer Code <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={offerCode} onChange={e => setOfferCode(e.target.value)}
              placeholder="e.g. RENEW20" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" />
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-xs text-amber-700"><strong>Note:</strong> Messages will be sent individually to each user based on their subscription type (provider or recruiter).</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} type="button" className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSend} disabled={sending} type="button"
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {sending ? 'Sending…' : `Send ${channel === 'email' ? 'Emails' : 'WhatsApp'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Analytics Breakdown Table ───────────────────────────────────────────────

const BreakdownTable = ({ title, rows, currency }) => {
  if (!rows || rows.length === 0) return (
    <div className="text-sm text-gray-400 py-4">No data available</div>
  );
  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
            <div className="flex-1 min-w-0">
              <span className="text-gray-700 font-medium truncate">{row.label || '—'}</span>
              <span className="ml-2 text-gray-400 text-xs">({row.subscriptionCount} subs)</span>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="font-bold text-gray-900">{fmtMoney(row.totalRevenue, currency)}</div>
              <div className="text-[11px] text-gray-400">Net: {fmtMoney(row.netRevenue, currency)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const ProviderSubscriptions = () => {
  const { saveUserSession } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);

  const handleDirectImpersonate = async (email, targetPath = '/provider/my-plan') => {
    if (!email) return toast.error('User email not available');
    try {
      const res = await unlockProfileAPI.directUnlock({ email });
      const userData = res.data.data;
      const impersonateToken = res.data.token;

      const currentToken = localStorage.getItem("authToken");
      const currentUser = JSON.parse(localStorage.getItem("authUser") || '{}');
      if (currentToken) {
        localStorage.setItem("impersonatorToken", currentToken);
        localStorage.setItem("impersonatorRole", currentUser.activeRole || 'admin');
        localStorage.setItem("impersonatorRestriction", "payment");
      }

      saveUserSession({ token: impersonateToken, user: userData });
      toast.success(`Opening ${userData.name || userData.email}'s details...`);
      window.location.href = targetPath;
    } catch (error) {
      console.error(error);
      toast.error('Failed to open user plan details');
    }
  };
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReminder, setShowReminder] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [offerCodeInput, setOfferCodeInput] = useState('');
  
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const searchTimeout = useRef(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [filters.search]);

  // Resolve preset dates
  useEffect(() => {
    if (filters.datePreset === 'custom') return;
    const dates = resolvePresetDates(filters.datePreset);
    setFilters(prev => ({ ...prev, ...dates }));
  }, [filters.datePreset]);

  // Load plans and countries for filter dropdown
  useEffect(() => {
    adminAPI.getPlans().then(({ data }) => setPlans(Array.isArray(data) ? data : data?.plans || [])).catch(() => {});
    adminAPI.getDistinctLocations().then(({ data }) => setCountries(data.countries || [])).catch(() => {});
  }, []);

  // Fetch states when country changes
  useEffect(() => {
    if (!filters.country) {
      setStates([]);
      setCities([]);
      return;
    }
    adminAPI.getDistinctLocations({ country: filters.country })
      .then(({ data }) => {
        setStates(data.states || []);
      })
      .catch(() => {});
  }, [filters.country]);

  // Fetch cities when state changes
  useEffect(() => {
    if (!filters.country || !filters.state) {
      setCities([]);
      return;
    }
    adminAPI.getDistinctLocations({ country: filters.country, state: filters.state })
      .then(({ data }) => {
        setCities(data.cities || []);
      })
      .catch(() => {});
  }, [filters.country, filters.state]);

  const buildQueryParams = useCallback(() => ({
    page, limit,
    search: debouncedSearch,
    userType: filters.userType,
    planId: filters.planId,
    planCategory: filters.planCategory,
    duration: filters.duration,
    paymentStatus: filters.paymentStatus,
    subscriptionStatus: filters.subscriptionStatus,
    country: filters.country,
    state: filters.state,
    city: filters.city,
    locality: filters.locality,
    referralType: filters.referralType,
    referrer: filters.referrer,
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
    startDate: filters.startDate,
    endDate: filters.endDate,
    skill: filters.skill,
    serviceCategory: filters.serviceCategory,
    hiringCategory: filters.hiringCategory,
    jobCategory: filters.jobCategory,
    industry: filters.industry,
  }), [page, limit, debouncedSearch, filters]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getUserSubscriptions(buildQueryParams());
      setSubscriptions(data.subscriptions || []);
      setTotal(data.pagination?.total || 0);
      setSummary(data.summary || null);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const { data } = await adminAPI.getUserSubscriptionAnalytics(buildQueryParams());
      setAnalytics(data.breakdowns || null);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [buildQueryParams]);

  useEffect(() => {
    if (analyticsOpen && !analytics) fetchAnalytics();
  }, [analyticsOpen]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await adminAPI.updateUserSubscriptionStatus(id, { status });
      toast.success(`Subscription ${status}`);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update subscription');
    }
  };

  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleCountryChange = (val) => {
    setFilters(prev => ({
      ...prev,
      country: val,
      state: '',
      city: '',
    }));
    setPage(1);
  };

  const handleStateChange = (val) => {
    setFilters(prev => ({
      ...prev,
      state: val,
      city: '',
    }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setStates([]);
    setCities([]);
    setPage(1);
    setDebouncedSearch('');
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) =>
    k !== 'datePreset' && k !== 'startDate' && k !== 'endDate' && v !== '' && v !== DEFAULT_FILTERS[k]
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const allChecked = subscriptions.length > 0 && subscriptions.every(s => selectedIds.includes(s.subscriptionId));
  const toggleAll = () => {
    if (allChecked) setSelectedIds([]);
    else setSelectedIds(subscriptions.map(s => s.subscriptionId));
  };
  const toggleOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const exportCSV = () => {
    const rows = subscriptions.filter(s => selectedIds.length === 0 || selectedIds.includes(s.subscriptionId));
    const headers = ['User Name','User Type','Email','Phone','Plan','Plan Category','Skill','Service Category','Hiring Category','Industry','Country','State','City','Locality','Amount','Payment Status','Subscription Status','Start Date','End Date','Referral Type','Referrer Name','Referrer Role','Commission Amount','Commission Status','Transaction ID'];
    const body = rows.map(r => [
      r.userName, r.userRole, r.userEmail, r.userPhone, r.planName, r.planCategory,
      r.skillName, r.serviceCategory, r.hiringCategoryName, r.industry,
      r.country, r.state, r.city, r.locality, r.amount, r.paymentStatus,
      r.subscriptionStatus, fmtDate(r.startDate), fmtDate(r.endDate),
      r.referralType, r.referrerName, r.referrerRole,
      r.commissionAmount, r.commissionStatus, r.transactionId,
    ]);
    const csv = [headers, ...body].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `subscriptions_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track provider & recruiter subscriptions, revenue, referrals, and commissions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <>
              <button onClick={() => setShowReminder(true)} type="button"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition">
                <HiMail className="w-4 h-4" /> Remind ({selectedIds.length})
              </button>
              <button onClick={() => setSelectedIds([])} type="button"
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"><HiX className="w-4 h-4" /></button>
            </>
          )}
          <button onClick={exportCSV} type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition">
            <HiDownload className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={fetchSubscriptions} type="button"
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition" title="Refresh">
            <HiRefresh className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <SummaryCard label="Total Revenue" value={fmtMoney(summary.totalRevenue)} icon={HiCash} color="indigo" />
          <SummaryCard label="Provider Revenue" value={fmtMoney(summary.providerRevenue)} icon={HiBriefcase} color="purple" />
          <SummaryCard label="Recruiter Revenue" value={fmtMoney(summary.recruiterRevenue)} icon={HiUsers} color="blue" />
          <SummaryCard label="Active Revenue" value={fmtMoney(summary.activeRevenue)} icon={HiCheckCircle} color="green" />
          <SummaryCard label="Referral Revenue" value={fmtMoney(summary.referralRevenue)} icon={HiGlobe} color="amber" />
          <SummaryCard label="Net Platform Revenue" value={fmtMoney(summary.netRevenue)} icon={HiTrendingUp} color="green"
            sub={`Commission payable: ${fmtMoney(summary.commissionPayable)}`} />
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        {/* Row 1 */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search name, email, phone, plan, transaction ID…"
              value={filters.search} onChange={e => setFilter('search', e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white text-gray-700 transition" />
          </div>
          {/* User Type */}
          <FilterDropdown
            label="All User Types"
            value={filters.userType}
            setValue={val => setFilter('userType', val)}
            options={[
              { value: 'provider', label: 'Providers' },
              { value: 'recruiter', label: 'Recruiters' },
            ]}
          />
          {/* Subscription Status */}
          <FilterDropdown
            label="All Statuses"
            value={filters.subscriptionStatus}
            setValue={val => setFilter('subscriptionStatus', val)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'expired', label: 'Expired' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'paused', label: 'Paused' },
              { value: 'pending_payment', label: 'Pending Payment' },
            ]}
          />
          {/* Payment Status */}
          <FilterDropdown
            label="All Payments"
            value={filters.paymentStatus}
            setValue={val => setFilter('paymentStatus', val)}
            options={[
              { value: 'paid', label: 'Paid' },
              { value: 'free', label: 'Free' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
            ]}
          />
          {/* Date Preset */}
          <FilterDropdown
            label="All Dates"
            value={filters.datePreset}
            setValue={val => setFilter('datePreset', val)}
            options={DATE_PRESETS.filter(p => p.value)}
          />
          {/* Toggle Advanced */}
          <button type="button" onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-semibold transition ${showAdvanced ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            <HiFilter className="w-4 h-4" /> More Filters
            {showAdvanced ? <HiChevronUp className="w-3.5 h-3.5" /> : <HiChevronDown className="w-3.5 h-3.5" />}
          </button>
          {/* Clear */}
          {hasActiveFilters && (
            <button type="button" onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
              <HiX className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {/* Custom Date */}
        {filters.datePreset === 'custom' && (
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">From</label>
              <input type="date" value={filters.startDate} onChange={e => setFilter('startDate', e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">To</label>
              <input type="date" value={filters.endDate} onChange={e => setFilter('endDate', e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* Plan */}
            <FilterDropdown
              label="All Plans"
              fullWidth
              value={filters.planId}
              setValue={val => setFilter('planId', val)}
              options={plans.map(p => ({ value: p._id, label: p.name }))}
            />
            {/* Country */}
            <FilterDropdown
              label="All Countries"
              fullWidth
              value={filters.country}
              setValue={val => handleCountryChange(val)}
              options={countries.map(c => ({ value: c, label: c }))}
            />
            {/* State */}
            <FilterDropdown
              label="All States"
              fullWidth
              value={filters.state}
              setValue={val => handleStateChange(val)}
              options={states.map(s => ({ value: s, label: s }))}
              disabled={!filters.country}
            />
            {/* City */}
            <FilterDropdown
              label="All Cities"
              fullWidth
              value={filters.city}
              setValue={val => setFilter('city', val)}
              options={cities.map(c => ({ value: c, label: c }))}
              disabled={!filters.state}
            />
            {/* Locality */}
            <input type="text" placeholder="Locality…" value={filters.locality} onChange={e => setFilter('locality', e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            {/* Referral Type */}
            <FilterDropdown
              label="All Sources"
              fullWidth
              value={filters.referralType}
              setValue={val => setFilter('referralType', val)}
              options={[
                { value: 'direct', label: 'Direct' },
                { value: 'partner', label: 'Partner' },
                { value: 'provider', label: 'Provider Referral' },
                { value: 'recruiter', label: 'Recruiter Referral' },
                { value: 'admin_created', label: 'Admin Created' }
              ]}
            />
            {/* Amount Min */}
            <input type="number" placeholder="Min Amount…" value={filters.amountMin} onChange={e => setFilter('amountMin', e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            {/* Amount Max */}
            <input type="number" placeholder="Max Amount…" value={filters.amountMax} onChange={e => setFilter('amountMax', e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />

            {/* Provider-specific filters */}
            {(!filters.userType || filters.userType === 'provider') && (
              <>
                <input type="text" placeholder="Skill…" value={filters.skill} onChange={e => setFilter('skill', e.target.value)}
                  className="px-3 py-2.5 border border-indigo-100 bg-indigo-50/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                <input type="text" placeholder="Service Category…" value={filters.serviceCategory} onChange={e => setFilter('serviceCategory', e.target.value)}
                  className="px-3 py-2.5 border border-indigo-100 bg-indigo-50/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              </>
            )}

            {/* Recruiter-specific filters */}
            {(!filters.userType || filters.userType === 'recruiter') && (
              <>
                <input type="text" placeholder="Hiring Category…" value={filters.hiringCategory} onChange={e => setFilter('hiringCategory', e.target.value)}
                  className="px-3 py-2.5 border border-purple-100 bg-purple-50/50 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                <input type="text" placeholder="Industry…" value={filters.industry} onChange={e => setFilter('industry', e.target.value)}
                  className="px-3 py-2.5 border border-purple-100 bg-purple-50/50 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Bulk Action Bar ── */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-indigo-700">{selectedIds.length} selected</span>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowReminder(true)} type="button"
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
              <HiMail className="w-3.5 h-3.5" /> Send Reminder
            </button>
            <button onClick={exportCSV} type="button"
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 transition">
              <HiDownload className="w-3.5 h-3.5" /> Export Selected
            </button>
          </div>
          <button onClick={() => setSelectedIds([])} className="ml-auto p-1 text-indigo-400 hover:text-indigo-600 transition"><HiX className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-20 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : subscriptions.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HiSearch className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-gray-700 font-semibold">No subscriptions found</h3>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or date range</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} type="button" className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition">
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    </th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-left">Category / Skill</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Payment</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Commission</th>
                    <th className="px-4 py-3 text-left">Start</th>
                    <th className="px-4 py-3 text-left">End</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subscriptions.map((item) => {
                    const isSelected = selectedIds.includes(item.subscriptionId);
                    const needsAction = ['expired', 'cancelled', 'paused'].includes(item.subscriptionStatus);
                    
                    // 5-day expiration check (difference between endDate and now)
                    const daysToExpiry = item.endDate ? (new Date(item.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) : null;
                    const isExpiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 5;
                    const canSendReminder = needsAction || (item.subscriptionStatus === 'active' && isExpiringSoon);
                    return (
                      <tr key={item.subscriptionId}
                        className={`hover:bg-gray-50/70 transition group ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOne(item.subscriptionId)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        </td>
                        {/* User */}
                        <td className="px-4 py-3 min-w-[180px]">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${item.userRole === 'recruiter' ? 'bg-indigo-500' : 'bg-purple-500'}`}>
                              {(item.userName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              {item.userMissing ? (
                                <div className="text-red-700 text-xs font-semibold">Deleted / Missing User</div>
                              ) : (
                                <div className="font-semibold text-gray-900 text-sm leading-tight truncate max-w-[150px]" title={item.userName}>
                                  {item.userName || '—'}
                                </div>
                              )}
                              {item.userEmail && <div className="text-[11px] text-gray-400 truncate">{item.userEmail}</div>}
                              {item.userPhone && <div className="text-[11px] text-gray-400">{item.userPhone}</div>}
                              {item.providerProfileMissing && (
                                <div className="text-[10px] text-amber-600 font-semibold mt-0.5">⚠ Provider profile missing</div>
                              )}
                              {item.recruiterProfileMissing && (
                                <div className="text-[10px] text-amber-600 font-semibold mt-0.5">⚠ Recruiter profile missing</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Role */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <RoleBadge role={item.userRole} />
                        </td>
                        {/* Plan */}
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="font-medium text-gray-800 text-sm leading-tight">{item.planName || '—'}</div>
                          {item.duration && <div className="text-[11px] text-gray-400">{item.duration}mo</div>}
                        </td>
                        {/* Category / Skill */}
                        <td className="px-4 py-3 min-w-[130px]">
                          <div className="text-xs text-gray-700 font-medium">
                            {item.userRole === 'provider'
                              ? (item.skillName || item.serviceCategory || item.planCategory || '—')
                              : (item.hiringCategoryName || item.industry || item.planCategory || '—')}
                          </div>
                        </td>
                        {/* Location */}
                        <td className="px-4 py-3 min-w-[110px]">
                          <div className="text-xs text-gray-700">
                            {[item.city, item.state, item.country].filter(Boolean).join(', ') || '—'}
                          </div>
                          {item.locality && <div className="text-[11px] text-gray-400 truncate">{item.locality}</div>}
                        </td>
                        {/* Amount */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-gray-900">{fmtMoney(item.amount, item.currency)}</span>
                        </td>
                        {/* Payment Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PayStatusBadge status={item.paymentStatus} />
                        </td>
                        {/* Subscription Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <SubStatusBadge status={item.subscriptionStatus} />
                        </td>
                        {/* Source */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <SourceBadge type={item.referralType} />
                          {item.referrerName && (
                            <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[100px]">{item.referrerName}</div>
                          )}
                        </td>
                        {/* Commission */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <CommissionBadge status={item.commissionStatus} />
                          {item.commissionAmount > 0 && (
                            <div className="text-xs text-gray-500 mt-0.5">{fmtMoney(item.commissionAmount, item.currency)}</div>
                          )}
                        </td>
                        {/* Start */}
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(item.startDate)}</td>
                        {/* End */}
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(item.endDate)}</td>
                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              if (val === 'view_plan') handleDirectImpersonate(item.userEmail, '/provider/my-plan');
                              else if (val === 'activate') handleStatusUpdate(item.subscriptionId, 'active');
                              else if (val === 'cancel') handleStatusUpdate(item.subscriptionId, 'cancelled');
                              else if (val === 'expire') handleStatusUpdate(item.subscriptionId, 'expired');
                              else if (val === 'remind') { setSelectedIds([item.subscriptionId]); setShowReminder(true); }
                              e.target.value = '';
                            }}
                            className="px-2 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-gray-100 transition"
                          >
                            <option value="">Actions</option>
                            <option value="view_plan">👁 View Plan & Payments</option>
                            {item.subscriptionStatus !== 'active' && <option value="activate">✓ Activate</option>}
                            {item.subscriptionStatus !== 'cancelled' && <option value="cancel">✕ Cancel</option>}
                            {canSendReminder && <option value="remind">📧 Send Reminder</option>}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-sm text-gray-500 font-medium">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} subscriptions
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition text-gray-700">
                    <HiChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-semibold text-gray-700 px-2">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition text-gray-700">
                    <HiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Analytics Breakdowns ── */}
      <div>
        <button type="button" onClick={() => { setAnalyticsOpen(v => !v); if (!analyticsOpen) fetchAnalytics(); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
          <HiTrendingUp className="w-4 h-4 text-indigo-500" />
          {analyticsOpen ? 'Hide Analytics Breakdowns' : 'Show Analytics Breakdowns'}
          {analyticsOpen ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
        </button>

        {analyticsOpen && (
          <div className="mt-4">
            {analyticsLoading ? (
              <div className="p-12 flex justify-center"><LoadingSpinner /></div>
            ) : analytics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                  { key: 'byUserType', title: 'Revenue by User Type' },
                  { key: 'byPlan', title: 'Revenue by Plan' },
                  { key: 'byPlanCategory', title: 'Revenue by Plan Category' },
                  { key: 'byCountry', title: 'Revenue by Country' },
                  { key: 'byCity', title: 'Revenue by City' },
                  { key: 'byReferralType', title: 'Revenue by Source' },
                  { key: 'byProviderSkill', title: 'Provider Revenue by Skill' },
                  { key: 'byProviderServiceCategory', title: 'Provider Revenue by Service Category' },
                  { key: 'byRecruiterHiringCategory', title: 'Recruiter Revenue by Hiring Category' },
                  { key: 'byRecruiterIndustry', title: 'Recruiter Revenue by Industry' },
                  { key: 'bySubscriptionStatus', title: 'Revenue by Subscription Status' },
                  { key: 'byReferrer', title: 'Revenue by Referrer' },
                ].map(({ key, title }) => (
                  analytics[key] && (
                    <div key={key} className="bg-white border border-gray-100 rounded-2xl p-4">
                      <BreakdownTable title={title} rows={analytics[key]} />
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-8 text-center">No analytics data available for selected filters.</div>
            )}
          </div>
        )}
      </div>

      {/* ── Reminder Modal ── */}
      {showReminder && (
        <ReminderModal
          selectedIds={selectedIds}
          onClose={() => setShowReminder(false)}
          onSent={() => { setSelectedIds([]); fetchSubscriptions(); }}
        />
      )}
    </div>
  );
};

export default ProviderSubscriptions;
