import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { HiLockClosed, HiEye, HiEyeOff, HiCheckCircle, HiArrowLeft, HiSparkles } from "react-icons/hi";
import { authAPI } from "../../services/api";
import toast from "react-hot-toast";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }
    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, formData);
      setSuccess(true);
      toast.success("Password reset successfully");
      setTimeout(() => navigate("/login"), 3000);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Invalid or expired reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full blur-3xl -mr-48 -mt-48 opacity-50" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl -ml-48 -mb-48 opacity-50" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <HiSparkles className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-slate-900 tracking-tight">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Enter your new password below to regain access.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-slate-200/60 rounded-[32px] border border-white sm:px-10">
          {!success ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">
                    New Password
                  </label>
                  <div className="mt-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <HiLockClosed className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="appearance-none block w-full pl-11 pr-10 py-4 border border-slate-200 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all sm:text-sm font-medium"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600"
                    >
                      {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {formData.newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-slate-500 uppercase">Strength</span>
                        <span className={strength.label === "Strong" ? "text-green-700" : strength.label === "Good" ? "text-yellow-600" : "text-red-600"}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${strength.color}`} style={{ width: strength.label === "Strong" ? "100%" : strength.label === "Good" ? "60%" : "30%" }} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <HiLockClosed className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="appearance-none block w-full pl-11 pr-3 py-4 border border-slate-200 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all sm:text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-lg font-black text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <HiCheckCircle className="w-12 h-12 text-green-700" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Success!</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Your password has been reset successfully. Redirecting you to login...
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
              >
                Login Now
              </Link>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" />
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
