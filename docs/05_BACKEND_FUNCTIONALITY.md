# 05_BACKEND_FUNCTIONALITY.md

## Backend Functionality Audit

### Technology Stack
- **Framework:** Node.js with Express 4.21.0
- **Language:** JavaScript (ES modules via `"type": "module"` in package.json)
- **ORM/ODM:** Mongoose 8.7.0 for MongoDB
- **Authentication:** JWT (jsonwebtoken 9.0.2), bcryptjs 2.4.3
- **Server:** HTTP with Socket.io 4.8.3 for realtime
- **Validation:** express-validator 7.2.0, custom validators
- **Rate Limiting:** express-rate-limit 7.4.0
- **Security:** Helmet 7.1.0, CORS configuration
- **File Upload:** Multer 1.4.5-lts.1, Cloudinary SDK
- **Email:** Nodemailer 8.0.2, Resend 6.17.2
- **Queue/BullMQ:** BullMQ 5.80.0, ioredis 5.11.1
- **Scheduling:** node-cron 3.0.3
- **Payment:** Stripe 20.4.0, Razorpay 2.9.8
- **AI:** OpenAI 6.39.1, Anthropic 6.39.1, Google Generative AI
- **Search:** Typesense 3.0.6
- **Geo:** Google Maps, Geoapify
- **Database Encryption:** mongoose-field-encryption 7.0.1

### Routes and Endpoints

#### Authentication Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| POST | `/api/auth/register` | None | All | authController.registerEmail | express-validator |
| POST | `/api/auth/register/send-otp` | None | All | authController.sendRegistrationEmailOtp | express-validator |
| POST | `/api/auth/register/verify-otp` | None | All | authController.confirmRegistrationEmailOtp | express-validator |
| POST | `/api/auth/login` | None | All | authController.loginUser | express-validator |
| POST | `/api/auth/google` | None | All | authController.googleAuth | - |
| POST | `/api/auth/whatsapp/send-otp` | None | All | authController.whatsappSendOtp | - |
| POST | `/api/auth/whatsapp/verify-otp` | None | All | authController.whatsappVerifyOtp | - |
| PUT | `/api/auth/update-email` | protect | All | authController.updateEmail | protect |
| GET | `/api/auth/me` | protect | All | authController.getMe | protect |
| POST | `/api/auth/change-password` | protect | All | authController.changePassword | - |
| POST | `/api/auth/forgot-password` | None | All (email) | authController.forgotPassword | - |
| POST | `/api/auth/reset-password/:token` | None | All | authController.resetPassword | - |
| POST | `/api/auth/magic-link/request` | None | All | authController.requestMagicLink | - |
| POST | `/api/auth/magic-link/verify` | None | All | authController.verifyMagicLink | - |
| POST | `/api/auth/switch-role` | protect | Provider/Recruiter | authController.switchRole | protect |
| PATCH | `/api/auth/switch-panel` | protect | Provider/Recruiter | authController.switchPanel | protect |

