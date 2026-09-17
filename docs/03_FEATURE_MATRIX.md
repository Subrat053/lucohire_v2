# 03_FEATURE_MATRIX.md

## Master Functionality Matrix

| ID | Feature | User Role | Frontend | API Backend | Database | External Service | Status | Confidence | Problems |
|----|---------|-----------|----------|-------------|----------|------------------|--------|------------|----------|
| F1 | User Registration (Email) | All | /signup, /login pages | POST /api/auth/register | users, provider_profiles/recruiter_profiles | Email OTP service | PARTIALLY_WORKING | MEDIUM | OTP verification flow has edge cases; role-specific validation varies |
| F2 | User Registration (Google OAuth) | All | AuthPage | POST /api/auth/google | users, provider_profiles/recruiter_profiles | Google OAuth 2.0 | WORKING | HIGH | - |
| F3 | User Registration (WhatsApp OTP) | All | AuthPage | POST /api/auth/whatsapp/send-otp, /verify-otp | users | Meta WhatsApp Business API | NOT_IMPLEMENTED | LOW | Endpoint exists but WhatsApp API credentials may not be configured |
| F4 | Email Verification | All | Forgot/Reset flows | POST /api/auth/verify-email/send, /confirm | users, Otp collection | Email (SMTP/Resend) | PARTIALLY_WORKING | MEDIUM | SendEmailOTP utility exists but SMTP config needs verification |
| F5 | Password Reset | All | AuthPage → ForgotPassword | POST /api/auth/forgot-password, /reset-password/:token | users | SMTP email service | WORKING | HIGH | - |
| F6 | Login (Email/Password) | All | AuthPage | POST /api/auth/login | users | JWT | WORKING | HIGH | - |
| F7 | Login (Google) | All | AuthPage | POST /api/auth/google | users | Google OAuth | WORKING | HIGH | - |
| F8 | Login (WhatsApp) | All | AuthPage | POST /api/auth/whatsapp/verify-otp | users | Meta WhatsApp Business API | NOT_IMPLEMENTED | LOW | Code exists but integration may not be complete |
| F9 | Role/Panel Switching | Provider/Recruiter | Dashboard redirects | POST /api/auth/switch-role, /switch-panel | users, roles enum | - | WORKING | HIGH | - |
| F10 | Profile Management (Provider) | Provider | /provider/profile, /provider/dashboard | GET/PUT /api/provider/profile | users, provider_profiles | Cloudinary (uploads) | WORKING | HIGH | - |
| F11 | Profile Management (Recruiter) | Recruiter | /recruiter/profile, /recruiter/dashboard | GET/PUT /api/recruiter/profile | users, recruiter_profiles | Cloudinary (uploads) | WORKING | HIGH | - |
| F12 | Skill Management | Provider | Provider profile page | GET /api/skills | SkillCategory model | - | WORKING | HIGH | - |
| F13 | Plan Selection & Purchase | Provider/Recruiter | /plans pages | GET /api/plans, POST /api/subscriptions/select | plans, user_subscriptions | Payment gateway (Stripe/Razorpay) | PARTIALLY_WORKING | MEDIUM | Payment verification flow has edge cases |
| F14 | Subscription Management | Provider/Recruiter | /subscriptions/me page | GET /api/subscriptions/me, /api/subscriptions/activate | user_subscriptions, plans | - | WORKING | HIGH | - |
| F15 | Job Posting (Recruiter) | Recruiter | /recruiter/post-job | POST /api/jobs (module) | jobs, recruiter_profiles | - | WORKING | HIGH | - |
| F16 | Job Applications | Provider/Recruiter | Various pages | GET/POST /api/jobs/:id/applications | applications, user_subscriptions | - | WORKING | HIGH | - |
| F17 | Job Search & Filtering | All | /search page | GET /api/search/providers | provider_profiles, plans | Typesense, Geoapify | PARTIALLY_WORKING | MEDIUM | Some query parameters may not be fully processed |
| F18 | AI Resume Parsing | Provider | Resume upload/parse | POST /api/provider/resume/parse | provider_profiles, embedded fields | OpenAI Gemini, Anthropic | PARTIALLY_WORKING | MEDIUM | AI model keys configured but runtime verification needed |
| F19 | AI Career Coaching | Provider | Grow With AI dashboard | GET/POST /api/provider/ai/* | provider_profiles | OpenAI, Anthropic | UNVERIFIED | MEDIUM | Frontend exists but backend API usage unclear |
| F20 | Matching & Recommendations | Recruiter | /recruiter/top-matches, talent-pool | GET /api/jobs/:jobId/matches, /api/interpret | provider_profiles, jobs | Typesense | UNVERIFIED | MEDIUM | Static inspection shows flow but runtime behavior unknown |
| F21 | Notification System | All | Dashboard notifications | GET /api/notifications | notifications, user_subscriptions | Socket.io, SMTP | PARTIALLY_WORKING | MEDIUM | Socket.io integration exists but delivery reliability unknown |
| F22 | WhatsApp Integration | All | Various (contact, outreach) | POST /api/auth/whatsapp/*, /api/enquiry | users, outreach_campaigns | Meta WhatsApp Business API | CONFIGURED | MEDIUM | Code references exist but API credentials in .env are placeholder-like |
| F23 | Referral System | All | Profile/Referral page | GET/POST /api/referrals | referrals, users, partner_profiles | - | WORKING | HIGH | - |
| F24 | Commission Tracking | Partner | Admin panel | GET /api/subscriptions/revenue | commission_transactions, payments | - | WORKING | HIGH | - |
| F25 | File Upload (Avatar/Resume) | Provider/Recruiter | Profile pages | POST /api/provider/profile/photo, /resume | provider_profiles/recruiter_profiles, uploads dir | Cloudinary, local disk | PARTIALLY_WORKING | MEDIUM | Resume preview has complex Cloudinary fallback logic |
| F26 | Admin Dashboard | Admin | /admin/dashboard | GET /api/admin/* routes | all collections | - | WORKING | HIGH | - |
| F27 | User Management (Admin) | Admin | /admin/users page | GET /api/admin/users | users | - | WORKING | HIGH | - |
| F28 | Plan Management (Admin) | Admin | /admin/plans page | GET/POST /api/plans | plans | - | WORKING | HIGH | - |
| F29 | Payment History | All | /api/payments/my-payments | GET /api/payments/my-payments | payments, user_subscriptions | - | WORKING | HIGH | - |
| F30 | SEO & Sitemap | All | Auto-generated | GET /sitemap.xml, /api/sitemap.xml | - | - | WORKING | HIGH | - |
| F31 | External Job Search | Recruiter | /api/v1/external-jobs | GET /api/v1/external-jobs | - | Apify, RapidAPI, Indeed, Jooble | PARTIALLY_WORKING | MEDIUM | Multiple external APIs configured but success varies |
| F32 | Crawler & Scraping | Admin | Crawler panel | POST /api/v1/admin/sync* | various collections | Apify, JSearch | UNVERIFIED | LOW | Cron jobs registered but execution not verified |
| F33 | Bulk Outreach | Admin/Recruiter | Bulk outreach panel | POST /api/v1/admin/outreach* | users, outreach_campaigns | SMTP, Meta WhatsApp | CONFIGURED | MEDIUM | Code exists but email/Whastap delivery not tested |
| F34 | Provider Rotation Pool | Provider | Search results affect ranking | Internal utils (rotation.js) | rotation_pool collection | - | WORKING | HIGH | - |
| F35 | Currency & Exchange Rates | All | /api/locale/currencies | GET /api/locale/currencies | admin_settings, exchange rates | exchangerate-api | WORKING | HIGH | - |
| F36 | Geo-Location Detection | All | Auto on API calls | GET /api/locale/detect, /api/locale/reverse-geocode | users, provider_profiles | Geoapify, IP detection | WORKING | HIGH | - |
| F37 | AI Feature Flags | All | Feature-gated UI | Internal feature flag system | admin_settings | - | WORKING | HIGH | - |
| F38 | Portfolio Approvals | Provider | Profile management | POST /api/v1/admin/profile-approvals | provider_profiles, admin logs | - | WORKING | HIGH | - |
| F39 | Resume Approvals | Admin | Admin panel | POST /api/admin/resume-approvals | provider_profiles | - | WORKING | HIGH | - |
| F40 | Partner Commission | Partner | Referral earnings | Internal service logic | commission_transactions, partner_profiles | - | WORKING | HIGH | - |
| F41 | WhatsAlert Management | Provider | Provider settings | GET/PUT /api/provider/wallet, /whatsapp-alerts | provider_profiles, user model | - | WORKING | HIGH | - |
| F42 | Wallet & Payouts | Provider | Wallet page | GET /api/provider/wallet | provider_wallet, wallet_transactions | - | WORKING | HIGH | - |
| F43 | Custom Plan Requests | Provider/Recruiter | Custom plan forms | POST /api/subscriptions/custom-request | plans, custom_plan_requests | - | NOT_IMPLEMENTED | LOW | Endpoint exists but custom plan workflow incomplete |
| F44 | Partner Program | Partner | Partner dashboard | /partner/dashboard page | partner_profiles, referrals | - | WORKING | HIGH | - |
| F45 | Manager Role | Manager | Admin functions | /api/v1/manager/* routes | users, recruiter_profiles | - | WORKING | HIGH | - |
| F46 | Bank Details & Encryption | Provider/Recruiter | Payout settings | POST /api/provider/bank-details (implied) | users (encrypted fields) | MongoDB field-encryption | CONFIGURED | MEDIUM | Field encryption plugin configured but key management needs review |
| F47 | Language & Localization | All | Auto-detection | GET /api/locale/detect | users (country, currency, locale) | IP geolocation, COUNTRY_CURRENCY_FALLBACK | WORKING | HIGH | - |
| F48 | Terms & Conditions Acceptance | All | Registration flow | Boolean field on user model | users | - | WORKING | HIGH | - |
| F49 | Public Profile Viewing | All | /p/:id, profile share links | GET /api/provider/public/:id | provider_profiles | - | WORKING | HIGH | - |
| F50 | Magic Link Authentication | All | Auth flows | POST /api/auth/magic-link/request, /verify | users, magicLinkToken | - | PARTIALLY_WORKING | MEDIUM | Code exists but frontend integration may be incomplete |