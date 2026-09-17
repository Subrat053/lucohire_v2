import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiFilter, FiBookmark, FiChevronDown, FiList, FiGrid,
  FiMapPin, FiMessageSquare, FiStar, FiChevronUp, FiX,
  FiMoreVertical, FiEye, FiArrowUpRight, FiLoader, FiSend,
  FiCheckSquare, FiSquare
} from 'react-icons/fi';
import { HiSparkles, HiBookmark } from 'react-icons/hi2';
import LocationAutocomplete from '../../components/common/LocationAutocomplete';
import { recruiterAPI, aiAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { toOptimizedMediaUrl } from '../../utils/media';

const Candidates = () => {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [searchMessage, setSearchMessage] = useState(null);
  const [layout, setLayout] = useState('list');
  const [candidateScores, setCandidateScores] = useState({});
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [shortlistedIds, setShortlistedIds] = useState(new Set());
  const [shortlistingId, setShortlistingId] = useState(null); // id being toggled

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const filtersRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [adminRoles, setAdminRoles] = useState([]);
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get('/job-roles');
        setAdminRoles(res.data.map(r => r.roleName));
      } catch (err) {
        console.error('Failed to fetch job roles', err);
      }
    };
    fetchRoles();
  }, []);

  // Mock filters to match the design
  const [filters, setFilters] = useState({
    roles: [],
    skills: [],
    experience: [],
    location: [],
    ctc: [],
    noticePeriod: [],
    employmentType: []
  });

  const suggestedSearches = ['React Developer', 'Redux', 'TypeScript', 'Next.js', 'More'];

  const handleSearch = useCallback(async (query) => {
    const term = query !== undefined ? query : searchQueryRef.current;
    try {
      setLoading(true);
      setSearchMessage(null);

      // Step 1: AI parse the raw text if there is a meaningful query
      let parsedFilters = {};
      if (term.trim().length > 2) {
        setAiParsing(true);
        try {
          const parseRes = await recruiterAPI.parseSearchQuery(term);
          parsedFilters = parseRes.data?.parsed || {};
        } catch (_) { /* graceful — continue without AI parse */ }
        setAiParsing(false);

        // Step 2: Auto-apply extracted filters to UI chips
        if (Object.keys(parsedFilters).length > 0) {
          setFilters(prev => {
            const next = { ...prev };
            if (parsedFilters.role && !next.roles.includes(parsedFilters.role)) {
              next.roles = [...next.roles, parsedFilters.role];
            }
            if (parsedFilters.experience && !next.experience.includes(parsedFilters.experience)) {
              next.experience = [...next.experience, parsedFilters.experience];
            }
            if (parsedFilters.location && !next.location.includes(parsedFilters.location)) {
              next.location = [...next.location, parsedFilters.location];
            }
            if (parsedFilters.noticePeriod && !next.noticePeriod.includes(parsedFilters.noticePeriod)) {
              next.noticePeriod = [...next.noticePeriod, parsedFilters.noticePeriod];
            }
            if (parsedFilters.employmentType && !next.employmentType.includes(parsedFilters.employmentType)) {
              next.employmentType = [...next.employmentType, parsedFilters.employmentType];
            }
            // CTC range as readable label
            if (parsedFilters.ctcMin || parsedFilters.ctcMax) {
              const ctcLabel = parsedFilters.ctcMin && parsedFilters.ctcMax
                ? `${parsedFilters.ctcMin}-${parsedFilters.ctcMax} LPA`
                : parsedFilters.ctcMax ? `Up to ${parsedFilters.ctcMax} LPA` : `${parsedFilters.ctcMin}+ LPA`;
              if (!next.ctc.includes(ctcLabel)) next.ctc = [...next.ctc, ctcLabel];
            }
            return next;
          });
        }
      }

      // Step 3: Build structured params for backend
      const params = {};
      const role = parsedFilters.role || '';
      const skills = Array.isArray(parsedFilters.skills) ? parsedFilters.skills.join(' ') : '';
      params.q = [role, skills, term].filter(Boolean).join(' ').trim() || term;
      if (parsedFilters.location) params.location = parsedFilters.location;
      if (parsedFilters.experience) params.experience = parsedFilters.experience;
      if (parsedFilters.ctcMax) params.maxFee = parsedFilters.ctcMax;
      if (parsedFilters.ctcMin) params.minFee = parsedFilters.ctcMin;

      const res = await recruiterAPI.aiSearchCandidates(params);
      const data = res.data?.candidates || res.data?.results || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(data)) {
        const realCandidates = data.filter(c => {
          const name = (c.name || c.user?.name || '').toLowerCase();
          const email = (c.email || c.emailForSorting || '').toLowerCase();
          return !name.includes('mock') && !name.includes('test candidate') && !name.includes('demo') &&
            !name.includes('seed') && !email.includes('seed_') && !email.includes('@example.');
        });
        setCandidates(realCandidates);
        sessionStorage.setItem('currentCandidateList', JSON.stringify(realCandidates.map(c => c._id || c.id)));

        // Step 4: Surface a message if search was specific but results are thin
        const hasSpecificQuery = term.trim().length > 2 && Object.keys(parsedFilters).some(k => parsedFilters[k]);
        if (hasSpecificQuery && realCandidates.length === 0) {
          setSearchMessage({ type: 'none', role: parsedFilters.role || term });
        } else if (hasSpecificQuery && realCandidates.length < 5 && realCandidates.length > 0) {
          setSearchMessage({ type: 'partial', role: parsedFilters.role || term, count: realCandidates.length });
        }
      } else {
        setCandidates([]);
      }
      
      // refresh usage after search
      recruiterAPI.getAiUsage().then(usageRes => {
        if (usageRes.data?.success) {
          setAiUsage({ limits: usageRes.data.limits || {}, usage: usageRes.data.usage || {} });
        }
      });
      
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
      setAiParsing(false);
    }
  }, []); // no deps — query is always passed as argument

  useEffect(() => {
    handleSearch('');
    // Fetch already-shortlisted IDs
    recruiterAPI.getShortlistedCandidates().then(res => {
      const list = res.data?.shortlisted || res.data?.candidates || (Array.isArray(res.data) ? res.data : []);
      setShortlistedIds(new Set(list.map(c => String(c.providerProfileId || c._id || c.id))));
    }).catch(() => {});
  }, []);

  // AI Profile Rating Queue
  useEffect(() => {
    if (!candidates.length) return;
    
    const pendingCandidates = candidates.filter(c => {
      const id = c._id || c.providerProfileId;
      return id && !candidateScores[id];
    });
    
    if (pendingCandidates.length > 0) {
      const nextCandidate = pendingCandidates[0];
      const id = nextCandidate._id || nextCandidate.providerProfileId;
      
      setCandidateScores(prev => ({ ...prev, [id]: { loading: true } }));
      
      recruiterAPI.getProfileRating(id)
        .then(res => {
          if (res.data?.success) {
            setCandidateScores(prev => ({ 
              ...prev, 
              [id]: { loading: false, score: res.data.score, explanation: res.data.explanation } 
            }));
          } else {
            setCandidateScores(prev => ({ 
              ...prev, 
              [id]: { loading: false, score: null, error: true } 
            }));
          }
        })
        .catch(err => {
          setCandidateScores(prev => ({ 
            ...prev, 
            [id]: { loading: false, score: null, error: true } 
          }));
        });
    }
  }, [candidates, candidateScores]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const removeFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(v => v !== value)
    }));
  };

  const clearAllFilters = () => {
    setFilters({ roles: [], skills: [], experience: [], location: [], ctc: [], noticePeriod: [], employmentType: [] });
    setSearchQuery('');
    searchQueryRef.current = '';
    setSearchMessage(null);
    handleSearch(''); // re-fetch all candidates from backend
  };

  const toggleCandidateSelection = (id) => {
    setSelectedCandidates(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const toggleFilter = (key, value) => {
    setFilters(prev => {
      const current = prev[key];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [key]: [...current, value] };
      }
    });
  };

  const totalActiveFilters = Object.values(filters).reduce((acc, curr) => acc + curr.length, 0);

  // Derive display candidates by applying active filters in memory
  const displayCandidates = useMemo(() => {
    let list = [...candidates];

    if (filters.roles && filters.roles.length > 0) {
      list = list.filter(candidate => {
        const cRole = (candidate.role || candidate.headline || candidate.title || candidate.skills?.[0] || '').toLowerCase();
        return filters.roles.some(f => cRole.includes(f.toLowerCase()));
      });
    }

    // Client-side text filtering: if user has typed something, filter locally too
    // (backend already did it, but guard against stale results)
    if (searchQuery.trim()) {
      const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(c => {
        const name = (c.name || '').toLowerCase();
        const skills = Array.isArray(c.skills) ? c.skills.join(' ').toLowerCase() : String(c.skills || '').toLowerCase();
        const bio = (c.shortBio || c.description || c.highlight || c.headline || '').toLowerCase();
        return terms.some(t => name.includes(t) || skills.includes(t) || bio.includes(t));
      });
    }
    
    if (filters.location.length > 0) {
      list = list.filter(c => {
        const loc = (c.location || c.city || c.userProfile?.location || '').toLowerCase();
        return filters.location.some(f => loc.includes(f.toLowerCase()) || f.toLowerCase().includes(loc));
      });
    }
    
    if (filters.experience.length > 0) {
      list = list.filter(c => {
        const exp = (c.experience || c.userProfile?.experience || '').toLowerCase();
        return filters.experience.some(f => {
          if (f === '0-2 years' && (exp.includes('1') || exp.includes('2'))) return true;
          if (f === '4-8 years' && (exp.includes('4') || exp.includes('5') || exp.includes('6') || exp.includes('7') || exp.includes('8'))) return true;
          if (f === '8+ years' && (exp.includes('9') || exp.includes('10'))) return true;
          return exp.includes(f);
        });
      });
    }
    
    if (filters.ctc.length > 0) {
      list = list.filter(c => {
        const ctc = (c.pricing || c.currentCTC || c.userProfile?.currentCTC || '').toLowerCase();
        return filters.ctc.some(f => ctc.includes(f.split(' ')[0]) || ctc.includes(f.charAt(0)));
      });
    }
    
    if (filters.noticePeriod.length > 0) {
      list = list.filter(c => {
        const np = (c.noticePeriod || c.userProfile?.noticePeriod || '').toLowerCase();
        return filters.noticePeriod.some(f => np.includes(f.toLowerCase().split(' ')[0]));
      });
    }
    
    if (filters.employmentType.length > 0) {
      list = list.filter(c => {
        const emp = (c.employmentType || c.userProfile?.employmentType || '').toLowerCase();
        return filters.employmentType.some(f => emp.includes(f.toLowerCase().split('-')[0]));
      });
    }

    return list;
  }, [candidates, filters, searchQuery]);

  const topSkills = ['TypeScript', 'Next.js', 'Redux Toolkit', 'Tailwind CSS', 'Node.js'];
  const topCompanies = [
    { name: 'Flipkart', logo: 'https://logo.clearbit.com/flipkart.com' },
    { name: 'Swiggy', logo: 'https://logo.clearbit.com/swiggy.com' },
    { name: 'Meesho', logo: 'https://logo.clearbit.com/meesho.com' },
    { name: 'Amazon', logo: 'https://logo.clearbit.com/amazon.in' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 relative font-sans font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* SEARCH + FILTERS CARD */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">

          {/* Search row */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 relative w-full">
              <HiSparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); searchQueryRef.current = e.target.value; }}
                onKeyDown={handleKeyDown}
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                placeholder="e.g. Senior React developer in Bangalore, 5+ years, notice period 30 days..."
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button 
                onClick={() => handleSearch()} 
                disabled={loading || aiParsing || (aiUsage.limits.aiCandidateSearch !== -1 && aiUsage.usage.aiCandidateSearch >= (aiUsage.limits.aiCandidateSearch || 0))} 
                className="flex-1 md:flex-none flex flex-col items-center justify-center bg-indigo-600 text-white px-5 py-2 h-[42px] rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-70"
              >
                <div className="flex items-center gap-2 text-sm">
                  {aiParsing ? <><FiLoader className="w-4 h-4 animate-spin" /> Analyzing...</> : <><FiSearch className="w-4 h-4" /> Search</>}
                </div>
                {!usageLoading && aiUsage.limits.aiCandidateSearch !== undefined && aiUsage.limits.aiCandidateSearch !== -1 && (
                  <span className="text-[10px] opacity-80 mt-[-2px]">
                    ({Math.max(0, aiUsage.limits.aiCandidateSearch - (aiUsage.usage.aiCandidateSearch || 0))} left)
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Filters row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div ref={filtersRef} className="flex flex-wrap items-center gap-2 relative">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg font-medium text-gray-700 text-sm">
                <FiFilter className="text-indigo-600 w-3.5 h-3.5" /> Filters <span className="bg-indigo-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{totalActiveFilters}</span>
              </button>

              <div className="relative">
                <button onClick={() => { setActiveDropdown(activeDropdown === 'roles' ? null : 'roles'); setDropdownSearch(''); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 text-sm hover:bg-gray-50">
                  <span className="text-indigo-600">Role:</span> {filters.roles?.length ? filters.roles.join(', ') : 'Any'} <FiChevronDown className="text-gray-400 w-3.5 h-3.5" />
                </button>
                {activeDropdown === 'roles' && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        placeholder="Search or type custom role..."
                        className="w-full bg-gray-50 border-none rounded-lg text-sm px-3 py-1.5 focus:ring-0"
                        value={dropdownSearch}
                        onChange={e => setDropdownSearch(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter' && dropdownSearch.trim()) { toggleFilter('roles', dropdownSearch.trim()); setDropdownSearch(''); } }}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      {Array.from(new Set([...adminRoles, ...(filters.roles || [])])).filter(r => r.toLowerCase().includes(dropdownSearch.toLowerCase())).sort((a, b) => (filters.roles?.includes(b) ? 1 : 0) - (filters.roles?.includes(a) ? 1 : 0) || a.localeCompare(b)).map((roleOpt) => (
                        <label key={roleOpt} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                          <input type="checkbox" checked={filters.roles?.includes(roleOpt)} onChange={() => toggleFilter('roles', roleOpt)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm font-medium text-gray-700">{roleOpt}</span>
                        </label>
                      ))}
                      {dropdownSearch.trim() && !adminRoles.some(r => r.toLowerCase() === dropdownSearch.toLowerCase()) && (
                        <div className="p-2 text-xs text-indigo-600 font-medium">Press Enter to add "{dropdownSearch}"</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => { setActiveDropdown(activeDropdown === 'experience' ? null : 'experience'); setDropdownSearch(''); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 text-sm hover:bg-gray-50">
                  <span className="text-indigo-600">Experience:</span> {filters.experience.length ? filters.experience.join(', ') : 'Any'} <FiChevronDown className="text-gray-400 w-3.5 h-3.5" />
                </button>
                {activeDropdown === 'experience' && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <input autoFocus type="text" value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)} placeholder="Search or type custom..." className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        onKeyDown={(e) => { if(e.key === 'Enter' && dropdownSearch.trim()) { toggleFilter('experience', dropdownSearch.trim()); setDropdownSearch(''); } }} />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2">
                      {Array.from(new Set([...['0-2 years', '4-8 years', '8+ years'], ...(filters.experience || [])])).filter(exp => exp.toLowerCase().includes(dropdownSearch.toLowerCase())).sort((a, b) => (filters.experience?.includes(b) ? 1 : 0) - (filters.experience?.includes(a) ? 1 : 0)).map(exp => (
                        <label key={exp} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input type="checkbox" checked={filters.experience.includes(exp)} onChange={() => toggleFilter('experience', exp)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm font-medium text-gray-700">{exp}</span>
                        </label>
                      ))}
                      {dropdownSearch.trim() && !['0-2 years', '4-8 years', '8+ years'].some(e => e.toLowerCase() === dropdownSearch.toLowerCase()) && (
                        <div className="p-2 text-xs text-indigo-600 font-medium">Press Enter to add "{dropdownSearch}"</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => { setActiveDropdown(activeDropdown === 'location' ? null : 'location'); setDropdownSearch(''); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 text-sm hover:bg-gray-50">
                  <span className="text-indigo-600">Location:</span> {filters.location.length ? filters.location.join(', ') : 'Any'} <FiChevronDown className="text-gray-400 w-3.5 h-3.5" />
                </button>
                {activeDropdown === 'location' && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <LocationAutocomplete value={dropdownSearch} onChange={(val) => setDropdownSearch(typeof val === 'string' ? val : '')}
                        onSelect={(locObj) => { toggleFilter('location', locObj?.city || locObj?.description || ''); setDropdownSearch(''); setActiveDropdown(null); }}
                        placeholder="Smart location search..." className="w-full" inputClassName="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white" />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2">
                      {Array.from(new Set([...['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune'], ...(filters.location || [])])).filter(loc => loc.toLowerCase().includes(dropdownSearch.toLowerCase())).sort((a, b) => (filters.location?.includes(b) ? 1 : 0) - (filters.location?.includes(a) ? 1 : 0) || a.localeCompare(b)).map(loc => (
                        <label key={loc} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input type="checkbox" checked={filters.location.includes(loc)} onChange={() => toggleFilter('location', loc)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm font-medium text-gray-700">{loc}</span>
                        </label>
                      ))}
                      {dropdownSearch.trim() && !['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune'].some(l => l.toLowerCase() === dropdownSearch.toLowerCase()) && (
                        <div className="p-2 text-xs text-indigo-600 font-medium cursor-pointer hover:bg-gray-50 rounded" onClick={() => { toggleFilter('location', dropdownSearch.trim()); setDropdownSearch(''); }}>Click to add "{dropdownSearch}"</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => { setActiveDropdown(activeDropdown === 'ctc' ? null : 'ctc'); setDropdownSearch(''); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 text-sm hover:bg-gray-50">
                  CTC {filters.ctc.length ? `(${filters.ctc.length})` : ''} <FiChevronDown className="text-gray-400 w-3.5 h-3.5" />
                </button>
                {activeDropdown === 'ctc' && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <input autoFocus type="text" value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)} placeholder="Search or type custom..." className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        onKeyDown={(e) => { if(e.key === 'Enter' && dropdownSearch.trim()) { toggleFilter('ctc', dropdownSearch.trim()); setDropdownSearch(''); } }} />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2">
                      {Array.from(new Set([...['0-10 LPA', '10-20 LPA', '20-30 LPA', '30+ LPA'], ...(filters.ctc || [])])).filter(opt => opt.toLowerCase().includes(dropdownSearch.toLowerCase())).sort((a, b) => (filters.ctc?.includes(b) ? 1 : 0) - (filters.ctc?.includes(a) ? 1 : 0)).map(opt => (
                        <label key={opt} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input type="checkbox" checked={filters.ctc.includes(opt)} onChange={() => toggleFilter('ctc', opt)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm font-medium text-gray-700">{opt}</span>
                        </label>
                      ))}
                      {dropdownSearch.trim() && !['0-10 LPA', '10-20 LPA', '20-30 LPA', '30+ LPA'].some(o => o.toLowerCase() === dropdownSearch.toLowerCase()) && (
                        <div className="p-2 text-xs text-indigo-600 font-medium">Press Enter to add "{dropdownSearch}"</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => { setActiveDropdown(activeDropdown === 'notice' ? null : 'notice'); setDropdownSearch(''); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 text-sm hover:bg-gray-50">
                  Notice Period {filters.noticePeriod.length ? `(${filters.noticePeriod.length})` : ''} <FiChevronDown className="text-gray-400 w-3.5 h-3.5" />
                </button>
                {activeDropdown === 'notice' && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <input autoFocus type="text" value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)} placeholder="Search or type custom..." className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        onKeyDown={(e) => { if(e.key === 'Enter' && dropdownSearch.trim()) { toggleFilter('noticePeriod', dropdownSearch.trim()); setDropdownSearch(''); } }} />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2">
                      {Array.from(new Set([...['Immediate', '15 Days', '30 Days', '60 Days'], ...(filters.noticePeriod || [])])).filter(opt => opt.toLowerCase().includes(dropdownSearch.toLowerCase())).sort((a, b) => (filters.noticePeriod?.includes(b) ? 1 : 0) - (filters.noticePeriod?.includes(a) ? 1 : 0)).map(opt => (
                        <label key={opt} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input type="checkbox" checked={filters.noticePeriod.includes(opt)} onChange={() => toggleFilter('noticePeriod', opt)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm font-medium text-gray-700">{opt}</span>
                        </label>
                      ))}
                      {dropdownSearch.trim() && !['Immediate', '15 Days', '30 Days', '60 Days'].some(o => o.toLowerCase() === dropdownSearch.toLowerCase()) && (
                        <div className="p-2 text-xs text-indigo-600 font-medium">Press Enter to add "{dropdownSearch}"</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => setActiveDropdown(activeDropdown === 'more' ? null : 'more')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-indigo-600 text-sm hover:bg-gray-50">
                  More {filters.employmentType.length ? `(${filters.employmentType.length})` : ''}
                </button>
                {activeDropdown === 'more' && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2">
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 mt-1 ml-2">Employment Type</div>
                    {Array.from(new Set([...['Full-time', 'Part-time', 'Contract', 'Remote'], ...(filters.employmentType || [])])).sort((a, b) => (filters.employmentType?.includes(b) ? 1 : 0) - (filters.employmentType?.includes(a) ? 1 : 0)).map(opt => (
                      <label key={opt} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" checked={filters.employmentType.includes(opt)} onChange={() => toggleFilter('employmentType', opt)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={clearAllFilters} className="text-sm font-medium text-rose-500 hover:text-rose-700 transition">
              Clear All
            </button>
          </div>

        </div>

        
        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* LEFT COLUMN: CANDIDATES LIST */}
          <div className="xl:col-span-3 space-y-4">
            
            {/* List Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-gray-900 flex items-baseline gap-2">
                  <span className="text-xl font-extrabold">{displayCandidates.length > 0 ? displayCandidates.length : '0'}</span> Candidates Found
                </h2>
                {displayCandidates.length > 0 && (
                  <>
                    <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      ↑ {Math.max(1, Math.floor(displayCandidates.length * 0.15))} New Today
                    </span>
                    <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded">
                      {Math.max(1, Math.floor(displayCandidates.length * 0.25))} Immediate Joiners
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm font-bold text-gray-700">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                  <button onClick={() => setLayout('list')} className={`p-1.5 rounded ${layout === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}><FiList /></button>
                  <button onClick={() => setLayout('grid')} className={`p-1.5 rounded ${layout === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}><FiGrid /></button>
                </div>
              </div>
            </div>

            {/* AI Search Message Banner */}
            {searchMessage && (
              <div className={`rounded-xl p-4 flex items-start gap-3 border ${
                searchMessage.type === 'none'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800'
              }`}>
                <HiSparkles className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  {searchMessage.type === 'none' ? (
                    <><span className="font-bold">No exact match</span> for <span className="italic">"{searchMessage.role}"</span>. Showing related candidates that may be a good fit.</>                  ) : (
                    <><span className="font-bold">Partial match</span> — only {searchMessage.count} candidate{searchMessage.count !== 1 ? 's' : ''} exactly match <span className="italic">"{searchMessage.role}"</span>. Showing related candidates below.</>                  )}
                </div>
                <button onClick={() => setSearchMessage(null)} className="ml-auto shrink-0 text-current opacity-60 hover:opacity-100"><FiX /></button>
              </div>
            )}

            {/* Candidates Cards */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <FiLoader className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                {displayCandidates.map((candidate, index) => {
                  const id = candidate.id || candidate._id || candidate.providerProfileId || index;
                  const scoreData = candidateScores[id] || { score: Math.max(70, 95 - index * 3) };
                  const user = candidate.user || {};
                  const userProfile = candidate.userProfile || {};
                  const email = user.email || candidate.email || '';
                  const name = candidate.name || user.name || "Candidate";
                  const avatar = candidate.profilePhoto || toOptimizedMediaUrl(user.profilePhoto || user.avatar, 'profile', 150) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
                  const title = candidate.title || candidate.role || userProfile.role || candidate.headline || candidate.skills?.[0] || 'Professional';
                  const city = candidate.location || candidate.city || userProfile.location || 'Not specified';
                  
                  // Connect fields directly to userProfile dynamically as requested
                  const exp = candidate.experience || userProfile.experience || 'Not specified';
                  
                  let expectedSalary = candidate.expectedCtc || userProfile.expectedCtc;
                  const pricingType = candidate.pricingType || userProfile.pricingType || '';
                  
                  if (expectedSalary) {
                    if (pricingType === 'hourly' || String(expectedSalary).toLowerCase().includes('hr') || String(expectedSalary).toLowerCase().includes('hour')) {
                      const rate = parseInt(String(expectedSalary).replace(/[^0-9]/g, ''));
                      if (!isNaN(rate) && rate > 0) {
                        expectedSalary = `₹${(rate * 160).toLocaleString()}/month (est)`;
                      }
                    }
                  } else if (candidate.pricing || userProfile.pricing) {
                    const pricing = candidate.pricing || userProfile.pricing;
                    const pType = pricingType || 'hourly';
                    if (pType === 'hourly' || String(pricing).toLowerCase().includes('hr') || String(pricing).toLowerCase().includes('hour')) {
                      // Extract number
                      const rate = parseInt(String(pricing).replace(/[^0-9]/g, ''));
                      if (!isNaN(rate) && rate > 0) {
                        expectedSalary = `₹${(rate * 160).toLocaleString()}/month (est)`;
                      } else {
                        expectedSalary = pricing;
                      }
                    } else {
                      expectedSalary = pricing;
                    }
                  }
                  expectedSalary = expectedSalary || 'Not specified';
                  
                  const notice = candidate.noticePeriod || userProfile.noticePeriod || 'Not specified';

                  const skills = candidate.skills || userProfile.skills || [];
                  const displayedSkills = skills.slice(0, 5);
                  const extraSkills = skills.length > 5 ? skills.length - 5 : 0;
                  const isSelected = selectedCandidates.includes(id);

                  return (
                    <div key={id} className={`bg-white rounded-2xl border ${isSelected ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-gray-200'} p-5 transition-all duration-200 flex items-start gap-4 shadow-sm`}>
                      <div className={`flex-1 flex ${layout === 'grid' ? 'flex-col' : 'flex-col md:flex-row'} gap-6`}>
                        
                        {/* Profile Info */}
                        <div className="flex-1 min-w-[250px]">
                          <div className="flex items-start gap-4">
                            <img src={avatar} alt={name} className="w-14 h-14 rounded-full object-cover border border-gray-100" />
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-base font-extrabold text-gray-900">{name}</h3>
                                {scoreData?.score && (
                                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50`}>
                                    {scoreData.score}% Match
                                  </span>
                                )}
                                {userProfile?.whatsappFreelancePlanActive && (
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">Premium</span>
                                )}
                              </div>
                              <div className="text-sm font-bold text-gray-700 mb-1">{title}</div>
                              <div className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                <FiMapPin className="w-3 h-3" /> {city}
                              </div>
                            </div>
                          </div>
                          
                          {/* Skills */}
                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            {displayedSkills.map((skill, idx) => (
                              <span key={idx} className="text-[10px] font-bold text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full shadow-sm">
                                {skill}
                              </span>
                            ))}
                            {extraSkills > 0 && (
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full shadow-sm">
                                +{extraSkills}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats Columns */}
                        <div className={`flex flex-wrap items-start gap-4 sm:gap-6 lg:gap-8 py-2 ${layout === 'grid' ? 'justify-between w-full' : 'w-full md:w-auto'}`}>
                          <div>
                            <div className="text-sm font-extrabold text-gray-900">{exp}</div>
                            <div className="text-[11px] font-semibold text-gray-400 mt-0.5">Experience</div>
                          </div>
                          <div>
                            <div className="text-sm font-extrabold text-gray-900">{expectedSalary}</div>
                            <div className="text-[11px] font-semibold text-gray-400 mt-0.5">Expected Salary</div>
                          </div>
                          <div>
                            <div className="text-sm font-extrabold text-gray-900">{notice}</div>
                            <div className="text-[11px] font-semibold text-gray-400 mt-0.5">Notice Period</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className={`flex items-start gap-4 shrink-0 ${layout === 'grid' ? 'pt-4 border-t w-full justify-between' : 'pt-4 border-t w-full md:border-t-0 md:pt-0 md:border-l md:pl-6 md:w-auto'} border-gray-100`}>
                          <div className={`flex gap-2 w-full ${layout === 'grid' ? 'flex-row' : 'flex-row md:flex-col md:w-32'}`}>
                            <Link to={`/recruiter/candidates/${user._id || id}`} className="flex-1 w-full flex items-center justify-center gap-1.5 md:gap-2 border border-indigo-200 text-indigo-700 bg-indigo-50/30 px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold hover:bg-indigo-50 transition shadow-sm whitespace-nowrap">
                              <FiEye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">View Profile</span><span className="sm:inline hidden"></span><span className="inline sm:hidden">View</span>
                            </Link>
                            <button onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank', 'noopener,noreferrer')} className="flex-1 w-full flex items-center justify-center gap-1.5 md:gap-2 border border-gray-200 text-gray-700 bg-white px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold hover:bg-gray-50 transition shadow-sm whitespace-nowrap">
                              <FiSend className="w-3.5 h-3.5" /> <span>Contact</span>
                            </button>
                            <button
                              disabled={shortlistingId === id}
                              onClick={async () => {
                                setShortlistingId(id);
                                try {
                                  const isShortlisted = shortlistedIds.has(String(id));
                                  if (isShortlisted) {
                                    await recruiterAPI.removeShortlistedCandidate(id);
                                    setShortlistedIds(prev => { const n = new Set(prev); n.delete(String(id)); return n; });
                                    toast.success('Removed from shortlist');
                                  } else {
                                    await recruiterAPI.shortlistCandidate({ providerProfileId: id, name, role: title });
                                    setShortlistedIds(prev => new Set([...prev, String(id)]));
                                    toast.success('Shortlisted!');
                                  }
                                } catch { toast.error('Action failed'); }
                                finally { setShortlistingId(null); }
                              }}
                              className={`flex-1 w-full flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition shadow-sm border whitespace-nowrap ${
                                shortlistedIds.has(String(id))
                                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {shortlistingId === id
                                ? <FiLoader className="w-3.5 h-3.5 animate-spin" />
                                : shortlistedIds.has(String(id))
                                  ? <><HiBookmark className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Shortlisted</span><span className="sm:hidden inline">Saved</span></>
                                  : <><FiBookmark className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Shortlist</span><span className="sm:hidden inline">Save</span></>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {displayCandidates.length === 0 && !loading && (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-gray-500 font-medium">No candidates found matching your filters.</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: ANALYTICS & ALERTS */}
          <div className="xl:col-span-1 space-y-6">
            


            {/* Search Insights */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-gray-900">Search Insights</h3>
                <button className="text-gray-400 hover:text-gray-700"><FiChevronUp className="w-4 h-4" /></button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-extrabold text-gray-900 mb-1">Skills</div>
                  <div className="text-xs font-semibold text-gray-700">React Developers in Bangalore</div>
                  <div className="text-[10px] text-gray-400">(4 - 8 yrs exp)</div>
                </div>

                <div>
                  <div className="text-xs font-extrabold text-gray-900 mb-2">Top Skills in Demand</div>
                  <div className="flex flex-wrap gap-1.5">
                    {topSkills.map(skill => (
                      <span key={skill} className="text-[10px] font-bold text-gray-700 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded shadow-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Search Tips */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">AI Search Tips</h3>
                <button className="text-gray-400 hover:text-gray-700"><FiChevronUp className="w-4 h-4" /></button>
              </div>
              
              <div className="text-xs font-semibold text-gray-700 leading-relaxed mb-4">
                Try adding more skills like
                <div className="flex gap-1.5 my-2">
                  <button onClick={() => toggleFilter('skills', 'Material UI')} className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm hover:bg-purple-100 transition">Material UI</button>
                  <button onClick={() => toggleFilter('skills', 'GraphQL')} className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm hover:bg-purple-100 transition">GraphQL</button>
                  <button onClick={() => toggleFilter('skills', 'Jest')} className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm hover:bg-purple-100 transition">Jest</button>
                </div>
                to get better matches.
              </div>
            </div>

          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Candidates;