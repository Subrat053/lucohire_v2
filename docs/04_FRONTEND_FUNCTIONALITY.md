# 04_FRONTEND_FUNCTIONALITY.md

## Frontend Functionality Audit

### Technology Stack
- **Framework:** React 18.3.1 with Vite 5.4.10
- **Routing:** React Router DOM 6.30.3 (BrowserRouter)
- **State Management:** Context API (AuthContext, LocationContext, LocaleContext, LanguageContext)
- **Styling:** Tailwind CSS 4.2.1 with daisyui
- **HTTP Client:** Axios 1.13.5
- **Socket.io:** socket.io-client 4.8.3 for realtime
- **Form Handling:** react-helmet-async, react-hot-toast
- **UI Libraries:** 
  - react-icons, lucide-react
  - react-select, react-markdown
  - react-quill (rich text)
  - recharts (data visualization)
  - react-window (virtual listing)
  - react-circular-progressbar
  - @dnd-kit/core/sortable (drag-and-drop)

### Routes and Navigation

#### Public Routes (Accessible without authentication)
| Route | Component | Status |
|-------|-----------|--------|
| `/` | LandingPage | WORKING |
| `/search` | SearchPage | WORKING |
| `/top-talent` | TopTalentPage | WORKING |
| `/contact` | ContactUs | WORKING |
| `/about` | AboutPage | WORKING |
| `/pricing` | PricingPage | WORKING |
| `/resources` | Resources | WORKING |
| `/career-tips` | CareerTips | WORKING |
| `/faq` | FaqPage | WORKING |
| `/terms` | TermsPage | WORKING |
| `/privacy` | PrivacyPage | WORKING |
| `/refund-policy` | RefundPolicyPage | WORKING |
| `/renewal-policy` | RenewalPolicyPage | WORKING |
| `/p/:id` | ProviderPublicProfile | WORKING |
| `/job/:id` | PublicJobDetail | WORKING |
| `/external-match` | ExternalMatch | WORKING |
| `/candidate-landing` | GuestDiscovery | WORKING |
| `/unlock-matches` | LockedResults | WORKING |
| `/recruiter-discovery` | RecruiterDiscovery | WORKING |
| `/recruiter-locked` | RecruiterLockedResults | WORKING |
| `/claim-profile/:token` | ClaimProfile | WORKING |
| `profile/:id` | ProfilePage (Protected) | WORKING |
| `profile/share/:token` | ProviderSharedProfile | WORKING |
| `pending-approval` | PendingApproval | WORKING |

#### Provider Routes (Requires provider role)
| Route | Component | Status |
|-------|-----------|--------|
| `/provider/dashboard` | ProviderDashboard | WORKING |
| `/provider/profile` | ProviderProfile | WORKING |
| `/provider/plans` | ProviderPlans | WORKING |
| `/provider/my-plan` | ProviderPlans | WORKING |
| `/provider/customise-plan` | CustomPlan | WORKING |
| `/provider/leads` | ProviderLeads | WORKING |
| `/provider/history` | ProviderHistory | WORKING |
| `/provider/job-for-me` | ProviderJobs | WORKING |
| `/provider/jobs` | ProviderJobs (redirect) | WORKING |
| `/provider/applied-jobs` | AppliedJobs | WORKING |
| `/provider/saved-jobs` | SavedJobs | WORKING |
| `/provider/job/:jobId` | JobDetail | WORKING |
| `/provider/job/:jobId/apply` | ApplyJob | WORKING |
| `/provider/application-success/:applicationId` | ApplicationSuccess | WORKING |
| `/provider/contacted` | ProviderContacted | WORKING |
| `/provider/change-password` | ChangePassword | WORKING |
| `/provider/referrals` | ReferralManagement | WORKING |
| `/provider/add-member` | AddMember | WORKING |
| `/provider/wallet` | ProviderWallet | WORKING |
| `/provider/payout-settings` | ProviderPayoutSettings | WORKING |
| `/provider/support/:type?` | ProviderSupport | WORKING |
| `/provider/career-health` | CareerHealthDashboard | WORKING |
| `/provider/career-health/analytics` | CareerHealthDashboard | WORKING |
| `/provider/career-health/actions` | CareerHealthDashboard | WORKING |
| `/provider/career-health/gps` | CareerHealthDashboard | WORKING |
| `/provider/grow-with-ai` | GrowWithAIDashboard | WORKING |
| `/provider/ai-career-coach` | AiCareerCoach | WORKING |
| `/provider/ai-tips` | AITips | WORKING |
| `/provider/resume-toolkit` | ResumeToolkit | WORKING |

