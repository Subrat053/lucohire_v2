import React, { useEffect, useState } from 'react';
import { pipelineAdminAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const ScanHistory = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const res = await pipelineAdminAPI.getScans();
      if (res.data?.success) {
        setScans(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch scans');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading scan history...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Scan History</h2>
        <button onClick={() => { setLoading(true); fetchScans(); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
          ↻ Refresh List
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">History of background jobs fetching data from JSearch API.</p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Run ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Query</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fetched</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scans.map((scan) => (
              <ScanRow key={scan._id} scan={scan} />
            ))}
            {scans.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No scans found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ScanRow = ({ scan }) => {
  const [expanded, setExpanded] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!expanded && jobs.length === 0) {
      setLoading(true);
      try {
        const res = await pipelineAdminAPI.getRawImports({ scanRunId: scan._id });
        if (res.data?.success) {
          setJobs(res.data.data);
        }
      } catch (e) {
        toast.error('Failed to load jobs for this scan');
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <React.Fragment>
      <tr>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{scan._id.substring(0, 8)}...</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{scan.query} ({scan.location})</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            scan.status === 'success' ? 'bg-green-100 text-green-800' : 
            scan.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {scan.status}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{scan.totalFetched} / {scan.totalImported || 0}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(scan.createdAt).toLocaleString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <button onClick={toggleExpand} className="text-blue-600 hover:text-blue-800">
            {expanded ? 'Hide Jobs' : 'View Jobs'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="6" className="bg-gray-50 p-4">
            {loading ? (
              <div className="text-sm text-gray-500">Loading jobs...</div>
            ) : jobs.length > 0 ? (
              <div className="bg-white border rounded p-4">
                <h4 className="font-medium text-sm mb-2">Jobs received in this run:</h4>
                <ul className="space-y-2">
                  {jobs.map(job => (
                    <li key={job._id} className="text-sm border-b pb-2">
                      <span className="font-semibold">{job.rawTitle}</span> at {job.rawCompanyName} 
                      <span className="text-xs text-gray-500 ml-2">({job.processingStatus})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No jobs were imported in this run.</div>
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

export default ScanHistory;
