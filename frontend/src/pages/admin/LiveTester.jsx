import React, { useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HiSearch, HiLightningBolt, HiOutlineBriefcase, HiOutlineMail, HiOutlineLocationMarker, HiOutlineCurrencyDollar, HiOutlineAcademicCap, HiX, HiOutlineLink } from 'react-icons/hi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const formatSafeString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.name || val.city || val.formattedAddress || val.country || '';
  }
  return String(val);
};

const LiveTester = () => {
  const [companyName, setCompanyName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!companyName.trim() && !url.trim()) {
      toast.error('Please enter a company name or URL');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const payload = url.trim() ? { url: url.trim(), companyName: companyName.trim() || 'Unknown Company' } : { companyName: companyName.trim() };
      const { data } = await adminAPI.liveTestCrawler(payload);
      if (data.success) {
        setResult(data);
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Scrape failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error running live scraper');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <HiLightningBolt className="w-5 h-5 text-amber-500" />
            Single Scraper
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Scrape jobs from a single company name or a direct career URL.
          </p>
        </div>
      </div>

      <form onSubmit={handleScrape} className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Stripe, Airbnb"
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center text-sm text-gray-400 font-medium">OR</div>
        <div className="relative flex-1">
          <HiOutlineLink className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Direct Career URL (https://...)"
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl text-sm transition-colors hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 min-w-[140px]"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Scrape Now'}
        </button>
      </form>

      {result && (
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <h3 className="font-semibold text-indigo-900">Results for: {companyName || url}</h3>
            <p className="text-sm text-indigo-700 mt-1">
              <strong>Career URL Found:</strong> {result.careerUrl ? (
                <a href={result.careerUrl} target="_blank" rel="noreferrer" className="underline hover:text-indigo-900">{result.careerUrl}</a>
              ) : 'None'}
            </p>
          </div>

          <div className="space-y-6">
            {result.emails && result.emails.length > 0 && (
              <div className="flex flex-wrap gap-3 items-center bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-gray-700 mr-2">
                  <HiOutlineMail className="w-5 h-5 text-indigo-500" />
                  Emails ({result.emails.length}):
                </div>
                {result.emails.map((email, idx) => (
                  <span key={idx} className="bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    {email}
                  </span>
                ))}
              </div>
            )}

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 font-semibold text-gray-800 flex items-center gap-2">
                <HiOutlineBriefcase className="w-5 h-5 text-indigo-500" />
                Jobs Extracted ({result.jobs?.length || 0})
              </div>
              <div className="p-0">
                {result.jobs && result.jobs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {result.jobs.map((job, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all flex flex-col h-full group relative">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-base font-bold text-gray-900 pr-2 leading-tight">{job.title || 'Untitled Job'}</h4>
                          {job.employmentType && (
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-1 rounded-md font-medium whitespace-nowrap uppercase tracking-wider">{job.employmentType}</span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
                          {job.location && (
                            <span className="flex items-center gap-1"><HiOutlineLocationMarker className="w-3.5 h-3.5 text-gray-400" /> {formatSafeString(job.location)}</span>
                          )}
                          {job.salary && (
                            <span className="flex items-center gap-1"><HiOutlineCurrencyDollar className="w-3.5 h-3.5 text-gray-400" /> {job.salary}</span>
                          )}
                          {job.experience && (
                            <span className="flex items-center gap-1"><HiOutlineAcademicCap className="w-3.5 h-3.5 text-gray-400" /> {job.experience}</span>
                          )}
                        </div>
                        
                        {job.description && (
                          <div className="text-xs text-gray-700 mb-4 flex-grow">
                            <p className="line-clamp-3 leading-relaxed">{job.description}</p>
                          </div>
                        )}

                        {Array.isArray(job.skills) && job.skills.length > 0 && (
                          <div className="mb-5 mt-auto pt-4 border-t border-gray-100">
                            <div className="flex flex-wrap gap-1.5">
                              {job.skills.slice(0, 3).map((skill, sIdx) => (
                                <span key={sIdx} className="bg-gray-100 text-gray-700 text-[10px] px-2 py-1 rounded-md">{skill}</span>
                              ))}
                              {job.skills.length > 3 && (
                                <span className="bg-gray-50 text-gray-400 text-[10px] px-2 py-1 rounded-md">+{job.skills.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-auto pt-2">
                          <button 
                            onClick={() => setSelectedJob(job)} 
                            className="flex-1 bg-gray-50 text-gray-700 text-xs font-semibold py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                          >
                            View Details
                          </button>
                          <a 
                            href={job.applyUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex-1 bg-indigo-50 text-indigo-700 text-xs font-semibold py-2 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100 text-center"
                          >
                            Source &rarr;
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">No standard JobPosting schemas found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.title || 'Untitled Job'}</h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                  {selectedJob.location && <span className="flex items-center gap-1"><HiOutlineLocationMarker /> {formatSafeString(selectedJob.location)}</span>}
                  {selectedJob.employmentType && <span className="flex items-center gap-1"><HiOutlineBriefcase /> {selectedJob.employmentType}</span>}
                  {selectedJob.salary && <span className="flex items-center gap-1"><HiOutlineCurrencyDollar /> {selectedJob.salary}</span>}
                </div>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              
              {selectedJob.description && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">About The Role</h3>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    {selectedJob.description}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {Array.isArray(selectedJob.responsibilities) && selectedJob.responsibilities.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Responsibilities</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      {selectedJob.responsibilities.map((req, i) => (
                        <li key={i} className="text-sm text-gray-700 leading-relaxed">{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(selectedJob.qualifications) && selectedJob.qualifications.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Qualifications</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      {selectedJob.qualifications.map((req, i) => (
                        <li key={i} className="text-sm text-gray-700 leading-relaxed">{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {Array.isArray(selectedJob.skills) && selectedJob.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((skill, sIdx) => (
                      <span key={sIdx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium text-xs px-3 py-1.5 rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
              <button 
                onClick={() => setSelectedJob(null)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Close
              </button>
              {selectedJob.applyUrl && (
                <a 
                  href={selectedJob.applyUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  Visit Source <HiLightningBolt className="w-4 h-4" />
                </a>
              )}
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveTester;
