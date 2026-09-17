/**
 * OtpLogs.jsx
 * Admin page: paginated OTP audit log with date filters & multi-channel tracking.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ADMIN_API, adminAPI } from '../../services/api';
import {
  ShieldCheck, Phone, Mail, AlertTriangle, Search,
  RefreshCw, Loader2, Calendar, Filter, X, ChevronDown
} from 'lucide-react';

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
        className={`flex items-center text-sm bg-white border rounded-xl px-3.5 py-2.5 transition whitespace-nowrap ${fullWidth ? 'w-full justify-between' : 'justify-between'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${isOpen && !disabled ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm' : 'border-gray-200 text-gray-700'}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {Icon && <Icon className="w-4 h-4 shrink-0 text-gray-400" />}
          <span className={`truncate font-medium ${value ? "text-gray-900" : "text-gray-700"}`}>
            {displayValue || label}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`} />
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

const CHANNEL_BADGE = {
  phone: { icon: <Phone className="w-3.5 h-3.5" />, cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  email: { icon: <Mail className="w-3.5 h-3.5" />, cls: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const STATUS_BADGE = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-gray-100 text-gray-500 border-gray-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function OtpLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  
  // Filters State
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        search,
        status: statusFilter,
        channel: channelFilter,
        dateRange,
        ...(dateRange === 'custom' && startDate ? { startDate } : {}),
        ...(dateRange === 'custom' && endDate ? { endDate } : {}),
      };

      const res = await adminAPI.getOtpLogs(params);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load OTP logs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, channelFilter, dateRange, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [search, statusFilter, channelFilter, dateRange, startDate, endDate]);

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';

  const getStatus = (log) => {
    if (log.verifiedAt) return 'verified';
    if (log.blockedUntil && new Date() < new Date(log.blockedUntil)) return 'blocked';
    if (new Date() > new Date(log.expiresAt)) return 'expired';
    return 'pending';
  };

  const resetFilters = () => {
    setSearch('');
    setChannelFilter('');
    setStatusFilter('');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = search || channelFilter || statusFilter || dateRange !== 'all' || startDate || endDate;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" /> OTP Verification Audit Logs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Realtime security tracking of email and SMS/WhatsApp OTP transactions.
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
              className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              placeholder="Search by target email, phone, purpose, or user name..."
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
                { value: 'custom', label: '⚙️ Custom Date Range' }
              ]}
            />
          </div>

          {/* Channel Selector */}
          <div className="shrink-0">
            <FilterDropdown
              label="📱 All Channels"
              value={channelFilter}
              setValue={setChannelFilter}
              options={[
                { value: '', label: '📱 All Delivery Channels' },
                { value: 'phone', label: 'Phone / WhatsApp / SMS' },
                { value: 'email', label: 'Email' }
              ]}
            />
          </div>

          {/* Status Selector */}
          <div className="shrink-0">
            <FilterDropdown
              label="⚡ All Statuses"
              value={statusFilter}
              setValue={setStatusFilter}
              options={[
                { value: '', label: '⚡ All Statuses' },
                { value: 'verified', label: '✅ Verified' },
                { value: 'pending', label: '⏳ Pending' },
                { value: 'expired', label: '❌ Expired' },
                { value: 'blocked', label: '⛔ Blocked' }
              ]}
            />
          </div>

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
                className="px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-500">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>Showing <strong>{logs.length}</strong> of <strong>{total}</strong> OTP audit transactions</span>
        {hasActiveFilters && (
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium border border-indigo-200">
            Filtered Results Active
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-3 border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-700" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-xs">
          No OTP audit log records match your selected date or status filters.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['Account User', 'Purpose', 'Channel', 'Target Address', 'Status', 'Attempts', 'Verified At', 'Dispatched At'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => {
                  const status = getStatus(log);
                  const ch = CHANNEL_BADGE[log.channel] || { cls: 'bg-gray-100 text-gray-700 border-gray-200', icon: null };
                  return (
                    <tr key={log._id} className="hover:bg-indigo-50/30 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">{log.userId?.name || 'Unauthenticated / Guest'}</div>
                        <div className="text-xs text-gray-400 font-mono">{log.userId?.email || ''}</div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 capitalize font-medium">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-semibold">
                          {log.purpose?.replace(/_/g, ' ') || 'Authentication'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${ch.cls}`}>
                          {ch.icon} <span className="capitalize">{log.channel}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900">{log.target || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`font-mono text-xs font-extrabold ${log.attempts >= 3 ? 'text-red-600' : 'text-slate-700'}`}>{log.attempts} / 5</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap font-mono">{formatDate(log.verifiedAt)}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap font-mono">{formatDate(log.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
