import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { HiX } from 'react-icons/hi';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const WhatsAppNumberModal = ({ isOpen, onClose }) => {
  const { user, fetchUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!phone || phone.length < 10) return toast.error('Enter a valid phone number');
    setSaving(true);
    try {
      await authAPI.updateWhatsappNumber({ whatsappNumber: phone });
      await fetchUser();
      toast.success('WhatsApp number saved!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 relative animate-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          aria-label="Close modal"
        >
          <HiX className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaWhatsapp className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Add Your WhatsApp Number</h2>
          <p className="text-sm text-gray-500 mt-1">
            Get instant lead notifications & contact updates via WhatsApp
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 shrink-0 font-medium">
                <span>🇮🇳</span><span>+91</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit number"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || phone.length < 10}
            className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
            style={{ background: saving || phone.length < 10 ? '#9ca3af' : 'linear-gradient(90deg,#22c55e,#16a34a)' }}
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" /> Saving...</>
            ) : (
              <><FaWhatsapp className="w-5 h-5" aria-hidden="true" /> Save WhatsApp Number</>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm text-gray-400 hover:text-gray-700 transition"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppNumberModal;
