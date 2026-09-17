import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  HiCurrencyRupee, HiClock, HiCheckCircle, HiExclamationCircle, 
  HiCollection, HiUserGroup, HiTrendingUp
} from 'react-icons/hi';
import useTranslation from '../../hooks/useTranslation';

const AdminCommissions = () => {
  const { t } = useTranslation();
  
  const [withdrawals, setWithdrawals] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('withdrawals'); // 'withdrawals' | 'referrals'
  
  const [statusAction, setStatusAction] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getReferralWithdrawals({ limit: 50 });
      setWithdrawals(data.withdrawals || []);
      setReferrals(data.recentReferrals || []);
    } catch (err) {
      toast.error('Failed to load commissions data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusModal = (withdrawal, action) => {
    setSelectedWithdrawal(withdrawal);
    setStatusAction(action);
    setAdminNotes(withdrawal.adminNotes || '');
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await adminAPI.updateReferralWithdrawalStatus(selectedWithdrawal._id, {
        status: statusAction,
        adminNotes
      });
      toast.success(`Request marked as ${statusAction}`);
      setShowStatusModal(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-green-50 text-green-700">
            <HiCurrencyRupee className="w-6 h-6" />
          </span>
          Referral Commissions & Withdrawals
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review referral commissions and process manual payouts.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition ${activeTab === 'withdrawals' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Withdrawal Requests ({withdrawals.length})
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition ${activeTab === 'referrals' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Recent Referrals ({referrals.length})
        </button>
      </div>

      {/* Withdrawals List */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                <th className="py-4 px-6">Provider</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Method & Details</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : withdrawals.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No withdrawal requests found.</td></tr>
              ) : (
                withdrawals.map(w => (
                  <tr key={w._id} className="hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900">{w.userId?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{w.userId?.email}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-1">ID: {w._id}</p>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-900">₹{w.amount}</td>
                    <td className="py-4 px-6">
                      <span className="uppercase text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mr-2">{w.method}</span>
                      {w.method === 'bank' && w.userId?.bankDetails && (
                        <div className="text-xs mt-2 text-gray-700 font-mono">
                          A/C: {w.userId.bankDetails.accountNumber} <br/>
                          IFSC: {w.userId.bankDetails.ifscCode}
                        </div>
                      )}
                      {w.method === 'upi' && w.userId?.bankDetails && (
                        <div className="text-xs mt-2 text-gray-700 font-mono">
                          UPI: {w.userId.bankDetails.upiId}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        w.status === 'paid' ? 'bg-green-100 text-green-700' :
                        w.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {w.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center space-x-2">
                      {w.status === 'pending' && (
                        <>
                          <button onClick={() => handleOpenStatusModal(w, 'paid')} className="text-xs px-3 py-1 bg-green-50 text-green-700 font-bold rounded hover:bg-green-100">Pay</button>
                          <button onClick={() => handleOpenStatusModal(w, 'rejected')} className="text-xs px-3 py-1 bg-red-50 text-red-700 font-bold rounded hover:bg-red-100">Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Referrals List */}
      {activeTab === 'referrals' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                <th className="py-4 px-6">Referrer (Earns)</th>
                <th className="py-4 px-6">Referred User (Pays)</th>
                <th className="py-4 px-6">Commission</th>
                <th className="py-4 px-6">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : referrals.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">No active referrals found.</td></tr>
              ) : (
                referrals.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900">{r.referrerId?.name || 'Unknown'}</p>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{r.referrerType}</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900">{r.referredUserId?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{r.referredUserId?.email}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-green-700">₹{r.commissionAmount}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.commissionStatus === 'earned' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.commissionStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirm {statusAction === 'paid' ? 'Payment' : 'Rejection'}</h3>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-700">Admin Notes (Optional)</label>
                <textarea 
                  className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  rows={3} 
                  value={adminNotes} 
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Reason for rejection or transaction ID..."
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowStatusModal(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={submitting} className={`flex-1 py-3 text-white font-bold rounded-lg ${statusAction === 'paid' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'}`}>
                  {submitting ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCommissions;
