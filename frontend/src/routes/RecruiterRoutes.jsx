import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import RecruiterLayout from "../components/recruiter/RecruiterLayout";
import Navbar from "../components/common/Navbar";
import Seo from "../components/common/Seo";

// Lazy-loaded pages
const RecruiterDashboard = lazy(() => import("../pages/recruiter/Dashboard"));
const RecruiterPostJob = lazy(() => import("../pages/recruiter/PostJob"));
const RecruiterPlans = lazy(() => import("../pages/recruiter/Plans"));
const RecruiterProfile = lazy(() => import("../pages/recruiter/Profile"));
const RecruiterHistory = lazy(() => import("../pages/recruiter/History"));
const RecruiterFindProviders = lazy(() => import("../pages/recruiter/FindProviders"));
const RecruiterApplications = lazy(() => import("../pages/recruiter/Applications"));
const ProviderPublicProfile = lazy(() => import("../pages/ProviderPublicProfile"));
const PendingApproval = lazy(() => import("../pages/PendingApproval"));
const RecruiterJobPostings = lazy(() => import("../pages/recruiter/JobPostings"));
const JobDetails = lazy(() => import("../pages/recruiter/JobDetails"));
const TopMatches = lazy(() => import("../pages/recruiter/TopMatches"));
const RecruiterShortlistedCandidates = lazy(() => import("../pages/recruiter/ShortlistedCandidates"));
const RecruiterSavedCandidates = lazy(() => import("../pages/recruiter/SavedCandidates"));
const CandidateDetails = lazy(() => import("../pages/recruiter/CandidateDetails"));
const CandidateInterviewKit = lazy(() => import("../pages/recruiter/CandidateInterviewKit"));
const ReportsAnalytics = lazy(() => import("../pages/recruiter/ReportsAnalytics"));
const ReportsOverview = lazy(() => import("../pages/recruiter/ReportsOverview"));
const ReportsHiringFunnel = lazy(() => import("../pages/recruiter/ReportsHiringFunnel"));
const ReportsSourceAnalytics = lazy(() => import("../pages/recruiter/ReportsSourceAnalytics"));

const ReportsJobPerformance = lazy(() => import("../pages/recruiter/ReportsJobPerformance"));
const ReportsOutreachAnalytics = lazy(() => import("../pages/recruiter/ReportsOutreachAnalytics"));
const ReportsAIInsights = lazy(() => import("../pages/recruiter/ReportsAIInsights"));
const ReportsCustomReports = lazy(() => import("../pages/recruiter/ReportsCustomReports"));
const RecruiterSearchHistory = lazy(() => import("../pages/recruiter/SearchHistory"));
const RecruiterTransactions = lazy(() => import("../pages/recruiter/Transactions"));
const RecruiterSettings = lazy(() => import("../pages/recruiter/Settings"));
const ChangePassword = lazy(() => import("../pages/user/ChangePassword"));
const ReferralManagement = lazy(() => import("../pages/user/ReferralManagement"));
const AIRecruiterWorkspace = lazy(() => import("../pages/recruiter/AIRecruiterWorkspace"));
const RecruiterTasks = lazy(() => import("../pages/recruiter/Tasks"));
const RecruiterOutreach = lazy(() => import("../pages/recruiter/Outreach"));
const RecruiterTalentPool = lazy(() => import("../pages/recruiter/TalentPool"));

function RecruiterLayoutWrapper({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Seo title="Recruiter Dashboard" robots="noindex, nofollow" />
      <Navbar />
      <main className="flex-1">
        <ProtectedRoute allowedRoles={["recruiter"]}>
          <RecruiterLayout>{children}</RecruiterLayout>
        </ProtectedRoute>
      </main>
    </div>
  );
}

export default function RecruiterRoutes() {
  const wrap = (children) => <RecruiterLayoutWrapper>{children}</RecruiterLayoutWrapper>;
  
  return (
    <Routes>
      <Route path="" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={wrap(<RecruiterDashboard />)} />
      <Route path="post-job" element={wrap(<RecruiterPostJob />)} />
      <Route path="plans" element={wrap(<RecruiterPlans />)} />
      <Route path="profile" element={wrap(<RecruiterProfile />)} />
      <Route path="history" element={wrap(<RecruiterHistory />)} />
      <Route path="find-providers" element={wrap(<RecruiterFindProviders />)} />
      <Route path="applications" element={wrap(<RecruiterApplications />)} />
      <Route path="provider/:id" element={wrap(<ProviderPublicProfile />)} />
      <Route path="pending-approval" element={wrap(<PendingApproval />)} />
      <Route path="jobs" element={wrap(<RecruiterJobPostings />)} />
      <Route path="jobs/:id" element={wrap(<JobDetails />)} />
      <Route path="job-postings" element={wrap(<RecruiterJobPostings />)} />
      <Route path="top-matches" element={wrap(<TopMatches />)} />
      <Route path="interested-candidates" element={wrap(<RecruiterApplications />)} />
      <Route path="ai-smart-search" element={wrap(<RecruiterFindProviders />)} />
      <Route path="shortlisted-candidates" element={wrap(<RecruiterShortlistedCandidates />)} />
      <Route path="candidates" element={wrap(<RecruiterSavedCandidates />)} />
      <Route path="candidates/:id" element={wrap(<CandidateDetails />)} />
      <Route path="candidates/:id/interview-kit" element={wrap(<CandidateInterviewKit />)} />
      <Route path="reports" element={wrap(<ReportsAnalytics />)}>
        <Route index element={<ReportsOverview />} />
        <Route path="hiring-funnel" element={<ReportsHiringFunnel />} />
        <Route path="source-analytics" element={<ReportsSourceAnalytics />} />

        <Route path="job-performance" element={<ReportsJobPerformance />} />
        <Route path="outreach-analytics" element={<ReportsOutreachAnalytics />} />
        <Route path="ai-insights" element={<ReportsAIInsights />} />
        <Route path="custom-reports" element={<ReportsCustomReports />} />
      </Route>
      <Route path="saved-candidates" element={wrap(<RecruiterSavedCandidates />)} />
      <Route path="search-history" element={wrap(<RecruiterSearchHistory />)} />
      <Route path="plans-billing" element={wrap(<RecruiterPlans />)} />
      <Route path="transactions" element={wrap(<RecruiterTransactions />)} />
      <Route path="company-profile" element={wrap(<RecruiterProfile />)} />
      <Route path="settings" element={wrap(<RecruiterSettings />)} />
      <Route path="change-password" element={wrap(<ChangePassword />)} />
      <Route path="referrals" element={wrap(<ReferralManagement />)} />
      <Route path="ai" element={wrap(<AIRecruiterWorkspace />)} />
      <Route path="tasks" element={wrap(<RecruiterTasks />)} />
      <Route path="outreach" element={wrap(<RecruiterOutreach />)} />
      <Route path="talent-pool" element={wrap(<RecruiterTalentPool />)} />
    </Routes>
  );
}
