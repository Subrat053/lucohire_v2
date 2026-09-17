import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CountryPhoneInput from '../../components/common/CountryPhoneInput';

const initialForm = { name: '', email: '', phone: '', countryCode: '+91', nationalNumber: '', password: '' };

const AdminManagers = () => {
  const [managers, setManagers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const handlePhoneChange = (phoneData) => {
    setForm((prev) => ({
      ...prev,
      phone: phoneData.fullPhone,
      countryCode: phoneData.countryCode,
      nationalNumber: phoneData.nationalNumber,
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [{ data: managersData }, { data: logsData }] = await Promise.all([
        adminAPI.getManagers(),
        adminAPI.getApprovalLogs({ limit: 50 }),
      ]);
      setManagers(managersData.managers || []);
      setLogs(logsData.logs || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load manager data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }

    try {
      setCreating(true);
      const { data } = await adminAPI.createManager(form);
      toast.success('Manager created successfully');
      if (data.generatedPassword) {
        toast(`Generated password: ${data.generatedPassword}`, { duration: 9000 });
      }
      setForm(initialForm);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create manager');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteManager = async (managerId, managerName) => {
    if (!window.confirm(`Delete manager ${managerName || ''}?`)) return;

    try {
      setDeletingId(managerId);
      await adminAPI.deleteManager(managerId);
      toast.success('Manager deleted successfully');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete manager');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manager Control</h1>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Manager</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Manager name"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
            />
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Manager email"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
            />
            <div className="relative">
              <CountryPhoneInput
                variant="admin-manager"
                countryCode={form.countryCode}
                nationalNumber={form.nationalNumber}
                onChange={handlePhoneChange}
              />
            </div>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Password (optional: auto-generated if empty)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {creating ? 'Creating...' : 'Create Manager'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Managers</h2>
          {loading ? (
            <div className="py-10 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-auto pr-1">
              {managers.map((m) => (
                <div key={m._id} className="rounded-xl border border-gray-100 p-3">
                  <p className="font-medium text-gray-900">{m.name}</p>
                  <p className="text-sm text-gray-500">{m.email}</p>
                  <p className="text-xs text-gray-400">Last login: {m.lastLogin ? new Date(m.lastLogin).toLocaleString() : 'Never'}</p>
                  <div className="mt-2">
                    <button
                      type="button"
                      disabled={deletingId === m._id}
                      onClick={() => handleDeleteManager(m._id, m.name)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingId === m._id ? 'Deleting...' : 'Delete Manager'}
                    </button>
                  </div>
                </div>
              ))}
              {managers.length === 0 && <p className="text-sm text-gray-500">No managers created yet.</p>}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Audit Log</h2>
        {loading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500">No approval actions recorded yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Target</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-gray-50 text-gray-700">
                    <td className="py-2 pr-4">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{log.actorName || 'Unknown'} ({log.actorRole})</td>
                    <td className="py-2 pr-4 capitalize">{log.action}</td>
                    <td className="py-2 pr-4">{log.targetType}: {log.targetName || 'Unknown'}</td>
                    <td className="py-2">{log.note || '-'}</td>
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

export default AdminManagers;
