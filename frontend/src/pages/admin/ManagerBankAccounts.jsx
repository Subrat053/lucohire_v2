import { useState, useEffect } from 'react';
import { HiCheck, HiX, HiEye, HiSearch, HiFilter, HiLibrary, HiUser, HiMail, HiPhone, HiExclamationCircle } from 'react-icons/hi';
import bankAccountService from '../../services/bankAccountService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ManagerBankAccounts = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBankAccounts();
  }, [statusFilter]);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const res = await bankAccountService.getAdminManagerBankAccounts({ status: statusFilter, search });
      setBankAccounts(res.data.data || []);
    } catch (error) {
      toast.error("Failed to fetch bank accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBankAccounts();
  };

  const handleVerify = async (id, status) => {
    if (status === 'approved' && !window.confirm("Are you sure you want to approve this bank account?")) return;
    
    try {
      setProcessing(true);
      await bankAccountService.verifyManagerBankAccount(id, { 
        verificationStatus: status,
        rejectionReason: status === 'rejected' ? rejectionReason : ''
      });
      toast.success(`Bank account ${status} successfully`);
      setShowRejectModal(false);
      setRejectionReason('');
      fetchBankAccounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Partner Bank Accounts</h1>
        <p className="text-sm text-gray-500 mt-1">Review and verify bank details submitted by partners.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="relative max-w-md flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by partner name, email or holder..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-sm"
            />
          </form>
          
          <div className="flex items-center gap-3">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center"><LoadingSpinner size="md" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4 text-left">Partner</th>
                  <th className="px-6 py-4 text-left">Bank Details</th>
                  <th className="px-6 py-4 text-left">Account Holder</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bankAccounts.length > 0 ? (
                  bankAccounts.map((acc) => (
                    <tr key={acc._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                            {acc.partnerId?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{acc.partnerId?.name}</p>
                            <p className="text-xs text-gray-500 truncate">{acc.partnerId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{acc.bankName}</span>
                          <span className="text-xs text-gray-500 font-mono tracking-wider">{acc.accountNumber}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{acc.ifscCode}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700 font-medium">{acc.accountHolderName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          acc.verificationStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' : 
                          acc.verificationStatus === 'rejected' ? 'bg-red-50 text-red-700' : 
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {acc.verificationStatus.charAt(0).toUpperCase() + acc.verificationStatus.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedAccount(acc);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="View Details"
                          >
                            <HiEye className="w-5 h-5" />
                          </button>
                          
                          {acc.verificationStatus === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleVerify(acc._id, 'approved')}
                                className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                                title="Approve"
                              >
                                <HiCheck className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedAccount(acc);
                                  setShowRejectModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                title="Reject"
                              >
                                <HiX className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No bank accounts found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Reject Bank Account</h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100 flex gap-2">
                <HiExclamationCircle className="w-5 h-5 text-red-700 shrink-0" />
                <p className="text-xs text-red-700">Please provide a clear reason for rejection. This will be visible to the partner.</p>
              </div>
              <textarea 
                placeholder="Enter rejection reason (e.g., IFSC mismatch, Name doesn't match...)" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none h-32 text-sm"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button 
                onClick={() => handleVerify(selectedAccount._id, 'rejected')}
                disabled={!rejectionReason || processing}
                className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-100 hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {processing ? 'Processing...' : 'Reject Account'}
              </button>
              <button onClick={() => setShowRejectModal(false)} className="px-6 py-2.5 bg-white text-gray-500 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Account Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-8 space-y-8">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold shrink-0">
                  {selectedAccount.partnerId?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedAccount.partnerId?.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500"><HiMail className="w-3.5 h-3.5" /> {selectedAccount.partnerId?.email}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><HiPhone className="w-3.5 h-3.5" /> {selectedAccount.partnerId?.phone}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Bank Name</p>
                  <p className="text-gray-900 font-semibold">{selectedAccount.bankName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Account Holder</p>
                  <p className="text-gray-900 font-semibold">{selectedAccount.accountHolderName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Account Number</p>
                  <p className="text-gray-900 font-mono font-bold">{selectedAccount.accountNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">IFSC Code</p>
                  <p className="text-gray-900 font-semibold">{selectedAccount.ifscCode}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Account Type</p>
                  <p className="text-gray-900 font-semibold">{selectedAccount.accountType}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Branch</p>
                  <p className="text-gray-900 font-semibold">{selectedAccount.branchName || 'N/A'}</p>
                </div>
                {selectedAccount.upiId && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">UPI ID</p>
                    <p className="text-gray-900 font-semibold">{selectedAccount.upiId}</p>
                  </div>
                )}
              </div>

              {selectedAccount.rejectionReason && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <p className="text-[10px] uppercase font-bold text-red-400 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{selectedAccount.rejectionReason}</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              {selectedAccount.verificationStatus === 'pending' ? (
                <>
                  <button 
                    onClick={() => handleVerify(selectedAccount._id, 'approved')}
                    className="flex-1 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                  >
                    Approve Account
                  </button>
                  <button 
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowRejectModal(true);
                    }}
                    className="px-6 py-2.5 bg-white text-red-700 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button onClick={() => setShowDetailModal(false)} className="w-full px-6 py-2.5 bg-white text-gray-500 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerBankAccounts;
