import React, { useEffect, useState } from 'react';
import { RefreshCcw, Search, Eye, AlertCircle, X, Check, CreditCard, Calendar, User, FileText } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AdminRefundRequests = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [processStatus, setProcessStatus] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [adminReason, setAdminReason] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllRefunds();
      setRefunds(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch refund requests');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSubmit = async () => {
    if (!processStatus) {
      toast.error("Please select a status");
      return;
    }
    if (processStatus === 'Partial Refund' && !refundAmount) {
      toast.error("Please enter a refund amount for partial refund");
      return;
    }
    if (!adminReason) {
      toast.error("Please enter a reason or remark");
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        status: processStatus,
        adminReason,
        transactionId,
        ...(processStatus === 'Partial Refund' && { refundAmount: Number(refundAmount) }),
        ...(processStatus === 'Full Refund' && { refundAmount: selectedRefund.planPrice }),
      };

      await adminAPI.processRefund(selectedRefund._id, payload);
      toast.success("Refund processed successfully");
      setSelectedRefund(null);
      fetchRefunds();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process refund");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRefunds = refunds.filter(r => 
    r.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.userId?.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Refund Requested':
      case 'Under Review':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">{status}</span>;
      case 'Full Refund':
      case 'Partial Refund':
      case 'Refund Successful':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">{status}</span>;
      case 'Refund Failed':
      case 'Refund Rejected':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">{status}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refund Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and process user subscription cancellations and refunds.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={fetchRefunds}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition-colors shadow-sm"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-bold text-gray-700">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Plan / Price</th>
                <th className="px-6 py-4">Credits (Used/Total)</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No refund requests found</p>
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((refund) => (
                  <tr key={refund._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{refund.userId?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{refund.userId?.email}</div>
                      <div className="text-xs text-gray-500">{refund.userId?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{refund.planId?.name || 'Pro Plan'}</div>
                      <div className="text-gray-500">₹{refund.planPrice}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <span className="text-amber-600">{refund.usedCredits}</span>
                        <span className="mx-1 text-slate-400">/</span>
                        <span className="text-emerald-600">{refund.totalCredits === 0 ? 'Unlimited' : refund.totalCredits}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <span className="text-gray-500">Purchased:</span> <span className="font-medium">{new Date(refund.purchaseDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs mt-1">
                        <span className="text-gray-500">Cancelled:</span> <span className="font-medium text-red-600">{new Date(refund.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(refund.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRefund(refund);
                          setProcessStatus(refund.status === 'Refund Requested' ? 'Under Review' : refund.status);
                          setAdminReason(refund.adminReason || '');
                          setRefundAmount(refund.refundAmount || '');
                          setTransactionId(refund.transactionId || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative my-8">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" /> Refund Request Details
              </h3>
              <button onClick={() => setSelectedRefund(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">User Details</h4>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                    <p><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{selectedRefund.userId?.name}</span></p>
                    <p><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{selectedRefund.userId?.email}</span></p>
                    <p><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{selectedRefund.userId?.phone}</span></p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Bank Details</h4>
                  <div className="bg-blue-50 p-3 rounded-lg space-y-2 text-sm border border-blue-100">
                    <p><span className="text-blue-700 font-medium">Account Name:</span> {selectedRefund.bankDetails?.accountHolderName}</p>
                    <p><span className="text-blue-700 font-medium">Bank Name:</span> {selectedRefund.bankDetails?.bankName}</p>
                    <p><span className="text-blue-700 font-medium">Account No:</span> {selectedRefund.bankDetails?.accountNumber}</p>
                    <p><span className="text-blue-700 font-medium">IFSC:</span> {selectedRefund.bankDetails?.ifscCode}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div>
                  <p className="text-xs text-emerald-700 font-medium mb-1">Plan Price</p>
                  <p className="text-lg font-bold text-emerald-900">₹{selectedRefund.planPrice}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-medium mb-1">Credits Used</p>
                  <p className="text-lg font-bold text-emerald-900">{selectedRefund.usedCredits} <span className="text-emerald-600 text-sm font-medium">/ {selectedRefund.totalCredits === 0 ? 'Unlimited' : selectedRefund.totalCredits}</span></p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-medium mb-1">Purchased</p>
                  <p className="text-sm font-bold text-emerald-900">{new Date(selectedRefund.purchaseDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-medium mb-1">Cancelled</p>
                  <p className="text-sm font-bold text-red-600">{new Date(selectedRefund.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900">Process Refund</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Action / Status</label>
                    <select
                      value={processStatus}
                      onChange={(e) => setProcessStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="Under Review">Under Review</option>
                      <option value="Full Refund">Full Refund</option>
                      <option value="Partial Refund">Partial Refund</option>
                      <option value="Refund Successful">Refund Successful</option>
                      <option value="Refund Failed">Refund Failed</option>
                      <option value="Refund Rejected">Refund Rejected</option>
                    </select>
                  </div>
                  
                  {processStatus === 'Partial Refund' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Refund Amount (₹)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                          placeholder="Enter amount"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedRefund.totalCredits > 0) {
                              const calculated = (selectedRefund.planPrice / selectedRefund.totalCredits) * selectedRefund.remainingCredits;
                              setRefundAmount(Math.max(0, Math.round(calculated * 100) / 100));
                              toast.success("Amount auto-calculated based on remaining credits");
                            } else {
                              toast.error("Cannot auto-calculate for unlimited credits plan");
                            }
                          }}
                          className="px-3 py-2 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition-colors whitespace-nowrap"
                        >
                          Auto Calc
                        </button>
                      </div>
                      {selectedRefund.totalCredits > 0 && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          Calc: (₹{selectedRefund.planPrice} / {selectedRefund.totalCredits}) × {selectedRefund.remainingCredits} remaining
                        </p>
                      )}
                    </div>
                  )}

                  <div className={processStatus === 'Partial Refund' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction ID (Optional)</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="Bank TXN or UTR number"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Admin Remark / Reason</label>
                    <textarea
                      value={adminReason}
                      onChange={(e) => setAdminReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none min-h-[80px]"
                      placeholder="Enter reason for this action (visible to user)"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 z-10">
              <button
                onClick={() => setSelectedRefund(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessSubmit}
                className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                disabled={isProcessing}
              >
                {isProcessing ? 'Saving...' : 'Save & Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminRefundRequests;
