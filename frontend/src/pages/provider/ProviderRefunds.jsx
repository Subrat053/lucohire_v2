import React, { useEffect, useState } from 'react';
import { RefreshCcw, Search, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { providerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useTranslation from '../../hooks/useTranslation';

const ProviderRefunds = () => {
  const { t } = useTranslation();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const response = await providerAPI.getMyRefunds();
      setRefunds(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch refunds');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Refund Requested':
      case 'Under Review':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'Full Refund':
      case 'Partial Refund':
      case 'Refund Successful':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'Refund Failed':
      case 'Refund Rejected':
        return <XCircle className="w-5 h-5 text-red-700" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Refund Requested':
      case 'Under Review':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Full Refund':
      case 'Partial Refund':
      case 'Refund Successful':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Refund Failed':
      case 'Refund Rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("My Refunds")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("Track the status of your subscription refunds")}</p>
          </div>
          <button
            onClick={fetchRefunds}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition-colors shadow-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            {t("Refresh")}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : refunds.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t("No Refunds Found")}</h3>
            <p className="text-gray-500">{t("You don't have any refund requests yet.")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {refunds.map((refund) => (
              <div key={refund._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getStatusStyle(refund.status).split(' ')[0]}`}>
                        {getStatusIcon(refund.status)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{refund.planId?.name || 'Pro Plan'} Cancellation</h3>
                        <p className="text-sm text-gray-500">Requested on: {new Date(refund.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(refund.status)}`}>
                      {refund.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">{t("Plan Price")}</p>
                      <p className="text-sm font-semibold text-gray-900">₹{refund.planPrice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">{t("Credits Used")}</p>
                      <p className="text-sm font-semibold text-gray-900">{refund.usedCredits} / {refund.totalCredits === 0 ? 'Unlimited' : refund.totalCredits}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">{t("Refund Amount")}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {refund.refundAmount !== undefined ? `₹${refund.refundAmount}` : 'Pending'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">{t("Transaction ID")}</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {refund.transactionId || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {refund.adminReason && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 md:max-w-xs w-full shrink-0">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Admin Remarks</h4>
                    <p className="text-sm text-amber-900">{refund.adminReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderRefunds;
