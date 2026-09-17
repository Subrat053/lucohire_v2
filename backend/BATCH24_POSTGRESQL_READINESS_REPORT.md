# Batch 24 — Final PostgreSQL readiness and disposable smoke-test plan

Date: 2026-09-08

## Executive decision

- **Code conversion:** complete enough for a restricted disposable PostgreSQL test.
- **Run that test immediately from the current migration artifact:** **no**. The current initial migration is stale: it still creates `chatmessages.clientMessageId` as `TEXT NOT NULL DEFAULT ''`, while `schema.prisma` correctly defines it as nullable. Reconcile and review the initial migration SQL before `prisma migrate deploy`.
- **Production PostgreSQL:** **not safe yet**.
- **MongoDB data migrated:** **no**.

No application, database, migration, seed, worker, external service, or background process was run in Batch 24.

## Final runtime scan

The scan covered JavaScript/TypeScript under `backend/` and excluded generated Prisma files, `legacy-mongoose-models`, tests, archived files, and intentionally retained Mongo migration/seed/import/repair scripts. Commented imports were ignored.

| Finding | Result |
|---|---:|
| Direct Mongoose runtime imports | **0 occurrences / 0 files** |
| Compatibility-model runtime imports | **282 occurrences / 89 files** |
| Ungated core HTTP routes using compatibility wrappers | **0 found** |
| Deferred HTTP controllers/routes | **24 files** |
| Deferred architecture modules/services | **50 files** |
| Deferred cron/job/worker files | **15 files** |

The exact 89-file inventory remains unchanged from `BATCH23_FINAL_COMPATIBILITY_REPORT.md`. All are in AI/matching/outreach, crawler/connector/sync/pipeline, or background-job surfaces. The mixed `controllers/recruiterController.js` retains 18 local imports only inside matching, AI, talent-pool, usage, or outreach branches with route or early-controller guards.

## Startup isolation

`server.js` always starts the HTTP listener and connects Prisma to the configured PostgreSQL database. Optional background systems are lazy-loaded only after their flags pass.

HTTP-only startup is safe when the smoke-test shell explicitly sets every optional flag to false. Do not rely on missing variables: `config/env.js` currently treats absent `AI_FEATURES_ENABLED` as enabled during validation.

Required false flags:

```text
AI_FEATURES_ENABLED
AI_CHAT_ENABLED
AI_PROFILE_ENABLED
AI_EMBEDDINGS_ENABLED
AI_OCR_ENABLED
AI_FRAUD_ENABLED
ENABLE_AI_RESUME_LOGS
ENABLE_RESUME_AI
ENABLE_RESUME_OCR
ENABLE_WORKERS
ENABLE_CRON
ENABLE_CRAWLERS
ENABLE_OUTREACH
ENABLE_RECRUITER_MATCHING
ENABLE_RECRUITER_AI
ENABLE_PROVIDER_AI_INSIGHTS
ENABLE_PROVIDER_AI_JOBS
ENABLE_PROVIDER_RESUME_AUTOGENERATION
ENABLE_PROVIDER_DOCUMENT_VERIFICATION
ENABLE_EXTERNAL_PROFILE_ASSETS
ENABLE_COMMUNICATION_PROVIDERS
ENABLE_PAYMENT_PROVIDERS
ENABLE_WEBHOOKS
ENABLE_WAGE_AI
ENABLE_SEO_AUTOMATION
ENABLE_JOB_AI_EXPIRY
ENABLE_JOB_AI_MATCHING
ENABLE_EXTERNAL_LOCATION_LOOKUPS
ENABLE_LEAD_DISTRIBUTION
ENABLE_SYNC_ENGINE
ENABLE_CONNECTORS
ENABLE_PIPELINE_JOBS
ENABLE_SELF_HEALING
QUEUE_USE_BULLMQ
```

