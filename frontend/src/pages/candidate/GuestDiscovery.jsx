import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiUploadCloud, FiShield, FiUpload, FiCheckCircle, FiLock } from 'react-icons/fi';
import { BiBuildingHouse } from 'react-icons/bi';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import CountryPhoneInput from '../../components/common/CountryPhoneInput';

const GuestDiscovery = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [otherExperience, setOtherExperience] = useState('');
  const [jobRoles, setJobRoles] = useState([]);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [focusedRoleIndex, setFocusedRoleIndex] = useState(-1);
  const fileInputRef = useRef(null);
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get('/job-roles');
        if (res.data && res.data.length > 0) {
          setJobRoles(res.data.map(r => r.roleName));
        } else {
          setJobRoles([]);
        }
      } catch (err) {
        console.error('Error fetching job roles:', err);
        setJobRoles([]);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState({
    emailId: '',
    countryCode: '+91',
    nationalNumber: '',
    phone: '',
    role: location.state?.formData?.skills || '',
    experience: ''
  });

  const handlePhoneChange = (phoneData) => {
    setFormData((prev) => ({
      ...prev,
      phone: phoneData.fullPhone,
      countryCode: phoneData.countryCode,
      nationalNumber: phoneData.nationalNumber,
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const parseResumeFile = async (droppedFile) => {
    if (!droppedFile) return;
    setFile(droppedFile);
    setIsParsing(true);
    toast.success('Parsing resume to pre-fill details...');

    try {
      const data = new FormData();
      data.append('resume', droppedFile);

      const response = await api.post('/jobs/guest-resume/parse', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });

      if (response.data?.success && response.data?.data) {
        // pipelineResult.data wraps the actual payload in another 'data' property
        const resultWrapper = response.data.data;
        const parsed = resultWrapper.data || resultWrapper;
        
        console.log("Parsed Resume Data:", parsed);
        const updatedData = {
          ...formData,
          emailId: parsed.email || parsed.emailId || formData.emailId,
          phone: parsed.contactNumber || parsed.phone || formData.phone,
          nationalNumber: (parsed.contactNumber || parsed.phone)?.replace(/\D/g, '') || formData.nationalNumber,
          role: parsed.skills?.length ? parsed.skills.join(', ') : formData.role,
          experience: (parsed.experienceYears !== null && parsed.experienceYears !== undefined) ? getExperienceCategory(parsed.experienceYears) : formData.experience,
          resumeScore: resultWrapper.profile_strength_score || resultWrapper.confidence_score || 85
        };
        setFormData(updatedData);
        toast.success('Resume parsed successfully! Redirecting...');
        
        // Auto-redirect
        setTimeout(() => {
          navigate('/unlock-matches', { state: { file: droppedFile, formData: updatedData } });
        }, 500);
      }
    } catch (error) {
      console.error('Resume Parse Error:', error);
      toast.error('Failed to parse resume automatically. Please enter details manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const getExperienceCategory = (years) => {
    const y = parseFloat(years);
    if (isNaN(y)) return '';
    if (y <= 1) return '0-1';
    if (y <= 3) return '1-3';
    if (y <= 5) return '3-5';
    if (y <= 8) return '5-8';
    return 'Other';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    parseResumeFile(droppedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    parseResumeFile(selectedFile);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'role') {
      setFocusedRoleIndex(-1);
    }
  };

  const handleRoleKeyDown = (e) => {
    const filteredRoles = jobRoles.filter(r => r.toLowerCase().includes((formData.role || '').toLowerCase()));
    if (!isRoleDropdownOpen) {
      if (e.key === 'ArrowDown') {
        setIsRoleDropdownOpen(true);
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRoleIndex(prev => (prev < filteredRoles.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRoleIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedRoleIndex >= 0 && focusedRoleIndex < filteredRoles.length) {
        setFormData(prev => ({ ...prev, role: filteredRoles[focusedRoleIndex] }));
        setIsRoleDropdownOpen(false);
        setFocusedRoleIndex(-1);
      } else {
        setIsRoleDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsRoleDropdownOpen(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    const { emailId, phone, role, experience } = formData;
    if (!emailId || !phone || !role || !experience) {
      return toast.error('Please fill in all required fields.');
    }

    if (jobRoles.length > 0) {
      const isValidRole = jobRoles.some(r => r.toLowerCase() === role.toLowerCase());
      if (!isValidRole) {
        return toast.error('Please select a valid role from the list.');
      }
    }

    if (experience === 'Other' && !otherExperience) {
      return toast.error('Please enter your experience in years.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId)) {
      return toast.error('Please enter a valid email address.');
    }

    const finalFormData = {
      ...formData,
      experience: experience === 'Other' ? otherExperience : experience,
      role: role,
      phone: formData.phone // already combined by handlePhoneChange
    };

    navigate('/unlock-matches', { state: { file, formData: finalFormData } });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start sm:justify-center pt-1 pb-4 sm:py-4 px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="w-full max-w-5xl mb-0.5 sm:mb-4">
        <button onClick={() => navigate('/')} className="text-blue-600 bg-transparent shadow-none font-bold px-0 py-1 text-xs flex items-center transition-all w-fit group gap-1">
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Home
        </button>
      </div>

      {/* Prominent Info Message */}
      <div className="w-full max-w-5xl mb-4 sm:mb-6 bg-transparent sm:bg-blue-50 border-none sm:border sm:border-blue-200 text-gray-900 sm:text-blue-900 px-0 sm:px-6 py-0 sm:py-4 rounded-none sm:rounded-xl shadow-none sm:shadow-sm flex items-start sm:gap-4">
        <div className="hidden sm:block bg-blue-100 p-2 rounded-full shrink-0 mt-0.5">
          <FiUploadCloud className="text-blue-600 text-xl" />
        </div>
        <div className="w-full">
          {/* Mobile View: Headline Only */}
          <div className="block sm:hidden">
            <h1 className="text-[22px] font-bold text-black leading-tight mb-2">
              Let AI find your best matches
            </h1>
          </div>
          {/* Desktop Paragraph */}
          <p className="hidden sm:block text-base font-medium leading-relaxed">
            Our AI compares your experience, skills, and resume with thousands of jobs to find the best matches. Upload your resume—it takes less than 30 seconds.
          </p>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-transparent sm:bg-gradient-to-br sm:from-blue-50/90 sm:via-indigo-50/40 sm:to-blue-100/90 shadow-none sm:shadow-2xl sm:shadow-blue-900/10 sm:rounded-[24px] flex flex-col md:flex-row border-none sm:border sm:border-blue-200/60 relative">
        
        {/* Option 1: Upload Resume */}
        <div className="flex-1 p-0 pt-2 pb-6 sm:p-6 border-b sm:border-b-0 md:border-r border-blue-100/60 bg-transparent sm:bg-blue-50/20 sm:backdrop-blur-sm sm:rounded-t-[24px] md:rounded-tr-none md:rounded-l-[24px]">
          <div className="flex flex-col items-start sm:items-center justify-center text-left sm:text-center h-full">
            <div className="hidden sm:block bg-blue-100 p-2 rounded-full mb-3">
              <FiUpload className="text-blue-600 text-xl" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Option 1: Upload Your Updated Resume</h2>
            <p className="text-gray-500 mb-4 max-w-xs text-sm">
              Upload your latest resume and let our AI find the best matching jobs for you.
            </p>

            <div 
              className={`w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-blue-300 bg-white hover:bg-gray-50'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isParsing && fileInputRef.current?.click()}
            >
              {isParsing ? (
                <RefreshCw className="w-10 h-10 text-blue-500 mb-3 animate-spin" />
              ) : (
                <FiUploadCloud className="text-blue-500 text-4xl mb-3" />
              )}
              <p className="text-gray-700 font-medium text-sm mt-2">
                {isParsing ? 'Extracting details...' : 'Drag & drop your resume here'}
              </p>
              {!isParsing && (
                <>
                  <p className="text-gray-400 text-xs mb-2">or</p>
                  <button className="px-4 py-1.5 border border-blue-600 text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50 pointer-events-none">
                    Choose File
                  </button>
                  <p className="text-[11px] text-gray-400 mt-3">Supported formats: PDF, DOC, DOCX (Max 5MB)</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
            </div>
            {file && !isParsing && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md flex items-center w-full">
                <FiCheckCircle className="mr-2 shrink-0" /> <span className="truncate">{file.name}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* OR Divider for Mobile */}
        <div className="md:hidden flex items-center justify-center py-4 bg-gray-50">
          <span className="bg-white px-4 py-1 border rounded-full text-sm font-bold text-gray-400">OR</span>
        </div>

        {/* Option 2: Fill Details Manually */}
        <div className="flex-1 p-0 pt-6 sm:p-6 relative bg-transparent sm:bg-white/40 sm:backdrop-blur-sm sm:rounded-b-[24px] md:rounded-bl-none md:rounded-r-[24px]">
          {/* OR Divider for Desktop */}
          <div className="hidden md:flex absolute top-1/2 -left-4 transform -translate-y-1/2 items-center justify-center bg-white border border-blue-100/60 h-8 w-8 rounded-full shadow-sm z-10">
            <span className="text-[10px] font-bold text-gray-500">OR</span>
          </div>

          <div className="flex flex-col items-start sm:items-center text-left sm:text-center mb-4">
            <div className="hidden sm:block bg-green-100 p-2 rounded-full mb-3">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Option 2: Fill Your Details Manually</h2>
            <p className="text-gray-500 max-w-xs text-sm">
              Complete your profile manually or review extracted details.
            </p>
          </div>

          <form className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left !min-h-0 !p-0 !block">Email ID *</label>
                <input 
                  type="email" 
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleInputChange}
                  placeholder="Enter your email id" 
                  className="w-full px-4 py-2.5 bg-white shadow-sm border border-blue-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left !min-h-0 !p-0 !block">Mobile Number *</label>
                <div className="relative">
                  <CountryPhoneInput
                    variant="auth"
                    countryCode={formData.countryCode}
                    nationalNumber={formData.nationalNumber}
                    onChange={handlePhoneChange}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div ref={roleDropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left !min-h-0 !p-0 !block">Role / Profession *</label>
                <input 
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={(e) => {
                    handleInputChange(e);
                    setIsRoleDropdownOpen(true);
                  }}
                  onFocus={() => setIsRoleDropdownOpen(true)}
                  onKeyDown={handleRoleKeyDown}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-4 py-2.5 bg-white shadow-sm border border-blue-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700 hover:border-blue-300 transition-all"
                  autoComplete="off"
                />
                {isRoleDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {jobRoles.filter(r => r.toLowerCase().includes((formData.role || '').toLowerCase())).length > 0 ? (
                      jobRoles.filter(r => r.toLowerCase().includes((formData.role || '').toLowerCase())).map((r, idx) => (
                        <div 
                          key={idx}
                          className={`px-4 py-2 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0 ${idx === focusedRoleIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, role: r }));
                            setIsRoleDropdownOpen(false);
                            setFocusedRoleIndex(-1);
                          }}
                        >
                          {r}
                        </div>
                      ))
                    ) : (
                      formData.role.length > 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50/50">
                          No roles found matching "{formData.role}".
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left !min-h-0 !p-0 !block">Years of Experience *</label>
                <select 
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  style={{ 
                    backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    backgroundSize: '12px auto'
                  }}
                  className="w-full pl-4 pr-12 py-2.5 bg-white shadow-sm border border-blue-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700 hover:border-blue-300 transition-all appearance-none"
                >
                  <option value="">Select experience</option>
                  <option value="Other">Other</option>
                  <option value="Fresher">Fresher</option>
                  <option value="1-3 Years">1 - 3 Years</option>
                  <option value="3-5 Years">3 - 5 Years</option>
                  <option value="5-10 Years">5 - 10 Years</option>
                  <option value="10+ Years">10+ Years</option>
                </select>
                {formData.experience === 'Other' && (
                  <input 
                    type="number"
                    value={otherExperience}
                    onChange={(e) => setOtherExperience(e.target.value)}
                    placeholder="Enter experience in years"
                    className="w-full px-4 py-2.5 bg-white shadow-sm border border-blue-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mt-2 hover:border-blue-300 transition-all"
                  />
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Submit Button */}
      <div className="w-full max-w-5xl mt-3">
        <button 
          onClick={handleSubmit}
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          Submit & Find Matching Jobs
        </button>
      </div>

      <div className="w-full max-w-5xl my-4 text-center">
        <p className="text-sm text-gray-700">
          Already have an account?{' '}
          <button 
            type="button" 
            onClick={() => navigate('/login')} 
            className="text-blue-600 font-bold hover:underline"
          >
            Login here
          </button>
        </p>
      </div>

      {/* Trust Footer */}
      <div className="w-full max-w-5xl bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-start mb-2 md:mb-0">
          <div className="bg-blue-50 p-1.5 rounded-full mr-2.5 mt-0.5 shrink-0">
            <ShieldCheck className="text-blue-600 w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">Your Data is Safe with Us</h4>
            <p className="text-xs text-gray-500 mt-0.5">We never share your details with anyone without your permission.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4 text-[12px] sm:text-[13px] text-gray-700 font-medium pl-10 md:pl-0 mt-1 sm:mt-0">
          <div className="flex items-center"><FiCheckCircle className="mr-1.5 text-emerald-600 shrink-0" /> 100% Secure</div>
          <div className="flex items-center"><BiBuildingHouse className="mr-1.5 text-blue-600 shrink-0" /> Verified Employers</div>
          <div className="flex items-center"><FiLock className="mr-1.5 text-purple-600 shrink-0" /> Privacy Protected</div>
        </div>
      </div>
    </div>
  );
};

export default GuestDiscovery;
