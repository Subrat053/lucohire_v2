import { HiClock, HiShieldCheck } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import Seo from '../components/common/Seo';

const PendingApproval = () => {
  const { user } = useAuth();
  const role = user?.activeRole || user?.role;
  const roleLabel = role === 'provider' ? 'provider' : 'recruiter';
  const isRejected = user?.approvalStatus === 'rejected';
  const rejectionReason = user?.rejectionReason || 'No reason provided.';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <Seo title={isRejected ? "Approval Rejected" : "Approval Pending"} robots="noindex, nofollow" />
      <div className="w-full max-w-xl bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isRejected ? 'bg-red-100' : 'bg-amber-100'}`}>
          <HiClock className={`w-8 h-8 ${isRejected ? 'text-red-600' : 'text-amber-600'}`} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isRejected ? 'Approval Rejected' : 'Approval Pending'}
        </h1>
        <p className="text-gray-700 text-sm mb-6">
          {isRejected
            ? `Your ${roleLabel} account request was rejected.`
            : `Your ${roleLabel} account is under manager/admin review. Panel access will be enabled after approval.`}
        </p>

        <div className={`rounded-xl p-4 text-left text-sm ${isRejected ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-amber-50 border border-amber-100 text-amber-800'}`}>
          <div className="flex items-center gap-2 font-semibold mb-1">
            <HiShieldCheck className="w-4 h-4" /> {isRejected ? 'Request denied' : 'Access is temporarily restricted'}
          </div>
          <p>
            {isRejected
              ? `Reason: ${rejectionReason}`
              : 'You currently cannot access dashboard, plans, profile, leads, jobs, or other panel sections until approval is completed.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
