import { useState, useEffect } from 'react';
import { HiCheck, HiX, HiEye, HiSearch, HiFilter, HiLibrary, HiUser, HiMail, HiPhone, HiCurrencyRupee, HiExclamationCircle, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import bankAccountService from '../../services/bankAccountService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminPartnerPayouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await bankAccountService.getAdminPartnerPayouts({ status: statusFilter, search });
      setPayouts(res.data.payouts || []);
    } catch (error) {
      toast.error("Failed to fetch payout requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      setProcessing(true);
      if (action === 'approve') {
        await bankAccountService.approvePartnerPayout(id, { adminRemarks: remarks });
      } else {
        await bankAccountService.rejectPartnerPayout(id, { adminRemarks: remarks });
      }
      toast.success(`Payout ${action}d successfully`);
      setShowApproveModal(false);
      setShowRejectModal(false);
      setRemarks('');
      fetchPayouts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Payout Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Review and process commission withdrawals from partners.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center"><LoadingSpinner size="md" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4 text-left">Partner</th>
                  <th className="px-6 py-4 text-left">Amount</th>
                  <th className="px-6 py-4 text-left">Bank Details</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Requested At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.length > 0 ? (
                  payouts.map((payout) => (
                    <tr key={payout._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                            {payout.partnerId?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{payout.partnerId?.name}</p>
                            <p className="text-[10px] text-gray-400">{payout.partnerId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900 text-lg">₹{Number(payout.amount || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-6 py-4">
                        {payout.paymentDetails ? (
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-medium">{payout.paymentDetails.bankName}</span>
                            <span className="text-xs text-gray-500 font-mono">{payout.paymentDetails.maskedAccountNumber}</span>
                            <span className="text-[10px] text-gray-400 font-bold">{payout.paymentDetails.ifscCode}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No details</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          payout.status === 'approved' || payout.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 
                          payout.status === 'rejected' ? 'bg-red-50 text-red-700' : 
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {payout.status?.charAt(0).toUpperCase() + payout.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {new Date(payout.requestedAt || payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedPayout(payout);
                              setShowApproveModal(true);
                            }}
                            disabled={payout.status !== 'pending'}
                            className="p-2 text-gray-400 hover:text-emerald-600 disabled:opacity-30 transition-colors"
                            title="Approve"
                          >
                            <HiCheck className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedPayout(payout);
                              setShowRejectModal(true);
                            }}
                            disabled={payout.status !== 'pending'}
                            className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                            title="Reject"
                          >
                            <HiX className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No payout requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50">
              <h3 className="text-xl font-bold text-emerald-900">Approve Payout</h3>
              <button onClick={() => setShowApproveModal(false)} className="p-1 hover:bg-emerald-100 rounded-lg"><HiX className="w-5 h-5 text-emerald-400" /></button>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-bold mb-3">Withdrawal Amount</p>
                <div className="text-3xl font-black text-gray-900 flex items-center gap-2">
                  <HiCurrencyRupee className="w-8 h-8 text-emerald-600" />
                  {Number(selectedPayout.amount).toLocaleString('en-IN')}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-500 ml-1">Admin Remarks (Optional)</label>
                <textarea 
                  placeholder="e.g. Transaction ID, payment reference..." 
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24 text-sm"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleAction(selectedPayout._id, 'approve')}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Approval'}
                </button>
                <button onClick={() => setShowApproveModal(false)} className="px-6 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50">
              <h3 className="text-xl font-bold text-red-900">Reject Payout</h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-red-100 rounded-lg"><HiX className="w-5 h-5 text-red-400" /></button>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 bg-red-50/50 rounded-2xl border border-red-100 flex gap-3">
                <HiExclamationCircle className="w-6 h-6 text-red-700 shrink-0" />
                <p className="text-xs text-red-700 font-medium leading-relaxed">
                  Rejecting this payout will return the amount back to the partner's available commission wallet. Please provide a reason.
                </p>
              </div>
              
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-500 ml-1">Rejection Reason *</label>
                <textarea 
                  placeholder="Why is this being rejected?" 
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none h-24 text-sm"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleAction(selectedPayout._id, 'reject')}
                  disabled={!remarks || processing}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Rejection'}
                </button>
                <button onClick={() => setShowRejectModal(false)} className="px-6 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPartnerPayouts;
