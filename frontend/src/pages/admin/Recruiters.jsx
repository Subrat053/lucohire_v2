import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, ShieldCheck, Hourglass, Ban, 
  Search, Filter, Download, MoreVertical, Eye, X, Check,
  MapPin, Calendar, Briefcase, ChevronLeft, ChevronRight, CheckCircle2, PauseCircle, Trash2, Send, Mail, ChevronDown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const statusColors = {
  Verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Suspended: 'bg-purple-50 text-purple-700 border-purple-200',
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

const RecruiterDetailPanel = ({ recruiter, onClose, onDelete, onApprove, onReject }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const user = recruiter.user || {};
  const isApproved = recruiter.isApproved;
  const status = isApproved ? 'Verified' : 'Pending';

  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sectionDecisions, setSectionDecisions] = useState({
    profilePhoto: { status: 'pending', label: 'Company Logo / Profile Photo' },
    phone: { status: 'pending', label: 'Phone Number' },
    email: { status: 'pending', label: 'Email Address' },
    companyDetails: { status: 'pending', label: 'Company Details' },
    companyWebsite: { status: 'pending', label: 'Website' }
  });
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [sendingNotify, setSendingNotify] = useState(false);
  const [customNotifyMsg, setCustomNotifyMsg] = useState('');
  const [activeRemarkSection, setActiveRemarkSection] = useState(null);
  const [tempRemarkText, setTempRemarkText] = useState('');

  useEffect(() => {
    if (user._id) fetchDetail();
  }, [user._id]);

  const fetchDetail = async () => {
    try {
      setLoadingDetail(true);
      const res = await adminAPI.getProfileReviewDetail(user._id);
      if (res.data) {
        setDetailData(res.data);
        if (res.data.sections && Array.isArray(res.data.sections)) {
          const map = { ...sectionDecisions };
          res.data.sections.forEach(sec => {
            if (map[sec.key]) {
              map[sec.key] = {
                ...map[sec.key],
                status: sec.status || 'pending',
                remarks: sec.remarks || [],
                remark: sec.remarks?.slice(-1)[0]?.text || map[sec.key].remark
              };
            }
          });
          setSectionDecisions(map);
        }
      }
    } catch (err) {
      console.error('Failed to fetch recruiter detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (secKey, targetStatus) => {
    if (targetStatus === 'rejected') {
      setActiveRemarkSection(secKey);
      setTempRemarkText(sectionDecisions[secKey]?.remark || '');
      return;
    }
    try {
      setSectionDecisions(prev => ({
        ...prev,
        [secKey]: { ...prev[secKey], status: targetStatus, remark: '' }
      }));
      await adminAPI.approveProfileSection(user._id, secKey).catch(() => {});
      toast.success('Section approved');
    } catch (err) {
      toast.error('Failed to update section status');
    }
  };

  const handleBatchStatus = async (targetStatus) => {
    const updated = { ...sectionDecisions };
    for (const key of Object.keys(updated)) {
      updated[key].status = targetStatus;
      if (targetStatus === 'approved') {
        await adminAPI.approveProfileSection(user._id, key).catch(() => {});
      } else {
        await adminAPI.rejectProfileSection(user._id, key, 'Requires update').catch(() => {});
      }
    }
    setSectionDecisions(updated);
    toast.success('All sections set to ' + targetStatus.toUpperCase());
  };

  const handleSaveRemark = async (secKey) => {
    if (!tempRemarkText.trim()) return;
    try {
      setSectionDecisions(prev => ({
        ...prev,
        [secKey]: { ...prev[secKey], status: 'rejected', remark: tempRemarkText }
      }));
      await adminAPI.rejectProfileSection(user._id, secKey, tempRemarkText).catch(() => {});
      toast.success('Remark saved for ' + sectionDecisions[secKey]?.label);
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

      await adminAPI.sendProfileCorrectionEmail(user._id, {
        sections: sectionsPayload,
        message: customNotifyMsg || 'Please review the updated verification notes on your profile.'
      });

      toast.success('Decision sent! Recruiter notified via email.', { duration: 4000 });
      setShowNotifyModal(false);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification email');
    } finally {
      setSendingNotify(false);
    }
  };

  const renderSectionControl = (secKey, content) => {
    const sec = sectionDecisions[secKey];
    if (!sec) return null;
    return (
      <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm mb-4 relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900">{sec.label}</h4>
            <div className="mt-3 text-sm text-gray-700">
              {content}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sec.status === 'approved' ? (
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">✓ Approved</span>
            ) : sec.status === 'rejected' ? (
              <button onClick={() => { setActiveRemarkSection(secKey); setTempRemarkText(sec.remark); }} className="text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-full border border-red-200 transition">✕ Rejected (Edit Remark)</button>
            ) : (
              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">Pending Review</span>
            )}
            
            <div className="flex gap-1 border-l pl-2 ml-1 border-gray-100">
              <button onClick={() => handleStatusChange(secKey, 'approved')} className="w-7 h-7 flex items-center justify-center rounded bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 text-gray-400 transition">
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleStatusChange(secKey, 'rejected')} className="w-7 h-7 flex items-center justify-center rounded bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {sec.remark && sec.status === 'rejected' && (
          <div className="mt-3 p-2 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 font-medium">
            <strong>Remark:</strong> {sec.remark}
          </div>
        )}

        {activeRemarkSection === secKey && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg animate-in slide-in-from-top-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Rejection Remark / Requirement</label>
            <textarea
              autoFocus
              className="w-full border-gray-300 rounded-md text-xs p-2 focus:ring-red-500 focus:border-red-500"
              rows="2"
              placeholder="E.g. Please upload a clearer image..."
              value={tempRemarkText}
              onChange={(e) => setTempRemarkText(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setActiveRemarkSection(null)} className="px-3 py-1 text-xs font-bold text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={() => handleSaveRemark(secKey)} className="px-3 py-1 text-xs font-bold bg-red-600 text-white rounded hover:bg-red-700">Save Remark</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const approvedCount = Object.values(sectionDecisions).filter(s => s.status === 'approved').length;
  const rejectedCount = Object.values(sectionDecisions).filter(s => s.status === 'rejected').length;
  const pendingCount = Object.values(sectionDecisions).filter(s => s.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex gap-6 overflow-x-auto custom-scrollbar">
            {['Overview', 'Company Details'].map(tab => (
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

        <div className="flex-1 overflow-y-auto p-6 bg-white flex flex-col md:flex-row gap-8">
          
          <div className="w-full md:w-64 shrink-0 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-teal-50 border-4 border-white shadow-sm flex items-center justify-center text-3xl font-black text-teal-600 mb-4 overflow-hidden relative">
                {recruiter.photo ? (
                  <img src={recruiter.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : getInitials(user.name)}
                {isApproved && (
                  <div className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 border-2 border-white">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </div>
              <h2 className="text-lg font-black text-gray-900">{user.name || 'Unknown'}</h2>
              <p className="text-xs font-bold text-gray-400 mb-2">{recruiter.companyName || 'Unknown Company'}</p>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
              <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Quick Actions</div>
              <div className="flex gap-2">
                <button onClick={() => handleBatchStatus('approved')} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition text-center">
                  Approve All ✓
                </button>
                <button onClick={() => handleBatchStatus('rejected')} className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition text-center">
                  Reject All ✕
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
              <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Status Summary</div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-emerald-50 p-1 rounded-lg border border-emerald-100">
                  <span className="block text-xs font-black text-emerald-700">{approvedCount}</span>
                  <span className="text-[8px] font-bold text-emerald-600 uppercase">Approved</span>
                </div>
                <div className="bg-rose-50 p-1 rounded-lg border border-rose-100">
                  <span className="block text-xs font-black text-rose-700">{rejectedCount}</span>
                  <span className="text-[8px] font-bold text-rose-600 uppercase">Rejected</span>
                </div>
                <div className="bg-amber-50 p-1 rounded-lg border border-amber-100">
                  <span className="block text-xs font-black text-amber-700">{pendingCount}</span>
                  <span className="text-[8px] font-bold text-amber-600 uppercase">Pending</span>
                </div>
              </div>
            </div>

          </div>

          <div className="flex-1 border-l border-gray-100 pl-0 md:pl-8">
            {activeTab === 'Overview' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-2">Contact & Basic Verification</h3>
                
                {renderSectionControl('profilePhoto', 
                  <div className="flex items-center gap-3">
                    {recruiter.photo ? <img src={recruiter.photo} className="w-12 h-12 rounded object-cover" /> : 'No photo uploaded'}
                  </div>
                )}
                
                {renderSectionControl('email', 
                  <div className="font-medium">{user.email || 'Not provided'}</div>
                )}
                
                {renderSectionControl('phone', 
                  <div className="font-medium">{user.phone || 'Not provided'}</div>
                )}
              </div>
            )}
            
            {activeTab === 'Company Details' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-2">Company Profile Verification</h3>
                
                {renderSectionControl('companyDetails', 
                  <div className="space-y-2">
                    <div><strong className="text-gray-500">Name:</strong> {recruiter.companyName || 'N/A'}</div>
                    <div><strong className="text-gray-500">Industry:</strong> {recruiter.industry || 'N/A'}</div>
                    <div><strong className="text-gray-500">Size:</strong> {recruiter.companySize || 'N/A'}</div>
                    <div><strong className="text-gray-500">HQ:</strong> {recruiter.city || 'Unknown'}, {user.country || 'India'}</div>
                  </div>
                )}

                {renderSectionControl('companyWebsite', 
                  <div>
                    {recruiter.website ? (
                      <a href={recruiter.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">{recruiter.website}</a>
                    ) : 'No website provided'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between shrink-0">
          <button 
            onClick={() => { onDelete(recruiter._id, user.name); onClose(); }}
            className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
          
          <button 
            onClick={() => setShowNotifyModal(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Finalize & Send Decision
          </button>
        </div>

        {/* Notify Modal */}
        {showNotifyModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" /> Send Decision to Recruiter
                </h3>
                <button onClick={() => setShowNotifyModal(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4"/></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-indigo-50 text-indigo-700 p-3 rounded-lg text-xs font-medium border border-indigo-100">
                  This will email the recruiter with their current verification status for each section.
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Message (Optional)</label>
                  <textarea
                    className="w-full border-gray-200 rounded-lg text-xs p-3 focus:border-indigo-500 focus:ring-indigo-500"
                    rows="3"
                    placeholder="Add a custom note to the email..."
                    value={customNotifyMsg}
                    onChange={(e) => setCustomNotifyMsg(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                <button onClick={() => setShowNotifyModal(false)} className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSendFinalDecision} disabled={sendingNotify} className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                  {sendingNotify ? <Hourglass className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingNotify ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// --- Main Component ---
export default function AdminRecruiters() {
  const [recruiters, setRecruiters] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [activeTableTab, setActiveTableTab] = useState('All');
  
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);

  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = React.useRef(null);
  const debounceRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { 
    fetchRecruiters(); 
  }, [statusFilter, activeTableTab]);

  const fetchRecruiters = async (searchOverride) => {
    try {
      setLoading(true);
      const params = { search: searchOverride !== undefined ? searchOverride : search, limit: 100 };
      
      if (activeTableTab === 'Verified') params.approved = true;
      if (activeTableTab === 'Pending') params.approved = false;
      if (statusFilter === 'approved') params.approved = true;
      else if (statusFilter === 'pending') params.approved = false;

      if (sourceFilter) params.source = sourceFilter;
      if (countryFilter) params.country = countryFilter;

      const { data } = await adminAPI.getRecruiters(params);
      setRecruiters(data.recruiters || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      toast.error('Failed to load recruiters');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setSearchDropdownOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRecruiters(val);
    }, 400);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchDropdownOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchRecruiters();
  };

  const matchingSuggestions = Array.from(new Set(
    recruiters.flatMap(r => [
      r.user?.name,
      r.user?.email,
      r.user?.phone,
      r.companyName,
      r.city
    ].filter(Boolean))
  )).filter(s => search ? s.toLowerCase().includes(search.toLowerCase()) : true).slice(0, 10);

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete recruiter "${name}"?\n\nThis will permanently delete everything associated with this recruiter.`)) {
      return;
    }
    try {
      await adminAPI.deleteRecruiter(id);
      toast.success('Recruiter deleted successfully');
      fetchRecruiters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete recruiter');
    }
  };

  // --- Process Stats ---
  const totals = stats?.totals || { total: 0, newThisWeek: 0, newLastWeek: 0, verified: 0, pending: 0, rejected: 0, suspended: 0 };
  const trendNew = calcTrend(totals.newThisWeek, totals.newLastWeek);
  
  const summaryData = [
    { name: 'Verified', value: totals.verified, color: '#10B981' },
    { name: 'Pending', value: totals.pending, color: '#F59E0B' },
    { name: 'Rejected', value: totals.rejected, color: '#EF4444' },
    { name: 'Suspended', value: totals.suspended, color: '#8B5CF6' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      {selectedRecruiter && (
        <RecruiterDetailPanel 
          recruiter={selectedRecruiter} 
          onClose={() => setSelectedRecruiter(null)}
          onDelete={handleDelete}
        />
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] tracking-tight">All Recruiters</h1>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">View and manage all recruiter profiles</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 text-xs font-bold text-gray-700 shadow-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              Real-Time Directory
            </div>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Recruiters" value={totals.total} subtext="All time" icon={Users} colorClass="text-teal-500" />
          <KPICard title="Verified" value={totals.verified} subtext="Active recruiters" icon={ShieldCheck} colorClass="text-emerald-500" />
          <KPICard title="New Recruiters" value={totals.newThisWeek} subtext="This week" icon={UserPlus} colorClass="text-blue-500" trend={trendNew} trendUp={!trendNew.includes('-')} />
          <KPICard title="Suspended" value={totals.suspended} subtext="Inactive" icon={PauseCircle} colorClass="text-purple-500" />
        </div>

        {/* Main Layout */}
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          
          {/* Left Pane (Table) */}
          <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Table Tabs */}
            <div className="flex items-center gap-6 px-6 pt-4 border-b border-gray-100 overflow-x-auto custom-scrollbar">
              {[
                `All Recruiters (${totals.total.toLocaleString()})`,
                `Verified (${totals.verified.toLocaleString()})`, 
                `Pending (${totals.pending.toLocaleString()})`
              ].map(tab => {
                const label = tab.split(' ')[0] === 'All' ? 'All' : tab.split(' ')[0];
                const active = activeTableTab === label;
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
              <div className="relative w-full sm:max-w-md" ref={searchContainerRef}>
                <form onSubmit={handleSearch} className="relative flex items-center bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all overflow-hidden">
                  <Search className="w-4 h-4 text-gray-400 ml-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by name, email, company or mobile..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setSearchDropdownOpen(true)}
                    className="w-full pl-2 pr-4 py-2 bg-transparent border-none text-xs font-medium outline-none focus:ring-0"
                  />
                  {search && (
                    <button type="button" onClick={() => { setSearch(''); fetchRecruiters(''); }} className="text-gray-400 hover:text-gray-700 px-3">×</button>
                  )}
                </form>

                {/* Smart Dropdown */}
                {searchDropdownOpen && matchingSuggestions.length > 0 && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-2.5 flex justify-between items-center backdrop-blur-sm">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                        {search ? "Matching Results" : "Suggestions"}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">Select</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto py-1">
                      {matchingSuggestions.map((suggestion, idx) => (
                        <div 
                          key={idx}
                          className="px-4 py-2 hover:bg-emerald-50/50 cursor-pointer text-xs font-bold text-gray-700 border-b border-gray-50/60 last:border-none flex items-center gap-2.5 transition-colors"
                          onClick={() => {
                            setSearch(suggestion);
                            setSearchDropdownOpen(false);
                            if (debounceRef.current) clearTimeout(debounceRef.current);
                            fetchRecruiters(suggestion);
                          }}
                        >
                          <Search className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <FilterDropdown 
                  label="All Status" 
                  value={statusFilter === 'all' ? '' : statusFilter} 
                  setValue={val => setStatusFilter(val || 'all')} 
                  options={['pending', 'approved', 'rejected']} 
                  icon={Filter}
                />
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
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Recruiter</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Company</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Email / Mobile</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Source</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recruiters.map((recruiter) => {
                      const user = recruiter.user || {};
                      const isApproved = recruiter.isApproved;
                      let status = isApproved ? 'Verified' : 'Pending';
                      if (user.approvalStatus === 'rejected') status = 'Rejected';
                      if (user.approvalStatus === 'blocked' || user.approvalStatus === 'suspended') status = 'Suspended';

                      const badgeClass = statusColors[status] || statusColors.Pending;
                      const source = user.provider || 'Organic';

                      return (
                        <tr key={recruiter._id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input type="checkbox" className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold text-xs overflow-hidden shrink-0">
                                {recruiter.photo ? <img src={recruiter.photo} alt="" className="w-full h-full object-cover"/> : getInitials(user.name)}
                              </div>
                              <div className="text-sm font-bold text-gray-900">{user.name || 'Unknown'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-gray-700">{recruiter.companyName || 'Not specified'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-700 truncate max-w-[150px]" title={user.email}>{user.email}</div>
                            <div className="text-[10px] font-medium text-gray-400">{user.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-bold text-blue-600 capitalize bg-blue-50 px-2 py-0.5 rounded">{source}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setSelectedRecruiter(recruiter)}
                                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(recruiter._id, user.name)}
                                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {recruiters.length === 0 && !loading && (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500 text-sm font-medium">
                          No recruiters found matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
              <div className="text-xs font-medium text-gray-500">
                Showing <span className="font-bold text-gray-900">{recruiters.length > 0 ? 1 : 0}</span> to <span className="font-bold text-gray-900">{recruiters.length}</span> of {totals.total.toLocaleString()} recruiters
              </div>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-xs font-bold">1</button>
                <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
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
                    setSourceFilter('');
                    setCountryFilter('');
                    fetchRecruiters();
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
                <button 
                  onClick={() => fetchRecruiters()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all mt-2"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Verification Summary Donut */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-gray-900">Account Distribution</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 shrink-0 relative">
                  {summaryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summaryData}
                          innerRadius={35}
                          outerRadius={55}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {summaryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full bg-gray-50 rounded-full flex items-center justify-center border-4 border-gray-100">
                      <span className="text-xs font-bold text-gray-400">N/A</span>
                    </div>
                  )}
                  {summaryData.length > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                      <span className="text-sm font-black text-gray-900">{totals.total}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  {summaryData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                        <span className="text-gray-700">{d.name}</span>
                      </div>
                      <span className="text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
