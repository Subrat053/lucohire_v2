# Batch 7 billing persistence checkpoint

Date: 2026-09-02

## Status

The core Batch 7 billing persistence paths now call Prisma directly, using the existing schema. This is an offline-validated code checkpoint, not a database migration or a live-payment certification. Existing response envelopes and legacy `_id` aliases are retained in the converted mappings alongside Prisma `id`. Full endpoint response parity still needs integration testing when a test database is authorized.

## Completed work

- Plan listing, lookup and administration; country pricing, custom-plan requests/offers and payment configuration persistence.
- User, provider and recruiter subscription persistence; active-plan checks, activation/status/cancellation paths, expiry/renewal persistence and billing profile synchronization.
- Payment records, payment history, billing dashboard counters, referral commission records and plan/subscription summaries.
- Provider and referral wallets, payout methods, withdrawals, partner payouts, refunds, cashback and billing-rule history.
- Profile-unlock records, recruiter CV-view limits and provider subscription usage counters.
- Restricted populated user fields in billing responses to avoid returning credential fields.
- Kept provider wallet operations inside their transaction callbacks; referral withdrawals and signup cashback now keep related balance/ledger writes in transactions.
- Added 10 database-free billing regression tests. The tests use stub delegates or pure data transformations, not live controllers/providers.
- No schema/table changes. The provider usage limit snapshot uses the existing `ProviderUsage.metadata` JSON field because the schema has no `limitSnapshot` column.

## Exact files touched in Batch 7

41 source/test files below, plus this report. The repository already has uncommitted work from earlier batches; this is not the full repository `git status` list.

- [config/rewardConfig.js](D:/Lucohire_v1/backend/config/rewardConfig.js)
- [controllers/adminController.js](D:/Lucohire_v1/backend/controllers/adminController.js)
- [controllers/adminPartnerController.js](D:/Lucohire_v1/backend/controllers/adminPartnerController.js)
- [controllers/adminProviderSubscriptionController.js](D:/Lucohire_v1/backend/controllers/adminProviderSubscriptionController.js)
- [controllers/adminReferralWithdrawalController.js](D:/Lucohire_v1/backend/controllers/adminReferralWithdrawalController.js)
- [controllers/adminUserSubscriptionController.js](D:/Lucohire_v1/backend/controllers/adminUserSubscriptionController.js)
- [controllers/adminWithdrawalController.js](D:/Lucohire_v1/backend/controllers/adminWithdrawalController.js)
- [controllers/authController.js](D:/Lucohire_v1/backend/controllers/authController.js)
- [controllers/candidateViewController.js](D:/Lucohire_v1/backend/controllers/candidateViewController.js)
- [controllers/jobController.js](D:/Lucohire_v1/backend/controllers/jobController.js)
- [controllers/jobInteractionController.js](D:/Lucohire_v1/backend/controllers/jobInteractionController.js)
- [controllers/managerBankAccountController.js](D:/Lucohire_v1/backend/controllers/managerBankAccountController.js)
- [controllers/partnerController.js](D:/Lucohire_v1/backend/controllers/partnerController.js)
- [controllers/paymentController.js](D:/Lucohire_v1/backend/controllers/paymentController.js)
- [controllers/providerController.js](D:/Lucohire_v1/backend/controllers/providerController.js)
- [controllers/providerPlanController.js](D:/Lucohire_v1/backend/controllers/providerPlanController.js)
- [controllers/providerWalletController.js](D:/Lucohire_v1/backend/controllers/providerWalletController.js)
- [controllers/recruiterController.js](D:/Lucohire_v1/backend/controllers/recruiterController.js)
- [controllers/referralController.js](D:/Lucohire_v1/backend/controllers/referralController.js)
- [controllers/refundController.js](D:/Lucohire_v1/backend/controllers/refundController.js)
- [controllers/subscriptionController.js](D:/Lucohire_v1/backend/controllers/subscriptionController.js)
- [controllers/walletController.js](D:/Lucohire_v1/backend/controllers/walletController.js)
- [controllers/withdrawalController.js](D:/Lucohire_v1/backend/controllers/withdrawalController.js)
- [middleware/subscription.js](D:/Lucohire_v1/backend/middleware/subscription.js)
- [routes/adminRoutes.js](D:/Lucohire_v1/backend/routes/adminRoutes.js)
- [routes/refundRoutes.js](D:/Lucohire_v1/backend/routes/refundRoutes.js)
- [services/badgeService.js](D:/Lucohire_v1/backend/services/badgeService.js)
- [services/billingPersistenceService.js](D:/Lucohire_v1/backend/services/billingPersistenceService.js)
- [services/candidateAccessService.js](D:/Lucohire_v1/backend/services/candidateAccessService.js)
- [services/cashbackService.js](D:/Lucohire_v1/backend/services/cashbackService.js)
- [services/notificationService.js](D:/Lucohire_v1/backend/services/notificationService.js)
- [services/pricingEngine.js](D:/Lucohire_v1/backend/services/pricingEngine.js)
- [services/provider/customPlan.service.js](D:/Lucohire_v1/backend/services/provider/customPlan.service.js)
- [services/providerPlanService.js](D:/Lucohire_v1/backend/services/providerPlanService.js)
- [services/providerUsageService.js](D:/Lucohire_v1/backend/services/providerUsageService.js)
- [services/recruiterPlanService.js](D:/Lucohire_v1/backend/services/recruiterPlanService.js)
- [tests/billingPersistence.test.js](D:/Lucohire_v1/backend/tests/billingPersistence.test.js)
- [utils/billingRuleUtils.js](D:/Lucohire_v1/backend/utils/billingRuleUtils.js)
- [utils/cronJobs.js](D:/Lucohire_v1/backend/utils/cronJobs.js)
- [utils/razorpay.js](D:/Lucohire_v1/backend/utils/razorpay.js)
- [utils/stripe.js](D:/Lucohire_v1/backend/utils/stripe.js)

