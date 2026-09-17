import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HiOutlineOfficeBuilding, HiGlobe, HiIdentification, HiSearch, HiPlus, HiRefresh, HiLocationMarker, HiChevronDown, HiExternalLink } from 'react-icons/hi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';

const CompaniesRegistry = () => {
  const [companies, setCompanies] = useState([]);
  const [locationStats, setLocationStats] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ page: 1, limit: 12, search: '', country: '', status: '' });
  const [pagination, setPagination] = useState(null);
  
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, [filters]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getRegistryCompanies(filters);
      setCompanies(res.data.companies || []);
      setLocationStats(res.data.locationStats || []);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load companies registry');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCompany = async (company) => {
    setIsSyncing(true);
    toast('Triggering discovery engine for ' + company.companyName + '...', { icon: '🔍' });
    try {
      const res = await adminAPI.syncRegistryCompany(company._id);
      if (res.data && res.data.success) {
        toast.success(res.data.message || (company.companyName + ' synchronized successfully!'));
      } else {
        toast.success(company.companyName + ' synchronized successfully!');
      }
      fetchCompanies(); // Refresh to update lastSyncedAt
    } catch (err) {
      toast.error('Sync failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Companies Registry</h2>
          <p className="text-gray-500 text-sm mt-1">Master database of validated corporate entities (Type 3 Sources).</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-xl text-sm transition-colors hover:bg-indigo-100 flex items-center gap-2">
            <HiRefresh className="w-4 h-4" /> Sync All
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-sm transition-colors hover:bg-indigo-700 flex items-center gap-2 shadow-md">
            <HiPlus className="w-4 h-4" /> Add Company
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="relative flex-1 min-w-[200px]">
          <HiSearch className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          <input
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="Search by name, ID or source..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <select
          value={filters.country}
          onChange={(e) => setFilters(f => ({ ...f, country: e.target.value, page: 1 }))}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white text-gray-700"
        >
          <option value="">All Countries</option>
          <option value="IN">India (IN)</option>
          <option value="GB">UK (GB)</option>
          <option value="US">USA (US)</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white text-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
      ) : companies.length === 0 ? (
        <div className="text-center p-12 text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <HiOutlineOfficeBuilding className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700">No registry companies found.</p>
          <p className="text-sm mt-1">Connect a registry like MCA or Companies House to populate this list.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 min-w-[150px]">
              <p className="text-sm text-gray-500 font-medium">Total Partners</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{pagination?.total || 0}</h3>
            </div>
            {locationStats.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 min-w-[150px]">
                <p className="text-sm text-gray-500 font-medium">{stat.location}</p>
                <h3 className="text-2xl font-bold text-indigo-600 mt-1">{stat.count}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((c) => (
              <div key={c._id} className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-50 to-white -mr-8 -mt-8 rounded-full z-0 pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                
                <div className="relative z-10 p-5 pb-0 flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                      <HiOutlineOfficeBuilding className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-gray-900 line-clamp-1" title={c.companyName}>{c.companyName}</h3>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{c.source.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 p-5 space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    <HiIdentification className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-mono font-medium truncate">{c.externalId}</span>
                  </div>
                  
                  {c.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 px-1">
                      <HiLocationMarker className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{c.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-700 px-1">
                    <HiGlobe className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{c.countryCode || 'Global'}</span>
                  </div>
                  
                  {c.industry && (
                    <div className="flex flex-wrap gap-2 px-1">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md uppercase tracking-wider">
                        {c.industry}
                      </span>
                    </div>
                  )}
                  {c.lastSyncedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Last synced: {new Date(c.lastSyncedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Jobs Accordion Section */}
                {c.jobs && c.jobs.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    <button 
                      onClick={() => setExpandedCard(expandedCard === c._id ? null : c._id)}
                      className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                    >
                      <span>View Found Jobs ({c.jobs.length})</span>
                      <HiChevronDown className={`w-4 h-4 transition-transform ${expandedCard === c._id ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedCard === c._id && (
                      <div className="px-4 pb-4 space-y-2">
                        {c.jobs.map(job => (
                          <a 
                            key={job._id} 
                            href={job.applyUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 rounded bg-white border border-gray-100 hover:border-indigo-200 transition-colors group"
                          >
                            <span className="text-sm text-gray-800 truncate pr-4">{job.title}</span>
                            <HiExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between mt-auto">
                  <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    c.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {c.status}
                  </span>
                  <button
                    onClick={() => handleSyncCompany(c)}
                    disabled={isSyncing}
                    className="bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    Sync Now
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {pagination && pagination.pages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={filters.page}
                totalPages={pagination.pages}
                onPageChange={(p) => setFilters(f => ({ ...f, page: p }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompaniesRegistry;
