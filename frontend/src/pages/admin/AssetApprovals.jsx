import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, RotateCcw, Clock, CheckCircle2, XCircle, Users, ChevronLeft,
  ChevronRight, User as UserIcon, Eye, AlertCircle, FileText, Link2,
  MapPin, Calendar, Percent, CheckSquare, Square, ChevronDown,
  Send, Shield, Briefcase
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toAbsoluteMediaUrl } from '../../utils/media';
import toast from 'react-hot-toast';

/* ── Constants ──────────────────────────────────────────────────── */
const ROLE_BADGE = {
  partner:   'bg-purple-100 text-purple-700 border-purple-200',
  manager:   'bg-blue-100 text-blue-700 border-blue-200',
  recruiter: 'bg-teal-100 text-teal-700 border-teal-200',
  provider:  'bg-orange-100 text-orange-700 border-orange-200',
  user:      'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_BADGE = {
  pending:       'bg-amber-50 text-amber-700 border-amber-200',
  approved:      'bg-green-50 text-green-700 border-green-200',
  rejected:      'bg-red-50 text-red-700 border-red-200',
  not_submitted: 'bg-gray-50 text-gray-400 border-gray-200',
  none:          'bg-gray-50 text-gray-400 border-gray-200',
};

const TABS = [
  { key: 'provider',  label: 'Candidate Assets', roleFilter: 'provider' },
];

/* ── Stats Card ─────────────────────────────────────────────────── */
const StatsCard = ({ icon: Icon, iconBg, iconColor, label, value, sub }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-900">{value?.toLocaleString() ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

/* ── Skeleton row ────────────────────────────────────────────────── */
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(9)].map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-gray-100 rounded-lg" style={{ width: `${50 + (i % 3) * 20}%` }} />
      </td>
    ))}
  </tr>
);

