import { useState, useEffect } from 'react';
import { HiSave, HiRefresh } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminWhatsApp = () => {
  const [settings, setSettings] = useState({ phoneNumberId: '', accessToken: '', businessAccountId: '', webhookVerifyToken: '' });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logPage, setLogPage] = useState(1);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await adminAPI.getWhatsappSettings();
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch {
      // settings may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const { data } = await adminAPI.getWhatsappLogs({ page, limit: 20 });
      setLogs(Array.isArray(data) ? data : data.logs || []);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateWhatsappSettings(settings);
      toast.success('WhatsApp settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <FaWhatsapp className="w-7 h-7 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Settings</h1>
      </div>

      {/* Settings Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Meta WhatsApp Business API</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
            <input value={settings.phoneNumberId || ''} onChange={(e) => setSettings(s => ({ ...s, phoneNumberId: e.target.value }))}
              placeholder="Enter Phone Number ID" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
            <input type="password" value={settings.accessToken || ''} onChange={(e) => setSettings(s => ({ ...s, accessToken: e.target.value }))}
              placeholder="Enter Access Token" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Account ID</label>
            <input value={settings.businessAccountId || ''} onChange={(e) => setSettings(s => ({ ...s, businessAccountId: e.target.value }))}
              placeholder="Enter Business Account ID" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Verify Token</label>
            <input value={settings.webhookVerifyToken || ''} onChange={(e) => setSettings(s => ({ ...s, webhookVerifyToken: e.target.value }))}
              placeholder="Enter Webhook Token" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-xl hover:bg-green-800 transition text-sm font-medium disabled:opacity-50">
          <HiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">WhatsApp Message Logs</h2>
          <button onClick={() => fetchLogs(logPage)} className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium">
            <HiRefresh className="w-4 h-4" /> Refresh
          </button>
        </div>

        {logsLoading ? (
          <div className="py-8 flex justify-center"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No WhatsApp logs yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Recipient</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2">{log.recipientPhone || log.recipient?.name || '-'}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {log.messageType || log.type || 'notification'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'sent' ? 'bg-green-100 text-green-700' :
                        log.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{log.status || 'pending'}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWhatsApp;
