import React, { useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HiOutlineBriefcase, HiOutlineMail, HiUpload, HiDocumentText, HiOutlineLocationMarker, HiOutlineCurrencyDollar, HiOutlineAcademicCap, HiX, HiLightningBolt } from 'react-icons/hi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const LiveScraper = () => {
  const [subTab, setSubTab] = useState('companies'); // 'companies' or 'jobs'
  
  const [bulkCompanies, setBulkCompanies] = useState([]);
  const [bulkResults, setBulkResults] = useState([]);
  const [allScrapedJobs, setAllScrapedJobs] = useState([]);
  
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const names = text.split('\n').map(l => l.trim()).filter(l => l);
      if (names.length === 0) {
        toast.error('No companies found in file');
        return;
      }
      setBulkCompanies(names);
      setBulkResults([]);
      setAllScrapedJobs([]);
      setBulkProgress({ current: 0, total: names.length });
      e.target.value = null; 
    };
    reader.readAsText(file);
  };

  const handleBulkScrape = async () => {
    if (bulkCompanies.length === 0) return;
    setBulkProcessing(true);
    setBulkResults([]);
    setAllScrapedJobs([]);
    
    let currentResults = [];
    let currentJobs = [];

    for (let i = 0; i < bulkCompanies.length; i++) {
      const cName = bulkCompanies[i];
      setBulkProgress({ current: i + 1, total: bulkCompanies.length });
      try {
        const { data } = await adminAPI.liveTestCrawler({ companyName: cName });
        const resObj = {
          companyName: cName,
          success: data.success,
          careerUrl: data.careerUrl,
          jobsCount: data.jobs?.length || 0,
          emailsCount: data.emails?.length || 0,
          message: data.message
        };
        currentResults = [...currentResults, resObj];
        setBulkResults(currentResults);
        
        if (data.jobs && data.jobs.length > 0) {
           currentJobs = [...currentJobs, ...data.jobs];
           setAllScrapedJobs(currentJobs);
        }
      } catch (err) {
        const resObj = {
          companyName: cName,
          success: false,
          careerUrl: null,
          jobsCount: 0,
          emailsCount: 0,
          message: 'Error'
        };
        currentResults = [...currentResults, resObj];
        setBulkResults(currentResults);
      }
    }
    setBulkProcessing(false);
    toast.success('Bulk scrape completed!');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <HiLightningBolt className="w-6 h-6 text-indigo-600" />
          Bulk Data Scraper
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Upload a list of companies to automatically find their career pages, extract jobs, check duplicates, and save them to the live Job Board.
        </p>
      </div>

      <div className="space-y-6">
        {/* Upload Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex-1 flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
              <HiUpload className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Upload CSV (Names Only)</span>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} disabled={bulkProcessing} />
            </label>
            
            <button 
              onClick={() => {
                const content = "Stripe\nAirbnb\nCoinbase\nNotion\nFigma\nVercel\nOpenAI\nAnthropic\nZomato\nSwiggy";
                const blob = new Blob([content], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'sample_companies.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Download Sample CSV
            </button>
          </div>
          
          {bulkCompanies.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700 flex items-center gap-1">
                <HiDocumentText className="w-4 h-4" /> 
                <strong>{bulkCompanies.length}</strong> companies
              </div>
              <button
                onClick={handleBulkScrape}
                disabled={bulkProcessing || bulkProgress.current === bulkCompanies.length}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {bulkProcessing ? (
                  <><LoadingSpinner size="sm" /> Processing ({bulkProgress.current}/{bulkProgress.total})</>
                ) : bulkProgress.current === bulkCompanies.length ? (
                  'Completed'
                ) : (
                  'Run Scraper Queue'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Subtabs for Results */}
        {(bulkResults.length > 0 || bulkProcessing) && (
          <div className="border border-gray-200 rounded-xl overflow-hidden mt-8">
            <div className="bg-gray-50 border-b border-gray-200 flex">
              <button
                onClick={() => setSubTab('companies')}
                className={`px-6 py-3 font-semibold text-sm transition-colors ${subTab === 'companies' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Companies Status ({bulkResults.length})
              </button>
              <button
                onClick={() => setSubTab('jobs')}
                className={`px-6 py-3 font-semibold text-sm transition-colors flex items-center gap-2 ${subTab === 'jobs' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                All Extracted Jobs 
                <span className="bg-gray-200 text-gray-700 text-xs py-0.5 px-2 rounded-full">{allScrapedJobs.length}</span>
              </button>
            </div>

            <div className="p-0 bg-white">
              
              {/* COMPANIES TAB */}
              {subTab === 'companies' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Company Name</th>
                        <th className="px-4 py-3 font-medium">Career URL</th>
                        <th className="px-4 py-3 font-medium text-center">Jobs Extracted</th>
                        <th className="px-4 py-3 font-medium text-center">Emails</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {bulkResults.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{r.companyName}</td>
                          <td className="px-4 py-3 text-gray-500 truncate max-w-xs">
                            {r.careerUrl ? (
                              <a href={r.careerUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{r.careerUrl}</a>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center min-w-8 px-1.5 py-0.5 rounded-full text-xs font-medium ${r.jobsCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                              {r.jobsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center min-w-8 px-1.5 py-0.5 rounded-full text-xs font-medium ${r.emailsCount > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                              {r.emailsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {r.success ? (
                              <span className="text-green-700 font-medium">Success</span>
                            ) : (
                              <span className="text-red-700 font-medium">Failed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {bulkProcessing && (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <LoadingSpinner size="md" />
                              <p className="text-sm">Scraping <strong>{bulkCompanies[bulkProgress.current]}</strong>... ({bulkProgress.current + 1}/{bulkProgress.total})</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* JOBS TAB */}
              {subTab === 'jobs' && (
                <div className="p-6">
                  {allScrapedJobs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allScrapedJobs.map((job, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all flex flex-col h-full group relative">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-base font-bold text-gray-900 leading-tight">{job.title || 'Untitled Job'}</h4>
                              <p className="text-xs text-indigo-600 font-medium mt-1">{job.company}</p>
                            </div>
                            {job.employmentType && (
                              <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-1 rounded-md font-medium whitespace-nowrap uppercase tracking-wider">{job.employmentType}</span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
                            {job.location && (
                              <span className="flex items-center gap-1"><HiOutlineLocationMarker className="w-3.5 h-3.5 text-gray-400" /> {job.location}</span>
                            )}
                            {job.salary && (
                              <span className="flex items-center gap-1"><HiOutlineCurrencyDollar className="w-3.5 h-3.5 text-gray-400" /> {job.salary}</span>
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
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                      <HiOutlineBriefcase className="w-12 h-12 text-gray-300 mb-3" />
                      <p>No jobs extracted yet. They will appear here as the queue processes.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.title || 'Untitled Job'}</h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                  {selectedJob.company && <span className="flex items-center gap-1 font-semibold text-indigo-600"><HiOutlineBriefcase /> {selectedJob.company}</span>}
                  {selectedJob.location && <span className="flex items-center gap-1"><HiOutlineLocationMarker /> {selectedJob.location}</span>}
                  {selectedJob.employmentType && <span className="flex items-center gap-1"><HiOutlineBriefcase /> {selectedJob.employmentType}</span>}
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

export default LiveScraper;
