import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiUsers, FiCreditCard, FiFileText, FiLink, 
  FiBell, FiShield, FiHelpCircle, FiCamera, FiCheck, FiArrowRight,
  FiExternalLink, FiUploadCloud, FiMail, FiPhone, FiChevronDown,
  FiChevronRight, FiMapPin, FiMoreVertical, FiPlus, FiClock, FiLock
} from 'react-icons/fi';
import { HiSparkles, HiOfficeBuilding } from 'react-icons/hi';
import LocationAutocomplete from '../../components/common/LocationAutocomplete';
import CreatableSelect from 'react-select/creatable';
import InvoiceModal from '../../components/recruiter/InvoiceModal';

const INDUSTRY_OPTIONS = [
  { value: 'Information Technology', label: 'Information Technology' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Retail', label: 'Retail' },
  { value: 'E-commerce', label: 'E-commerce' },
  { value: 'Education', label: 'Education' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Other', label: 'Other' }
];

const SCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-none sm:rounded-xl border-y sm:border border-gray-100 shadow-none sm:shadow-sm -mx-4 sm:mx-0 ${className}`}>{children}</div>
);

export default function Settings() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({});
  const [stats, setStats] = useState({});
  const [platformCompanyDetails, setPlatformCompanyDetails] = useState(null);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [initialFormData, setInitialFormData] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: 'Information Technology',
    companySize: '201 - 500 employees',
    companyWebsite: '',
    headquarters: '',
    foundedYear: '',
    email: '',
    phone: '',
    description: '',
    careerPageSettings: {
      url: '',
      primaryColor: '#4F46E5',
      secondaryColor: '#111827',
      showCompanyLogo: true,
      showCultureSection: true,
      allowResumeDownload: true,
      anonymousApplications: false
    }
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const hasUnsavedChanges = initialFormData && JSON.stringify(formData) !== JSON.stringify(initialFormData);
    
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleLinkClick = (e) => {
      if (!hasUnsavedChanges) return;
      
      const target = e.target.closest('a');
      if (target && target.href && target.target !== '_blank') {
        const targetUrl = new URL(target.href);
        const currentUrl = new URL(window.location.href);
        if (targetUrl.pathname !== currentUrl.pathname) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation(targetUrl.pathname + targetUrl.search);
          setShowUnsavedModal(true);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleLinkClick, { capture: true });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, [formData, initialFormData]);

  const handleConfirmLeave = () => {
    setShowUnsavedModal(false);
    setInitialFormData(formData); // This tricks the blocker into thinking there are no unsaved changes
    if (pendingNavigation) {
      setTimeout(() => navigate(pendingNavigation), 0);
    }
  };

  const handleCancelLeave = () => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
  };

  const fetchProfile = async () => {
    try {
      const res = await API.get('/recruiter/dashboard');
      const p = res.data.profile;
      setProfileData(p);
      setStats(res.data.stats || {});
      setPlatformCompanyDetails(res.data.platformCompanyDetails || null);
      const data = {
        companyName: p.companyName || '',
        industry: p.industry || 'Information Technology',
        companySize: p.companySize || '201 - 500 employees',
        companyWebsite: p.companyWebsite || '',
        headquarters: p.city ? `${p.city}${p.state ? `, ${p.state}` : ''}` : '',
        foundedYear: p.foundedYear || '',
        email: p.email || '',
        phone: p.phone || '',
        description: p.description || '',
        careerPageSettings: p.careerPageSettings || {
          url: '',
          primaryColor: '#4F46E5',
          secondaryColor: '#111827',
          showCompanyLogo: true,
          showCultureSection: true,
          allowResumeDownload: true,
          anonymousApplications: false
        }
      };
      setFormData(data);
      setInitialFormData(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCareerSettingChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      careerPageSettings: {
        ...prev.careerPageSettings,
        [name]: value
      }
    }));
  };

  const handleToggle = (name) => {
    setFormData(prev => ({
      ...prev,
      careerPageSettings: {
        ...prev.careerPageSettings,
        [name]: !prev.careerPageSettings[name]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const parts = formData.headquarters.split(',').map(s => s.trim());
      const city = parts[0] || '';
      const state = parts[1] || '';

      await API.put('/recruiter/profile', {
        companyName: formData.companyName,
        industry: formData.industry,
        companySize: formData.companySize,
        companyWebsite: formData.companyWebsite,
        city,
        state,
        foundedYear: formData.foundedYear,
        email: formData.email,
        phone: formData.phone,
        description: formData.description,
        careerPageSettings: formData.careerPageSettings
      });
      setProfileSuccess('Settings saved successfully');
      setInitialFormData(formData);
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setProfileError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return setPasswordError("Passwords do not match");
    }
    if (passwordData.newPassword.length < 6) {
      return setPasswordError("Password must be at least 6 characters long");
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      setPasswordSuccess("Password changed successfully");
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formDataObj = new FormData();
    formDataObj.append('profilePhoto', file);
    
    try {
      toast.loading('Uploading logo...', { id: 'upload' });
      await API.post('/recruiter/profile/photo', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Logo uploaded', { id: 'upload' });
      fetchProfile(); 
    } catch (err) {
      console.error(err);
      toast.error('Upload failed', { id: 'upload' });
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("Company Profile Settings & Billing")}</h1>
              <p className="text-sm font-medium text-gray-500">{t("Manage your account, team, subscriptions and preferences.")}</p>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-70"
            >
              <FiCheck className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Column (Forms) */}
            <div className="flex-1 min-w-0 space-y-6">
            
            {/* Company Profile Card */}
            <SCard className="p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-base font-black text-gray-900">{t("Company Profile")}</h2>
                <p className="text-xs font-medium text-gray-500 mt-1">{t("Update your company details and public profile")}</p>
              </div>

              {profileError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
                  {profileSuccess}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-8 mb-8">
                {/* Logo Upload */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-32 h-32 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center mb-3 relative group overflow-hidden">
                    {profileData?.profilePhotoApproval?.status === 'pending' && profileData?.profilePhotoApproval?.pendingUrl ? (
                      <>
                        <img src={profileData.profilePhotoApproval.pendingUrl} alt="Company Logo" className="w-full h-full object-cover opacity-70" />
                        <div className="absolute top-0 w-full bg-yellow-500 text-white text-[9px] font-bold py-1 text-center">{t("Pending Approval")}</div>
                      </>
                    ) : profileData?.profilePhoto ? (
                      <img src={profileData.profilePhoto} alt="Company Logo" className="w-full h-full object-cover" />
                    ) : (
                      <img src="/lucohire-logo.webp" alt="Company Logo" className="w-16 h-16 opacity-50" />
                    )}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 w-7 h-7 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center text-gray-700 hover:text-indigo-600 transition z-10"
                    >
                      <FiCamera className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{t("Update Logo")}</span>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-indigo-600 border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition w-full">{t("Change Logo")}</button>
                </div>
                
                {/* Form Fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Company Name")}</label>
                    <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Industry")}</label>
                    <CreatableSelect
                      name="industry"
                      options={INDUSTRY_OPTIONS}
                      className="text-sm font-medium text-gray-900 shadow-sm"
                      classNamePrefix="select"
                      placeholder={t("Search or type industry")}
                      value={
                        formData.industry
                          ? { value: formData.industry, label: formData.industry }
                          : null
                      }
                      onChange={(selectedOption) => {
                        setFormData(prev => ({ ...prev, industry: selectedOption ? selectedOption.value : '' }));
                      }}
                      styles={{
                        control: (baseStyles, state) => ({
                          ...baseStyles,
                          borderColor: state.isFocused ? '#6366f1' : '#e5e7eb',
                          boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
                          '&:hover': {
                            borderColor: state.isFocused ? '#6366f1' : '#d1d5db',
                          },
                          borderRadius: '0.5rem',
                          padding: '1px',
                          minHeight: '42px',
                        }),
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Company Size")}</label>
                    <div className="relative">
                      <select name="companySize" value={formData.companySize} onChange={handleChange} className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 appearance-none focus:outline-none focus:border-indigo-500 shadow-sm">
                        <option>{t("1 - 10 employees")}</option>
                        <option>{t("11 - 50 employees")}</option>
                        <option>{t("51 - 200 employees")}</option>
                        <option>{t("201 - 500 employees")}</option>
                        <option>{t("501 - 1000 employees")}</option>
                        <option>{t("1000+ employees")}</option>
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Website")}</label>
                    <input type="text" name="companyWebsite" value={formData.companyWebsite} onChange={handleChange} className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 shadow-sm" />
                  </div>
                  <div className="relative z-10">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Headquarters")}</label>
                    <LocationAutocomplete
                      value={formData.headquarters}
                      onChange={(val) => setFormData(prev => ({ ...prev, headquarters: val }))}
                      onSelect={(loc) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          headquarters: `${loc.city || ''}${loc.city && loc.state ? ', ' : ''}${loc.state || ''}`
                        }));
                      }}
                      placeholder={t("e.g. Bangalore, Karnataka")}
                      inputClassName="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Founded Year")}</label>
                    <input type="text" name="foundedYear" value={formData.foundedYear} onChange={handleChange} className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Company Email")}</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Phone Number")}</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 shadow-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Company Description")}</label>
                    <textarea rows="3" name="description" value={formData.description} onChange={handleChange} className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 shadow-sm custom-scrollbar"></textarea>
                    <div className="flex justify-end mt-1 text-[10px] font-bold text-gray-400">{formData.description.length}/500</div>
                  </div>
                </div>
              </div>
            </SCard>

            {/* Change Password Card */}
            <SCard className="p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-base font-black text-gray-900">{t("Change Password")}</h2>
                <p className="text-xs font-medium text-gray-500 mt-1">{t("Update your account security credentials")}</p>
              </div>

              {/* Security Recipient Info */}
              <div className="mb-6 p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Security Verification Recipient
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="text-[11px] text-indigo-300 hover:text-white font-bold underline"
                  >
                    Update Email / Phone ↗
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono">
                  <div>
                    <span className="text-slate-400 font-sans text-[10px] block">Email:</span>
                    <span className="font-bold text-white text-xs">{profileData.companyEmail || 'Not configured'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans text-[10px] block">Mobile:</span>
                    <span className="font-bold text-white text-xs">{profileData.phone || 'Not configured'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  ℹ️ Security verification links & OTPs are dispatched to the contact details above.
                </p>
              </div>

              {passwordError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("New Password")}</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="password" 
                      value={passwordData.newPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                      placeholder={t("Enter new password")}
                      className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("Confirm Password")}</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="password" 
                      value={passwordData.confirmPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                      placeholder={t("Confirm new password")}
                      className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" 
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button 
                    type="submit"
                    disabled={changingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!profileData.companyEmail) return toast.error("Email not found");
                      try {
                        await authAPI.forgotPassword({ email: profileData.companyEmail });
                        toast.success(`Reset link & OTP sent to ${profileData.companyEmail}`);
                      } catch (err) {
                        toast.error(err.response?.data?.message || "Failed to send reset link");
                      }
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 rounded-lg transition"
                  >
                    🔑 Forgot Password? Send Reset OTP
                  </button>
                </div>
              </form>
            </SCard>
          </div>

          {/* Right Sidebar (Subscription & Links) */}
          <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 space-y-6">
            
            {/* Your Subscription */}
            <SCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">{t("Your Subscription")}</h2>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <HiSparkles className="w-3 h-3" /> 
                  {stats?.currentPlan === 'custom'
                    ? 'Custom Plan'
                    : (stats?.subscriptionPlan && stats.subscriptionPlan !== "None" 
                      ? stats.subscriptionPlan 
                      : (stats?.currentPlan 
                        ? stats.currentPlan.charAt(0).toUpperCase() + stats.currentPlan.slice(1) + " Plan" 
                        : 'Free Plan'))}
                </span>
              </div>
              <div className="mb-4">
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-2xl font-black text-gray-900">
                    {stats?.currentPlan === 'custom'
                      ? 'Custom'
                      : (stats?.planPrice > 0 ? `₹${stats.planPrice}` : '₹0')}
                  </span>
                  <span className="text-xs text-gray-500 font-medium mb-1">
                    {stats?.currentPlan === 'custom' ? 'Pricing' : '/ month'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-gray-500 font-medium">
                    {stats?.planEndDate ? `Renews on ${new Date(stats.planEndDate).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}` : 'No expiration'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${stats?.planStatus === 'active' || !stats?.planStatus ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                    {stats?.planStatus ? stats.planStatus.charAt(0).toUpperCase() + stats.planStatus.slice(1) : 'Active'}
                  </span>
                </div>
              </div>
              <button onClick={() => navigate('/recruiter/plans-billing')} className="w-full bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg text-xs font-bold transition">{t("Manage Subscription")}</button>
            </SCard>

            {/* Credits & Usage */}
            <SCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-gray-900">{t("Credits & Usage")}</h2>
              </div>
              
              <div className="space-y-5">
                {[
                  { 
                    label: 'Job Posts (Monthly)', 
                    current: stats?.remainingPostLimit === 'unlimited' || stats?.jobPostLimit === -1 ? 0 : Math.max(0, (stats?.jobPostLimit || 0) - (stats?.remainingPostLimit || 0)), 
                    max: stats?.remainingPostLimit === 'unlimited' || stats?.jobPostLimit === -1 ? '∞' : (stats?.jobPostLimit || 0), 
                    color: 'bg-indigo-600', icon: <FiFileText />, iconColor: 'text-indigo-600 bg-indigo-50' 
                  },
                  { 
                    label: 'Resume Unlocks', 
                    remaining: stats?.unlocksRemaining || 0,
                    isRemainingOnly: true,
                    color: 'bg-emerald-500', icon: <FiUsers />, iconColor: 'text-emerald-500 bg-emerald-50' 
                  },
                  { 
                    label: 'Job Boosts', 
                    remaining: stats?.boostJobsRemaining || 0, 
                    isRemainingOnly: true,
                    color: 'bg-orange-500', icon: <HiOfficeBuilding />, iconColor: 'text-orange-500 bg-orange-50' 
                  },
                  { 
                    label: 'Boost Days', 
                    remaining: stats?.boostDaysRemaining || 0, 
                    isRemainingOnly: true,
                    color: 'bg-blue-500', icon: <FiUploadCloud />, iconColor: 'text-blue-500 bg-blue-50' 
                  },
                ].map((credit, i) => {
                  if (credit.isRemainingOnly) {
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-[11px] font-bold mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${credit.iconColor}`}>
                              {React.cloneElement(credit.icon, { className: 'w-3 h-3' })}
                            </div>
                            <span className="text-gray-700">{credit.label}</span>
                          </div>
                          <div className="text-gray-900">
                            {credit.remaining} <span className="text-gray-500 font-medium">Remaining</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const max = credit.max === '∞' ? 100 : (credit.max || 1);
                  const current = credit.max === '∞' ? 0 : credit.current;
                  const percentage = credit.max === '∞' ? 0 : Math.min(100, (current / max) * 100);
                  return (
                  <div key={i}>
                    <div className="flex justify-between text-[11px] font-bold mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${credit.iconColor}`}>
                          {React.cloneElement(credit.icon, { className: 'w-3 h-3' })}
                        </div>
                        <span className="text-gray-700">{credit.label}</span>
                      </div>
                      <div className="text-gray-500">
                        {credit.max === '∞' ? (
                          <span className="text-gray-900">Unlimited</span>
                        ) : (
                          <><span className="text-gray-900">{credit.current}</span> / {credit.max}</>
                        )}
                      </div>
                    </div>
                    {credit.max !== '∞' && (
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div className={`h-1 rounded-full ${credit.color}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    )}
                  </div>
                )})}
                
                {/* AI Copilot Usage (Unlimited) */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-[11px] font-bold mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-purple-600 bg-purple-50">
                        <HiSparkles className="w-3 h-3" />
                      </div>
                      <span className="text-gray-700">{t("AI Copilot Usage")}</span>
                    </div>
                    <span className="text-gray-900">{t("Unlimited")}</span>
                  </div>
                </div>
              </div>
            </SCard>

            {/* Quick Links */}
            <SCard className="p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">{t("Quick Links")}</h2>
              <div className="space-y-1">
                {[
                  { label: 'Billing History & Invoices', icon: <FiFileText />, action: () => setIsInvoiceModalOpen(true) },
                ].map((link, i) => (
                  <button key={i} onClick={link.action} className="w-full flex items-center justify-between py-2.5 text-[13px] font-bold text-gray-700 hover:text-indigo-600 group">
                    <div className="flex items-center gap-2.5">
                      <span className="text-gray-400 group-hover:text-indigo-600">{link.icon}</span>
                      {link.label}
                    </div>
                    <FiChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>
            </SCard>

            {/* Need Help? */}
            <SCard className="p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-1">{t("Need Help?")}</h2>
              <p className="text-[11px] font-medium text-gray-500 mb-4">{t("Our support team is here to help you.")}</p>
              
              <a 
                href="https://wa.me/+919916976859" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg text-[13px] font-bold transition"
              >
                <FiHelpCircle className="w-3.5 h-3.5" />{t("Contact Support")}
              </a>
            </SCard>

          </div>
          
          </div>
      </div>
      <InvoiceModal 
        isOpen={isInvoiceModalOpen} 
        onClose={() => setIsInvoiceModalOpen(false)} 
        profileData={profileData} 
        fetchProfile={fetchProfile}
        platformCompanyDetails={platformCompanyDetails}
        onUpdateGst={async (newGst) => {
          try {
            await API.put('/recruiter/profile', { gstNumber: newGst });
            fetchProfile(); // Refresh to get updated GST
            toast.success("GST Number updated successfully");
          } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update GST");
          }
        }}
      />

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <span className="text-amber-600 text-xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Unsaved Changes</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                You have unsaved changes in your company profile. If you leave this page, your changes will be lost.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={handleCancelLeave}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-bold transition"
                >
                  Stay
                </button>
                <button 
                  onClick={handleConfirmLeave}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition shadow-sm"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}