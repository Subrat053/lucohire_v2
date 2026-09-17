import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Users, Mail, Upload, Download, Trash2, Search, Target, Building, ShieldAlert, Sparkles, X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

const RecruiterLeads = () => {
  const [leads, setLeads] = useState([]);
  const [manualLeads, setManualLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('automatic'); // 'automatic' | 'manual'
  const [filters, setFilters] = useState({ country: '', status: '', hiringLevel: '', search: '', page: 1 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  
  // CSV Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recruiterTemplate, setRecruiterTemplate] = useState(
    'Hi {{name}},\n\nI noticed {{company}} is growing! We at Lucohire are a premium matching platform connecting top companies with pre-vetted professionals.\n\nHere is your exclusive profile link to manage candidates and start hiring instantly:\n{{profile_link}}\n\nWe streamline your hiring process. If you want to be removed from our outreach, click here:\n{{delete_link}}'
  );
  const [providerTemplate, setProviderTemplate] = useState(
    'Hi {{name}},\n\nWe noticed your impressive background! Lucohire is an exclusive platform where top companies actively seek out talented professionals like you.\n\nHere is your exclusive profile link to view your matched opportunities and start connecting with recruiters:\n{{profile_link}}\n\nTake control of your career journey. If you want to be removed from our outreach, click here:\n{{delete_link}}'
  );

  // Single Company Scrape State
  const [manualScrapeCompany, setManualScrapeCompany] = useState('');
  const [isScrapingManual, setIsScrapingManual] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      if (activeTab === 'automatic') {
        const { data } = await adminAPI.getRecruiterLeads(filters);
        setLeads(data.leads || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      } else {
        const { data } = await adminAPI.getManualOutreachLeads();
        setManualLeads(data || []);
      }
    } catch (err) {
      toast.error('Failed to load recruiter leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filters, activeTab]);

  const handleManualScrape = async (e) => {
    e.preventDefault();
    if (!manualScrapeCompany.trim()) return toast.error('Please enter a company name');
    
    setIsScrapingManual(true);
    try {
      const { data } = await adminAPI.scrapeManualLeads({ companyName: manualScrapeCompany });
      toast.success(data.message || 'Leads scraped successfully!');
      setManualScrapeCompany('');
      if (activeTab === 'automatic') fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to scrape leads');
    } finally {
      setIsScrapingManual(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await adminAPI.updateRecruiterLead(id, { status: newStatus });
      toast.success('Lead status updated');
      fetchLeads();
    } catch (err) {
      toast.error('Failed to update lead');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recruiter lead?')) return;
    try {
      await adminAPI.deleteRecruiterLead(id);
      toast.success('Recruiter lead deleted');
      fetchLeads();
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  const handleExportCSV = () => {
    const query = new URLSearchParams({
      country: filters.country,
      status: filters.status
    }).toString();
    const API_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || '/api/v1';
    window.open(`${API_URL}/admin/recruiter-leads/export/csv?${query}`, '_blank');
    toast.success('CSV export started');
  };

  const handleDownloadSample = () => {
    const csv = 'name,companyName,contactDetails,role\nJohn Doe,Tech Corp,john@techcorp.com,recruiter\nJane Smith,Startup Inc,+1234567890,provider\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_leads.csv';
    a.click();
  };

  const handleUploadCSV = async () => {
    if (!csvFile) return toast.error('Please select a CSV file');
    if (!recruiterTemplate || !providerTemplate) return toast.error('Email templates cannot be empty');

    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('recruiterTemplate', recruiterTemplate);
    formData.append('providerTemplate', providerTemplate);

    try {
      setUploading(true);
      const { data } = await adminAPI.uploadRecruiterLeadsCsv(formData);
      toast.success(data.message || 'Upload successful');
      setShowUploadModal(false);
      setCsvFile(null);
      fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">Scraped Recruiters & Leads</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5 max-w-xl">
              Monitor high-hiring companies, public careers contacts, and business development leads mapped by our crawler.
            </p>
          </div>
          <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 w-full xl:w-auto">
            <form onSubmit={handleManualScrape} className="flex items-center w-full sm:w-auto">
              <input
                type="text"
                placeholder="Target company (e.g. Stripe)"
                value={manualScrapeCompany}
                onChange={(e) => setManualScrapeCompany(e.target.value)}
                className="w-full sm:w-48 px-4 py-2 border-y border-l border-gray-200 bg-white rounded-l-lg text-xs font-bold focus:outline-none focus:ring-0 focus:border-indigo-500 transition-colors shadow-sm"
              />
              <button
                type="submit"
                disabled={isScrapingManual}
                className="px-4 py-2 bg-indigo-600 border border-indigo-600 text-white font-black rounded-r-lg text-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm flex items-center gap-2"
              >
                {isScrapingManual ? <LoadingSpinner size="sm" /> : <Target className="w-4 h-4" />}
                Live Scrape
              </button>
            </form>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-200 transition font-black text-xs shadow-sm whitespace-nowrap"
            >
              <Upload className="w-4 h-4 text-gray-400" /> Import Leads
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-200 transition font-black text-xs shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-gray-400" /> Export CSV
            </button>
          </div>
        </div>

        {/* Highlight Banner */}
        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl p-[1px] shadow-sm">
          <div className="bg-white rounded-[15px] p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-3xl opacity-50"></div>
            
            <div className="flex items-center gap-4 z-10">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-black text-gray-900">B2B Outreach Pipeline</h2>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-100 to-teal-100 text-teal-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm border border-emerald-200">
                    <Sparkles className="w-3 h-3" /> Active
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-500 max-w-2xl">
                  Automated outreach to these leads will convert them to fully registered providers and recruiters on Lucohire. You can manage system-generated leads or manually upload your own CSV list.
                </p>
              </div>
            </div>
            
            {/* Custom Tabs inside Banner */}
            <div className="shrink-0 z-10 w-full md:w-auto flex bg-gray-100/50 p-1 rounded-xl border border-gray-200/50 backdrop-blur-sm">
              <button
                onClick={() => setActiveTab('automatic')}
                className={`flex-1 md:flex-none px-6 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'automatic' ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
              >
                System Scraped Leads
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 md:flex-none px-6 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Manual Uploads
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {activeTab === 'automatic' ? (
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Table Search & Stats Bar */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-50 bg-gray-50/50">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads by name, company..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
                />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
                  className="w-full sm:w-auto text-xs font-bold text-gray-700 px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none focus:border-indigo-500 shadow-sm transition-all"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted</option>
                  <option value="bounced">Bounced</option>
                </select>
                <select 
                  value={filters.hiringLevel}
                  onChange={(e) => setFilters(f => ({ ...f, hiringLevel: e.target.value, page: 1 }))}
                  className="w-full sm:w-auto text-xs font-bold text-gray-700 px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none focus:border-indigo-500 shadow-sm transition-all"
                >
                  <option value="">All Volumes</option>
                  <option value="High Volume">High Volume</option>
                  <option value="Standard">Standard</option>
                </select>
              </div>
            </div>

            {/* Table Data */}
            <div className="overflow-x-auto custom-scrollbar relative min-h-[400px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Lead Info</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Contact</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Hiring Signal</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                              <Users className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-gray-900 truncate max-w-[200px]" title={lead.name || lead.companyName}>{lead.name || lead.companyName}</div>
                              <div className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mt-0.5">
                                <Building className="w-3 h-3 text-gray-400" /> {lead.companyName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lead.contactDetails ? (
                            <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-indigo-400" /> {lead.contactDetails}
                            </div>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">No Email</span>
                          )}
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-5 mt-1">
                            {lead.country || 'Global'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider border w-max block ${
                            lead.hiringLevel === 'High Volume' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            {lead.hiringLevel || 'Unknown Volume'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border outline-none cursor-pointer ${
                              lead.status === 'converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              lead.status === 'contacted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              lead.status === 'bounced' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="converted">Converted</option>
                            <option value="bounced">Bounced</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button 
                            onClick={() => handleDelete(lead._id)}
                            className="w-8 h-8 rounded-lg border border-gray-200 bg-white inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm opacity-100 xl:opacity-0 xl:group-hover:opacity-100"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && !loading && (
                      <tr>
                        <td colSpan="5" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <Search className="w-12 h-12 mb-4 text-gray-300" />
                            <p className="text-sm font-bold text-gray-900 mb-1">No system leads found</p>
                            <p className="text-xs font-medium">Try adjusting your filters or triggering a live scrape.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="text-xs font-medium text-gray-500">
                Showing <span className="font-bold text-gray-900">{leads.length > 0 ? 1 : 0}</span> to <span className="font-bold text-gray-900">{leads.length}</span> of {pagination.total.toLocaleString()} leads
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="px-4 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-black shadow-sm">
                  Page {pagination.page} of {pagination.pages}
                </button>
                <button 
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* Manual Uploads Tab Content */
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-500" /> Imported CSV Leads
              </h3>
              <span className="text-xs font-bold text-gray-500">{manualLeads.length} total</span>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar relative min-h-[400px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Name</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Company</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Contact Details</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Role</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Uploaded At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {manualLeads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
                          {lead.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-gray-400" /> {lead.companyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-800">
                          <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-indigo-400" /> {lead.contactDetails}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider border uppercase w-max block ${
                            lead.role === 'recruiter' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {lead.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-400">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {manualLeads.length === 0 && !loading && (
                      <tr>
                        <td colSpan="5" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <Upload className="w-12 h-12 mb-4 text-gray-300" />
                            <p className="text-sm font-bold text-gray-900 mb-1">No manually uploaded leads</p>
                            <p className="text-xs font-medium">Use the Import CSV button to bulk upload leads.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-black text-gray-900">Import CSV Leads</h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-wider">CSV File</label>
                  <button 
                    onClick={handleDownloadSample}
                    className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 underline underline-offset-2 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Sample format
                  </button>
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors bg-white">
                  <input
                    type="file"
                    accept=".csv"
                    id="csv-upload"
                    className="hidden"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-indigo-500" />
                    </div>
                    <span className="text-sm font-bold text-indigo-600 mb-1">{csvFile ? csvFile.name : 'Click to select CSV file'}</span>
                    <span className="text-[11px] font-medium text-gray-500">Requirements: name, companyName, contactDetails, role (recruiter/provider)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-2">Recruiter Email Template</label>
                <textarea
                  value={recruiterTemplate}
                  onChange={(e) => setRecruiterTemplate(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                  placeholder="Template for recruiters..."
                ></textarea>
                <p className="text-[10px] font-bold text-gray-400 mt-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-indigo-400" /> Variables: {'{{name}}'}, {'{{company}}'}, {'{{profile_link}}'}, {'{{delete_link}}'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-2">Provider Email Template</label>
                <textarea
                  value={providerTemplate}
                  onChange={(e) => setProviderTemplate(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                  placeholder="Template for providers..."
                ></textarea>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-black hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadCSV}
                disabled={uploading || !csvFile}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                {uploading ? <LoadingSpinner size="sm" /> : <Upload className="w-3.5 h-3.5" />}
                Import & Queue Outreach
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterLeads;
