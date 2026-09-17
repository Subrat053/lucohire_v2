import { useState } from "react";
import { Link } from "react-router-dom";
import { HiLockClosed, HiEye, HiEyeOff, HiShieldCheck, HiMail, HiPhone, HiKey, HiExternalLink } from "react-icons/hi";
import { authAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ChangePassword = () => {
  const { user, refreshUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const getPasswordStrength = (password) => {
    if (!password) return { label: "", color: "bg-slate-200" };
    if (password.length < 6) return { label: "Weak", color: "bg-red-400" };
    if (password.length < 10) return { label: "Good", color: "bg-yellow-400" };
    return { label: "Strong", color: "bg-green-500" };
  };

  const strength = getPasswordStrength(formData.newPassword);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendResetOtp = async () => {
    const targetEmail = user?.email;
    if (!targetEmail) {
      return toast.error("No registered email address found for your account.");
    }

    setSendingReset(true);
    try {
      await authAPI.forgotPassword({ email: targetEmail });
      setResetSent(true);
      toast.success(`Password reset link & verification OTP sent to ${targetEmail}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send reset link / OTP");
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }
    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error("New passwords do not match");
    }

    setLoading(true);
    try {
      await authAPI.changePassword(formData);
      toast.success("Password changed successfully");
      
      // Force local update immediately as a fallback
      try {
        const cachedStr = localStorage.getItem('authUser') || localStorage.getItem('user');
        if (cachedStr) {
          const cachedUser = JSON.parse(cachedStr);
          cachedUser.hasPassword = true;
          localStorage.setItem('authUser', JSON.stringify(cachedUser));
        }
      } catch(e) {}

      // Refresh user data so hasPassword is updated in React context
      if (refreshUser) await refreshUser();
      
      setFormData({
        newPassword: "",
        confirmPassword: "",
      });
      
      // Auto-redirect to dashboard to clear state
      setTimeout(() => {
         window.location.href = user?.role === 'admin' ? '/admin/dashboard' : user?.activeRole === 'recruiter' ? '/recruiter/dashboard' : '/provider/dashboard';
      }, 1500);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const getUpdateProfileLink = () => {
    if (user?.role === 'admin') return '/admin/settings';
    if (user?.activeRole === 'recruiter' || user?.role === 'recruiter') return '/recruiter/settings';
    return '/provider/profile';
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 lg:mt-9 space-y-6">


      {/* ── Main Change Password Form ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="bg-white border-b border-slate-200 p-6 sm:p-8 sm:pb-5 pb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Change Password</h2>
            <p className="text-slate-500 font-medium text-sm mt-1.5">Update your account security settings</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-0">
              New Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <HiLockClosed className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              </div>
              <input
                name="newPassword"
                type={showPassword ? "text" : "password"}
                required
                value={formData.newPassword}
                onChange={handleChange}
                className="block w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all outline-none font-medium text-slate-900"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600"
              >
                {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
              </button>
            </div>
            
            {/* Strength indicator */}
            {formData.newPassword && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-1.5">
                  <span className="text-slate-400">Security Strength</span>
                  <span className={strength.label === "Strong" ? "text-green-700" : strength.label === "Good" ? "text-yellow-600" : "text-red-600"}>
                    {strength.label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${strength.color}`} style={{ width: strength.label === "Strong" ? "100%" : strength.label === "Good" ? "60%" : "30%" }} />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Password must be at least 6 characters long.
                </p>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-0">
              Confirm New Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <HiLockClosed className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              </div>
              <input
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="block w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all outline-none font-medium text-slate-900"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <HiShieldCheck className="w-6 h-6" />
                  Update Password
                </>
              )}
            </button>
          </div>


        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
