# Batch 12 — Final Prisma Migration Audit and Readiness Report

Date: 2026-09-03

## Executive decision

The persistence foundation is Prisma-capable, but the full backend is **not ready for a PostgreSQL runtime connection or application startup yet**.

The core blockers are:

1. 152 non-legacy JavaScript files still import the Prisma-backed compatibility models. Of these, 85 are active/shared runtime files by path classification; the remainder are migration/seed or background/pipeline files.
2. `server.js` imports several workers for side effects and starts cron/crawler-related systems during startup. A first PostgreSQL HTTP smoke test is therefore not isolated from background behavior.
3. The initial migration contains risky constraints, particularly the `Payment.stripeSessionId` unique constraint combined with a default empty string and the `Plan(type, isProviderDefault, status)` unique constraint.
4. There is no verified end-to-end MongoDB-to-PostgreSQL transfer program. Several Mongo scripts connect with Mongoose but import `backend/models`, which now resolves to Prisma compatibility wrappers rather than the preserved legacy Mongoose schemas.

## Inventory

| Item | Result |
|---|---:|
| Prisma schema models | 139 |
| Files with direct Prisma client/context imports | 95 |
| Non-legacy files importing compatibility models | 152 |
| Compatibility files classified as active/shared runtime | 85 |
| Compatibility files classified as migration/seed/import | 28 |
| Compatibility files classified as worker/crawler/pipeline/background | 39 |
| Direct Mongoose files | 157 |
| Direct Mongoose legacy schema files | 140 |
| Direct Mongoose files outside the legacy directory | 17 |
| Prisma `Json` fields | 165 |
| Explicit relations | 374 |
| Explicit `onDelete: NoAction` relations | 187 |
| Explicit `onDelete: Cascade` relations | 0 |
| String fields containing `status` in their name | 76 |

All `backend/models` files are generated Prisma compatibility wrappers. They do not import Mongoose directly.

### Direct Mongoose outside the legacy directory

Direct Mongoose is limited to schema generation and old Mongo maintenance/seed scripts:

- `scripts/backfillHashes.js`
- `scripts/fixImages.js`
- `scripts/generatePrismaModelFiles.js`
- `scripts/generatePrismaSchema.js`
- `scripts/importGeoNames.js`
- `scripts/migrateApprovalStatus.js`
- `scripts/migrateReferralCodes.js`
- `scripts/removeGst.js`
- `scripts/seed100UsersAndJobs.js`
- `scripts/seedDataSources.js`
- `scripts/seedExternalJobsSystem.js`
- `scripts/seedFreeRecruiterPlan.js`
- `scripts/seedPlans.js`
- `scripts/seedProviderPlans.js`
- `scripts/seedRecruiterPlans.js`
- `scripts/seedReferralSettings.js`
- `scripts/sourceSeeder.js`

These scripts must not be executed as currently configured. Scripts that connect to MongoDB but import `../models/*` need to be audited and changed to the corresponding `../legacy-mongoose-models/*` source before they can be trusted as Mongo extraction/maintenance tools.

## Remaining-use classification

### A — Safe to leave temporarily

- Generated `backend/models/**` compatibility wrappers while deferred modules still depend on them. They execute through Prisma, not Mongoose.
- Comment-only Mongoose examples in the provider/recruiter approval middleware.
- Schema-generation tooling that reads `legacy-mongoose-models` without opening a database.

This category is safe only while its endpoints and background jobs are excluded from the first core smoke test.

### B — Must convert or isolate before PostgreSQL runtime testing

Core or cross-cutting active files that still use compatibility models:

- `controllers/adminController.js`
- `controllers/adminPartnerController.js`
- `controllers/authController.js` remaining chat/match/review sections
- `controllers/claimProfile.controller.js`
- `controllers/claimProfileController.js`
- `controllers/jobController.js`
- `controllers/jobInteractionController.js`
- `controllers/profileReviewController.js`
- `controllers/providerController.js`
- `controllers/recruiterController.js`
- `routes/adminRoutes.js`
- `services/leadDistributionService.js`

Startup isolation is also mandatory. `server.js` currently loads workers and later starts cron jobs. Before the first HTTP runtime test, worker/cron/crawler/outreach startup must be disabled behind an explicit environment switch or run from separate entry points.

### C — Must stay for MongoDB-to-PostgreSQL data migration

- `legacy-mongoose-models/**` (140 schema files)
- Mongo data cleanup/extraction scripts after their model imports are corrected
- ObjectId-to-string mapping and reconciliation artifacts
- The original MongoDB database and a verified backup until PostgreSQL cutover is accepted

No complete, verified source-to-target ETL script was found. It must be designed and tested before production cutover.

### D — Requires separate design later

