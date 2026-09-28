import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import ScrollToTop from "./components/common/ScrollToTop";
import PageLoader from "./components/common/PageLoader";
import NotFound from "./components/common/NotFound";
import PwaInstallPrompt from "./components/common/PwaInstallPrompt";
import { useAuth } from "./context/AuthContext";

import PrivacyNoticeBanner from "./components/common/PrivacyNoticeBanner";

// Helper for resilient lazy imports
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn("Dynamic import failed, retrying once...", error);
      await new Promise((resolve) => setTimeout(resolve, 800));
      return await componentImport();
    }
  });

// Lazy-loaded global modals/widgets
const WhatsAppNumberModal = lazyWithRetry(() => import("./components/common/WhatsAppNumberModal"));
const Agentation = import.meta.env.DEV ? lazyWithRetry(() => import("agentation").then(module => ({ default: module.Agentation }))) : () => null;
const AIChatWidget = lazyWithRetry(() => import("./components/common/AIChatWidget"));

// Route Groups
const AuthRoutes = lazyWithRetry(() => import("./routes/AuthRoutes"));
const ProviderRoutes = lazyWithRetry(() => import("./routes/ProviderRoutes"));
const RecruiterRoutes = lazyWithRetry(() => import("./routes/RecruiterRoutes"));
const AdminRoutes = lazyWithRetry(() => import("./routes/AdminRoutes"));
const PartnerRoutes = lazyWithRetry(() => import("./routes/PartnerRoutes"));
const DashboardRedirect = lazyWithRetry(() => import("./components/common/DashboardRedirect"));
const FreelancerLayout = lazyWithRetry(() => import("./layouts/FreelancerLayout"));
const FreelancerDashboardPage = lazyWithRetry(() => import("./pages/freelancer/FreelancerDashboardPage"));
const FreelancerLeadsPage = lazyWithRetry(() => import("./pages/freelancer/FreelancerLeadsPage"));
const FreelancerResumeJourneyPage = lazyWithRetry(() => import("./pages/freelancer/FreelancerResumeJourneyPage"));
import LandingPageSkeleton from './components/landing/LandingPageSkeleton';
import ProtectedRoute from "./components/common/ProtectedRoute";

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
      <PrivacyNoticeBanner />

      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          {/* ========================================================================= */}
          {/* CATEGORY 1: FREELANCER & CANDIDATE SUITE                                  */}
          {/* ========================================================================= */}
          <Route
            path="/freelancer"
            element={
              <ProtectedRoute allowedRoles={["provider"]}>
                <FreelancerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FreelancerDashboardPage />} />
            <Route path="leads" element={<FreelancerLeadsPage />} />
            <Route path="resume" element={<FreelancerResumeJourneyPage />} />
            <Route path="resume-journey" element={<Navigate to="resume" replace />} />
          </Route>
          <Route
            path="/candidate/dashboard"
            element={<Navigate to="/freelancer/dashboard" replace />}
          />

          {/* ========================================================================= */}
          {/* CATEGORY 2: LEGACY PROVIDER PANEL SUITE (PRESERVED UNTOUCHED)             */}
          {/* ========================================================================= */}
          <Route path="/provider/*" element={<ProviderRoutes />} />

          {/* ========================================================================= */}
          {/* CATEGORY 3: RECRUITER PANEL SUITE                                         */}
          {/* ========================================================================= */}
          <Route path="/recruiter/*" element={<RecruiterRoutes />} />

          {/* ========================================================================= */}
          {/* CATEGORY 4: ADMIN PANEL SUITE                                             */}
          {/* ========================================================================= */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* ========================================================================= */}
          {/* CATEGORY 5: PARTNER & MANAGER PANEL SUITE                                 */}
          {/* ========================================================================= */}
          <Route path="/partner/*" element={<PartnerRoutes />} />

          {/* ========================================================================= */}
          {/* CATEGORY 6: GLOBAL ROLE-AWARE DASHBOARD REDIRECT                          */}
          {/* ========================================================================= */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* ========================================================================= */}
          {/* CATEGORY 7: AUTHENTICATION & PUBLIC PORTAL ROUTES                         */}
          {/* ========================================================================= */}
          <Route path="/*" element={<AuthRoutes />} />

          {/* ========================================================================= */}
          {/* CATEGORY 8: ROLE-AWARE 404 NOT FOUND                                      */}
          {/* ========================================================================= */}
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
