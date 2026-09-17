import { X, BadgeCheck, MapPin, Globe, Briefcase, Wallet, Calendar, Star, CheckCircle2, MessageCircle, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function CandidateModal({ selectedCandidate, setSelectedCandidate }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!selectedCandidate) return null;

  const handleContactClick = async (e, type) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login to contact candidate");
      navigate('/login');
      return;
    }

    try {
      const res = await api.post(`/provider/public/${selectedCandidate._id || selectedCandidate.id}/contact-click`, { actionType: type });
      if (res.data.success && res.data.url) {
        if (type === 'whatsapp') {
          window.open(res.data.url, '_blank');
        } else {
          window.location.href = res.data.url;
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={() => setSelectedCandidate(null)}
      ></div>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col hide-scrollbar animate-fade-in-up">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 p-5 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">Candidate Profile</h2>
          <button 
            onClick={() => setSelectedCandidate(null)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 flex flex-col gap-8">
          
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {selectedCandidate.profilePhoto ? (
              <img 
                src={selectedCandidate.profilePhoto} 
                alt={selectedCandidate.profileName} 
                referrerPolicy="no-referrer"
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover ring-4 ring-gray-50" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCandidate.profileName || 'U')}&background=e0e7ff&color=4f46e5`;
                }}
              />
            ) : (
              <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center text-4xl font-bold ring-4 ring-gray-50 ${selectedCandidate.avatarBg || 'bg-blue-100 text-blue-700'}`}>
                {selectedCandidate.profileName?.substring(0, 2).toUpperCase() || 'UN'}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{selectedCandidate.profileName}</h3>
                <BadgeCheck className="w-7 h-7 text-blue-600 fill-blue-600/10" strokeWidth={2.5} />
              </div>
              <p className="text-lg font-bold text-indigo-700 mb-3">{selectedCandidate.primaryRole || 'Freelancer'}</p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 font-medium">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {selectedCandidate.city || 'India'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-gray-400" />
                  Remote Worldwide
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded-md">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  Available Now
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-indigo-50/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <Briefcase className="w-6 h-6 text-indigo-600 mb-2" />
              <div className="text-lg font-bold text-gray-900">{selectedCandidate.experienceYears || 0}+ Years</div>
              <div className="text-xs text-gray-500 font-medium">Experience</div>
            </div>
            <div className="bg-green-50/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <Wallet className="w-6 h-6 text-green-700 mb-2" />
              <div className="text-lg font-bold text-gray-900">₹{selectedCandidate.hourlyRate || '1200'}/hr</div>
              <div className="text-xs text-gray-500 font-medium">Hourly Rate</div>
            </div>
            <div className="bg-blue-50/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <Calendar className="w-6 h-6 text-blue-500 mb-2" />
              <div className="text-lg font-bold text-gray-900">25h/week</div>
              <div className="text-xs text-gray-500 font-medium">Availability</div>
            </div>
            <div className="bg-yellow-50/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <Star className="w-6 h-6 text-yellow-600 fill-yellow-600/20 mb-2" />
              <div className="text-lg font-bold text-gray-900">{selectedCandidate.rating || '5.0'}</div>
              <div className="text-xs text-gray-500 font-medium">Rating ({selectedCandidate.reviewCount || 0})</div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="text-base font-bold text-gray-900 mb-3">Top Skills</h4>
            <div className="flex flex-wrap gap-2">
              {selectedCandidate.skills?.map((tag, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-bold">
                  {tag}
                </span>
              ))}
              {(!selectedCandidate.skills || selectedCandidate.skills.length === 0) && (
                <span className="text-sm text-gray-500 italic">No skills listed</span>
              )}
            </div>
          </div>

          {/* Bio/About */}
          <div>
            <h4 className="text-base font-bold text-gray-900 mb-3">About</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {selectedCandidate.bio || `${selectedCandidate.profileName} is a highly skilled ${selectedCandidate.primaryRole || 'professional'} based in ${selectedCandidate.city || 'India'} with over ${selectedCandidate.experienceYears || 0} years of experience. They are ready to take on new projects and deliver high-quality results.`}
            </p>
          </div>

          {/* Verifications */}
          <div>
            <h4 className="text-base font-bold text-gray-900 mb-3">Trust & Verification</h4>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-wrap gap-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-500/10" />
                <span className="text-sm text-gray-700 font-bold">Resume Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-500/10" />
                <span className="text-sm text-gray-700 font-bold">Mobile Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-500/10" />
                <span className="text-sm text-gray-700 font-bold">Email Verified</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-5 sm:px-8 flex flex-col sm:flex-row gap-3 mt-auto">
          <button 
            onClick={(e) => handleContactClick(e, 'whatsapp')}
            className="flex-1 py-3.5 rounded-xl bg-[#075E54] text-white font-bold hover:bg-[#04433B] transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <MessageCircle className="w-5 h-5" fill="currentColor" strokeWidth={0} /> Chat on WhatsApp
          </button>
          <button 
            onClick={(e) => handleContactClick(e, 'call')}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <Phone className="w-5 h-5" /> Call Now
          </button>
        </div>

      </div>
    </div>
  );
}