Importing `homepageMetricsRoutes` loads worker function definitions but does not start BullMQ. Do not call `/api/public/homepage-metrics`, because a cache miss invokes deferred compatibility aggregates and can initialize Redis when configured.

## Core readiness matrix

| Area | Persistence readiness | First empty-database test |
|---|---|---|
| Auth/user/admin | Direct Prisma core | Public rejection/login lookup only; avoid registration, OTP, email, OAuth and Firebase |
| Recruiter/company | Direct Prisma core | Route-auth rejection only until disposable users/fixtures exist; matching/outreach branches remain off |
| Provider/profile | Direct Prisma core | Public empty reads and route-auth rejection; avoid uploads and AI |
| Jobs | Direct Prisma core | Public empty list/detail reads are allowlisted |
| Applications/saved jobs/shortlisting | Direct Prisma core | Route-auth rejection first; functional writes require deliberate disposable fixtures |
| Audit/admin logs | Direct Prisma core | Route-auth rejection first; authenticated CRUD requires disposable admin/user fixtures |
| Billing/subscription/payment persistence | Direct Prisma core | Public plan reads and protected rejection paths only; no provider checkout/callback |
| Notifications/communication logs | Direct Prisma core | Protected rejection only; no delivery providers |
| Referrals/partners | Direct Prisma core | Protected rejection only; payout and external communications excluded |
| Profile review | Direct Prisma core | Protected rejection only; correction email excluded |
| Public SEO/sitemap | Direct Prisma reads | Allowlisted |
| Support/enquiry | Direct Prisma | Protected rejection plus optional disposable enquiry write |
| FAQ | Direct Prisma | GET allowlisted. POST/PUT/DELETE currently lack authentication and must not be tested; this is a production security debt. |
| Profile share | Direct Prisma | Missing-token public lookup is allowlisted; token creation needs fixtures |
| Other public reads | Direct Prisma where listed | Skills, company details, job roles, plans and top talent are allowlisted |

This matrix is based on static analysis and unit/static tests. No runtime database integration test has happened yet.

## Excluded from the first PostgreSQL test

- AI, chat, OCR, embeddings, ranking, matching, copilot, career analysis and AI usage execution.
- Crawler, scraper, connectors, sync engine, company/job sources and data pipeline.
- Workers, cron jobs, BullMQ/Redis queues, manual background refreshes and homepage metric computation.
- Outreach, candidate sourcing, candidate digest and claim-profile flows.
- Live webhooks.
- Payment checkout, provider order/subscription creation, verification and callbacks.
- Email, SMS, WhatsApp, push, OTP delivery, password-reset delivery and magic-link delivery.
- Resume/document/image upload, Cloudinary, S3 signing and other external file providers.
- Location/reverse-geocoding, translation and other external fetches.
- All MongoDB data migration, seed, import and repair scripts.

## Schema and migration risks

### Blocking the next disposable test

1. **Initial migration drift:** `prisma/migrations/00000000000000_init/migration.sql` still creates `chatmessages.clientMessageId` as non-null with an empty-string default. `schema.prisma` defines `String?`. The migration must be regenerated or corrected and reviewed before deploy.
2. **Broader migration parity is unproven:** because the known drift exists, the full initial SQL must be compared with the current Prisma schema before use.

### Remaining design/data risks