#### Provider Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| GET | `/api/provider/profile` | protect | provider | providerController.getMyProfile | protect, authorizeRoleFromActive, ensureProviderApproved |
| PUT | `/api/provider/profile` | protect | provider | providerController.updateProfile | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/profile/send-phone-change-otp` | protect | provider | providerController.sendPhoneChangeOtp | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/profile/follow-back/respond` | protect | provider | profileReviewController.respondToFollowBack | - |
| POST | `/api/provider/profile/resubmit` | protect | provider | profileReviewController.resubmitProfileForReview | - |
| GET | `/api/provider/matches` | protect | provider | matchmakingController.getProviderMatches | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/scrape-matches` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/profile/ai-suggest` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved, requireFeatureFlag, aiRateLimiter, providerProfileAISuggestValidation |
| POST | `/api/provider/ai/build-profile` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved, requireFeatureFlag, aiRateLimiter |
| POST | `/api/provider/ai/provider-builder-suggestion` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved, requireFeatureFlag, aiRateLimiter |
| POST | `/api/provider/ai/extract-profile` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved, aiRateLimiter |
| GET | `/api/provider/ai/pricing-suggestion` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved, requireFeatureFlag, aiRateLimiter |
| GET | `/api/provider/dashboard` | protect | provider | providerController.getDashboard | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/plans` | protect | provider | providerController.getPlans | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/plans/purchase` | protect | provider | providerPlanController.purchasePlan | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/my-plan` | protect | provider | providerPlanController.getMyPlan | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/subscription/current` | protect | provider | providerPlanController.getCurrentSubscription | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/plan/list` | protect | provider | providerPlanController.getProviderPlans | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/plan/preview` | protect | provider | providerPlanController.previewPlan | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/plan/checkout` | protect | provider | providerPlanController.checkoutPlan | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/plan/payment-success` | protect | provider | paymentController.paymentSuccess | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/subscription/active` | protect | provider | providerPlanController.getActiveSubscriptionDetail | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/subscription/usage` | protect | provider | providerPlanController.getProviderUsageMetrics | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/subscription/calculate-custom-price` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/subscription/purchase-fixed` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/subscription/purchase-custom` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/subscription/auto-renew` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/leads` | protect | provider | providerController.getMyLeads | protect, authorizeRoleFromActive, ensureProviderApproved |
| PUT | `/api/provider/leads/:id` | protect | provider | providerController.updateLeadStatus | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/history` | protect | provider | providerController.getMyHistory | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/public/:id` | optionalAuth | All | providerController.getPublicProfile | - |
| GET | `/api/provider/public/:id/whatsapp-redirect` | None | All | - | - |
| POST | `/api/provider/public/:id/contact-click` | protect | provider | - | protect, logContactClick |
| POST | `/api/provider/profile/photo` | protect | provider | - | protect, upload.single, uploadProfilePhoto |
| DELETE | `/api/provider/profile/photo` | protect | provider | - | protect, upload.single, deleteProfilePhoto |
| POST | `/api/provider/profile/resume` | protect | provider | - | protect, upload.single, uploadResume |
| DELETE | `/api/provider/profile/resume` | protect | provider | - | protect, upload.single, deleteResume |
| GET | `/api/profile/resume/preview` | protect | provider | jobRoutes (inline) | - |
| POST | `/api/provider/profile/document` | protect | provider | - | protect, upload.single, uploadDocument |
| GET | `/api/provider/jobs` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/saved-jobs` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| GET | `/api/provider/jobs/:jobId` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/jobs/:jobId/save` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved, toggleSavedJob |
| POST | `/api/provider/jobs/:jobId/apply` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved, checkApplyLimit, applyToJobFromProvider |
| DELETE | `/api/provider/jobs/:jobId/apply` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved, withdrawApplication |
| GET | `/api/provider/applications` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved, getProviderApplications |
| POST | `/api/provider/jobs/ai-insights` | protect | provider | - | protect, aiRateLimiter, getJobAiInsights |
| POST | `/api/provider/resume/parse` | protect | provider | resumeParserController.triggerResumeParse | protect, upload.single, checkAiLimit |
| GET | `/api/provider/resume/parse-status` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/resume/apply-parsed` | protect | provider | - | protect, authorizeRoleFromActive, ensureProviderApproved |
| POST | `/api/provider/resume/retry-parse` | protect | provider | - | protect, checkAiLimit, retryParse |
| GET | `/api/provider/matches` | protect | provider | matchmakingController.getProviderMatches | - |

