ServiceHub Flow and Structure Documentation

1. System Summary
ServiceHub is a multi-role service marketplace with three roles: admin, recruiter (job poster), and provider (service worker).

Architecture:
- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth, Socket.IO, cron jobs.
- Frontend: React + Vite with role-based routes and layouts.

Core domains:
- Authentication (email, Google, WhatsApp OTP).
- Profiles and role-based access.
- Jobs, applications, leads, and contact unlock.
- Reviews and ratings.
- Plans, subscriptions, and payments.
- Notifications (database + realtime).

2. Project Structure Overview
Backend:
- server.js bootstraps Express, routes, sockets, and cron jobs.
- config/db.js configures MongoDB.
- controllers/ contains role and domain logic.
- middleware/ enforces auth, role, profile access, and subscription limits.
- models/ define MongoDB schemas.
- routes/ define API groups.
- services/ contain domain helpers (notifications, reviews, provider logic).
- utils/ include integrations and migrations.

Frontend:
- src/App.jsx defines routes and role layouts.
- src/components/ contains role-specific layouts and shared UI.
- src/pages/ contains role dashboards and public pages.
- src/context/ stores auth, locale, and language state.
- src/services/api.js defines the API client.

3. High-Level Flow
3.1 Entry
1) User opens the app.
2) Public pages are available (landing, FAQ, terms, privacy, search, provider public profile).
3) Authenticated users are routed to role dashboards.

3.2 Auth
1) User selects an auth method: email, Google, or WhatsApp OTP.
2) Backend creates or authenticates the user.
3) JWT is issued and returned with user data.
4) Frontend stores the token and fetches user state via /api/auth/me.

3.3 Role Workflows
- Provider: maintain profile, browse/apply jobs, manage leads, buy plans, receive notifications.
- Recruiter: maintain profile, search providers, unlock contact, post jobs, manage applications, buy plans, receive notifications.
- Admin: platform governance (users, plans, settings, payments, skills, content, configs).

4. Backend API Map
Route groups (mounted in server.js):
- /api/auth
- /api/user
- /api/provider
- /api/recruiter
- /api/admin
- /api/faq
- /api/payments
- /api/jobs
- /api/subscriptions
- /api/notifications
- /api/profile
- /api/reviews

