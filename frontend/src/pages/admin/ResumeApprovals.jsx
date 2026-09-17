import { useEffect, useState, useCallback } from 'react';
import {
  Search, RotateCcw, Filter, Clock, CheckCircle2, XCircle,
  Users, MapPin, FileText, MessageSquare, ChevronLeft, ChevronRight,
  User as UserIcon, ImageIcon, Eye, X
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toAbsoluteMediaUrl } from '../../utils/media';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/admin/ConfirmModal';
import RejectModal from '../../components/admin/RejectModal';
import RemarksModal from '../../components/admin/RemarksModal';
import toast from 'react-hot-toast';

/* ── Role badge colors ─────────────────────────────────────────── */
const ROLE_BADGE = {
  partner:   'bg-purple-100 text-purple-700 border-purple-200',
  manager:   'bg-blue-100 text-blue-700 border-blue-200',
  recruiter: 'bg-teal-100 text-teal-700 border-teal-200',
  provider:  'bg-orange-100 text-orange-700 border-orange-200',
};

const STATUS_BADGE = {
  pending:  'bg-amber-50 text-amber-600 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  none:     'bg-gray-50 text-gray-500 border-gray-200',
};

/* ── Tabs config ───────────────────────────────────────────────── */
const TABS = [
  { key: 'all',       label: 'All Profiles',        roleFilter: 'all' },
  { key: 'partners',  label: 'Partners / Agents',    roleFilter: 'partner' },
  { key: 'recruiter', label: 'Recruiters',            roleFilter: 'recruiter' },
  { key: 'provider',  label: 'Candidates / Providers', roleFilter: 'provider' },
];

/* ── Stats card ────────────────────────────────────────────────── */
const StatsCard = ({ icon: Icon, iconBg, label, value, trend, trendColor }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col justify-between min-h-[120px] shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
    </div>
    <div>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value?.toLocaleString() ?? '—'}</p>
      {trend && (
        <p className={`text-xs font-medium mt-1 ${trendColor}`}>{trend}</p>
      )}
    </div>
  </div>
);

/* ── Skeleton row ──────────────────────────────────────────────── */
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded-lg w-3/4" /></td>
    ))}
  </tr>
);