#### Recruiter Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| GET | `/api/recruiter/dashboard` | protect | recruiter | recruiterRoutes (implicit) | - |
| POST | `/api/recruiter/post-job` | protect | recruiter | - | - |
| GET | `/api/recruiter/plans` | protect | recruiter | - | - |
| GET | `/api/recruiter/profile` | protect | recruiter | - | - |
| GET | `/api/recruiter/history` | protect | recruiter | - | - |
| GET | `/api/recruiter/find-providers` | protect | recruiter | - | - |
| GET | `/api/recruiter/applications` | protect | recruiter | - | - |
| GET | `/api/recruiter/provider/:id` | protect | recruiter | providerPublicProfile controller | - |
| POST | `/api/recruiter/discovery/verify-dual` | protect | recruiter | - | verifyDualRecruiter |
| GET | `/api/recruiter/jobs` | protect | recruiter | jobRoutes | - |
| GET | `/api/recruiter/jobs/:id` | protect | recruiter | - | - |
| POST | `/api/recruiter/:jobId/boost` | protect | recruiter | - | boostJob middleware |
| GET | `/api/recruiter/matches` | protect | recruiter | - | - |
| GET | `/api/recruiter/top-matches` | protect | recruiter | - | - |
| GET | `/api/recruiter/interested-candidates` | protect | recruiter | - | - |
| GET | `/api/recruiter/ai-smart-search` | protect | recruiter | - | - |
| GET | `/api/recruiter/search-history` | protect | recruiter | - | - |
| GET | `/api/recruiter/plans-billing` | protect | recruiter | - | - |
| GET | `/api/recruiter/transactions` | protect | recruiter | - | - |
| GET | `/api/recruiter/company-profile` | protect | recruiter | - | - |
| GET | `/api/recruiter/settings` | protect | recruiter | - | - |
| POST | `/api/recruiter/change-password` | protect | recruiter | - | - |
| POST | `/api/recruiter/referrals` | protect | recruiter | - | - |
| GET | `/api/recruiter/ai` | protect | recruiter | - | - |
| GET | `/api/recruiter/tasks` | protect | recruiter | - | - |
| GET | `/api/recruiter/outreach` | protect | recruiter | - | - |
| GET | `/api/recruiter/talent-pool` | protect | recruiter | - | - |