4.1 Route-to-Controller Reference
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /register -> `registerEmail`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /register/send-otp -> `sendRegistrationEmailOtp`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /register/verify-otp -> `confirmRegistrationEmailOtp`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /login -> `loginUser`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /google -> `googleAuth`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /whatsapp/send-otp -> `whatsappSendOtp`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /whatsapp/verify-otp -> `whatsappVerifyOtp`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /verify-email/send -> `sendEmailVerification`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /verify-email/confirm -> `confirmEmailVerification`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> GET /me -> `getMe`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> POST /switch-role -> `switchRole`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> PUT /whatsapp-number -> `updateWhatsappNumber`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> PUT /locale -> `updateLocale`
- Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) -> PUT /whatsapp-alerts -> `toggleWhatsappAlerts`
- User: [backend/routes/userRoutes.js](backend/routes/userRoutes.js) -> PUT /language -> `updateLanguagePreference`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> GET /profile -> `getMyProfile`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> PUT /profile -> `updateProfile`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> GET /dashboard -> `getDashboard`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> GET /plans -> `getPlans`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> POST /plans/purchase -> `purchasePlan`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> GET /leads -> `getMyLeads`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> PUT /leads/:id -> `updateLeadStatus`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> GET /history -> `getMyHistory`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> GET /public/:id -> `getPublicProfile`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> POST /profile/photo -> `uploadProfilePhoto`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> DELETE /profile/photo -> `deleteProfilePhoto`
- Provider: [backend/routes/providerRoutes.js](backend/routes/providerRoutes.js) -> POST /profile/document -> `uploadDocument`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> GET /dashboard -> `getDashboard`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> PUT /profile -> `updateProfile`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> GET /public-search -> `searchProviders`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> GET /search -> `searchProviders`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> GET /view-provider/:id -> `viewProvider`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> POST /unlock/:providerId -> `unlockContact`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> GET /unlock-status/:providerId -> `checkUnlockStatus`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> POST /jobs -> `postJob`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> GET /jobs -> `getMyJobs`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> GET /plans -> `getPlans`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> POST /plans/purchase -> `purchasePlan`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> POST /review/:providerId -> `addReviewLegacy`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> GET /history -> `getMyHistory`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> POST /profile/photo -> `uploadProfilePhoto`
- Recruiter: [backend/routes/recruiterRoutes.js](backend/routes/recruiterRoutes.js) -> DELETE /profile/photo -> `deleteProfilePhoto`
- Jobs: [backend/routes/jobRoutes.js](backend/routes/jobRoutes.js) -> GET /my-applications -> `getMyApplications`
- Jobs: [backend/routes/jobRoutes.js](backend/routes/jobRoutes.js) -> GET /:jobId/applications -> `getJobApplications`
- Jobs: [backend/routes/jobRoutes.js](backend/routes/jobRoutes.js) -> PUT /applications/:applicationId -> `updateApplicationStatus`
- Jobs: [backend/routes/jobRoutes.js](backend/routes/jobRoutes.js) -> GET / -> `getAvailableJobs`
- Jobs: [backend/routes/jobRoutes.js](backend/routes/jobRoutes.js) -> POST /:jobId/apply -> `applyToJob`
- Reviews: [backend/routes/reviewRoutes.js](backend/routes/reviewRoutes.js) -> POST / -> `createReview`
- Reviews: [backend/routes/reviewRoutes.js](backend/routes/reviewRoutes.js) -> GET /can-review/:revieweeId -> `getCanReviewStatus`
- Reviews: [backend/routes/reviewRoutes.js](backend/routes/reviewRoutes.js) -> PATCH /:id -> `updateReview`
- Reviews: [backend/routes/reviewRoutes.js](backend/routes/reviewRoutes.js) -> DELETE /:id -> `deleteReview`
- Reviews: [backend/routes/reviewRoutes.js](backend/routes/reviewRoutes.js) -> GET /:userId -> `getReviewsForUser`
- Notifications: [backend/routes/notificationRoutes.js](backend/routes/notificationRoutes.js) -> GET / -> `getMyNotifications`
- Notifications: [backend/routes/notificationRoutes.js](backend/routes/notificationRoutes.js) -> PATCH /read-all -> `markAllAsRead`
- Notifications: [backend/routes/notificationRoutes.js](backend/routes/notificationRoutes.js) -> PATCH /:id/read -> `markAsRead`
- Notifications: [backend/routes/notificationRoutes.js](backend/routes/notificationRoutes.js) -> DELETE /:id -> `deleteNotification`
- Notifications: [backend/routes/notificationRoutes.js](backend/routes/notificationRoutes.js) -> PUT /read-all -> `markAllAsRead`
- Notifications: [backend/routes/notificationRoutes.js](backend/routes/notificationRoutes.js) -> PUT /:id/read -> `markAsRead`
- Subscriptions: [backend/routes/subscriptionRoutes.js](backend/routes/subscriptionRoutes.js) -> GET /me -> `getMySubscription`
- Subscriptions: [backend/routes/subscriptionRoutes.js](backend/routes/subscriptionRoutes.js) -> POST /activate -> `activateSubscription`
- Subscriptions: [backend/routes/subscriptionRoutes.js](backend/routes/subscriptionRoutes.js) -> GET /all -> `getAllSubscriptions`
- Subscriptions: [backend/routes/subscriptionRoutes.js](backend/routes/subscriptionRoutes.js) -> GET /revenue -> `getRevenue`
- Profile: [backend/routes/profileRoutes.js](backend/routes/profileRoutes.js) -> GET /:id -> `getProfileByUserId`
- Profile: [backend/routes/profileRoutes.js](backend/routes/profileRoutes.js) -> PATCH / -> `updateMyProfile`
- Payments: [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js) -> GET /config -> `getPaymentPublicConfig`
- Payments: [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js) -> POST /create-order -> `createOrder`
- Payments: [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js) -> POST /verify -> `verifyPayment`
- Payments: [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js) -> POST /failed -> `paymentFailed`
- Payments: [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js) -> GET /my-payments -> `getMyPayments`
- Payments: [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js) -> GET /:id -> `getPaymentById`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /content/:type -> `getContent`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /content/:type -> `updateContent`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /providers -> `getProviders`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /providers/:id/approve -> `approveProvider`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /recruiters -> `getRecruiters`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /recruiters/:id/approve -> `approveRecruiter`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /dashboard -> `getDashboard`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /users -> `getUsers`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /users/:id -> `getUserDetail`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /users/:id/block -> `toggleBlockUser`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> POST /managers -> `createManager`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /managers -> `getManagers`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> DELETE /managers/:id -> `deleteManager`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /approval-logs -> `getApprovalLogs`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> DELETE /users/:id -> `deleteUser`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> DELETE /providers/:id -> `deleteProvider`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> DELETE /recruiters/:id -> `deleteRecruiter`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /plans -> `getAllPlans`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> POST /plans -> `createPlan`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /plans/:id -> `updatePlan`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> DELETE /plans/:id -> `deletePlan`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /settings -> `getSettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /settings -> `updateSettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /rotation-pools -> `getRotationPools`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /rotation-pools/:id -> `updateRotationPool`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /payments -> `getPayments`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /payment-settings -> `getPaymentSettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /payment-settings -> `updatePaymentSettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /currency-settings -> `getCurrencySettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /currency-settings -> `updateCurrencySettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /cloudinary-settings -> `getCloudinarySettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /cloudinary-settings -> `updateCloudinarySettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /whatsapp-logs -> `getWhatsappLogs`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /whatsapp-settings -> `getWhatsappSettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /whatsapp-settings -> `updateWhatsappSettings`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /jobs -> `getAllJobs`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> POST /profile/photo -> `uploadProfilePhoto`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /profile/photo -> `getProfilePhoto`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> GET /skills -> `getSkillCategories`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> POST /skills -> `createSkillCategory`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> PUT /skills/:id -> `updateSkillCategory`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> DELETE /skills/:id -> `deleteSkillCategory`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> POST /skills/:id/skills -> `addSkillToCategory`
- Admin: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) -> DELETE /skills/:id/skills/:skillId -> `removeSkillFromCategory`
- FAQ: [backend/routes/faqRoutes.js](backend/routes/faqRoutes.js) -> GET / -> inline handler (list active FAQs)
- FAQ: [backend/routes/faqRoutes.js](backend/routes/faqRoutes.js) -> POST / -> inline handler (create FAQ)
- FAQ: [backend/routes/faqRoutes.js](backend/routes/faqRoutes.js) -> PUT /:id -> inline handler (update FAQ)
- FAQ: [backend/routes/faqRoutes.js](backend/routes/faqRoutes.js) -> DELETE /:id -> inline handler (delete FAQ)

5. Access Control
Auth middleware:
- JWT authentication and role enforcement in middleware/auth.js.

Profile access guard:
- Owner and admin can view.
- Provider viewing another provider is denied.
- Recruiter viewing another recruiter is denied.
- Cross-role provider <-> recruiter view is allowed.

Subscription gating:
- Recruiter job post limits and provider job apply limits are enforced in middleware/subscription.js.

6. Data Model Relationships
Primary relationships:
- User (1) -> ProviderProfile (0..1)
- User (1) -> RecruiterProfile (0..1)
- User (1) -> UserSubscription (many)
- User (1) -> Payment (many)
- Recruiter User (1) -> JobPost (many)
- JobPost (1) -> Application (many)
- Provider User (1) -> Application (many)
- Provider User (1) <-> Recruiter User (1) -> Lead (many interactions)
- User (reviewer) -> Review -> User (reviewee), linked to Lead
- User (1) -> Notification (many)

Text relationship diagram:
User
  |-- ProviderProfile
  |-- RecruiterProfile
  |-- UserSubscription
  |-- Payment
  |-- Notification
Recruiter User -- JobPost -- Application -- Provider User
Recruiter User <-> Lead <-> Provider User
Review (reviewer User -> reviewee User) linked to Lead

7. Core Domain Flows
7.1 Jobs and Applications
1) Recruiter posts a job at /api/recruiter/jobs.
2) checkPostLimit enforces monthly post limits.
3) Provider browses /api/jobs and applies via /api/jobs/:jobId/apply.
4) checkApplyLimit enforces monthly apply limits.
5) Application created and recruiter notified.

7.2 Leads and Contact Unlock
1) Recruiter unlocks provider contact.
2) Lead is created or updated.
3) Provider receives NEW_LEAD and CONTACT_UNLOCKED notifications.

7.3 Reviews
1) can-review endpoint validates prior interaction.
2) Reviews are only cross-role, self-review blocked.
3) Rating stats sync back to role profiles.
4) Review edits and deletes are limited to owner within 24 hours.

7.4 Subscriptions and Payments
1) Plan purchase uses payment controller, with Stripe or simulated flow.
2) UserSubscription is updated and PLAN_PURCHASED notification emitted.
3) Limits are enforced by middleware at runtime.

7.5 Notifications
1) Notification stored in MongoDB.
2) Socket emits to user_<userId>.
3) Unread counts updated and bell UI consumes updates.

8. API Flow Diagram (Text)
Client -> Frontend Router -> API Client
API Client -> Auth Middleware -> Controller -> Service -> Model
Model -> Response
Service -> Notification Service -> Socket Emit
Response -> Frontend State -> UI Update

9. Frontend Role and Route Flow
Route protection:
- ProtectedRoute enforces role-based access.

Main role routes:
- /provider/*
- /recruiter/*
- /admin/*

Auth routes:
- /login and /signup handled by AuthPage.

Profile routes:
- /profile/:id uses secure profile API.
- /provider/:id is public but has same-role access restrictions on the backend.

10. Role Unification Migration (Planned)
Goal: allow a single user to hold both recruiter and provider roles with an active role switch.

Planned changes:
- User schema: replace single role with roles[] and activeRole.
- Auth: return roles[] and activeRole in login/register responses.
- New endpoint: POST /api/auth/switch-role to update activeRole and lazily create profiles.
- Middleware: authorize role based on activeRole rather than a fixed user role.
- Subscriptions: add role field to UserSubscription so plans remain role-specific.
- Profile access: enforce same-role restriction based on activeRole.

Backward compatibility:
- Existing role values migrate into roles[] and activeRole.
- Migration script preserves data.

11. Known Gaps to Verify
- Validate model links between jobs, users, reviews, and subscriptions in controllers.
- Confirm same-role access restrictions in public provider profile endpoints.
- Ensure subscription checks are applied to all job and application routes.

12. Improvement Suggestions
- Consolidate duplicated role logic into shared services to reduce drift.
- Add OpenAPI documentation for each route group.
- Introduce request validation middleware to reduce controller guard logic.
- Add audit logging for admin actions and plan updates.
- Add integration tests for auth, job apply, lead unlock, and review flows.

---

## 14. Current Feature Completeness

Implemented and active:
- Multi-method authentication with role handling
- Role-protected API and frontend routes
- Cross-role profile access policy
- Job posting/application lifecycle with limits
- Lead/contact unlock workflow
- Secure review lifecycle with anti-spam and time-bound mutation
- Subscription + payment integration and plan state propagation
- Realtime + persistent notification system
- Admin governance modules (users, plans, settings, payments, skills, logs)

---

## 15. Suggested Improvements (Next Iteration)

1. Add explicit API docs (OpenAPI/Swagger) from route definitions.
2. Add e2e tests for key scenarios:
   - Email register/login verification branches
   - Same-role profile denial
   - Review eligibility and 24h mutation window
   - Plan limit enforcement
3. Add centralized audit log for admin actions and sensitive changes.
4. Add idempotency keys for payment verification and unlock flows.
5. Add soft-delete pattern for critical records (users/reviews/payments) to improve recoverability.
6. Add stronger rate limits for auth and OTP endpoints per identifier.
7. Add monitoring dashboards for notification delivery success and webhook health.

---

## 16. Text API Flow Diagram

Auth Flow:
Client -> /api/auth/register -> Otp(email) -> verify -> JWT -> /api/auth/me
Client -> /api/auth/login -> password check -> verification gate -> JWT
Client -> /api/auth/google or /api/auth/whatsapp/* -> user/profile bootstrap -> JWT

Recruiter Hiring Flow:
Recruiter -> /api/recruiter/search -> /api/recruiter/view-provider/:id -> /api/recruiter/unlock/:providerId
-> Lead + Notification -> contact available
Recruiter -> /api/recruiter/jobs -> /api/jobs/:jobId/applications -> status update

Provider Opportunity Flow:
Provider -> /api/jobs -> /api/jobs/:jobId/apply -> Application -> Recruiter notified
Provider <- /api/notifications (realtime + persisted)

Review Flow:
Reviewer -> /api/reviews/can-review/:revieweeId -> eligible?
-> /api/reviews (create)
-> /api/reviews/:id (patch/delete within 24h by owner)

Subscription Flow:
Client -> /api/payments/create-order -> /api/payments/verify or webhook
-> assign subscription -> profile plan update -> PLAN_PURCHASED notification

---

Document scope: This document reflects the currently implemented behavior in the present codebase state.
