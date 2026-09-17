/**
 * CandidateUnlockLogs.jsx
 * Admin page: candidate profile unlock audit log with date filters & search.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ADMIN_API } from '../../services/api';
import {
  Lock, RefreshCw, Loader2, AlertTriangle, Search,
  CheckCircle2, Calendar, Filter, X, ChevronDown
} from 'lucide-react';

const FilterDropdown = ({ label, value, setValue, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayValue = options.find(opt => opt.value === value)?.label || label;

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-700 cursor-pointer transition hover:bg-white ${
          isOpen ? 'border-amber-500 ring-2 ring-amber-500/20 bg-white' : 'border-gray-200'
        }`}
      >
        <span className={value && value !== 'all' ? 'text-gray-900' : 'text-gray-700'}>{displayValue}</span>
        <ChevronDown className={`w-4 h-4 transition-transform text-gray-400 ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-full w-max bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => (
              <li
                key={i}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-amber-50 ${
                  opt.value === value ? 'text-amber-700 font-semibold bg-amber-50/50' : 'text-gray-700'
                }`}
                onClick={() => { setValue(opt.value); setSearchTerm(''); setIsOpen(false); }}
              >
                {opt.label}
              </li>
            )) : (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">No match</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default function CandidateUnlockLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  
  // Filters
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        search,
        purpose: purposeFilter,
        dateRange,
        ...(dateRange === 'custom' && startDate ? { startDate } : {}),
        ...(dateRange === 'custom' && endDate ? { endDate } : {}),
      });

      const res = await ADMIN_API.get(`/admin/logs/candidate-unlocks?${params}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidate unlock logs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, purposeFilter, dateRange, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [search, purposeFilter, dateRange, startDate, endDate]);

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';
  const isExpired = (log) => log.expiresAt && new Date() > new Date(log.expiresAt);

  const resetFilters = () => {
    setSearch('');
    setPurposeFilter('all');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = search || purposeFilter !== 'all' || dateRange !== 'all' || startDate || endDate;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-6 h-6 text-amber-600" /> Candidate Unlock Audit Logs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit history of candidate profile unlocks, contact views, and recruiter access logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-xs hover:bg-gray-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
              placeholder="Search by recruiter or candidate name/email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <FilterDropdown
              label="🗓️ All Time"
              value={dateRange}
              setValue={setDateRange}
              options={[
                { value: 'all', label: '🗓️ All Time' },
                { value: 'today', label: '⚡ Today' },
                { value: 'yesterday', label: '⏪ Yesterday' },
                { value: 'this_week', label: '📅 This Week' },
                { value: 'this_month', label: '📆 This Month' },
                { value: 'custom', label: '⚙️ Custom Date Range' },
              ]}
            />
          </div>

          {/* Purpose Filter */}
          <FilterDropdown
            label="🔑 All Unlock Types"
            value={purposeFilter}
            setValue={setPurposeFilter}
            options={[
              { value: 'all', label: '🔑 All Unlock Types' },
              { value: 'view_contact', label: '📞 View Contact Details' },
              { value: 'view_resume', label: '📄 View Resume PDF' },
              { value: 'full_profile', label: '👤 Full Profile Access' },
            ]}
          />

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-semibold transition shrink-0"
              title="Reset all filters"
            >
              <X className="w-4 h-4" /> Reset
            </button>
          )}
        </div>

        {/* Custom Date Range Inputs */}
        {dateRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-xs">
            <span className="font-semibold text-gray-700">Select Date Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-gray-500">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-500">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>Showing <strong>{logs.length}</strong> of <strong>{total}</strong> candidate unlock entries</span>
        {hasActiveFilters && (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full font-medium border border-amber-200">
            Filtered Results Active
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-3 border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-700" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-xs">
          No candidate unlock records match your selected date or type filters.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['Recruiter', 'Candidate', 'Purpose / Type', 'OTP Verified', 'Subscription Plan', 'Unlocked At', 'Access Expires', 'IP Address'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log._id} className={`hover:bg-amber-50/30 transition ${isExpired(log) ? 'opacity-65' : ''}`}>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900">{log.recruiterId?.name || '—'}</div>
                      <div className="text-xs text-gray-400 font-mono">{log.recruiterId?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900">{log.providerId?.name || '—'}</div>
                      <div className="text-xs text-gray-400 font-mono">{log.providerId?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-gray-700 font-medium">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs font-semibold">
                        {log.purpose?.replace(/_/g, ' ') || 'Contact Unlock'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {log.otpVerified
                        ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-700 font-medium">{log.planId?.name || 'Standard Unlock'}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap font-mono">{formatDate(log.unlockedAt || log.createdAt)}</td>
                    <td className="px-4 py-3.5 text-xs whitespace-nowrap font-mono">
                      <span className={isExpired(log) ? 'text-red-600 font-bold' : 'text-gray-500'}>
                        {formatDate(log.expiresAt)}
                        {isExpired(log) && <span className="ml-1 text-red-700 text-[10px] font-bold uppercase">(Expired)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 font-mono">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs font-semibold text-gray-500">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100 transition shadow-xs"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100 transition shadow-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