#### Admin Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| GET | `/api/admin/dashboard` | protect | admin | adminRoutes | protect, authorize('admin') |
| GET | `/api/admin/users` | protect | admin | adminUsers controller | protect, authorize('admin') |
| GET | `/admin/health` | None | All | adminHealthRoutes | - |
| POST | `/api/v1/admin/health` | protect | admin | - | - |
| GET | `/api/admin/providers` | protect | admin | adminProviders controller | protect, authorize('admin') |
| GET | `/admin/recruiters` | protect | admin | adminRecruiters controller | protect, authorize('admin') |
| GET | `/admin/recruiters` | protect | admin | - | (duplicate route) |
| GET | `/admin/plans` | protect | admin | adminPlans controller | protect, authorize('admin') |
| GET | `/admin/custom-plans` | protect | admin | adminCustomPlanRequests controller | protect, authorize('admin') |
| GET | `/admin/settings` | protect | admin | adminSettings controller | protect, authorize('admin') |
| GET | `/admin/managers` | protect | admin | adminManagers controller | protect, authorize('admin') |
| GET | `/admin/payments` | protect | admin | adminPayments controller | protect, authorize('admin') |
| GET | `/admin/staging-candidates` | protect | admin | adminStagingCandidates controller | protect, authorize('admin') |
| GET | `/admin/provider-subscriptions` | protect | admin | adminProviderSubscriptions controller | protect, authorize('admin') |
| GET | `/admin/page-content` | protect | admin | adminPageContent controller | protect, authorize('admin') |
| GET | `/admin/skills` | protect | admin | adminSkills controller | protect, authorize('admin') |
| GET | `/admin/job-roles` | protect | admin | adminJobRoles controller | protect, authorize('admin') |
| GET | `/admin/whatsapp` | protect | admin | adminWhatsApp controller | protect, authorize('admin') |
| GET | `/admin/currency` | protect | admin | adminCurrency controller | protect, authorize('admin') |
| GET | `/admin/countries` | protect | admin | adminCountries controller | protect, authorize('admin') |
| GET | `/admin/ai` | protect | admin | adminAIOps controller | protect, authorize('admin') |
| GET | `/admin/profile-photo-approvals` | protect | admin | assetApprovals controller | protect, authorize('admin') |
| GET | `/admin/profile-approvals` | protect | admin | - | - |
| GET | `/admin/profile-approval/:userId` | protect | admin | profileReviewDetail controller | protect, authorize('admin') |
| GET | `/admin/resume-approvals` | protect | admin | resumeApprovals controller | protect, authorize('admin') |
| GET | `/admin/portfolio-approvals` | protect | admin | adminPortfolioApprovals controller | protect, authorize('admin') |
| GET | `/admin/enquiries` | protect | admin | adminEnquiries controller | protect, authorize('admin') |
| GET | `/admin/support-issues` | protect | admin | adminSupportIssues controller | protect, authorize('admin') |
| GET | `/admin/contact-logs` | protect | admin | adminContactLogs controller | protect, authorize('admin') |
| GET | `/admin/otp-logs` | protect | admin | adminOtpLogs controller | protect, authorize('admin') |
| GET | `/admin/ai-resume-logs` | protect | admin | adminAiResumeLogs controller | protect, authorize('admin') |
| GET | `/admin/candidate-unlock-logs` | protect | admin | adminCandidateUnlockLogs controller | protect, authorize('admin') |
| GET | `/admin/resume-access-logs` | protect | admin | adminResumeAccessLogs controller | protect, authorize('admin') |
| GET | `/admin/seo-command-center` | protect | admin | - | - |
| GET | `/admin/self-healing` | protect | admin | - | - |
| GET | `/admin/data-pipeline/sources` | protect | admin | - | - |
| GET | `/admin/data-pipeline/jobs` | protect | admin | - | - |
| GET | `/admin/data-pipeline/reports` | protect | admin | syncReports controller | protect, authorize('admin') |
| GET | `/admin/data-pipeline/errors` | protect | admin | syncErrors controller | protect, authorize('admin') |
| GET | `/admin/company-sources` | protect | admin | companySource controller | protect, authorize('admin') |
| GET | `/admin/recruiter-leads` | protect | admin | recruiterLeads controller | protect, authorize('admin') |
| GET | `/admin/health-dashboard` | protect | admin | healthDashboard controller | - |
| GET | `/admin/outreach` | protect | admin | bulkOutreach controller | - |
| GET | `/admin/import-candidates` | protect | admin | importCandidates controller | - |
| GET | `/admin/import-recruiters` | protect | admin | importRecruiters controller | - |
| GET | `/admin/data-pipeline` | protect | admin | dataPipeline controller | - |
| GET | `/admin/pipeline/*` | protect | admin | pipelineAdmin controller | - |
| GET | `/admin/scraped-vault/jobs` | protect | admin | - | - |
| GET | `/admin/scraped-vault/candidates` | protect | admin | stagingCandidates controller | - |
| GET | `/admin/scraped-vault/recruiters` | protect | admin | recruiterLeads controller | - |
| GET | `/admin/crawlers/single` | None | All | liveTester controller | - |
| GET | `/admin/crawlers/bulk` | None | All | bulkCrawlerPanel controller | - |
| GET | `/admin/crawlers/queue` | None | All | liveQueueMonitor controller | - |
| GET | `/admin/crawlers/engine` | None | All | nightlyEngineSettings controller | - |
| GET | `/admin/crawlers/jobs` | protect | admin | - | - |
| GET | `/admin/external-services` | protect | admin | externalServices controller | - |

