import { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { providerWalletAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HiCreditCard, HiPlus, HiTrash, HiCheckCircle, HiArrowRight, HiShieldCheck, HiOutlineSparkles, HiLockClosed, HiExclamationCircle } from 'react-icons/hi';
import { FaQrcode as HiQrCode } from 'react-icons/fa';
import useTranslation from '../../hooks/useTranslation';
import RouteLoader from '../../components/common/RouteLoader';

const PayoutSettings = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  
  const [payoutMethods, setPayoutMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [activeTab, setActiveTab] = useState('bank'); // bank, upi, qr
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });
  const [upiId, setUpiId] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState('');
  const [qrProviderName, setQrProviderName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // OTP States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [saving, setSaving] = useState(false);

  // Phone verification settings states
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState(''); // 'verify_old' or 'verify_new'
  const [phoneOtp, setPhoneOtp] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [showConcernForm, setShowConcernForm] = useState(false);
  const [concernMessage, setConcernMessage] = useState('');
  const [raisingConcern, setRaisingConcern] = useState(false);
  const [initiatingPhoneChange, setInitiatingPhoneChange] = useState(false);

  useEffect(() => {
    fetchPayoutData();
    
    // Cleanup recaptcha on unmount
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // ignore cleanup errors
        }
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // Phone verification settings handlers
  const handleInitiatePhoneChange = async (e) => {
    if (e) e.preventDefault();
    if (!newPhone) {
      toast.error(t('payout.newPhoneRequired', 'New mobile number is required'));
      return;
    }
    const cleanNum = newPhone.replace(/\D/g, '');
    if (cleanNum.length < 10) {
      toast.error(t('payout.phoneInvalid', 'Please enter a valid 10-digit mobile number'));
      return;
    }

    try {
      setInitiatingPhoneChange(true);
      const { data } = await providerWalletAPI.initiatePhoneChange({ newPhone: cleanNum });
      setPhoneStep(data.step); // 'verify_old' or 'verify_new'
      setPhoneOtp('');
      setShowConcernForm(false);
      setShowPhoneModal(true);
      toast.success(data.message || t('payout.otpInitiated', 'Verification OTP sent.'));
    } catch (err) {
      toast.error(err?.response?.data?.message || t('payout.initiatePhoneFail', 'Failed to initiate phone change'));
    } finally {
      setInitiatingPhoneChange(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      toast.error(t('payout.enterOtp', 'Please enter the 6-digit OTP code'));
      return;
    }

    setVerifyingPhone(true);
    const cleanNum = newPhone.replace(/\D/g, '');
    try {
      if (phoneStep === 'verify_old') {
        const { data } = await providerWalletAPI.verifyOldPhoneOTP({ otp: phoneOtp, newPhone: cleanNum });
        setPhoneStep('verify_new');
        setPhoneOtp('');
        toast.success(data.message || t('payout.oldPhoneVerified', 'Old phone verified. OTP sent to new number.'));
      } else if (phoneStep === 'verify_new') {
        const { data } = await providerWalletAPI.verifyNewPhoneOTP({ otp: phoneOtp, newPhone: cleanNum });
        toast.success(data.message || t('payout.phoneUpdated', 'Mobile number updated successfully!'));
        setPhone(data.phone || cleanNum);
        setShowPhoneModal(false);
        setNewPhone('');
        setPhoneOtp('');
        if (refreshUser) {
          await refreshUser();
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || t('payout.verifyOtpFail', 'OTP verification failed'));
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleRaiseConcern = async (e) => {
    if (e) e.preventDefault();
    if (!concernMessage.trim()) {
      toast.error(t('payout.concernRequired', 'Please describe your concern'));
      return;
    }

    try {
      setRaisingConcern(true);
      const { data } = await providerWalletAPI.raiseConcernLostPhone({ message: concernMessage });
      toast.success(data.message || t('payout.concernSubmitted', 'Concern logged successfully. Admin will review soon.'));
      setShowConcernForm(false);
      setShowPhoneModal(false);
      setConcernMessage('');
    } catch (err) {
      toast.error(err?.response?.data?.message || t('payout.concernFail', 'Failed to log concern ticket'));
    } finally {
      setRaisingConcern(false);
    }
  };

  const fetchPayoutData = async () => {
    try {
      setLoading(true);
      const { data } = await providerWalletAPI.getWallet();
      setPayoutMethods(data.payoutMethods || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || t('payout.failedLoad', 'Failed to load payout settings'));
    } finally {
      setLoading(false);
    }
  };

  const [firebaseToken, setFirebaseToken] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = null;
            }
          },
        }
      );
    }
    return window.recaptchaVerifier;
  };

  // Start Firebase phone verification (sends SMS)
  const startFirebaseVerification = async (e) => {
    if (e) e.preventDefault();
    if (!phone) {
      toast.error(t('payout.phoneRequired', 'Mobile number is required for verification'));
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error(t('payout.phoneInvalid', 'Please enter a valid mobile number'));
      return;
    }
    
    let formattedPhone = cleanPhone;
    if (cleanPhone.length === 10) {
      formattedPhone = `+91${cleanPhone}`;
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      formattedPhone = `+${cleanPhone}`;
    } else {
      formattedPhone = `+${cleanPhone}`;
    }

    try {
      setSendingOtp(true);
      const verifier = setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setShowOtpModal(true);
      toast.success(t('payout.otpSent', 'Verification code sent to your mobile'));
    } catch (err) {
      console.error(err);
      console.error('Firebase verify failed, falling back to server OTP', err);
      // fallback: request server-side OTP
      try {
        const clean = cleanPhone;
        await providerWalletAPI.sendOtpForPayout({ phone: clean });
        setShowOtpModal(true);
        toast.success(t('payout.otpSent', 'Verification code sent to your mobile'));
      } catch (sendErr) {
        console.error('Server OTP send failed', sendErr);
        toast.error(t('payout.otpFail', 'Failed to send verification code'));
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleQrUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('qrCode', file);
    
    const toastId = toast.loading(t('payout.uploadingQr', 'Uploading QR Code image...'));
    try {
      const { data } = await providerWalletAPI.uploadQrCode(formData);
      setQrPreview(data.url);
      toast.success(t('payout.qrUploaded', 'QR Code uploaded successfully!'), { id: toastId });
    } catch (err) {
      toast.error(err?.response?.data?.message || t('payout.qrUploadFail', 'QR Image upload failed'), { id: toastId });
    }
  };

  // Confirm OTP entered in modal and obtain Firebase ID token
  const confirmFirebaseOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error(t('payout.enterOtp', 'Enter the 6-digit code'));
      return;
    }
    if (!confirmationResult) {
      toast.error(t('payout.otpMissing', 'Verification not started'));
      return;
    }

    try {
      setSaving(true);
      const result = await confirmationResult.confirm(otp);
      const token = await result.user.getIdToken(true);
      setFirebaseToken(token);
      toast.success(t('payout.tokenAcquired', 'Phone verified'));
      await handleSavePayoutMethod(token);
      setShowOtpModal(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || t('payout.verifyFail', 'OTP verification failed'));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setBankDetails({
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
    });
    setUpiId('');
    setQrFile(null);
    setQrPreview('');
    setQrProviderName('');
    setIsDefault(false);
    setEditingId(null);
    setOtp('');
    setShowOtpModal(false);
  };

  // Send server-side OTP (used for Resend and fallback)
  const handleSendOtp = async () => {
    if (!phone) {
      toast.error(t('payout.phoneRequired', 'Mobile number is required for verification'));
      return;
    }
    const clean = String(phone).replace(/\D/g, '');
    try {
      setSendingOtp(true);
      await providerWalletAPI.sendOtpForPayout({ phone: clean });
      setOtp('');
      setShowOtpModal(true);
      toast.success(t('payout.otpSent', 'Verification code sent to your mobile'));
    } catch (err) {
      toast.error(err?.response?.data?.message || t('payout.otpFail', 'Failed to send verification code'));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleEditClick = (method) => {
    resetForm();
    setEditingId(method._id);
    setActiveTab(method.type);
    setIsDefault(method.isDefault);
    
    if (method.type === 'bank') {
      setBankDetails({
        accountHolderName: method.bankDetails?.accountHolderName || '',
        bankName: method.bankDetails?.bankName || '',
        accountNumber: '', // Keep empty or masked for safety upon edit
        ifscCode: method.bankDetails?.ifscCode || '',
      });
    } else if (method.type === 'upi') {
      setUpiId(method.upiId || '');
    } else if (method.type === 'qr') {
      setQrPreview(method.qrCodeImage || '');
      setQrProviderName(method.providerName || '');
    }
    
    // Smooth scroll to top/form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePayoutMethod = async (overrideToken = null) => {
    const activeToken = typeof overrideToken === 'string' ? overrideToken : firebaseToken;
    // Allow either Firebase token or server-side OTP
    if (!activeToken && otp.length !== 6) {
      toast.error(t('payout.tokenMissing', 'Verification token is missing'));
      return;
    }

    setSaving(true);
    const payload = {
      id: editingId,
      type: activeTab,
      isDefault,
      phone
    };

    if (activeToken) payload.firebaseToken = activeToken;
    else payload.otp = otp; // server-side OTP fallback
    // If verifying a phone number different from profile, pass otpPhone
    try {
      const userPhoneClean = String(user?.phone || '').replace(/\D/g, '');
      const currentPhoneClean = String(phone || '').replace(/\D/g, '');
      if (currentPhoneClean && userPhoneClean && currentPhoneClean !== userPhoneClean) {
        payload.otpPhone = currentPhoneClean;
      }
    } catch (e) {
      // ignore
    }

    if (activeTab === 'bank') {
      payload.bankDetails = bankDetails;
    } else if (activeTab === 'upi') {
      payload.upiId = upiId;
    } else if (activeTab === 'qr') {
      payload.qrCodeImage = qrPreview;
      payload.providerName = qrProviderName;
    }

    try {
      const { data } = await providerWalletAPI.savePayoutMethod(payload);
    setPayoutMethods(data.payoutMethods || []);
    toast.success(editingId ? t('payout.updated', 'Payment method updated!') : t('payout.saved', 'Payment method saved!'));
    resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('payout.saveFail', 'Failed to save payment method'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const { data } = await providerWalletAPI.setDefaultPayoutMethod(id);
      setPayoutMethods(data.payoutMethods || []);
      toast.success(t('payout.defaultSet', 'Default payout method updated'));
    } catch (err) {
      toast.error(err?.response?.data?.message || t('payout.defaultFail', 'Failed to update default status'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('payout.deleteConfirm', 'Are you sure you want to delete this payment method?'))) return;
    try {
      const { data } = await providerWalletAPI.deletePayoutMethod(id);
      setPayoutMethods(data.payoutMethods || []);
      toast.success(t('payout.deleted', 'Payment method removed'));
    } catch (err) {
      toast.error(err?.response?.data?.message || t('payout.deleteFail', 'Failed to delete payment method'));
    }
  };

  if (loading) {
    return <RouteLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-8 mb-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
              <HiOutlineSparkles className="w-3.5 h-3.5" />
              {t('payout.badge', 'Withdrawal Center')}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{t('payout.title', 'Payment Settings')}</h1>
            <p className="text-slate-400 mt-2 max-w-lg text-sm md:text-base">
              {t('payout.subtitle', 'Configure and verify your billing payment destinations securely. Verification code is required for modifications.')}
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/10 shrink-0">
            <HiShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-400">{t('payout.securityStatus', 'Secured & Masked')}</p>
              <p className="text-xs font-bold text-slate-200">{t('payout.securityLevel', 'AES-256 Compliant')}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Side: Payout Form */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><HiCreditCard className="w-5 h-5" /></span>
            {editingId ? t('payout.editHeader', 'Edit Payment Method') : t('payout.addHeader', 'Add Payment Method')}
          </h2>

          {/* Form Tabs */}
          <div className="flex p-1.5 bg-slate-50 rounded-2xl mb-6">
            {[
              { id: 'bank', label: t('payout.tabBank', 'Bank Account'), icon: HiCreditCard },
              { id: 'upi', label: t('payout.tabUpi', 'UPI ID'), icon: HiShieldCheck },
              { id: 'qr', label: t('payout.tabQr', 'QR Code'), icon: HiQrCode }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { if (!editingId) setActiveTab(tab.id); }}
                disabled={!!editingId}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-100'
                    : 'text-slate-500 hover:text-slate-900 disabled:opacity-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={startFirebaseVerification} className="space-y-4">
            {activeTab === 'bank' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('payout.bankName', 'Bank Name')}</label>
                    <input
                      type="text"
                      required
                      value={bankDetails.bankName}
                      onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                      placeholder={t("e.g. HDFC Bank")}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('payout.holderName', 'Holder Name')}</label>
                    <input
                      type="text"
                      required
                      value={bankDetails.accountHolderName}
                      onChange={e => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                      placeholder={t("Name as in Bank")}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('payout.accountNo', 'Account Number')}</label>
                  <input
                    type="password"
                    required
                    value={bankDetails.accountNumber}
                    onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    placeholder={editingId ? '••••••••••••' : 'Enter complete account number'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 transition font-mono"
                  />
                  {editingId && <p className="text-xs text-amber-500 mt-1">{t('payout.editBankHint', 'Leave or enter new value to overwrite')}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('payout.ifsc', 'IFSC Code')}</label>
                  <input
                    type="text"
                    required
                    value={bankDetails.ifscCode}
                    onChange={e => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                    placeholder={t("e.g. HDFC0001234")}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 transition font-mono uppercase"
                  />
                </div>
              </div>
            )}

            {activeTab === 'upi' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('payout.upiId', 'UPI ID')}</label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    placeholder={t("e.g. name@upi")}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 transition font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === 'qr' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('payout.qrFile', 'Upload QR Code Image')}</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-500 transition relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) handleQrUpload(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {qrPreview ? (
                      <div className="flex flex-col items-center">
                        <img src={qrPreview} alt="QR Code Preview" className="w-32 h-32 object-contain rounded-lg border bg-white mb-2" />
                        <span className="text-xs text-emerald-600 font-semibold">{t('payout.replaceQr', 'Click to replace image')}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <HiQrCode className="w-10 h-10 text-slate-400 mb-2" />
                        <p className="text-sm font-semibold text-slate-600">{t('payout.dragQr', 'Choose photo or drag here')}</p>
                        <p className="text-xs text-slate-400 mt-1">{t("PNG, JPG, JPEG up to 5MB")}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('payout.qrProvider', 'Provider Name (Optional)')}</label>
                  <input
                    type="text"
                    value={qrProviderName}
                    onChange={e => setQrProviderName(e.target.value)}
                    placeholder={t("e.g. GPay, PhonePe, Paytm")}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            )}

            {/* Default method toggle */}
            <div className="flex items-center gap-2.5 py-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                className="w-4.5 h-4.5 border-slate-300 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isDefault" className="text-xs font-semibold text-slate-600 select-none">
                {t('payout.makeDefault', 'Set as default payout method')}
              </label>
            </div>

            {/* Verification & Submit Button */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('payout.phoneConfirm', 'Send Verification SMS Code to:')}</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="tel"
                    required
                    disabled={!!user?.phone}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={t("e.g. 9876543210")}
                    className="w-full sm:flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 transition disabled:bg-slate-100 disabled:text-slate-500 font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={sendingOtp || (activeTab === 'qr' && !qrPreview)}
                    className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold tracking-wide uppercase shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 shrink-0"
                  >
                    {sendingOtp ? t('payout.sending', 'Sending...') : t('payout.verifyAndSave', 'Verify & Save')}
                    <HiArrowRight className="w-4 h-4" />
                  </button>
                </div>
                {!user?.phone && (
                  <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1.5">
                    <HiLockClosed className="w-3.5 h-3.5" />
                    {t('payout.phoneUpdateAlert', 'Ensure this matches your phone to verify successfully')}
                  </p>
                )}
              </div>
              
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition border-0"
                >
                  {t('common.cancel', 'Cancel Edit')}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Saved Methods */}
        <div className="space-y-6">
          {/* Mobile Verification Settings Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1.5 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <HiShieldCheck className="w-5 h-5" />
              </span>
              {t('payout.phoneSettingsTitle', 'Security Settings')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t('payout.phoneSettingsDesc', 'Your mobile number is required for verifying all withdrawal and billing destination changes.')}
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-400 font-semibold uppercase">{t('payout.statusLabel', 'Status')}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {user?.phone ? t('payout.statusVerified', 'Linked & Active') : t('payout.statusNotLinked', 'Not Linked')}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-800 font-mono mt-2">
                {user?.phone 
                  ? `+91 ******${user.phone.slice(-4)}`
                  : t('payout.noPhone', 'No phone number registered')
                }
              </div>
            </div>

            <form onSubmit={handleInitiatePhoneChange} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  {t('payout.newPhoneLabel', 'New Mobile Number')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">+91</span>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder={t("Enter 10 digits")}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 transition font-semibold"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={initiatingPhoneChange}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {initiatingPhoneChange ? t('payout.updatingStatus', 'Initiating...') : t('payout.changePhoneBtn', 'Update Mobile Number')}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg">
            <h3 className="text-lg font-bold mb-1.5 flex items-center gap-2">
              <HiShieldCheck className="w-5 h-5 text-emerald-400" />
              {t('payout.savedHeader', 'Payout Destinations')}
            </h3>
            <p className="text-xs text-slate-400 mb-6">{t('payout.savedCountDesc', 'Manage default options for automated withdrawal approvals')}</p>

            <div className="space-y-3">
              {payoutMethods.length > 0 ? (
                payoutMethods.map(method => (
                  <div
                    key={method._id}
                    className={`p-4 rounded-2xl border transition-all ${
                      method.isDefault
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-slate-100 shadow-xs'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {method.type === 'bank' && <HiCreditCard className="w-5 h-5 text-emerald-400" />}
                        {method.type === 'upi' && <HiShieldCheck className="w-5 h-5 text-teal-400" />}
                        {method.type === 'qr' && <HiQrCode className="w-5 h-5 text-amber-400" />}
                        <span className="font-bold text-xs uppercase tracking-wide">
                          {method.type === 'bank' ? t('payout.bank', 'Bank') : method.type === 'upi' ? t('payout.upi', 'UPI') : t('payout.qr', 'QR')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {!method.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(method._id)}
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition"
                            title={t('payout.setDefault', 'Set as Default')}
                          >
                            <HiCheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditClick(method)}
                          className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-emerald-400 transition"
                          title={t('common.edit', 'Edit')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(method._id)}
                          className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-red-400 transition"
                          title={t('common.delete', 'Delete')}
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-xs space-y-1 font-mono text-slate-300">
                      {method.type === 'bank' && (
                        <>
                          <p className="font-semibold text-slate-100 font-sans">{method.bankDetails?.accountHolderName}</p>
                          <p>{method.bankDetails?.bankName}</p>
                          <p className="text-emerald-200">{method.bankDetails?.accountNumber}</p>
                          <p className="text-slate-400">{t("IFSC:")}{method.bankDetails?.ifscCode}</p>
                        </>
                      )}
                      {method.type === 'upi' && (
                        <p className="text-teal-200">{method.upiId}</p>
                      )}
                      {method.type === 'qr' && (
                        <div>
                          {method.providerName && <p className="font-sans font-semibold text-amber-200">{method.providerName}</p>}
                          <a href={method.qrCodeImage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:underline mt-1 font-sans">
                            <HiQrCode className="w-3.5 h-3.5" />
                            {t('payout.viewQr', 'View QR Image')}
                          </a>
                        </div>
                      )}
                    </div>

                    {method.isDefault && (
                      <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold tracking-wider uppercase font-sans">
                        <HiCheckCircle className="w-3.5 h-3.5" />
                        {t('payout.defaultBadge', 'Default')}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  <HiCreditCard className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs">{t('payout.noSaved', 'No payout methods added yet.')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 text-center animate-scaleUp">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiShieldCheck className="w-7 h-7" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">{t('payout.otpTitle', 'Verify Identity')}</h3>
            <p className="text-xs text-slate-500 mb-6 px-4">
              {t('payout.otpDesc', 'Enter the 6-digit security code sent to')} <span className="font-bold text-slate-700 font-mono">{phone}</span>
            </p>

            <div className="space-y-4">
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder={t("0 0 0 0 0 0")}
                className="w-full text-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-extrabold font-mono tracking-[0.6em] focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition border-0"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmFirebaseOtp}
                  disabled={saving || otp.length !== 6}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {saving ? t('payout.savingStatus', 'Saving...') : t('payout.confirmBtn', 'Confirm Code')}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                className="inline-block text-xs font-bold text-emerald-600 hover:underline mt-2"
              >
                {t('payout.resend', 'Resend Code')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Two-step Phone Verification and Concern modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center animate-scaleUp">
            
            {showConcernForm ? (
              <div className="space-y-4 text-left">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <HiExclamationCircle className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
                  {t('payout.concernTitle', 'Report Phone Access Issue')}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed text-center mb-4">
                  {t('payout.concernDesc', 'If you have lost access to your registered mobile number, please write a brief description below. An administrator will verify your identity manually and update your mobile settings.')}
                </p>

                <form onSubmit={handleRaiseConcern} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                      {t('payout.concernMsgLabel', 'Situation Description')}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={concernMessage}
                      onChange={e => setConcernMessage(e.target.value)}
                      placeholder={t(
                        "Explain your case here, e.g. 'I lost my old phone SIM card and want to update to my new number: 9876543210'"
                      )}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowConcernForm(false)}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition border-0"
                    >
                      {t('common.back', 'Back')}
                    </button>
                    <button
                      type="submit"
                      disabled={raisingConcern}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {raisingConcern ? t('payout.submittingStatus', 'Submitting...') : t('payout.submitConcernBtn', 'Submit Concern')}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <HiShieldCheck className="w-7 h-7" />
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {phoneStep === 'verify_old' 
                    ? t('payout.phoneStepOldTitle', 'Verify Identity (Step 1 of 2)') 
                    : t('payout.phoneStepNewTitle', 'Link New Phone (Step 2 of 2)')
                  }
                </h3>
                <p className="text-xs text-slate-500 px-4">
                  {phoneStep === 'verify_old' ? (
                    <>
                      {t('payout.phoneStepOldDesc', 'We sent a 6-digit OTP code to your registered mobile number ending in')} {' '}
                      <span className="font-bold text-slate-700 font-mono">
                        {user?.phone ? `******${user.phone.slice(-4)}` : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      {t('payout.phoneStepNewDesc', 'We sent a 6-digit verification code to your new number')} {' '}
                      <span className="font-bold text-slate-700 font-mono">
                        +91 {newPhone}
                      </span>
                    </>
                  )}
                </p>

                <div className="space-y-4 pt-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={phoneOtp}
                    onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder={t("0 0 0 0 0 0")}
                    className="w-full text-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-extrabold font-mono tracking-[0.6em] focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                  />

                  {phoneStep === 'verify_old' && (
                    <div className="text-xs">
                      <button
                        type="button"
                        onClick={() => setShowConcernForm(true)}
                        className="text-amber-600 hover:text-amber-700 font-semibold hover:underline flex items-center gap-1.5 mx-auto"
                      >
                        <HiExclamationCircle className="w-4 h-4" />
                        {t('payout.lostAccessLink', 'Lost access to your old number? Raise concern')}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPhoneModal(false)}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition border-0"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyPhoneOtp}
                      disabled={verifyingPhone || phoneOtp.length !== 6}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {verifyingPhone ? t('payout.verifyingStatus', 'Verifying...') : t('payout.confirmBtn', 'Confirm Code')}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleInitiatePhoneChange}
                    className="inline-block text-xs font-bold text-emerald-600 hover:underline mt-2"
                  >
                    {t('payout.resend', 'Resend Code')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default PayoutSettings;