/* ── Status chip ─────────────────────────────────────────────────── */
const StatusChip = ({ status, label }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGE[status] || STATUS_BADGE.none}`}>
    {status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
    {status === 'rejected' && <XCircle className="w-3 h-3" />}
    {status === 'pending' && <Clock className="w-3 h-3" />}
    {label || status}
  </span>
);

/* ── Bulk action bar ─────────────────────────────────────────────── */
const BulkBar = ({ selected, onApprove, onReject, onClear, loading }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
    <span className="text-sm font-medium">{selected.length} selected</span>
    <div className="w-px h-5 bg-white/20" />
    <button onClick={onApprove} disabled={loading}
      className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 rounded-xl text-sm font-semibold transition">
      <CheckCircle2 className="w-4 h-4" /> Approve Photo
    </button>
    <button onClick={onReject} disabled={loading}
      className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 rounded-xl text-sm font-semibold transition">
      <XCircle className="w-4 h-4" /> Reject Photo
    </button>
    <button onClick={onClear} className="text-xs text-white/60 hover:text-white transition px-2">Clear</button>
  </div>
);

/* ── Filter Dropdown ───────────────────────────────────────────── */
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
        className={`flex items-center text-sm bg-white border rounded-xl px-3 py-2.5 cursor-pointer transition whitespace-nowrap min-w-[130px] ${isOpen ? 'border-purple-300 ring-2 ring-purple-300 bg-gray-50' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
      >
        {Icon && <Icon className="w-4 h-4 mr-1.5 text-gray-400" />}
        <span className={value ? "text-gray-900 font-medium capitalize" : "text-gray-700"}>
          {value || label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${isOpen ? 'rotate-180 text-purple-500' : 'text-gray-400'}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 left-0 w-48 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300"
              placeholder={placeholder || `Search...`}
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
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer capitalize"
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
              <li className="px-3 py-2 text-sm text-gray-400 text-center">No match found</li>
            )}
            {value && (
              <li 
                className="px-3 py-2 text-sm text-red-700 hover:bg-red-50 cursor-pointer border-t border-gray-50 mt-1"
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

/* ═══════════════════════════════════════════════════════════════════ */
export default function ProfileApprovals() {
  const navigate = useNavigate();

  /* ── State ─────────────────────────────────────────────────────── */
  const [users, setUsers]         = useState([]);
  const [stats, setStats]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('provider');
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  /* Filters */
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('all');
  const [country, setCountry]     = useState('');
  const [state, setState]         = useState('');
  const [city, setCity]           = useState('');

  /* Location dropdowns */
  const [countries, setCountries] = useState([]);
  const [states, setStates]       = useState([]);
  const [cities, setCities]       = useState([]);

  /* Bulk select */
  const [selected, setSelected]   = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [rejectModal, setRejectModal] = useState({ open: false, reason: '' });

  /* Smart Dropdown state */
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  /* Debounce ref */
  const debounceRef = useRef(null);

  /* ── Fetch Stats ───────────────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data } = await adminAPI.getProfileReviewStats();
      setStats(data || {});
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  }, []);

  /* ── Fetch Location Dropdowns ──────────────────────────────────── */
  const fetchLocations = useCallback(async (forCountry = '', forState = '') => {
    try {
      const { data } = await adminAPI.getDistinctLocations({
        country: forCountry || undefined,
        state: forState || undefined,
      });
      setCountries(data.countries || []);
      setStates(data.states || []);
      setCities(data.cities || []);
    } catch { /* silent */ }
  }, []);

  /* ── Fetch Users ────────────────────────────────────────────────── */
  const fetchUsers = useCallback(async (p = 1, overrides = {}) => {
    try {
      setLoading(true);
      setSelected([]);
      const tab = TABS.find(t => t.key === activeTab);
      const params = {
        page: p,
        limit: 15,
        role: tab?.roleFilter || 'all',
        search: overrides.search ?? search,
        status: overrides.status ?? status,
        country: overrides.country ?? country,
        state: overrides.state ?? state,
        city: overrides.city ?? city,
        sortBy: 'newest',
      };
      const { data } = await adminAPI.getProfileReviews(params);
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, status, country, state, city]);

  /* ── Initial load ───────────────────────────────────────────────── */
  useEffect(() => { fetchStats(); fetchLocations(); }, [fetchStats, fetchLocations]);
  useEffect(() => { setPage(1); fetchUsers(1); }, [activeTab, status, country, state, city]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Debounced search ───────────────────────────────────────────── */
  const handleSearchChange = (val) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1, { search: val });
    }, 400);
  };

  /* ── Handlers ───────────────────────────────────────────────────── */
  const handleCountryChange = (val) => {
    setCountry(val);
    setState('');
    setCity('');
    fetchLocations(val, '');
  };

  const handleStateChange = (val) => {
    setState(val);
    setCity('');
    fetchLocations(country, val);
  };

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setCountry('');
    setState('');
    setCity('');
    setStates([]);
    setCities([]);
    setPage(1);
    fetchUsers(1, { search: '', status: 'all', country: '', state: '', city: '' });
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === users.length) setSelected([]);
    else setSelected(users.map(u => u._id));
  };

  const handleBulkApprove = async () => {
    if (selected.length === 0) return;
    setBulkLoading(true);
    try {
      await adminAPI.bulkProfileAction({ userIds: selected, action: 'approve', sectionKey: 'profilePhoto' });
      toast.success(`Approved ${selected.length} profiles`);
      fetchUsers(page);
      fetchStats();
      setSelected([]);
    } catch {
      toast.error('Bulk approve failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkRejectSubmit = async () => {
    if (selected.length === 0) return;
    setBulkLoading(true);
    try {
      await adminAPI.bulkProfileAction({
        userIds: selected, action: 'reject', sectionKey: 'profilePhoto', reason: rejectModal.reason
      });
      toast.success(`Rejected ${selected.length} profiles`);
      setRejectModal({ open: false, reason: '' });
      fetchUsers(page);
      fetchStats();
      setSelected([]);
    } catch {
      toast.error('Bulk reject failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getRoleLabel = (role) => {
    if (role === 'provider') return 'Provider';
    return role?.charAt(0).toUpperCase() + role?.slice(1) || 'User';
  };

  /* ── Derived State ──────────────────────────────────────────────── */
  const matchingSuggestions = Array.from(new Set(
    users.flatMap(u => [
      u.name,
      u.email,
      u.phone,
      u.profile?.city,
      ...(u.profile?.skills || [])
    ].filter(Boolean))
  )).filter(s => search ? s.toLowerCase().includes(search.toLowerCase()) : true).slice(0, 10);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Page Header ─────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review, approve, and manage user photos, resumes, and links</p>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${activeTab === tab.key
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                  : 'text-gray-700 hover:bg-gray-100 bg-white border border-gray-200'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Stats Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statsLoading ? [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-[112px] animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/2" />
            </div>
          )) : <>
            <StatsCard icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" label="Pending" value={stats.pending} sub="Awaiting review" />
            <StatsCard icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-700" label="Approved" value={stats.approved} sub="Profiles approved" />
            <StatsCard icon={XCircle} iconBg="bg-red-50" iconColor="text-red-600" label="Rejected" value={stats.rejected} sub="Need correction" />
            <StatsCard icon={Shield} iconBg="bg-blue-50" iconColor="text-blue-600" label="Under Review" value={stats.underReview} sub="Docs in review" />
            <StatsCard icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600" label="Total Profiles" value={stats.totalProfiles} />
          </>}
        </div>

        {/* ── Filters (Sticky) ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-4 z-30">
          <div className="flex flex-wrap items-center gap-3">

            {/* Global Search */}
            <div className="relative flex-1 min-w-[220px]" ref={searchContainerRef}>
              <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-300 transition-all">
                <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <input
                  value={search}
                  onChange={e => {
                    handleSearchChange(e.target.value);
                    setSearchDropdownOpen(true);
                  }}
                  onFocus={() => setSearchDropdownOpen(true)}
                  placeholder="Search name, email, phone, skills, city, pincode..."
                  className="w-full bg-transparent border-none focus:ring-0 text-sm outline-none"
                />
                {search && (
                  <button onClick={() => { setSearch(''); fetchUsers(1, { search: '' }); }}
                    className="text-gray-400 hover:text-gray-700 shrink-0">×</button>
                )}
              </div>
              
              {/* Smart Dropdown */}
              {searchDropdownOpen && matchingSuggestions.length > 0 && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-3 flex justify-between items-center backdrop-blur-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {search ? "Matching Results" : "Suggestions"}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full border border-gray-200">Select</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto py-1.5">
                    {matchingSuggestions.map((suggestion, idx) => (
                      <div 
                        key={idx}
                        className="px-4 py-2.5 hover:bg-purple-50/50 cursor-pointer text-sm text-gray-700 border-b border-gray-50/60 last:border-none flex items-center gap-2.5 transition-colors duration-150"
                        onClick={() => {
                          setSearch(suggestion);
                          setSearchDropdownOpen(false);
                          if (debounceRef.current) clearTimeout(debounceRef.current);
                          setPage(1);
                          fetchUsers(1, { search: suggestion });
                        }}
                      >
                        <Search className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="font-medium text-gray-700 truncate">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status */}
            <FilterDropdown 
              label="All Status" 
              value={status === 'all' ? '' : status} 
              setValue={val => setStatus(val || 'all')} 
              options={['pending', 'approved', 'rejected']} 
            />

            {/* Country */}
            <FilterDropdown 
              label="All Countries" 
              value={country} 
              setValue={handleCountryChange} 
              options={countries} 
            />

            {/* State */}
            <FilterDropdown 
              label="All States" 
              value={state} 
              setValue={handleStateChange} 
              options={states} 
            />

            {/* City */}
            <FilterDropdown 
              label="All Cities" 
              value={city} 
              setValue={setCity} 
              options={cities} 
            />

            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

          {/* Active filter chips */}
          {(search || country || state || city || status !== 'all') && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {search && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                  Search: "{search}"
                  <button onClick={() => handleSearchChange('')} className="hover:text-purple-900">×</button>
                </span>
              )}
              {country && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                <MapPin className="w-3 h-3" />{country}
                <button onClick={() => handleCountryChange('')}>×</button>
              </span>}
              {state && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                {state}<button onClick={() => handleStateChange('')}>×</button>
              </span>}
              {city && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                {city}<button onClick={() => setCity('')}>×</button>
              </span>}
              {status !== 'all' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200 capitalize">
                {status}<button onClick={() => setStatus('all')}>×</button>
              </span>}
            </div>
          )}
        </div>

        {/* ── Table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Count bar */}
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading ? 'Loading...' : `${totalCount.toLocaleString()} profile${totalCount !== 1 ? 's' : ''} found`}
            </p>
            {selected.length > 0 && (
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                {selected.length} selected
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-purple-600 transition">
                      {selected.length === users.length && users.length > 0
                        ? <CheckSquare className="w-4 h-4 text-purple-600" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{activeTab === 'recruiter' ? 'Recruiter' : 'Candidate'}</th>
                  {activeTab === 'recruiter' && <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>}
                  {activeTab === 'provider' && <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Skills</th>}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Completion</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{activeTab === 'recruiter' ? 'Company Logo / Photo' : 'Photo'}</th>
                  {activeTab === 'provider' && <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Resume</th>}
                  {activeTab === 'provider' && <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Links</th>}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                          <Users className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-semibold">No profiles found</p>
                        <p className="text-gray-400 text-sm max-w-xs">
                          {search
                            ? `No results for "${search}". Try a different search term.`
                            : 'Adjust your filters to see results.'}
                        </p>
                        {(search || country || state || city || status !== 'all') && (
                          <button onClick={handleReset}
                            className="mt-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition">
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map(u => {
                    const isSelected = selected.includes(u._id);
                    const photo = toAbsoluteMediaUrl(u.profilePhoto) || '';
                    const locationParts = [u.city, u.state, u.country].filter(Boolean);

                    return (
                      <tr key={u._id}
                        className={`hover:bg-gray-50/60 transition-colors ${isSelected ? 'bg-purple-50/40' : ''}`}>

                        {/* Checkbox */}
                        <td className="px-4 py-3.5">
                          <button onClick={() => toggleSelect(u._id)} className="text-gray-400 hover:text-purple-600 transition">
                            {isSelected
                              ? <CheckSquare className="w-4 h-4 text-purple-600" />
                              : <Square className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Profile */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden border-2 border-white shadow">
                                {photo
                                  ? <img src={photo} alt={u.name} className="w-full h-full object-cover" />
                                  : <UserIcon className="w-5 h-5 text-purple-400" />}
                              </div>
                              {u.photoStatus === 'pending' && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-400 border-2 border-white rounded-full" title="Photo pending review" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{u.name || '—'}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[160px]">{u.email || u.phone || '—'}</p>
                              {u.phone && u.email && (
                                <p className="text-xs text-gray-400 truncate max-w-[160px]">{u.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type / Company */}
                        {activeTab === 'recruiter' ? (
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{u.companyName || '—'}</p>
                          </td>
                        ) : (
                          <td className="px-4 py-3.5">
                            {u.skills?.length > 0 ? (
                              <p className="text-xs text-gray-700 truncate max-w-[160px]">{u.skills.join(', ')}</p>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                        )}

                        {/* Location */}
                        <td className="px-4 py-3.5">
                          {locationParts.length > 0 ? (
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                              <span className="text-sm text-gray-700 leading-tight">{locationParts.join(', ')}</span>
                            </div>
                          ) : <span className="text-sm text-gray-300">—</span>}
                        </td>

                        {/* Registered */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {formatDate(u.createdAt)}
                          </div>
                        </td>

                        {/* Completion */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${u.profileCompletion >= 80 ? 'bg-green-500' : u.profileCompletion >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${u.profileCompletion || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{u.profileCompletion || 0}%</span>
                          </div>
                        </td>

                        {/* Photo status */}
                        <td className="px-4 py-3.5">
                          <StatusChip status={u.photoStatus} label={u.photoStatus === 'not_submitted' ? 'None' : u.photoStatus} />
                        </td>

                        {/* Resume status */}
                        {activeTab === 'provider' && (
                          <td className="px-4 py-3.5">
                            <StatusChip status={u.resumeStatus} label={u.resumeStatus === 'not_submitted' ? 'None' : u.resumeStatus} />
                          </td>
                        )}
                        
                        {/* Links status */}
                        {activeTab === 'provider' && (
                          <td className="px-4 py-3.5">
                            <StatusChip status={u.linksStatus || 'none'} label={u.linksStatus === 'not_submitted' ? 'None' : (u.linksStatus || 'none')} />
                          </td>
                        )}

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/admin/profile-approval/${u._id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition">
                              <Eye className="w-3.5 h-3.5" /> Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} · {totalCount.toLocaleString()} total
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => { setPage(p => p - 1); fetchUsers(page - 1); }} disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  <ChevronLeft className="w-4 h-4 text-gray-700" />
                </button>
                {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                  const pNum = i + 1;
                  return (
                    <button key={pNum} onClick={() => { setPage(pNum); fetchUsers(pNum); }}
                      className={`w-8 h-8 text-xs font-semibold rounded-lg transition ${pNum === page ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>
                      {pNum}
                    </button>
                  );
                })}
                <button onClick={() => { setPage(p => p + 1); fetchUsers(page + 1); }} disabled={page >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  <ChevronRight className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bulk Bar ──────────────────────────────────────────── */}
      {selected.length > 0 && (
        <BulkBar
          selected={selected}
          loading={bulkLoading}
          onApprove={handleBulkApprove}
          onReject={() => setRejectModal({ open: true, reason: '' })}
          onClear={() => setSelected([])}
        />
      )}

      {/* ── Bulk Reject Modal ──────────────────────────────────── */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reject Selected Profiles</h3>
            <p className="text-sm text-gray-500 mb-4">
              You are rejecting profile photos for <strong>{selected.length}</strong> profiles. Provide a reason (optional, will be emailed to users).
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value }))}
              placeholder="Rejection reason (e.g. Image is blurred or inappropriate)"
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
            <div className="flex items-center gap-3 mt-4">
              <button onClick={handleBulkRejectSubmit} disabled={bulkLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
                {bulkLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
              <button onClick={() => setRejectModal({ open: false, reason: '' })}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}