#### Payment Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| GET | `/api/payments/config` | protect | All | paymentController.getPaymentPublicConfig | - |
| POST | `/api/payments/create-order` | protect | provider/recruiter | paymentController.createOrder | - |
| POST | `/api/payments/create-subscription` | protect | provider/recruiter | paymentController.createSubscription | - |
| POST | `/api/payments/verify` | protect | All | paymentController.verifyPayment | - |
| POST | `/api/payments/verify-subscription` | protect | All | paymentController.verifySubscription | - |
| POST | `/api/payments/failed` | protect | All | paymentController.paymentFailed | - |
| GET | `/api/payments/my-payments` | protect | All | paymentController.getMyPayments | - |
| GET | `/api/payments/:id` | protect | All | paymentController.getPaymentById | - |

#### Webhook Routes (Raw body, before express.json())
| Method | Endpoint | Auth | Role | Controller |
|--------|----------|------|------|------------|
| POST | `/api/payments/webhook` | None | None | paymentController.stripeWebhook |
| POST | `/api/payments/razorpay-webhook` | None | None | paymentController.razorpayWebhook |

#### Search Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| POST | `/api/search/interpret` | protect | recruiter/provider | searchController.interpretSearch | protect, authorizeRoleFromActive, validateRequest |
| GET | `/api/search/providers` | None | All | searchController.searchProviders | cleanEmptyQueries, searchProvidersValidation, validateRequest |
| POST | `/api/search/auto-match` | protect | recruiter/provider | searchController.autoMatch | protect, authorizeRoleFromActive, autoMatchValidation, validateRequest |
| POST | `/api/search/ai/parse-intent` | aiRateLimiter | All | searchController.parseSearchIntentAI | - |
| POST | `/api/search/auto-match/preview` | protect | recruiter/provider | searchController.autoMatchPreview | - |
| GET | `/api/search/repeat-recommendations` | protect | recruiter/provider | searchController.getRepeatRecommendations | - |
| GET | `/api/search/trust-score/:providerId` | None | All | searchController.getProviderTrustScore | - |

#### Job Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| GET | `/api/jobs/` | optionalAuth | All | jobController.getAvailableJobs | optionalAuth, attachSubscription |
| POST | `/api/jobs/guest-recommended` | None | All | - | getGuestRecommendedJobs |
| POST | `/api/jobs/guest-otp/send` | None | All | guestOtpController.sendGuestOtp | - |
| POST | `/api/jobs/guest-otp/verify` | None | All | guestOtpController.verifyGuestOtp | - |
| POST | `/api/jobs/guest-firebase/verify` | None | All | - | verifyGuestFirebase |
| POST | `/api/jobs/guest-resume/parse` | upload.single | All | resumeParserController.parseGuestResume | - |
| POST | `/api/jobs/recruiter-discovery/send-email-otp` | None | All | - | sendEmailOtp |
| POST | `/api/jobs/recruiter-discovery/verify-dual` | None | All | - | verifyDualRecruiter |
| GET | `/api/jobs/:jobId/applications` | protect | recruiter | - | authorizeRoleFromActive |
| PUT | `/api/jobs/applications/:applicationId` | protect | recruiter | - | updateApplicationStatus |
| POST | `/api/jobs/:jobId/boost` | protect | recruiter | - | boostJob |
| POST | `/api/jobs/:jobId/apply` | protect | provider | - | checkApplyLimit, applyToJob |
| GET | `/api/jobs/:id/expiry-prediction` | optionalAuth | All | - | getJobExpiryPrediction |
| GET | `/api/jobs/public/:jobId` | None | All | - | getPublicJobById |

#### OTP Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| POST | `/api/otp` | None | All | otpRoutes | - |

#### External Jobs Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| GET | `/api/v1/external-jobs` | - | - | externalJob routes | - |
| GET | `/api/v1/admin/job-sources` | protect | admin | jobSource routes | - |
| GET | `/api/v1/admin/company-sources` | protect | admin | companySource routes | - |
| GET | `/api/v1/admin/sync` | protect | admin | syncLogs routes | - |
| GET | `/api/v1/admin/recruiter-leads` | protect | admin | recruiterLeads routes | - |

