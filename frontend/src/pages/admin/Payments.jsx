import { useState, useEffect } from 'react';
import { HiCreditCard, HiSave, HiShieldCheck, HiRefresh, HiEye, HiEyeOff, HiExclamationCircle, HiCheckCircle, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const CURRENCY_SYMBOLS = {
    INR: '₹',
    USD: '$',
    AED: 'د.إ',
  };

  const formatMoney = (amount, currency) => {
    const code = String(currency || 'INR').toUpperCase();
    const symbol = CURRENCY_SYMBOLS[code] || `${code} `;
    return `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`;
  };

  // Payment settings state
  const [config, setConfig] = useState({
    stripe_publishable_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    stripe_simulation_mode: false,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [configConfigured, setConfigConfigured] = useState(true);
  const [configSource, setConfigSource] = useState("unknown");

  // Payment list state
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const limit = 15;

  useEffect(() => { fetchConfig(); }, []);
  useEffect(() => { fetchPayments(); }, [page]);

  const fetchConfig = async () => {
    try {
      const { data } = await adminAPI.getPaymentSettings();
      setConfig({
        stripe_publishable_key: data.stripe_publishable_key || '',
        stripe_secret_key: data.stripe_secret_key || '',
        stripe_webhook_secret: data.stripe_webhook_secret || '',
        stripe_simulation_mode: data.stripe_simulation_mode || false,
      });
      setConfigConfigured(
        typeof data.configured === 'boolean'
          ? data.configured
          : Boolean(
              data.stripe_publishable_key ||
              data.stripe_secret_key ||
              data.stripe_simulation_mode
            )
      );
      setConfigSource(data.source || 'unknown');
    } catch (err) {
      toast.error('Failed to load payment settings');
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      const { data } = await adminAPI.getPayments({ page, limit });
      setPayments(data.payments || []);
      setTotalPayments(data.pagination?.total || 0);
    } catch (err) {
      toast.error('Failed to load payments');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await adminAPI.updatePaymentSettings(config);
      toast.success('Payment settings saved!');
      fetchConfig(); // Refresh to get masked values
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const totalPages = Math.ceil(totalPayments / limit);
  const revenueByCurrency = payments
    .filter((p) => p.status === 'completed')
    .reduce((acc, p) => {
      const code = String(p.currency || 'INR').toUpperCase();
      acc[code] = (acc[code] || 0) + Number(p.amount || 0);
      return acc;
    }, {});

  if (configLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HiCreditCard className="w-7 h-7 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-900">Payment Gateway</h1>
      </div>

      {/* Simulation Mode Banner */}
      {config.stripe_simulation_mode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <HiExclamationCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Simulation Mode Active</h3>
            <p className="text-sm text-amber-700 mt-0.5">
              All payments are auto-completed without real transactions. Plans are activated instantly. 
              Disable this before going live.
            </p>
          </div>
        </div>
      )}

      {!configConfigured && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <HiExclamationCircle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Payment configuration not set</h3>
            <p className="text-sm text-red-700 mt-0.5">
              Add Stripe credentials here or set them in the backend environment
              (STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY). If neither is set,
              payments cannot be initiated.
            </p>
          </div>
        </div>
      )}

      {/* Razorpay Configuration Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiShieldCheck className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-gray-900">Stripe Configuration</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
              {configSource === 'database' && 'Source: Admin settings'}
              {configSource === 'env' && 'Source: Environment variables'}
              {configSource === 'none' && 'Source: Not configured'}
            </div>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Stripe Dashboard ↗
            </a>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Simulation Toggle */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div>
              <h3 className="font-medium text-gray-900">Payment Simulation Mode</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                When enabled, payments are auto-completed without Stripe. Great for testing.
              </p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, stripe_simulation_mode: !c.stripe_simulation_mode }))}
              className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors ${
                config.stripe_simulation_mode ? 'bg-amber-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                config.stripe_simulation_mode ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* API Key ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Publishable Key</label>
            <input
              type="text"
              value={config.stripe_publishable_key}
              onChange={e => setConfig(c => ({ ...c, stripe_publishable_key: e.target.value }))}
              placeholder="pk_test_xxxxxxxxxxxx"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Find this in Stripe Dashboard → Developers → API Keys</p>
          </div>

          {/* API Key Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Secret Key</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={config.stripe_secret_key}
                onChange={e => setConfig(c => ({ ...c, stripe_secret_key: e.target.value }))}
                placeholder="sk_test_xxxxxxxxxxxx"
                className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showSecret ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook Secret <span className="text-gray-400">(optional)</span></label>
            <div className="relative">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={config.stripe_webhook_secret}
                onChange={e => setConfig(c => ({ ...c, stripe_webhook_secret: e.target.value }))}
                placeholder="whsec_xxxxxxxxxxxx"
                className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showWebhookSecret ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Used for server-to-server webhook verification</p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium disabled:opacity-50"
          >
            <HiSave className="w-5 h-5" />
            {savingConfig ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Payment Transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Payment Transactions</h2>
            <p className="text-sm text-gray-500 mt-0.5">{totalPayments} total transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-semibold">
              Revenue: {Object.keys(revenueByCurrency).length === 0
                ? '0'
                : Object.entries(revenueByCurrency)
                  .map(([code, amount]) => formatMoney(amount, code))
                  .join(' | ')}
            </div>
            <button onClick={fetchPayments}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium">
              <HiRefresh className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {paymentsLoading ? (
          <div className="p-16 flex justify-center"><LoadingSpinner /></div>
        ) : payments.length === 0 ? (
          <div className="p-16 text-center text-gray-500">No payments found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Plan</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{p.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{p.user?.email || ''}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{p.plan?.name || '-'}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{formatMoney(p.amount, p.currency)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'completed' ? 'bg-green-100 text-green-700' :
                          p.status === 'failed' ? 'bg-red-100 text-red-700' :
                          p.status === 'created' ? 'bg-yellow-100 text-yellow-700' :
                          p.status === 'refunded' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {p.status === 'completed' && <HiCheckCircle className="w-3 h-3" />}
                          {p.status?.toUpperCase()}
                        </span>
                        {p.isSimulated && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px] font-medium">SIM</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-500">{p.type?.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-400 font-mono">
                            {p.stripePaymentIntentId || p.transactionId || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalPayments)} of {totalPayments}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <HiChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <HiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPayments;
