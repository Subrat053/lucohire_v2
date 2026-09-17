import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminProtectedRoute from "../components/common/AdminProtectedRoute";
import AdminLayout from "../components/admin/AdminLayout";
import Navbar from "../components/common/Navbar";
import Seo from "../components/common/Seo";

// Lazy-loaded pages
const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminWithdrawals = lazy(() => import("../pages/admin/AdminWithdrawals"));
const AdminCommissionSettings = lazy(() => import("../pages/admin/AdminCommissionSettings"));
const Partners = lazy(() => import("../pages/admin/Partners"));
const PartnerReferrals = lazy(() => import("../pages/admin/PartnerReferrals"));
const AdminManagerBankAccounts = lazy(() => import("../pages/admin/ManagerBankAccounts"));
const AdminPartnerPayouts = lazy(() => import("../pages/admin/AdminPartnerPayouts"));
const AdminReferrals = lazy(() => import("../pages/admin/AdminReferrals"));
const AdminCommissions = lazy(() => import("../pages/admin/AdminCommissions"));
const AdminRewardPool = lazy(() => import("../pages/admin/AdminRewardPool"));
const AdminUsers = lazy(() => import("../pages/admin/Users"));
const AdminProviders = lazy(() => import("../pages/admin/Providers"));
const AdminRecruiters = lazy(() => import("../pages/admin/Recruiters"));
const AdminPlans = lazy(() => import("../pages/admin/Plans"));
const AdminCustomPlanRequests = lazy(() => import("../pages/admin/CustomPlanRequests"));
const Socials = lazy(() => import("../pages/admin/Socials"));
const AdminSettings = lazy(() => import("../pages/admin/Settings"));
const AdminManagers = lazy(() => import("../pages/admin/Managers"));
const AdminPayments = lazy(() => import("../pages/admin/Payments"));
const AdminStagingCandidates = lazy(() => import("../pages/admin/StagingCandidates"));
const AdminProviderSubscriptions = lazy(() => import("../pages/admin/ProviderSubscriptions"));
const AdminPageContent = lazy(() => import("../pages/admin/PageContentManager"));
const AdminSkills = lazy(() => import("../pages/admin/Skills"));
const AdminJobRoles = lazy(() => import("../pages/admin/JobRoles"));
const AdminWhatsApp = lazy(() => import("../pages/admin/WhatsApp"));
const AdminCurrency = lazy(() => import("../pages/admin/Currency"));
const AdminCountries = lazy(() => import("../pages/admin/Countries"));
const AdminAIOps = lazy(() => import("../pages/admin/AIControlCenter"));
const AssetApprovals = lazy(() => import("../pages/admin/AssetApprovals"));
const ProfileReviewDetail = lazy(() => import("../pages/admin/ProfileReviewDetail"));
const ResumeApprovals = lazy(() => import("../pages/admin/ResumeApprovals"));
const AdminPortfolioApprovals = lazy(() => import("../pages/admin/PortfolioApprovals"));
const AdminEnquiries = lazy(() => import("../pages/admin/Enquiries"));
const AdminSupportIssues = lazy(() => import("../pages/admin/AdminSupportIssues"));
const AdminContactLogs = lazy(() => import("../pages/admin/ContactLogs"));

const ChangePassword = lazy(() => import("../pages/user/ChangePassword"));
const AdminOtpLogs = lazy(() => import("../pages/admin/OtpLogs"));
const AdminAiResumeLogs = lazy(() => import("../pages/admin/AiResumeLogs"));
const AdminCandidateUnlockLogs = lazy(() => import("../pages/admin/CandidateUnlockLogs"));
const AdminResumeAccessLogs = lazy(() => import("../pages/admin/ResumeAccessLogs"));
const HealthDashboard = lazy(() => import("../pages/admin/HealthDashboard"));
const BulkOutreach = lazy(() => import("../components/admin/BulkOutreach"));
const ImportCandidates = lazy(() => import("../pages/admin/ImportCandidates"));
const ImportRecruiters = lazy(() => import("../pages/admin/ImportRecruiters"));
const DataPipeline = lazy(() => import("../pages/admin/DataPipeline"));
const PipelineAdmin = lazy(() => import("../pages/admin/pipeline/PipelineAdmin"));
const ScrapedDataVault = lazy(() => import("../pages/admin/ScrapedDataVault"));
const RecruiterApprovals = lazy(() => import("../pages/admin/RecruiterApprovals"));

