import React, { useEffect, useState } from 'react';
import { pipelineAdminAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const RawImports = () => {
  const [rawJobs, setRawJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRawJobs();
  }, []);

  const fetchRawJobs = async () => {
    try {
      const res = await pipelineAdminAPI.getRawImports();
      if (res.data?.success) {
        setRawJobs(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch raw imports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading raw imports...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Raw Job Imports</h2>
      <p className="text-sm text-gray-500 mb-6">Raw API payload dumps from our scraping sources before normalization.</p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">JSearch Job ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raw Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raw Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imported At</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rawJobs.map((job) => (
              <tr key={job._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.jsearchJobId?.substring(0,10)}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.rawTitle}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.rawCompanyName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    job.processingStatus === 'processed' ? 'bg-green-100 text-green-800' : 
                    job.processingStatus === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {job.processingStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(job.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {rawJobs.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No raw imports found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RawImports;
