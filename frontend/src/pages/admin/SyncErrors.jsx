import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, Building, Terminal } from 'lucide-react';

const SyncErrors = () => {
  const [errorsData, setErrorsData] = useState({ failedLogs: [], failedCompanies: [], failedSources: [] });
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  useEffect(() => {
    fetchErrors();
  }, []);

  const fetchErrors = async () => {
    try {
      const { data } = await adminAPI.getSyncErrors();
      setErrorsData(data);
    } catch (err) {
      toast.error('Failed to load ingestion errors');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id) => {
    setRetryingId(id);
    try {
      await adminAPI.retrySyncLog(id);
      toast.success('Retry sync job successfully enqueued!');
      setTimeout(fetchErrors, 2500);
    } catch (err) {
      toast.error('Failed to retry sync');
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hasIssues = errorsData.failedLogs.length > 0 || errorsData.failedCompanies.length > 0 || errorsData.failedSources.length > 0;

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">Ingestion Error Center</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">
              Audit failed jobs, verify connection error details, and re-trigger sync operations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 border rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 ${
              hasIssues ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              {hasIssues ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              {hasIssues ? 'Action Required' : 'All Systems Operational'}
            </div>
          </div>
        </div>

        {!hasIssues ? (
          <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-8 border-white shadow-sm flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No Errors Detected</h3>
            <p className="text-sm font-medium text-gray-500 max-w-md">
              All API credentials and company connectors are operating perfectly. The ingestion pipeline is fully healthy.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Failed API Logs */}
            {errorsData.failedLogs.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                <div className="bg-red-50/50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-red-900">Failed API Runs</h2>
                    <p className="text-[11px] font-bold text-red-700 mt-0.5">Pipeline execution failures</p>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-50">
                  {errorsData.failedLogs.map((log) => (
                    <div key={log._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-black text-gray-900 capitalize">{log.source}</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{log.countryCode || 'Global'}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span className="text-[11px] font-bold text-gray-500">{new Date(log.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                          <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <Terminal className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Error Trace</span>
                          </div>
                          <p className="text-xs font-mono text-red-400 leading-relaxed line-clamp-3">
                            {log.errorMessage || 'Unknown connection timeout or parse failure.'}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center">
                        <button
                          onClick={() => handleRetry(log._id)}
                          disabled={retryingId === log._id}
                          className="px-4 py-2.5 bg-white border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {retryingId === log._id ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Retry Execution
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Company Sources */}
            {errorsData.failedCompanies.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
                <div className="bg-amber-50/50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-amber-900">Failed ATS Company Syncs</h2>
                    <p className="text-[11px] font-bold text-amber-600 mt-0.5">Individual company board failures</p>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-50">
                  {errorsData.failedCompanies.map((c) => (
                    <div key={c._id} className="p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-gray-900">{c.companyName}</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{c.countryCode || 'Global'}</span>
                        </div>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded tracking-wider uppercase">
                          Failed {c.failureCount} times
                        </span>
                      </div>
                      <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                        <div className="flex items-center gap-2 text-amber-700 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Last Recorded Error</span>
                        </div>
                        <p className="text-xs font-mono text-amber-900 leading-relaxed">
                          {c.lastError || 'Unknown connection timeout'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default SyncErrors;
