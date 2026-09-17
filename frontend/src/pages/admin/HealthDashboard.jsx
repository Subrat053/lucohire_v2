import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { 
  HiOutlineServer, HiOutlineChip, HiOutlineDatabase, 
  HiOutlineBriefcase, HiOutlineUsers, HiOutlineLightningBolt
} from 'react-icons/hi';
import { 
  Play, Pause, Square, RefreshCw, Calendar, User, Briefcase, 
  Sparkles, CheckCircle2, AlertTriangle, Shield, Activity, Filter, DollarSign
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import DashboardStatsCard from '../../components/admin/DashboardStatsCard';
import toast from 'react-hot-toast';

const HealthDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date Filter States (7d, 30d, 90d, custom)
  const [dateFilterMode, setDateFilterMode] = useState('7d'); // 'today', '7d', '30d', '90d', 'custom'
  const [customDays, setCustomDays] = useState(3);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'candidate', 'recruiter'

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => fetchMetrics(), 12000); // refresh every 12s
    return () => clearInterval(interval);
  }, [dateFilterMode, customDays, customStartDate, customEndDate]);

  const fetchMetrics = async () => {
    try {
      let params = {};
      if (dateFilterMode === 'today') params.days = 1;
      else if (dateFilterMode === '7d') params.days = 7;
      else if (dateFilterMode === '30d') params.days = 30;
      else if (dateFilterMode === '90d') params.days = 90;
      else if (dateFilterMode === 'custom') {
        if (customStartDate && customEndDate) {
          params.startDate = customStartDate;
          params.endDate = customEndDate;
        } else {
          params.days = customDays || 3;
        }
      }

      const response = await adminAPI.getHealthMetrics(params);
      if (response.data.success) {
        setMetrics(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch health metrics', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (featureKey, status) => {
    try {
      toast.loading(`Updating ${featureKey}...`, { id: 'feat-status' });
      await adminAPI.updateFeatureStatus(featureKey, status);
      toast.success(`Feature ${featureKey} set to ${status}!`, { id: 'feat-status' });
      fetchMetrics();
    } catch (err) {
      toast.error('Failed to update feature status', { id: 'feat-status' });
    }
  };

  const handleRestartFeature = async (featureKey) => {
    try {
      toast.loading(`Restarting ${featureKey}...`, { id: 'feat-restart' });
      await adminAPI.restartFeature(featureKey);
      toast.success(`Feature ${featureKey} restarted successfully!`, { id: 'feat-restart' });
      fetchMetrics();
    } catch (err) {
      toast.error('Failed to restart feature', { id: 'feat-restart' });
    }
  };

  const handleGlobalStatusToggle = async (audience, status) => {
    try {
      toast.loading(`Setting global AI status for ${audience}...`, { id: 'global-status' });
      await adminAPI.updateGlobalFeatureStatus(audience, status);
      toast.success(`All ${audience} features set to ${status}!`, { id: 'global-status' });
      fetchMetrics();
    } catch (err) {
      toast.error('Failed to set global AI status', { id: 'global-status' });
    }
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          Loading System Health & Feature Cost Telemetry...
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const candidateFeatures = metrics.costs?.candidateFeatures || [];
  const recruiterFeatures = metrics.costs?.recruiterFeatures || [];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50/50 min-h-screen space-y-6">
      
      {/* Top Header & Date Filter Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Super Admin Health & AI Cost Center
          </h1>
          <p className="text-xs font-medium text-gray-500 mt-0.5">
            Real-time individual cost analytics, model rates, token burn & granular controls per AI feature.
          </p>
        </div>

        {/* Date Filter Options Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            {[
              { id: 'today', label: 'Today (24h)' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'custom', label: 'Custom Range' },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setDateFilterMode(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilterMode === btn.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Custom Date Controls */}
          {dateFilterMode === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 bg-indigo-50/80 p-2 rounded-xl border border-indigo-100 animate-fade-in">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-indigo-700">Days:</span>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                  className="w-16 p-1 text-xs border border-indigo-200 rounded-lg text-center font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <span className="text-xs text-indigo-300 font-bold">OR</span>

              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="p-1 text-xs border border-indigo-200 rounded-lg bg-white font-semibold text-gray-700"
                />
                <span className="text-xs text-indigo-500 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="p-1 text-xs border border-indigo-200 rounded-lg bg-white font-semibold text-gray-700"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Infrastructure & Business KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <DashboardStatsCard 
          icon={HiOutlineChip} 
          label="CPU Load (1m)" 
          value={metrics.infrastructure.cpu.loadAverage[0].toFixed(2)} 
          bgClass="bg-indigo-50"
          colorClass="text-indigo-500"
          sparklineColor="#6366F1"
        />
        <DashboardStatsCard 
          icon={HiOutlineDatabase} 
          label="RAM Usage" 
          value={`${metrics.infrastructure.memory.percentage}%`} 
          bgClass="bg-amber-50"
          colorClass="text-amber-500"
          sparklineColor="#F59E0B"
        />
        <DashboardStatsCard 
          icon={HiOutlineLightningBolt} 
          label="BullMQ Status" 
          value={metrics.infrastructure.queues.status === 'active' ? 'Active' : 'Disabled'} 
          bgClass={metrics.infrastructure.queues.status === 'active' ? 'bg-emerald-50' : 'bg-red-50'}
          colorClass={metrics.infrastructure.queues.status === 'active' ? 'text-emerald-500' : 'text-red-700'}
          sparklineColor={metrics.infrastructure.queues.status === 'active' ? '#10B981' : '#EF4444'}
        />
        <DashboardStatsCard 
          icon={HiOutlineBriefcase} 
          label="Total Jobs Indexed" 
          value={metrics.business.totalJobs.toLocaleString('en-IN')} 
          bgClass="bg-blue-50"
          colorClass="text-blue-500"
          sparklineColor="#3B82F6"
        />
        <DashboardStatsCard 
          icon={HiOutlineBriefcase} 
          label="Active Jobs" 
          value={metrics.business.activeJobs.toLocaleString('en-IN')} 
          bgClass="bg-orange-50"
          colorClass="text-orange-500"
          sparklineColor="#F97316"
        />
        <DashboardStatsCard 
          icon={HiOutlineUsers} 
          label="Total Candidates" 
          value={metrics.business.totalProviders.toLocaleString('en-IN')} 
          bgClass="bg-teal-50"
          colorClass="text-teal-500"
          sparklineColor="#14B8A6"
        />
      </div>

      {/* Master Burn Rate Summary & Recharts Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* OpenAI & Gemini Overall Cost Summary Cards */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Overall AI API Burn Rate ({metrics.filter?.appliedDays || 7} Days)
              </h3>
              <p className="text-xs text-gray-500">Real token consumption converted directly to INR (₹)</p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
              ₹86.5 = $1.00 USD
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {Object.entries(metrics.costs.summary).map(([service, costData]) => (
              <div key={service} className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    {service} Provider
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {costData.status || 'Active'}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">₹{(costData.totalCostInInr || 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs font-semibold text-gray-400 mt-1">
                    {((costData.totalTokens || 0)).toLocaleString()} Tokens Consumed
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Recharts Line Graph */}
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.costs.history} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(val) => `₹${val}`} width={60} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '11px' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
                />
                <Line type="monotone" dataKey="OpenAI" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366F1' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Gemini" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Queues & Workers Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <HiOutlineServer className="w-4 h-4 text-emerald-600" />
                Background Queues & Workers
              </h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                {metrics.infrastructure.queues.mode || 'BullMQ'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">Queue</th>
                    <th className="pb-2 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Active</th>
                    <th className="pb-2 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(metrics.infrastructure.queues.queues || {}).map(([qName, counts]) => (
                    <tr key={qName} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5">
                        <span className="text-xs font-bold text-gray-800">{qName}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {counts.active || 0}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {(counts.completed || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>System Memory Free: {(metrics.infrastructure.memory.free / 1024 / 1024 / 1024).toFixed(2)} GB</span>
            <span className="text-emerald-600 font-bold">Operational 🟢</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation for Feature Cost Breakdown */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-gray-200 pb-3 pt-2 gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Paid & AI Features', icon: Sparkles },
            { id: 'candidate', label: `Candidate AI Features (₹${(metrics.costs.totalCandidateCostInr || 0).toLocaleString('en-IN')})`, icon: User },
            { id: 'recruiter', label: `Recruiter AI Features (₹${(metrics.costs.totalRecruiterCostInr || 0).toLocaleString('en-IN')})`, icon: Briefcase },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGlobalStatusToggle(activeTab === 'all' ? 'all' : activeTab, 'active')}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] sm:text-xs font-bold shadow-xs transition whitespace-nowrap"
          >
            <Play className="w-3 h-3 fill-current shrink-0" />
            Resume All ({activeTab.toUpperCase()})
          </button>
          <button
            onClick={() => handleGlobalStatusToggle(activeTab === 'all' ? 'all' : activeTab, 'paused')}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] sm:text-xs font-bold shadow-xs transition whitespace-nowrap"
          >
            <Pause className="w-3 h-3 fill-current shrink-0" />
            Pause All ({activeTab.toUpperCase()})
          </button>
        </div>
      </div>

      {/* CANDIDATE PAID / AI FEATURES TELEMETRY SECTION */}
      {(activeTab === 'all' || activeTab === 'candidate') && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Candidate Paid / AI Feature Breakdown
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Individual feature cost per execution, model used, total calls, and instant controls for candidate tools.
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-right">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Candidate Total Burn</span>
              <span className="text-lg font-black text-indigo-900">₹{(metrics.costs.totalCandidateCostInr || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidateFeatures.map(feat => (
              <div 
                key={feat.featureKey}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  feat.status === 'paused'
                    ? 'bg-amber-50/40 border-amber-200'
                    : feat.status === 'stopped'
                    ? 'bg-red-50/40 border-red-200'
                    : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-black text-gray-900 leading-snug">{feat.featureName}</span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                      feat.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : feat.status === 'paused'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {feat.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {feat.model}
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      ₹{feat.unitCostInr} / call
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Calls</span>
                      <span className="text-sm font-black text-gray-800">{feat.totalCalls.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Cost</span>
                      <span className="text-sm font-black text-indigo-900">₹{feat.totalCostInr.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Individual Control Toolbar */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-[10px] font-bold text-gray-400">Controls:</span>
                  <div className="flex items-center space-x-1.5">
                    {feat.status !== 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(feat.featureKey, 'active')}
                        title="Resume Feature"
                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="text-[10px]">Resume</span>
                      </button>
                    )}

                    {feat.status === 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(feat.featureKey, 'paused')}
                        title="Pause Feature"
                        className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span className="text-[10px]">Pause</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleRestartFeature(feat.featureKey)}
                      title="Restart / Reset Feature Cache"
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Restart</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECRUITER PAID / AI FEATURES TELEMETRY SECTION */}
      {(activeTab === 'all' || activeTab === 'recruiter') && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                Recruiter Paid / AI Feature Breakdown
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Individual feature cost per execution, model used, total calls, and instant controls for recruiter enterprise tools.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-right">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Recruiter Total Burn</span>
              <span className="text-lg font-black text-emerald-900">₹{(metrics.costs.totalRecruiterCostInr || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recruiterFeatures.map(feat => (
              <div 
                key={feat.featureKey}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  feat.status === 'paused'
                    ? 'bg-amber-50/40 border-amber-200'
                    : feat.status === 'stopped'
                    ? 'bg-red-50/40 border-red-200'
                    : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-black text-gray-900 leading-snug">{feat.featureName}</span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                      feat.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : feat.status === 'paused'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {feat.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                      {feat.model}
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      ₹{feat.unitCostInr} / call
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Calls</span>
                      <span className="text-sm font-black text-gray-800">{feat.totalCalls.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Cost</span>
                      <span className="text-sm font-black text-emerald-900">₹{feat.totalCostInr.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Individual Control Toolbar */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-[10px] font-bold text-gray-400">Controls:</span>
                  <div className="flex items-center space-x-1.5">
                    {feat.status !== 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(feat.featureKey, 'active')}
                        title="Resume Feature"
                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="text-[10px]">Resume</span>
                      </button>
                    )}

                    {feat.status === 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(feat.featureKey, 'paused')}
                        title="Pause Feature"
                        className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span className="text-[10px]">Pause</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleRestartFeature(feat.featureKey)}
                      title="Restart / Reset Feature Cache"
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Restart</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default HealthDashboard;
