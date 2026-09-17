import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X, CheckCircle2, Briefcase, User, MapPin, Building2, Clock } from 'lucide-react';
import { profileAPI } from '../../services/api';

const RoleCompletionModal = ({ isOpen, onClose, role, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    skills: [],
    city: '',
    experience: '',
    companyName: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await profileAPI.completeRole({
        role,
        profileData: role === 'provider' ? {
          skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
          city: formData.city,
          experience: formData.experience,
        } : {
          companyName: formData.companyName,
        }
      });
      
      const nextToken = data?.token || data?.data?.token;
      if (nextToken) {
        localStorage.setItem('authToken', nextToken);
      }

      toast.success(data.message);
      onComplete(data.user);
      onClose();
    } catch (error) {
      console.error('Error completing profile:', error);
      toast.error(error.response?.data?.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${role === 'provider' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              {role === 'provider' ? <User size={20} /> : <Briefcase size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Complete {role.charAt(0).toUpperCase() + role.slice(1)} Profile</h3>
              <p className="text-xs text-gray-500">Just a few details to get you started</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            aria-label="Close modal"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {role === 'provider' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
                  <CheckCircle2 size={14} className="mr-1 text-emerald-500" /> Skills
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plumbing, Electrician, Cleaning"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Comma separated list of your expertise</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
                    <MapPin size={14} className="mr-1 text-emerald-500" /> City
                  </label>
                  <input
                    type="text"
                    placeholder="Your city"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
                    <Clock size={14} className="mr-1 text-emerald-500" /> Experience
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5 years"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
                <Building2 size={14} className="mr-1 text-amber-500" /> Company Name
              </label>
              <input
                type="text"
                placeholder="Your company or business name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center space-x-2 ${
                role === 'provider' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
              } disabled:opacity-50`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Activate {role.charAt(0).toUpperCase() + role.slice(1)} Panel</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleCompletionModal;