Prisma generation also refreshed generated client artifacts under `D:/Lucohire_v1/backend/node_modules/@prisma/client`. No dependencies were installed or package files edited as part of this batch.

## Deferred work and remaining compatibility usage

There are no compatibility-model imports for the billing entities in the converted core billing paths. This does **not** mean every shared file or the entire backend is compatibility-free.

The explicit AI/ranking/outreach exclusions still reference billing models:

- `middleware/aiUsage.js`: ProviderSubscription, Plan.
- `middleware/recruiterAiUsage.js`: UserSubscription, Plan.
- `controllers/recruiterAIUsage.controller.js`: UserSubscription.
- `controllers/providerJobsAIController.js`: ProviderSubscription.
- `controllers/providerAI.controller.js`: ProviderSubscription.
- `controllers/recruiterController.js`: the separate `getAiUsage` flow retains UserSubscription and Plan.
- `services/providerRankingService.js`: UserSubscription, ProviderSubscription.
- `services/providerIntelligenceService.js` and `services/ai/autoAnalyzer.js`: ProviderSubscription.
- `utils/cronJobs.js`: the outreach/matching credit-sync block retains UserSubscription; subscription expiry and renewal persistence were converted.
- `controllers/refundController.js`: AI-credit calculations retain ProviderAiUsage as requested by the AI exclusion.

Ancillary compatibility usage remains in shared files for partner/referral onboarding and administration, manager bank-account management, account phone/OTP/support flows, notifications and unrelated profile/analytics operations. Those modules were not broadly converted. Existing seed/import/migration scripts and legacy compatibility model files remain unchanged in this batch.

Database-backed integration tests, concurrent payment/webhook fulfillment tests, constraint behavior, payment-provider sandbox tests and data migration are deferred. Existing SDK/email/notification code remains in the application but was not invoked.

The existing `GET /api/refunds/fix-db` repair route was converted at the persistence level only. It was **not invoked**. It remains an unauthenticated, mutating legacy route and should not be exposed in production without a separate authorization/security change.

## Remaining Mongoose usage

No direct Mongoose runtime import or API use was found in the converted core billing paths. The scan of the 41 touched files found only a pricing documentation reference and a test label mentioning Mongoose. Compatibility-model use in excluded/ancillary sections is listed above. Legacy Mongoose files were not deleted, moved or edited in this batch.

## Validation results

- `npx prisma validate --schema prisma/schema.prisma`: passed.
- `npx prisma generate --schema prisma/schema.prisma`: passed; Prisma Client 6.19.1 generated.
- JavaScript syntax parse: 707 backend JavaScript files, zero errors. Source was parsed, not executed.
- `npm test`: 37 passed, zero failed, including 10 new billing tests.
- Scoped Git diff whitespace check: passed with CRLF-aware whitespace settings. An initial check using an incorrect autocrlf override produced line-ending warnings; the CRLF-aware rerun passed without rewriting unrelated formatting.
- There is no backend build script in `package.json`; no app startup was used as a build check.

Validation/generation used a process-local dummy DATABASE_URL pointing to an offline localhost port; `.env` was not changed. These Prisma commands do not connect to a database.

## Safety confirmation

No MongoDB or PostgreSQL connection, migration, db push, seed, app/worker/cron startup, live webhook test, payment transaction, bank request, email, SMS or WhatsApp send was run. No Razorpay, Stripe, Cashfree, PayPal or other external payment/provider API was called. No commit was created.

## Safe checks to repeat later

From `D:/Lucohire_v1/backend`:

```powershell
$env:DATABASE_URL = 'postgresql://offline:offline@127.0.0.1:1/offline'
npx prisma validate --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npm test
```

Do not run migrations, seeds, app startup or the repair route until those actions are separately authorized.

