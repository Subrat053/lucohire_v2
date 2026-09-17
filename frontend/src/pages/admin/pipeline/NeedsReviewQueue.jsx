import React, { useEffect, useState } from 'react';
import { pipelineAdminAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const NeedsReviewQueue = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await pipelineAdminAPI.getReviewQueue();
      if (res.data?.success) {
        setJobs(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch review queue');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await pipelineAdminAPI.approveReviewJob(id, {});
      toast.success('Job approved and published!');
      fetchQueue();
    } catch (error) {
      toast.error('Failed to approve job');
    }
  };

  if (loading) return <div className="text-gray-500">Loading review queue...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Needs Review Queue</h2>
      <p className="text-sm text-gray-500 mb-6">Jobs that were flagged by AI as suspicious, low quality, or not matching target criteria.</p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flags</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.companyName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700">
                  {job.flags?.join(', ') || 'Manual Review Required'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button onClick={() => handleApprove(job._id)} className="text-green-700 hover:text-green-900 font-medium">Approve</button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No jobs currently need review!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NeedsReviewQueue;
