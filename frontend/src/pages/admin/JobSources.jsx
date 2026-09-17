import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldAlert, Zap, Server, Activity, Pause, Play, RefreshCw, CheckCircle2, Globe } from 'lucide-react';

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

const JobSources = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const { data } = await adminAPI.getJobSources();
      setSources(data.sources || []);
    } catch (err) {
      toast.error('Failed to load job sources');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (id) => {
    try {
      await adminAPI.pauseJobSource(id);
      toast.success('Job source paused');
      fetchSources();
    } catch (err) {
      toast.error('Failed to pause source');
    }
  };

  const handleResume = async (id) => {
    try {
      await adminAPI.resumeJobSource(id);
      toast.success('Job source activated');
      fetchSources();
    } catch (err) {
      toast.error('Failed to activate source');
    }
  };

  const handleTest = async (id) => {
    setTestingId(id);
    try {
      const { data } = await adminAPI.testJobSource(id);
      if (data.success) {
        toast.success(data.message || 'API connection test passed!');
      } else {
        toast.error(data.message || 'API connection test failed.');
      }
      fetchSources();
    } catch (err) {
      toast.error('Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      await adminAPI.syncJobSource(id);
      toast.success('Ingestion sync job successfully enqueued in background!');
    } catch (err) {
      toast.error('Failed to enqueue sync job');
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getTypeStyle = (type) => {
    if (type === 'ats') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (type === 'remote') return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">Global Ingestion Sources</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">Configure and monitor API connections for external job boards and ATS platforms</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 text-xs font-bold text-gray-700 shadow-sm">
              <Server className="w-4 h-4 text-emerald-500" />
              {sources.filter(s => s.status === 'active').length} Active Sources
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources.map((src) => (
            <div key={src._id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 overflow-hidden group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <Zap className={`w-5 h-5 ${src.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 capitalize leading-tight">{src.sourceName}</h3>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getTypeStyle(src.sourceType)}`}>
                        {src.sourceType}
                      </span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${src.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : src.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {src.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    <span className="capitalize">{src.status}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-400 uppercase tracking-wider">Frequency</span>
                    <span className="font-black text-gray-800">{src.syncRules?.frequencyHours || 24} hours</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-400 uppercase tracking-wider">Regions</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {src.supportedCountries?.length > 0 ? (
                        src.supportedCountries.map((countryCode, i) => (
                          <div key={i} className="flex items-center gap-1 text-[10px] font-black uppercase bg-indigo-50/80 text-indigo-700 border border-indigo-200/50 px-1.5 py-0.5 rounded">
                            <CountryFlag code={countryCode} className="w-3.5 h-2.5 rounded-[1px]" />
                            {countryCode}
                          </div>
                        ))
                      ) : (
                        <span className="font-bold text-gray-700">Global</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-400 uppercase tracking-wider">Rate Limit</span>
                    <span className="font-black text-gray-800">{src.rateLimit?.delayMs || 1000} ms</span>
                  </div>
                </div>

                {src.lastSyncAt && (
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Last Sync</span>
                    <span className="font-bold text-gray-700">{new Date(src.lastSyncAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                
                {src.lastError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg flex gap-2 items-start">
                    <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium text-red-700 line-clamp-2">{src.lastError}</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50/50 border-t border-gray-100 p-3 grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => handleTest(src._id)}
                  disabled={testingId === src._id}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {testingId === src._id ? <LoadingSpinner size="sm" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Test API
                </button>
                <button
                  onClick={() => handleSync(src._id)}
                  disabled={syncingId === src._id || !src.isActive}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {syncingId === src._id ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Sync Now
                </button>
                <div className="col-span-2">
                  {src.isActive ? (
                    <button
                      onClick={() => handlePause(src._id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-amber-200 hover:bg-amber-50 text-amber-700 rounded-lg text-xs font-bold transition-all"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause Ingestion
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResume(src._id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all"
                    >
                      <Play className="w-3.5 h-3.5" /> Activate Source
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default JobSources;