#### Additional Routes
| Method | Endpoint | Auth | Role | Controller | Middleware |
|--------|----------|------|------|------------|------------|
| GET | `/api/skills` | None | All | - | Skills from model |
| GET | `/api/public/company-details` | None | All | - | AdminSetting.findOne |
| POST | `/api/public/newsletter/subscribe` | None | All | - | NewsletterSubscriber.create |
| GET | `/api/faq` | None | All | - | faqRoutes |
| GET | `/api/health` | None | All | - | status OK |
| GET | `/api/locale/detect` | None | All | - | detectLocaleFromRequest |
| GET | `/api/locale/reverse-geocode` | None | All | - | reverseGeocodeCoordinates |
| GET | `/api/locale/currencies` | None | All | - | getExchangeRates |
| GET | `/api/faq` | None | All | - | faqRoutes |
| GET | `/api/wage-estimator` | - | - | wageEstimatorRoutes | - |
| GET | `/api/ai` | - | - | aiRoutes | - |
| GET | `/api/chat` | - | - | chatRoutes | - |
| GET | `/api/vision` | - | - | googleVisionRoutes | - |
| GET | `/api/translate` | - | - | translateRoutes | - |
| GET | `/api/subscriptions` | protect | All | subscriptionRoutes | protect, authorize |
| GET | `/api/refunds` | protect | All | refundRoutes | - |
| GET | `/api/plans` | - | - | planRoutes | - |
| GET | `/api/notifications` | protect | All | notificationRoutes | - |
| GET | `/api/job-roles` | - | - | jobRoleRoutes | - |
| GET | `/api/profile` | - | - | profileRoutes | - |
| GET | `/api/v1/support` | - | - | supportRoutes | - |
| GET | `/api/v1/unlock-profile` | - | - | unlockProfileRoutes | - |
| GET | `/api/reviews` | - | - | reviewRoutes | - |
| GET | `/api/location` | - | - | locationRoutes | - |
| GET | `/api/location/autocomplete` | - | - | autocompleteRoutes | - |
| GET | `/api/candidate` | - | - | candidateReportRoutes | - |
| GET | `/api/candidate-matching` | - | - | matching routes | - |
| GET | `/api/recruiter/ai` | - | - | recruiterAiRoutes | - |
| GET | `/api/recruiter-copilot` | - | - | recruiterCopilot routes | - |
| GET | `/api/profile-share` | - | - | profileShareRoutes | - |
| GET | `/api/candidates` | - | - | resumeRoutes | - |
| GET | `/api` | None | All | homepageMetricsRoutes | - |
| GET | `/api/v1/partner` | - | - | partnerRoutes | - |
| GET | `/api/referrals` | - | - | referralRoutes | - |
| GET | `/api/enquiry` | - | - | enquiryRoutes | - |
| GET | `/api/v1/admin/health` | protect | admin | - | - |
| GET | `/api/v1/admin/data-pipeline` | protect | admin | - | - |
| GET | `/api/v1/admin/outreach` | protect | admin | - | - |
| GET | `/api/v1/pipeline` | - | - | - | - |

### Controllers Overview

Key controllers and their responsibilities:

1. **authController:** User registration, login, OAuth, OTP verification, password management, role switching
2. **providerController:** Provider profile management, job applications, AI features, dashboard data
3. **paymentController:** Stripe/Razorpay integration, webhook handling, payment verification, payment history
4. **subscriptionController:** Plan selection, subscription management, revenue tracking
5. **searchController:** Provider search, auto-matching, intent parsing
6. **jobController:** Job listing, applications, guest interactions
7. **resumeParserController:** AI resume parsing workflow
8. **notificationService:** Socket.io notifications, email notifications
9. **adminController:** Admin dashboard, user/plan management
10. **providerPlanController:** Plan purchase, subscription management for providers
11. **recruiterPlanController:** Plan management for recruiters (less documented)
12. **matchmakingController:** Provider matching and recommendations
13. **profileReviewController:** Profile approval workflow
14. **geoLocation utilities:** Country/currency/locale detection
15. **exchangeRates:** Currency conversion service

