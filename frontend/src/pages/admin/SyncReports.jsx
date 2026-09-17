import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { RefreshCw, Play, CheckCircle2, ShieldAlert, Filter, ChevronLeft, ChevronRight, FileText, Database, Globe, ChevronDown, ChevronUp, Briefcase, MapPin } from 'lucide-react';

const CountryFlag = ({ code, className = "" }) => {
  if (!code || code === 'GLOBAL' || code.length !== 2) return <Globe className={`text-gray-400 ${className}`} />;
  return (
    <img 
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} 
      alt={code} 
      title={code}
      className={`object-cover rounded-sm inline-block ${className}`} 
    />
  );
};

const SyncReports = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningSync, setRunningSync] = useState(false);
  const [filters, setFilters] = useState({ status: '', source: '', country: '', page: 1 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [stats, setStats] = useState([]);
  const [sources, setSources] = useState([]);
  
  
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [sampleJobs, setSampleJobs] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchStats();
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

  const fetchStats = async () => {
    try {
      const { data } = await adminAPI.getSyncStatsByCountry();
      if (data.success) {
        setStats(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getSyncReports(filters);
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      setExpandedLogId(null);
    } catch (err) {
      toast.error('Failed to load sync logs');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRow = async (logId) => {
    if (expandedLogId === logId) {
      setExpandedLogId(null);
      return;
    }
    setExpandedLogId(logId);
    setLoadingSamples(true);
    setSampleJobs([]);
    try {
      const { data } = await adminAPI.getSyncLogSampleJobs(logId);
      if (data.success) {
        setSampleJobs(data.data || []);
      }
    } catch (err) {
      toast.error('Failed to fetch sample jobs');
    } finally {
      setLoadingSamples(false);
    }
  };

  const handleTriggerDailySync = async () => {
    setRunningSync(true);
    try {
      await adminAPI.triggerDailySync();
      toast.success('Daily Job Ingestion and Sync triggered in background!');
      setTimeout(fetchLogs, 2000);
    } catch (err) {
      toast.error('Failed to trigger daily sync');
    } finally {
      setRunningSync(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">Sync Reports & Logs</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">
              Audit execution logs for API integrations, ingestion pipelines, and aggregators.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerDailySync}
              disabled={runningSync}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {runningSync ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Global Sync Loop
            </button>
          </div>
        </div>



        {/* Main Layout */}
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          
          {/* Left Pane (Table) */}
          <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            
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
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Execution</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Type / Source</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">Fetched</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">Inserted</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">Closed</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((log) => (
                      <React.Fragment key={log._id}>
                      <tr 
                        className={`hover:bg-gray-50/50 transition-colors group cursor-pointer ${expandedLogId === log._id ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => handleToggleRow(log._id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            {expandedLogId === log._id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            <FileText className="w-4 h-4 text-indigo-400" />
                            {new Date(log.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs font-black uppercase text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded tracking-wider w-max mb-1">
                            {log.syncType.replace('_', ' ')}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-[11px] font-bold text-gray-700 capitalize flex items-center gap-1">
                              <Database className="w-3 h-3" /> {log.source}
                            </div>
                            {log.countryCode && (
                              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-indigo-50/80 text-indigo-700 border border-indigo-200/50 px-2 py-0.5 rounded w-max mt-0.5">
                                <CountryFlag code={log.countryCode} className="w-3.5 h-2.5 rounded-sm" />
                                {log.countryCode}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-black text-gray-800">{log.jobsFetched || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-black text-emerald-600">{log.jobsInserted || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-black text-red-700">{log.jobsDeactivated || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              log.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {log.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                              <span className="capitalize">{log.status}</span>
                            </span>
                            <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity">
                              {expandedLogId === log._id ? 'Hide Details' : 'View Sample Jobs'}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {expandedLogId === log._id && (
                        <tr className="bg-gray-50/30 border-b border-gray-100">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="pl-6 border-l-2 border-indigo-200">
                              <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-3">
                                {log.syncType === 'company_discovery' ? 'Sample Companies Discovered' 
                                : log.source.toLowerCase() === 'contact_enricher' ? 'Sample Contacts Found' 
                                : 'Sample Jobs Fetched'}
                              </h4>
                              {loadingSamples ? (
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 py-2">
                                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Fetching samples...
                                </div>
                              ) : sampleJobs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {sampleJobs.map(item => (
                                    <div key={item._id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-shadow">
                                      <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <h5 className="text-sm font-black text-gray-900 line-clamp-1 flex-1" title={item.title || item.companyName || item.email}>
                                          {item.title || item.companyName || item.email}
                                        </h5>
                                        {item.countryCode && (
                                          <CountryFlag code={item.countryCode} className="w-4 h-3 rounded-[2px] shrink-0 mt-0.5" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 mb-2">
                                        {log.syncType === 'company_discovery' ? (
                                          <>
                                            <div className="flex items-center gap-1">
                                              <Globe className="w-3 h-3" /> {item.companyDomain || item.industry || 'Unknown Sector'}
                                            </div>
                                            {item.externalId && (
                                              <div className="flex items-center gap-1">
                                                <Database className="w-3 h-3" /> {item.externalId}
                                              </div>
                                            )}
                                          </>
                                        ) : log.source.toLowerCase() === 'contact_enricher' ? (
                                          <>
                                            <div className="flex items-center gap-1">
                                              <Globe className="w-3 h-3" /> {item.companyDomain}
                                            </div>
                                            {item.confidenceScore && (
                                              <div className="flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {item.confidenceScore}% Conf.
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <div className="flex items-center gap-1">
                                              <Briefcase className="w-3 h-3" /> {item.companyName || 'Unknown'}
                                            </div>
                                            <div className="flex items-center gap-1 truncate">
                                              <MapPin className="w-3 h-3" /> {item.cityName || 'Remote'}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                        <span className="text-[10px] font-bold text-gray-400">
                                          {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                        {log.syncType !== 'company_discovery' && log.source.toLowerCase() !== 'contact_enricher' && (item.externalUrl || item.applyUrl) && (
                                          <a href={item.externalUrl || item.applyUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] font-black text-indigo-600 hover:underline">
                                            View Origin
                                          </a>
                                        )}
                                        {log.syncType === 'company_discovery' && item.companyDomain && (
                                          <a href={`https://${item.companyDomain}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] font-black text-indigo-600 hover:underline">
                                            Visit Website
                                          </a>
                                        )}
                                        {log.source.toLowerCase() === 'contact_enricher' && item.sourcePage && (
                                          <a href={item.sourcePage} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] font-black text-emerald-600 hover:underline">
                                            Source Page
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs font-medium text-gray-500 italic py-2">No data available for this source.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                    {logs.length === 0 && !loading && (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500 text-sm font-medium">
                          No sync logs found. Trigger the sync loop to populate reports.
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
                Showing <span className="font-bold text-gray-900">{logs.length > 0 ? 1 : 0}</span> to <span className="font-bold text-gray-900">{logs.length}</span> of {pagination.total.toLocaleString()} logs
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="px-3 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-xs font-bold">
                  Page {pagination.page} / {pagination.pages}
                </button>
                <button 
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Sidebar (Filters) */}
          <div className="w-full xl:w-[280px] shrink-0 flex flex-col gap-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2"><Filter className="w-4 h-4"/> Filters</h3>
                <button 
                  onClick={() => setFilters({ status: '', source: '', country: '', page: 1 })}
                  className="text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  Reset
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Execution Status</label>
                  <select 
                    value={filters.status} 
                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
                    className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 outline-none focus:border-emerald-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="success">Success Only</option>
                    <option value="failed">Failed Only</option>
                    <option value="partial">Partial / In Progress</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Source Provider</label>
                  <select 
                    value={filters.source}
                    onChange={(e) => setFilters(f => ({ ...f, source: e.target.value, page: 1 }))}
                    className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 outline-none focus:border-emerald-500 capitalize"
                  >
                    <option value="">All Sources</option>
                    {sources.map(src => (
                      <option key={src._id} value={src.sourceName}>{src.sourceName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncReports;
