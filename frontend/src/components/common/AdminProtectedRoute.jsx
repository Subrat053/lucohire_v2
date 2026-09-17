import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  const role = user?.activeRole || user?.role || user?.roles?.[0];
  const isAdminOrManager = role === 'admin' || role === 'manager';

  if (!isAuthenticated || !isAdminOrManager) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


export default AdminProtectedRoute;
