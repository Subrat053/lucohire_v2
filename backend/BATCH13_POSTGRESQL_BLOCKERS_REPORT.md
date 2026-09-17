# Batch 13 — PostgreSQL Readiness Blockers

Date: 2026-09-03

## Files changed

- `.env.example`
- `server.js`
- `prisma/schema.prisma`
- `prisma/migrations/00000000000000_init/migration.sql`
- `prisma/model-metadata.json`
- `legacy-mongoose-models/Payment.js`
- `scripts/generatePrismaSchema.js`
- `scripts/backfillHashes.js`
- `scripts/importGeoNames.js`
- `scripts/migrateApprovalStatus.js`
- `scripts/migrateReferralCodes.js`
- `scripts/seed100UsersAndJobs.js`
- `scripts/seedDataSources.js`
- `scripts/seedExternalJobsSystem.js`
- `scripts/seedFreeRecruiterPlan.js`
- `scripts/seedPlans.js`
- `scripts/seedProviderPlans.js`
- `scripts/seedRecruiterPlans.js`
- `scripts/seedReferralSettings.js`
- `scripts/sourceSeeder.js`
- `BATCH13_POSTGRESQL_BLOCKERS_REPORT.md`

## Schema blockers fixed

- `Payment.stripeSessionId` is now nullable and unique, with no empty-string default. PostgreSQL can therefore store multiple non-Stripe payments as `NULL` while retaining uniqueness for real provider session IDs.
- Compatibility metadata and the legacy schema source no longer inject an empty Stripe session ID.
- The existing initial migration now creates a nullable Stripe session column with its unique index.
- The unsafe global `Plan(type, isProviderDefault, status)` unique constraint was replaced with a non-unique lookup index.
- The schema generator now converts MongoDB partial unique indexes to non-unique Prisma indexes because Prisma schema syntax cannot preserve their predicate safely.

## Startup gates added

All flags default to `false` in `.env.example`:

- `ENABLE_WORKERS`
- `ENABLE_CRON`
- `ENABLE_CRAWLERS`
- `ENABLE_OUTREACH`

Background modules are lazy-loaded only after the corresponding gates pass. Crawler workers require both `ENABLE_CRAWLERS=true` and `ENABLE_WORKERS=true`; crawler cron processes require both `ENABLE_CRAWLERS=true` and `ENABLE_CRON=true`. Outreach workers and cron processes follow the equivalent two-flag rule.

Normal default startup is HTTP API plus its database connection only; it no longer registers queues or imports/starts workers, cron, crawler or outreach modules.

## Mongo script import risks fixed

Seventeen direct-Mongoose scripts were audited. Every script that imports a model now imports it from `legacy-mongoose-models`, not the Prisma-backed `models` directory. `seed100UsersAndJobs.js` was also changed to connect explicitly through `mongoose.connect(MONGO_URI)` instead of the now-Prisma `config/db` helper.

No migration, seed or import script was executed.

## Remaining blockers before a disposable PostgreSQL test

- Category B core controllers still using compatibility models should be converted or excluded from the first smoke-test route set: main admin, provider, recruiter, job, job-interaction, claim-profile, profile-review, admin-partner and lead-distribution paths.
- The initial migration SQL still needs full manual review, particularly delete behavior, nullable composite uniqueness and circular user/profile loading order.
- A disposable empty PostgreSQL database, least-privilege credentials and an explicit route-level smoke-test scope must be prepared.
- Mongo-to-PostgreSQL ETL and source-data cleanup remain separate work required before testing with migrated production-like data.

## Safe checks

- Prisma validation: passed
- Prisma Client generation: passed (`v6.19.1`)
- JavaScript syntax parse: 709 files passed
- Tests: 45 passed, 0 failed
- Direct-Mongoose script import audit: 17 scripts passed
- `git diff --check`: still reports pre-existing trailing whitespace in `workers/candidateOutreach.worker.js` and `workers/crawlerWorker.js`; these deferred files were not changed in Batch 13
- Database/external-service calls: none
- Commit: none