1. **Prompt templates:** duplicate `key`/`feature_name`, `isActive`/`is_active`, and `template`/`prompt_template` contracts require a canonical-field and data-migration decision.
2. **Embeddings:** JSON/array storage lacks pgvector types, distance operators and vector indexes. Keep semantic search disabled until dimensions, extension, operator class and index strategy are selected.
3. **JSON counters:** optimistic compare/retry prevents ordinary lost updates, but high-contention accounting should use normalized counter rows or numeric columns.
4. **Mongo-era string IDs:** preserved ObjectIds plus new CUIDs are workable only when all APIs and loaders treat IDs as opaque strings.
5. **Delete policy:** relations overwhelmingly use `onDelete: NoAction`; user/profile/job/plan deletion can fail with dependents. Decide restrict, soft-delete, anonymize, or cascade per relation before production.
6. **Nullable unique semantics:** single nullable unique fields such as `Payment.stripeSessionId` correctly permit multiple NULLs. The nullable `ChatMessage` composite is intentional. However nullable composites on `SavedJob`, `Lead`, and `Review` do not guarantee uniqueness when nullable members are NULL; current application checks must be load-tested or replaced with deliberate partial indexes/design.
7. **Foreign-key insert order:** reference/config and users must precede profiles; circular user/profile back-references require a later backfill. Jobs precede applications/saves/leads; plans and users precede subscriptions/payments.
8. **Required legacy data:** missing required strings, arrays, dates, invalid dates, duplicate emails/phones/referral codes, malformed JSON and orphan ObjectId references must be audited and either defaulted or quarantined before loading Mongo data.
9. **Production security:** FAQ mutation routes are currently public. This is unrelated to Prisma validation but blocks broad production exposure.

## Exact next action

Create a dedicated schema-artifact reconciliation checkpoint: regenerate or correct `00000000000000_init/migration.sql` from the current `schema.prisma`, inspect the SQL, and confirm at minimum that `chatmessages.clientMessageId` is nullable with no default. Do not point Prisma at any database for this step.

Only after that review should the disposable test below be run.

## Disposable PostgreSQL command plan

### Option A — Docker PostgreSQL (recommended)

Run in a new PowerShell terminal after the initial migration is reconciled:

```powershell
Set-Location 'D:\Lucohire_v1\backend'

$smokeContainer = 'lucohire-pg-smoke'
$smokeDbUrl = 'postgresql://lucohire_smoke:smoke_only_password@127.0.0.1:55432/lucohire_smoke?schema=public'
$smokeSql = Get-Content -LiteralPath 'prisma\migrations\00000000000000_init\migration.sql' -Raw

if ($smokeSql -match '"clientMessageId"\s+TEXT\s+NOT NULL' -or $smokeSql -match '"clientMessageId"[^\r\n]*DEFAULT') {
  throw 'Initial migration is stale: reconcile clientMessageId before creating the disposable database.'
}

docker run --name $smokeContainer --rm --detach `
  --env POSTGRES_USER=lucohire_smoke `
  --env POSTGRES_PASSWORD=smoke_only_password `
  --env POSTGRES_DB=lucohire_smoke `
  --publish 127.0.0.1:55432:5432 `
  postgres:16

do {
  Start-Sleep -Seconds 1
  docker exec $smokeContainer pg_isready --username lucohire_smoke --dbname lucohire_smoke
} until ($LASTEXITCODE -eq 0)

$env:DATABASE_URL = $smokeDbUrl
if ($env:DATABASE_URL -notmatch '^postgresql://lucohire_smoke:.*@127\.0\.0\.1:55432/lucohire_smoke\?') {
  throw 'Refusing a non-disposable DATABASE_URL.'
}

$env:NODE_ENV = 'test'
$env:PORT = '5051'
$env:JWT_SECRET = 'smoke-only-jwt-secret-never-use-in-production'
$env:REDIS_URL = ''

