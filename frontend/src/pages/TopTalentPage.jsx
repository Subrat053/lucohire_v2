import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { providerAPI } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { MapPin, BadgeCheck, MoreVertical, Clock, Briefcase, Calendar, Zap, Wallet, CheckCircle2, MessageCircle, Phone, Eye, ArrowLeft } from 'lucide-react';
import Seo from '../components/common/Seo';

export default function TopTalentPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [topTalent, setTopTalent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    const fetchTopTalent = async () => {
      setLoading(true);
      try {
        const { data } = await providerAPI.getTopTalent({ limit: 20, page });
        if (data?.success && data?.data) {
          setTopTalent(data.data);
          if (data.pagination) setPagination(data.pagination);
        }
      } catch (err) {
        console.error('Error fetching top talent:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopTalent();
    window.scrollTo(0, 0);
  }, [page]);

  const handleContactClick = async (e, candidate, type) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login to contact candidate");
      navigate('/login');
      return;
    }

    try {
      const res = await api.post(`/provider/public/${candidate._id}/contact-click`, { actionType: type });
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
    <div className="flex flex-col font-sans w-full min-h-[calc(100vh-64px)]">
      <Seo 
        title="Top Talent Available for Hourly Work" 
        description="Browse our curated list of verified freelancers and professionals ready to take on your hourly projects immediately. Connect with them directly via WhatsApp or Call."
        canonicalPath="/top-talent"
      />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center text-sm text-gray-500 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Home
        </button>

        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Top Talent Available for <span className="text-blue-600">Hourly Work</span>
          </h1>
          <p className="text-gray-500 max-w-2xl text-sm sm:text-base">
            Browse our curated list of verified freelancers and professionals ready to take on your hourly projects immediately. 
            Connect with them directly via WhatsApp or Call.
          </p>
        </div>

        {loading && topTalent.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {topTalent.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-lg">No top talent found at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topTalent.map(candidate => (
                  <div key={candidate._id} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden w-full">
                    
                    {/* Top Section */}
                    <div className="flex gap-4 mb-5">
                      {/* Left: Avatar with Available Now pill */}
                      <div className="relative shrink-0">
                        {candidate.profilePhoto ? (
                          <img src={candidate.profilePhoto} alt={candidate.profileName} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-1 ring-gray-100" />
                        ) : (
                          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-3xl font-bold ring-1 ring-gray-100 ${candidate.avatarBg || 'bg-blue-100 text-blue-700'}`}>
                            {candidate.profileName?.substring(0, 2).toUpperCase() || 'UN'}
                          </div>
                        )}
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap shadow-md">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                          Available
                        </div>
                      </div>
                      
                      {/* Right: Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate">{candidate.profileName}</h3>
                            <BadgeCheck className="w-5 h-5 text-blue-600 fill-blue-600/10" strokeWidth={2.5} />
                          </div>
                          <MoreVertical className="w-4 h-4 text-gray-400 cursor-pointer" />
                        </div>
                        
                        <p className="text-[13px] font-bold text-indigo-700 mb-2 truncate">
                          {candidate.primaryRole || 'Freelancer'}
                        </p>
                        
                        <div className="flex flex-col gap-1.5 text-[12px] text-gray-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate">{candidate.city || 'India'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            Last active: <span className="text-green-700 font-bold ml-0.5">Today</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3 Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-bold text-gray-900 truncate">{candidate.experienceYears || 0}+ Yrs</div>
                          <div className="text-[10px] text-gray-500 font-medium truncate">Experience</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-50/50 p-2 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-bold text-gray-900 truncate">25h/wk</div>
                          <div className="text-[10px] text-gray-500 font-medium truncate">Availability</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-green-50/50 p-2 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-4 h-4 text-green-700" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-bold text-gray-900 truncate">Ready</div>
                          <div className="text-[10px] text-gray-500 font-medium truncate">To Start</div>
                        </div>
                      </div>
                    </div>

                    {/* Top Skills */}
                    <div className="mb-5">
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.skills?.slice(0, 4).map((tag, idx) => (
                          <span key={idx} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            {tag}
                          </span>
                        ))}
                        {(candidate.skills?.length || 0) > 4 && (
                          <span className="bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            +{candidate.skills.length - 4} More
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rate & Verifications */}
                    <div className="flex gap-4 mb-5 border-t border-gray-100 pt-5">
                      <div className="flex-1 bg-[#f0fdf4] rounded-xl p-3 flex flex-col justify-center border border-green-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="w-4 h-4 text-green-700" />
                          <span className="text-[11px] text-green-800 font-bold uppercase tracking-wider">Hourly Rate</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-gray-900">₹{candidate.hourlyRate || '1200'}</span>
                          <span className="text-[12px] font-bold text-gray-500">/hr</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-center space-y-1.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
                          <span className="text-[11px] text-gray-700 font-medium">Resume Verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
                          <span className="text-[11px] text-gray-700 font-medium">Mobile Verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
                          <span className="text-[11px] text-gray-700 font-medium">Email Verified</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto flex flex-col gap-2.5">
                      <div className="flex gap-2.5">
                        <button 
                          onClick={(e) => handleContactClick(e, candidate, 'whatsapp')}
                          className="flex-[1.5] py-2.5 rounded-xl bg-[#075E54] text-white font-bold hover:bg-[#04433B] transition-colors text-[13px] flex items-center justify-center gap-2 shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" fill="currentColor" strokeWidth={0} /> Chat on WhatsApp
                        </button>
                        <button 
                          onClick={(e) => handleContactClick(e, candidate, 'call')}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-[13px] flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Phone className="w-4 h-4" /> Call
                        </button>
                      </div>
                      <button 
                        onClick={() => navigate(`/p/${candidate._id}`)}
                        className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-[13px] flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" strokeWidth={2.5} /> View Full Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex gap-1 mx-2">
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                        page === i + 1 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={page === pagination.pages}
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