### Middleware Overview

**Authentication Middleware:**
- `protect`: Verifies JWT token, attaches `req.user`, checks blocked/suspended status
- `authorizeRoleFromActive`: Checks if `req.user.activeRole` is in allowed roles list
- `authorize`: Simple role check (admin bypass)
- `optionalAuth`: Attaches `req.user` if token present, doesn't block unauthenticated requests

**Authorization Middleware:**
- `ensureProviderApproved`: Ensures provider profile is approved (upserts with defaults)
- `authorizeRoleFromActive`: Recursive role checking with admin bypass

**Feature Flag Middleware:**
- `requireFeatureFlag`: Gates features behind config flags (e.g., `ai.feature.profile`)

**Rate Limiting:**
- Global rate limiter: 2000 requests per 15 minutes
- Stricter on `/api/` routes

**Upload Middleware:**
- `upload.single('field')`: Multer single file upload
- Custom upload handlers for profile photos and resumes

**Validation Middleware:**
- `express-validator` chains
- `validateRequest`: Consolidates validation errors
- Custom validators for search, AI, provider profiles

**Middleware Chain Issues Detected:**
1. **Order dependency:** Some routes depend on middleware execution order
2. **Multiple `protect` usage:** Some routes have `protect` multiple times
3. **Missing middleware:** Some routes may lack expected authorization checks
4. **Optional auth inconsistency:** `optionalAuth` attaches user but doesn't block - may cause `req.user` undefined errors

### Services Overview

Key services and their responsibilities:

1. **providerService:** Provider location calculations, rotation pool, featured provider selection
2. **notificationService:** Socket.io emission, email notifications, WhatsApp notifications
3. **mailService:** SMTP email sending via Nodemailer
4. **otpService:** OTP generation, verification, session management
5. **cashbackService:** Referral cashback tracking
6. **badgeService:** User badge updates based on activity
7. **providerPlanService:** Provider plan management, subscription operations
8. **recruiterPlanService:** Recruiter plan management
9. **pricingEngine:** Plan pricing calculations, GST, currency conversion
10. **billingRuleUtils:** Billing rule management, commission calculations
11. **searchIntentService:** Search query interpretation
12. **locationService:** Geo-location services, coordinate handling
13. **googlePlacesService:** Google Places API integration
14. **googleTranslateService:** Translation service
15. **googleVisionService:** OCR and document analysis
16. **fraudRulesService:** Fraud detection rules
17. **demandSpikeService:** Demand monitoring
18. **activeScoreService:** Provider activity scoring
19. **eventLogService:** Event logging system
20. **automationQueueService:** Queue automation tasks
21. **leadDistributionService:** Lead distribution logic
22. **trustScoreService:** Provider trust score calculations
23. **openaiSearchService:** OpenAI-powered search
24. **typesenseService:** Typesense search integration
25. **resumeExtractorService:** Resume data extraction
26. **resumeGeneratorService:** Resume generation
27. **providerIntelligenceService:** Provider skill canonicalization
28. **matchScoringService:** Match scoring algorithms
29. **matchWeightService:** Match weight calculations
30. **aiAssistService:** AI assistance features
31. **aiLocationResolver:** AI location resolution
32. **aiOrchestrationService:** AI feature orchestration
32. **queueHandlers:** BullMQ queue event handlers
33. **queueService:** Queue management
34. **r2Service:** AWS R2 storage (referenced but usage unclear)
35. **referralTrackingService:** Referral program tracking

### Jobs, Queues, and Cron Jobs