// Synced Jobs & ATS Sync Module
const JobSources = lazy(() => import("../pages/admin/JobSources"));
const CompanySources = lazy(() => import("../pages/admin/CompanySources"));
const ExternalJobs = lazy(() => import("../pages/admin/ExternalJobs"));
const SyncReports = lazy(() => import("../pages/admin/SyncReports"));
const SyncErrors = lazy(() => import("../pages/admin/SyncErrors"));
const RecruiterLeads = lazy(() => import("../pages/admin/RecruiterLeads"));
const LiveTester = lazy(() => import("../pages/admin/LiveTester"));
const BulkCrawlerPanel = lazy(() => import("../pages/admin/components/BulkCrawlerPanel"));
const NightlyEngineSettings = lazy(() => import("../pages/admin/components/NightlyEngineSettings"));
const LiveQueueMonitor = lazy(() => import("../pages/admin/components/LiveQueueMonitor"));
const StagingCandidates = lazy(() => import("../pages/admin/StagingCandidates"));
const AdminRefundRequests = lazy(() => import("../pages/admin/RefundRequests"));

const ExternalServices = lazy(() => import("../pages/admin/ExternalServices"));
const SeoCommandCenter = lazy(() => import("../pages/admin/pipeline/SeoCommandCenter"));
const SelfHealingCenter = lazy(() => import("../pages/admin/pipeline/SelfHealingCenter"));

function AdminLayoutWrapper({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Seo title="Admin Dashboard" robots="noindex, nofollow" />
      <Navbar />
      <main className="flex-1">
        <AdminProtectedRoute>
          <AdminLayout>{children}</AdminLayout>
        </AdminProtectedRoute>
      </main>
    </div>
  );
}

