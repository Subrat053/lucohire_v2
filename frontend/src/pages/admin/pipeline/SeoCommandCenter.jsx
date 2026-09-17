import React, { useEffect, useState } from "react";
import { adminAPI } from "../../../services/api";
import toast from "react-hot-toast";

export default function SeoCommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [trackingId, setTrackingId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSeoHealth = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getSeoHealthDashboard();
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load SEO configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeoHealth();
  }, []);

  const openModal = (integration) => {
    setSelectedIntegration(integration);
    setTrackingId("");
    setIsModalOpen(true);
  };

  const handleSaveIntegration = async () => {
    if (!trackingId.trim()) return toast.error("Please enter a valid tracking ID or key.");
    try {
      setSaving(true);
      const res = await adminAPI.updateSeoIntegration(selectedIntegration.id, { trackingId });
      if (res.data.success) {
        toast.success("Integration updated successfully");
        setIsModalOpen(false);
        fetchSeoHealth();
      }
    } catch (err) {
      toast.error("Failed to update integration");
    } finally {
      setSaving(false);
    }
  };

  const { healthScore = 0, integrations = [], webVitals, alerts = [], recommendations = [], metrics } = data || {};

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-gray-800 bg-[#fafafa] min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">SEO Command Center</h1>
          <p className="text-gray-500 mt-2 text-base max-w-2xl font-medium">
            Monitor your search engine health, Core Web Vitals, and technical SEO schema in real-time.
          </p>
        </div>
        <button
          onClick={fetchSeoHealth}
          disabled={loading}
          className="mt-4 md:mt-0 px-6 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-70 transition-all shadow-md flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {loading ? "Scanning Live Data..." : "Run Diagnostic Scan"}
        </button>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 animate-pulse">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
          <p className="font-medium text-lg">Running full SEO diagnostic scan...</p>
          <p className="text-sm mt-2 opacity-70">Querying database metrics and fetching Google PageSpeed Insights...</p>
        </div>
      ) : data ? (
        <div className="space-y-10">
          
          {/* Top Row: Score & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Score Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Overall SEO Health</h2>
              <div className={`text-7xl font-black mb-4 ${healthScore >= 80 ? 'text-green-500' : healthScore >= 50 ? 'text-amber-500' : 'text-red-700'}`}>
                {healthScore}<span className="text-3xl text-gray-300">/100</span>
              </div>
              <p className="text-sm text-gray-500">
                This score is calculated based on schema integrity, orphan pages, and critical SEO files. Keep it above 80 for optimal search ranking.
              </p>
            </div>

            {/* Alerts Card */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Critical SEO Alerts</h2>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">{alerts.length} Issues</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">Immediate actions required to prevent search engines from ignoring or penalizing your pages.</p>
              
              <div className="flex-1 overflow-y-auto space-y-3">
                {alerts.length > 0 ? alerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-xl text-sm border-l-4 ${alert.type === 'error' ? 'bg-red-50/50 border-red-500 text-red-900' : 'bg-amber-50/50 border-amber-500 text-amber-900'}`}>
                    <span className="font-bold uppercase text-[10px] tracking-wider block mb-1 opacity-60">{alert.type}</span>
                    <span className="font-medium">{alert.message}</span>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                    <svg className="w-12 h-12 mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p className="font-medium">All systems green. No critical alerts detected.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Infrastructure Files */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Infrastructure Files</h2>
            <p className="text-sm text-gray-500 mb-6">Essential files that tell Google how to crawl and index your website.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">robots.txt</h3>
                  <p className="text-sm text-gray-500">Controls which pages crawlers are allowed to visit.</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${metrics?.hasRobots ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {metrics?.hasRobots ? "Accessible" : "Missing"}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">sitemap.xml</h3>
                  <p className="text-sm text-gray-500">A map of all your pages to help Google discover new jobs.</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${metrics?.hasSitemap ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {metrics?.hasSitemap ? "Accessible" : "Missing"}
                </div>
              </div>
            </div>
          </div>

          {/* Schema & Indexing Integrity */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Schema & Database Integrity</h2>
            <p className="text-sm text-gray-500 mb-6">Google requires specific data fields (like Location and Salary) to rank profiles and jobs properly.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-2">Profiles w/o Location</div>
                <div className="text-3xl font-black text-gray-900">{metrics?.missingLocation}</div>
                <p className="text-xs text-gray-400 mt-2">Hurts Local SEO ranking.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-2">Jobs w/o Salary</div>
                <div className="text-3xl font-black text-gray-900">{metrics?.missingSalaryJobs}</div>
                <p className="text-xs text-gray-400 mt-2">Required for Google Jobs Schema.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-2">Jobs w/o Description</div>
                <div className="text-3xl font-black text-gray-900">{metrics?.missingDescJobs}</div>
                <p className="text-xs text-gray-400 mt-2">Prevents indexing as a valid job.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-2">Orphan Profiles</div>
                <div className="text-3xl font-black text-gray-900">{metrics?.orphanProfiles}</div>
                <p className="text-xs text-gray-400 mt-2">Profiles with 0 views (hard to crawl).</p>
              </div>
            </div>
          </div>

          {/* Web Vitals & Integrations Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Core Web Vitals */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Core Web Vitals (Google PageSpeed API)</h2>
              <p className="text-sm text-gray-500 mb-6">Real-world performance metrics that directly impact mobile search rankings.</p>
              
              <div className="space-y-6">
                {Object.entries(webVitals || {}).map(([key, vital]) => (
                  <div key={key} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div>
                      <h3 className="font-bold text-gray-900 uppercase">{key}</h3>
                      <div className="mt-1">
                        {key === 'lcp' && (
                          <div className="text-xs text-gray-500 w-full pr-4">
                            <p className="font-semibold text-gray-700 mb-1">Largest Contentful Paint (Loading)</p>
                            <p>Measures how long it takes for the largest image or text block to become visible. <strong>Target: &lt; 2.5s</strong>.</p>
                            <p className="text-blue-600 mt-1"><span className="font-medium text-gray-700">How to improve:</span> Compress hero images, use WebP formats, enable server-side rendering (SSR), and use a CDN.</p>
                          </div>
                        )}
                        {key === 'fid' && (
                          <div className="text-xs text-gray-500 w-full pr-4">
                            <p className="font-semibold text-gray-700 mb-1">First Input Delay (Interactivity)</p>
                            <p>Measures the time from when a user first clicks a link/button to when the browser responds. <strong>Target: &lt; 100ms</strong>.</p>
                            <p className="text-blue-600 mt-1"><span className="font-medium text-gray-700">How to improve:</span> Reduce heavy JavaScript execution, remove unused 3rd-party scripts, and use Web Workers.</p>
                          </div>
                        )}
                        {key === 'cls' && (
                          <div className="text-xs text-gray-500 w-full pr-4">
                            <p className="font-semibold text-gray-700 mb-1">Cumulative Layout Shift (Visual Stability)</p>
                            <p>Measures unexpected layout shifts during page load (e.g., text jumping when an image loads). <strong>Target: &lt; 0.1</strong>.</p>
                            <p className="text-blue-600 mt-1"><span className="font-medium text-gray-700">How to improve:</span> Always set explicit width and height attributes on images and videos, and avoid inserting dynamic banners above existing content.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="text-xl font-bold text-gray-900 mb-1">{vital?.field}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${vital?.status === 'good' ? 'bg-green-100 text-green-700' : vital?.status === 'needs_improvement' ? 'bg-amber-100 text-amber-700' : vital?.status === 'pending' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                        {vital?.status ? vital.status.replace("_", " ") : "Pending"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">AI Action Plan</h2>
              <p className="text-sm text-gray-500 mb-6">Dynamic, prioritized tasks based on your current metrics.</p>
              <div className="space-y-4">
                {recommendations.length > 0 ? recommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-xl bg-gray-50/80 border border-gray-100 items-start">
                    <div className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</div>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">{rec}</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 text-center py-10 bg-gray-50 rounded-xl">Your site is perfectly optimized. No actions needed.</p>
                )}
              </div>
            </div>

          </div>

          {/* Unified Integrations */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connected Platforms</h2>
            <p className="text-sm text-gray-500 mb-6">Manage your tracking IDs across external search engines and analytics.</p>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-700">Platform</th>
                    <th className="px-6 py-4 font-bold text-gray-700">Status</th>
                    <th className="px-6 py-4 font-bold text-gray-700 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {integrations.map((integration) => (
                    <tr key={integration.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{integration.name}</td>
                      <td className="px-6 py-4">
                        {integration.status === "not_configured" ? (
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Not Configured</span>
                        ) : (
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openModal(integration)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-bold bg-indigo-50 px-4 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-200 font-medium">
          Failed to load SEO diagnostic data. Ensure the backend server is running.
        </div>
      )}

      {/* Configuration Modal */}
      {isModalOpen && selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all">
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Configure {selectedIntegration.name}</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Enter the tracking ID, Measurement ID, or API Key provided by the platform.</p>
            
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="e.g. G-XXXXXXX or 123456789"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black font-medium transition-colors mb-8"
            />
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveIntegration}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-bold text-white bg-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
