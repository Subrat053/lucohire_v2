import React, { useState, useEffect } from 'react';
import { supportAPI, unlockProfileAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HiCheckCircle, HiClock, HiEye, HiCreditCard } from 'react-icons/hi';
import { useAuth, getDashboardByRole } from '../../context/AuthContext';

const AdminSupportIssues = () => {
  const { saveUserSession } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [accessingId, setAccessingId] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const res = await supportAPI.getAdminTickets();
      setIssues(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load payment issues');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await supportAPI.resolveAdminTicket(id);
      toast.success('Payment issue marked as resolved');
      fetchIssues(); // Refresh list
    } catch (error) {
      toast.error('Failed to resolve issue');
    } finally {
      setResolvingId(null);
    }
  };

  const handleDirectViewProfile = async (issue, targetSubPage = '/provider/my-plan') => {
    if (!issue?.user?.email) return toast.error('User email not found');
    setAccessingId(issue._id + '_' + targetSubPage);
    try {
      const res = await unlockProfileAPI.directUnlock({ email: issue.user.email });
      const userData = res.data.data;
      const impersonateToken = res.data.token;

      // Store current admin session before impersonating
      const currentToken = localStorage.getItem("authToken");
      const currentUser = JSON.parse(localStorage.getItem("authUser") || '{}');
      if (currentToken) {
        localStorage.setItem("impersonatorToken", currentToken);
        localStorage.setItem("impersonatorRole", currentUser.activeRole || 'admin');
        localStorage.setItem("impersonatorRestriction", "payment");
      }

      saveUserSession({ token: impersonateToken, user: userData });
      toast.success(`Opening ${userData.name || userData.email}'s details...`);
      
      const targetPath = userData.activeRole === 'provider' ? targetSubPage : getDashboardByRole(userData.activeRole);
      window.location.href = targetPath;
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to access user details');
    } finally {
      setAccessingId(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading issues...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Support Issues</h1>
        <p className="text-gray-500 text-sm mt-1">Manage user payment issues assigned to the Admin panel.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {issues.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payment issues found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {issues.map(issue => (
              <div key={issue._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-emerald-100 text-emerald-700">
                      {issue.type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(issue.createdAt).toLocaleString()}
                    </span>
                    {issue.status === 'open' ? (
                      <span className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <HiClock className="w-3 h-3 mr-1" /> Open
                      </span>
                    ) : (
                      <span className="flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <HiCheckCircle className="w-3 h-3 mr-1" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 font-medium mb-1">
                    {issue.user ? `${issue.user.name} (${issue.user.email})` : 'Unknown User'}
                  </p>
                  <p className="text-gray-700 text-sm">{issue.message}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  {issue.status === 'open' && issue.user && (
                    <>
                      <button
                        onClick={() => handleDirectViewProfile(issue, '/provider/my-plan')}
                        disabled={accessingId === issue._id + '_/provider/my-plan'}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium rounded-lg transition-colors text-sm border border-emerald-100 disabled:opacity-50"
                      >
                        <HiCreditCard className="w-4 h-4" /> {accessingId === issue._id + '_/provider/my-plan' ? 'Opening...' : 'View Payment History'}
                      </button>
                      <button
                        onClick={() => handleDirectViewProfile(issue, '/provider/profile')}
                        disabled={accessingId === issue._id + '_/provider/profile'}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium rounded-lg transition-colors text-sm border border-purple-100 disabled:opacity-50"
                      >
                        <HiEye className="w-4 h-4" /> {accessingId === issue._id + '_/provider/profile' ? 'Opening...' : 'View Profile'}
                      </button>
                    </>
                  )}
                  {issue.status === 'open' && (
                    <button
                      onClick={() => handleResolve(issue._id)}
                      disabled={resolvingId === issue._id}
                      className="flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium rounded-lg transition-colors text-sm disabled:opacity-50 border border-indigo-100"
                    >
                      {resolvingId === issue._id ? 'Resolving...' : 'Mark as Resolved'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupportIssues;
