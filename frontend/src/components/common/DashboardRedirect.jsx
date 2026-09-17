import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageLoader from "./PageLoader";

export default function DashboardRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const activeRole = user?.activeRole || user?.role;
  if (activeRole === "provider") {
    return <Navigate to="/provider/job-for-me" replace />;
  }
  if (activeRole === "recruiter") {
    return <Navigate to="/recruiter/job-postings" replace />;
  }
  if (activeRole === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (activeRole === "manager" || activeRole === "partner") {
    return <Navigate to="/partner/dashboard" replace />;
  }
  return <Navigate to="/" replace />;
}
