import { useState, useEffect } from 'react';
import { adminWithdrawalAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  HiCurrencyRupee, HiCheck, HiX, HiClock, HiSearch, HiFilter, HiCalendar, 
  HiEye, HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiCollection 
} from 'react-icons/hi';
import useTranslation from '../../hooks/useTranslation';

const AdminWithdrawals = () => {
  const { t } = useTranslation();
  
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter States
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Action Modals & States
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState(''); // approved, rejected, paid
  const [transactionId, setTransactionId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, [search, status, startDate, endDate, page]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        status,
        startDate,
        endDate,
        page,
        limit: 20
      };
      
      const { data } = await adminWithdrawalAPI.getAll(params);
      setWithdrawals(data.withdrawals || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || t('admin.withdrawLoadFail', 'Failed to load withdrawal requests'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusModal = (withdrawal, action) => {
    setSelectedWithdrawal(withdrawal);
    setStatusAction(action);
    setTransactionId('');
    setAdminNotes(withdrawal.adminNotes || '');
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (statusAction === 'paid' && !transactionId) {
      toast.error(t('admin.requireTxnId', 'Transaction ID is mandatory for marking as Paid'));
      return;
    }

    try {
      setSubmittingAction(true);
      const payload = {
        status: statusAction,
        adminNotes,
        transactionId: statusAction === 'paid' ? transactionId : undefined
      };

      await adminWithdrawalAPI.updateStatus(selectedWithdrawal._id, payload);
      toast.success(`${t('admin.statusUpdated', 'Request status successfully updated to')} ${statusAction.toUpperCase()}`);
      setShowStatusModal(false);
      setSelectedWithdrawal(null);
      
      // Refresh list
      await fetchWithdrawals();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('admin.statusUpdateFail', 'Failed to update request status'));
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><HiCurrencyRupee className="w-6 h-6" /></span>
            {t('admin.withdrawalsTitle', 'Payout & Withdrawals Console')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('admin.withdrawalsSubtitle', 'Review, approve, and record transaction payouts safely for service providers.')}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('admin.searchPlaceholder', 'Search by provider name, email...')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>

          <div className="relative">
            <HiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition appearance-none"
            >
              <option value="">{t('admin.allStatus', 'All Statuses')}</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved / Processing</option>
              <option value="rejected">Rejected / Refunded</option>
              <option value="paid">Paid & Settled</option>
            </select>
          </div>

          <div className="relative">
            <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>

          <div className="relative">
            <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Main Request Grid */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-500">
                <th className="py-4 px-6">{t('admin.colProvider', 'Provider Details')}</th>
                <th className="py-4 px-6">{t('admin.colAmount', 'Amount')}</th>
                <th className="py-4 px-6">{t('admin.colPayoutMethod', 'Payout Method Details')}</th>
                <th className="py-4 px-6">{t('admin.colStatus', 'Status')}</th>
                <th className="py-4 px-6">{t('admin.colNotes', 'Admin Notes')}</th>
                <th className="py-4 px-6 text-center">{t('admin.colActions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600 mx-auto mb-2"></div>
                    <p>{t('common.loading', 'Loading data...')}</p>
                  </td>
                </tr>
              ) : withdrawals.length > 0 ? (
                withdrawals.map(w => (
                  <tr key={w._id} className="hover:bg-slate-50/40 transition">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-extrabold text-slate-800 text-sm">{w.userId?.name || 'Deleted Account'}</p>
                        <p className="text-slate-400">{w.userId?.email || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">Req ID: {w._id}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-extrabold text-slate-900 text-sm">₹{w.amount.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(w.createdAt).toLocaleDateString()} {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="py-4 px-6 font-mono text-[10px]">
                      {w.payoutMethodSnapshot ? (
                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold uppercase rounded text-[8px] tracking-wide mb-1 font-sans">
                            {w.payoutMethodSnapshot.type}
                          </span>
                          {w.payoutMethodSnapshot.type === 'bank' && (
                            <>
                              <p className="font-sans font-semibold text-slate-800">{w.payoutMethodSnapshot.bankDetails?.accountHolderName}</p>
                              <p className="text-slate-500">{w.payoutMethodSnapshot.bankDetails?.bankName}</p>
                              <p className="text-slate-800">A/C: {w.payoutMethodSnapshot.bankDetails?.accountNumber}</p>
                              <p className="text-slate-500">IFSC: {w.payoutMethodSnapshot.bankDetails?.ifscCode}</p>
                            </>
                          )}
                          {w.payoutMethodSnapshot.type === 'upi' && (
                            <p className="text-indigo-600 font-bold">{w.payoutMethodSnapshot.upiId}</p>
                          )}
                          {w.payoutMethodSnapshot.type === 'qr' && (
                            <div>
                              {w.payoutMethodSnapshot.providerName && <p className="font-sans font-semibold text-slate-700">{w.payoutMethodSnapshot.providerName}</p>}
                              <a href={w.payoutMethodSnapshot.qrCodeImage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] text-indigo-600 hover:underline mt-1 font-sans font-bold">
                                <HiEye className="w-3.5 h-3.5" />
                                {t('admin.viewQrBtn', 'Open QR Image')}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-sans">{t('admin.noSnapshot', 'No Snapshot details')}</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold uppercase text-[9px] ${
                        w.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        w.status === 'approved' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        w.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          w.status === 'paid' ? 'bg-emerald-500' :
                          w.status === 'approved' ? 'bg-indigo-500' :
                          w.status === 'pending' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`} />
                        {w.status === 'pending' ? 'Pending Approval' : w.status === 'approved' ? 'Approved / Processing' : w.status === 'paid' ? 'Paid & Settled' : 'Rejected'}
                      </span>
                      {w.transactionId && (
                        <p className="text-[10px] text-slate-400 mt-1 font-mono font-semibold">Txn: {w.transactionId}</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <p className="max-w-[200px] truncate text-slate-500 font-medium" title={w.adminNotes}>{w.adminNotes || '—'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center items-center gap-1.5">
                        {w.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(w, 'approved')}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition"
                              title={t('admin.approveRequest', 'Approve Payout')}
                            >
                              {t('admin.btnApprove', 'Approve')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(w, 'rejected')}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition"
                              title={t('admin.rejectRequest', 'Reject Payout')}
                            >
                              {t('admin.btnReject', 'Reject')}
                            </button>
                          </>
                        )}
                        {w.status === 'approved' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(w, 'paid')}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition"
                              title={t('admin.markPaid', 'Mark as Paid')}
                            >
                              {t('admin.btnMarkPaid', 'Mark Paid')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(w, 'rejected')}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition"
                              title={t('admin.rejectRequest', 'Reject Payout')}
                            >
                              {t('admin.btnReject', 'Reject')}
                            </button>
                          </>
                        )}
                        {(w.status === 'paid' || w.status === 'rejected') && (
                          <span className="text-slate-400 font-medium italic">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <HiCollection className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">{t('admin.noWithdrawals', 'No withdrawal requests found matching constraints.')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center bg-slate-50 border-t border-slate-100 px-6 py-4">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {t('common.previous', 'Previous')}
            </button>
            <span className="text-xs font-semibold text-slate-500">
              {t('common.page', 'Page')} {page} {t('common.of', 'of')} {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {t('common.next', 'Next')}
            </button>
          </div>
        )}
      </div>

      {/* ACTION DIALOG MODAL */}
      {showStatusModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-scaleUp">
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-50 text-indigo-600"><HiCurrencyRupee className="w-5 h-5" /></span>
              {statusAction === 'approved' && t('admin.actionApproveTitle', 'Approve Payout Request')}
              {statusAction === 'rejected' && t('admin.actionRejectTitle', 'Reject Payout Request')}
              {statusAction === 'paid' && t('admin.actionPaidTitle', 'Complete Payout Settlement')}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {statusAction === 'approved' && t('admin.actionApproveDesc', 'This will move the request status to approved/processing, alerting the provider.')}
              {statusAction === 'rejected' && t('admin.actionRejectDesc', 'This will reject the payout. Locked funds inside pendingBalance will revert back to availableBalance instantly.')}
              {statusAction === 'paid' && t('admin.actionPaidDesc', 'Provide transaction receipt references. This will permanently settle balances and decrease pendingBalance.')}
            </p>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              {statusAction === 'paid' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('admin.txnIdLabel', 'Reference Transaction ID (Required)')}</label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    placeholder="e.g. TXN123456789"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-indigo-500 transition font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('admin.adminNotesLabel', 'Admin Notes / Remarks')}</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Provide approval processing status or rejection reasons..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 transition"
                />
              </div>

              {/* Provider details preview */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-1.5 font-mono">
                <p className="font-sans font-bold uppercase tracking-wider text-[9px] text-slate-400 mb-1">{t('admin.summaryTitle', 'Request Overview')}</p>
                <p><span className="text-slate-400 font-sans">Provider:</span> <strong className="font-sans text-slate-800">{selectedWithdrawal.userId?.name}</strong></p>
                <p><span className="text-slate-400 font-sans">Amount:</span> <strong className="text-slate-900 font-sans text-sm">₹{selectedWithdrawal.amount.toLocaleString()}</strong></p>
                <p><span className="text-slate-400 font-sans">Method:</span> <strong className="text-slate-800 uppercase font-sans text-[10px]">{selectedWithdrawal.payoutMethodSnapshot?.type}</strong></p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`flex-1 py-3 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 ${
                    statusAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                    statusAction === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {submittingAction ? t('common.submitting', 'Processing...') : t('common.confirm', 'Confirm Action')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;
