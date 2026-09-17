import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiEye, HiSearch, HiLockOpen, HiClock, HiCreditCard, HiRefresh, HiChevronDown, HiDownload } from 'react-icons/hi';
import { providerAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const typeConfig = {
  profile_view: { label: 'Profile View', icon: HiEye, color: 'bg-emerald-100 text-emerald-600' },
  search: { label: 'Search Appearance', icon: HiSearch, color: 'bg-amber-100 text-amber-600' },
  contact_unlock: { label: 'Contact Unlocked', icon: HiLockOpen, color: 'bg-green-100 text-green-700' },
  job_match: { label: 'Job Match', icon: HiClock, color: 'bg-emerald-100 text-emerald-600' },
};

const ProviderHistory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'activity'
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filterOptions = [
    { value: '', label: t('All Activity') },
    { value: 'profile_view', label: t('Profile Views') },
    { value: 'contact_unlock', label: t('Contact Unlocks') },
    { value: 'search', label: t('Search Appearances') },
    { value: 'job_match', label: t('Job Matches') },
  ];
  const currentFilterLabel = filterOptions.find(o => o.value === filter)?.label || t('All Activity');
  useEffect(() => { 
    fetchHistory(); 
    fetchPayments();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await providerAPI.getHistory();
      setHistory(Array.isArray(data) ? data : data.history || []);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const res = await providerAPI.getMyPayments();
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || res?.data?.payments || []);
      setPayments(list);
    } catch (e) {
      console.error(e);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const filtered = filter ? history.filter(h => h.type === filter) : history;

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <HiCreditCard className="w-7 h-7 text-emerald-600" />
            {t("Payment History")}
          </h1>
          <p className="text-xs text-gray-500 mt-1">{t("View all your past transactions, plan subscriptions, and activity history.")}</p>
        </div>

        <div className="flex items-center self-start w-fit gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'payments'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            {t("Payment History")}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'activity'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            {t("Activity Logs")}
          </button>
        </div>
      </div>

      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">{t("Transactions & Plan Billing")}</h2>
            <button
              onClick={fetchPayments}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
              title="Refresh Payments"
            >
              <HiRefresh className={`w-5 h-5 ${paymentsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {paymentsLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">{t("Loading payment history...")}</div>
          ) : payments.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              {t("No payment history found.")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 text-xs uppercase font-bold">
                    <th className="py-3 px-4">{t("Date")}</th>
                    <th className="py-3 px-4">{t("Plan / Item")}</th>
                    <th className="py-3 px-4">{t("Type")}</th>
                    <th className="py-3 px-4">{t("Amount")}</th>
                    <th className="py-3 px-4">{t("Status")}</th>
                    <th className="py-3 px-4 text-right">{t("Transaction ID")}</th>
                    <th className="py-3 px-4 text-center">{t("Invoice")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-4 text-xs font-semibold text-gray-700">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {item.plan?.name || item.metadata?.planName || item.type?.replace('_', ' ').toUpperCase() || 'Subscription'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-gray-500 capitalize">
                        {item.type?.replace('_', ' ') || 'Plan Purchase'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {item.currencySymbol || '₹'} {Number(item.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-full border ${
                          item.status === 'completed' || item.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {item.status || 'Completed'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs font-mono text-gray-400">
                        {item.transactionId || item.stripePaymentIntentId || item._id?.substring(0, 12) || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {(item.status === 'completed' || item.status === 'paid') && (
                          <button
                            onClick={() => navigate('/provider/my-plan', { state: { invoiceData: item } })}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 rounded-lg transition border border-gray-100 hover:border-emerald-200 inline-flex items-center justify-center"
                            title={t("Download Invoice")}
                          >
                            <HiDownload className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{t("Account Activity Logs")}</h2>
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none hover:bg-gray-50 focus:ring-2 focus:ring-emerald-400 bg-white"
              >
                {currentFilterLabel}
                <HiChevronDown className="text-gray-400 w-4 h-4 shrink-0" />
              </button>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 py-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-10">
                  {filterOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setFilter(opt.value); setDropdownOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 ${filter === opt.value ? 'text-emerald-600 font-medium' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <HiClock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">{t("No activity yet")}</p>
              <p className="text-gray-400 text-sm mt-1">{t("Your profile views and contact unlocks will appear here")}</p>
            </div>
          ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {filtered.map((item, i) => {
            const cfg = typeConfig[item.type] || typeConfig.profile_view;
            const Icon = cfg.icon;
            return (
              <div key={i} className="flex items-center gap-3 sm:gap-4 p-4 hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 text-gray-500">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {cfg.label}
                    {item.user?.name && <span className="text-gray-500 font-normal"> {t("by")} {item.user.name}</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString()}
                    {item.searchSkill && <span>{t("· Skill:")}{item.searchSkill}</span>}
                    {item.searchCity && <span>{t("· City:")}{item.searchCity}</span>}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}
    </div>
  );
};

export default ProviderHistory;