$falseFlags = @(
  'AI_FEATURES_ENABLED','AI_CHAT_ENABLED','AI_PROFILE_ENABLED','AI_EMBEDDINGS_ENABLED',
  'AI_OCR_ENABLED','AI_FRAUD_ENABLED','ENABLE_AI_RESUME_LOGS','ENABLE_RESUME_AI',
  'ENABLE_RESUME_OCR','ENABLE_WORKERS','ENABLE_CRON','ENABLE_CRAWLERS','ENABLE_OUTREACH',
  'ENABLE_RECRUITER_MATCHING','ENABLE_RECRUITER_AI','ENABLE_PROVIDER_AI_INSIGHTS',
  'ENABLE_PROVIDER_AI_JOBS','ENABLE_PROVIDER_RESUME_AUTOGENERATION',
  'ENABLE_PROVIDER_DOCUMENT_VERIFICATION','ENABLE_EXTERNAL_PROFILE_ASSETS',
  'ENABLE_COMMUNICATION_PROVIDERS','ENABLE_PAYMENT_PROVIDERS','ENABLE_WEBHOOKS',
  'ENABLE_WAGE_AI','ENABLE_SEO_AUTOMATION','ENABLE_JOB_AI_EXPIRY',
  'ENABLE_JOB_AI_MATCHING','ENABLE_EXTERNAL_LOCATION_LOOKUPS','ENABLE_LEAD_DISTRIBUTION',
  'ENABLE_SYNC_ENGINE','ENABLE_CONNECTORS','ENABLE_PIPELINE_JOBS','ENABLE_SELF_HEALING',
  'QUEUE_USE_BULLMQ'
)
foreach ($flag in $falseFlags) { Set-Item -Path "Env:$flag" -Value 'false' }

npx prisma validate --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma

# Read and approve this file before continuing.
Get-Content -LiteralPath 'prisma\migrations\00000000000000_init\migration.sql'

# This is permitted only because DATABASE_URL was asserted as the disposable local database above.
npx prisma migrate deploy --schema prisma/schema.prisma
npm start
```

Wait for `PostgreSQL connected through Prisma` and `Server running on port 5051`.

### Option B — existing local PostgreSQL

Use a brand-new local database and a dedicated user. Never reuse an existing database:

```powershell
createuser --host 127.0.0.1 --port 5432 --username postgres --pwprompt lucohire_smoke
createdb --host 127.0.0.1 --port 5432 --username postgres --owner lucohire_smoke lucohire_smoke
Set-Location 'D:\Lucohire_v1\backend'
$env:DATABASE_URL = 'postgresql://lucohire_smoke:LOCAL_SMOKE_PASSWORD@127.0.0.1:5432/lucohire_smoke?schema=public'
```

Then use the same migration preflight, false flags, Prisma commands and startup command from Option A. Confirm the dedicated role owns only `lucohire_smoke`.

## Exact first route probes

In a second PowerShell terminal:

```powershell
$base = 'http://127.0.0.1:5051'

curl.exe --fail-with-body "$base/"
curl.exe --fail-with-body "$base/api/health"
curl.exe --fail-with-body "$base/api/skills"
curl.exe --fail-with-body "$base/api/public/company-details"
curl.exe --fail-with-body "$base/api/faq"
curl.exe --fail-with-body "$base/api/job-roles"
curl.exe --fail-with-body "$base/api/plans?audience=provider"
curl.exe --fail-with-body "$base/api/plans?audience=recruiter"
curl.exe --fail-with-body "$base/api/plans/landing"
curl.exe --fail-with-body "$base/api/jobs?origin=internal&limit=5"
curl.exe --fail-with-body "$base/api/provider/top-talent?limit=5"
curl.exe --fail-with-body "$base/sitemap.xml"
curl.exe --fail-with-body "$base/api/sitemap.xml"
curl.exe --fail-with-body "$base/api/admin/content/terms"

# Expected 404; verifies direct-Prisma public lookup wiring.
curl.exe --include "$base/api/profile-share/view/not-a-real-token"
curl.exe --include "$base/api/jobs/public/not-a-real-id"

# Expected 401; verifies protected core routers without creating fixtures.
curl.exe --include "$base/api/auth/me"
curl.exe --include "$base/api/v1/auth/me"
curl.exe --include "$base/api/provider/profile"
curl.exe --include "$base/api/recruiter/dashboard"
curl.exe --include "$base/api/jobs/my-applications"
curl.exe --include "$base/api/subscriptions/me"
curl.exe --include "$base/api/notifications"
curl.exe --include "$base/api/referrals/my-stats"
curl.exe --include "$base/api/v1/partner/dashboard"
curl.exe --include "$base/api/v1/support/admin"
curl.exe --include "$base/api/admin/profile-reviews"