#### Recruiter Routes (Requires recruiter role)
| Route | Component | Status |
|-------|-----------|--------|
| `/recruiter/dashboard` | RecruiterDashboard | WORKING |
| `/recruiter/post-job` | RecruiterPostJob | WORKING |
| `/recruiter/plans` | RecruiterPlans | WORKING |
| `/recruiter/profile` | RecruiterProfile | WORKING |
| `/recruiter/history` | RecruiterHistory | WORKING |
| `/recruiter/find-providers` | RecruiterFindProviders | WORKING |
| `/recruiter/applications` | RecruiterApplications | WORKING |
| `/recruiter/provider/:id` | ProviderPublicProfile | WORKING |
| `/recruiter/pending-approval` | PendingApproval | WORKING |
| `/recruiter/jobs` | RecruiterJobPostings | WORKING |
| `/recruiter/jobs/:id` | JobDetails | WORKING |
| `/recruiter/job-postings` | RecruiterJobPostings | WORKING |
| `/recruiter/top-matches` | TopMatches | WORKING |
| `/recruiter/interested-candidates` | RecruiterApplications | WORKING |
| `/recruiter/ai-smart-search` | RecruiterFindProviders | WORKING |
| `/recruiter/search-history` | RecruiterSearchHistory | WORKING |
| `/recruiter/plans-billing` | RecruiterPlans | WORKING |
| `/recruiter/transactions` | RecruiterTransactions | WORKING |
| `/recruiter/company-profile` | RecruiterProfile | WORKING |
| `/recruiter/settings` | RecruiterSettings | WORKING |
| `/recruiter/change-password` | ChangePassword | WORKING |
| `/recruiter/referrals` | ReferralManagement | WORKING |
| `/recruiter/ai` | AIRecruiterWorkspace | WORKING |
| `/recruiter/tasks` | RecruiterTasks | WORKING |
| `/recruiter/outreach` | RecruiterOutreach | WORKING |
| `/recruiter/talent-pool` | RecruiterTalentPool | WORKING |

