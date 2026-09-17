import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { profileShareAPI } from "../services/api";
import { 
  HiOutlineLocationMarker
} from "react-icons/hi";
import { 
  FiAlertCircle, 
  FiLoader,
  FiLock
} from 'react-icons/fi';

import toast from "react-hot-toast";
import Seo from "../components/common/Seo";
import { toOptimizedMediaUrl } from '../utils/media';

export default function ProviderSharedProfile() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSharedProfile();
  }, [token]);

  const fetchSharedProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await profileShareAPI.getSharedProfile(token);
      if (data?.success && data?.profile) {
        setProfile(data.profile);
      } else {
        setError("Invalid or expired share link.");
      }
    } catch (err) {
      console.error("[Fetch Shared Profile Failed]:", err);
      const msg = err.response?.data?.message || "Failed to load shared profile.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3">
        <FiLoader className="w-8 h-8 text-indigo-600 animate-spin"/>
        <p className="text-sm font-medium text-gray-500">Loading secure profile...</p>
      </div>
    </div>
  );

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
        <div className="text-center">
          <FiAlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
          <h2 className="text-xl font-black text-slate-800 mb-2">Link Unavailable</h2>
          <p className="text-sm font-medium text-gray-700 max-w-md mx-auto mb-6">{error || "This shareable profile link is invalid, expired, or has been revoked."}</p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-sm text-sm"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const u = profile.user || {};
  const skills = Array.isArray(profile.skills) ? profile.skills : (profile.skills ? [profile.skills] : []);
  const prevExp = (Array.isArray(profile.previousExperience) && profile.previousExperience.length > 0)
    ? profile.previousExperience : (Array.isArray(profile.experienceDetails) ? profile.experienceDetails : []);
  const education = Array.isArray(profile.education) ? profile.education : [];

  const cData = {
    name: profile.name || u.name || 'Candidate',
    designation: profile.designation || profile.title || profile.category || skills[0] || 'Professional',
    company: profile.company || prevExp[0]?.company || '',
    experience: profile.experience || 'N/A',
    currentCtc: profile.currentCtc || profile.pricing || 'N/A',
    expectedCtc: profile.expectedCtc || 'N/A',
    noticePeriod: profile.noticePeriod || '30 Days',
    availability: profile.availability || 'As per notice period',
    city: profile.city || profile.location || 'Not specified',
    state: profile.state || '',
    relocation: profile.relocationAvailable || false,
    desc: profile.description || profile.headline || profile.highlight || '',
    photo: profile.photo || profile.profilePhoto || u.avatar || u.profilePhoto || '',
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    age: profile.age || null,
    tier: profile.tier || profile.skillLevel || '',
    isVerified: profile.isVerified || false,
    jobType: Array.isArray(profile.jobType) ? profile.jobType : ['Full-time'],
  };

  const StatChip = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] font-semibold text-gray-500 whitespace-nowrap">{label}</div>
      <div className="text-[13px] font-extrabold text-gray-900 whitespace-nowrap">{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 pt-8">
      {/* Search Crawler Directives: noindex, nofollow */}
      <Seo
        title={`${cData.name} - Public Profile Preview`}
        description="Public candidate preview profile"
        metaRobots="noindex, nofollow"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header */}
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="text-xl font-black tracking-tighter text-indigo-700">Lucohire.</Link>
          <span className="text-[10px] uppercase font-black tracking-widest bg-violet-100 border border-violet-200 text-violet-700 px-3 py-1 rounded-full shadow-inner">
            Shared Preview
          </span>
        </div>

        <div className="space-y-5">
          {/* Main Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-5">
              {cData.photo
                ? <img src={toOptimizedMediaUrl(cData.photo,{width:96,height:96,crop:'fill'})} alt={cData.name} className="w-24 h-24 rounded-2xl object-cover shadow-sm border border-gray-100 flex-shrink-0"/>
                : <div className="w-24 h-24 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0"><span className="text-3xl text-indigo-600 font-extrabold">{cData.name.charAt(0)}</span></div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h1 className="text-[20px] font-extrabold text-gray-900">{cData.name}</h1>
                      {cData.isVerified && <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md whitespace-nowrap">Verified</span>}
                      {cData.tier && <span className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md capitalize whitespace-nowrap">{cData.tier}</span>}
                    </div>
                    <div className="text-[14px] font-semibold text-gray-700 mb-1">{cData.designation}{cData.company ? ` at ${cData.company}` : ''}</div>
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-500 mb-4">
                      <HiOutlineLocationMarker className="w-3.5 h-3.5 text-gray-400"/>
                      {[cData.city, cData.state].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Security Badge Placeholder for Contact Info */}
                <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-500 mt-2">
                  <FiLock className="w-4 h-4 text-indigo-400" />
                  Contact details are protected for privacy.
                </div>
              </div>
            </div>

            {/* Stat chips */}
            <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-x-8 gap-y-3">
              <StatChip label="Experience" value={cData.experience}/>
              <StatChip label="Current CTC" value={cData.currentCtc}/>
              <StatChip label="Expected CTC" value={cData.expectedCtc}/>
              <StatChip label="Notice Period" value={cData.noticePeriod}/>
              <StatChip label="Availability" value={cData.availability}/>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-[14px] font-bold text-gray-900 mb-3">About {cData.name.split(' ')[0]}</h3>
            <p className="text-[13px] text-gray-700 leading-relaxed mb-5 whitespace-pre-wrap">{cData.desc || 'No description provided.'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {cData.age && <div><div className="text-[10px] font-semibold text-gray-500 mb-1">Age</div><div className="text-[13px] font-bold text-gray-900">{cData.age} yrs</div></div>}
              <div><div className="text-[10px] font-semibold text-gray-500 mb-1">Languages</div><div className="text-[13px] font-bold text-gray-900">{cData.languages.length > 0 ? cData.languages.join(', ') : 'English'}</div></div>
              <div><div className="text-[10px] font-semibold text-gray-500 mb-1">Location</div><div className="text-[13px] font-bold text-gray-900">{cData.city}</div></div>
              <div><div className="text-[10px] font-semibold text-gray-500 mb-1">Relocation</div><div className="text-[13px] font-bold text-gray-900">{cData.relocation ? 'Open to relocate' : 'No'}</div></div>
              <div><div className="text-[10px] font-semibold text-gray-500 mb-1">Employment</div><div className="text-[13px] font-bold text-gray-900">{cData.jobType.join(', ')}</div></div>
            </div>
          </div>

          {/* Skills Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-gray-900">Key Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? skills.map((s,i) => <span key={i} className="text-[12px] font-bold text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">{s}</span>) : <span className="text-[13px] text-gray-400 italic">No skills listed</span>}
            </div>
          </div>

          {/* Experience Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-[14px] font-bold text-gray-900 mb-5">Experience Summary</h3>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-[140px] space-y-4 shrink-0">
                <div><div className="text-[10px] font-semibold text-gray-500 mb-0.5">Total Experience</div><div className="text-[15px] font-extrabold text-gray-900">{cData.experience}</div></div>
                <div><div className="text-[10px] font-semibold text-gray-500 mb-0.5">Relevant Experience</div><div className="text-[15px] font-extrabold text-gray-900">{cData.experience}</div></div>
              </div>
              <div className="flex-1 relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gray-100"/>
                <div className="space-y-5">
                  {prevExp.length > 0 ? prevExp.map((exp,idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-extrabold text-[13px] shrink-0 relative z-10 border-4 border-white">{(exp.company||'C').charAt(0).toUpperCase()}</div>
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-start justify-between gap-1 pb-5 border-b border-gray-50 last:border-0 last:pb-0">
                        <div><h4 className="text-[13px] font-bold text-gray-900">{exp.company||'Company'}</h4><div className="text-[12px] text-gray-700">{exp.role||exp.designation||''}</div></div>
                        <div className="text-right shrink-0"><div className="text-[12px] font-semibold text-gray-700">{exp.duration||exp.startDate||''}</div>{exp.years&&<div className="text-[11px] text-gray-500">{exp.years}</div>}</div>
                      </div>
                    </div>
                  )) : <div className="text-[13px] text-gray-400 italic pl-12">No experience details provided</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Education Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-[14px] font-bold text-gray-900 mb-5">Education</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
              {education.length > 0 ? education.map((edu,idx) => (
                <div key={idx}><h4 className="text-[13px] font-bold text-gray-900 mb-0.5">{edu.degree||edu.degreeName||'Degree'}</h4><div className="text-[11px] font-semibold text-gray-500 mb-0.5">{edu.year||edu.passingYear||edu.endYear||''}</div><div className="text-[12px] text-gray-700">{edu.institution||edu.schoolName||edu.college||''}</div></div>
              )) : <div className="text-[13px] text-gray-400 italic">No education details provided</div>}
            </div>
          </div>

          {/* CTA footer for public users */}
          <div className="mt-8 text-center bg-indigo-50 border border-indigo-100 rounded-2xl p-8">
            <h3 className="text-[16px] font-bold text-indigo-900 mb-2">Want to contact this professional?</h3>
            <p className="text-sm text-indigo-700 mb-5">Sign up as a recruiter to unlock contact details, download resumes, and manage hiring directly.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl shadow hover:bg-indigo-700 transition text-sm">
              Get Started
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
