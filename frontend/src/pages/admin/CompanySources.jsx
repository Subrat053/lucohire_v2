import { useState, useEffect } from 'react';
import { HiPlus, HiTrash, HiX, HiDownload, HiShieldCheck } from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const emptyCompany = {
  companyName: '',
  companyDomain: '',
  careerUrl: '',
  atsType: 'greenhouse',
  atsIdentifier: '',
  countryCode: 'US',
  status: 'active'
};

const CompanySources = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showDiscoverForm, setShowDiscoverForm] = useState(false);
  const [form, setForm] = useState({ ...emptyCompany });
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [discoverState, setDiscoverState] = useState({ atsType: 'greenhouse', countryCode: 'IN', keywords: '' });
  const [discovering, setDiscovering] = useState(false);
  const [filters, setFilters] = useState({ country: '', atsType: '', status: '', search: '', page: 1 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  useEffect(() => {
    fetchCompanies();
  }, [filters]);

  const fetchCompanies = async () => {
    try {
      const { data } = await adminAPI.getCompanySources(filters);
      setCompanies(data.companies || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      toast.error('Failed to load company sources');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async (e) => {
    e.preventDefault();
    try {
      setDiscovering(true);
      const { data } = await adminAPI.triggerDiscovery(discoverState);
      if (data.success) {
        toast.success(data.message || 'Discovery complete!');
        setShowDiscoverForm(false);
        fetchCompanies();
      } else {
        toast.error(data.message || 'Discovery failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Discovery request failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.companyName || !form.companyDomain || !form.atsIdentifier) {
      toast.error('Name, Domain, and ATS Identifier are required');
      return;
    }
    try {
      await adminAPI.createCompanySource(form);
      toast.success('Company source created successfully');
      setShowForm(false);
      fetchCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create company source');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company source? This will stop ATS sync for this company.')) return;
    try {
      await adminAPI.deleteCompanySource(id);
      toast.success('Company source deleted');
      fetchCompanies();
    } catch (err) {
      toast.error('Failed to delete company');
    }
  };

  const handleDownloadSample = () => {
    const csvContent = "companyName,companyDomain,atsType,atsIdentifier,countryCode,careerUrl\nStripe,stripe.com,greenhouse,stripe,US,https://stripe.com/jobs\nSpotify,spotify.com,greenhouse,spotify,US,https://lifeatspotify.com";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "company_sources_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const { data } = await adminAPI.importCompanySources(formData);
      toast.success(data.message || 'Import processed successfully!');
      setShowImportForm(false);
      setSelectedFile(null);
      fetchCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ATS Company Discovery</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Discover and import hiring companies to ingest their active job board postings automatically.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setShowDiscoverForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition font-medium text-sm border border-indigo-200"
          >
            <HiShieldCheck className="w-5 h-5" /> Auto-Discover
          </button>
          <button
            onClick={() => { setShowImportForm(true); setSelectedFile(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition font-medium text-sm border border-gray-200"
          >
            <HiDownload className="w-5 h-5" /> Bulk Import
          </button>
          <button
            onClick={() => { setForm({ ...emptyCompany }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium text-sm shadow-md"
          >
            <HiPlus className="w-5 h-5" /> Add Company
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 mb-6 text-sm">
        <input
          value={filters.search}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
          placeholder="Search by company name or domain..."
          className="flex-1 min-w-[200px] px-3.5 py-2 border border-gray-200 rounded-xl outline-none"
        />
        <select
          value={filters.country}
          onChange={(e) => setFilters(f => ({ ...f, country: e.target.value, page: 1 }))}
          className="px-3.5 py-2 border border-gray-200 rounded-xl outline-none bg-white text-gray-700"
        >
          <option value="">All Countries</option>
          <option value="US">USA (US)</option>
          <option value="IN">India (IN)</option>
          <option value="GB">UK (GB)</option>
          <option value="CA">Canada (CA)</option>
          <option value="AE">UAE (AE)</option>
          <option value="AU">Australia (AU)</option>
        </select>
        <select
          value={filters.atsType}
          onChange={(e) => setFilters(f => ({ ...f, atsType: e.target.value, page: 1 }))}
          className="px-3.5 py-2 border border-gray-200 rounded-xl outline-none bg-white text-gray-700"
        >
          <option value="">All ATS Platforms</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="lever">Lever</option>
          <option value="ashby">Ashby</option>
          <option value="workable">Workable</option>
          <option value="custom">Custom Crawler (Auto)</option>
        </select>
      </div>

      {/* Listing Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {companies.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No companies found. Create or import company profiles to sync ATS jobs.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-gray-50/50">
            {companies.map((c) => (
              <div key={c._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col relative group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1" title={c.companyName}>{c.companyName}</h3>
                    <a href={`https://${c.companyDomain}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1 mt-1">
                      {c.companyDomain}
                    </a>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    c.hiringLevel === 'priority' 
                      ? 'bg-red-50 text-red-700' 
                      : c.hiringLevel === 'very_high' 
                        ? 'bg-orange-50 text-orange-700' 
                        : c.hiringLevel === 'high' 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-green-50 text-green-700'
                  }`}>
                    {c.hiringLevel || 'normal'}
                  </span>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 font-medium">ATS Platform</span>
                    <span className="font-mono text-xs font-bold capitalize text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                      {c.atsType}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 font-medium">Identifier</span>
                    <span className="font-mono text-xs text-gray-500 truncate max-w-[120px]" title={c.atsIdentifier}>
                      {c.atsIdentifier}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 font-medium">Country</span>
                    <span className="font-mono text-xs font-bold text-blue-600 px-2 py-1 bg-blue-50 rounded-lg">
                      {c.countryCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-50">
                    <span className="text-gray-500 font-medium">Jobs Synced</span>
                    <span className="font-bold text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-full">
                      {c.activeJobCount || 0}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-auto">
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="p-2 bg-gray-50 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition border border-gray-200"
                    title="Delete"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-Discover Modal */}
      {showDiscoverForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Auto-Discover Companies</h2>
              <button onClick={() => setShowDiscoverForm(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"><HiX className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleDiscover} className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">The system will autonomously crawl Google for active ATS boards and add valid companies to your database.</p>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target ATS Engine</label>
                <select
                  required
                  value={discoverState.atsType}
                  onChange={(e) => setDiscoverState({ ...discoverState, atsType: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                  <option value="ashby">Ashby</option>
                  <option value="smartrecruiters">SmartRecruiters</option>
                  <option value="workable">Workable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Country</label>
                <select
                  required
                  value={discoverState.countryCode}
                  onChange={(e) => setDiscoverState({ ...discoverState, countryCode: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="IN">India (IN)</option>
                  <option value="US">USA (US)</option>
                  <option value="GB">UK (GB)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="AE">UAE (AE)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Keywords (Optional)</label>
                <input
                  type="text"
                  value={discoverState.keywords}
                  onChange={(e) => setDiscoverState({ ...discoverState, keywords: e.target.value })}
                  placeholder="e.g. Software Engineer, React"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowDiscoverForm(false)} className="px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition">
                  Cancel
                </button>
                <button disabled={discovering} type="submit" className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-md disabled:opacity-50 flex items-center gap-2">
                  {discovering ? <LoadingSpinner size="sm" /> : <HiShieldCheck className="w-5 h-5" />}
                  {discovering ? 'Crawling...' : 'Run Discovery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Creation Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add Company Profile</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"><HiX className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Company Name</label>
                <input
                  required
                  value={form.companyName}
                  onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))}
                  placeholder="e.g. Stripe"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Company Domain</label>
                <input
                  required
                  value={form.companyDomain}
                  onChange={(e) => setForm(f => ({ ...f, companyDomain: e.target.value }))}
                  placeholder="e.g. stripe.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ATS Platform</label>
                  <select
                    value={form.atsType}
                    onChange={(e) => setForm(f => ({ ...f, atsType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="greenhouse">Greenhouse</option>
                    <option value="lever">Lever</option>
                    <option value="ashby">Ashby</option>
                    <option value="workable">Workable</option>
                    <option value="custom">Custom Crawler (Auto)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {form.atsType === 'custom' ? 'Career Page URL (Optional)' : 'ATS Identifier (Slug)'}
                  </label>
                  <input
                    required={form.atsType !== 'custom'}
                    value={form.atsIdentifier}
                    onChange={(e) => setForm(f => ({ ...f, atsIdentifier: e.target.value }))}
                    placeholder={form.atsType === 'custom' ? 'Leave blank to auto-search' : 'e.g. stripe'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Country</label>
                  <select
                    value={form.countryCode}
                    onChange={(e) => setForm(f => ({ ...f, countryCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="US">USA (US)</option>
                    <option value="IN">India (IN)</option>
                    <option value="GB">UK (GB)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="AE">UAE (AE)</option>
                    <option value="AU">Australia (AU)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Career Page URL (Optional)</label>
                  <input
                    value={form.careerUrl}
                    onChange={(e) => setForm(f => ({ ...f, careerUrl: e.target.value }))}
                    placeholder="e.g. stripe.com/jobs"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-md"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Bulk Import Hiring Companies</h2>
              <button onClick={() => setShowImportForm(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"><HiX className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Upload CSV File</label>
                <div className="mt-2 flex justify-center rounded-xl border border-dashed border-gray-300 px-6 py-8 hover:bg-gray-50 transition cursor-pointer relative">
                  <div className="text-center">
                    <HiDownload className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 text-gray-700 justify-center">
                      <label className="relative cursor-pointer rounded-md bg-transparent font-semibold text-indigo-600 focus-within:outline-none hover:text-indigo-500">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          accept=".csv"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => setSelectedFile(e.target.files[0])}
                          required
                        />
                      </label>
                    </div>
                    <p className="text-xs leading-5 text-gray-500">
                      {selectedFile ? selectedFile.name : 'CSV up to 10MB'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center py-2">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                >
                  <HiDownload className="w-4 h-4" /> Download Sample Template
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowImportForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !selectedFile}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importing ? <LoadingSpinner size="sm" /> : <HiPlus className="w-4 h-4" />}
                  {importing ? 'Processing...' : 'Upload & Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySources;
