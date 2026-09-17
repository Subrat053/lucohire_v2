import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getDashboardByRole, useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(getDashboardByRole(role), { replace: true });
    }
  }, [isAuthenticated, authLoading, role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password required");
      return;
    }

    setLoading(true);
    try {
      const result = await login({ email, password }, { mode: "admin" });
      toast.success("Welcome back");
      navigate(result?.redirectTo || "/admin/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Checking session..." />
      </div>
    );
  }

  // Don't render form if already authenticated (redirect will happen via useEffect)
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Redirecting..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 text-white py-2.5 font-semibold hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

