import { X, User as UserIcon, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toAbsoluteMediaUrl } from '../../utils/media';

const RemarksModal = ({ open, onClose, user }) => {
  if (!open || !user) return null;

  const approval = user.profilePhotoApproval || {};
  const currentPhoto = user.profilePhoto || user.avatar || '';
  const pendingPhoto = approval.pendingUrl || '';
  const status = approval.status || 'none';
  const rejectionReason = approval.rejectionReason || '';
  const reviewedAt = approval.reviewedAt ? new Date(approval.reviewedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    none: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Profile Remarks</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition" aria-label="Close modal"><X className="w-5 h-5 text-gray-400" aria-hidden="true" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden border-2 border-purple-200">
              {currentPhoto ? (
                <img src={toAbsoluteMediaUrl(currentPhoto)} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-7 h-7 text-purple-400" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{user.name || 'Unknown'}</h4>
              <p className="text-sm text-gray-500">{user.email || user.phone || '-'}</p>
              <div className="flex items-center gap-2 mt-1">
                {(user.roles || []).map(r => (
                  <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium capitalize">{r}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Photos side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Photo</p>
              <div className="aspect-square rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                {currentPhoto ? (
                  <img src={toAbsoluteMediaUrl(currentPhoto)} alt="Current" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-gray-300" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Photo</p>
              <div className="aspect-square rounded-xl border-2 border-amber-200 overflow-hidden bg-amber-50/30 flex items-center justify-center">
                {pendingPhoto ? (
                  <img src={toAbsoluteMediaUrl(pendingPhoto)} alt="Pending" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-xs text-gray-400 px-3 text-center">No pending photo</p>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2">
              {status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-green-700" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
              <span className="text-sm font-medium text-gray-700">Approval Status</span>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusColors[status]}`}>{status}</span>
          </div>

          {/* Reviewed date */}
          {approval.reviewedAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Reviewed on: {reviewedAt}</span>
            </div>
          )}

          {/* Rejection reason */}
          {rejectionReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Rejection Reason</p>
              <p className="text-sm text-red-800">{rejectionReason}</p>
            </div>
          )}

          {/* Registered date */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Registered: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Close</button>
        </div>
      </div>
    </div>
  );
};

export default RemarksModal;