- AI, embeddings, chat, ranking, matching and copilot modules
- Crawler, scraper, connector, job-source and company-source modules
- Sync engine and data-pipeline modules
- SEO/sitemap automation
- Outreach and digest workflows
- Queue handlers, cron jobs and workers
- Resume parsing/toolkit and wage-estimation systems
- Trust-score, demand-spike, fraud and self-healing systems

These contain complex queries, aggregates, geospatial behavior, external APIs or asynchronous side effects. They should not be included in the initial core PostgreSQL smoke test.

### E — Removable after approval

- `backend/models/**` compatibility wrappers, after their import count reaches zero
- `mongoose` and `mongoose-field-encryption` dependencies, after migration tooling is retired
- Legacy Mongo schemas and old Mongo-only maintenance/seed scripts, after migration validation and rollback retention expire
- Commented historical Mongoose middleware blocks

## Core business readiness

| Domain | Status | Notes |
|---|---|---|
| Auth | Partial/near-ready | Primary user/auth persistence is direct Prisma. Auxiliary chat/match/review sections in `authController` remain compatibility-based. |
| User/admin | Not fully ready | User and admin auth are direct, but the large active `adminController` and inline admin routes retain broad compatibility usage. |
| Recruiter/company | Partial | Core persistence helpers are direct Prisma; the main recruiter controller still mixes jobs, leads, reviews, tasks, AI and outreach compatibility calls. Company data is split between recruiter profile fields and crawler-oriented company tables. |
| Provider/profile | Partial | Profile persistence is direct Prisma; main provider and profile-review controllers retain complex compatibility queries. |
| Jobs | Partial | Job persistence helpers and much CRUD are direct. Public/external job listing and expiry-related paths in `jobController` remain compatibility/mixed-domain. |
| Applications | Core ready | Primary create/list/status/withdraw/save/shortlist persistence is direct Prisma. Matching/evaluation extensions remain deferred. |
| Audit logs | Core ready | Primary audit/security/activity persistence is direct Prisma. Pipeline-specific audit logs remain deferred. |
| Payments/subscriptions | Core ready with schema blockers | Direct Prisma persistence exists, but uniqueness, money types and automated subscription cron behavior must be resolved before live testing. |
| Notifications | Core ready | CRUD/log persistence is direct Prisma. Digest/outreach workers and external delivery remain deferred. |
| Referrals/partners | Partial/near-ready | Primary partner/referral flows are direct Prisma. Admin partner fraud/matching/sync paths remain compatibility-based. |

## Prisma schema risks

### Critical/high

1. `Payment.stripeSessionId` is `String @default("")` and unique. PostgreSQL permits only one row containing the empty string, so the second non-Stripe payment without an explicit session ID can fail.
2. `Plan` has `@@unique([type, isProviderDefault, status])`. This permits only one plan for each type/default/status combination and can reject multiple ordinary active plans of the same type.
3. All explicit delete behavior is `NoAction`; no relation uses cascade deletion. User, job, plan and profile deletion can fail when dependent records exist. A deliberate retain/restrict/soft-delete policy is required per relation.
4. `SavedJob @@unique([provider, jobPost, externalJob])` includes nullable columns. PostgreSQL treats nulls as distinct, so it does not reliably prevent duplicate internal or external saves.
5. `Lead @@unique([provider, recruiter, jobPost])` has a nullable `jobPost`, allowing multiple otherwise-identical direct-contact leads with null job IDs.
6. The schema has circular profile references: `User.providerProfileId`/`recruiterProfileId` point to profiles while profiles uniquely point back to `User`. Data loading requires staged nullable backfills.

### Medium

- 165 `Json` fields preserve Mongo flexibility but reduce FK integrity and query/index support. High-value normalization candidates include profile education, experience, projects, service locations, approval sections, plan benefits/configuration, job candidate arrays, notification user snapshots and activity logs.
- `JobPost.applicants`, `matchedProviders` and `candidates` duplicate data represented by application/matching tables and can drift.
- `Notification.user` duplicates the relational `userId` ownership field.
- Company ownership is not represented by a clear recruiter-owned Company entity; recruiter company data is embedded in `RecruiterProfile`, while `CompanyMaster`/`CompanySource` are crawler/source-oriented.
- Monetary amounts and many counters use `Float`; money should generally use `Decimal`, and integral counters/limits should use `Int` where appropriate.
- 76 status-like fields are free-form strings. Invalid or differently cased states can enter the database; stable domains should use enums or checked lookup tables.
- Geospatial values are stored in JSON plus latitude/longitude columns. Mongo `$near` behavior is not equivalent to the current Prisma/in-memory fallback; PostGIS or a deliberate distance-query strategy is needed at scale.
- Several polymorphic references (`AuditEvent.entityId`, approval target profile IDs, related entity IDs) cannot have normal foreign keys and require application validation.
- Several operational models have no secondary indexes or composite unique constraints. Query plans should be verified for admin settings, enquiries, support tickets, task/outreach queues, partner profiles and source/import run tables.
- ObjectIds are stored as text and new IDs default to CUID. This is workable, but every import and API boundary must treat both as opaque strings.

