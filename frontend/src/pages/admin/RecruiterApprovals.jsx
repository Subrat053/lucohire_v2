import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, ShieldCheck, Hourglass, Ban, 
  Search, Filter, Download, MoreVertical, Eye, X, Check,
  MapPin, Calendar, Briefcase, ChevronLeft, ChevronRight, CheckCircle2, PauseCircle, Trash2, Send, Mail, ChevronDown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const statusColors = {
  Verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Suspended: 'bg-purple-50 text-purple-700 border-purple-200',
};

// --- Components ---
const FilterDropdown = ({ label, icon: Icon, value, setValue, options, placeholder, fullWidth = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = React.useRef(null);

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

  const allOptions = Array.from(new Set([...options, ...(value && value !== 'all' ? [value] : [])]));
  const filteredOptions = allOptions.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  const sortedFilteredOptions = [...filteredOptions].sort((a, b) => {
    if (a === value) return -1;
    if (b === value) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center text-xs bg-white border rounded-lg px-4 py-2 cursor-pointer transition whitespace-nowrap min-w-[130px] ${fullWidth ? 'w-full justify-between' : ''} ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-gray-50' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
          <span className={`truncate ${value ? "text-gray-900 font-bold capitalize" : "text-gray-700 font-bold"}`}>
            {value || label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {(value && value !== 'all') && (
            <X 
              className="w-3.5 h-3.5 text-gray-400 hover:text-red-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setValue('');
              }}
            />
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : 'text-gray-400'}`} />
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-50 top-full mt-1 ${fullWidth ? 'left-0 w-full' : 'right-0 w-48'} bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col`}>
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder={placeholder || `Search...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchTerm.trim()) {
                    setValue(searchTerm.trim());
                  } else if (sortedFilteredOptions.length > 0) {
                    setValue(sortedFilteredOptions[0]);
                  }
                  setSearchTerm('');
                  setIsOpen(false);
                }
              }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {searchTerm.trim() && !options.some(opt => opt.toLowerCase() === searchTerm.trim().toLowerCase()) && (
              <li
                className="px-3 py-2 text-xs cursor-pointer hover:bg-emerald-50 text-blue-600 font-medium border-b border-gray-50 mb-1"
                onClick={() => { setValue(searchTerm.trim()); setSearchTerm(''); setIsOpen(false); }}
              >
                Search for "{searchTerm}"
              </li>
            )}
            {sortedFilteredOptions.length > 0 ? (
              sortedFilteredOptions.map((opt, i) => (
                <li 
                  key={i}
                  className={`px-3 py-2 text-xs cursor-pointer capitalize font-medium ${
                    opt === value ? 'text-emerald-700 bg-emerald-50/50' : 'text-gray-700 hover:bg-emerald-50'
                  }`}
                  onClick={() => {
                    setValue(opt);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {opt === value ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">{opt}</span>
                  </div>
                </li>
              ))
            ) : (
              !searchTerm.trim() && <li className="px-3 py-2 text-xs text-gray-400 text-center">No match found</li>
            )}
            {value && (
              <li 
                className="px-3 py-2 text-xs text-red-700 hover:bg-red-50 cursor-pointer border-t border-gray-50 mt-1 font-medium"
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

// --- Helper Functions ---
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const calcTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const diff = ((current - previous) / previous) * 100;
  return (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
};

// --- Components ---

const KPICard = ({ title, value, subtext, icon: Icon, colorClass, trend, trendUp }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</div>
    </div>
    <div>
      <div className="text-2xl font-black text-gray-900 mb-1">{value?.toLocaleString() || 0}</div>
      <div className="flex items-center text-[10px] font-bold">
        {trend && (
          <span className={`mr-1 ${trendUp ? 'text-emerald-500' : 'text-red-700'}`}>
            {trendUp ? '↑' : '↓'} {trend.replace('+', '')}
          </span>
        )}
        <span className="text-gray-400">{subtext}</span>
      </div>
    </div>
  </div>
);

const RecruiterDetailPanel = ({ recruiter, onClose, onApprove, onReject }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const user = recruiter.user || {};
  const isApproved = recruiter.isApproved;
  const status = isApproved ? 'Verified' : 'Pending';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex gap-6 overflow-x-auto custom-scrollbar">
            {['Overview', 'Documents', 'Company Details', 'Verification Status', 'Notes & History'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap text-sm font-bold pb-4 -mb-4 border-b-2 transition-all ${
                  activeTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white flex flex-col md:flex-row gap-8">
          
          {/* Left Column (Profile Summary) */}
          <div className="w-full md:w-64 shrink-0 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-teal-50 border-4 border-white shadow-sm flex items-center justify-center text-3xl font-black text-teal-600 mb-4 overflow-hidden relative">
                {recruiter.photo ? (
                  <img src={recruiter.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : getInitials(user.name)}
                {isApproved && (
                  <div className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 border-2 border-white">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </div>
              <h2 className="text-lg font-black text-gray-900">{user.name || 'Unknown'}</h2>
              <p className="text-xs font-bold text-gray-400 mb-2">{recruiter.companyName || 'Unknown Company'}</p>
              
              <div className="flex flex-col gap-1.5 text-xs font-medium text-gray-500 mt-2">
                <a href={`mailto:${user.email}`} className="text-blue-500 hover:underline">{user.email}</a>
                <span>{user.phone || 'No phone'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium text-gray-500 justify-center">
               <span className="text-sm">🇮🇳</span> {recruiter.city || 'Unknown'}, {user.country || 'India'}
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-bold text-gray-500">
               <a href="#" className="flex items-center gap-1 hover:text-emerald-500"><Briefcase className="w-3.5 h-3.5" /> Website</a>
               <a href="#" className="flex items-center gap-1 hover:text-emerald-500"><Calendar className="w-3.5 h-3.5" /> Applied on {formatDate(user.createdAt)}</a>
            </div>

            <button className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 mt-4">
              <Eye className="w-4 h-4" /> View Full Profile
            </button>
          </div>

          {/* Right Column (Details) */}
          <div className="flex-1 border-l border-gray-100 pl-0 md:pl-8">
            {activeTab === 'Overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Company Information */}
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Company Information</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Company Name</span>
                      <span className="font-bold text-gray-800">{recruiter.companyName || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Website</span>
                      <a href="#" className="font-bold text-emerald-600 hover:underline">{recruiter.website || 'Not specified'}</a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Company Size</span>
                      <span className="font-bold text-gray-800">{recruiter.companySize || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Industry</span>
                      <span className="font-bold text-gray-800">{recruiter.industry || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Headquarters</span>
                      <span className="font-bold text-gray-800">{recruiter.city || 'Unknown'}, {user.country || 'India'}</span>
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Verification Status</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Email Verification', done: user.isEmailVerified !== false },
                      { label: 'Mobile Verification', done: !!user.phone },
                      { label: 'Company Email Domain', done: user.isEmailVerified !== false },
                      { label: 'GST / Tax ID', done: false },
                      { label: 'Business Registration', done: false },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          <ShieldCheck className="w-4 h-4 text-gray-400" />
                          {item.label}
                        </div>
                        {item.done ? (
                          <span className="text-emerald-500 font-bold text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Verified</span>
                        ) : (
                          <span className="text-amber-500 font-bold text-xs">Pending</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Overall Status</span>
                    <span className={`text-xs font-black uppercase ${isApproved ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {status} Review
                    </span>
                  </div>
                </div>

                {/* Verification Timeline */}
                <div className="col-span-1 lg:col-span-2">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Verification Timeline</h3>
                  <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                    {isApproved && (
                      <div className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        </div>
                        <p className="text-sm font-bold text-gray-800">Recruiter Verified</p>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">By Admin</p>
                      </div>
                    )}
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      </div>
                      <p className="text-sm font-bold text-gray-800">Application Submitted</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">{formatDate(user.createdAt || recruiter.createdAt)}, {formatTime(user.createdAt || recruiter.createdAt)}</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab !== 'Overview' && (
              <div className="h-full min-h-[300px] flex items-center justify-center text-gray-400 font-medium">
                {activeTab} view coming soon.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 flex items-center justify-end gap-3 shrink-0">
          {!isApproved && (
            <button 
              onClick={() => { onApprove(recruiter, true); onClose(); }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-200 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve
            </button>
          )}
          <button 
            onClick={() => { onReject(recruiter); onClose(); }}
            className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Reject
          </button>
          <button className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1">
            More <ChevronRight className="w-4 h-4 rotate-90" />
          </button>
        </div>

      </div>
    </div>
  );
};


// --- Main Component ---
export default function RecruiterApprovals() {
  const [recruiters, setRecruiters] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [appliedDateFilter, setAppliedDateFilter] = useState('');
  const [activeTableTab, setActiveTableTab] = useState('Pending');
  
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);

  useEffect(() => { 
    fetchRecruiters(); 
  }, [statusFilter, activeTableTab]);

  const fetchRecruiters = async () => {
    try {
      setLoading(true);
      const params = { search, limit: 50 };
      
      if (activeTableTab === 'Pending') params.approved = false;
      if (activeTableTab === 'Verified') params.approved = true;
      if (statusFilter === 'approved') params.approved = true;
      else if (statusFilter === 'pending') params.approved = false;

      if (sourceFilter) params.source = sourceFilter;
      if (countryFilter) params.country = countryFilter;
      if (levelFilter) params.level = levelFilter;
      if (appliedDateFilter) params.joinedDate = appliedDateFilter;

      const { data } = await adminAPI.getRecruiters(params);
      setRecruiters(data.recruiters || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      toast.error('Failed to load recruiters');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRecruiters();
  };

  const getUserIdForApproval = (item) => {
    if (item?.user?._id) return item.user._id;
    if (typeof item?.user === 'string') return item.user;
    return null;
  };

  const handleApprove = async (recruiter, approve) => {
    const userId = getUserIdForApproval(recruiter);
    if (!userId) return toast.error('User ID missing.');
    try {
      if (approve) {
        await adminAPI.approveUser(userId);
        toast.success('Recruiter verified successfully');
      } else {
        await adminAPI.rejectUser(userId, 'Rejected by admin');
        toast.success('Recruiter rejected');
      }
      fetchRecruiters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  // --- Process Stats ---
  const totals = stats?.totals || { total: 0, newThisWeek: 0, newLastWeek: 0, verified: 0, pending: 0, rejected: 0, suspended: 0 };
  const trendNew = calcTrend(totals.newThisWeek, totals.newLastWeek);
  
  const summaryData = [
    { name: 'Verified', value: totals.verified, color: '#10B981' },
    { name: 'Pending', value: totals.pending, color: '#F59E0B' },
    { name: 'Rejected', value: totals.rejected, color: '#EF4444' },
    { name: 'Suspended', value: totals.suspended, color: '#8B5CF6' },
  ].filter(d => d.value > 0);

  const sourcesData = (stats?.sources || []).map(s => ({
    name: (s._id || 'Organic').charAt(0).toUpperCase() + (s._id || 'Organic').slice(1),
    value: s.count,
    percentage: totals.total > 0 ? ((s.count / totals.total) * 100).toFixed(1) + '%' : '0%'
  }));

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">Recruiter Approval & Management</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">Review, verify and manage recruiter accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 text-xs font-bold text-gray-700 shadow-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              Dynamic Real-Time Data
            </div>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard title="Pending Approval" value={totals.pending} subtext="Requires review" icon={Hourglass} colorClass="text-emerald-500" />
          <KPICard title="Verified Recruiters" value={totals.verified} subtext="Active & verified" icon={ShieldCheck} colorClass="text-amber-500" />
          <KPICard title="Rejected" value={totals.rejected} subtext="This week" icon={X} colorClass="text-red-700" trend={trendNew} trendUp={!trendNew.includes('-')} />
          <KPICard title="Suspended" value={totals.suspended} subtext="Policy violation" icon={PauseCircle} colorClass="text-purple-500" />
          <KPICard title="Total Recruiters" value={totals.total} subtext="All time" icon={Users} colorClass="text-teal-500" />
        </div>

        {/* Main Layout */}
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          
          {/* Left Pane (Table) */}
          <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Table Tabs */}
            <div className="flex items-center gap-6 px-6 pt-4 border-b border-gray-100 overflow-x-auto custom-scrollbar">
              {[
                `Pending Approval (${totals.pending.toLocaleString()})`, 
                `Verified (${totals.verified.toLocaleString()})`, 
                `Rejected (${totals.rejected.toLocaleString()})`, 
                `Suspended (${totals.suspended.toLocaleString()})`,
                `All Recruiters (${totals.total.toLocaleString()})`
              ].map(tab => {
                const label = tab.split(' ')[0] === 'All' ? 'All' : tab.split(' ')[0];
                const active = activeTableTab === label;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTableTab(label)}
                    className={`whitespace-nowrap text-xs font-bold pb-3 border-b-2 transition-all ${
                      active ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>

            {/* Table Search & Export Bar */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-50 bg-gray-50/30">
              <form onSubmit={handleSearch} className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, company or mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </form>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                  <Filter className="w-3.5 h-3.5" /> Filters
                </button>
                <button className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            </div>

            {/* Table Data */}
            <div className="overflow-x-auto custom-scrollbar flex-1 relative min-h-[400px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 w-10">
                        <input type="checkbox" className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Recruiter</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Company</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Email / Mobile</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Source</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Applied On</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recruiters.map((recruiter) => {
                      const user = recruiter.user || {};
                      const isApproved = recruiter.isApproved;
                      let status = isApproved ? 'Verified' : 'Pending';
                      if (user.approvalStatus === 'rejected') status = 'Rejected';
                      if (user.approvalStatus === 'blocked' || user.approvalStatus === 'suspended') status = 'Suspended';

                      const badgeClass = statusColors[status] || statusColors.Pending;
                      const source = user.provider || 'Organic';

                      return (
                        <tr key={recruiter._id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input type="checkbox" className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold text-xs overflow-hidden shrink-0">
                                {recruiter.photo ? <img src={recruiter.photo} alt="" className="w-full h-full object-cover"/> : getInitials(user.name)}
                              </div>
                              <div className="text-sm font-bold text-gray-900">{user.name || 'Unknown'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-gray-700">{recruiter.companyName || 'Not specified'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-700 truncate max-w-[150px]" title={user.email}>{user.email}</div>
                            <div className="text-[10px] font-medium text-gray-400">{user.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-bold text-blue-600 capitalize bg-blue-50 px-2 py-0.5 rounded">{source}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-gray-700">{formatDate(user.createdAt || recruiter.createdAt)}</div>
                            <div className="text-[10px] font-medium text-gray-400">{formatTime(user.createdAt || recruiter.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setSelectedRecruiter(recruiter)}
                                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {recruiters.length === 0 && !loading && (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500 text-sm font-medium">
                          No recruiters found matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
              <div className="text-xs font-medium text-gray-500">
                Showing <span className="font-bold text-gray-900">{recruiters.length > 0 ? 1 : 0}</span> to <span className="font-bold text-gray-900">{recruiters.length}</span> of {totals.total.toLocaleString()} recruiters
              </div>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-xs font-bold">1</button>
                <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-6">
            
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900">Filters</h3>
                <button 
                  onClick={() => {
                    setStatusFilter('');
                    setSourceFilter('');
                    setCountryFilter('');
                    setLevelFilter('');
                    setAppliedDateFilter('');
                    fetchRecruiters();
                  }}
                  className="text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Status</label>
                  <FilterDropdown
                    fullWidth
                    label="All Status"
                    value={statusFilter === 'all' ? '' : statusFilter}
                    setValue={val => setStatusFilter(val || 'all')}
                    options={['pending', 'approved', 'rejected']}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Source</label>
                  <FilterDropdown
                    fullWidth
                    label="All Sources"
                    value={sourceFilter}
                    setValue={setSourceFilter}
                    options={['organic', 'referral', 'campaign']}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Country</label>
                  <FilterDropdown
                    fullWidth
                    label="All Countries"
                    value={countryFilter}
                    setValue={setCountryFilter}
                    options={['india', 'united states', 'united kingdom']}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Verification Level</label>
                  <FilterDropdown
                    fullWidth
                    label="All Levels"
                    value={levelFilter}
                    setValue={setLevelFilter}
                    options={['tier 1', 'tier 2', 'tier 3']}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Applied Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={appliedDateFilter}
                      onChange={(e) => setAppliedDateFilter(e.target.value)}
                      className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>
                <button 
                  onClick={() => fetchRecruiters()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all mt-2"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Verification Summary Donut */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-gray-900">Verification Summary</h3>
                <button className="text-[11px] font-bold text-emerald-600 hover:underline">View Report</button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 shrink-0 relative">
                  {summaryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summaryData}
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {summaryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full rounded-full border-[15px] border-gray-100"></div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-gray-900">{totals.total.toLocaleString()}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {summaryData.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">{item.value.toLocaleString()}</span>
                        <span className="text-gray-400">({totals.total > 0 ? ((item.value / totals.total) * 100).toFixed(1) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                  {summaryData.length === 0 && (
                    <div className="text-[10px] text-gray-400 italic">No recruiters yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Sources Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900">Top Recruiter Sources</h3>
                <button className="text-[11px] font-bold text-emerald-600 hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {sourcesData.length > 0 ? sourcesData.map((item, idx) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <div className="font-bold text-gray-700 flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-blue-50 text-blue-500 flex items-center justify-center">
                          {idx === 0 ? <MapPin className="w-2.5 h-2.5"/> : <Briefcase className="w-2.5 h-2.5"/>}
                        </div>
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">{item.value.toLocaleString()}</span>
                        <span className="text-gray-400 font-medium w-10 text-right">({item.percentage})</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: item.percentage }}></div>
                    </div>
                  </div>
                )) : (
                  <div className="text-xs text-gray-400 italic text-center py-4">No source data available</div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Recruiter Details Modal */}
      {selectedRecruiter && (
        <RecruiterDetailPanel 
          recruiter={selectedRecruiter} 
          onClose={() => setSelectedRecruiter(null)}
          onApprove={handleApprove}
          onReject={(r) => handleApprove(r, false)}
        />
      )}
    </div>
  );
}
