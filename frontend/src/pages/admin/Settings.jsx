import { useState, useEffect } from 'react';
import {
  HiSave, HiRefresh, HiCog, HiPhotograph, HiDocumentText, HiEye, HiEyeOff,
  HiCloud, HiChip, HiCheckCircle, HiDatabase, HiLocationMarker,
  HiPlay, HiPause, HiStop, HiLightningBolt, HiPlus, HiTrash, HiPencil,
  HiUsers, HiClock, HiArrowUp, HiArrowDown, HiX
} from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LocationAutocomplete from '../../components/common/LocationAutocomplete';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { toAbsoluteMediaUrl } from '../../utils/media';

const TABS = [
  { id: 'general',   label: 'General',   icon: HiCog },
  { id: 'cloudinary',label: 'Cloudinary',icon: HiCloud },
  { id: 'profile',   label: 'Admin Profile', icon: HiPhotograph },
  { id: 'rotation',  label: 'Rotation Pools',icon: HiChip },
  { id: 'ai-ops',    label: 'AI OPS',        icon: HiDatabase },
  { id: 'company',   label: 'Company Details',icon: HiLocationMarker },
];

const AdminSettings = () => {
  const { user: admin } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  // General settings
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState({});

  // Cloudinary
  const [cloudinary, setCloudinary] = useState({ cloudinary_cloud_name: '', cloudinary_api_key: '', cloudinary_api_secret: '' });
  const [cloudinaryLoading, setCloudinaryLoading] = useState(true);
  const [savingCloudinary, setSavingCloudinary] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Rotation
  const [rotation, setRotation] = useState([]);
  const [rotationLoading, setRotationLoading] = useState(false);

  // Admin photo
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [adminPhoto, setAdminPhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Page content
  const [faqContent, setFaqContent] = useState('');
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [aboutContent, setAboutContent] = useState('');
  const [savingContent, setSavingContent] = useState('');

  // Company & Footer details
  const [companyDetails, setCompanyDetails] = useState({
    companyName: 'Lucohire Inc.',
    registrationDetails: 'Certified from Government of India with Certificate No. 3424242',
    footerDescription: "India's AI-powered hiring platform. Verified providers, fair distribution, WhatsApp-first.",
    addressLine1: '123 Business Avenue',
    addressLine2: 'Tech District, Bangalore 560001',
    gstLabel: 'GSTIN',
    gstNumber: '29AABCU9603R1ZX',
    footerCustomText: '',
    copyrightText: '© 2026 Lucohire. All rights reserved.',
    supportEmail: 'support@lucohire.com',
    supportPhone: '+91 98765 43210',
  });
  const [savingCompanyDetails, setSavingCompanyDetails] = useState(false);

  useEffect(() => { fetchSettings(); fetchCloudinary(); fetchRotation(); fetchContent(); }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await adminAPI.getSettings();
      const list = Array.isArray(data) ? data : data.settings || [];
      setSettings(list);
      const vals = {};
      list.forEach(s => { 
        vals[s._id] = s.value; 
        if (s.key === 'admin_company_details' && s.value) {
          setCompanyDetails(s.value);
        }
      });
      setEditValues(vals);
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const fetchCloudinary = async () => {
    try {
      const { data } = await adminAPI.getCloudinarySettings();
      setCloudinary({
        cloudinary_cloud_name: data.cloudinary_cloud_name || '',
        cloudinary_api_key: data.cloudinary_api_key || '',
        cloudinary_api_secret: data.cloudinary_api_secret || '',
        cloudinary_account_name: data.cloudinary_account_name || 'LucoHire Media Cloud',
        cloudinary_folder_prefix: data.cloudinary_folder_prefix || 'lucohire_media',
      });
    } catch { /* silent */ }
    finally { setCloudinaryLoading(false); }
  };

  // Rotation Pools state
  const [allProviders, setAllProviders] = useState([]);
  const [createPoolModal, setCreatePoolModal] = useState({ open: false, skill: '', city: '', maxPoolSize: 5, rotationInterval: 60, rotationStrategy: 'round_robin' });
  const [configPoolModal, setConfigPoolModal] = useState({ open: false, pool: null });
  const [manageProvidersModal, setManageProvidersModal] = useState({ open: false, pool: null, selectedProviderId: '', weight: 1 });
  const [historyPoolModal, setHistoryPoolModal] = useState({ open: false, pool: null });

  const fetchRotation = async () => {
    try {
      setRotationLoading(true);
      const [poolRes, provRes] = await Promise.allSettled([
        adminAPI.getRotationPools(),
        adminAPI.getProviders(),
      ]);
      if (poolRes.status === 'fulfilled') {
        const data = poolRes.value.data;
        setRotation(Array.isArray(data) ? data : data.pools || []);
      }
      if (provRes.status === 'fulfilled') {
        const provData = provRes.value.data;
        setAllProviders(Array.isArray(provData) ? provData : provData.providers || []);
      }
    } catch { console.error('Failed to load rotation pools'); }
    finally { setRotationLoading(false); }
  };

  const handleStartPool = async (id) => {
    try {
      await adminAPI.startRotationPool(id);
      toast.success('Rotation pool STARTED');
      fetchRotation();
    } catch { toast.error('Failed to start pool'); }
  };

  const handlePausePool = async (id) => {
    try {
      await adminAPI.pauseRotationPool(id);
      toast.success('Rotation pool PAUSED');
      fetchRotation();
    } catch { toast.error('Failed to pause pool'); }
  };

  const handleStopPool = async (id) => {
    try {
      await adminAPI.stopRotationPool(id);
      toast.success('Rotation pool STOPPED');
      fetchRotation();
    } catch { toast.error('Failed to stop pool'); }
  };

  const handleAdvancePool = async (id) => {
    try {
      const res = await adminAPI.advanceRotationPool(id);
      toast.success(res.data?.message || 'Rotated to next step!');
      fetchRotation();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to advance pool'); }
  };

  const handleDeletePool = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rotation pool?')) return;
    try {
      await adminAPI.deleteRotationPool(id);
      toast.success('Rotation pool deleted');
      fetchRotation();
    } catch { toast.error('Failed to delete pool'); }
  };

  const handleCreatePoolSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createRotationPool(createPoolModal);
      toast.success('Rotation pool created successfully');
      setCreatePoolModal({ open: false, skill: '', city: '', maxPoolSize: 5, rotationInterval: 60, rotationStrategy: 'round_robin' });
      fetchRotation();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create pool'); }
  };

  const handleSavePoolConfig = async (e) => {
    e.preventDefault();
    if (!configPoolModal.pool) return;
    try {
      await adminAPI.updateRotationPool(configPoolModal.pool._id, {
        maxPoolSize: configPoolModal.pool.maxPoolSize,
        rotationInterval: configPoolModal.pool.rotationInterval,
        rotationStrategy: configPoolModal.pool.rotationStrategy,
      });
      toast.success('Pool configuration updated!');
      setConfigPoolModal({ open: false, pool: null });
      fetchRotation();
    } catch { toast.error('Failed to update pool config'); }
  };

  const handleAddProviderToPool = async () => {
    const { pool, selectedProviderId, weight } = manageProvidersModal;
    if (!pool || !selectedProviderId) return toast.error('Select a provider');
    
    const existing = pool.providers?.find(p => String(p.provider?._id || p.provider) === String(selectedProviderId));
    if (existing) return toast.error('Provider already in this pool');

    const updatedProviders = [...(pool.providers || []), { provider: selectedProviderId, weight: Number(weight) || 1, lastShown: new Date(0) }];
    try {
      await adminAPI.updateRotationPool(pool._id, { providers: updatedProviders });
      toast.success('Provider added to pool');
      fetchRotation();
      const updatedPool = { ...pool, providers: updatedProviders };
      setManageProvidersModal(prev => ({ ...prev, pool: updatedPool, selectedProviderId: '' }));
    } catch { toast.error('Failed to add provider'); }
  };

  const handleRemoveProviderFromPool = async (providerId) => {
    const { pool } = manageProvidersModal;
    if (!pool) return;
    const updatedProviders = pool.providers.filter(p => String(p.provider?._id || p.provider) !== String(providerId));
    try {
      await adminAPI.updateRotationPool(pool._id, { providers: updatedProviders });
      toast.success('Provider removed');
      fetchRotation();
      setManageProvidersModal(prev => ({ ...prev, pool: { ...pool, providers: updatedProviders } }));
    } catch { toast.error('Failed to remove provider'); }
  };

  const handleMoveProviderOrder = async (index, direction) => {
    const { pool } = manageProvidersModal;
    if (!pool || !pool.providers) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= pool.providers.length) return;

    const list = [...pool.providers];
    const temp = list[index];
    list[index] = list[newIdx];
    list[newIdx] = temp;

    try {
      await adminAPI.updateRotationPool(pool._id, { providers: list });
      toast.success('Provider reordered');
      fetchRotation();
      setManageProvidersModal(prev => ({ ...prev, pool: { ...pool, providers: list } }));
    } catch { toast.error('Failed to reorder'); }
  };

  const fetchContent = async () => {
    try {
      const [faq, terms, privacy] = await Promise.all([
        adminAPI.getContent('faq'),
        adminAPI.getContent('terms'),
        adminAPI.getContent('privacy'),
        adminAPI.getContent('about'),
      ]);
      setFaqContent(faq.data || '');
      setTermsContent(terms.data || '');
      setPrivacyContent(privacy.data || '');
      setAboutContent(about.data || '');
    } catch { /* silent */ }
  };

  const handleSaveSetting = async (setting) => {
    try {
      await adminAPI.updateSettings({ settings: [{ key: setting.key, value: editValues[setting._id], description: setting.description, category: setting.category }] });
      toast.success(`${setting.key} updated`);
    } catch { toast.error('Failed to update'); }
  };

  const handleSaveCloudinary = async () => {
    setSavingCloudinary(true);
    try {
      await adminAPI.updateCloudinarySettings(cloudinary);
      toast.success('Cloudinary settings saved!');
      fetchCloudinary();
    } catch { toast.error('Failed to save Cloudinary settings'); }
    finally { setSavingCloudinary(false); }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return toast.error('Select a photo file');
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('profilePhoto', photoFile);
    try {
      const { data } = await adminAPI.uploadProfilePhoto(formData);
      setAdminPhoto(toAbsoluteMediaUrl(data.url));
      setPhotoFile(null);
      toast.success('Photo uploaded!');
    } catch (err) { const msg = err?.response?.data?.message || err?.message || 'Failed to upload photo'; toast.error(msg); }
    finally { setUploadingPhoto(false); }
  };

  const handleSaveContent = async (type, value) => {
    setSavingContent(type);
    try {
      await adminAPI.updateContent(type, value);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} saved!`);
    } catch { toast.error('Failed to save content'); }
    finally { setSavingContent(''); }
  };

  const handleSaveCompanyDetails = async () => {
    setSavingCompanyDetails(true);
    try {
      await adminAPI.updateSettings({
        settings: [{
          key: 'admin_company_details',
          value: companyDetails,
          description: 'Platform Company Billing Details for Invoices',
          category: 'general'
        }]
      });
      toast.success('Company details saved!');
    } catch { toast.error('Failed to save company details'); }
    finally { setSavingCompanyDetails(false); }
  };

  const getSettingIcon = (key) => {
    const k = key?.toLowerCase() || '';
    if (k.startsWith('ai.') || k.includes('ai.')) return '🤖';
    if (k.includes('rotation')) return '🔄';
    if (k.includes('free') || k.includes('limit')) return '⚡';
    if (k.includes('profile')) return '👤';
    if (k.includes('whatsapp')) return '💬';
    if (k.includes('plan') || k.includes('price')) return '💲';
    return '⚙️';
  };

  const isToggleSetting = (setting) => {
    const key = String(setting.key || '').toLowerCase();
    const val = setting.value;
    
    // Check if value is boolean or string boolean
    if (typeof val === 'boolean' || val === 'true' || val === 'false') {
      return true;
    }
    
    // Check if key name implies boolean and value is 0 or 1
    const isZeroOrOne = val === 0 || val === 1 || val === '0' || val === '1';
    if (isZeroOrOne) {
      if (
        key.includes('enabled') || 
        key.includes('active') || 
        key.includes('notification') || 
        key.includes('feature') ||
        key.includes('mode') ||
        key.includes('status') ||
        key.includes('flag')
      ) {
        return true;
      }
    }
    
    // Fallback checks on key name
    return key.includes('enabled') || 
           key.includes('active') || 
           key.includes('notification') ||
           key.includes('simulation_mode');
  };

  const getToggleChecked = (settingId) => {
    const val = editValues[settingId];
    return val === true || val === 1 || val === '1' || String(val).toLowerCase() === 'true';
  };

  const handleToggleChange = async (setting, checked) => {
    let newValue = checked;
    if (typeof setting.value === 'number') {
      newValue = checked ? 1 : 0;
    } else if (typeof setting.value === 'string') {
      if (setting.value === '1' || setting.value === '0') {
        newValue = checked ? '1' : '0';
      } else if (setting.value.toLowerCase() === 'true' || setting.value.toLowerCase() === 'false') {
        newValue = checked ? 'true' : 'false';
      }
    }

    setEditValues(v => ({ ...v, [setting._id]: newValue }));

    try {
      await adminAPI.updateSettings({
        settings: [{
          key: setting.key,
          value: newValue,
          description: setting.description,
          category: setting.category
        }]
      });
      toast.success(`${setting.key} updated`);
    } catch {
      toast.error(`Failed to update ${setting.key}`);
      setEditValues(v => ({ ...v, [setting._id]: setting.value }));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <HiCog className="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-500">Configure your ServiceHub platform</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
              activeTab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── General Settings ── */}
      {activeTab === 'general' && (() => {
        const generalSettings = settings.filter(s => !s.key.startsWith('ai.'));
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {generalSettings.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <HiCog className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No platform settings configured yet.</p>
              </div>
            ) : (
              generalSettings.map((setting) => (
                <div key={setting._id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getSettingIcon(setting.key)}</span>
                        <h3 className="font-semibold text-gray-900 text-sm">{setting.key}</h3>
                        {setting.category && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">{setting.category}</span>
                        )}
                      </div>
                      {setting.description && (
                        <p className="text-xs text-gray-400 mt-1 ml-7">{setting.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 sm:shrink-0">
                      {isToggleSetting(setting) ? (
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 transition">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 select-none">
                            {getToggleChecked(setting._id) ? 'Enabled' : 'Disabled'}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={getToggleChecked(setting._id)}
                              onChange={(e) => handleToggleChange(setting, e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                          </label>
                        </div>
                      ) : (
                        <>
                          <input
                            type={typeof setting.value === 'number' ? 'number' : 'text'}
                            value={editValues[setting._id] ?? ''}
                            onChange={(e) => {
                              const val = typeof setting.value === 'number' ? Number(e.target.value) : e.target.value;
                              setEditValues(v => ({ ...v, [setting._id]: val }));
                            }}
                            className="w-36 sm:w-44 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          />
                          <button onClick={() => handleSaveSetting(setting)}
                            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium shrink-0">
                            <HiSave className="w-4 h-4" />
                            <span className="hidden sm:inline">Save</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })()}

      {/* ── AI OPS Settings ── */}
      {activeTab === 'ai-ops' && (() => {
        const aiSettings = settings.filter(s => s.key.startsWith('ai.'));
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {aiSettings.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <HiDatabase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No AI platform settings configured yet.</p>
              </div>
            ) : (
              aiSettings.map((setting) => (
                <div key={setting._id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getSettingIcon(setting.key)}</span>
                        <h3 className="font-semibold text-gray-900 text-sm">{setting.key}</h3>
                        {setting.category && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">{setting.category}</span>
                        )}
                      </div>
                      {setting.description && (
                        <p className="text-xs text-gray-400 mt-1 ml-7">{setting.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 sm:shrink-0">
                      {isToggleSetting(setting) ? (
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 transition">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 select-none">
                            {getToggleChecked(setting._id) ? 'Enabled' : 'Disabled'}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={getToggleChecked(setting._id)}
                              onChange={(e) => handleToggleChange(setting, e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                          </label>
                        </div>
                      ) : (
                        <>
                          <input
                            type={typeof setting.value === 'number' ? 'number' : 'text'}
                            value={editValues[setting._id] ?? ''}
                            onChange={(e) => {
                              const val = typeof setting.value === 'number' ? Number(e.target.value) : e.target.value;
                              setEditValues(v => ({ ...v, [setting._id]: val }));
                            }}
                            className="w-36 sm:w-44 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          />
                          <button onClick={() => handleSaveSetting(setting)}
                            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium shrink-0">
                            <HiSave className="w-4 h-4" />
                            <span className="hidden sm:inline">Save</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })()}

      {/* ── Cloudinary Settings ── */}
      {activeTab === 'cloudinary' && (
        <div className="space-y-6">
          {/* Active Account & Branding Display Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-md border border-indigo-500/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    ACTIVE OPERATIONAL ACCOUNT
                  </span>
                  <span className="text-xs text-indigo-300 font-mono">ID: {cloudinary.cloudinary_cloud_name || 'Not Set'}</span>
                </div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <HiCloud className="w-6 h-6 text-indigo-400" /> {cloudinary.cloudinary_account_name || 'LucoHire Media Storage'}
                </h2>
                <p className="text-xs text-indigo-200 mt-1">
                  Active Cloud Name: <strong className="text-white font-mono">{cloudinary.cloudinary_cloud_name || 'Not Configured (Using Default)'}</strong> &bull; Subfolder Root: <span className="font-mono text-cyan-300">/{cloudinary.cloudinary_folder_prefix || 'lucohire_media'}/</span>
                </p>
              </div>
              <a
                href="https://cloudinary.com/console"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-sm self-start md:self-auto shrink-0 flex items-center gap-1.5"
              >
                Open Cloudinary Console ↗
              </a>
            </div>
          </div>

          {/* Guide Banner: Renaming/Configuring Cloudinary under LucoHire */}
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-5 text-xs text-indigo-900 space-y-2">
            <p className="font-bold text-sm text-indigo-950 flex items-center gap-1.5">
              <span>📘</span> How to Configure or Rename your Cloudinary Account to LucoHire Name:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-indigo-800 leading-relaxed pl-1">
              <li>Log into <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-950">cloudinary.com/console</a>.</li>
              <li>Go to <strong>Settings (⚙️ Gear icon) → Product Environments</strong> (or Account Settings).</li>
              <li>Click <strong>Edit Product Environment Name</strong> and change your <strong>Cloud Name</strong> to <code className="bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-mono font-bold">lucohire-media</code> or <code className="bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-mono font-bold">lucohire-cloud</code>.</li>
              <li>Copy your updated <strong>Cloud Name (Account ID)</strong>, <strong>API Key</strong>, and <strong>API Secret</strong> into the form below and click <strong>Save Cloudinary Settings</strong>.</li>
            </ol>
          </div>

          {/* Configuration Form Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <HiCloud className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-gray-900">Cloudinary Account & Branding Settings</h2>
            </div>

            {cloudinaryLoading ? (
              <div className="p-12 flex justify-center"><LoadingSpinner /></div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Account Branding Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Display Name / Branding Label
                  </label>
                  <input
                    type="text"
                    value={cloudinary.cloudinary_account_name || ''}
                    onChange={e => setCloudinary(c => ({ ...c, cloudinary_account_name: e.target.value }))}
                    placeholder="e.g. LucoHire Production Media Cloud"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Friendly account display label for admins</p>
                </div>

                {/* Cloud Name / Account ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Cloud Name (Account ID) <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="text"
                    value={cloudinary.cloudinary_cloud_name}
                    onChange={e => setCloudinary(c => ({ ...c, cloudinary_cloud_name: e.target.value }))}
                    placeholder="e.g. lucohire-media or your-cloud-id"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">This is your active Cloudinary Account ID / Environment Cloud Name from Dashboard</p>
                </div>

                {/* Root Upload Folder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Media Storage Folder Prefix
                  </label>
                  <input
                    type="text"
                    value={cloudinary.cloudinary_folder_prefix || ''}
                    onChange={e => setCloudinary(c => ({ ...c, cloudinary_folder_prefix: e.target.value }))}
                    placeholder="e.g. lucohire_media"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Root folder in Cloudinary where LucoHire avatars, resumes, and assets will be organized</p>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    API Key <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="text"
                    value={cloudinary.cloudinary_api_key}
                    onChange={e => setCloudinary(c => ({ ...c, cloudinary_api_key: e.target.value }))}
                    placeholder="e.g. 123456789012345"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Found under Dashboard → Settings → API Keys</p>
                </div>

                {/* API Secret */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    API Secret <span className="text-red-700">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={cloudinary.cloudinary_api_secret}
                      onChange={e => setCloudinary(c => ({ ...c, cloudinary_api_secret: e.target.value }))}
                      placeholder="••••••••••••••••••••••••"
                      className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
                    />
                    <button type="button" onClick={() => setShowSecret(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                      {showSecret ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Keep this secret — never share it publicly</p>
                </div>

                {/* How it works */}
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700 text-sm mb-2">How uploads work</p>
                  <p>① Admin saves credentials here → stored securely in the database</p>
                  <p>② Backend reads them at runtime to authenticate with Cloudinary</p>
                  <p>③ Users upload photos/documents → backend streams to Cloudinary → returns a URL</p>
                  <p>④ URLs are saved to user profiles and displayed across the platform</p>
                </div>

                <button onClick={handleSaveCloudinary} disabled={savingCloudinary}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium disabled:opacity-50">
                  <HiSave className="w-5 h-5" />
                  {savingCloudinary ? 'Saving...' : 'Save Cloudinary Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Admin Profile ── */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <HiPhotograph className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-gray-900">Admin Profile Photo</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar preview */}
              <div className="shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                  {photoPreview || adminPhoto ? (
                    <img src={photoPreview || adminPhoto} alt="Admin" className="w-full h-full object-cover" />
                  ) : (
                    <HiPhotograph className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                {photoPreview && (
                  <p className="text-xs text-amber-600 mt-2 text-center">Preview — not uploaded yet</p>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Select a new photo</label>
                  <input type="file" accept="image/*" onChange={handlePhotoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                  <p className="text-xs text-gray-400 mt-1">Recommended: square image, at least 200×200 px. JPG or PNG.</p>
                </div>
                <button onClick={handlePhotoUpload} disabled={!photoFile || uploadingPhoto}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                  {uploadingPhoto ? <LoadingSpinner size="sm" /> : <HiSave className="w-4 h-4" />}
                  {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </button>
                {adminPhoto && !photoPreview && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <HiCheckCircle className="w-4 h-4" />
                    <span>Photo is set</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Content ── */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {[
            { key: 'faq', label: 'FAQ Content', value: faqContent, set: setFaqContent, hint: 'Markdown supported. Shown on the public /faq page.' },
            { key: 'terms', label: 'Terms & Conditions', value: termsContent, set: setTermsContent, hint: 'Shown on the public /terms page.' },
            { key: 'privacy', label: 'Privacy Policy', value: privacyContent, set: setPrivacyContent, hint: 'Shown on the public /privacy page.' },
            { key: 'about', label: 'About Us', value: aboutContent, set: setAboutContent, hint: 'Markdown supported. Shown on the public /about page.' },
          ].map(({ key, label, value, set, hint }) => (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HiDocumentText className="w-5 h-5 text-gray-400" />
                  <h2 className="text-base font-bold text-gray-900">{label}</h2>
                </div>
                <button
                  onClick={() => handleSaveContent(key, value)}
                  disabled={savingContent === key}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50"
                >
                  <HiSave className="w-4 h-4" />
                  {savingContent === key ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="p-5">
                <textarea
                  value={value}
                  onChange={e => set(e.target.value)}
                  rows={10}
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-mono resize-y"
                />
                <p className="text-xs text-gray-400 mt-1.5">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Rotation Pools Command & Control Engine ── */}
      {activeTab === 'rotation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <HiChip className="w-5 h-5 text-purple-600" /> Active Rotation Pools Control Engine
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">{rotation.length} Pools</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Control provider visibility rotation, set strategies, add/reorder providers, and step manually.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreatePoolModal({ open: true, skill: '', city: '', maxPoolSize: 5, rotationInterval: 60, rotationStrategy: 'round_robin' })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-xs font-semibold shadow-sm"
                >
                  <HiPlus className="w-4 h-4" /> Create Rotation Pool
                </button>
                <button
                  onClick={fetchRotation}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-xs font-medium"
                >
                  <HiRefresh className="w-4 h-4" /> Refresh
                </button>
              </div>
            </div>

            {rotationLoading ? (
              <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : rotation.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <HiChip className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-500" />
                <p className="font-semibold text-gray-700">No active rotation pools found</p>
                <p className="text-xs mt-1 text-gray-400">Click <strong>+ Create Rotation Pool</strong> above to create your first rotation engine.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider">Skill & Market</th>
                      <th className="text-left py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider">Status & Strategy</th>
                      <th className="text-left py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider">Providers In Pool</th>
                      <th className="text-left py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="text-left py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider">Interval</th>
                      <th className="text-right py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider">Command & Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rotation.map((pool) => {
                      const poolStatus = pool.status || 'running';
                      const strategy = pool.rotationStrategy || 'round_robin';
                      return (
                        <tr key={pool._id} className="hover:bg-gray-50/50 transition">
                          {/* Skill & Market */}
                          <td className="py-4 px-4 font-semibold text-gray-900">
                            {pool.skill}{' '}
                            <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold ml-1">
                              {pool.city}
                            </span>
                          </td>

                          {/* Status & Strategy */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                                poolStatus === 'running' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                poolStatus === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${poolStatus === 'running' ? 'bg-emerald-500 animate-pulse' : poolStatus === 'paused' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                {poolStatus.toUpperCase()}
                              </span>
                              <span className="text-[11px] text-gray-500 font-medium capitalize">
                                ⚙️ {strategy.replace('_', ' ')}
                              </span>
                            </div>
                          </td>

                          {/* Providers in Pool */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-2">
                              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-extrabold w-fit">
                                {pool.providers?.length || 0} / {pool.maxPoolSize || 5} Max
                              </span>
                              <button
                                onClick={() => setManageProvidersModal({ open: true, pool, selectedProviderId: '', weight: 1 })}
                                className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors w-fit shrink-0"
                              >
                                <HiUsers className="w-4 h-4 shrink-0" /> Manage Priority
                              </button>
                            </div>
                          </td>

                          {/* Last Updated */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="text-xs text-gray-500 font-medium">
                              {pool.updatedAt ? new Date(pool.updatedAt).toLocaleString() : 'N/A'}
                            </span>
                          </td>

                          {/* Interval */}
                          <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-700 font-mono">
                            {pool.rotationInterval || 60}s
                          </td>

                          {/* Command Controls */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end items-center gap-2 flex-wrap min-w-[200px]">
                              {/* Start / Pause / Stop Buttons */}
                              {poolStatus === 'running' ? (
                                <button
                                  onClick={() => handlePausePool(pool._id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold transition shrink-0"
                                  title="Pause Rotation"
                                >
                                  <HiPause className="w-4 h-4 shrink-0" />
                                  <span>Pause</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStartPool(pool._id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition shrink-0"
                                  title="Start Rotation"
                                >
                                  <HiPlay className="w-4 h-4 shrink-0" />
                                  <span>Start</span>
                                </button>
                              )}
                              {/* Edit Config */}
                              <button
                                onClick={() => setConfigPoolModal({ open: true, pool })}
                                className="p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition shrink-0"
                                title="Configure rotation duration & rules"
                              >
                                <HiPencil className="w-4 h-4 shrink-0" />
                              </button>

                              {/* View History Logs */}
                              <button
                                onClick={() => setHistoryPoolModal({ open: true, pool })}
                                className="p-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition shrink-0"
                                title="View Rotation Activity Logs"
                              >
                                <HiClock className="w-4 h-4 shrink-0" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeletePool(pool._id)}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition shrink-0"
                                title="Delete Pool"
                              >
                                <HiTrash className="w-4 h-4 shrink-0" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal 1: Create Rotation Pool */}
          {createPoolModal.open && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <HiChip className="w-5 h-5 text-indigo-600" /> Create Rotation Pool
                  </h3>
                  <button onClick={() => setCreatePoolModal({ ...createPoolModal, open: false })} className="text-gray-400 hover:text-gray-700">
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreatePoolSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Skill *</label>
                    <input
                      type="text"
                      required
                      value={createPoolModal.skill}
                      onChange={e => setCreatePoolModal({ ...createPoolModal, skill: e.target.value })}
                      placeholder="e.g. React.js, Python, Plumber"
                      className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City / Region *</label>
                    <input
                      type="text"
                      required
                      value={createPoolModal.city}
                      onChange={e => setCreatePoolModal({ ...createPoolModal, city: e.target.value })}
                      placeholder="e.g. Bangalore, Delhi, Mumbai"
                      className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rotation Strategy</label>
                    <select
                      value={createPoolModal.rotationStrategy}
                      onChange={e => setCreatePoolModal({ ...createPoolModal, rotationStrategy: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                    >
                      <option value="round_robin">Round Robin (Sequential Rotation)</option>
                      <option value="weighted_random">Weighted Random (Priority-Based)</option>
                      <option value="fair_distribution">Fair Distribution (Least-Shown First)</option>
                      <option value="priority_boost">Priority Boost (Highest Weight First)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Max Pool Size</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={createPoolModal.maxPoolSize}
                        onChange={e => setCreatePoolModal({ ...createPoolModal, maxPoolSize: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (Seconds)</label>
                      <input
                        type="number"
                        min="10"
                        value={createPoolModal.rotationInterval}
                        onChange={e => setCreatePoolModal({ ...createPoolModal, rotationInterval: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setCreatePoolModal({ ...createPoolModal, open: false })}
                      className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl"
                    >
                      Create Pool
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal 2: Configure Rotation Strategy & Limits */}
          {configPoolModal.open && configPoolModal.pool && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-base font-bold text-gray-900">
                    Configure Pool: {configPoolModal.pool.skill} ({configPoolModal.pool.city})
                  </h3>
                  <button onClick={() => setConfigPoolModal({ open: false, pool: null })} className="text-gray-400 hover:text-gray-700">
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSavePoolConfig} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rotation Strategy</label>
                    <select
                      value={configPoolModal.pool.rotationStrategy || 'round_robin'}
                      onChange={e => setConfigPoolModal({
                        ...configPoolModal,
                        pool: { ...configPoolModal.pool, rotationStrategy: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                    >
                      <option value="round_robin">Round Robin (Sequential Rotation)</option>
                      <option value="weighted_random">Weighted Random (Priority-Based)</option>
                      <option value="fair_distribution">Fair Distribution (Least-Shown First)</option>
                      <option value="priority_boost">Priority Boost (Highest Weight First)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Max Pool Size Limit</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={configPoolModal.pool.maxPoolSize || 5}
                        onChange={e => setConfigPoolModal({
                          ...configPoolModal,
                          pool: { ...configPoolModal.pool, maxPoolSize: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Rotation Interval (Sec)</label>
                      <input
                        type="number"
                        min="10"
                        value={configPoolModal.pool.rotationInterval || 60}
                        onChange={e => setConfigPoolModal({
                          ...configPoolModal,
                          pool: { ...configPoolModal.pool, rotationInterval: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setConfigPoolModal({ open: false, pool: null })}
                      className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl"
                    >
                      Save Rules
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal 3: Manage Pool Users (Add/Remove, Priority Weight & Reorder) */}
          {manageProvidersModal.open && manageProvidersModal.pool && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center border-b pb-3 shrink-0">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Manage Users in Pool: {manageProvidersModal.pool.skill} ({manageProvidersModal.pool.city})
                    </h3>
                    <p className="text-xs text-gray-500">Add users, reorder priority, and adjust individual weights.</p>
                  </div>
                  <button onClick={() => setManageProvidersModal({ open: false, pool: null, selectedProviderId: '', weight: 1 })} className="text-gray-400 hover:text-gray-700">
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Add User Section */}
                <div className="bg-gray-50 p-3 rounded-xl border flex flex-col sm:flex-row items-center gap-2 shrink-0">
                  <select
                    value={manageProvidersModal.selectedProviderId}
                    onChange={e => setManageProvidersModal({ ...manageProvidersModal, selectedProviderId: e.target.value })}
                    className="w-full sm:flex-1 px-3 py-2 border rounded-xl text-xs bg-white"
                  >
                    <option value="">-- Select Provider to Add --</option>
                    {allProviders.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.user?.name || 'Unnamed Provider'} ({p.category || 'General'})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="Weight"
                    value={manageProvidersModal.weight}
                    onChange={e => setManageProvidersModal({ ...manageProvidersModal, weight: Number(e.target.value) })}
                    className="w-20 px-2 py-2 border rounded-xl text-xs text-center"
                    title="Priority Weight (1-10)"
                  />
                  <button
                    onClick={handleAddProviderToPool}
                    className="w-full sm:w-auto px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
                  >
                    Add User
                  </button>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
                  {(!manageProvidersModal.pool.providers || manageProvidersModal.pool.providers.length === 0) ? (
                    <p className="text-center text-xs text-gray-400 py-6">No users assigned to this rotation pool yet.</p>
                  ) : (
                    manageProvidersModal.pool.providers.map((item, idx) => {
                      const provName = item.provider?.user?.name || `Provider ID: ${item.provider?._id || item.provider}`;
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 transition text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px]">
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-gray-900">{provName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">
                                Weight: {item.weight || 1} &bull; Last Shown: {item.lastShown ? new Date(item.lastShown).toLocaleTimeString() : 'Never'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveProviderOrder(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-gray-500 hover:text-indigo-600 disabled:opacity-30"
                              title="Move Up"
                            >
                              <HiArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveProviderOrder(idx, 'down')}
                              disabled={idx === manageProvidersModal.pool.providers.length - 1}
                              className="p-1 text-gray-500 hover:text-indigo-600 disabled:opacity-30"
                              title="Move Down"
                            >
                              <HiArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveProviderFromPool(item.provider?._id || item.provider)}
                              className="p-1 text-red-700 hover:text-red-700 ml-1"
                              title="Remove User"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t shrink-0">
                  <button
                    onClick={() => setManageProvidersModal({ open: false, pool: null, selectedProviderId: '', weight: 1 })}
                    className="px-4 py-2 text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal 4: Rotation History & Activity Logs */}
          {historyPoolModal.open && historyPoolModal.pool && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center border-b pb-3 shrink-0">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <HiClock className="w-5 h-5 text-purple-600" /> Rotation Activity Logs ({historyPoolModal.pool.skill})
                  </h3>
                  <button onClick={() => setHistoryPoolModal({ open: false, pool: null })} className="text-gray-400 hover:text-gray-700">
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 text-xs">
                  {(!historyPoolModal.pool.history || historyPoolModal.pool.history.length === 0) ? (
                    <p className="text-center text-gray-400 py-6">No rotation history logged yet.</p>
                  ) : (
                    historyPoolModal.pool.history.slice().reverse().map((h, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-indigo-700 uppercase tracking-wider text-[10px]">{h.action}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700">{h.details}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-end pt-2 border-t shrink-0">
                  <button
                    onClick={() => setHistoryPoolModal({ open: false, pool: null })}
                    className="px-4 py-2 text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Company & Footer Details ── */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-base font-bold text-gray-900">Platform Company & Footer Details</h2>
              <p className="text-sm text-gray-500 mt-0.5">Configure official branding, government registration, tax numbers, and footer notices displayed across the platform.</p>
            </div>
            <button
              onClick={handleSaveCompanyDetails}
              disabled={savingCompanyDetails}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50 shadow-sm"
            >
              <HiSave className="w-4 h-4" />
              {savingCompanyDetails ? 'Saving...' : 'Save Details'}
            </button>
          </div>
          <div className="p-6 space-y-6 max-w-3xl">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company / Platform Name</label>
              <input
                type="text"
                value={companyDetails.companyName || ''}
                onChange={e => setCompanyDetails({...companyDetails, companyName: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow"
                placeholder="e.g. Lucohire Inc."
              />
            </div>

            {/* Government Certification / Registration Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Government Certification & Registration Details <span className="text-indigo-600 font-normal text-xs">(Displays Live in Website Footer)</span>
              </label>
              <textarea
                rows={2}
                value={companyDetails.registrationDetails || ''}
                onChange={e => setCompanyDetails({...companyDetails, registrationDetails: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow"
                placeholder="e.g. Certified from Government of India with Certificate No. 3424242 / CIN: U74999KA2025PTC123456"
              />
              <p className="text-xs text-gray-500 mt-1">Whatever text or certificate numbers you type here will display live in the website footer for all visitors.</p>
            </div>

            {/* Footer Short Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Footer Tagline / Short Description</label>
              <textarea
                rows={2}
                value={companyDetails.footerDescription || ''}
                onChange={e => setCompanyDetails({...companyDetails, footerDescription: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow"
                placeholder="e.g. India's AI-powered hiring platform. Verified providers, fair distribution, WhatsApp-first."
              />
            </div>

            {/* Tax / Registration Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration Type & Number</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={companyDetails.gstLabel || ''}
                  onChange={e => setCompanyDetails({...companyDetails, gstLabel: e.target.value})}
                  className="w-1/3 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow uppercase"
                  placeholder="e.g. GSTIN, UDYAM, CIN"
                />
                <input
                  type="text"
                  value={companyDetails.gstNumber || ''}
                  onChange={e => setCompanyDetails({...companyDetails, gstNumber: e.target.value})}
                  className="w-2/3 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm uppercase transition-shadow"
                  placeholder="e.g. 29AABCU9603R1ZX"
                />
              </div>
            </div>

            {/* Custom Footer Badges / Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Custom Footer Text</label>
              <input
                type="text"
                value={companyDetails.footerCustomText || ''}
                onChange={e => setCompanyDetails({...companyDetails, footerCustomText: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow"
                placeholder="e.g. Secure • GDPR Compliant • ISO 27001"
              />
            </div>

            {/* Primary Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Address</label>
              <LocationAutocomplete
                value={companyDetails.addressLine1 || ''}
                onChange={val => setCompanyDetails({...companyDetails, addressLine1: val})}
                onSelect={(loc) => setCompanyDetails({...companyDetails, addressLine1: loc.label})}
                mode="address"
                placeholder="Search for your company address..."
              />
            </div>

            {/* Address Line 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 2 (Optional)</label>
              <input
                type="text"
                value={companyDetails.addressLine2 || ''}
                onChange={e => setCompanyDetails({...companyDetails, addressLine2: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow"
                placeholder="Suite, Unit, Building, etc."
              />
            </div>

            {/* Copyright Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Footer Copyright Notice</label>
              <input
                type="text"
                value={companyDetails.copyrightText || ''}
                onChange={e => setCompanyDetails({...companyDetails, copyrightText: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow"
                placeholder="e.g. © 2026 Lucohire. All rights reserved."
              />
            </div>

            {/* Support Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Support Email</label>
                <input
                  type="email"
                  value={companyDetails.supportEmail || ''}
                  onChange={e => setCompanyDetails({...companyDetails, supportEmail: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow"
                  placeholder="e.g. support@lucohire.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Support Phone</label>
                <input
                  type="text"
                  value={companyDetails.supportPhone || ''}
                  onChange={e => setCompanyDetails({...companyDetails, supportPhone: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default AdminSettings;
