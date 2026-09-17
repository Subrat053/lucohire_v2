import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiSave, HiCamera, HiUser, HiOfficeBuilding,
  HiLocationMarker, HiInformationCircle, HiArrowLeft,
  HiCheckCircle,
} from 'react-icons/hi';
import { FaUserTie } from 'react-icons/fa';
import { recruiterAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SkillPicker from '../../components/common/SkillPicker';
import toast from 'react-hot-toast';
import { toAbsoluteMediaUrl } from '../../utils/media';
import { cacheBustedUrl } from '../../utils/cacheBuster';
import { sanitizePayload } from '../../utils/sanitizePayload';
import useSubmitLock from '../../hooks/useSubmitLock';
import LocationSearch from '../../components/LocationSearch';
import { compressImage } from '../../utils/fileCompressionService';
import { validateUploadFile } from '../../utils/fileValidationService';


const InputField = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-700">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none text-sm bg-white transition';

const RecruiterProfile = () => {
  const {
    t
  } = useTranslation();

  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Submit lock — prevents double save on rapid clicks
  const { isSubmitting, withLock } = useSubmitLock();


  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    isWhatsappSameAsMobile: true,
    companyName: '',
    companyType: 'individual',
    city: '',
    state: '',
    description: '',
    skillsNeeded: [],
    nearestLocation: '',
    latitude: null,
    longitude: null,
    location: null,
    profileName: '',
    companyLogo: '',
    businessType: '',
    companyWebsite: '',
    hiringLocation: '',
    contactPersonName: '',
    designation: '',
    bio: '',
  });




  const [photoPreview, setPhotoPreview] = useState('');
  const [savedPhoto, setSavedPhoto] = useState('');
  const [profile, setProfile] = useState(null);


  useEffect(() => { fetchProfile(); }, []);

  // Update form fields reactively when user context loads or updates
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        whatsappNumber: prev.whatsappNumber || user.whatsappNumber || '',
        isWhatsappSameAsMobile: prev.isWhatsappSameAsMobile ?? (user.isWhatsappSameAsMobile !== false),
      }));
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await recruiterAPI.getDashboard();
      const p = data.profile || {};
      setProfile(p);

      setForm({
        name: p.name || user?.name || '',
        email: p.email || user?.email || '',
        phone: p.phone || user?.phone || '',
        whatsappNumber: p.whatsappNumber || user?.whatsappNumber || '',
        isWhatsappSameAsMobile: p.isWhatsappSameAsMobile !== false,
        companyName: p.companyName || '',
        companyType: p.companyType || 'individual',
        city: p.city || '',
        state: p.state || '',
        description: p.description || '',
        skillsNeeded: p.skillsNeeded || [],
        nearestLocation: p.nearestLocation || '',
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        location: p.location || null,
        profileName: p.profileName || '',
        companyLogo: p.companyLogo || '',
        businessType: p.businessType || '',
        companyWebsite: p.companyWebsite || '',
        hiringLocation: p.hiringLocation || '',
        contactPersonName: p.contactPersonName || '',
        designation: p.designation || '',
        bio: p.bio || p.description || '',
      });

      let displayPhoto = p.profilePhoto || '';
      if (p.profilePhotoApproval?.status === 'pending' && p.profilePhotoApproval?.pendingUrl) {
        displayPhoto = p.profilePhotoApproval.pendingUrl;
      }
      if (displayPhoto) {
        const url = toAbsoluteMediaUrl(displayPhoto);
        setSavedPhoto(url);
        setPhotoPreview(url);
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB');
    setPhotoPreview(URL.createObjectURL(file));
    handlePhotoUpload(file);
  };

  const handlePhotoUpload = async (file) => {
    if (uploading) return; // Early guard

    // Validate size and format
    const validation = validateUploadFile(file, { maxSizeMB: 5 });
    if (!validation.isValid) {
      toast.error(validation.error);
      setPhotoPreview(savedPhoto);
      return;
    }

    setUploading(true);
    let finalFile = file;
    const toastId = toast.loading('Optimizing image...');

    try {
      const compressionResult = await compressImage(file, { maxSizeKB: 300 });
      if (compressionResult.optimized) {
        finalFile = compressionResult.compressedFile;
        const originalKB = (compressionResult.originalSize / 1024).toFixed(0);
        const compressedKB = (compressionResult.compressedSize / 1024).toFixed(0);
        toast.success(`Image optimized! Size reduced from ${originalKB}KB to ${compressedKB}KB`, { id: toastId });
      } else {
        toast.success('Uploading optimized image...', { id: toastId });
      }
    } catch (compressErr) {
      console.warn('Compression failed, uploading original:', compressErr);
      toast.error('Optimization skipped, uploading original...', { id: toastId });
    }

    const formData = new FormData();
    formData.append('profilePhoto', finalFile);
    try {
      const { data } = await recruiterAPI.uploadProfilePhoto(formData);
      if (data?.url) {
        const absoluteUrl = toAbsoluteMediaUrl(data.url);
        // Cache-bust so browser fetches fresh image immediately after upload
        const freshUrl = cacheBustedUrl(absoluteUrl);
        setSavedPhoto(absoluteUrl); // store clean URL
        setPhotoPreview(freshUrl);
      }
      await fetchUser();
      await fetchProfile();
      toast.success('Profile photo updated successfully!');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to upload photo';
      toast.error(msg);
      setPhotoPreview(savedPhoto);
    } finally {
      setUploading(false);
    }
  };


  const handleRemovePhoto = async () => {
    setPhotoPreview('');
    setSavedPhoto('');
    try {
      await recruiterAPI.deleteProfilePhoto();
      await fetchUser();
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to remove photo from server');
    }
  };

  const handleSave = withLock(async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    if (form.isWhatsappSameAsMobile === false && form.whatsappNumber) {
      const cleanWhatsapp = String(form.whatsappNumber).replace(/\D/g, '');
      if (cleanWhatsapp.length < 7) {
        return toast.error('Please enter a valid WhatsApp number.');
      }
    }
    setSaving(true);
    try {
      const cleanPayload = sanitizePayload(form);
      // Restore array fields that sanitizePayload leaves intact
      cleanPayload.skillsNeeded = form.skillsNeeded;
      cleanPayload.location = form.location; // object, not string
      await recruiterAPI.updateProfile(cleanPayload);
      await fetchUser();
      await fetchProfile();
      toast.success('Profile saved!');
      
      // Redirect to explore candidates after saving
      navigate('/recruiter/candidates');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  });


  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const displayPhoto = photoPreview || savedPhoto;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f0f4ff 0%,#f8f9ff 60%,#fafafa 100%)' }}>
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/recruiter/dashboard')}
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition"
          >
            <HiArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{t("Edit Profile")}</h1>
            <p className="text-sm text-gray-500">{t("Keep your profile up to date")}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {/* ── Photo + Basic Info ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-base font-extrabold text-gray-900 mb-5 flex items-center gap-2">
                <HiUser className="w-4 h-4 text-blue-500" />{t("Basic Information")}</h2>

              {/* Photo upload */}
              <div className="flex items-center gap-5 mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-200 bg-blue-100 flex items-center justify-center">
                    {displayPhoto ? (
                      <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <FaUserTie className="w-8 h-8 text-blue-700" />
                    )}
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition"
                  >
                    <HiCamera className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t("Profile Photo")}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t("JPG or PNG, max 5 MB")}</p>
                  {profile?.profilePhotoApproval?.status === 'pending' && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{t("Pending Approval")}</span>
                    </div>
                  )}
                  {savedPhoto && profile?.profilePhotoApproval?.status !== 'pending' && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-green-700 font-medium">
                      <HiCheckCircle className="w-3.5 h-3.5" />{t("Photo saved")}</span>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg transition disabled:opacity-50"
                    >
                      {uploading ? 'Uploading…' : 'Change Photo'}
                    </button>
                    {displayPhoto && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={uploading}
                        className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition disabled:opacity-50"
                      >{t("Remove")}</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <InputField label="Full Name" required>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputCls}
                    placeholder={t("Your account name")}
                  />
                </InputField>
                <InputField label="Profile / Display Name">
                  <input
                    value={form.profileName}
                    onChange={(e) => setForm({ ...form, profileName: e.target.value })}
                    className={inputCls}
                    placeholder={t("Publicly visible name")}
                  />
                </InputField>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <InputField label="Email Address">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputCls}
                    placeholder={t("Your email address")}
                  />
                </InputField>
                <InputField label="Mobile Number">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        phone: val,
                        ...(prev.isWhatsappSameAsMobile ? { whatsappNumber: val } : {}),
                      }));
                    }}
                    className={inputCls}
                    placeholder={t("Your phone number")}
                  />
                </InputField>
              </div>

              {/* WhatsApp Same As Mobile Toggle */}
              <div className="flex items-center space-x-2 mt-4">
                <input
                  id="isWhatsappSameAsMobile-recruiter"
                  type="checkbox"
                  checked={form.isWhatsappSameAsMobile !== false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      isWhatsappSameAsMobile: checked,
                      whatsappNumber: checked ? prev.phone : "",
                    }));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="isWhatsappSameAsMobile-recruiter" className="text-sm font-semibold text-gray-700 select-none cursor-pointer">{t("My WhatsApp number is the same as my mobile number")}</label>
              </div>

              {form.isWhatsappSameAsMobile === false && (
                <div className="mt-4 transition-all duration-300 animate-fadeIn">
                  <InputField label="WhatsApp Number (Optional)">
                    <input
                      type="tel"
                      value={form.whatsappNumber}
                      onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                      className={inputCls}
                      placeholder={t("Your WhatsApp number")}
                    />
                  </InputField>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <InputField label="Company / Brand Name">
                  <input
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className={inputCls}
                    placeholder={t("Company name")}
                  />
                </InputField>
                <InputField label="Business Type">
                  <input
                    value={form.businessType}
                    onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                    className={inputCls}
                    placeholder={t("e.g. Agency, IT Services")}
                  />
                </InputField>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <InputField label="Contact Person Name">
                  <input
                    value={form.contactPersonName}
                    onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })}
                    className={inputCls}
                    placeholder={t("Public contact name")}
                  />
                </InputField>
                <InputField label="Designation">
                  <input
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className={inputCls}
                    placeholder={t("e.g. HR Manager")}
                  />
                </InputField>
              </div>

            </div>

            {/* ── Company Details ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-base font-extrabold text-gray-900 mb-5 flex items-center gap-2">
                <HiOfficeBuilding className="w-4 h-4 text-indigo-500" />{t("Company Details")}</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <InputField label="Type">
                  <select
                    value={form.companyType}
                    onChange={(e) => setForm({ ...form, companyType: e.target.value })}
                    className={inputCls}
                  >
                    <option value="individual">{t("Individual")}</option>
                    <option value="company">{t("Company")}</option>
                    <option value="shop">{t("Shop")}</option>
                    <option value="home">{t("Home User")}</option>
                    <option value="other">{t("Other")}</option>
                  </select>
                </InputField>
                <InputField label="City">
                  <LocationSearch
                    value={form.city}
                    onChange={(value) => setForm({ ...form, city: value })}
                    onSelect={(item) => setForm((prev) => ({
                      ...prev,
                      city: item?.city || item?.name || prev.city,
                      state: item?.state || prev.state,
                      nearestLocation: item?.name || prev.nearestLocation,
                      latitude: item?.latitude ?? prev.latitude,
                      longitude: item?.longitude ?? prev.longitude,
                      location: item || null,
                    }))}

                    placeholder={t("e.g. Mumbai")}
                  />
                </InputField>
                <InputField label="State">
                  <input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className={inputCls}
                    placeholder={t("e.g. Maharashtra")}
                  />
                </InputField>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <InputField label="Company Website">
                  <input
                    value={form.companyWebsite}
                    onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
                    className={inputCls}
                    placeholder={t("https://...")}
                  />
                </InputField>
                <InputField label="Hiring Location">
                  <input
                    value={form.hiringLocation}
                    onChange={(e) => setForm({ ...form, hiringLocation: e.target.value })}
                    className={inputCls}
                    placeholder={t("e.g. remote or specific office")}
                  />
                </InputField>
              </div>

              <div className="mt-3">
              </div>
              <div className="mt-4">
                <InputField label="Bio / Description">
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={4}
                    className={`${inputCls} resize-none`}
                    placeholder={t("Brief description of your company or hiring needs...")}
                  />
                </InputField>
              </div>

            </div>
          </div>
          {/* ── Skills Needed ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-extrabold text-gray-900 mb-1 flex items-center gap-2">
              <HiInformationCircle className="w-4 h-4 text-purple-500" />{t("Skills You're Looking to Hire")}</h2>
            <p className="text-xs text-gray-500 mb-4">{t("Providers matching these skills will appear in your results.")}</p>
            <SkillPicker
              selectedSkills={form.skillsNeeded}
              onChange={(skills) => setForm({ ...form, skillsNeeded: skills })}
              maxSkills={0}
              placeholder={t("Select skills you want to hire for…")}
            />
          </div>

          {/* ── Actions ────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/recruiter/dashboard')}
              className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition text-sm"
            >{t("Cancel")}</button>
            <button
              type="submit"
              disabled={isSubmitting || saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <HiSave className="w-4 h-4" />
              {isSubmitting || saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecruiterProfile;
