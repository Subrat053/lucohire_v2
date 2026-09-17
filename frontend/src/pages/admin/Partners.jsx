import { useState, useEffect } from 'react';
import { HiSearch, HiFilter, HiPlus, HiEye, HiX } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CountryPhoneInput from '../../components/common/CountryPhoneInput';

const Partners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', countryCode: '+91', nationalNumber: '', commissionRate: '' });
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const handlePhoneChange = (phoneData) => {
    setForm((prev) => ({
      ...prev,
      phone: phoneData.fullPhone,
      countryCode: phoneData.countryCode,
      nationalNumber: phoneData.nationalNumber,
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await adminAPI.createPartner(form);
      const generatedPassword = res.data.generatedPassword || res.data.password || res.data.partner?.password;
      setCredentials({ email: form.email, password: generatedPassword });
      toast.success('Partner created successfully');
      fetchPartners();
      setForm({ name: '', email: '', phone: '', countryCode: '+91', nationalNumber: '', commissionRate: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create partner');
    } finally {
      setCreating(false);
    }
  };

  // Global Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [globalCommission, setGlobalCommission] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await adminAPI.getPartnerRewardSettings();
      if (res.data?.config?.planCommissionPercent !== undefined) {
        setGlobalCommission(res.data.config.planCommissionPercent);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await adminAPI.updatePartnerRewardSettings({ planCommissionPercent: Number(globalCommission) });
      toast.success('Global settings updated');
      setShowSettingsModal(false);
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };
  const copyCredentials = () => {
    if (credentials) {
      navigator.clipboard.writeText(`Login URL: ${window.location.origin}/login\nEmail: ${credentials.email}\nPassword: ${credentials.password}`);
      toast.success("Credentials copied to clipboard");
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const [deletingPartner, setDeletingPartner] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getPartners();
      setPartners(res.data?.partners || []);
    } catch (error) {
      toast.error('Failed to fetch partners');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!deletingPartner) return;
    try {
      setIsDeleting(true);
      await adminAPI.deletePartner(deletingPartner._id);
      toast.success('Partner account deleted successfully');
      setPartners(partners.filter(p => p._id !== deletingPartner._id));
      setDeletingPartner(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete partner');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPartners = partners.filter(p => 
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.referralCode || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform affiliates and referral partners</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setShowSettingsModal(true); fetchSettings(); }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold shadow-sm hover:bg-gray-50 transition-colors"
          >
            Global Settings
          </button>
          <button 
            onClick={() => { setShowModal(true); setCredentials(null); }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <HiPlus className="w-5 h-5" /> Add Partner
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name, email or referral code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4 text-left">Partner</th>
                  <th className="px-6 py-4 text-left">Referral Code</th>
                  <th className="px-6 py-4 text-left">Referrals (P/R)</th>
                  <th className="px-6 py-4 text-left">Earnings</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPartners.length > 0 ? (
                  filteredPartners.map((partner) => (
                    <tr key={partner._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                            {partner.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{partner.name}</p>
                            <p className="text-xs text-gray-500">{partner.email}</p>
                            <p className="text-[10px] text-gray-400">{partner.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold bg-gray-100 px-2 py-1 rounded-md text-gray-700">
                          {partner.referralCode || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{partner.totalReferredMembers || 0} Total</span>
                          <span className="text-[10px] text-gray-500">
                            {partner.totalReferredProviders || 0} Providers / {partner.totalReferredRecruiters || 0} Recruiters
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          ₹{Number(partner.totalCommissionEarned || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          partner.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 
                          partner.status === 'suspended' ? 'bg-red-50 text-red-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {partner.status ? partner.status.charAt(0).toUpperCase() + partner.status.slice(1) : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link 
                            to={`/admin/partners/${partner._id}/referrals`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            <HiEye className="w-4 h-4" /> Referrals
                          </Link>
                          <button 
                            onClick={() => setDeletingPartner(partner)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                          >
                            <HiX className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No partners found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <div>Showing {filteredPartners.length} results</div>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50" disabled>Prev</button>
            <button className="px-3 py-1 rounded bg-indigo-50 text-indigo-600 font-medium">1</button>
            <button className="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiX className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Partner Account?</h2>
            <p className="text-gray-500 mb-6">
              This will disable the partner account for <strong>{deletingPartner.name}</strong> and prevent partner login. 
              Referred providers/recruiters, subscriptions, payments, and commission history will remain safe.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingPartner(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeletePartner}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Partner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create New Partner</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {credentials ? (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4">
                  <h3 className="font-bold text-emerald-800 mb-2">Partner Created!</h3>
                  <p className="text-sm text-emerald-700 mb-3">Please save these temporary credentials:</p>
                  <div className="bg-white p-3 rounded border border-emerald-100 mb-3 text-sm">
                    <p><strong>Email:</strong> {credentials.email}</p>
                    <p><strong>Password:</strong> {credentials.password}</p>
                  </div>
                  <button onClick={copyCredentials} className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700">
                    Copy Credentials
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input 
                      required 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                      required 
                      type="email"
                      value={form.email} 
                      onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <CountryPhoneInput
                      variant="admin-partner"
                      countryCode={form.countryCode}
                      nationalNumber={form.nationalNumber}
                      onChange={handlePhoneChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                    <input 
                      type="number"
                      placeholder="Optional (e.g. 40)"
                      value={form.commissionRate} 
                      onChange={e => setForm({...form, commissionRate: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                  <button 
                    disabled={creating}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors mt-2"
                  >
                    {creating ? 'Creating...' : 'Create Partner'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Global Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-700">
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Global Commission Rate (%)</label>
                  <p className="text-xs text-gray-500 mb-2">This is the default commission given to partners on their referrals' first subscription purchase.</p>
                  <input 
                    required 
                    type="number"
                    value={globalCommission} 
                    onChange={e => setGlobalCommission(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <button 
                  disabled={savingSettings}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors mt-2"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partners;
