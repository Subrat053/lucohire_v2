import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HiSearch, HiBan, HiCheckCircle, HiChevronLeft, HiChevronRight, HiTrash, HiEye, HiX, HiUpload, HiDownload, HiInformationCircle } from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toAbsoluteMediaUrl } from '../../utils/media';
import toast from 'react-hot-toast';
import { ChevronDown, X, Check } from 'lucide-react';

const FilterDropdown = ({ label, icon: Icon, value, setValue, options, placeholder, fullWidth = false, allowCustom = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (allowCustom && searchTerm && !options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase())) {
          setValue(searchTerm);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm, options, setValue, allowCustom]);

  const allOptions = Array.from(new Set([...options, ...(value && value !== 'all' ? [value] : [])]));
  const filteredOptions = allOptions.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  const sortedFilteredOptions = [...filteredOptions].sort((a, b) => {
    if (a === value) return -1;
    if (b === value) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'w-full sm:w-auto min-w-[150px]'}`} ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center text-sm font-medium bg-white border rounded-xl px-4 py-2.5 cursor-pointer transition whitespace-nowrap ${fullWidth ? 'w-full justify-between' : 'justify-between'} ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm' : 'border-gray-200 hover:bg-gray-50/50 text-gray-700'}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon className="w-4 h-4 shrink-0 text-gray-400" />}
          <span className={`truncate ${value && value !== label ? "text-gray-900 capitalize" : "text-gray-700"}`}>
            {(value === 'all' || value === '') ? label : value}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {(value && value !== 'all' && value !== label && value !== '') && (
            <X 
              className="w-4 h-4 text-gray-400 hover:text-red-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setValue('');
              }}
            />
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`} />
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-50 top-full mt-2 left-0 w-full min-w-[160px] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden flex flex-col`}>
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-sm font-medium border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={placeholder || `Search...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (allowCustom && searchTerm.trim()) {
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
          <ul className="max-h-60 overflow-y-auto py-1">
            {allowCustom && searchTerm.trim() && !options.some(opt => opt.toLowerCase() === searchTerm.trim().toLowerCase()) && (
              <li
                className="px-4 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 text-blue-600 font-medium border-b border-gray-50 mb-1"
                onClick={() => { setValue(searchTerm.trim()); setSearchTerm(''); setIsOpen(false); }}
              >
                Search for "{searchTerm}"
              </li>
            )}
            {sortedFilteredOptions.length > 0 ? (
              sortedFilteredOptions.map((opt, i) => (
                <li 
                  key={i}
                  className={`px-4 py-2.5 text-sm cursor-pointer capitalize font-medium ${
                    opt === value ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setValue(opt);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {opt === value ? (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">{opt}</span>
                  </div>
                </li>
              ))
            ) : (
              !searchTerm.trim() && <li className="px-4 py-2.5 text-sm text-gray-400 text-center font-medium">No match found</li>
            )}
            {value && value !== 'all' && value !== label && value !== '' && (
              <li 
                className="px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 cursor-pointer border-t border-gray-50 mt-1 font-medium"
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

const UserDetailModal = ({ userId, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeResumeUrl, setActiveResumeUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('provider');

  useEffect(() => {
    if (userId) {
      setLoading(true);
      adminAPI.getUserDetail(userId)
        .then(({ data }) => {
          setDetail(data);
          const roles = data.user?.roles || (data.user?.role ? [data.user.role] : []);
          if (roles.includes('provider')) {
            setActiveTab('provider');
          } else if (roles.includes('recruiter')) {
            setActiveTab('recruiter');
          }
        })
        .catch(() => toast.error('Failed to load user details'))
        .finally(() => setLoading(false));
    }
  }, [userId]);

  if (!userId) return null;

  const userRole = detail?.user?.role || detail?.user?.activeRole || (detail?.user?.roles && detail?.user.roles[0]) || '';
  const userRoles = detail?.user?.roles || (detail?.user?.role ? [detail?.user.role] : []);
  const hasMultipleProfiles = userRoles.includes('provider') && userRoles.includes('recruiter');

  const selectedProfile = activeTab === 'provider'
    ? (detail?.providerProfile || detail?.profile)
    : (detail?.recruiterProfile || detail?.profile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">User Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><HiX className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center"><LoadingSpinner /></div>
        ) : !detail ? (
          <div className="p-12 text-center text-gray-500">User not found</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center shrink-0">
                {detail.profile?.photo ? (
                  <img src={toAbsoluteMediaUrl(detail.profile.photo)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-gray-400">{detail.user?.name?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{detail.user?.name}</h3>
                <p className="text-sm text-gray-500">{detail.user?.email} {detail.user?.phone && `· ${detail.user.phone}`}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${userRole === 'provider' ? 'bg-green-100 text-green-700' : userRole === 'recruiter' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>{userRole}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detail.user?.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{detail.user?.isBlocked ? 'Blocked' : 'Active'}</span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Account</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Joined:</span> <span className="font-medium">{new Date(detail.user?.createdAt).toLocaleDateString()}</span></div>
                <div><span className="text-gray-500">Mobile:</span> <span className="font-medium">{detail.user?.phone || 'N/A'}</span></div>
                <div><span className="text-gray-500">WhatsApp:</span> <span className="font-medium">{detail.user?.whatsappNumber || 'N/A'}</span></div>
                <div><span className="text-gray-500">Same as Mobile:</span> <span className="font-medium">{detail.user?.isWhatsappSameAsMobile ? 'Yes' : 'No'}</span></div>
                <div><span className="text-gray-500">Country:</span> <span className="font-medium">{detail.user?.country || selectedProfile?.location?.country || 'N/A'}</span></div>
                <div><span className="text-gray-500">Expires:</span> <span className="font-medium">{detail.user?.accountExpiresAt ? new Date(detail.user.accountExpiresAt).toLocaleDateString() : 'N/A'}</span></div>
              </div>
            </div>

            {/* Role Tab Switcher (if user has multiple roles) */}
            {hasMultipleProfiles && (
              <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('provider')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'provider'
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Provider Profile
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('recruiter')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'recruiter'
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Recruiter Profile
                </button>
              </div>
            )}

            {/* Profile Info */}
            {selectedProfile && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3 border-b border-gray-150 pb-1.5 capitalize">
                  {activeTab} Profile Info
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                  {/* City / Country */}
                  <div>
                    <span className="text-gray-500 block text-xs">City / Country</span>
                    <span className="font-medium text-gray-800">
                      {selectedProfile.city || 'N/A'}
                      {selectedProfile.location?.country || detail.user?.country
                        ? `, ${selectedProfile.location?.country || detail.user?.country}`
                        : ''}
                    </span>
                  </div>

                  {/* Plan Tier */}
                  <div>
                    <span className="text-gray-500 block text-xs">Plan Tier</span>
                    <span className="font-medium text-gray-800 capitalize">
                      {selectedProfile.currentPlan || 'Free'}
                    </span>
                  </div>

                  {/* Provider-specific details */}
                  {activeTab === 'provider' && (
                    <>
                      {/* Experience */}
                      <div>
                        <span className="text-gray-500 block text-xs">Experience</span>
                        <span className="font-medium text-gray-800">
                          {selectedProfile.experience || 'N/A'}
                        </span>
                      </div>

                      {/* Pricing & Rates */}
                      <div>
                        <span className="text-gray-500 block text-xs">Pricing & Rates</span>
                        <span className="font-medium text-emerald-600">
                          {selectedProfile.pricing ? (
                            <>
                              ₹{selectedProfile.pricing} / {selectedProfile.pricingType || 'hr'}
                              {selectedProfile.pricingType === 'hourly' && (
                                <span className="block text-[11px] text-gray-500 font-normal mt-0.5">
                                  (₹{Number(selectedProfile.pricing) * 8}/day • ₹{Number(selectedProfile.pricing) * 8 * 22}/month)
                                </span>
                              )}
                            </>
                          ) : (
                            'N/A'
                          )}
                        </span>
                      </div>

                      {/* Skills */}
                      {selectedProfile.skills && selectedProfile.skills.length > 0 && (
                        <div className="sm:col-span-2">
                          <span className="text-gray-500 block text-xs mb-1">Skills</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedProfile.skills.map((skill, index) => (
                              <span key={index} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Uploaded Resume */}
                      {selectedProfile.resumeUrl && (
                        <div className="sm:col-span-2">
                          <span className="text-gray-500 block text-xs mb-1">Uploaded Resume</span>
                          <button
                            type="button"
                            onClick={() => setActiveResumeUrl(toAbsoluteMediaUrl(selectedProfile.resumeUrl))}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-150 text-indigo-700 rounded-lg text-xs font-bold transition shadow-xs"
                          >
                            📄 View Resume Document
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Recruiter-specific details */}
                  {activeTab === 'recruiter' && (
                    <>
                      {/* Company Name */}
                      {selectedProfile.companyName && (
                        <div>
                          <span className="text-gray-500 block text-xs">Company</span>
                          <span className="font-medium text-gray-800">
                            {selectedProfile.companyName}
                          </span>
                        </div>
                      )}

                      {/* GST Number */}
                      {selectedProfile.gstNumber && (
                        <div>
                          <span className="text-gray-500 block text-xs">GST Number</span>
                          <span className="font-medium text-gray-800">
                            {selectedProfile.gstNumber}
                          </span>
                        </div>
                      )}

                      {/* Company Type */}
                      {selectedProfile.companyType && (
                        <div>
                          <span className="text-gray-500 block text-xs">Company Type</span>
                          <span className="font-medium text-gray-800 capitalize">
                            {selectedProfile.companyType}
                          </span>
                        </div>
                      )}

                      {/* Skills Needed */}
                      {selectedProfile.skillsNeeded && selectedProfile.skillsNeeded.length > 0 && (
                        <div className="sm:col-span-2">
                          <span className="text-gray-500 block text-xs mb-1">Skills Looking to Hire</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedProfile.skillsNeeded.map((skill, index) => (
                              <span key={index} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Google Coordinates */}
                  {selectedProfile.latitude && selectedProfile.longitude && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block text-xs">Google Coordinates</span>
                      <span className="font-mono text-xs text-gray-700">
                        {selectedProfile.latitude.toFixed(6)}, {selectedProfile.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}

                  {/* Bio / Description */}
                  {selectedProfile.description && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block text-xs">Bio / Description</span>
                      <p className="font-normal text-gray-700 mt-1 leading-relaxed bg-white border border-gray-150 rounded-lg p-2.5 text-xs whitespace-pre-wrap">
                        {selectedProfile.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {detail.history?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Recent Activity</h4>
                <div className="space-y-2">
                  {detail.history.slice(0, 10).map((h, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded-lg">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.type === 'contact_unlock' ? 'bg-green-100 text-green-700' : h.type === 'profile_view' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {h.type?.replace('_', ' ')}
                      </span>
                      <span className="text-gray-500">{new Date(h.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payments */}
            {detail.payments?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Payments</h4>
                <div className="space-y-2">
                  {detail.payments.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                      <span className="font-medium">{p.planName || 'Plan'}</span>
                      <span className="text-gray-500">₹{p.amount}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {activeResumeUrl && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Resume Document Viewer</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveResumeUrl(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Viewer Frame */}
              <div className="flex-1 bg-slate-100 p-4">
                {activeResumeUrl.endsWith('.pdf') || activeResumeUrl.includes('/raw/') || activeResumeUrl.includes('.pdf') || activeResumeUrl.includes('cloudinary.com') ? (
                  <iframe
                    src={`${activeResumeUrl.includes('cloudinary.com') && !activeResumeUrl.toLowerCase().endsWith('.pdf') ? activeResumeUrl + '.pdf' : activeResumeUrl}#toolbar=0`}
                    title="Resume Viewer"
                    className="w-full h-full rounded-2xl border-0"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-2xl p-6 text-center space-y-4">
                    <span className="text-4xl">📄</span>
                    <p className="text-sm font-semibold text-slate-600 font-sans">Document format view is not supported directly in the browser.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, userId: null, userName: '' });
  const limit = 15;

  useEffect(() => { fetchUsers(); }, [page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getUsers({
        page,
        limit,
        search,
        role: roleFilter,
        status: statusFilter
      });
      setUsers(data.users || []);
      setTotal(data.pagination?.total || data.total || 0);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const toggleBlock = async (userId, isBlocked) => {
    try {
      await adminAPI.toggleBlockUser(userId);
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
      fetchUsers();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const handleApprove = async (userId, approve) => {
    try {
      if (approve) {
        await adminAPI.approveUser(userId);
        toast.success('User approved successfully');
      } else {
        const reason = prompt('Enter rejection reason:', 'Documents incomplete');
        if (reason === null) return; // Cancelled
        await adminAPI.rejectUser(userId, reason);
        toast.success('User rejected');
      }
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = (userId, userName) => {
    setDeleteModal({ open: true, userId, userName });
  };

  const confirmDelete = async () => {
    try {
      await adminAPI.deleteUser(deleteModal.userId);
      toast.success('User deleted successfully');
      setDeleteModal({ open: false, userId: null, userName: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const { data } = await adminAPI.uploadProviders(formData);
      toast.success(data.message || 'Upload completed');
      if (data.errors && data.errors.length > 0) {
        console.warn('Upload errors:', data.errors);
        toast.error(`Had ${data.errors.length} errors, check console for details.`);
      }
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload CSV');
      setLoading(false);
    }
    e.target.value = null; // reset
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>


      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">
            Search
          </button>
        </form>
        <div className="w-full sm:w-auto">
          <FilterDropdown
            label="All Roles"
            value={roleFilter}
            setValue={val => {
              const lower = val.toLowerCase();
              if (val === '' || lower === 'all roles') setRoleFilter('');
              else {
                let mapped = val;
                if (lower.includes('prov')) mapped = 'provider';
                else if (lower.includes('rec')) mapped = 'recruiter';
                else if (lower.includes('admin')) mapped = 'admin';
                setRoleFilter(mapped);
              }
              setPage(1);
            }}
            options={['provider', 'recruiter', 'admin']}
          />
        </div>
        <div className="w-full sm:w-auto">
          <FilterDropdown
            label="All Status"
            value={statusFilter}
            setValue={val => {
              const lower = val.toLowerCase();
              if (val === '' || lower === 'all status') setStatusFilter('');
              else {
                let mapped = val;
                if (lower.includes('pend')) mapped = 'pending';
                else if (lower.includes('app')) mapped = 'approved';
                else if (lower.includes('rej')) mapped = 'rejected';
                setStatusFilter(mapped);
              }
              setPage(1);
            }}
            options={['pending', 'approved', 'rejected']}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-gray-500">No users found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Email / Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 relative group">
                      <div className="flex items-center gap-1 cursor-help">
                        <span>Role</span>
                        <HiInformationCircle className="w-4 h-4 text-gray-400 hover:text-gray-700 transition-colors" />
                        <div className="absolute left-4 top-full mt-1 w-64 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 font-normal normal-case border border-slate-800">
                          <div className="space-y-2">
                            <p><strong className="text-emerald-400 font-semibold">Provider:</strong> Offers services/skills, views matches, and receives job leads.</p>
                            <p><strong className="text-blue-700 font-semibold">Recruiter:</strong> Posts jobs, searches providers, and unlocks contacts.</p>
                            <p><strong className="text-purple-400 font-semibold">Admin/Manager:</strong> Moderates users, manages plans, settings, and logs.</p>
                          </div>
                        </div>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const userRole = user.role || user.activeRole || (user.roles && user.roles[0]) || '';
                    return (
                      <tr key={user._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {user.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-gray-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{user.email || user.phone || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${userRole === 'provider' ? 'bg-green-100 text-green-700' :
                            userRole === 'recruiter' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>{userRole}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>{user.isBlocked ? 'Blocked' : 'Active'}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedUserId(user._id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                            >
                              <HiEye className="w-4 h-4" /> View
                            </button>
                            {userRole !== 'admin' && (
                              <>
                                {user.approvalStatus !== 'approved' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(user._id, true)}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition"
                                      title="Approve user account"
                                    >
                                      <HiCheckCircle className="w-4 h-4" /> Approve
                                    </button>
                                    <button
                                      onClick={() => handleApprove(user._id, false)}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition"
                                      title="Reject user account"
                                    >
                                      <HiX className="w-4 h-4" /> Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => toggleBlock(user._id, user.isBlocked)}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${user.isBlocked
                                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                                    }`}
                                >
                                  {user.isBlocked ? <HiCheckCircle className="w-4 h-4" /> : <HiBan className="w-4 h-4" />}
                                  {user.isBlocked ? 'Unblock' : 'Block'}
                                </button>
                                <button
                                  onClick={() => handleDelete(user._id, user.name)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition"
                                  title="Delete user permanently"
                                >
                                  <HiTrash className="w-4 h-4" />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <HiChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <HiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Detail Modal */}
      <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />

      {/* Delete Confirm Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mx-auto mb-4">
              <HiTrash className="w-7 h-7 text-red-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete User</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              Are you sure you want to permanently delete
            </p>
            <p className="text-sm font-semibold text-gray-800 text-center mb-4">
              &ldquo;{deleteModal.userName}&rdquo;?
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
              This will permanently remove the user account, profile, leads, reviews, and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, userId: null, userName: '' })}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
