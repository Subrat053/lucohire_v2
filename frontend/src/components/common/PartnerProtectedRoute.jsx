import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const PartnerProtectedRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const activeRole = user?.activeRole || user?.role;
  const roles = Array.isArray(user?.roles) ? user.roles : [];

  const allowed =
    activeRole === "partner" ||
    activeRole === "manager" ||
    roles.includes("partner") ||
    roles.includes("manager");

  if (!allowed) return <Navigate to="/" replace />;

  return children;
};

export default PartnerProtectedRoute;