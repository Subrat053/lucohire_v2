import { lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import ProviderLayout from "../components/provider/ProviderLayout";
import Navbar from "../components/common/Navbar";
import Seo from "../components/common/Seo";

// Lazy-loaded pages
const ProviderDashboard = lazy(() => import("../pages/provider/Dashboard"));
const ProviderProfile = lazy(() => import("../pages/provider/Profile"));
const ProviderPlans = lazy(() => import("../pages/provider/Plans"));
const CustomPlan = lazy(() => import("../pages/provider/CustomPlan"));
const ProviderLeads = lazy(() => import("../pages/provider/Leads"));
const ProviderHistory = lazy(() => import("../pages/provider/History"));
const ProviderJobs = lazy(() => import("../pages/provider/Jobs"));
const ProviderContacted = lazy(() => import("../pages/provider/Contacted"));
const ChangePassword = lazy(() => import("../pages/user/ChangePassword"));
const ReferralManagement = lazy(() => import("../pages/user/ReferralManagement"));
const ProviderWallet = lazy(() => import("../pages/provider/Wallet"));
const ProviderPayoutSettings = lazy(() => import("../pages/provider/PayoutSettings"));
const AddMember = lazy(() => import("../pages/provider/AddMember"));
const CareerHealthDashboard = lazy(() => import("../pages/provider/CareerHealthDashboard"));
const GrowWithAIDashboard = lazy(() => import("../pages/provider/GrowWithAIDashboard"));
const AiCareerCoach = lazy(() => import("../pages/provider/AiCareerCoach"));
const AITips = lazy(() => import("../pages/provider/AITips"));
const ResumeToolkit = lazy(() => import("../pages/provider/ResumeToolkit"));
const ProviderSupport = lazy(() => import("../pages/provider/Support"));
const AppliedJobs = lazy(() => import("../pages/provider/AppliedJobs"));
const SavedJobs = lazy(() => import("../pages/provider/SavedJobs"));
const JobDetail = lazy(() => import("../pages/provider/JobDetail"));
const ApplyJob = lazy(() => import("../pages/provider/ApplyJob"));
const ApplicationSuccess = lazy(() => import("../pages/provider/ApplicationSuccess"));
const ProviderRefunds = lazy(() => import("../pages/provider/ProviderRefunds"));

function ProviderLayoutWrapper({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Seo title="Provider Dashboard" robots="noindex, nofollow" />
      <Navbar />
      <main className="flex-1">
        <ProtectedRoute allowedRoles={["provider"]}>
          <ProviderLayout>{children}</ProviderLayout>
        </ProtectedRoute>
      </main>
    </div>
  );
}

export default function ProviderRoutes() {
  const wrap = (children) => <ProviderLayoutWrapper>{children}</ProviderLayoutWrapper>;
  const location = useLocation();
  
  return (
    <Routes>
      <Route path="" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={wrap(<ProviderDashboard />)} />
      <Route path="profile" element={wrap(<ProviderProfile />)} />
      <Route path="plans" element={wrap(<ProviderPlans />)} />
      <Route path="my-plan" element={wrap(<ProviderPlans />)} />
      <Route path="customise-plan" element={wrap(<CustomPlan />)} />
      <Route path="refunds" element={wrap(<ProviderRefunds />)} />
      <Route path="leads" element={wrap(<ProviderLeads />)} />
      <Route path="history" element={wrap(<ProviderHistory />)} />
      <Route path="job-for-me" element={wrap(<ProviderJobs />)} />
      <Route path="jobs" element={<Navigate to="/provider/job-for-me" state={location.state} replace />} />
      <Route path="applied-jobs" element={wrap(<AppliedJobs />)} />
      <Route path="saved-jobs" element={wrap(<SavedJobs />)} />
      <Route path="job/:jobId" element={wrap(<JobDetail />)} />
      <Route path="job/:jobId/apply" element={wrap(<ApplyJob />)} />
      <Route path="application-success/:applicationId" element={wrap(<ApplicationSuccess />)} />
      <Route path="contacted" element={wrap(<ProviderContacted />)} />
      <Route path="change-password" element={wrap(<ChangePassword />)} />
      <Route path="referrals" element={wrap(<ReferralManagement />)} />
      <Route path="add-member" element={wrap(<AddMember />)} />
      <Route path="wallet" element={wrap(<ProviderWallet />)} />
      <Route path="payout-settings" element={wrap(<ProviderPayoutSettings />)} />
      <Route path="support/:type?" element={wrap(<ProviderSupport />)} />

      {/* Career Health Routes */}
      <Route path="career-health" element={wrap(<CareerHealthDashboard />)} />
      <Route path="career-health/analytics" element={wrap(<CareerHealthDashboard tab="analytics" />)} />
      <Route path="career-health/actions" element={wrap(<CareerHealthDashboard tab="actions" />)} />
      <Route path="career-health/gps" element={wrap(<CareerHealthDashboard tab="gps" />)} />
      
      {/* Grow with AI Routes */}
      <Route path="grow-with-ai" element={wrap(<GrowWithAIDashboard />)} />
      <Route path="ai-career-coach" element={wrap(<AiCareerCoach />)} />
      <Route path="ai-tips" element={wrap(<AITips />)} />
      <Route path="resume-toolkit" element={wrap(<ResumeToolkit />)} />
    </Routes>
  );
}
