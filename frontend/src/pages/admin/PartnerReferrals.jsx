import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiSearch, HiFilter, HiChevronLeft, HiUser, HiBriefcase } from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PartnerReferrals = () => {
  const { partnerId } = useParams();
  const [referrals, setReferrals] = useState([]);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  useEffect(() => {
    fetchPartnerDetails();
    fetchReferrals();
  }, [partnerId, pagination.page, roleFilter]);

  const fetchPartnerDetails = async () => {
    try {
      const res = await adminAPI.getPartnerDetails(partnerId);
      setPartner(res.data?.partner || res.data);
    } catch (error) {
      console.error('Failed to fetch partner details');
    }
  };

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        role: roleFilter,
        search: search
      };
      const res = await adminAPI.getPartnerReferrals(partnerId, params);
      setReferrals(res.data?.referrals || []);
      setPagination(prev => ({
        ...prev,
        total: res.data?.pagination?.total || 0,
        pages: res.data?.pagination?.pages || 1
      }));
    } catch (error) {
      toast.error('Failed to fetch referrals');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchReferrals();
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50/50 min-h-screen">
      <div className="mb-8">
        <Link 
          to="/admin/partners" 
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors mb-4"
        >
          <HiChevronLeft className="w-4 h-4" /> Back to Partners
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Members referred by <span className="text-indigo-600">{partner?.name || 'Partner'}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all service providers and recruiters referred by this partner
            </p>
          </div>
          {partner && (
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Referral Code</p>
                <p className="font-mono font-bold text-gray-900">{partner.referralCode}</p>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Total Referrals</p>
                <p className="font-bold text-gray-900">{pagination.total}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="relative max-w-md flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name, email or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-sm"
            />
          </form>
          <div className="flex items-center gap-3">
            <select 
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="provider">Providers</option>
              <option value="recruiter">Recruiters</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4 text-left">Member</th>
                  <th className="px-6 py-4 text-left">Role</th>
                  <th className="px-6 py-4 text-left">Subscription</th>
                  <th className="px-6 py-4 text-left">Joined Date</th>
                  <th className="px-6 py-4 text-left">Commission</th>
                  <th className="px-6 py-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referrals.length > 0 ? (
                  referrals.map((member, index) => (
                    <tr key={member.userId || member._id || member.id || index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold shrink-0">
                            {member.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                            <p className="text-[10px] text-gray-400">{member.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {member.role === 'provider' ? (
                            <HiBriefcase className="w-4 h-4 text-indigo-500" />
                          ) : (
                            <HiUser className="w-4 h-4 text-purple-500" />
                          )}
                          <span className="capitalize text-gray-700 font-medium">{member.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{member.subscriptionPlan || 'No Plan'}</span>
                          <span className={`text-[10px] font-bold ${
                            member.subscriptionStatus === 'active' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {member.subscriptionStatus?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {new Date(member.joinedDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">₹{Number(member.partnerCommissionAmount || 0).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-gray-400">from ₹{Number(member.firstSubscriptionAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          member.accountStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' : 
                          member.accountStatus === 'rejected' ? 'bg-red-50 text-red-700' : 
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {member.accountStatus ? member.accountStatus.charAt(0).toUpperCase() + member.accountStatus.slice(1) : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-medium">
                      No referred members found for this partner.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <div>
            Showing {referrals.length} of {pagination.total} referrals
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1 || loading}
              className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            <div className="flex items-center px-4 font-medium text-gray-700 bg-gray-50 rounded-lg border border-gray-100">
              {pagination.page} / {pagination.pages}
            </div>
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages || loading}
              className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerReferrals;
