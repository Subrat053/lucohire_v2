import React, { useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Database, Zap, Clock, ShieldAlert, CheckCircle2, Play, Calendar } from 'lucide-react';

// --- Components ---
const KPICard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</div>
    </div>
    <div>
      <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
      <div className="text-[10px] font-bold text-gray-400">{subtext}</div>
    </div>
  </div>
);

const FeatureCard = ({ title, desc, icon: Icon, colorClass, borderClass }) => (
  <div className={`p-6 rounded-xl border ${borderClass} flex flex-col h-full bg-white shadow-sm`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClass} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
    <h3 className="text-lg font-black text-gray-900 mb-2">{title}</h3>
    <p className="text-sm font-medium text-gray-500">{desc}</p>
  </div>
);

const DataPipeline = () => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await adminAPI.triggerDailySync();
      toast.success('Manual sync triggered successfully! Check reports for progress.');
    } catch (err) {
      toast.error('Failed to trigger sync. Make sure sources are active.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">Data Pipeline Overview</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">Manage global job sources and monitor synchronization health</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 text-xs font-bold text-gray-700 shadow-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              Automated Daily Runs
            </div>
          </div>
        </div>

        {/* Top KPIs (Mock stats for overview since the API doesn't provide them here yet) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Synced Jobs" value="Active" subtext="Across all platforms" icon={Database} colorClass="text-blue-500" />
          <KPICard title="Active Sources" value="Monitoring" subtext="APIs & Scrapers" icon={Zap} colorClass="text-emerald-500" />
          <KPICard title="Next Scheduled" value="24 hrs" subtext="Automated interval" icon={Clock} colorClass="text-amber-500" />
          <KPICard title="Sync Health" value="Stable" subtext="No critical errors" icon={CheckCircle2} colorClass="text-teal-500" />
        </div>

        {/* Runner Control Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-xl font-black text-gray-900 mb-2">Pipeline Engine Runner</h2>
            <p className="text-sm font-medium text-gray-500 mb-0">
              The engine runs automatically every 24 hours to keep external jobs perfectly synchronized with your database. You can manually force a run across all active sources if you need immediate updates.
            </p>
          </div>
          <div className="shrink-0">
            <button 
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-sm shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <><Database className="w-5 h-5 animate-pulse" /> Triggering Engine...</>
              ) : (
                <><Play className="w-5 h-5" /> Force Manual Sync</>
              )}
            </button>
          </div>
        </div>

        {/* Features / Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            title="Global Sources" 
            desc="Configure and activate direct API integrations like RemoteOK, The Muse, and standard ATS systems."
            icon={Database} 
            colorClass="bg-blue-50 text-blue-600" 
            borderClass="border-blue-100"
          />
          <FeatureCard 
            title="Jobs Library" 
            desc="Browse the master index of all externally synced jobs mapped securely to your system."
            icon={Zap} 
            colorClass="bg-emerald-50 text-emerald-600" 
            borderClass="border-emerald-100"
          />
          <FeatureCard 
            title="Error Tracking" 
            desc="Monitor API timeouts, data mapping failures, and pipeline blockages in real-time."
            icon={ShieldAlert} 
            colorClass="bg-rose-50 text-rose-600" 
            borderClass="border-rose-100"
          />
        </div>

      </div>
    </div>
  );
};

export default DataPipeline;
