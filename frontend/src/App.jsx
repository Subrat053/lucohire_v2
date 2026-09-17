import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import ScrollToTop from "./components/common/ScrollToTop";
import PageLoader from "./components/common/PageLoader";
import NotFound from "./components/common/NotFound";
import PwaInstallPrompt from "./components/common/PwaInstallPrompt";
import { useAuth } from "./context/AuthContext";

// Lazy-loaded global modals/widgets
const WhatsAppNumberModal = lazy(() => import("./components/common/WhatsAppNumberModal"));
const Agentation = import.meta.env.DEV ? lazy(() => import("agentation").then(module => ({ default: module.Agentation }))) : () => null;
const CookieConsent = lazy(() => import("./components/common/CookieConsent"));
const AIChatWidget = lazy(() => import("./components/common/AIChatWidget"));

// Route Groups
const AuthRoutes = lazy(() => import("./routes/AuthRoutes"));
const ProviderRoutes = lazy(() => import("./routes/ProviderRoutes"));
const RecruiterRoutes = lazy(() => import("./routes/RecruiterRoutes"));
const AdminRoutes = lazy(() => import("./routes/AdminRoutes"));
const PartnerRoutes = lazy(() => import("./routes/PartnerRoutes"));
const DashboardRedirect = lazy(() => import("./components/common/DashboardRedirect"));
import LandingPageSkeleton from './components/landing/LandingPageSkeleton';

function App() {
  const { user, profile, showWhatsAppPrompt, setShowWhatsAppPrompt } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const handleChunkError = () => {
      const now = Date.now();
      const lastReload = sessionStorage.getItem("servicehub:last_chunk_reload");
      
      // Prevent infinite reloading loops (minimum 10 second gap)
      if (lastReload && now - Number(lastReload) < 10000) {
        console.error("Chunk reload triggered too recently. Skipping reload to avoid loop.");
        return;
      }
      
      sessionStorage.setItem("servicehub:last_chunk_reload", String(now));
      console.warn("Dynamic import failure detected. Reloading application to fetch latest build...");
      window.location.reload();
    };

    const handleError = (e) => {
      const message = e.message || "";
      if (
        message.includes("Failed to fetch dynamically imported module") || 
        message.includes("loading chunk") ||
        message.includes("Failed to fetch dynamic")
      ) {
        e.preventDefault(); // Prevent crash logger trigger
        handleChunkError();
      }
    };

    const handleRejection = (e) => {
      const reason = e.reason || "";
      const message = reason.message || String(reason);
      if (
        message.includes("Failed to fetch dynamically imported module") || 
        message.includes("loading chunk") ||
        message.includes("Failed to fetch dynamic")
      ) {
        e.preventDefault(); // Prevent crash logger trigger
        handleChunkError();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  const SuspenseFallback = () => {
    if (window.location.pathname === '/') {
      return <LandingPageSkeleton />;
    }
    return <PageLoader />;
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: "12px", background: "#333", color: "#fff", fontSize: "14px" },
        }}
      />
      <ScrollToTop />
      
      <Suspense fallback={null}>
        <WhatsAppNumberModal isOpen={showWhatsAppPrompt} onClose={() => setShowWhatsAppPrompt(false)} />
      </Suspense>
      <Suspense fallback={null}>
        <CookieConsent />
      </Suspense>

      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          {/* Provider Panel Routes */}
          <Route path="/provider/*" element={<ProviderRoutes />} />

          {/* Recruiter Panel Routes */}
          <Route path="/recruiter/*" element={<RecruiterRoutes />} />

          {/* Admin Panel Routes */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* Partner Panel Routes */}
          <Route path="/partner/*" element={<PartnerRoutes />} />

          {/* Global Dashboard Redirect */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Auth & Public Routes */}
          <Route path="/*" element={<AuthRoutes />} />

          {/* 404 — role-aware */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <Agentation />
        </Suspense>
      )}

      {/* Animated PWA Install Prompt */}
      <PwaInstallPrompt deferredPrompt={deferredPrompt} setDeferredPrompt={setDeferredPrompt} />
    </Router>
  );
}

export default App;
