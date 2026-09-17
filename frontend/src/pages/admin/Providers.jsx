import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, ShieldCheck, Hourglass, Ban, FileText, 
  Search, Filter, Download, MoreVertical, Eye, X, MessageSquare, 
  MapPin, Mail, Phone, Calendar, Briefcase, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, Clock, AlertCircle, Star, Send, Award, RefreshCw, SendHorizontal, Check, AlertTriangle, Link2, Globe, Image, Building, Layers, ChevronDown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { adminAPI, unlockProfileAPI } from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const FilterDropdown = ({ label, icon: Icon, value, setValue, options, placeholder, fullWidth = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (searchTerm && !options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase())) {
          setValue(searchTerm);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm, options, setValue]);

  const allOptions = Array.from(new Set([...options, ...(value && value !== 'all' ? [value] : [])]));
  const filteredOptions = allOptions.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  const sortedFilteredOptions = [...filteredOptions].sort((a, b) => {
    if (a === value) return -1;
    if (b === value) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center text-xs bg-white border rounded-lg px-4 py-2 cursor-pointer transition whitespace-nowrap min-w-[130px] ${fullWidth ? 'w-full justify-between' : ''} ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-gray-50' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
          <span className={`truncate ${value ? "text-gray-900 font-bold capitalize" : "text-gray-700 font-bold"}`}>
            {value || label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {(value && value !== 'all') && (
            <X 
              className="w-3.5 h-3.5 text-gray-400 hover:text-red-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setValue('');
              }}
            />
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : 'text-gray-400'}`} />
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-50 top-full mt-1 ${fullWidth ? 'left-0 w-full' : 'right-0 w-48'} bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col`}>
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder={placeholder || `Search...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchTerm.trim()) {
                    setValue(searchTerm.trim());
                  } else if (sortedFilteredOptions.length > 0) {
                    setValue(sortedFilteredOptions[0]);
                  }
                  setSearchTerm('');
                  setIsOpen(false);
                }
              }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {searchTerm.trim() && !options.some(opt => opt.toLowerCase() === searchTerm.trim().toLowerCase()) && (
              <li
                className="px-3 py-2 text-xs cursor-pointer hover:bg-emerald-50 text-blue-600 font-medium border-b border-gray-50 mb-1"
                onClick={() => { setValue(searchTerm.trim()); setSearchTerm(''); setIsOpen(false); }}
              >
                Search for "{searchTerm}"
              </li>
            )}
            {sortedFilteredOptions.length > 0 ? (
              sortedFilteredOptions.map((opt, i) => (
                <li 
                  key={i}
                  className={`px-3 py-2 text-xs cursor-pointer capitalize font-medium ${
                    opt === value ? 'text-emerald-700 bg-emerald-50/50' : 'text-gray-700 hover:bg-emerald-50'
                  }`}
                  onClick={() => {
                    setValue(opt);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {opt === value ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">{opt}</span>
                  </div>
                </li>
              ))
            ) : (
              !searchTerm.trim() && <li className="px-3 py-2 text-xs text-gray-400 text-center">No match found</li>
            )}
            {value && (
              <li 
                className="px-3 py-2 text-xs text-red-700 hover:bg-red-50 cursor-pointer border-t border-gray-50 mt-1 font-medium"
                onClick={() => {
                  setValue('');
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                Clear selection
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const statusColors = {
  Verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Blocked: 'bg-purple-50 text-purple-700 border-purple-200',
};

// --- Helper Functions ---
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const calcTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const diff = ((current - previous) / previous) * 100;
  return (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
};

// --- Components ---

const KPICard = ({ title, value, subtext, icon: Icon, colorClass, trend, trendUp }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</div>
    </div>
    <div>
      <div className="text-2xl font-black text-gray-900 mb-1">{value?.toLocaleString() || 0}</div>
      <div className="flex items-center text-[10px] font-bold">
        {trend && (
          <span className={`mr-1 ${trendUp ? 'text-emerald-500' : 'text-red-700'}`}>
            {trendUp ? '↑' : '↓'} {trend.replace('+', '')}
          </span>
        )}
        <span className="text-gray-400">{subtext}</span>
      </div>
    </div>
  </div>
);

const CandidateDetailPanel = ({ candidate, onClose, onApprove, onReject }) => {
  const { saveUserSession } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [customNotifyMsg, setCustomNotifyMsg] = useState('');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [sendingNotify, setSendingNotify] = useState(false);

  // Follow-back State
  const [showFollowBackModal, setShowFollowBackModal] = useState(false);
  const [followBackQuestion, setFollowBackQuestion] = useState('');
  const [sendingFollowBack, setSendingFollowBack] = useState(false);

  const user = candidate.user || {};
  const userId = user._id || candidate._id;
  const isApproved = candidate.isApproved;

  const followBackRequest = detailData?.profile?.followBackRequest || candidate.followBackRequest || null;

  const handleSendFollowBack = async () => {
    if (!followBackQuestion.trim()) return toast.error('Please enter a clarification question');
    try {
      setSendingFollowBack(true);
      await adminAPI.requestFollowBack(userId, { question: followBackQuestion });
      toast.success('Follow-back request sent! Candidate notified via email & dashboard.');
      setShowFollowBackModal(false);
      setFollowBackQuestion('');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send follow-back request');
    } finally {
      setSendingFollowBack(false);
    }
  };

  // Section Decision State
  const [sectionDecisions, setSectionDecisions] = useState({
    overview: { status: 'pending', remark: '', label: 'Basic Info & Bio' },
    resume: { status: 'pending', remark: '', label: 'Resume / CV' },
    skills: { status: 'pending', remark: '', label: 'Skills & Experience' },
    education: { status: 'pending', remark: '', label: 'Education Credentials' },
  });

  const [activeRemarkSection, setActiveRemarkSection] = useState(null);
  const [tempRemarkText, setTempRemarkText] = useState('');

  // Payments tab state (from remote)
  const [candidatePayments, setCandidatePayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const hasResume = candidate.uploadedAssets?.some(a => a.assetType === 'document');
  const status = isApproved ? 'Verified' : 'Pending';

  // Fetch full review details from backend if available
  useEffect(() => {
    if (userId) fetchDetail();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'Payments & Subscriptions' && user._id) {
      const fetchUserPayments = async () => {
        setPaymentsLoading(true);
        try {
          const res = await adminAPI.getPayments({ user: user._id });
          setCandidatePayments(res.data?.payments || res.data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setPaymentsLoading(false);
        }
      };
      fetchUserPayments();
    }
  }, [activeTab, user._id]);

  const fetchDetail = async () => {
    try {
      setLoadingDetail(true);
      const res = await adminAPI.getProfileReviewDetail(userId);
      if (res.data) {
        setDetailData(res.data);
        if (res.data.sections && Array.isArray(res.data.sections)) {
          const map = { ...sectionDecisions };
          res.data.sections.forEach(sec => {
            const key = sec.key === 'businessDetails' || sec.key === 'profilePhoto' ? 'overview'
              : sec.key === 'resume' ? 'resume'
              : sec.key === 'skills' ? 'skills'
              : sec.key === 'education' ? 'education'
              : sec.key;
            if (map[key]) {
              map[key] = {
                ...map[key],
                status: sec.status || 'pending',
                remarks: sec.remarks || [],
                remark: sec.remarks?.slice(-1)[0]?.text || map[key].remark
              };
            }
          });
          setSectionDecisions(map);
        }
      }
    } catch (err) {
      console.warn('Using candidate prop data:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const updateSectionStatus = async (secKey, statusVal) => {
    try {
      setSectionDecisions(prev => ({
        ...prev,
        [secKey]: { ...prev[secKey], status: statusVal }
      }));
      if (statusVal === 'approved') {
        await adminAPI.approveProfileSection(userId, secKey).catch(() => {});
        toast.success(`${sectionDecisions[secKey]?.label || secKey} Approved ✓`);
      } else if (statusVal === 'rejected') {
        const reason = sectionDecisions[secKey]?.remark || 'Requires update by candidate';
        await adminAPI.rejectProfileSection(userId, secKey, reason).catch(() => {});
        toast.error(`${sectionDecisions[secKey]?.label || secKey} Rejected ✕`);
      }
    } catch (err) {
      toast.error('Failed to update section status');
    }
  };

  const handleBatchStatus = async (targetStatus) => {
    const updated = { ...sectionDecisions };
    for (const key of Object.keys(updated)) {
      updated[key].status = targetStatus;
      if (targetStatus === 'approved') {
        await adminAPI.approveProfileSection(userId, key).catch(() => {});
      } else {
        await adminAPI.rejectProfileSection(userId, key, 'Requires update').catch(() => {});
      }
    }
    setSectionDecisions(updated);
    toast.success(`All sections set to ${targetStatus.toUpperCase()}!`);
  };

  const handleSaveRemark = async (secKey) => {
    if (!tempRemarkText.trim()) return;
    try {
      setSectionDecisions(prev => ({
        ...prev,
        [secKey]: { ...prev[secKey], remark: tempRemarkText }
      }));
      await adminAPI.addSectionRemark(userId, secKey, tempRemarkText).catch(() => {});
      toast.success(`Remark saved for ${sectionDecisions[secKey]?.label || secKey}`);
      setActiveRemarkSection(null);
      setTempRemarkText('');
    } catch (err) {
      toast.error('Failed to save remark');
    }
  };

  const handleSendFinalDecision = async () => {
    try {
      setSendingNotify(true);
      const sectionsPayload = Object.entries(sectionDecisions).map(([key, val]) => ({
        key,
        label: val.label,
        status: val.status,
        reason: val.status === 'rejected' ? (val.remark || 'Requires update') : ''
      }));
      await adminAPI.sendProfileCorrectionEmail(userId, {
        sections: sectionsPayload,
        message: customNotifyMsg || 'Please review the updated verification notes on your profile.'
      });
      const hasRejections = Object.values(sectionDecisions).some(s => s.status === 'rejected');
      if (!hasRejections && Object.values(sectionDecisions).every(s => s.status === 'approved')) {
        await onApprove(candidate, true);
      }
      toast.success('Decision sent! Candidate notified via email & dashboard alert.', { duration: 4000 });
      setShowNotifyModal(false);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification email');
    } finally {
      setSendingNotify(false);
    }
  };

  const approvedCount = Object.values(sectionDecisions).filter(s => s.status === 'approved').length;
  const rejectedCount = Object.values(sectionDecisions).filter(s => s.status === 'rejected').length;
  const pendingCount = Object.values(sectionDecisions).filter(s => s.status === 'pending').length;

  const uploadedAssets = candidate.uploadedAssets || detailData?.profile?.uploadedAssets || [];
  const documentAssets = uploadedAssets.filter(a => a.assetType === 'document' || a.assetType === 'resume' || a.fileUrl);
  const latestResumeAsset = documentAssets.length > 0 ? documentAssets[documentAssets.length - 1] : null;
  const resumeUrl = latestResumeAsset?.fileUrl || candidate.resumeUrl || candidate.resume || detailData?.profile?.resumeUrl || detailData?.profile?.resume || detailData?.user?.resumeUrl || '';
  const resumeFileName = latestResumeAsset?.originalName || (resumeUrl ? resumeUrl.split('/').pop().split('?')[0] : 'Candidate_Resume.pdf');
  const resumeUploadDate = latestResumeAsset?.createdAt || candidate.updatedAt || candidate.createdAt;
  const skillsList = candidate.skills || detailData?.profile?.skills || [];
  const specialities = candidate.specialities || detailData?.profile?.specialities || [];
  const previousExperience = candidate.previousExperience || detailData?.profile?.previousExperience || [];
  const educationList = candidate.education || detailData?.profile?.education || [];
  const activityLogs = detailData?.activityLog || candidate.activityLogs || [];
  const portfolioLinks = candidate.portfolioLinks || detailData?.profile?.portfolioLinks || [];
  const projectsList = candidate.projects || detailData?.profile?.projects || [];
  const description = candidate.description || detailData?.profile?.description || '';
  const currentCtc = candidate.currentCtc || detailData?.profile?.currentCtc || '';
  const expectedCtc = candidate.expectedCtc || detailData?.profile?.expectedCtc || '';
  const languagesList = candidate.languages || detailData?.profile?.languages || [];

  const renderSectionControl = (secKey) => {
    const sec = sectionDecisions[secKey] || { status: 'pending', remark: '', label: secKey };
    const isEditingRemark = activeRemarkSection === secKey;
    return (
      <div className="mb-5 bg-gray-50/90 border border-gray-200 rounded-xl p-3.5 shadow-2xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-800">{sec.label}:</span>
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
              sec.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : sec.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {sec.status === 'approved' && 'Approved ✓'}
              {sec.status === 'rejected' && 'Rejected ✕'}
              {sec.status === 'pending' && 'Pending Review ⏳'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => updateSectionStatus(secKey, 'approved')} className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs ${sec.status === 'approved' ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
            <button onClick={() => { updateSectionStatus(secKey, 'rejected'); if (!sec.remark) setActiveRemarkSection(secKey); }} className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs ${sec.status === 'rejected' ? 'bg-rose-600 text-white ring-2 ring-rose-300' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}>
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button onClick={() => { setActiveRemarkSection(isEditingRemark ? null : secKey); setTempRemarkText(sec.remark || ''); }} className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              {sec.remark ? 'Edit Remark' : '+ Remark'}
            </button>
          </div>
        </div>
        {sec.remark && !isEditingRemark && (
          <div className="text-xs bg-amber-50/90 border border-amber-200 p-2 rounded-lg text-amber-900 font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" /><span><strong className="text-amber-800">Remark:</strong> {sec.remark}</span></div>
            <button onClick={() => { setActiveRemarkSection(secKey); setTempRemarkText(sec.remark); }} className="text-[10px] text-amber-700 underline font-bold hover:text-amber-900">Edit</button>
          </div>
        )}
        {isEditingRemark && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <input type="text" value={tempRemarkText} onChange={(e) => setTempRemarkText(e.target.value)} placeholder={`Enter remark for ${sec.label}...`} className="flex-1 text-xs p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white" />
            <button onClick={() => handleSaveRemark(secKey)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition">Save Remark</button>
            <button onClick={() => setActiveRemarkSection(null)} className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">Cancel</button>
          </div>
        )}
      </div>
    );
  };


  const handleDirectImpersonate = async (targetPath = '/provider/my-plan') => {
    if (!user.email) return toast.error('User email not available');
    try {
      const res = await unlockProfileAPI.directUnlock({ email: user.email });
      const userData = res.data.data;
      const impersonateToken = res.data.token;

      const currentToken = localStorage.getItem("authToken");
      const currentUser = JSON.parse(localStorage.getItem("authUser") || '{}');
      if (currentToken) {
        localStorage.setItem("impersonatorToken", currentToken);
        localStorage.setItem("impersonatorRole", currentUser.activeRole || 'admin');
        localStorage.setItem("impersonatorRestriction", "payment");
      }

      saveUserSession({ token: impersonateToken, user: userData });
      toast.success(`Opening ${userData.name || userData.email}'s details...`);
      window.location.href = targetPath;
    } catch (error) {
      console.error(error);
      toast.error('Failed to open provider plan details');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Tabs Navigation */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex gap-6 overflow-x-auto custom-scrollbar">
            {['Overview', 'Payments & Subscriptions', 'Resume', 'Skills & Experience', 'Education', 'Activity Log'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap text-sm font-bold pb-4 -mb-4 border-b-2 transition-all ${
                  activeTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white flex flex-col md:flex-row gap-8">
          
          {/* Left Sidebar (Profile Summary & Contact Details) */}
          <div className="w-full md:w-64 shrink-0 space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-50 border-4 border-white shadow-sm flex items-center justify-center text-2xl font-black text-indigo-600 mb-3 overflow-hidden relative">
                {candidate.photo ? (
                  <img src={candidate.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : getInitials(user.name)}
                {isApproved && (
                  <div className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 border-2 border-white">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </div>
              <h2 className="text-base font-black text-gray-900">{user.name || 'Unknown'}</h2>
              <p className="text-xs font-bold text-gray-400 mb-1">ID: {user._id?.substring(0, 8).toUpperCase()}</p>
              <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                <MapPin className="w-3 h-3 text-emerald-500" />
                {candidate.city || 'Unknown'}, {user.country || 'India'}
              </div>
            </div>

            {/* Contact Details Card */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2.5">
              <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Contact Info</div>
              
              <div className="flex items-center gap-2.5 text-xs">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <span className="block text-gray-800 font-bold truncate" title={user.email}>{user.email || 'No email'}</span>
                  <span className="text-[10px] text-emerald-600 font-medium">✓ Verified Mail</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs pt-2 border-t border-gray-100">
                <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="block text-gray-800 font-bold">{user.phone || 'No phone'}</span>
                  <span className="text-[10px] text-gray-400 font-medium">Primary Mobile</span>
                </div>
              </div>
            </div>

            {/* Salary Expectations Card */}
            {(expectedCtc || currentCtc) && (
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 space-y-1 text-xs">
                <div className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">CTC & Salary</div>
                {expectedCtc && <div><span className="text-gray-500">Expected:</span> <strong className="text-indigo-900">{expectedCtc}</strong></div>}
                {currentCtc && <div><span className="text-gray-500">Current:</span> <strong className="text-gray-800">{currentCtc}</strong></div>}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
              <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Quick Actions</div>
              <div className="flex gap-2">
                <button onClick={() => handleBatchStatus('approved')} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition text-center">Approve All ✓</button>
                <button onClick={() => handleBatchStatus('rejected')} className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition text-center">Reject All ✕</button>
              </div>
              <button onClick={() => handleDirectImpersonate('/provider/my-plan')} className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> View Plan & Payments
              </button>
              <button onClick={() => handleDirectImpersonate('/provider/profile')} className="w-full py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> View Full Profile
              </button>
            </div>

            {/* Verification Summary Counts */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
              <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Status Summary</div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-emerald-50 p-1 rounded-lg border border-emerald-100"><span className="block text-xs font-black text-emerald-700">{approvedCount}</span><span className="text-[8px] font-bold text-emerald-600 uppercase">Approved</span></div>
                <div className="bg-rose-50 p-1 rounded-lg border border-rose-100"><span className="block text-xs font-black text-rose-700">{rejectedCount}</span><span className="text-[8px] font-bold text-rose-600 uppercase">Rejected</span></div>
                <div className="bg-amber-50 p-1 rounded-lg border border-amber-100"><span className="block text-xs font-black text-amber-700">{pendingCount}</span><span className="text-[8px] font-bold text-amber-600 uppercase">Pending</span></div>
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 border-l border-gray-100 pl-0 md:pl-8 space-y-6">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'Overview' && (
              <div className="space-y-6">
                {renderSectionControl('overview')}

                {/* Follow-back Status Banner */}
                {followBackRequest && (
                  <div className={`p-4 rounded-xl border text-xs space-y-2 shadow-2xs ${
                    followBackRequest.status === 'responded' 
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        Follow-back Clarification Status
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        followBackRequest.status === 'responded' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {followBackRequest.status === 'responded' ? 'Candidate Replied ✓' : 'Clarification Pending ⏳'}
                      </span>
                    </div>
                    <p><strong>Admin Query ({followBackRequest.requestedBy}):</strong> "{followBackRequest.question}"</p>
                    {followBackRequest.answer && (
                      <div className="pt-2 border-t border-emerald-200/80 space-y-1">
                        <p><strong className="text-emerald-800">Candidate Response:</strong> "{followBackRequest.answer}"</p>
                        {followBackRequest.attachmentUrl && (
                          <a href={followBackRequest.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline text-[11px] inline-block">
                            View Attached Proof ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Candidate Bio / Description */}
                {description && (
                  <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs">
                    <h4 className="font-black text-indigo-950 uppercase tracking-wider mb-1">About / Bio</h4>
                    <p className="text-gray-700 leading-relaxed font-medium">{description}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">Candidate Key Details</h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs bg-white p-4 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-gray-400 font-semibold block mb-0.5">Current Title / Headline</span>
                      <span className="font-bold text-gray-800">{candidate.headline || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block mb-0.5">Total Experience</span>
                      <span className="font-bold text-gray-800">{candidate.experience || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block mb-0.5">Current Location</span>
                      <span className="font-bold text-gray-800">{candidate.city || 'Unknown'}, {user.country || 'India'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block mb-0.5">Registration Source</span>
                      <span className="font-bold text-gray-800 capitalize">{user.provider || 'Organic'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block mb-0.5">Notice Period</span>
                      <span className="font-bold text-gray-800">{candidate.noticePeriod || 'Immediate'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block mb-0.5">Languages</span>
                      <span className="font-bold text-gray-800">{languagesList.join(', ') || 'English, Hindi'}</span>
                    </div>
                  </div>
                </div>

                {/* Portfolio Links Grid */}
                {portfolioLinks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                      Portfolio & Social Links
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {portfolioLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:border-indigo-300 transition group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-gray-900 block group-hover:text-indigo-600 transition capitalize">
                                {link.platform || 'Portfolio'}
                              </span>
                              <span className="text-[10px] text-gray-400 truncate block max-w-[180px]">{link.url}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-indigo-600 font-bold group-hover:underline">Open ↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured Projects */}
                {projectsList.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">Featured Projects</h3>
                    <div className="space-y-3">
                      {projectsList.map((proj, i) => (
                        <div key={i} className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-black text-gray-900">{proj.name || 'Project'}</h4>
                            {proj.link && (
                              <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 font-bold hover:underline">
                                View Live ↗
                              </a>
                            )}
                          </div>
                          {proj.description && <p className="text-xs text-gray-700">{proj.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RESUME TAB (Supports newest uploaded resume detection & preview) */}
            {activeTab === 'Resume' && (
              <div className="space-y-6">
                {renderSectionControl('resume')}

                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">Most Recently Uploaded Resume</h3>
                  {resumeUrl ? (
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-gray-900">{resumeFileName}</h4>
                            <p className="text-[11px] text-gray-400 font-medium">
                              Latest Upload: {formatDate(resumeUploadDate)}
                            </p>
                          </div>
                        </div>

                        <a
                          href={resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition"
                        >
                          <Download className="w-3.5 h-3.5" /> Download / View PDF
                        </a>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(resumeUrl)}&embedded=true`}
                          className="w-full h-[340px] rounded-lg border border-gray-300 bg-white"
                          title="Resume Preview"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 font-medium text-xs">
                      No resume uploaded yet for this candidate.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SKILLS & EXPERIENCE TAB */}
            {activeTab === 'Skills & Experience' && (
              <div className="space-y-6">
                {renderSectionControl('skills')}

                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">Primary Skills</h3>
                  {skillsList.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skillsList.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium">No skills explicitly added.</p>
                  )}
                </div>

                {specialities.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">Specialities</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {specialities.map((spec, i) => (
                        <div key={i} className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800">{spec.name || spec.specialityId}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 capitalize">
                            {spec.skillLevel || 'skilled'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">Work History</h3>
                  {previousExperience.length > 0 ? (
                    <div className="space-y-3">
                      {previousExperience.map((exp, i) => (
                        <div key={i} className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-black text-gray-900">{exp.role || 'Role'}</span>
                            <span className="text-[10px] font-bold text-gray-400">{exp.duration || 'Duration'}</span>
                          </div>
                          <p className="text-xs font-bold text-indigo-600">{exp.company}</p>
                          {exp.description && <p className="text-xs text-gray-500 mt-1">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium">No previous work history logged.</p>
                  )}
                </div>

                {/* PAYMENTS TAB */}
                {activeTab === 'Payments & Subscriptions' && (
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-gray-900">Payment & Subscription Transactions</h3>
                      <button onClick={() => handleDirectImpersonate('/provider/my-plan')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition">Open Plan Dashboard ↗</button>
                    </div>
                    {paymentsLoading ? (
                      <div className="py-12 text-center text-gray-400 text-sm">Loading transactions...</div>
                    ) : candidatePayments.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">No payments found for this user.</div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-100 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-100"><th className="p-3">Date</th><th className="p-3">Item / Plan</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Transaction ID</th></tr></thead>
                          <tbody className="divide-y divide-gray-50">
                            {candidatePayments.map(p => (
                              <tr key={p._id} className="hover:bg-gray-50/50">
                                <td className="p-3 font-medium text-gray-700">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="p-3 font-bold text-gray-900">{p.plan?.name || p.type?.replace('_', ' ').toUpperCase() || 'Subscription'}</td>
                                <td className="p-3 font-bold text-gray-800">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                                <td className="p-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${p.status === 'completed' || p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : p.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{p.status || 'Completed'}</span></td>
                                <td className="p-3 text-right font-mono text-gray-400">{p.transactionId || p.stripePaymentIntentId || p._id?.substring(0, 10)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* EDUCATION TAB */}
                {activeTab === 'Education' && (
                  <div className="space-y-6">
                    {renderSectionControl('education')}
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">Educational Qualifications</h3>
                      {educationList.length > 0 ? (
                        <div className="space-y-3">
                          {educationList.map((edu, i) => (
                            <div key={i} className="p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-black text-gray-900">{edu.degree || 'Degree'}</h4>
                                <p className="text-xs font-bold text-gray-500 mt-0.5">{edu.institution || 'Institution'}</p>
                                {edu.grade && <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 inline-block">Grade: {edu.grade}</span>}
                              </div>
                              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-lg">{edu.year || 'Year'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-500 font-medium">No educational qualification entries provided.</div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ACTIVITY LOG TAB */}
            {activeTab === 'Activity Log' && (
              <div className="space-y-6">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-4">Review Timeline</h3>
                {activityLogs.length > 0 ? (
                  <div className="relative border-l-2 border-gray-200 ml-4 space-y-5">
                    {activityLogs.map((log, i) => (
                      <div key={i} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                        </div>
                        <p className="text-xs font-bold text-gray-900">{log.action?.toUpperCase() || 'ACTION'}</p>
                        <p className="text-xs text-gray-700 mt-0.5">{log.remark || log.details}</p>
                        <span className="text-[10px] text-gray-400 font-medium mt-1 block">{formatDate(log.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-500 font-medium">
                    No activity logs recorded yet.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700">Decision:</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">{approvedCount} Approved</span>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">{rejectedCount} Rejected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFollowBackModal(true)}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-amber-600" />
              Request Follow-back 💬
            </button>

            <button 
              onClick={() => setShowNotifyModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Review Decision & Notify Candidate
            </button>

            {!isApproved && (
              <button 
                onClick={() => { onApprove(candidate, true); onClose(); }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Verify Profile
              </button>
            )}

            <button 
              onClick={() => { onReject(candidate); onClose(); }}
              className="px-4 py-2.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" /> Block
            </button>
          </div>
        </div>

      </div>

      {/* NOTIFY CONFIRMATION MODAL */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                Send Section Review Decision to Candidate
              </h3>
              <button onClick={() => setShowNotifyModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              This will send an official email notification to <strong className="text-gray-900">{user.email}</strong> detailing approved sections and feedback/remarks for rejected sections.
            </p>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <div className="font-bold text-gray-700 mb-1">Section Decisions:</div>
              {Object.entries(sectionDecisions).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-gray-700">{v.label}</span>
                  <span className={`font-bold capitalize ${
                    v.status === 'approved' ? 'text-emerald-600' : v.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {v.status} {v.remark ? `("${v.remark}")` : ''}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Additional Custom Note for Email (Optional)</label>
              <textarea
                rows="3"
                value={customNotifyMsg}
                onChange={(e) => setCustomNotifyMsg(e.target.value)}
                placeholder="Enter any additional guidance or instructions for the candidate..."
                className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowNotifyModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={sendingNotify}
                onClick={handleSendFinalDecision}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2"
              >
                {sendingNotify ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Confirm & Send Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST FOLLOW-BACK MODAL */}
      {showFollowBackModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                Request Follow-back / Clarification
              </h3>
              <button onClick={() => setShowFollowBackModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              Send a direct follow-up question or clarification request to <strong className="text-gray-900">{user.name || user.email}</strong>. Candidate will be notified via email and a prompt will appear on their profile dashboard.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 block">Quick Suggestions:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Please re-upload a clearer PDF copy of your resume.',
                  'Please verify your graduation year and degree certificate.',
                  'Please add live links or proof for your listed projects.',
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFollowBackQuestion(tmpl)}
                    className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition"
                  >
                    + {tmpl.substring(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Clarification Question / Prompt *</label>
              <textarea
                rows="4"
                value={followBackQuestion}
                onChange={(e) => setFollowBackQuestion(e.target.value)}
                placeholder="e.g. Please upload your latest resume with updated experience details..."
                className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowFollowBackModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={sendingFollowBack}
                onClick={handleSendFollowBack}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2"
              >
                {sendingFollowBack ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send Follow-back Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- Main Component ---
export default function AdminProviders() {
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [joinedDateFilter, setJoinedDateFilter] = useState('');
  const [activeTableTab, setActiveTableTab] = useState('All');
  
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => { 
    fetchProviders(); 
  }, [statusFilter, activeTableTab]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const params = { search, limit: 50 };
      
      if (activeTableTab === 'Pending') params.approved = false;
      if (activeTableTab === 'Verified') params.approved = true;
      if (statusFilter === 'approved') params.approved = true;
      else if (statusFilter === 'pending') params.approved = false;
      
      if (levelFilter) params.level = levelFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (countryFilter) params.country = countryFilter;
      if (skillFilter) params.skills = skillFilter;
      if (joinedDateFilter) params.joinedDate = joinedDateFilter;

      const { data } = await adminAPI.getProviders(params);
      setProviders(data.providers || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProviders();
  };

  const getUserIdForApproval = (item) => {
    if (item?.user?._id) return item.user._id;
    if (typeof item?.user === 'string') return item.user;
    return null;
  };

  const handleApprove = async (provider, approve) => {
    const userId = getUserIdForApproval(provider);
    if (!userId) return toast.error('User ID missing.');
    try {
      if (approve) {
        await adminAPI.approveUser(userId);
        toast.success('User verified successfully');
      } else {
        await adminAPI.rejectUser(userId, 'Rejected by admin');
        toast.success('User rejected');
      }
      fetchProviders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  // --- Process Stats ---
  const totals = stats?.totals || { total: 0, newThisWeek: 0, newLastWeek: 0, verified: 0, pending: 0, rejected: 0, withResume: 0 };
  const trendNew = calcTrend(totals.newThisWeek, totals.newLastWeek);
  
  const summaryData = [
    { name: 'Verified', value: totals.verified, color: '#10B981' },
    { name: 'Pending', value: totals.pending, color: '#F59E0B' },
    { name: 'Rejected', value: totals.rejected, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const sourcesData = (stats?.sources || []).map(s => ({
    name: (s._id || 'Organic').charAt(0).toUpperCase() + (s._id || 'Organic').slice(1),
    value: s.count,
    percentage: totals.total > 0 ? ((s.count / totals.total) * 100).toFixed(1) + '%' : '0%'
  }));

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">Candidate Management</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">View, verify and manage all candidate accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 text-xs font-bold text-gray-700 shadow-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              Dynamic Real-Time Data
            </div>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard title="Total Candidates" value={totals.total} subtext="All time" icon={Users} colorClass="text-emerald-500" />
          <KPICard title="New This Week" value={totals.newThisWeek} subtext="vs last 7 days" icon={UserPlus} colorClass="text-indigo-500" trend={trendNew} trendUp={!trendNew.includes('-')} />
          <KPICard title="Verified Candidates" value={totals.verified} subtext="All time" icon={ShieldCheck} colorClass="text-emerald-500" />
          <KPICard title="Pending Verification" value={totals.pending} subtext="Requires review" icon={Hourglass} colorClass="text-amber-500" />
          <KPICard title="Rejected / Blocked" value={totals.rejected} subtext="Policy violation" icon={Ban} colorClass="text-red-700" />
          <KPICard title="Active Resumes" value={totals.withResume} subtext="Active & visible" icon={FileText} colorClass="text-blue-500" />
        </div>

        {/* Main Layout */}
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          
          {/* Left Pane (Table) */}
          <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Table Tabs */}
            <div className="flex items-center gap-6 px-6 pt-4 border-b border-gray-100 overflow-x-auto custom-scrollbar">
              {[
                `All Candidates (${totals.total.toLocaleString()})`, 
                `Pending (${totals.pending.toLocaleString()})`, 
                `Verified (${totals.verified.toLocaleString()})`, 
                `Rejected (${totals.rejected.toLocaleString()})`
              ].map(tab => {
                const label = tab.split(' ')[0];
                const active = activeTableTab === label || (label === 'All' && activeTableTab === 'All');
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTableTab(label)}
                    className={`whitespace-nowrap text-xs font-bold pb-3 border-b-2 transition-all ${
                      active ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>

            {/* Table Search & Export Bar */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-50 bg-gray-50/30">
              <form onSubmit={handleSearch} className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, skills or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </form>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                  <Filter className="w-3.5 h-3.5" /> Filters
                </button>
                <button className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            </div>

            {/* Table Data */}
            <div className="overflow-x-auto custom-scrollbar flex-1 relative min-h-[400px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 w-10">
                        <input type="checkbox" className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Candidate</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Contact</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Location</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Skills</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Source</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Joined On</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {providers.map((provider) => {
                      const user = provider.user || {};
                      const isApproved = provider.isApproved;
                      const status = isApproved ? 'Verified' : 'Pending';
                      const badgeClass = statusColors[status] || statusColors.Pending;
                      
                      const source = user.provider || 'Organic';

                      // Handle skills array/string securely
                      let skills = [];
                      if (Array.isArray(provider.skills) && provider.skills.length > 0) {
                        skills = provider.skills;
                      } else if (typeof provider.skills === 'string' && provider.skills.trim()) {
                        skills = provider.skills.split(',').map(s=>s.trim()).filter(Boolean);
                      }
                      const displaySkills = skills.slice(0, 3);
                      const extraSkills = skills.length - 3;

                      return (
                        <tr key={provider._id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input type="checkbox" className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs overflow-hidden shrink-0">
                                {provider.photo ? <img src={provider.photo} alt="" className="w-full h-full object-cover"/> : getInitials(user.name)}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-900">{user.name || 'Unknown'}</div>
                                <div className="text-[10px] font-medium text-gray-400">CND{user._id?.substring(0,6).toUpperCase()}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-700 truncate max-w-[150px]" title={user.email}>{user.email}</div>
                            <div className="text-[10px] font-medium text-gray-400">{user.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                              <span className="text-sm">🇮🇳</span> 
                              {provider.city || 'Unknown'}, {user.country || 'India'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap w-48">
                              {displaySkills.length > 0 ? displaySkills.map((s, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold rounded">{s}</span>
                              )) : <span className="text-xs text-gray-400 italic">No skills listed</span>}
                              {extraSkills > 0 && (
                                <span className="px-2 py-1 bg-gray-50 border border-gray-200 text-gray-500 text-[10px] font-bold rounded">+{extraSkills}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-bold text-blue-600 capitalize">{source}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-gray-700">{formatDate(user.createdAt || provider.createdAt)}</div>
                            <div className="text-[10px] font-medium text-gray-400">{formatTime(user.createdAt || provider.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setSelectedProvider(provider)}
                                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {providers.length === 0 && !loading && (
                      <tr>
                        <td colSpan="9" className="px-6 py-12 text-center text-gray-500 text-sm font-medium">
                          No candidates found matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="text-xs font-medium text-gray-500">
                Showing <span className="font-bold text-gray-900">{providers.length > 0 ? 1 : 0}</span> to <span className="font-bold text-gray-900">{providers.length}</span> of {totals.total.toLocaleString()} candidates
              </div>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-6">
            
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900">Filters</h3>
                <button 
                  onClick={() => {
                    setStatusFilter('');
                    setLevelFilter('');
                    setSourceFilter('');
                    setCountryFilter('');
                    setSkillFilter('');
                    setJoinedDateFilter('');
                    fetchProviders();
                  }}
                  className="text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Status</label>
                  <FilterDropdown
                    fullWidth
                    label="All Status"
                    value={statusFilter === 'all' ? '' : statusFilter}
                    setValue={val => setStatusFilter(val || 'all')}
                    options={['pending', 'approved', 'rejected']}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Verification Level</label>
                  <FilterDropdown
                    fullWidth
                    label="All Levels"
                    value={levelFilter}
                    setValue={setLevelFilter}
                    options={['tier 1', 'tier 2', 'tier 3']}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Source</label>
                  <FilterDropdown
                    fullWidth
                    label="All Sources"
                    value={sourceFilter}
                    setValue={setSourceFilter}
                    options={['organic', 'referral', 'campaign']}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Country</label>
                  <FilterDropdown
                    fullWidth
                    label="All Countries"
                    value={countryFilter}
                    setValue={setCountryFilter}
                    options={['india', 'united states', 'united kingdom']}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Skills</label>
                  <FilterDropdown
                    fullWidth
                    label="Select skills"
                    value={skillFilter}
                    setValue={setSkillFilter}
                    options={['react', 'node', 'python', 'java']}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Joined Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={joinedDateFilter}
                      onChange={(e) => setJoinedDateFilter(e.target.value)}
                      className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>
                <button 
                  onClick={() => fetchProviders()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all mt-2"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Candidate Summary Donut */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-gray-900">Candidate Summary</h3>
                <button className="text-[11px] font-bold text-emerald-600 hover:underline">View Report</button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 shrink-0 relative">
                  {summaryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summaryData}
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {summaryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full rounded-full border-[15px] border-gray-100"></div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-gray-900">{totals.total.toLocaleString()}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {summaryData.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                        {item.name}
                      </div>
                      <div className="font-black text-gray-900">{item.value.toLocaleString()}</div>
                    </div>
                  ))}
                  {summaryData.length === 0 && (
                    <div className="text-[10px] text-gray-400 italic">No candidates yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Sources Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900">Top Sources</h3>
                <button className="text-[11px] font-bold text-emerald-600 hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {sourcesData.length > 0 ? sourcesData.map((item, idx) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <div className="font-bold text-gray-700 flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-blue-50 text-blue-500 flex items-center justify-center">
                          {idx === 0 ? <MapPin className="w-2.5 h-2.5"/> : <Briefcase className="w-2.5 h-2.5"/>}
                        </div>
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">{item.value.toLocaleString()}</span>
                        <span className="text-gray-400 font-medium w-10 text-right">({item.percentage})</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: item.percentage }}></div>
                    </div>
                  </div>
                )) : (
                  <div className="text-xs text-gray-400 italic text-center py-4">No source data available</div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Candidate Details Modal */}
      {selectedProvider && (
        <CandidateDetailPanel 
          candidate={selectedProvider} 
          onClose={() => setSelectedProvider(null)}
          onApprove={handleApprove}
          onReject={(p) => handleApprove(p, false)}
        />
      )}
    </div>
  );
}