export default function AdminRoutes() {
  const wrap = (children) => <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
  
  return (
    <Routes>
      <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard" element={wrap(<AdminDashboard />)} />
      <Route path="refunds" element={wrap(<AdminRefundRequests />)} />
      <Route path="withdrawals" element={wrap(<AdminWithdrawals />)} />
      <Route path="commission-settings" element={wrap(<AdminCommissionSettings />)} />
      <Route path="partners" element={wrap(<Partners />)} />
      <Route path="partners/:partnerId/referrals" element={wrap(<PartnerReferrals />)} />
      <Route path="manager-bank-accounts" element={wrap(<AdminManagerBankAccounts />)} />
      <Route path="partner-payouts" element={wrap(<AdminPartnerPayouts />)} />
      <Route path="referrals" element={wrap(<AdminReferrals />)} />
      <Route path="commissions" element={wrap(<AdminCommissions />)} />
      <Route path="reward-pool" element={wrap(<AdminRewardPool />)} />
      <Route path="contact-logs" element={wrap(<AdminContactLogs />)} />
      <Route path="users" element={wrap(<AdminUsers />)} />
      <Route path="providers" element={wrap(<AdminProviders />)} />
      <Route path="recruiters" element={wrap(<AdminRecruiters />)} />
      <Route path="recruiter" element={wrap(<AdminRecruiters />)} />
      <Route path="recriters" element={wrap(<AdminRecruiters />)} />
      <Route path="plans" element={wrap(<AdminPlans />)} />
      <Route path="custom-plans" element={wrap(<AdminCustomPlanRequests />)} />
      <Route path="settings" element={wrap(<AdminSettings />)} />
      <Route path="socials" element={wrap(<Socials />)} />
      <Route path="managers" element={wrap(<AdminManagers />)} />
      <Route path="payments" element={wrap(<AdminPayments />)} />
      <Route path="staging-candidates" element={wrap(<AdminStagingCandidates />)} />
      <Route path="provider-subscriptions" element={wrap(<AdminProviderSubscriptions />)} />
      <Route path="page-content" element={wrap(<AdminPageContent />)} />
      <Route path="skills" element={wrap(<AdminSkills />)} />
      <Route path="job-roles" element={wrap(<AdminJobRoles />)} />
      <Route path="whatsapp" element={wrap(<AdminWhatsApp />)} />
      <Route path="currency" element={wrap(<AdminCurrency />)} />
      <Route path="countries" element={wrap(<AdminCountries />)} />
      <Route path="ai" element={wrap(<AdminAIOps />)} />
      <Route path="profile-photo-approvals" element={wrap(<AssetApprovals />)} />
      <Route path="profile-approvals" element={wrap(<AssetApprovals />)} />
      <Route path="profile-approval/:userId" element={wrap(<ProfileReviewDetail />)} />
      <Route path="resume-approvals" element={wrap(<ResumeApprovals />)} />
      <Route path="portfolio-approvals" element={wrap(<AdminPortfolioApprovals />)} />
      <Route path="enquiries" element={wrap(<AdminEnquiries />)} />
      <Route path="support-issues" element={wrap(<AdminSupportIssues />)} />
      <Route path="change-password" element={wrap(<ChangePassword />)} />
      
      {/* Advanced Modules */}
      <Route path="seo-command-center" element={wrap(<SeoCommandCenter />)} />
      <Route path="self-healing" element={wrap(<SelfHealingCenter />)} />
      
      {/* Logs & Audit */}
      <Route path="otp-logs" element={wrap(<AdminOtpLogs />)} />
      <Route path="ai-resume-logs" element={wrap(<AdminAiResumeLogs />)} />
      <Route path="candidate-unlock-logs" element={wrap(<AdminCandidateUnlockLogs />)} />
      <Route path="resume-access-logs" element={wrap(<AdminResumeAccessLogs />)} />
      
      {/* Ingestion & ATS Sync Engine Control */}
      <Route path="data-pipeline/sources" element={wrap(<JobSources />)} />
      <Route path="data-pipeline/jobs" element={wrap(<ExternalJobs />)} />
      <Route path="data-pipeline/reports" element={wrap(<SyncReports />)} />
      <Route path="data-pipeline/errors" element={wrap(<SyncErrors />)} />
      
      <Route path="company-sources" element={wrap(<CompanySources />)} />
      <Route path="recruiter-leads" element={wrap(<RecruiterLeads />)} />

      {/* Engine Control */}
      <Route path="health" element={wrap(<HealthDashboard />)} />
      <Route path="outreach" element={wrap(<BulkOutreach />)} />
      <Route path="import-candidates" element={wrap(<ImportCandidates />)} />
      <Route path="import-recruiters" element={wrap(<ImportRecruiters />)} />
      <Route path="recruiter-approvals" element={wrap(<RecruiterApprovals />)} />
      <Route path="data-pipeline" element={wrap(<DataPipeline />)} />
      <Route path="pipeline/*" element={wrap(<PipelineAdmin />)} />
      <Route path="scraped-vault/jobs" element={wrap(<ExternalJobs />)} />
      <Route path="scraped-vault/candidates" element={wrap(<StagingCandidates />)} />
      <Route path="scraped-vault/recruiters" element={wrap(<RecruiterLeads />)} />
      
      {/* Crawlers & Scrapers sub-routes */}
      <Route path="crawlers/single" element={wrap(<div className="p-8 max-w-7xl mx-auto"><LiveTester /></div>)} />
      <Route path="crawlers/bulk" element={wrap(<div className="p-8 max-w-7xl mx-auto"><BulkCrawlerPanel /></div>)} />
      <Route path="crawlers/queue" element={wrap(<div className="p-8 max-w-7xl mx-auto"><LiveQueueMonitor /></div>)} />
      <Route path="crawlers/engine" element={wrap(<div className="p-8 max-w-7xl mx-auto"><NightlyEngineSettings /></div>)} />
      <Route path="crawlers/jobs" element={wrap(<ExternalJobs defaultFilters={{ source: 'crawler' }} />)} />
      <Route path="crawlers" element={<Navigate to="/admin/crawlers/bulk" replace />} />

      <Route path="external-services" element={wrap(<ExternalServices />)} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
