import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PartnerProtectedRoute from "../components/common/PartnerProtectedRoute";
import PartnerLayout from "../pages/partner/PartnerLayout";
import Navbar from "../components/common/Navbar";
import Seo from "../components/common/Seo";

// Lazy-loaded pages
const PartnerDashboard = lazy(() => import("../pages/partner/PartnerDashboard"));
const PartnerPayouts = lazy(() => import("../pages/partner/PartnerPayouts"));
const CreatePartnerProvider = lazy(() => import("../pages/partner/CreatePartnerProvider"));
const CreatePartnerRecruiter = lazy(() => import("../pages/partner/CreatePartnerRecruiter"));
const PartnerBankDetails = lazy(() => import("../pages/partner/PartnerBankDetails"));
const ChangePassword = lazy(() => import("../pages/user/ChangePassword"));
const PartnerSupportIssues = lazy(() => import("../pages/partner/PartnerSupportIssues"));

function PartnerLayoutWrapper({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Seo title="Partner Dashboard" robots="noindex, nofollow" />
      <Navbar />
      <main className="flex-1">
        <PartnerProtectedRoute>
          <PartnerLayout>{children}</PartnerLayout>
        </PartnerProtectedRoute>
      </main>
    </div>
  );
}

export default function PartnerRoutes() {
  const wrap = (children) => <PartnerLayoutWrapper>{children}</PartnerLayoutWrapper>;
  
  return (
    <Routes>
      <Route path="" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={wrap(<PartnerDashboard />)} />
      <Route path="payouts" element={wrap(<PartnerPayouts />)} />
      <Route path="create-provider" element={wrap(<CreatePartnerProvider />)} />
      <Route path="create-recruiter" element={wrap(<CreatePartnerRecruiter />)} />
      <Route path="bank-details" element={wrap(<PartnerBankDetails />)} />
      <Route path="change-password" element={wrap(<ChangePassword />)} />
      <Route path="support" element={wrap(<PartnerSupportIssues />)} />
    </Routes>
  );
}
