import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBookmark, FiLoader, FiEye, FiX, FiMapPin, FiSend, FiMessageSquare, FiBriefcase, FiCalendar, FiDollarSign, FiClock, FiCheckCircle } from 'react-icons/fi';
import { HiBookmark } from 'react-icons/hi2';
import { recruiterAPI } from '../../services/api';
import { toOptimizedMediaUrl } from '../../utils/media';
import toast from 'react-hot-toast';

export default function ShortlistedCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    recruiterAPI.getShortlistedCandidates()
      .then(res => {
        const list = res.data?.shortlisted || res.data?.candidates || (Array.isArray(res.data) ? res.data : []);
        setCandidates(list);
        sessionStorage.setItem('currentCandidateList', JSON.stringify(list.map(c => c.providerProfileId || c.provider?._id || c.user?._id || c._id || c.id)));
      })
      .catch(() => toast.error('Failed to load shortlisted candidates'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (candidate) => {
    const pid = candidate.providerProfileId || candidate.provider?._id || candidate.user?._id || candidate._id || candidate.id;
    setRemovingId(pid);
    try {
      await recruiterAPI.removeShortlistedCandidate(pid);
      setCandidates(prev => prev.filter(c => (c.providerProfileId || c.provider?._id || c.user?._id || c._id || c.id) !== pid));
      toast.success('Removed from shortlist');
    } catch {
      toast.error('Failed to remove');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <HiBookmark className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-extrabold text-gray-900">Shortlisted Candidates</h1>
              {!loading && (
                <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  {candidates.length}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-medium">Candidates you've marked for closer review</p>
          </div>
          <Link
            to="/recruiter/candidates"
            className="flex items-center justify-center sm:justify-start gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition bg-white sm:bg-transparent border sm:border-none border-gray-200 px-4 py-2 sm:p-0 rounded-lg shadow-sm sm:shadow-none whitespace-nowrap"
          >
            <FiBookmark className="w-4 h-4" /> Browse Candidates
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <FiLoader className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <HiBookmark className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h2 className="text-base font-bold text-gray-700 mb-1">No shortlisted candidates yet</h2>
            <p className="text-sm text-gray-400 mb-6">Click the bookmark icon on any candidate to shortlist them here.</p>
            <Link
              to="/recruiter/candidates"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
            >
              Browse Candidates
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((candidate, index) => {
              const pid = candidate.providerProfileId || candidate.provider?._id || candidate.user?._id || candidate._id || candidate.id;
              const user = candidate.user || candidate.provider || {};
              const userProfile = candidate.userProfile || {};
              const name = candidate.name || user.name || userProfile.name || 'Candidate';
              const title = candidate.role || candidate.title || candidate.category || userProfile.title || 'Professional';
              const city = candidate.location || candidate.city || user.location || userProfile.location || '';
              const exp = candidate.experience || userProfile.experience || candidate.yearsOfExperience || 'N/A';
              const ctc = candidate.pricing || candidate.currentCTC || userProfile.currentCTC || 'N/A';
              const notice = candidate.noticePeriod || userProfile.noticePeriod || 'N/A';
              const skills = Array.isArray(candidate.skills) ? candidate.skills.slice(0, 4) : [];
              const avatar = candidate.profilePhoto
                || toOptimizedMediaUrl(user.profilePhoto || user.avatar, 'profile', 100)
                || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e0e7ff&color=4f46e5`;
              const email = user.email || candidate.email || '';

              return (
                <div key={pid || index} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden w-full">
                  
                  {/* Top Section */}
                  <div className="flex gap-4 mb-5">
                    {/* Left: Avatar with Available Now pill */}
                    <div className="relative shrink-0">
                      <img src={avatar} alt={name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-1 ring-gray-100" />
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap shadow-md">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        Shortlisted
                      </div>
                    </div>
                    
                    {/* Right: Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate">{name}</h3>
                          <FiCheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        </div>
                        <button
                          onClick={() => handleRemove(candidate)}
                          disabled={removingId === pid}
                          className="shrink-0 p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition ml-2"
                          title="Remove from shortlist"
                        >
                          {removingId === pid ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiX className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      <p className="text-[13px] font-bold text-indigo-700 mb-2 truncate">
                        {title}
                      </p>
                      
                      <div className="flex flex-col gap-1.5 text-[12px] text-gray-700 font-medium mb-4">
                        <div className="flex items-center gap-1.5">
                          <FiBriefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{exp !== 'N/A' ? exp : 'Experience N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FiMapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{city || 'Remote'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FiClock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Last active: <span className="text-green-700 font-bold ml-0.5">Today</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Skills */}
                  <div className="mb-5 flex-1">
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s, i) => (
                        <span key={i} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto flex flex-col gap-2.5">
                    <div className="flex gap-2.5">
                      <button 
                        onClick={() => {
                          if (email) window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank', 'noopener,noreferrer');
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors text-[13px] flex items-center justify-center gap-2 shadow-sm"
                      >
                        <FiSend className="w-4 h-4" /> Contact
                      </button>
                      <Link 
                        to={`/recruiter/candidates/${user._id || pid}`}
                        className="flex-1 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors text-[13px] flex items-center justify-center gap-2 shadow-sm"
                      >
                        <FiEye className="w-4 h-4" strokeWidth={2.5} /> View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}