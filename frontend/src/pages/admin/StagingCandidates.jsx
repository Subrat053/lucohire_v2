import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Users, Mail, MessageSquare, CheckCircle2, Search, Database, Save, Activity, Settings2, ShieldAlert, FileText, Target, Filter, ChevronLeft, ChevronRight, ChevronDown, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import React, { useRef } from 'react';

const FilterDropdown = ({ label, icon: Icon, value, setValue, options, placeholder, fullWidth = false, allowCustom = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (allowCustom && searchTerm && !options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase())) {
          setValue(searchTerm);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm, options, setValue, allowCustom]);

  const allOptions = Array.from(new Set([...options, ...(value && value !== 'all' ? [value] : [])]));
  const filteredOptions = allOptions.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  const sortedFilteredOptions = [...filteredOptions].sort((a, b) => {
    if (a === value) return -1;
    if (b === value) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'w-full sm:w-auto min-w-[150px]'}`} ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center text-xs font-bold bg-white border rounded-lg px-3 py-2.5 cursor-pointer transition whitespace-nowrap ${fullWidth ? 'w-full justify-between' : 'justify-between'} ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-sm' : 'border-gray-200 hover:bg-gray-50/50 text-gray-700 bg-gray-50/50'}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
          <span className={`truncate ${value && value !== label ? "text-gray-900 capitalize" : "text-gray-700"}`}>
            {(value === 'all' || value === '') ? label : value}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {(value && value !== 'all' && value !== label && value !== '') && (
            <X 
              className="w-3.5 h-3.5 text-gray-400 hover:text-red-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setValue('');
              }}
            />
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`} />
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-50 top-full mt-1 left-0 w-full min-w-[160px] bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col`}>
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={placeholder || `Search...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (allowCustom && searchTerm.trim()) {
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
            {allowCustom && searchTerm.trim() && !options.some(opt => opt.toLowerCase() === searchTerm.trim().toLowerCase()) && (
              <li
                className="px-3 py-2 text-xs cursor-pointer hover:bg-indigo-50 text-blue-600 font-medium border-b border-gray-50 mb-1"
                onClick={() => { setValue(searchTerm.trim()); setSearchTerm(''); setIsOpen(false); }}
              >
                Search for "{searchTerm}"
              </li>
            )}
            {sortedFilteredOptions.length > 0 ? (
              sortedFilteredOptions.map((opt, i) => (
                <li 
                  key={i}
                  className={`px-3 py-2 text-xs cursor-pointer capitalize font-bold ${
                    opt === value ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-700 hover:bg-indigo-50'
                  }`}
                  onClick={() => {
                    setValue(opt);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {opt === value ? (
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">{opt}</span>
                  </div>
                </li>
              ))
            ) : (
              !searchTerm.trim() && <li className="px-3 py-2 text-xs text-gray-400 text-center font-medium">No match found</li>
            )}
            {value && value !== 'all' && value !== label && value !== '' && (
              <li 
                className="px-3 py-2 text-xs text-red-700 hover:bg-red-50 cursor-pointer border-t border-gray-50 mt-1 font-bold"
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

export default function StagingCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('staged');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    fetchCandidates();
    fetchSettings();
  }, [statusFilter, leadStatusFilter, pagination.page]);

  const fetchSettings = async () => {
    try {
      const { data } = await adminAPI.getSettings();
      const list = Array.isArray(data) ? data : data.settings || [];
      const vals = {};
      list.forEach(s => { 
        vals[s._id] = s.value; 
        if (s.key === 'apify_naukri_cookie') vals.apify_naukri_cookie = s.value; 
        if (s.key === 'daily_scraper_limit') vals.daily_scraper_limit = s.value; 
      });
      setEditValues(vals);
    } catch {
      toast.error('Failed to load settings');
    }
  };

  const handleSaveSetting = async (setting) => {
    try {
      await adminAPI.updateSettings({ settings: [{ key: setting.key, value: setting.value, description: setting.description, category: setting.category }] });
      toast.success(`${setting.key} updated`);
    } catch { toast.error('Failed to update'); }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getStagingCandidates({
        page: pagination.page,
        limit: 50,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        leadStatus: leadStatusFilter !== 'all' ? leadStatusFilter : undefined
      });
      setCandidates(data.data);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Failed to load staging candidates');
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = async (id, type, currentValue) => {
    try {
      await adminAPI.updateStagingCandidateToggle(id, type, !currentValue);
      setCandidates(prev => prev.map(c => 
        c._id === id 
          ? { ...c, [type === 'email' ? 'emailToggle' : 'whatsappToggle']: !currentValue } 
          : c
      ));
      toast.success(`${type} toggle updated`);
    } catch (error) {
      toast.error(`Failed to update ${type} toggle`);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">Scraped Candidates</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">
              Review and stage candidate leads before automated morning outreach.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {pagination.total.toLocaleString()} Candidates Queued
            </div>
          </div>
        </div>

        {/* Scraper Engine Config Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-50 bg-gray-50/50 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <Settings2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900">Scraper Engine Configuration</h2>
                <p className="text-[11px] font-bold text-gray-500">Manage Apify integration and daily budget limits</p>
              </div>
            </div>
            <button
              onClick={() => {
                const sCookie = editValues.apify_naukri_cookie || '';
                const sLimit = editValues.daily_scraper_limit || '500';
                handleSaveSetting({ key: 'apify_naukri_cookie', category: 'scraper', value: sCookie, description: 'Naukri Session Cookie' });
                handleSaveSetting({ key: 'daily_scraper_limit', category: 'scraper', value: sLimit, description: 'Daily max scrape limit' });
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-sm transition-all flex items-center gap-2 shrink-0"
            >
              <Save className="w-3.5 h-3.5" /> Save Config
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Naukri Session Cookie</label>
              <textarea
                rows={2}
                value={editValues.apify_naukri_cookie || ''}
                onChange={(e) => setEditValues({ ...editValues, apify_naukri_cookie: e.target.value })}
                placeholder="Paste the full session cookie string here..."
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-xs font-mono outline-none shadow-inner"
              />
              <p className="text-[10px] font-bold text-gray-400 mt-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-amber-500" /> Required for Apify to authenticate and scrape private candidate data securely.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Daily Scraping Limit (Budget Control)
              </label>
              <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                <input
                  type="range"
                  min="10"
                  max="5000"
                  step="10"
                  value={editValues.daily_scraper_limit || 500}
                  onChange={(e) => setEditValues({ ...editValues, daily_scraper_limit: e.target.value })}
                  className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex items-center gap-2 shrink-0 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm">
                  <input
                    type="number"
                    value={editValues.daily_scraper_limit || 500}
                    onChange={(e) => setEditValues({ ...editValues, daily_scraper_limit: e.target.value })}
                    className="w-14 text-sm text-center font-black text-indigo-700 bg-transparent outline-none"
                  />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">profiles/day</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col gap-6">
          
          {/* Horizontal Filters Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2 pr-4 sm:border-r border-gray-100">
                <Filter className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-black text-gray-900">Filters</span>
              </div>
              
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-auto">
                  <FilterDropdown
                    label="All Statuses"
                    value={
                      statusFilter === 'all' ? 'All Statuses' :
                      statusFilter === 'staged' ? 'Staged (Pending Outreach)' :
                      statusFilter === 'outreach_sent' ? 'Outreach Sent' :
                      statusFilter === 'claimed' ? 'Claimed (Active User)' : statusFilter
                    }
                    setValue={val => {
                      const lower = val.toLowerCase();
                      if (val === '' || lower === 'all statuses') setStatusFilter('all');
                      else {
                        const sMap = {
                          'all statuses': 'all',
                          'staged (pending outreach)': 'staged',
                          'outreach sent': 'outreach_sent',
                          'claimed (active user)': 'claimed'
                        };
                        let mapped = sMap[lower] || val;
                        if (!sMap[lower]) {
                          if (lower.includes('staged') || lower.includes('pending')) mapped = 'staged';
                          else if (lower.includes('sent') || lower.includes('outreach')) mapped = 'outreach_sent';
                          else if (lower.includes('claimed') || lower.includes('active')) mapped = 'claimed';
                        }
                        setStatusFilter(mapped);
                      }
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    options={['Staged (Pending Outreach)', 'Outreach Sent', 'Claimed (Active User)']}
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <FilterDropdown
                    label="All Lead Tiers"
                    value={leadStatusFilter === 'all' ? 'All Lead Tiers' : leadStatusFilter}
                    setValue={val => {
                      if (val === '' || val.toLowerCase() === 'all lead tiers') setLeadStatusFilter('all');
                      else setLeadStatusFilter(val);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    options={['Verified Active Candidate', 'Active Signal Lead', 'Raw Lead']}
                  />
                </div>
                <div className="w-full sm:w-auto sm:ml-auto">
                  <button 
                    onClick={() => {
                      setStatusFilter('all');
                      setLeadStatusFilter('all');
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full sm:w-auto text-[11px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-4 py-2.5 rounded-lg"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            
            <div className="overflow-x-auto custom-scrollbar relative min-h-[400px]">
              {loading && candidates.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Candidate</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Source Query</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">Outreach Channels</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Outreach Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Lead Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Score / Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {candidates.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                              <Users className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-gray-900 truncate max-w-[200px]" title={c.name}>{c.name}</div>
                              <div className="text-[11px] font-bold text-gray-500 mt-0.5">{c.email || 'No Email'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg tracking-wider w-max">
                            {c.metadata?.sourceQuery || 'Generic Scrape'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => toggleChannel(c._id, 'email', c.emailToggle)}
                              className={`flex flex-col items-center gap-1 transition-all ${c.emailToggle ? 'text-indigo-600 hover:text-indigo-700' : 'text-gray-300 hover:text-gray-400'}`}
                              title="Toggle Email Outreach"
                            >
                              <div className={`p-1.5 rounded-full border ${c.emailToggle ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                                <Mail className="w-4 h-4" />
                              </div>
                            </button>
                            <button
                              onClick={() => toggleChannel(c._id, 'whatsapp', c.whatsappToggle)}
                              className={`flex flex-col items-center gap-1 transition-all ${c.whatsappToggle ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-300 hover:text-gray-400'}`}
                              title="Toggle WhatsApp Outreach"
                            >
                              <div className={`p-1.5 rounded-full border ${c.whatsappToggle ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                                <MessageSquare className="w-4 h-4" />
                              </div>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 w-max ${
                            c.status === 'claimed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            c.status === 'outreach_sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider border w-max block ${
                            c.leadStatus === 'Verified Active Candidate' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            c.leadStatus === 'Active Signal Lead' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            {c.leadStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-black text-gray-800">{c.score || 0} pts</span>
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
                            <FileText className="w-3 h-3" /> {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {candidates.length === 0 && !loading && (
                      <tr>
                        <td colSpan="6" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <Search className="w-12 h-12 mb-4 text-gray-300" />
                            <p className="text-sm font-bold text-gray-900 mb-1">No staged candidates found</p>
                            <p className="text-xs font-medium">Try adjusting your filters.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="text-xs font-medium text-gray-500">
                Showing <span className="font-bold text-gray-900">{candidates.length > 0 ? 1 : 0}</span> to <span className="font-bold text-gray-900">{candidates.length}</span> of {pagination.total.toLocaleString()} candidates
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="px-4 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-black shadow-sm">
                  Page {pagination.page} of {pagination.pages}
                </button>
                <button 
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
