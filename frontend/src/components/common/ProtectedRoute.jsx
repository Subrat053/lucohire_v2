import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

// Roles that require admin approval before accessing their dashboard
const APPROVAL_REQUIRED_ROLES = ['provider', 'recruiter'];

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // ── Hard block: if user is blocked, force logout to login page ─────────────
  if (user?.isBlocked) {
    return <Navigate to="/login" replace />;
  }

  const activeRole = user?.activeRole || user?.role;

  // ── Approval gate: pending providers/recruiters go to holding page ─────────
  // Only enforce when allowedRoles is specified (auth-only routes like /pending-approval skip this)
  if (allowedRoles && APPROVAL_REQUIRED_ROLES.includes(activeRole)) {
    const approvalStatus = user?.approvalStatus || 'approved';
    if (approvalStatus === 'pending') {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  // ── Role authorization ─────────────────────────────────────────────────────
  if (allowedRoles && !allowedRoles.includes(activeRole)) {
    if (activeRole === "provider") {
      return <Navigate to="/provider/plans" replace />;
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

  return children;
};

export default ProtectedRoute;