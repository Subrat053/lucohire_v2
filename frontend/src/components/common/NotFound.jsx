import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useTranslation from "../../hooks/useTranslation";

const getDashboardByRole = (role) => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "partner":
    case "manager":
      return "/partner/dashboard";
    case "provider":
      return "/provider/dashboard";
    case "recruiter":
      return "/recruiter/job-postings";
    default:
      return "/";
  }
};

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, profile, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return null;

  const role = user?.activeRole || user?.role || profile?.role;

  if (isAuthenticated) {
    return <Navigate to={getDashboardByRole(role)} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F7FB] px-6 text-center">
      <h1 className="text-5xl font-bold text-[#081B3A] mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-[#081B3A] mb-2">{t('common.pageNotFound', 'Page Not Found')}</h2>
      <p className="text-gray-700 mb-6">{t('common.pageMissing', 'The page you are looking for does not exist.')}</p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-3 rounded-xl bg-[#6C4DF6] text-white font-semibold hover:bg-[#5a3ee0]"
      >
        {t('common.goHome', 'Go to Home')}
      </button>
    </div>
  );
};

export default NotFound;
