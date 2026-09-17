import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import toast from "react-hot-toast";

const MagicLinkVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [status, setStatus] = useState("verifying"); // verifying, error

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const redirectUrl = params.get("redirect") || "/";

    if (!token) {
      setStatus("error");
      toast.error("Invalid or missing magic link token.");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await authAPI.verifyMagicLink({ token });
        const userData = response.data;
        
        // Log user in
        login(userData);
        
        toast.success("Successfully logged in!");
        navigate(redirectUrl, { replace: true });
      } catch (error) {
        console.error("Magic link error:", error);
        setStatus("error");
        toast.error(error.response?.data?.message || "Magic link expired or invalid.");
      }
    };

    verifyToken();
  }, [location, login, navigate]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Invalid or Expired</h2>
          <p className="text-gray-700 mb-6">
            This magic link is no longer valid. Please request a new one or login normally.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authenticating...</h2>
        <p className="text-gray-700">Please wait while we log you in securely.</p>
      </div>
    </div>
  );
};

export default MagicLinkVerify;
