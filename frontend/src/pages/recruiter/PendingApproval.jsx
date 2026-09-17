import useTranslation from "../../hooks/useTranslation";
import { Link } from 'react-router-dom';
import { HiClock, HiMail, HiRefresh } from 'react-icons/hi';

const RecruiterPendingApproval = () => {
  const {
    t
  } = useTranslation();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center">
          <HiClock className="w-8 h-8 text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("Recruiter Approval Pending")}</h1>
        <p className="text-gray-700 text-sm mb-6">{t(
          "Your recruiter account is under admin review. You can edit your profile and plans, but hiring actions will be enabled only after approval."
        )}</p>

        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          <Link
            to="/recruiter/profile"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            <HiRefresh className="w-4 h-4" />{t("Update Profile")}</Link>
          <Link
            to="/recruiter/plans"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            <HiMail className="w-4 h-4" />{t("View Plans")}</Link>
        </div>

        <p className="text-xs text-gray-500">{t(
          "If approval takes too long, contact support from admin panel communication channels."
        )}</p>
      </div>
    </div>
  );
};

export default RecruiterPendingApproval;
