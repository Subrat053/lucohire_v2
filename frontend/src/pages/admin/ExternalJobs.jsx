import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Briefcase, Download, Search, Filter, MapPin, Building, Globe, ExternalLink, RefreshCw, Trash2, ChevronLeft, ChevronRight, CheckCircle2, ShieldAlert, FileSpreadsheet, Sparkles, Calendar, ChevronDown, X, Check } from 'lucide-react';

const FilterDropdown = ({ label, icon: Icon, value, setValue, options, placeholder, fullWidth = false, allowCustom = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = React.useRef(null);

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
  }, [searchTerm, options, setValue]);

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
          <span className={`truncate ${value ? "text-gray-900 capitalize" : "text-gray-700"}`}>
            {value || label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {(value && value !== 'all') && (
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
            {value && (
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

const ExternalJobs = ({ defaultFilters = {} }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ country: '', source: '', isActive: 'true', datePreset: '', startDate: '', endDate: '', page: 1, search: '', ...defaultFilters });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [uniqueCompaniesCount, setUniqueCompaniesCount] = useState(0);
  const [refreshingId, setRefreshingId] = useState(null);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const { data } = await adminAPI.getJobSources();
        setSources(data.sources || []);
      } catch (err) {
        console.error('Failed to load sources for filter', err);
      }
    };
    fetchSources();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getExternalJobs(filters);
      setJobs(data.jobs || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      setUniqueCompaniesCount(data.uniqueCompaniesCount || 0);
    } catch (err) {
      toast.error('Failed to load external jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this synced job posting?')) return;
    try {
      await adminAPI.deleteExternalJob(id);
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (err) {
      toast.error('Failed to delete job');
    }
  };

  const handleRefresh = async (id) => {
    setRefreshingId(id);
    try {
      await adminAPI.refreshExternalJob(id);
      toast.success('Job status refreshed');
      fetchJobs();
    } catch (err) {
      toast.error('Failed to refresh job');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDownloadCompaniesCsv = async () => {
    try {
      toast.loading("Generating CSV...", { id: "csv" });
      const response = await adminAPI.exportExternalCompaniesCsv();
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ats_companies.csv');
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("CSV Downloaded Successfully!", { id: "csv" });
    } catch (err) {
      toast.error("Failed to download CSV", { id: "csv" });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">Synced Jobs Library</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">
              Monitor and manage {pagination?.total?.toLocaleString() || 0} jobs mapped from external sources.
            </p>
          </div>
        </div>

        {/* Highlight Banner for CSV Export */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl p-[1px] shadow-sm">
          <div className="bg-white rounded-[15px] p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl opacity-50"></div>
            
            <div className="flex items-center gap-4 z-10">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-black text-gray-900">Companies Network Export</h2>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3" /> New
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-500">
                  We are currently syncing jobs from <span className="font-black text-indigo-600">{uniqueCompaniesCount.toLocaleString()}</span> unique external companies. Download the complete master list to analyze sources, locations, and integrations.
                </p>
              </div>
            </div>
            <div className="shrink-0 z-10 w-full md:w-auto">
              <button
                onClick={handleDownloadCompaniesCsv}
                className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
              >
                <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                Download Master CSV
              </button>
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
                    value={filters.isActive === 'true' ? 'Active Only' : filters.isActive === 'false' ? 'Closed Only' : filters.isActive}
                    setValue={val => {
                      const lower = val.toLowerCase();
                      setFilters(f => ({ 
                        ...f, 
                        isActive: lower.includes('active') ? 'true' : lower.includes('closed') ? 'false' : val, 
                        page: 1 
                      }));
                    }}
                    options={['Active Only', 'Closed Only']}
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <FilterDropdown
                    label="All Sources"
                    value={filters.source}
                    setValue={val => setFilters(f => ({ ...f, source: val, page: 1 }))}
                    options={sources.map(src => src.sourceName)}
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <FilterDropdown
                    label="All Countries"
                    value={
                      filters.country === 'US' ? 'USA (US)' :
                      filters.country === 'IN' ? 'India (IN)' :
                      filters.country === 'GB' ? 'UK (GB)' :
                      filters.country === 'CA' ? 'Canada (CA)' :
                      filters.country === 'AE' ? 'UAE (AE)' :
                      filters.country === 'AU' ? 'Australia (AU)' : filters.country
                    }
                    setValue={val => {
                      const lower = val.toLowerCase();
                      const cMap = {
                        'usa (us)': 'US', 'india (in)': 'IN', 'uk (gb)': 'GB',
                        'canada (ca)': 'CA', 'uae (ae)': 'AE', 'australia (au)': 'AU'
                      };
                      let mapped = cMap[lower];
                      if (!mapped) {
                        if (lower.includes('india') || lower === 'in') mapped = 'IN';
                        else if (lower.includes('usa') || lower.includes('united states') || lower === 'us') mapped = 'US';
                        else if (lower.includes('uk') || lower.includes('united kingdom') || lower === 'gb') mapped = 'GB';
                        else if (lower.includes('canada') || lower === 'ca') mapped = 'CA';
                        else if (lower.includes('uae') || lower.includes('emirates') || lower === 'ae') mapped = 'AE';
                        else if (lower.includes('australia') || lower === 'au') mapped = 'AU';
                        else mapped = val;
                      }
                      setFilters(f => ({ ...f, country: mapped, page: 1 }));
                    }}
                    options={['USA (US)', 'India (IN)', 'UK (GB)', 'Canada (CA)', 'UAE (AE)', 'Australia (AU)']}
                  />
                </div>

                {/* Date-wise Filter */}
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <FilterDropdown
                    label="All Dates"
                    value={
                      filters.datePreset === 'today' ? 'Today' :
                      filters.datePreset === 'yesterday' ? 'Yesterday' :
                      filters.datePreset === '7days' ? 'Last 7 Days' :
                      filters.datePreset === '30days' ? 'Last 30 Days' :
                      filters.datePreset === 'custom' ? 'Custom Date Range' : filters.datePreset
                    }
                    setValue={val => {
                      const lower = val.toLowerCase();
                      const dMap = {
                        'today': 'today', 'yesterday': 'yesterday',
                        'last 7 days': '7days', 'last 30 days': '30days', 'custom date range': 'custom'
                      };
                      setFilters(f => ({ ...f, datePreset: dMap[lower] || val, startDate: '', endDate: '', page: 1 }));
                    }}
                    options={['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Custom Date Range']}
                  />
                </div>

                {filters.datePreset === 'custom' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto bg-gray-50/80 p-1.5 rounded-lg border border-gray-200">
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))}
                      className="text-xs font-semibold text-gray-700 px-2 py-1.5 rounded bg-white border border-gray-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-gray-400">to</span>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))}
                      className="text-xs font-semibold text-gray-700 px-2 py-1.5 rounded bg-white border border-gray-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="w-full sm:w-auto sm:ml-auto">
                  <button 
                    onClick={() => setFilters({ country: '', source: '', isActive: 'true', datePreset: '', startDate: '', endDate: '', page: 1, search: '' })}
                    className="w-full sm:w-auto text-[11px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-4 py-2.5 rounded-lg"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Table Search & Stats Bar */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-50 bg-gray-50/50">
              <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs by title, company..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
                />
              </form>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-gray-400" /> {pagination.total.toLocaleString()} Synced Jobs
                </span>
              </div>
            </div>

            {/* Table Data */}
            <div className="overflow-x-auto custom-scrollbar relative min-h-[400px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Job Position</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Location</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Salary Range</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Source</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {jobs.map((job) => (
                      <tr key={job._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                              <Briefcase className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-gray-900 truncate max-w-[220px]" title={job.title}>{job.title}</div>
                              <div className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <Building className="w-3.5 h-3.5 text-gray-400" /> {job.companyName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="truncate max-w-[120px]">{job.city || 'Anywhere'}</span>
                          </div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-5 mt-1">
                            {job.countryCode || 'Global'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs font-black text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-100 inline-block">
                            {job.salaryMin ? `${job.currency || '$'} ${job.salaryMin.toLocaleString()} - ${job.salaryMax ? job.salaryMax.toLocaleString() : 'N/A'}` : 'Not Specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg tracking-wider">
                            {job.source}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 w-max ${
                            job.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                            {job.isActive ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                            {job.isActive ? 'Active' : 'Closed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                            {job.sourceUrl && (
                              <a 
                                href={job.sourceUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm"
                                title="View Original Job"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button 
                              onClick={() => handleRefresh(job._id)}
                              disabled={refreshingId === job._id}
                              className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-colors shadow-sm disabled:opacity-50"
                              title="Refresh Status"
                            >
                              {refreshingId === job._id ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => handleDelete(job._id)}
                              className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm"
                              title="Delete Job"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && !loading && (
                      <tr>
                        <td colSpan="6" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <Search className="w-12 h-12 mb-4 text-gray-300" />
                            <p className="text-sm font-bold text-gray-900 mb-1">No jobs found</p>
                            <p className="text-xs font-medium">Try adjusting your filters or search query.</p>
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
                Showing <span className="font-bold text-gray-900">{jobs.length > 0 ? 1 : 0}</span> to <span className="font-bold text-gray-900">{jobs.length}</span> of {pagination.total.toLocaleString()} jobs
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="px-4 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-black shadow-sm">
                  Page {pagination.page} of {pagination.pages}
                </button>
                <button 
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
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
};

export default ExternalJobs;
