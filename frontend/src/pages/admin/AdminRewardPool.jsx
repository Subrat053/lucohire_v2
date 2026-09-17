import { useState, useEffect } from 'react';
import { HiCheck, HiX, HiCurrencyRupee } from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminRewardPool = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getRewards();
      setRewards(res.data?.rewards || []);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to fetch rewards');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await adminAPI.updateRewardStatus(id, { status });
      toast.success(`Reward marked as ${status}`);
      fetchRewards();
    } catch (error) {
      toast.error(`Failed to mark as ${status}`);
    }
  };

  const handleMarkBulkPaid = async () => {
    if (selectedIds.length === 0) return;
    try {
      await adminAPI.markRewardsPaid({ rewardIds: selectedIds });
      toast.success(`${selectedIds.length} rewards marked as paid`);
      fetchRewards();
    } catch (error) {
      toast.error('Failed to update rewards');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = (e) => {
    if (e.target.checked) {
      const pendingIds = rewards.filter(r => r.status === 'approved').map(r => r._id);
      setSelectedIds(pendingIds);
    } else {
      setSelectedIds([]);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reward Pool Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review, approve, and process partner reward payouts</p>
        </div>
        
        {selectedIds.length > 0 && (
          <button 
            onClick={handleMarkBulkPaid}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700"
          >
            <HiCurrencyRupee className="w-5 h-5" /> Mark {selectedIds.length} Paid
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4 text-left w-12">
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                      onChange={toggleAll}
                      checked={rewards.length > 0 && selectedIds.length === rewards.filter(r => r.status === 'approved').length}
                    />
                  </th>
                  <th className="px-6 py-4 text-left">Partner</th>
                  <th className="px-6 py-4 text-left">Source Type</th>
                  <th className="px-6 py-4 text-left">Referred User</th>
                  <th className="px-6 py-4 text-left">Amount</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rewards.length > 0 ? (
                  rewards.map((reward) => (
                    <tr key={reward._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                          type="checkbox" 
                          className="rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                          disabled={reward.status !== 'approved'}
                          checked={selectedIds.includes(reward._id)}
                          onChange={() => toggleSelect(reward._id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">{reward.partner?.name || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-700 capitalize">{reward.sourceType?.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {reward.referredUser?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">₹{reward.amount?.toLocaleString('en-IN') || 0}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${
                          reward.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 
                          reward.status === 'approved' ? 'bg-indigo-50 text-indigo-700' : 
                          reward.status === 'rejected' ? 'bg-red-50 text-red-700' : 
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {reward.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {reward.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleUpdateStatus(reward._id, 'approved')}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Approve"
                            >
                              <HiCheck className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(reward._id, 'rejected')}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Reject"
                            >
                              <HiX className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {reward.status === 'approved' && (
                          <button 
                            onClick={() => handleUpdateStatus(reward._id, 'paid')}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No rewards found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRewardPool;
