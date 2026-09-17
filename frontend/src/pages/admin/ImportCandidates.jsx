import React, { useState, useEffect } from 'react';
import { HiDownload, HiUpload, HiUsers, HiDocumentText, HiCheckCircle, HiExclamationCircle, HiPause, HiPlay, HiStop } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ImportCandidates() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [polling, setPolling] = useState(false);

  // Fetch batches
  const fetchBatches = async () => {
    try {
      const { data } = await adminAPI.getImportBatches();
      setBatches(data);
      // Determine if we need to keep polling
      const isProcessing = data.some(b => b.status === 'processing' || b.status === 'pending');
      setPolling(isProcessing);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    let interval;
    if (polling) {
      interval = setInterval(() => {
        fetchBatches();
      }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [polling]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const { data } = await adminAPI.uploadProviders(formData);
      toast.success(data.message || 'Upload completed');
      fetchBatches();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to upload CSV';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      e.target.value = null; // reset
    }
  };

  const handleAction = async (batchId, action) => {
    try {
      await adminAPI.updateImportBatchAction(batchId, action);
      toast.success(`Batch ${action}ed successfully`);
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} batch`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'paused': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'stopped': return 'text-gray-700 bg-gray-50 border-gray-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50/50 min-h-screen space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-2">
            Import Candidates
          </h1>
          <p className="text-[13px] font-medium text-gray-500 mt-0.5">
            Bulk import candidates/providers using a structured CSV file with live batch processing.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-white">
          <h3 className="text-sm font-bold text-gray-900">Upload Data</h3>
        </div>
        
        <div className="p-6 md:p-10 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
            <HiDocumentText className="w-8 h-8 text-emerald-600" />
          </div>
          
          <div className="max-w-md">
            <h4 className="text-lg font-bold text-gray-900 mb-2">Import via CSV</h4>
            <p className="text-sm text-gray-500 mb-6">
              Download our template, fill in the candidate data, and upload it back here. The system will automatically create accounts and process them in the background.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="/seed_providers.csv" 
                download 
                className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <HiDownload className="w-5 h-5 text-gray-400" /> 
                Download Template
              </a>
              
              <label className="cursor-pointer px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm shadow-emerald-200 transition-all flex items-center gap-2 w-full sm:w-auto justify-center relative overflow-hidden">
                {loading ? (
                  <>
                    <LoadingSpinner /> Uploading...
                  </>
                ) : (
                  <>
                    <HiUpload className="w-5 h-5" />
                    Upload CSV File
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      disabled={loading}
                    />
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Processing History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900">Batch Processing History</h3>
          {polling && (
            <span className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span> Live Tracking
            </span>
          )}
        </div>
        
        <div className="p-0">
          {batches.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No imports have been run yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.map((batch) => {
                    const percentage = batch.totalRows > 0 ? Math.round((batch.processedRows / batch.totalRows) * 100) : 0;
                    return (
                      <tr key={batch._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{batch.fileName}</div>
                          <div className="text-xs text-gray-500">{batch.totalRows} rows</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(batch.status)}`}>
                            {batch.status}
                          </span>
                          {batch.errors?.length > 0 && (
                            <div className="text-xs text-red-700 mt-1">{batch.errors.length} errors</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-32">
                              <div 
                                className={`h-full rounded-full ${batch.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700 w-10">{percentage}%</span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            {batch.successCount} saved / {batch.failedCount} failed
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {new Date(batch.createdAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          {batch.status === 'processing' && (
                            <>
                              <button onClick={() => handleAction(batch._id, 'pause')} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md border border-amber-200 transition-colors" title="Pause">
                                <HiPause className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleAction(batch._id, 'stop')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors" title="Stop">
                                <HiStop className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {batch.status === 'paused' && (
                            <>
                              <button onClick={() => handleAction(batch._id, 'resume')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md border border-emerald-200 transition-colors" title="Resume">
                                <HiPlay className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleAction(batch._id, 'stop')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors" title="Stop">
                                <HiStop className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(batch.status === 'completed' || batch.status === 'stopped' || batch.status === 'failed') && (
                            <span className="text-xs text-gray-400 font-medium">Archived</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