## Data migration risks

- Duplicate or empty values can violate PostgreSQL unique constraints (`email`, `phone`, referral codes, payment provider IDs and composite plan constraints).
- Orphan Mongo references will fail PostgreSQL foreign-key insertion.
- Mongo documents missing fields that are required in Prisma need deterministic defaults or quarantine handling.
- Mongo mixed-type arrays/objects need normalization before PostgreSQL array/JSON insertion.
- ObjectId strings must be preserved exactly and mapped consistently across every relation.
- User/profile circular references require users first, profiles second, then profile-ID backfills.
- Password hashes and encrypted/hash companion fields must be copied without rehashing or double encryption.
- Date strings, invalid dates, timezone assumptions, Decimal128 and numeric strings need explicit conversion rules.
- The compatibility layer supports only a bounded subset of Mongoose semantics; complex aggregation/populate/geospatial behavior must not be assumed equivalent without integration tests.
- There is no tested delta/cutover process for writes that arrive in MongoDB during a bulk copy.

## Readiness and migration order

Before adding a real `DATABASE_URL`:

1. Fix the critical schema constraints and decide delete behavior.
2. Convert/isolate Category B runtime paths.
3. Gate all worker/cron/crawler/outreach startup for an HTTP-only mode.
4. Build the Mongo extraction and PostgreSQL load program using `legacy-mongoose-models` explicitly.
5. Audit unique collisions, orphan references, required-field gaps and JSON/type coercions in the source data.
6. Confirm PostgreSQL version, UTF-8 encoding, UTC/timezone policy, TLS requirements, connection pool limits and a least-privilege application user.
7. Use a new disposable/staging database, never the intended production database, for the first connection.

Data load order:

1. Reference/configuration data and plans
2. Admins and users without profile back-reference IDs
3. Partner, recruiter and provider profiles
4. Backfill `User.providerProfileId` and `User.recruiterProfileId`
5. Companies/sources and jobs
6. Applications, saved jobs, leads, matches and reviews
7. Subscriptions, payments, wallets, refunds and referral commissions
8. Notifications, audit logs and activity history
9. Deferred AI/crawler/pipeline/SEO/outreach data
10. Reconcile counts, sampled records, FK orphans, unique keys, sums and API response shapes

## Exact next command sequence

Current offline verification, safe before a real connection:

```powershell
Set-Location 'D:\Lucohire_v1\backend'
$env:DATABASE_URL = 'postgresql://offline:offline@127.0.0.1:5432/offline'
npx prisma validate --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npm test
git diff --check
```

After the blockers above are resolved and a disposable empty PostgreSQL database is provisioned:

```powershell
Set-Location 'D:\Lucohire_v1\backend'
$env:DATABASE_URL = '<DISPOSABLE_STAGING_POSTGRESQL_URL>'
npx prisma validate --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma
```

`prisma migrate status` should be the first real connection command because it inspects migration state without applying the initial migration.

Only after manual review of `prisma/migrations/00000000000000_init/migration.sql`, schema-risk remediation and backup confirmation:

```powershell
npx prisma migrate deploy --schema prisma/schema.prisma
```

Do not run `prisma db push`, `prisma migrate dev` against shared/production data, any seed, or the application server at the current checkpoint.

## Rollback precautions

- Keep MongoDB authoritative and writable until PostgreSQL reconciliation succeeds.
- Take a tested Mongo backup and record collection counts/checksums before extraction.
- Use a new PostgreSQL database so rollback is a connection-string switch, not a destructive down migration.
- Load in restartable, idempotent chunks with an ID map and rejection/quarantine log.
- Record migration version, source cutoff time and row counts per model.
- Test restore procedures before cutover.
- Freeze writes or implement a verified delta replay for final cutover.
- Do not delete legacy schemas/scripts or remove Mongoose until the rollback window closes.

## Safe-check results

- Prisma validation: passed
- Prisma Client generation: passed (`v6.19.1`)
- JavaScript syntax parse: passed for 709 files
- Tests: 45 passed, 0 failed
- `git diff --check`: failed on pre-existing trailing whitespace in `workers/candidateOutreach.worker.js` and `workers/crawlerWorker.js`; these Category D files were not modified in Batch 12
- Database connections or mutation commands: none
- Application/workers/external providers invoked: none

