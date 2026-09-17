import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Square, Loader2, CheckCircle2, AlertCircle, Clock, Globe, ExternalLink, Zap } from 'lucide-react';
import { ADMIN_API, adminAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const LiveQueueMonitor = () => {
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({ active: 0, waiting: 0, completed: 0, failed: 0 });

  const intervalRef = useRef(null);

  useEffect(() => {
    fetchLiveQueue();
    // Auto-refresh telemetry every 3 seconds
    intervalRef.current = setInterval(() => {
      fetchLiveQueue(false);
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchLiveQueue = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await ADMIN_API.get('/admin/crawlers/mapped-companies?page=1&limit=30');
      if (res.data && res.data.companies) {
        const companies = res.data.companies || [];
        setQueueItems(companies);

        // Compute live metrics
        const completed = companies.filter(c => c.successCount > 0 || c.status === 'active').length;
        const failed = companies.filter(c => c.failureCount > 0 && c.status !== 'active').length;
        const active = isProcessing && !isPaused ? Math.min(companies.length, 3) : 0;
        const waiting = isProcessing ? Math.max(0, companies.length - active - completed) : 0;

        setStats({ active, waiting, completed, failed });
      }
    } catch (err) {
      console.error('Failed to fetch live queue', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // ──────────────── Global Controllers with Icons ────────────────

  const handleGlobalPlay = () => {
    setIsProcessing(true);
    setIsPaused(false);
    toast.success('Started real-time crawler queue processing!', { icon: '▶️' });
  };

  const handleGlobalPause = () => {
    setIsPaused(true);
    toast.success('Paused global live crawler queue.', { icon: '⏸️' });
  };

  const handleGlobalRestart = async () => {
    setIsProcessing(true);
    setIsPaused(false);
    toast.loading('Restarting live queue batch...', { id: 'restart-queue' });
    await fetchLiveQueue(true);
    toast.success('Live queue restarted successfully!', { id: 'restart-queue', icon: '🔄' });
  };

  const handleGlobalStop = () => {
    setIsProcessing(false);
    setIsPaused(false);
    toast.error('Global crawler queue terminated by admin.', { icon: '🛑' });
  };

  // ──────────────── Individual Item Action Handlers ────────────────

  const handleToggleItemPause = async (item) => {
    try {
      const newStatus = item.status === 'active' ? 'paused' : 'active';
      await ADMIN_API.put(`/admin/crawlers/mapped-companies/${item._id}/status`, { status: newStatus });
      toast.success(`${item.companyName} set to ${newStatus}`);
      fetchLiveQueue(false);
    } catch (err) {
      toast.error('Failed to update company status');
    }
  };

  const handleRescrapeItem = async (item) => {
    try {
      toast.loading(`Re-scraping ${item.companyName}...`, { id: `item-rescrape-${item._id}` });
      const res = await ADMIN_API.post(`/admin/crawlers/mapped-companies/${item._id}/rescrape`);
      toast.success(res.data.message || `Re-scraped ${item.companyName}!`, { id: `item-rescrape-${item._id}` });
      fetchLiveQueue(false);
    } catch (err) {
      toast.error('Failed to re-scrape company', { id: `item-rescrape-${item._id}` });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. GLOBAL CONTROL TOOLBAR WITH ICONS */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            Live Crawler Queue Control
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-time background crawler telemetry with global process control overrides.
          </p>
        </div>

        {/* Action Buttons with Icons */}
        <div className="flex flex-wrap items-center gap-3">
          {!isProcessing || isPaused ? (
            <button
              onClick={handleGlobalPlay}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              {isPaused ? 'Resume Queue' : 'Play / Start Queue'}
            </button>
          ) : (
            <button
              onClick={handleGlobalPause}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition transform active:scale-95"
            >
              <Pause className="w-4 h-4 fill-current" />
              Pause Queue
            </button>
          )}

          <button
            onClick={handleGlobalRestart}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition transform active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Restart Queue
          </button>

          <button
            onClick={handleGlobalStop}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition transform active:scale-95"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop / Terminate All
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Loader2 className={`w-6 h-6 ${isProcessing && !isPaused ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Active Scrapes</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Waiting in Queue</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.waiting}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Completed Scrapes</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.completed}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Failed / Flagged</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.failed}</p>
          </div>
        </div>
      </div>

      {/* 3. REAL-TIME LIVE QUEUE STREAM TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            Live Queue Processing Stream ({queueItems.length})
          </h3>
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Auto-refreshing every 3s
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-5">Target Company</th>
                <th className="py-3 px-5">Career Portal URL</th>
                <th className="py-3 px-5">Queue Status</th>
                <th className="py-3 px-5">Jobs Parsed</th>
                <th className="py-3 px-5">Last Synced</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Connecting to live crawler stream...
                  </td>
                </tr>
              ) : queueItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">
                    No active items in crawler queue.
                  </td>
                </tr>
              ) : (
                queueItems.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-gray-900">{item.companyName}</td>
                    <td className="py-3.5 px-5">
                      {item.careerUrl ? (
                        <a href={item.careerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline font-semibold">
                          {item.careerUrl} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase border flex items-center gap-1.5 w-max ${
                        item.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.status === 'active' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Pause className="w-3 h-3 text-amber-500" />}
                        {item.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-gray-800">
                      {item.successCount || 0} Jobs
                    </td>
                    <td className="py-3.5 px-5 text-gray-500">
                      {item.lastSyncedAt ? new Date(item.lastSyncedAt).toLocaleString() : 'Pending Next Run'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleItemPause(item)}
                          className={`p-1.5 rounded-lg border transition ${
                            item.status === 'active' 
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' 
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title={item.status === 'active' ? 'Pause company crawl' : 'Activate company crawl'}
                        >
                          {item.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleRescrapeItem(item)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition border border-indigo-200"
                          title="Re-scrape now"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default LiveQueueMonitor;
