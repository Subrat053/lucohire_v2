import { useState, useEffect } from 'react';
import { HiMail, HiPhone, HiUser, HiTag, HiClock, HiEye, HiCheckCircle, HiInbox, HiTrash } from 'react-icons/hi';
import { enquiryAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const EnquiryDetailModal = ({ enquiry, onClose }) => {
  if (!enquiry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-fade-in overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HiMail className="w-6 h-6" />
            Enquiry Details
          </h2>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <HiCheckCircle className="w-7 h-7" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider">From</label>
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <HiUser className="text-indigo-400" />
                {enquiry.name}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Subject</label>
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <HiTag className="text-indigo-400" />
                {enquiry.subject || 'No Subject'}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Email</label>
              <div className="flex items-center gap-2 text-gray-700">
                <HiMail className="text-indigo-400" />
                <a href={`mailto:${enquiry.email}`} className="hover:text-indigo-600 hover:underline transition">
                  {enquiry.email}
                </a>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Phone</label>
              <div className="flex items-center gap-2 text-gray-700">
                <HiPhone className="text-indigo-400" />
                {enquiry.phone || 'N/A'}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Message</label>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-gray-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {enquiry.message}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 italic">
            <HiClock className="w-4 h-4" />
            Received on {new Date(enquiry.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
          >
            Close
          </button>
          <a
            href={`mailto:${enquiry.email}?subject=Re: ${enquiry.subject}`}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <HiMail className="w-5 h-5" />
            Reply via Email
          </a>
        </div>
      </div>
    </div>
  );
};

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const { data } = await enquiryAPI.getAll();
      setEnquiries(data);
    } catch (err) {
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Contact Enquiries</h1>
          <p className="text-gray-500 mt-1">Manage messages sent from the public Contact Us page.</p>
        </div>
        <button 
          onClick={fetchEnquiries}
          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition flex items-center gap-2 shadow-sm"
        >
          <HiClock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 font-medium">Fetching messages...</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <HiInbox className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">No enquiries found</h3>
            <p className="text-gray-500 max-w-sm">When users fill out the contact form, their messages will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Sender</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Message Preview</th>
                  <th className="text-center py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enquiries.map((item) => (
                  <tr key={item._id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700">
                        {item.subject || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <p className="text-sm text-gray-500 truncate">{item.message}</p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => setSelectedEnquiry(item)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition shadow-sm inline-flex items-center gap-2"
                      >
                        <HiEye className="w-5 h-5" />
                        <span className="text-xs font-bold pr-1">Read</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EnquiryDetailModal 
        enquiry={selectedEnquiry} 
        onClose={() => setSelectedEnquiry(null)} 
      />
    </div>
  );
};

export default Enquiries;