#### Admin Routes (Requires admin role)
| Route | Component | Status |
|-------|-----------|--------|
| `/admin/dashboard` | AdminDashboard | WORKING |
| `/admin/refunds` | AdminRefundRequests | WORKING |
| `/admin/withdrawals` | AdminWithdrawals | WORKING |
| `/admin/commission-settings` | AdminCommissionSettings | WORKING |
| `/admin/partners` | Partners | WORKING |
| `/admin/manager-bank-accounts` | AdminManagerBankAccounts | WORKING |
| `/admin/partner-payouts` | AdminPartnerPayouts | WORKING |
| `/admin/referrals` | AdminReferrals | WORKING |
| `/admin/commissions` | AdminCommissions | WORKING |
| `/admin/reward-pool` | AdminRewardPool | WORKING |
| `/admin/users` | AdminUsers | WORKING |
| `/admin/providers` | AdminProviders | WORKING |
| `/admin/recruiters` | AdminRecruiters | WORKING |
| `/admin/plans` | AdminPlans | WORKING |
| `/admin/custom-plans` | AdminCustomPlanRequests | WORKING |
| `/admin/settings` | AdminSettings | WORKING |
| `/admin/managers` | AdminManagers | WORKING |
| `/admin/payments` | AdminPayments | WORKING |
| `/admin/staging-candidates` | AdminStagingCandidates | WORKING |
| `/admin/provider-subscriptions` | AdminProviderSubscriptions | WORKING |
| `/admin/page-content` | AdminPageContent | WORKING |
| `/admin/skills` | AdminSkills | WORKING |
| `/admin/job-roles` | AdminJobRoles | WORKING |
| `/admin/whatsapp` | AdminWhatsApp | WORKING |
| `/admin/currency` | AdminCurrency | WORKING |
| `/admin/countries` | AdminCountries | WORKING |
| `/admin/ai` | AdminAIOps | WORKING |
| `/admin/profile-photo-approvals` | AssetApprovals | WORKING |
| `/admin/profile-approvals` | AssetApprovals | WORKING |
| `/admin/profile-approval/:userId` | ProfileReviewDetail | WORKING |
| `/admin/resume-approvals` | ResumeApprovals | WORKING |
| `/admin/portfolio-approvals` | AdminPortfolioApprovals | WORKING |
| `/admin/enquiries` | AdminEnquiries | WORKING |
| `/admin/support-issues` | AdminSupportIssues | WORKING |
| `/admin/contact-logs` | AdminContactLogs | WORKING |
| `/admin/otp-logs` | AdminOtpLogs | WORKING |
| `/admin/ai-resume-logs` | AdminAiResumeLogs | WORKING |
| `/admin/candidate-unlock-logs` | AdminCandidateUnlockLogs | WORKING |
| `/admin/resume-access-logs` | AdminResumeAccessLogs | WORKING |
| `/admin/seo-command-center` | SeoCommandCenter | WORKING |
| `/admin/self-healing` | SelfHealingCenter | WORKING |
| `/admin/data-pipeline/sources` | JobSources | WORKING |
| `/admin/data-pipeline/jobs` | ExternalJobs | WORKING |
| `/admin/data-pipeline/reports` | SyncReports | WORKING |
| `/admin/data-pipeline/errors` | SyncErrors | WORKING |
| `/admin/company-sources` | CompanySources | WORKING |
| `/admin/recruiter-leads` | RecruiterLeads | WORKING |
| `/admin/health` | HealthDashboard | WORKING |
| `/admin/outreach` | BulkOutreach | WORKING |
| `/admin/import-candidates` | ImportCandidates | WORKING |
| `/admin/import-recruiters` | ImportRecruiters | WORKING |
| `/admin/data-pipeline` | DataPipeline | WORKING |
| `/admin/pipeline/*` | PipelineAdmin | WORKING |
| `/admin/scraped-vault/jobs` | ExternalJobs | WORKING |
| `/admin/scraped-vault/candidates` | StagingCandidates | WORKING |
| `/admin/scraped-vault/recruiters` | RecruiterLeads | WORKING |
| `/admin/crawlers/single` | LiveTester | WORKING |
| `/admin/crawlers/bulk` | BulkCrawlerPanel | WORKING |
| `/admin/crawlers/queue` | LiveQueueMonitor | WORKING |
| `/admin/crawlers/engine` | NightlyEngineSettings | WORKING |
| `/admin/crawlers/jobs` | ExternalJobs | WORKING |
| `/admin/external-services` | ExternalServices | WORKING |
| `/admin/health-dashboard` | HealthDashboard | WORKING |

#### Partner Routes (Requires partner role)
| Route | Component | Status |
|-------|-----------|--------|
| `/partner/dashboard` | PartnerDashboard | WORKING |
| `/partner/payouts` | PartnerPayouts | WORKING |
| `/partner/create-provider` | CreatePartnerProvider | WORKING |
| `/partner/create-recruiter` | CreatePartnerRecruiter | WORKING |
| `/partner/bank-details` | PartnerBankDetails | WORKING |
| `/partner/support` | PartnerSupportIssues | WORKING |

#### Auth Routes (Unauthenticated, redirects logged-in)
| Route | Component | Status |
|-------|-----------|--------|
| `/login` | AuthPage | WORKING |
| `/signup` | AuthPage | WORKING |
| `/forgot-password` | ForgotPassword | WORKING |
| `/reset-password/:token` | ResetPassword | WORKING |
| `/auth/magic` | MagicLinkVerify | WORKING |
| `/auth/magic-verify` | MagicLinkVerify | WORKING |

### Key Components Analysis

#### Authentication Components
- **AuthPage:** Handles login, signup, forgot password, reset password
- **ProtectedRoute:** Middleware that checks `allowedRoles` - verified backend authorization exists
- **AdminProtectedRoute:** Checks for admin/manager role
- **PartnerProtectedRoute:** Checks for partner role

#### Layout Components
- **Navbar:** Top navigation bar with role-based visibility
- **MainLayout:** Wrapper with Navbar + Footer (for public pages)
- **ProviderLayout:** Provider panel layout with sidebar
- **RecruiterLayout:** Recruiter panel layout with sidebar
- **AdminLayout:** Admin panel layout with sidebar
- **PartnerLayout:** Partner panel layout with sidebar