/* ═══════════════════════════════════════════════════════════════ */
const ResumeApprovals = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ pendingReview: 0, approved: 0, rejected: 0, totalProfiles: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* Filters */
  const [filterType, setFilterType] = useState('all');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterState, setFilterState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  /* Modals */
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null });
  const [rejectModal, setRejectModal] = useState({ open: false, user: null });
  const [remarksModal, setRemarksModal] = useState({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [activeResumeUrl, setActiveResumeUrl] = useState(null);

  /* Tab counts */
  const [tabCounts, setTabCounts] = useState({});

  /* ── Fetch stats ──────────────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await adminAPI.getResumeApprovalStats();
      setStats(data);
    } catch { /* silent */ }
  }, []);

  /* ── Fetch users ──────────────────────────────────────────────── */
  const fetchUsers = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const tab = TABS.find(t => t.key === activeTab);
      const params = {
        page: p,
        limit: 15,
        role: tab?.roleFilter || 'all',
        ...appliedFilters,
      };
      const { data } = await adminAPI.getResumeApprovals(params);
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);

      // Calculate tab counts from first "all" fetch
      if (tab?.key === 'all' && !appliedFilters.status) {
        const all = data.users || [];
        setTabCounts({
          all: data.pagination?.total || all.length,
          partners: all.filter(u => (u.roles || []).includes('partner')).length,
          recruiter: all.filter(u => (u.roles || []).includes('recruiter')).length,
          provider: all.filter(u => (u.roles || []).includes('provider')).length,
        });
      }
    } catch {
      toast.error('Failed to load profile approvals');
    } finally {
      setLoading(false);
    }
  }, [activeTab, appliedFilters]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); fetchUsers(1); }, [fetchUsers]);

  /* ── Handlers ─────────────────────────────────────────────────── */
  const handleApplyFilters = () => {
    const f = {};
    if (filterType && filterType !== 'all') f.status = filterType;
    if (filterCountry) f.country = filterCountry;
    if (filterState) f.state = filterState;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    setAppliedFilters(f);
    setPage(1);
  };

  const handleReset = () => {
    setFilterType('all');
    setFilterCountry('');
    setFilterState('');
    setSearchQuery('');
    setAppliedFilters({});
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchUsers(newPage);
  };

  const handleApprove = async () => {
    if (!confirmModal.user) return;
    setActionLoading(true);
    try {
      const targetUserId = confirmModal.user.user?._id || confirmModal.user.user || confirmModal.user._id;
      const targetRole = confirmModal.user.role || getPrimaryRole(confirmModal.user.roles);
      await adminAPI.approveResume(targetUserId, targetRole);
      toast.success('Resume approved');
      setConfirmModal({ open: false, user: null });
      fetchUsers(page);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approve failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectModal.user) return;
    setActionLoading(true);
    try {
      const targetUserId = rejectModal.user.user?._id || rejectModal.user.user || rejectModal.user._id;
      const targetRole = rejectModal.user.role || getPrimaryRole(rejectModal.user.roles);
      await adminAPI.rejectResume(targetUserId, targetRole, reason);
      toast.success('Resume rejected');
      setRejectModal({ open: false, user: null });
      fetchUsers(page);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reject failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getPrimaryRole = (roles) => {
    if (!Array.isArray(roles) || roles.length === 0) return 'provider';
    const priority = ['partner', 'recruiter', 'provider', 'manager'];
    for (const r of priority) { if (roles.includes(r)) return r; }
    return roles[0];
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Page Header ─────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve user profiles efficiently</p>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                  ${isActive
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {tab.label}
                {count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                    ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Stats Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={Clock} iconBg="bg-amber-100 text-amber-600" label="Pending Review" value={stats.pendingReview} />
          <StatsCard icon={CheckCircle2} iconBg="bg-green-100 text-green-700" label="Approved" value={stats.approved} />
          <StatsCard icon={XCircle} iconBg="bg-red-100 text-red-600" label="Rejected" value={stats.rejected} />
          <StatsCard icon={Users} iconBg="bg-purple-100 text-purple-600" label="Total Profiles" value={stats.totalProfiles} />
        </div>

        {/* ── Filters ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-purple-300 min-w-[120px]">
            <option value="all">All Types</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}
            placeholder="Country" className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-purple-300 w-28" />
          <input value={filterState} onChange={(e) => setFilterState(e.target.value)}
            placeholder="All States" className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-purple-300 w-32" />
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              placeholder="Search profiles..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={handleApplyFilters} className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition shadow-sm">
            <Filter className="w-3.5 h-3.5" /> Apply Filters
          </button>
        </div>

        {/* ── Table ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Profile</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No profiles found</p>
                      <p className="text-gray-300 text-sm mt-1">Adjust your filters to see results</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const role = getPrimaryRole(u.roles);
                    const status = u.resumeApproval?.status || 'none';
                    const currentPhoto = u.profilePhoto || u.avatar || '';
                    const pendingPhoto = u.resumeApproval?.pendingUrl || '';
                    const currentResumeUrl = u.resumeUrl || '';
                    const location = u.location || {};
                    const docs = u.documents || [];

                    return (
                      <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Checkbox circle */}
                        <td className="px-4 py-3">
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-purple-400 cursor-pointer transition" />
                        </td>

                        {/* Profile */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                                {currentPhoto ? (
                                  <img src={toAbsoluteMediaUrl(currentPhoto)} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  <UserIcon className="w-5 h-5 text-purple-400" />
                                )}
                              </div>
                              {pendingPhoto && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-full" title="Has pending resume" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{u.displayName || u.user?.name || u.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400 truncate">{u.user?.phone || u.phone || u.user?.email || u.email || '-'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Type badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${ROLE_BADGE[role] || ROLE_BADGE.provider}`}>
                            {role === 'provider' ? 'Candidate' : role}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3">
                          {(location.city || location.state || u.country) ? (
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                              <span className="text-sm text-gray-700">
                                {[location.city, location.state, u.country].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>

                        {/* Registered */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">{formatDate(u.createdAt)}</span>
                        </td>

                        {/* Documents */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {pendingPhoto && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                <ImageIcon className="w-3 h-3" /> Photo
                              </span>
                            )}
                            {docs.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                <FileText className="w-3 h-3" /> ID Proof
                              </span>
                            )}
                            {!pendingPhoto && docs.length === 0 && (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${STATUS_BADGE[status] || STATUS_BADGE.none}`}>
                            {status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {(pendingPhoto || currentResumeUrl) && (
                              <button
                                onClick={() => setActiveResumeUrl(pendingPhoto || currentResumeUrl)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
                                title="View Resume"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                            )}
                            {status === 'pending' && (
                              <>
                                <button
                                  onClick={() => setConfirmModal({ open: true, user: u })}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
                                  title="Approve"
                                >
                                  <CheckCircle2 className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  onClick={() => setRejectModal({ open: true, user: u })}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                                  title="Reject"
                                >
                                  <XCircle className="w-4.5 h-4.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setRemarksModal({ open: true, user: u })}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition"
                              title="View Remarks"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Remarks
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  <ChevronLeft className="w-4 h-4 text-gray-700" />
                </button>
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pNum = i + 1;
                  return (
                    <button key={pNum} onClick={() => handlePageChange(pNum)}
                      className={`w-8 h-8 text-xs font-medium rounded-lg transition ${pNum === page ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>
                      {pNum}
                    </button>
                  );
                })}
                <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  <ChevronRight className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, user: null })}
        onConfirm={handleApprove}
        title="Approve Resume"
        message={`Are you sure you want to approve the resume for "${confirmModal.user?.name || 'this user'}"? The pending resume will replace their current resume.`}
        confirmText="Approve"
        confirmColor="bg-green-700 hover:bg-green-800"
        loading={actionLoading}
      />

      <RejectModal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, user: null })}
        onReject={handleReject}
        loading={actionLoading}
      />

      <RemarksModal
        open={remarksModal.open}
        onClose={() => setRemarksModal({ open: false, user: null })}
        user={remarksModal.user}
      />

      {activeResumeUrl && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Resume Document Viewer</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setActiveResumeUrl(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 bg-slate-100 p-3 overflow-hidden">
              <iframe
                key={activeResumeUrl}
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(activeResumeUrl)}&embedded=true`}
                title="Resume Viewer"
                className="w-full h-full rounded-2xl border-0 bg-white"
                allow="fullscreen"
              />
            </div>

            {/* Footer hint */}
            <div className="px-6 py-2.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
              <p className="text-[10px] text-slate-400 text-center font-medium">
                Powered by Google Docs Viewer · If the preview doesn't load, click "Open in New Tab"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeApprovals;
