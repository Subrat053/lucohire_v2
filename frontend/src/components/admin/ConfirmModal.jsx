import { X } from 'lucide-react';

const ConfirmModal = ({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmColor = 'bg-green-700 hover:bg-green-800', loading = false }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition" aria-label="Close modal"><X className="w-5 h-5 text-gray-400" aria-hidden="true" /></button>
        </div>
        <div className="px-6 py-5">
          <p className="text-gray-700 text-sm">{message}</p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`px-5 py-2 text-sm font-medium text-white rounded-xl transition disabled:opacity-60 ${confirmColor}`}>
            {loading ? 'Processing…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