**Registered Queues (BullMQ):**
- Various job types processed by workers
- Queue handlers registered in `server.js` via `registerQueueHandlers()`

**Cron Jobs (from server.js):**
- `startCronJobs()`: Main cron initialization
- `startCandidateDigestCron()`: Candidate digest emails
- `startCandidateDigestWorker()`: Candidate digest worker process
- `startHomepageMetricsCron()`: Homepage metrics tracking
- `startHomepageMetricsWorker()`: Homepage metrics worker
- `startBatchScraperCron()`: Batch web scraping scheduler
- `startOutreachCron()`: Bulk outreach scheduler

**Registered Workers (automatically loaded):**
- `workers/candidateRescan.worker`
- `workers/outreach.worker`
- `require('./workers/nightlyScraper.worker')`

**Cron Job Services (from server.js):**
- `initPipelineCron()`: Pipeline cron initialization
- `initSubscriptionCron()`: Subscription expiry cron
- `initRecruiterUsageCron()`: Recruiter usage tracking cron

### Validation Overview

**express-validator Usage:**
- `interpretSearchValidation`: Search query min/max length
- `searchProvidersValidation`: Query params validation (skill, city, location, lat/lng, radius, availability, sortBy, page, limit, tier, rating, experience, verified)
- `autoMatchValidation`: Structured query validation (query OR structured filters)
- `providerProfileAISuggestValidation`: AI suggest freeText and existingSkills
- `recruiterAIJobDescriptionValidation`: AI job description prompt and parameters

**Custom Validation:**
- Phone number validation via `phoneValidation.parsePhoneString`
- GST number format validation
- Password strength validation (min 6 chars)
- Email format regex validation

**Validation Gaps Detected:**
1. **Frontend-backend mismatch:** Frontend may send fields not validated on backend
2. **Optional fields:** Some backend routes lack express-validator protection
3. **Custom validator reliance:** Some validation relies on custom JavaScript rather than server-side checks

### Error Handling Overview

**Global Error Handler (errorHandler middleware):**
- Catches async errors
- Formats error response
- Prevents crashing server

**Route-Level Error Handling:**
- Try/catch in most controllers
- Specific error codes: INVALID_PHONE, INVALID_EMAIL, ROLE_PROFILE_ALREADY_EXISTS, etc.
- 401 for auth failures, 403 for authorization failures, 404 for not found, 500 for server errors

**Error Response Format:**
```json
{ message: "Error description" }
// or
{ success: false, message: "Error description", code: "ERROR_CODE" }
```

**Logging:**
- Console warnings/errors for significant events
- Some errors logged with full stack (verify_error.log created on verify payment failure)
- Environment-based logging (dev vs production)

### Security Findings (Preliminary)

1. **Hardcoded secrets in .env:** Some API keys and secrets present in environment file
2. **JWT Configuration:** `JWT_EXPIRE=7d`, secret from env - needs strength verification
3. **CORS Configuration:** Multiple origins configured, patterns for private IPs
4. **File Upload Validation:** Multer uploads to local disk - path traversal risk if not sanitized
5. **Rate Limiting:** 2000 req/15min may be insufficient for production
6. **Sensitive Data in Errors:** Some error messages may expose internal details
7. **MongoDB Field Encryption:** Plugin configured but key management review needed

### Known Backend Issues

1. **Duplicate routes:** Some routes registered multiple times (e.g., `/admin/recruiters`)
2. **Optional auth side effects:** `optionalAuth` middleware modifies `req.user` globally
3. **Cron job registration:** Multiple cron services initialized, potential overlap
4. **Webhook raw body:** Must be registered before `express.json()` - verified in server.js
5. **Multiple `protect` middleware:** Some routes have protect called multiple times in chain
6. **Missing indexers:** Some search/filter queries may be slow without proper indexes
7. **Environment variable validation:** `validateEnv()` called but warnings may indicate misconfigurations