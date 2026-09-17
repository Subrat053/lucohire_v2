import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicRoutes from "./PublicRoutes";

// Lazy-load all authentication pages
const LucoSigninSignup = lazy(() => import("../components/auth/LucoSigninSignup"));
const AuthPage = lazy(() => import("../pages/AuthPage"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const MagicLinkVerify = lazy(() => import("../pages/auth/MagicLinkVerify"));

export default function AuthRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LucoSigninSignup />} />
      <Route path="signup" element={<LucoSigninSignup />} />
      <Route path="signup/freelancer" element={<LucoSigninSignup />} />
      <Route path="signup/provider" element={<LucoSigninSignup />} />
      <Route path="register" element={<LucoSigninSignup />} />
      <Route path="auth-legacy" element={<AuthPage />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password/:token" element={<ResetPassword />} />
      <Route path="auth" element={<Navigate to="/signup" replace />} />
      <Route path="auth/magic" element={<MagicLinkVerify />} />
      <Route path="auth/magic-verify" element={<MagicLinkVerify />} />

      {/* Fallback to PublicRoutes if not matching an auth path */}
      <Route path="*" element={<PublicRoutes />} />
    </Routes>
  );
}
