import useTranslation from "../../hooks/useTranslation";
import React, { Suspense, useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FiCalendar, FiFilter, FiDownload, FiChevronDown, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const tabs = [
  { label: 'Overview',           path: '/recruiter/reports'                    },
  { label: 'Hiring Funnel',      path: '/recruiter/reports/hiring-funnel'      },
  { label: 'Source Analytics',   path: '/recruiter/reports/source-analytics'   },
  { label: 'Job Performance',    path: '/recruiter/reports/job-performance'    },
  { label: 'Outreach Analytics', path: '/recruiter/reports/outreach-analytics' },
  { label: 'AI Insights',        path: '/recruiter/reports/ai-insights'        },
  { label: 'Custom Reports',     path: '/recruiter/reports/custom-reports'     },
];

const ReportsAnalytics = () => {
  const { t } = useTranslation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [dateRange, setDateRange] = useState("20 Apr – 20 May 2026");
  
  const [categoryInput, setCategoryInput] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [adminRoles, setAdminRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get('/job-roles');
        if (res.data && res.data.length > 0) {
          setAdminRoles(res.data.map(r => r.roleName));
        } else {
          setAdminRoles(["Engineering", "Design", "Marketing", "Sales", "Product Management", "Human Resources", "Finance", "Operations", "Customer Support"]);
        }
      } catch (err) {
        console.error('Failed to fetch job roles', err);
        setAdminRoles(["Engineering", "Design", "Marketing", "Sales", "Product Management", "Human Resources", "Finance", "Operations", "Customer Support"]);
      }
    };
    fetchRoles();
  }, []);

  const ALL_CATEGORIES = [
    "All Categories", 
    ...adminRoles
  ];
  
  const filteredCategories = ALL_CATEGORIES.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase()));

  const handleExport = () => {
    // Generate dummy CSV
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Metric,Value\n"
      + "2026-05-01,Hires,5\n"
      + "2026-05-02,Hires,3\n"
      + "2026-05-03,Hires,8";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "recruiter_report.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(t("Report exported successfully!"));
  };

  const handleFilters = () => {
    setIsFilterOpen(true);
  };

  const selectDateRange = (rangeText) => {
    setDateRange(rangeText);
    setIsDateOpen(false);
    toast.success(t("Date range updated!"));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{t("Reports & Analytics")}</h1>
              <p className="text-sm text-gray-500">{t("Track performance, measure impact and make data-driven hiring decisions.")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 relative">
              <button onClick={() => setIsDateOpen(!isDateOpen)} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 transition whitespace-nowrap">
                <FiCalendar className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="hidden sm:inline">{dateRange}</span>
                <span className="sm:hidden">{dateRange.split('–')[0] + '...'}</span>
                <FiChevronDown className="w-3.5 h-3.5" />
              </button>
              
              <button 
                onClick={handleFilters}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 transition"
              >
                <FiFilter className="w-4 h-4" />{t("Filters")}
              </button>

              <button 
                onClick={handleExport}
                className="group flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <FiDownload className="w-4 h-4 relative z-10 group-hover:animate-bounce" />
                <span className="relative z-10">{t("Export")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-transparent mb-2">
          <div className="flex flex-nowrap gap-2 overflow-x-auto custom-scrollbar pb-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.path === '/recruiter/reports'}
                className={({ isActive }) =>
                  `flex-shrink-0 px-4 py-2 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? 'font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30 transform hover:-translate-y-1'
                      : 'font-medium text-indigo-400 border border-indigo-50 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow transform hover:-translate-y-0.5'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Sub-page content */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          </div>
        }>
          <Outlet context={{ dateRange, categoryInput }} />
        </Suspense>

      </div>

      {/* Date Dropdown Modal */}
      {isDateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsDateOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 shadow-xl border border-gray-100 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 px-2">Select Date Range</h3>
            <div className="space-y-1">
              {["Today", "Last 7 Days", "Last 30 Days", "This Month", "This Year"].map((range) => (
                <button
                  key={range}
                  onClick={() => selectDateRange(range)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-indigo-50 text-left transition text-sm font-semibold text-gray-700 hover:text-indigo-700"
                >
                  {range}
                  {dateRange === range && <FiCheck className="text-indigo-600" />}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsDateOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Report Filters</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-gray-50 hover:bg-red-50 rounded-full text-gray-500 hover:text-red-700 transition-all transform hover:scale-110 shadow-sm">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Job Category</label>
                <input 
                  type="text" 
                  value={categoryInput}
                  onChange={(e) => {
                    setCategoryInput(e.target.value);
                    setIsCategoryDropdownOpen(true);
                  }}
                  onFocus={() => setIsCategoryDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 200)}
                  placeholder="Select or type category..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium text-gray-700"
                />
                {isCategoryDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            setCategoryInput(cat);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm font-medium text-gray-700 hover:text-indigo-700 transition"
                        >
                          {cat}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500 italic">
                        Use "{categoryInput}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Location Type</label>
                <select className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium text-gray-700">
                  <option>Any Location</option>
                  <option>Remote</option>
                  <option>On-site</option>
                  <option>Hybrid</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setIsFilterOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition text-sm">
                Clear Filters
              </button>
              <button onClick={() => { setIsFilterOpen(false); toast.success("Filters applied!"); }} className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition text-sm shadow-sm hover:shadow">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalytics;
