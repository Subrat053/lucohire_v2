import { useState } from 'react';
import { X } from 'lucide-react';

const RejectModal = ({ open, onClose, onReject, loading = false }) => {
  const [reason, setReason] = useState('');

  if (!open) return null;

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(reason.trim());
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Reject Profile Photo</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition" aria-label="Close modal"><X className="w-5 h-5 text-gray-400" aria-hidden="true" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Reason for rejection <span className="text-red-700">*</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="E.g. Photo is unclear, not a real photo, etc."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
          />
          {!reason.trim() && <p className="text-xs text-red-400">Rejection reason is required</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button type="button" onClick={handleReject} disabled={loading || !reason.trim()} className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition disabled:opacity-60">
            {loading ? 'Rejecting…' : 'Reject Photo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;