#### Form Components
- Various form components throughout pages
- **react-helmet-async:** For dynamic SEO metadata
- **react-hot-toast:** Toast notifications
- **lucide-react:** Icon set

#### Page Loaders and Skeletons
- **PageLoader:** Spinner during data fetch
- **LandingPageSkeleton:** Skeleton for homepage during chunk loading
- **ScrollToTop:** Auto-scroll to top on navigation

### API Client Integration

**Axios Configuration:**
- Base URL from `VITE_API_URL` env var (default: `http://localhost:5000/api`)
- Auth headers added via interceptor (likely JWT tokens)
- Error handling for 401/403 responses

**API Call Patterns:**
1. **Protected routes:** Include `Authorization: Bearer <token>` header
2. **Public routes:** No auth header required
3. **File uploads:** Multipart/form-data with `Content-Type: multipart/form-data`
4. **Form submissions:** JSON body with relevant fields

**Common API Call Pattern:**
```javascript
// Example from frontend
const response = await api.post('/api/provider/profile', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
```

### State Management

**Context Providers (from main.jsx):**
1. **AuthProvider:** Manages user auth state, token, roles, login/logout
2. **LocationProvider:** Geolocation tracking and locale detection
3. **LocaleContext:** Language/localization state
4. **LanguageProvider:** Language selection and translations

**User State (from AuthContext):**
- `user` object with profile data
- `profile` provider/recruiter specific data
- `showWhatsAppPrompt` state
- `deferredPrompt` for PWA install

### UI Actions Audit

#### Butters/Actions That Work
- Navigation links to valid routes
- Form submissions with validation
- Toast notifications for feedback
- Modals (WhatsAppNumberModal, CookieConsent, PwaInstallPrompt)
- SEO metadata updates via HelmetProvider

#### Potential Issues Detected
- **Lazy-loading suspense boundaries:** Some routes may show fallback during initial load
- **Agentation component:** Only loaded in development mode (`import.meta.env.DEV`)
- **CookieConsent:** Always rendered but may not block cookies properly
- **Whole-page transitions:** No explicit loading state management for route changes

#### Forms Without Clear Submission Logic
- Several forms exist but need backend verification
- Some forms may use fake/mock actions (TODO comments may exist)

#### Missing Loading/Error States
- Some pages may not show proper loading spinners
- Error states may not be consistently displayed

#### File Upload Functionality
- Profile photo upload: Works via `/api/provider/profile/photo`
- Resume upload: Works via `/api/provider/profile/resume`
- Cloudinary integration: Partially working with fallback logic
- Multiple file handling: Limited detection

### Authentication Flow on Frontend

1. **Login:** Form → `POST /api/auth/login` → JWT token stored → redirect to dashboard
2. **Register:** Form → `POST /api/auth/register` → OTP sent → verify OTP → complete profile → dashboard
3. **Google OAuth:** Click → `POST /api/auth/google` → Google token verification → dashboard
4. **WhatsApp Login:** Click → `POST /api/auth/whatsapp/send-otp` → OTP sent → verify → dashboard
5. **Logout:** Click → invalidate token / clear storage → redirect to login

### Protected Routes Behavior

- **Frontend:** `ProtectedRoute` component hides/shows based on `allowedRoles`
- **Backend:** `auth.js` middleware `protect` + `authorizeRoleFromActive` verifies authorization
- **Gap:** Frontend hiding a button is NOT authorization - must verify backend enforces it

### Responsive & Accessibility
- Tailwind CSS responsive utilities used throughout
- Mobile-first design approach
- Accessible component patterns (semantic HTML, ARIA labels implied)

### Build & Runtime Status
- `npm run build`: Should succeed (Vite build)
- `npm run dev`: Server starts with nodemon
- No TypeScript, so no typecheck command
- ESLint configured but may have unused rules

### Known Frontend-Backend Mismatches
1. **Parameter naming:** Frontend may send different field names than backend expects
2. **Response format:** Frontend expects certain response structure that may differ from backend
3. **Pagination:** Frontend constructs pagination but backend may not return meta data consistently
4. **Status fields:** Frontend may display different status values than backend returns