import React, { useEffect, useState } from 'react';
import { pipelineAdminAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlinePlusCircle, HiOutlinePlay, HiOutlineRefresh, HiOutlineLightningBolt, HiOutlineSparkles } from 'react-icons/hi';

const QueryManager = () => {
  const [scans, setScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [savedQueries, setSavedQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(true);

  // Manual Scan state
  const [manualQuery, setManualQuery] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualCountry, setManualCountry] = useState('IN');
  const [triggeringManual, setTriggeringManual] = useState(false);

  // Add Query state
  const [newQuery, setNewQuery] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCountry, setNewCountry] = useState('IN');
  const [autoRunNew, setAutoRunNew] = useState(true);
  const [addingQuery, setAddingQuery] = useState(false);

  useEffect(() => {
    fetchScans();
    fetchQueries();
  }, []);

  const fetchScans = async () => {
    try {
      setLoadingScans(true);
      const res = await pipelineAdminAPI.getScans();
      if (res.data?.success) {
        setScans(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch scan history');
    } finally {
      setLoadingScans(false);
    }
  };

  const fetchQueries = async () => {
    try {
      setLoadingQueries(true);
      const res = await pipelineAdminAPI.getQueries();
      if (res.data?.success) {
        setSavedQueries(res.data.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch saved queries');
    } finally {
      setLoadingQueries(false);
    }
  };

  const handleInstantManualScan = async (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    try {
      setTriggeringManual(true);
      const res = await pipelineAdminAPI.triggerManualScan({
        query: manualQuery.trim(),
        location: manualLocation.trim() || 'India',
        countryCode: manualCountry
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Manual crawl started in background!');
        setManualQuery('');
        setManualLocation('');
        setTimeout(() => fetchScans(), 2000);
      } else {
        toast.error(res.data?.message || 'Failed to trigger scan');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error triggering manual scan');
    } finally {
      setTriggeringManual(false);
    }
  };

  const handleAddAutomatedQuery = async (e) => {
    e.preventDefault();
    if (!newQuery.trim()) {
      toast.error('Please enter a query string');
      return;
    }

    try {
      setAddingQuery(true);
      const res = await pipelineAdminAPI.addQuery({
        query: newQuery.trim(),
        location: newLocation.trim() || 'Bangalore',
        countryCode: newCountry,
        autoRun: autoRunNew
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Query added and scheduled automatically!');
        setNewQuery('');
        setNewLocation('');
        fetchQueries();
        setTimeout(() => fetchScans(), 2000);
      } else {
        toast.error(res.data?.message || 'Failed to add query');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding query');
    } finally {
      setAddingQuery(false);
    }
  };

  const handleRunSavedQueryNow = async (q) => {
    try {
      toast.loading(`Triggering crawl for "${q.query}"...`, { id: 'run-saved' });
      const res = await pipelineAdminAPI.triggerManualScan({
        query: q.query,
        location: q.location || 'India',
        countryCode: q.countryCode || 'IN'
      });
      if (res.data?.success) {
        toast.success(`Crawl initiated for "${q.query}"!`, { id: 'run-saved' });
        setTimeout(() => fetchScans(), 2000);
      } else {
        toast.error('Failed to trigger scan', { id: 'run-saved' });
      }
    } catch (err) {
      toast.error('Failed to run query', { id: 'run-saved' });
    }
  };

  return (
    <div className="space-y-10">
      
      {/* 1. TOP CARDS: Manual Search & Add Automated Query */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CARD A: Instant Manual Crawl */}
        <div className="bg-gradient-to-br from-white to-blue-50/40 p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
              <HiOutlineLightningBolt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Instant Manual Search Crawl</h2>
              <p className="text-xs text-gray-500">Execute an immediate live web search to import fresh jobs on demand.</p>
            </div>
          </div>

          <form onSubmit={handleInstantManualScan} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search Query / Job Title</label>
              <input
                type="text"
                placeholder="e.g. React Developer, Node.js Architect, Data Scientist"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Location City / State</label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore, Mumbai, Remote"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Country</label>
                <select
                  value={manualCountry}
                  onChange={(e) => setManualCountry(e.target.value)}
                  className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="IN">India 🇮🇳 (IN)</option>
                  <option value="US">United States 🇺🇸 (US)</option>
                  <option value="AE">UAE 🇦🇪 (AE)</option>
                  <option value="GB">United Kingdom 🇬🇧 (GB)</option>
                  <option value="CA">Canada 🇨🇦 (CA)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={triggeringManual}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {triggeringManual ? (
                <span>Crawling JSearch Engine...</span>
              ) : (
                <>
                  <HiOutlineSearch className="w-4 h-4" />
                  Run Instant Crawl & Import
                </>
              )}
            </button>
          </form>
        </div>

        {/* CARD B: Add Query to Automated Pipeline */}
        <div className="bg-gradient-to-br from-white to-emerald-50/40 p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
              <HiOutlineSparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Query to Automated Pipeline</h2>
              <p className="text-xs text-gray-500">Save search terms that automatically run on a recurring cron rotation.</p>
            </div>
          </div>

          <form onSubmit={handleAddAutomatedQuery} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Automated Search Query</label>
              <input
                type="text"
                placeholder="e.g. Python Backend Engineer, DevOps Specialist"
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Location</label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabad, Remote"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Country</label>
                <select
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                >
                  <option value="IN">India 🇮🇳 (IN)</option>
                  <option value="US">United States 🇺🇸 (US)</option>
                  <option value="AE">UAE 🇦🇪 (AE)</option>
                  <option value="GB">United Kingdom 🇬🇧 (GB)</option>
                  <option value="CA">Canada 🇨🇦 (CA)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="autoRunNew"
                checked={autoRunNew}
                onChange={(e) => setAutoRunNew(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
              <label htmlFor="autoRunNew" className="text-xs font-semibold text-gray-700">
                Run initial crawl immediately in background & add to daily schedule
              </label>
            </div>

            <button
              type="submit"
              disabled={addingQuery}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {addingQuery ? (
                <span>Adding to Pipeline...</span>
              ) : (
                <>
                  <HiOutlinePlusCircle className="w-4 h-4" />
                  Save Query & Automate
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* 2. SECTION: Saved Seed Queries in Automated Schedule */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Active Automated Seed Queries</h2>
            <p className="text-xs text-gray-500">Queries automatically dispatched by the background crawler cron job.</p>
          </div>
          <button
            onClick={fetchQueries}
            disabled={loadingQueries}
            className="px-3.5 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-gray-200"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Refresh Queries
          </button>
        </div>

        <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Query Term</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Source Type</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Run</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingQueries ? (
                <tr><td colSpan="6" className="px-6 py-6 text-center text-xs text-gray-500">Loading saved queries...</td></tr>
              ) : savedQueries.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-6 text-center text-xs text-gray-500">No automated queries configured yet. Use the form above to add one!</td></tr>
              ) : (
                savedQueries.map((q, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-bold text-gray-900">
                      "{q.query}"
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-700 font-medium">
                      {q.location || 'Any'}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase">
                      <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">
                        {q.countryCode || 'IN'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-500">
                      <span className="capitalize px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md border border-blue-100">
                        {q.sourceType || 'manual'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-500">
                      {q.lastRunAt ? new Date(q.lastRunAt).toLocaleString() : 'Pending Next Schedule'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleRunSavedQueryNow(q)}
                        className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all border border-emerald-200 inline-flex items-center gap-1"
                      >
                        <HiOutlinePlay className="w-3.5 h-3.5" />
                        Run Now
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SECTION: Scan History & Jobs Fetched Logs */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Automated JSearch Crawls & Jobs History</h2>
            <p className="text-xs text-gray-500">Logs for automated background crawls fetching from the JSearch API.</p>
          </div>
          <button
            onClick={fetchScans}
            disabled={loadingScans}
            className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-blue-200"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Refresh Logs
          </button>
        </div>

        <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Run ID & Trigger</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Search Terms</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jobs Found</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Raw Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loadingScans ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-xs text-gray-500">Loading scan history...</td></tr>
              ) : scans.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-xs text-gray-500">No recent JSearch crawls found.</td></tr>
              ) : (
                scans.map((scan) => (
                  <ScanRow key={scan._id} scan={scan} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

// ScanRow sub-component
const ScanRow = ({ scan }) => {
  const [expanded, setExpanded] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!expanded) {
      if (jobs.length === 0) {
        setLoading(true);
        try {
          const res = await pipelineAdminAPI.getRawImports({ scanRunId: scan._id });
          if (res.data?.success) {
            setJobs(res.data.data || []);
          }
        } catch (e) {
          toast.error('Failed to load raw jobs');
          setLoading(false);
          return;
        } finally {
          setLoading(false);
        }
      }
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  };

  return (
    <React.Fragment>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div className="font-mono text-xs">{scan._id.substring(0, 8)}</div>
          <div className="text-[10px] uppercase mt-1 font-bold text-gray-400">{scan.scanType || 'unknown'}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
          "{scan.query}" 
          <div className="text-xs text-gray-500 font-normal mt-0.5">in {scan.location || 'Any'}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md border ${
            scan.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
            scan.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {scan.status}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-bold">
          {scan.totalFetched} <span className="text-gray-400 text-xs font-normal">fetched</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
          {new Date(scan.createdAt).toLocaleString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button 
            onClick={toggleExpand} 
            type="button"
            className="text-blue-600 hover:text-blue-800 focus:outline-none font-bold text-xs"
          >
            {expanded ? 'Hide Jobs ▲' : 'View Raw Jobs ▼'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="6" className="bg-gray-50 p-6 border-b border-gray-200 shadow-inner">
            {loading ? (
              <div className="text-sm text-gray-500 text-center py-4 animate-pulse">Fetching raw jobs from DB...</div>
            ) : jobs.length > 0 ? (
              <div className="bg-white border rounded-xl p-5 shadow-sm max-h-80 overflow-y-auto">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm flex justify-between items-center">
                  <span>{jobs.length} Raw Jobs Parsed</span>
                </h4>
                <ul className="space-y-3">
                  {jobs.map(job => (
                    <li key={job._id} className="text-sm border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-gray-900">{job.rawTitle}</span>
                          <span className="text-gray-500 mx-1">at</span>
                          <span className="text-gray-700 font-semibold">{job.rawCompanyName}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                          job.processingStatus === 'published' ? 'bg-emerald-100 text-emerald-700' :
                          job.processingStatus === 'duplicate' ? 'bg-gray-200 text-gray-700' :
                          job.processingStatus === 'validation_failed' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {(job.processingStatus || 'raw').replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 truncate">{job.applyUrl}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4 bg-white rounded-xl border">JSearch returned 0 jobs for this query.</div>
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

export default QueryManager;