# Expected 401 or validation rejection for a nonexistent admin.
curl.exe --include --request POST "$base/api/v1/admin/login" `
  --header 'Content-Type: application/json' `
  --data '{"email":"missing-smoke-admin@example.invalid","password":"not-a-real-password"}'
```

Optional disposable write probes, still with all providers disabled:

```powershell
curl.exe --fail-with-body --request POST "$base/api/public/newsletter/subscribe" `
  --header 'Content-Type: application/json' `
  --data '{"email":"postgres-smoke@example.invalid"}'

curl.exe --fail-with-body --request POST "$base/api/enquiry" `
  --header 'Content-Type: application/json' `
  --data '{"name":"Postgres Smoke","email":"postgres-smoke@example.invalid","subject":"Disposable test","message":"Disposable PostgreSQL persistence probe"}'
```

Stop Node with Ctrl+C. For Docker cleanup:

```powershell
docker stop lucohire-pg-smoke
```

## Routes to avoid exactly

Do not test these prefixes or operations in the first pass:

- `/api/ai/**`, `/api/chat/**`, `/api/vision/**`, `/api/candidate/**`, `/api/candidates/**`
- `/api/recruiter/ai/**`, `/api/recruiter-copilot/**`, recruiter matching/search/talent-pool/outreach routes
- `/api/provider/ai/**`, provider match/scrape/AI/resume parse/document/image upload routes
- `/api/search/**`, `/api/wage-estimator/**`, `/api/candidate-matching/**`
- `/api/v1/external-jobs/**`, `/api/v1/admin/job-sources/**`, `/api/v1/admin/company-sources/**`
- `/api/v1/admin/sync/**`, `/api/v1/admin/data-pipeline/**`, `/api/v1/pipeline/**`, `/api/v1/admin/pipeline/**`
- `/api/v1/admin/recruiter-leads/**`, `/api/v1/admin/outreach/**`, `/api/claim-profile/**`, `/api/freelancer/**`
- `/api/webhooks/**` and `/api/payments/webhook` or `/api/payments/razorpay-webhook`
- Payment/order/checkout/subscription verification/callback, refund, wallet, withdrawal and paid unlock mutations
- Registration, OTP sending, forgot-password, magic-link, Google, Firebase and WhatsApp authentication routes
- Email/SMS/WhatsApp/push notification delivery and profile-review correction notification routes
- `/api/location/**`, `/api/translate/**`, reverse geocoding and any other external lookup
- `/api/public/homepage-metrics` and manual homepage-metrics refresh
- FAQ `POST`, `PUT`, and `DELETE`
- Every upload, parser, seed, import, repair, Mongo migration, worker, cron and queue entry point

## Do not do yet

1. Do not set a production `DATABASE_URL`.
2. Do not use a real Neon production database.
3. Do not use a VPS production PostgreSQL database.
4. Do not run MongoDB-to-PostgreSQL migration or cleanup scripts.
5. Do not test the full route surface.
6. Do not run seeds, imports, repair scripts, `prisma db push`, or `prisma migrate dev`.
7. Do not enable or call any external service or optional operational flag.
8. Do not remove compatibility wrappers, legacy schemas, Mongoose dependencies, or the MongoDB rollback source yet.

## Offline verification performed

- `prisma validate`: passed.
- `prisma generate`: passed with Prisma 6.19.1.
- JavaScript syntax parsing: 546 in-scope files passed; 0 failures.
- Backend tests: 71 passed; 0 failed.
- Full `git diff --check`: reports only 10 pre-existing trailing-whitespace findings in deferred `backend/workers/crawlerWorker.js`.
- Code changes in Batch 24: none; this report is the only new artifact.
- Commit created: no.
