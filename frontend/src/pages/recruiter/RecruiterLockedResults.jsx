import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiCheckCircle, FiLock, FiStar, FiMapPin, FiBriefcase, 
  FiDollarSign, FiUsers, FiTrendingUp, FiShield, FiChevronDown, 
  FiUploadCloud, FiMessageSquare, FiBookmark, FiArrowRight, FiX
} from 'react-icons/fi';
import DualVerificationModal from '../../components/common/DualVerificationModal';

import api from '../../services/api';

const RecruiterLockedResults = () => {
  const {
    t
  } = useTranslation();

  const location = useLocation();
  const navigate = useNavigate();
  const recruiterData = location.state?.recruiterData || {};

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock candidates exactly matching the design
  const mockCandidates = [
    { 
      id: 1, 
      role: 'UI/UX Designer', 
      match: 94, 
      experience: '5.5 Years', 
      location: 'Bangalore, India', 
      salary: '₹12 LPA', 
      currentCompany: 'Design Systems Inc', 
      skills: ['Figma', 'UI Design', 'Prototyping', 'User Research'],
      avatarId: '12',
      status: 'Active'
    },
    { 
      id: 2, 
      role: 'Product Designer', 
      match: 91, 
      experience: '6 Years', 
      location: 'Pune, India', 
      salary: '₹14 LPA', 
      currentCompany: 'Immediate Joiner', 
      skills: ['Figma', 'User Research', 'Design System', 'Wireframing'],
      avatarId: '32',
      status: '15 Days Notice'
    },
    { 
      id: 3, 
      role: 'Senior UI Developer', 
      match: 88, 
      experience: '7 Years', 
      location: 'Bangalore, India', 
      salary: '₹16 LPA', 
      currentCompany: 'Immediate Joiner', 
      skills: ['Figma', 'Adobe XD', 'Interaction', 'UI Design'],
      avatarId: '45',
      status: 'Active'
    },
  ];

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const { data } = await api.get('/search/providers?limit=3');
        if (data.success && data.providers && data.providers.length > 0) {
          const mapped = data.providers.slice(0, 3).map((p, idx) => ({
            id: p._id,
            role: p.user?.name || `Candidate ${idx+1}`,
            match: Math.floor(Math.random() * 15) + 80, // Mocking match score 80-95
            experience: p.totalExperience ? `${p.totalExperience} Years` : '5+ Years',
            location: p.city || 'India',
            salary: p.expectedSalary?.amount ? `₹${p.expectedSalary.amount / 100000} LPA` : '₹12 LPA',
            currentCompany: p.employmentStatus || 'Active',
            skills: p.skills?.length > 0 ? p.skills.map(s => s.name || s).slice(0, 4) : mockCandidates[idx].skills,
            avatarId: p.user?.profilePhoto || String(idx * 10 + 12),
            status: p.noticePeriod?.status || 'Immediate Joiner',
            isReal: true,
            photo: p.user?.profilePhoto
          }));
          setCandidates(mapped);
        } else {
          setCandidates(mockCandidates);
        }
      } catch (err) {
        setCandidates(mockCandidates);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const StatBox = ({ icon: Icon, value, label, color }) => (
    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex-1">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-lg font-extrabold text-gray-900 leading-tight">{value}</h3>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pt-8 pb-32 font-sans">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="max-w-xl">
            <h1 className="text-[28px] md:text-[40px] font-bold text-[#081B3A] leading-tight tracking-tight">{t("Find the right talent,")}<br/>
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600">{t("faster and smarter")}</span>
            </h1>
            {/* <p className="text-[15px] font-medium text-gray-700 mt-3 leading-relaxed">
              Search from <strong>8.6M+ verified profiles</strong> and connect <br/>with the best candidates for your role.
            </p> */}
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-wrap lg:flex-nowrap gap-3 w-full lg:w-auto mt-4 lg:mt-0">
            <StatBox icon={FiUsers} value="8.6M+" label="Active Candidates" color="bg-purple-100 text-purple-600" />
            <StatBox icon={FiCheckCircle} value="92%" label="Match Accuracy" color="bg-indigo-100 text-indigo-600" />
            <StatBox icon={FiBriefcase} value="12K+" label="Companies Hiring" color="bg-blue-100 text-blue-600" />
            <StatBox icon={FiShield} value="100%" label="Safe & Trusted" color="bg-emerald-100 text-emerald-600" />
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column - Main Workspace (8 columns) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="flex flex-col sm:flex-row bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-sm font-semibold">
              <div className="flex-1 p-4 border-l-4 sm:border-l-0 sm:border-b-[3px] border-indigo-600 text-indigo-700 bg-indigo-50/30 flex flex-col items-start cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <FiSearch className="w-4 h-4" />
                  <span>{t("Search Candidates")}</span>
                </div>
                <div className="text-[11px] font-medium text-indigo-500 flex items-center gap-1">{t("Free Preview")}<span className="w-1 h-1 bg-gray-300 rounded-full mx-1"></span>{t("No Login Required")}</div>
              </div>
              
              <div onClick={() => setIsModalOpen(true)} className="flex-1 p-4 border-b border-gray-200 text-gray-700 hover:bg-gray-50 flex flex-col items-start cursor-pointer transition">
                <div className="flex items-center gap-2 mb-1">
                  <FiUploadCloud className="w-4 h-4" />
                  <span>{t("Upload JD / Requirement")}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold ml-1">{t("Login Required")}</span>
                </div>
                <div className="text-[11px] font-medium text-gray-500">{t("Unlock AI JD parsing & smart matching")}</div>
              </div>

              <div onClick={() => setIsModalOpen(true)} className="flex-1 p-4 border-b border-gray-200 text-gray-700 hover:bg-gray-50 flex flex-col items-start cursor-pointer transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-500 font-bold">✨</span>
                  <span>{t("Ask Luco AI")}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold ml-1">{t("Login Required")}</span>
                </div>
                <div className="text-[11px] font-medium text-gray-500">{t("Get AI hiring advice & insights")}</div>
              </div>
            </div>

            {/* Step 1: Search Candidates */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-gray-900">{t("1. Search Candidates")}</h2>
                <span className="text-sm font-medium text-gray-500">{t("(Free Preview)")}</span>
              </div>
              <p className="text-sm text-gray-700 mb-5">{t("Fill in the filters below to find the best matching candidates.")}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap lg:flex-nowrap gap-3 items-end opacity-80 pointer-events-none">
                <div className="w-full md:flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t("Skills / Keywords")}</label>
                  <div className="border border-gray-200 rounded-lg p-2 min-h-[42px] flex flex-wrap items-center gap-2 bg-white">
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium">{t("React")}<FiX className="w-3 h-3"/></span>
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium">{t("UI/UX")}<FiX className="w-3 h-3"/></span>
                  </div>
                </div>
                <div className="w-full sm:w-auto md:w-1/6">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t("Experience")}</label>
                  <div className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800">{t("3 - 7 Years")}</span>
                    <FiChevronDown className="text-gray-400" />
                  </div>
                </div>
                <div className="w-full sm:w-auto md:w-1/6">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t("Location")}</label>
                  <div className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800">{t("Bangalore")}</span>
                  </div>
                </div>
                <div className="w-full sm:w-auto md:w-1/6">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t("Salary Range")}</label>
                  <div className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800">{t("₹8 - ₹20 LPA")}</span>
                    <FiChevronDown className="text-gray-400" />
                  </div>
                </div>
                <button className="w-full sm:w-auto bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-lg h-[42px] flex items-center justify-center gap-2 hover:bg-indigo-700 whitespace-nowrap mt-2 sm:mt-0">
                  <FiSearch />{t("Search")}</button>
              </div>

              <div className="flex items-center gap-3 mt-5">
                <span className="text-xs font-bold text-gray-800">{t("Popular searches:")}</span>
                {['React Developer', 'UI/UX Designer', 'Python Developer', 'Product Manager'].map(s => (
                  <span key={s} className="text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>

            {/* Step 2: AI Progress UI */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="flex-1 w-full relative z-10">
                <h2 className="text-base font-bold text-gray-900 mb-6">{t("2. Luco AI is searching the best matches for you...")}</h2>
                <div className="flex items-center justify-between relative w-full overflow-x-auto pb-4 hide-scrollbar">
                  {/* Progress Line */}
                  <div className="absolute top-4 left-4 right-4 h-[2px] bg-emerald-100 z-0 min-w-[300px]"></div>
                  
                  {['Analyzing Profiles', 'Checking Skills', 'Checking Experience', 'Ranking Candidates', 'Finding Talent'].map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 relative z-10 min-w-[80px]">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white text-emerald-600 flex items-center justify-center shadow-sm">
                        <FiCheckCircle className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-semibold text-gray-700 text-center leading-tight">{step}</p>
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-2 relative z-10 min-w-[80px]">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-indigo-200 text-indigo-600 flex items-center justify-center shadow-sm animate-pulse">
                      <FiSearch className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-bold text-indigo-600 text-center leading-tight">{t("Best Matches Found")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 flex flex-col items-center justify-center min-w-[240px] relative z-10">
                <h3 className="text-sm font-bold text-purple-900 flex items-center gap-1">
                  <span className="text-purple-500">✨</span>{t("92 Best Matches Found!")}<span className="text-purple-500">✨</span>
                </h3>
                <p className="text-[11px] text-purple-700 mt-1 mb-3 text-center">{t("AI has found the most relevant candidates for your search.")}</p>
                <div className="flex -space-x-3">
                  {[4, 5, 6, 7, 8].map((num) => (
                    <div key={num} className="w-8 h-8 rounded-full border-2 border-white bg-gray-300 overflow-hidden blur-[1.5px]">
                      <img src={`https://i.pravatar.cc/100?img=${num}`} alt="Candidate" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center z-10">
                    <span className="text-[10px] font-bold text-purple-700">+86</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Candidates List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{t("3. Top Matching Candidates")}</h2>
                  <span className="text-sm font-medium text-gray-500">{t("(Free Preview)")}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                    <FiLock className="w-3 h-3" />{t("Sign up to unlock full profiles, contact details & more")}</span>
                  <div className="text-xs font-bold text-gray-700 flex items-center gap-1 cursor-pointer">{t("Sort by: Best Match")}<FiChevronDown />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="group border border-gray-200 rounded-xl p-5 relative overflow-hidden transition-all hover:border-indigo-300 hover:shadow-md bg-white">
                    
                    {/* Blurred Content Overlay (Hidden on Mobile) */}
                    <div className="hidden md:flex absolute inset-0 bg-white/30 backdrop-blur-[2.5px] z-10 items-center justify-end pr-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-xl hover:bg-indigo-700 transition flex items-center gap-2 transform hover:scale-105"
                      >
                        <FiLock className="w-4 h-4" />{t("Unlock Profile")}</button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 relative">
                      
                      {/* Avatar & Basic Info */}
                      <div className="flex gap-4 w-full md:w-[45%]">
                        <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden blur-[4px] border border-gray-300">
                          {candidate.isReal && candidate.photo ? (
                             <img src={candidate.photo} alt="User" className="w-full h-full object-cover" />
                          ) : (
                             <img src={`https://i.pravatar.cc/100?img=${candidate.avatarId}`} alt="User" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] font-extrabold text-emerald-600 mb-0.5">{candidate.match}{t("% Match")}</div>
                          <h3 className="font-bold text-gray-900 text-[15px] flex items-center gap-2">
                            {candidate.isReal ? candidate.role : 'Hidden Name'}
                            <FiCheckCircle className="text-blue-500 w-3.5 h-3.5" />
                          </h3>
                          <div className="flex items-center gap-3 text-[11px] font-medium text-gray-500 mt-1.5">
                            <span className="flex items-center gap-1"><FiBriefcase className="w-3 h-3"/>{t("Experience:")}{candidate.experience}</span>
                            <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3"/> {candidate.location}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {candidate.skills.map((s, i) => (
                              <span key={i} className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{s}</span>
                            ))}
                            {candidate.skills.length > 3 && <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">+{candidate.skills.length - 3}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Middle Col - Current Company */}
                      <div className="w-full md:w-[25%] flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t("Current Company")}</p>
                        <p className="font-semibold text-gray-800 text-sm">{candidate.currentCompany}</p>
                        <p className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {candidate.status}
                        </p>
                      </div>

                      {/* Right Col - Salary & CTA */}
                      <div className="w-full md:w-[30%] flex flex-col justify-center md:items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pr-2 md:pl-4 relative">
                        <button className="absolute top-4 md:top-0 right-0 text-gray-300 hover:text-indigo-600 transition">
                          <FiBookmark className="w-5 h-5" />
                        </button>
                        <div className="text-left md:text-right w-full mt-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t("Expected Salary")}</p>
                          <p className="font-extrabold text-gray-900 text-lg leading-none">{candidate.salary}</p>
                          <button onClick={() => setIsModalOpen(true)} className="text-[11px] font-bold text-indigo-600 mt-1 hover:underline">{t("View match details >")}</button>
                        </div>
                        <button 
                          onClick={() => setIsModalOpen(true)}
                          className="mt-4 w-full py-2 border-2 border-indigo-100 text-indigo-600 font-bold text-sm rounded-lg hover:bg-indigo-50 transition"
                        >{t("Unlock Profile")}</button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-bold text-sm flex items-center gap-1 mx-auto hover:bg-indigo-50 px-4 py-2 rounded-lg transition">{t("View More Matches")}<FiChevronDown />
                </button>
              </div>
            </div>

          </div>

          {/* Right Column - Sidebar (4 columns) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Login Promo */}
            <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-indigo-100">
                <FiShield className="text-indigo-600 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900 text-sm">{t("Login to unlock all AI features")}</h3>
                <p className="text-[11px] font-medium text-indigo-700 mt-1">{t("It's free and takes less than 30 seconds!")}</p>
              </div>
            </div>

            {/* Why Recruiters Choose */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-5">
                <span className="text-purple-500">✨</span>{t("Why recruiters choose Lucohire AI")}</h3>
              
              <div className="space-y-4">
                {[
                  { id: 1, title: 'AI Candidate Match', desc: 'Get the most relevant candidates ranked by AI', isNew: true },
                  { id: 2, title: 'Hidden Talent Discovery', desc: 'Find passive & hard-to-find candidates', isNew: true },
                  { id: 3, title: 'AI Hiring Health Score', desc: 'Know how your job will perform', isNew: true },
                  { id: 4, title: 'AI Salary Intelligence', desc: 'Market insights & smart salary suggestions', isNew: false },
                  { id: 5, title: 'Smart Shortlisting', desc: 'AI ranks & shortlists the best candidates', isNew: false },
                  { id: 6, title: 'AI Response Prediction', desc: 'Predict who will respond to your job', isNew: false },
                ].map((feature) => (
                  <div key={feature.id} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {feature.id}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 text-[12px]">{feature.title}</h4>
                        {feature.isNew && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{t("New")}</span>}
                      </div>
                      <p className="text-[10px] font-medium text-gray-500 mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <button onClick={() => setIsModalOpen(true)} className="text-xs font-bold text-indigo-600 mt-5 flex items-center gap-1 hover:underline">{t("See all 12 AI features")}<FiArrowRight />
              </button>
            </div>

            {/* Boost Promo */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 p-6">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
                <FiStar className="text-purple-600" fill="currentColor"/>{t("Boost Your Job & Get Better Results")}</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-white mx-auto flex items-center justify-center text-purple-600 mb-1 shadow-sm"><FiTrendingUp className="w-4 h-4"/></div>
                  <p className="text-[9px] font-bold text-gray-800 leading-tight">{t("Featured Job")}</p>
                  <p className="text-[8px] text-gray-500">{t("5x more visibility")}</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-white mx-auto flex items-center justify-center text-pink-600 mb-1 shadow-sm"><FiBriefcase className="w-4 h-4"/></div>
                  <p className="text-[9px] font-bold text-gray-800 leading-tight">{t("Featured Company")}</p>
                  <p className="text-[8px] text-gray-500">{t("Stand out brand")}</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-white mx-auto flex items-center justify-center text-orange-500 mb-1 shadow-sm"><FiUsers className="w-4 h-4"/></div>
                  <p className="text-[9px] font-bold text-gray-800 leading-tight">{t("Urgent Hiring")}</p>
                  <p className="text-[8px] text-gray-500">{t("Priority alerts")}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-indigo-700 transition shadow-md">{t("Boost Now →")}</button>
              <p className="text-[10px] text-center font-bold text-indigo-600 mt-3 cursor-pointer hover:underline">{t("View Boost Plans")}</p>
            </div>

            {/* Analytics Box */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 text-sm mb-4">{t("Job Performance Preview (AI)")}</h3>
              <p className="text-[11px] font-medium text-gray-500 mb-4">{t("Get AI predictions before you post")}</p>
              
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t("Expected Views")}</p>
                  <p className="text-xl font-extrabold text-gray-900">12,500</p>
                  <p className="text-[10px] font-bold text-emerald-500 mt-1">{t("High")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t("Expected Applications")}</p>
                  <p className="text-xl font-extrabold text-gray-900">148</p>
                  <p className="text-[10px] font-bold text-emerald-500 mt-1">{t("High")}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-gray-900">{t("Match Quality")}</p>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-emerald-600">92%</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">{t("Excellent")}</p>
                </div>
              </div>

              <button onClick={() => setIsModalOpen(true)} className="text-[11px] font-bold text-indigo-600 mt-4 hover:underline">{t("Check Hiring Health Score after login →")}</button>
            </div>

          </div>
        </div>

      </div>
      {/* Sticky Bottom Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-white border-t border-gray-200 py-3 px-4 hidden md:block">
          <div className="max-w-[1400px] mx-auto flex justify-between items-center">
            {[
              { icon: FiCheckCircle, text: "100% Verified Profiles", sub: "Manually & AI verified" },
              { icon: FiTrendingUp, text: "Real-time Database", sub: "Always fresh & updated" },
              { icon: FiSearch, text: "Smart Shortlisting", sub: "AI ranks best for you" },
              { icon: FiMessageSquare, text: "Direct Communication", sub: "Chat, Call & WhatsApp" },
              { icon: FiBookmark, text: "Save Searches", sub: "Manage pipeline" },
              { icon: FiShield, text: "Secure & Private", sub: "Your data is safe" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-900 leading-tight">{f.text}</p>
                  <p className="text-[9px] text-gray-500 leading-tight">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <DualVerificationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        recruiterData={recruiterData}
      />
    </div>
  );
};

export default RecruiterLockedResults;
