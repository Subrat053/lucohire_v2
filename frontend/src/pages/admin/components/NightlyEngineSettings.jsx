import React, { useState, useEffect } from 'react';
import { Settings, Save, Download, Globe, Clock, Loader2, Server, Calendar as CalendarIcon, Filter, CheckCircle2, RefreshCw, Pause, Play, ChevronLeft, ChevronRight, X, Briefcase, Zap, AlertCircle } from 'lucide-react';
import { ADMIN_API, adminAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const NightlyEngineSettings = () => {
  const [settings, setSettings] = useState({ daily_scrape_limit: '300' });
  const [companies, setCompanies] = useState([]);
  const [jobsOnDate, setJobsOnDate] = useState([]);
  const [summary, setSummary] = useState({ totalCompanies: 0, activeCompanies: 0, totalJobsExtracted: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggeringRun, setIsTriggeringRun] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [showDateModal, setShowDateModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('companies'); // 'companies' | 'jobs'

  const [dateRange, setDateRange] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchSettings();
    fetchNightlyHistory(1, selectedDate);
  }, [selectedDate, dateRange]);

  const fetchSettings = async () => {
    try {
      const res = await adminAPI.getCrawlerSettings();
      if (res && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch crawler settings', err);
    }
  };

  const fetchNightlyHistory = async (pageNum = 1, targetDate = null) => {
    try {
      setIsLoading(true);
      let queryStr = `/admin/crawlers/mapped-companies?page=${pageNum}&limit=15`;
      if (targetDate) {
        queryStr += `&date=${targetDate}`;
      } else if (dateRange !== 'all') {
        queryStr += `&range=${dateRange}`;
      }

      const res = await ADMIN_API.get(queryStr);
      if (res && res.data) {
        setCompanies(res.data.companies || []);
        setJobsOnDate(res.data.jobsOnDate || []);
        setSummary(res.data.summary || { totalCompanies: 0, activeCompanies: 0, totalJobsExtracted: 0 });
        setTotalPages(res.data.pagination?.pages || 1);
        setPage(res.data.pagination?.page || 1);
      }
    } catch (err) {
      console.error('Failed to fetch nightly history', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await adminAPI.updateCrawlerSettings({ daily_scrape_limit: settings.daily_scrape_limit });
      setSaveMessage('Settings saved successfully!');
      toast.success('Nightly Engine limit updated to ' + settings.daily_scrape_limit + ' companies/night!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage('Failed to save settings.');
      toast.error('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadCsv = async () => {
    try {
      setSaveMessage('Downloading CSV...');
      const response = await adminAPI.exportCrawlerCompaniesCsv();
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nightly_crawl_history_${selectedDate || 'all'}.csv`);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Exported nightly crawler CSV history!');
      setSaveMessage('CSV Downloaded!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage('Failed to download CSV');
    }
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setShowDateModal(true);
    fetchNightlyHistory(1, dateStr);
    toast.success(`Loaded Night Crawl data for ${dateStr}`, { icon: '📅' });
  };

  const handleTriggerNightRunForDate = async () => {
    try {
      setIsTriggeringRun(true);
      toast.loading(`Triggering Night Crawl Engine for ${selectedDate}...`, { id: 'trigger-run' });
      const res = await ADMIN_API.post('/admin/crawlers/nightly-run', { date: selectedDate });
      toast.success(res.data.message || `Night crawl completed for ${selectedDate}!`, { id: 'trigger-run' });
      fetchNightlyHistory(1, selectedDate);
    } catch (err) {
      toast.error('Failed to run nightly scrape', { id: 'trigger-run' });
    } finally {
      setIsTriggeringRun(false);
    }
  };

  const handleToggleStatus = async (company) => {
    try {
      const newStatus = company.status === 'active' ? 'paused' : 'active';
      await ADMIN_API.put(`/admin/crawlers/mapped-companies/${company._id}/status`, { status: newStatus });
      toast.success(`${company.companyName} set to ${newStatus}`);
      fetchNightlyHistory(page, selectedDate);
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const handleRescrapeNow = async (company) => {
    try {
      toast.loading(`Re-scraping ${company.companyName}...`, { id: `rescrape-calendar-${company._id}` });
      const res = await ADMIN_API.post(`/admin/crawlers/mapped-companies/${company._id}/rescrape`);
      toast.success(res.data.message || `Re-scraped ${company.companyName}!`, { id: `rescrape-calendar-${company._id}` });
      fetchNightlyHistory(page, selectedDate);
    } catch (err) {
      toast.error('Failed to re-scrape company', { id: `rescrape-calendar-${company._id}` });
    }
  };

  // Calendar Helpers
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      
      {/* 1. Configuration Settings Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              Nightly Engine Configuration
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Automated midnight cron loop limit for scraping mapped career portals.
            </p>
          </div>
          {saveMessage && (
            <span className={`text-xs font-bold ${saveMessage.includes('Failed') ? 'text-red-700' : 'text-emerald-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>
        
        <div className="p-6 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Daily Scrape Limit (Companies per night)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Server className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                value={settings.daily_scrape_limit}
                onChange={(e) => setSettings({ ...settings, daily_scrape_limit: e.target.value })}
                className="pl-10 block w-full border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm p-3 border font-semibold"
              />
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition md:w-auto w-full"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>

      {/* 2. INTERACTIVE NIGHT CRAWL CALENDAR GRID */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              Interactive Night Crawl Calendar
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any date on the calendar to inspect that night's automated crawl results or trigger an on-demand night scrape.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-gray-900 min-w-[140px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty leading padding cells */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100"></div>
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = selectedDate === dateString;
            const todayStr = new Date().toISOString().split('T')[0];
            const isToday = todayStr === dateString;
            const isFuture = dateString > todayStr;

            return (
              <button
                key={dateString}
                onClick={() => handleDateClick(dateString)}
                className={`h-24 p-2 rounded-2xl border flex flex-col justify-between items-start transition-all transform hover:scale-[1.02] active:scale-95 text-left relative overflow-hidden ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-500'
                    : isToday
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                    isSelected ? 'bg-indigo-600 text-white' : isToday ? 'bg-emerald-600 text-white' : 'text-gray-700'
                  }`}>
                    {dayNum}
                  </span>

                  {isToday && (
                    <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                      Today
                    </span>
                  )}
                </div>

                {/* Night Crawl Indicator Badge */}
                <div className="w-full">
                  {isFuture ? (
                    <div className="flex items-center gap-1 border border-gray-200 bg-gray-50 rounded-lg px-1.5 py-1 opacity-60">
                      <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                      <span className="text-[10px] font-bold text-gray-500 truncate">
                        Scheduled
                      </span>
                    </div>
                  ) : isToday ? (
                    <div className="flex items-center gap-1 border border-emerald-200 bg-emerald-50 rounded-lg px-1.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-emerald-800 truncate">
                        Active Today
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 border border-indigo-200 bg-indigo-50/60 rounded-lg px-1.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="text-[10px] font-bold text-indigo-800 truncate">
                        Inspect Run
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. NIGHT CRAWL DETAIL REPORT FOR SELECTED DATE */}
      {showDateModal && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-500 p-6 space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-gray-900">
                  Night Crawl Inspection Report — <span className="text-indigo-600">{selectedDate}</span>
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Automated night window execution results for {selectedDate} (11:30 PM – 5:30 AM IST).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTriggerNightRunForDate}
                disabled={isTriggeringRun}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                {isTriggeringRun ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                Run Night Crawl for {selectedDate} Now
              </button>

              <button
                onClick={() => setShowDateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Date Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3">
              <Globe className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-[11px] font-bold text-indigo-700 uppercase">Companies Scraped</p>
                <p className="text-xl font-black text-indigo-900">{companies.length}</p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase">Jobs Ingested</p>
                <p className="text-xl font-black text-emerald-900">{jobsOnDate.length}</p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center gap-3">
              <Zap className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-[11px] font-bold text-purple-700 uppercase">Night Crawl Status</p>
                <p className="text-sm font-extrabold text-purple-900">
                  {summary?.isFuture ? 'Scheduled ⚪' : (jobsOnDate.length > 0 || companies.length > 0) ? 'Completed ✅' : 'No Log Recorded ⏳'}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Tab Navigation inside Date Modal */}
          <div className="flex border-b border-gray-200 space-x-6">
            <button
              onClick={() => setActiveModalTab('companies')}
              className={`pb-3 text-xs font-bold border-b-2 transition ${
                activeModalTab === 'companies'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Scraped Companies ({companies.length})
            </button>
            <button
              onClick={() => setActiveModalTab('jobs')}
              className={`pb-3 text-xs font-bold border-b-2 transition ${
                activeModalTab === 'jobs'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Extracted Job Posts ({jobsOnDate.length})
            </button>
          </div>

          {/* Tab 1: Companies Table for Selected Date */}
          {activeModalTab === 'companies' && (
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase">
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Career URL</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Jobs Found</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {companies.map((company) => (
                    <tr key={company._id} className="hover:bg-gray-50/80">
                      <td className="py-3 px-4 font-bold text-gray-900">{company.companyName}</td>
                      <td className="py-3 px-4 font-semibold text-indigo-600">
                        {company.careerUrl ? (
                          <a href={company.careerUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {company.careerUrl}
                          </a>
                        ) : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                          {company.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-800">{company.successCount || 0} Jobs</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRescrapeNow(company)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1 ml-auto"
                        >
                          <RefreshCw className="w-3 h-3" /> Re-scrape
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Jobs Extracted on Selected Date */}
          {activeModalTab === 'jobs' && (
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase">
                    <th className="py-3 px-4">Job Title</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobsOnDate.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-400 font-medium">
                        No individual job posts found for {selectedDate}. Click "Run Night Crawl" above to trigger a fresh scrape!
                      </td>
                    </tr>
                  ) : (
                    jobsOnDate.map((job) => (
                      <tr key={job._id} className="hover:bg-gray-50/80">
                        <td className="py-3 px-4 font-bold text-gray-900">{job.title}</td>
                        <td className="py-3 px-4 font-semibold text-gray-700">{job.companyName || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-500">{typeof job.location === 'string' ? job.location : job.location?.city || 'Remote'}</td>
                        <td className="py-3 px-4 font-bold text-indigo-600">{job.source || 'crawler'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default NightlyEngineSettings;
