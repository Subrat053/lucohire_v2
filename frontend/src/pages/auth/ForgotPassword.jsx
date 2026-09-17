import { useState } from "react";
import { Link } from "react-router-dom";
import { HiMail, HiArrowLeft, HiSparkles } from "react-icons/hi";
import { authAPI } from "../../services/api";
import toast from "react-hot-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email) return setErrorMsg("Please enter your email");

    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSubmitted(true);
      toast.success("Password reset instructions sent");
    } catch (error) {
      setErrorMsg(error?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full blur-3xl -mr-48 -mt-48 opacity-50" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl -ml-48 -mb-48 opacity-50" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <HiSparkles className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-slate-900 tracking-tight">
          Forgot Password?
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          No worries, we'll send you reset instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-slate-200/60 rounded-[32px] border border-white sm:px-10">
          {!submitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                  Email address
                </label>
                <div className="mt-1 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiMail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-11 pr-3 py-4 border border-slate-200 rounded-2xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all sm:text-sm font-medium"
                    placeholder="Enter your registered email"
                  />
                </div>
                {errorMsg && (
                  <p className="mt-2 text-sm font-bold text-red-500">
                    {errorMsg}
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-lg font-black text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <HiMail className="w-10 h-10 text-green-700" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Check your email</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  We've sent a password reset link to <span className="font-bold text-slate-900">{email}</span>. Please check your inbox and follow the instructions.
                </p>
              </div>
              <button
                onClick={() => setSubmitted(false)}
                className="text-indigo-600 font-bold hover:text-indigo-500 transition-colors"
              >
                Didn't receive email? Try again
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
