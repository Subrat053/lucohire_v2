import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { MessageCircle, Phone, Search, Loader } from 'lucide-react';
import Seo from '../../components/common/Seo';

export default function ContactLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getContactLogs(page);
      if (res.data.success) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to fetch contact logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="p-6">
      <Seo title="Contact Logs | Admin Panel" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contact Logs</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">User (Clicker)</th>
                <th className="px-6 py-4">Provider (Target)</th>
                <th className="px-6 py-4">Action Type</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                    <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                    No contact logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-gray-900">{log.user.name}</div>
                          <div className="text-xs text-gray-500">{log.user.email}</div>
                          <div className="text-xs text-gray-500">{log.user.phone}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.provider ? (
                        <div>
                          <div className="font-medium text-gray-900">{log.provider.profileName || log.provider.user?.name}</div>
                          <div className="text-xs text-gray-500">{log.provider.designation}</div>
                          <div className="text-xs text-gray-500">{log.provider.user?.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.actionType === 'whatsapp' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Phone className="w-3.5 h-3.5" /> Call
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-700">
              Page {page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
