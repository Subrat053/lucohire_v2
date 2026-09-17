import React, { useEffect, useState } from 'react';
import SafeExternalLink from '../common/SafeExternalLink';
import { toAbsoluteMediaUrl } from '../../utils/media';
import { X, CheckCircle2, XCircle, FileText, User as UserIcon, ExternalLink, RefreshCw } from 'lucide-react';

const PLATFORM_COLORS = {
  linkedin: 'bg-blue-50 text-blue-700 border-blue-200',
  github: 'bg-gray-50 text-gray-700 border-gray-200',
  behance: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  dribbble: 'bg-pink-50 text-pink-700 border-pink-200',
  instagram: 'bg-rose-50 text-rose-700 border-rose-200',
  facebook: 'bg-blue-50 text-blue-600 border-blue-200',
  default: 'bg-violet-50 text-violet-700 border-violet-200',
};

const getPlatformColor = (platform = '') =>
  PLATFORM_COLORS[platform.toLowerCase()] || PLATFORM_COLORS.default;

const PortfolioApprovalPanel = ({ adminAPI }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeResumeUrl, setActiveResumeUrl] = useState(null);
  const [error, setError] = useState('');
  const [actioningLinkId, setActioningLinkId] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, profileId: null, linkId: null, platform: '' });
  const [rejectionReason, setRejectionReason] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await adminAPI.getPortfolioApprovals({ page, limit: 10 });
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching portfolio approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const handleApprove = async (profileId, linkId) => {
    try {
      setActioningLinkId(linkId);
      await adminAPI.approvePortfolioLink(profileId, linkId);
      // Remove the approved link from local state
      setUsers(prev => prev.map(u => {
        if (String(u.profileId) !== String(profileId)) return u;
        const remaining = u.pendingLinks.filter(l => String(l.linkId) !== String(linkId));
        return remaining.length > 0 ? { ...u, pendingLinks: remaining } : null;
      }).filter(Boolean));
    } catch (err) {
      alert(err.response?.data?.message || 'Error approving portfolio link.');
    } finally {
      setActioningLinkId(null);
    }
  };

  const openRejectModal = (profileId, linkId, platform) => {
    setRejectModal({ open: true, profileId, linkId, platform });
    setRejectionReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) { alert('Please enter a rejection reason.'); return; }
    try {
      setActioningLinkId(rejectModal.linkId);
      setRejectModal({ open: false, profileId: null, linkId: null, platform: '' });
      await adminAPI.rejectPortfolioLink(rejectModal.profileId, rejectModal.linkId, rejectionReason.trim());
      setUsers(prev => prev.map(u => {
        if (String(u.profileId) !== String(rejectModal.profileId)) return u;
        const remaining = u.pendingLinks.filter(l => String(l.linkId) !== String(rejectModal.linkId));
        return remaining.length > 0 ? { ...u, pendingLinks: remaining } : null;
      }).filter(Boolean));
    } catch (err) {
      alert(err.response?.data?.message || 'Error rejecting portfolio link.');
    } finally {
      setActioningLinkId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Portfolio Link Moderation</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Review and approve user-submitted portfolio links before they go live.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-white hover:bg-violet-600 border border-violet-200 px-4 py-2 rounded-xl transition-all self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-semibold px-4 py-3 rounded-2xl">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <span className="w-8 h-8 border-[3px] border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold text-sm">No pending portfolio links</p>
          <p className="text-slate-300 text-xs mt-1">All caught up! Check back later.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.profileId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* User Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-slate-50/60 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
                    {user.profilePhoto ? (
                      <img src={toAbsoluteMediaUrl(user.profilePhoto)} alt={user.userName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-violet-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{user.userName}</p>
                    {user.email && <p className="text-[11px] text-slate-400 font-medium">{user.email}</p>}
                  </div>
                  <span className="ml-1 bg-violet-100 text-violet-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-violet-200">
                    {user.role}
                  </span>
                  <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
                    {user.pendingLinks.length} pending
                  </span>
                </div>

                {/* Resume button — shown once per user */}
                {user.resumeUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveResumeUrl(toAbsoluteMediaUrl(user.resumeUrl))}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-xl transition-all shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5" /> View Resume
                  </button>
                )}
              </div>

              {/* Links Table */}
              <div className="divide-y divide-slate-50">
                {user.pendingLinks.map((link) => {
                  const platformColor = getPlatformColor(link.platform);
                  const isActioning = actioningLinkId === link.linkId;
                  return (
                    <div key={link.linkId} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 hover:bg-slate-50/40 transition-colors">
                      {/* Platform badge */}
                      <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize shrink-0 ${platformColor}`}>
                        {link.platform}
                      </span>

                      {/* URLs */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold shrink-0">Submitted:</span>
                          <SafeExternalLink
                            href={link.url}
                            className="text-[11px] text-violet-600 hover:text-violet-800 font-semibold truncate hover:underline flex items-center gap-1"
                          >
                            {link.url} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </SafeExternalLink>
                        </div>
                        {link.currentApprovedUrl && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-300 font-semibold shrink-0">Current:</span>
                            <span className="text-[11px] text-slate-400 truncate">{link.currentApprovedUrl}</span>
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0 hidden sm:block">
                        {new Date(link.submittedAt).toLocaleDateString()}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApprove(user.profileId, link.linkId)}
                          disabled={isActioning}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white disabled:opacity-40 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(user.profileId, link.linkId, link.platform)}
                          disabled={isActioning}
                          className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white disabled:opacity-40 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-slate-500 font-bold">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Reject Portfolio Link</h3>
              <p className="text-xs text-slate-400 mt-1">
                Rejecting <span className="font-bold text-slate-600 capitalize">{rejectModal.platform}</span> link — provide a reason for the user.
              </p>
            </div>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Broken URL, dangerous redirect, inappropriate content..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:border-violet-500 focus:outline-none transition-colors"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, profileId: null, linkId: null, platform: '' })}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Reject Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document / Image Viewer Modal */}
      {activeResumeUrl && (() => {
        const url = activeResumeUrl.toLowerCase();
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)/.test(url) || url.includes('/image/upload/');
        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{isImage ? '🖼️' : '📄'}</span>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {isImage ? 'Image Viewer' : 'Document Viewer'}
                  </h3>
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

              {/* Body */}
              <div className="flex-1 bg-slate-100 p-3 overflow-hidden flex items-center justify-center">
                {isImage ? (
                  <img
                    src={activeResumeUrl}
                    alt="Document preview"
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-200"
                  />
                ) : (
                  <iframe
                    key={activeResumeUrl}
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(activeResumeUrl)}&embedded=true`}
                    title="Document Viewer"
                    className="w-full h-full rounded-2xl border-0 bg-white"
                    allow="fullscreen"
                  />
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-2.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
                <p className="text-[10px] text-slate-400 text-center font-medium">
                  {isImage
                    ? 'Viewing image · Click "Open in New Tab" for full resolution'
                    : 'Powered by Google Docs Viewer · If preview doesn\'t load, click "Open in New Tab"'}
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PortfolioApprovalPanel;
