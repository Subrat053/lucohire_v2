# Batch 14 — HTTP-only PostgreSQL smoke-test preparation

Date: 2026-09-04

## Decision

It is safe to run a **restricted, allowlisted smoke test** against a new disposable PostgreSQL database. It is not yet safe to exercise every mounted route. Several deferred crawler, AI, SEO, matching, pipeline, admin, provider, recruiter, and job paths still use Prisma compatibility wrappers or external services.

No server, database, worker, crawler, migration, seed, import, or external provider was run during this batch.

## Files changed in Batch 14

- `.env.example`
- `server.js`
- `workers/jobScraper.js`
- `config/firebaseAdmin.js`
- `controllers/authController.js`
- `services/recruiterPlanService.js`
- `BATCH14_HTTP_ONLY_SMOKE_TEST_REPORT.md`

## Startup isolation

The HTTP entry point now defaults all of these systems off:

- `ENABLE_WORKERS=false`
- `ENABLE_CRON=false`
- `ENABLE_CRAWLERS=false`
- `ENABLE_OUTREACH=false`
- `QUEUE_USE_BULLMQ=false`
- `AI_FEATURES_ENABLED=false`
- `AI_CHAT_ENABLED=false`
- `AI_PROFILE_ENABLED=false`
- `AI_EMBEDDINGS_ENABLED=false`
- `AI_OCR_ENABLED=false`
- `AI_FRAUD_ENABLED=false`

`server.js` lazy-loads workers, cron jobs, crawler jobs and outreach jobs only after their gates pass. Crawler workers require both crawler and worker flags. Crawler cron jobs require both crawler and cron flags. Outreach follows the equivalent two-flag rule.

A gate leak was fixed in `workers/jobScraper.js`: importing provider/recruiter matchmaking routes no longer schedules the nightly scraper. Its cron is now started only by the crawler-plus-cron block in `server.js`.

Firebase Admin and the recruiter-plan Razorpay client are now initialized lazily inside their explicitly invoked auth/payment routes. Loading HTTP routes no longer requires those provider credentials and does not initialize those clients.

The normal process contains Express, its Socket.IO listener, static uploads, and the PostgreSQL Prisma connection. It does not start a separate worker, cron, crawler, outreach, AI-worker or Redis queue process with the flags above. `connectDB()` is asynchronous, so wait for the `PostgreSQL connected through Prisma` log before testing database-backed routes.

## Mongoose audit

There are no direct Mongoose imports in active HTTP runtime files. Direct `require('mongoose')` usage is confined to:

- `legacy-mongoose-models/**`
- 17 schema-generation or Mongo migration/seed/import/maintenance scripts under `scripts/**`

Active mounted routes still contain Prisma-backed compatibility-model imports. Those are not MongoDB connections, but the affected routes are excluded below because their behavioral parity has not been proven.

## Safe smoke-test routes

Use only these routes for the first empty-database test:

| Method | Route | Expected empty-database result | Purpose |
|---|---|---|---|
| GET | `/` | 200 text | HTTP listener |
| GET | `/api/health` | 200 JSON | Express health only |
| GET | `/api/skills` | 200, normally `[]` | Direct Prisma read |
| GET | `/api/public/company-details` | 200 fallback JSON | Direct Prisma read plus fallback |
| GET | `/api/faq` | 200, normally `[]` | Direct Prisma read |
| GET | `/api/job-roles` | 200, normally `[]` | Direct Prisma read |
| GET | `/api/plans?audience=provider` | 200, normally `[]` | Direct Prisma plan read |
| GET | `/api/plans?audience=recruiter` | 200, normally `[]` | Direct Prisma plan read |
| GET | `/api/plans/landing` | 200, normally `[]` | Direct Prisma plan read |
| POST | `/api/v1/admin/login` | 401 for a nonexistent user | Direct Prisma admin lookup |
| GET | `/api/auth/me` | 401 without a token | Auth rejection path |

Optional disposable-only write probes:

- `POST /api/public/newsletter/subscribe` with a synthetic, non-deliverable example address.
- `POST /api/enquiry` with synthetic data.

These writes do not send notifications, but should be used only because the database is disposable.

## Routes to avoid in the first smoke test

- AI, chat, OCR, translation, copilot, ranking, matching and candidate-report routes.
- Crawler, external-job, scraper, connector, sync, pipeline, company-source, SEO and sitemap routes.
- Outreach, digest, queue-status and manual background-job routes.
- Payment, checkout, webhook, refund, wallet, withdrawal, unlock and paid-subscription mutation routes.
- Email, OTP, WhatsApp, Firebase, Google login, registration, forgot-password and magic-link routes.
- Location, locale detection/reverse-geocoding/currency, and wage-estimator routes because they may call external APIs.
- Resume/document/image upload and parsing routes.
- `/api/public/homepage-metrics`, because a cache miss computes deferred compatibility-model aggregates and may use Redis when configured.
- Broad `/api/jobs`, `/api/provider`, `/api/recruiter`, `/api/admin`, claim-profile, profile-review and partner flows until their remaining compatibility-backed branches receive dedicated runtime tests.

## Exact future command sequence

Run this only when ready to create and destroy a local disposable Docker database. Choose an unused port such as `5051`; `server.js` attempts to terminate a process already using its configured port.

### Terminal 1 — disposable database and backend

```powershell
Set-Location 'D:\Lucohire_v1\backend'

$smokeContainer = 'lucohire-pg-smoke'
$smokeDbUrl = 'postgresql://lucohire_smoke:smoke_only_password@127.0.0.1:55432/lucohire_smoke?schema=public'

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
if ($env:DATABASE_URL -notmatch '@127\.0\.0\.1:55432/') { throw 'Refusing non-disposable DATABASE_URL' }

$env:PORT = '5051'
$env:JWT_SECRET = 'smoke-only-jwt-secret-change-after-test'
$env:ENABLE_WORKERS = 'false'
$env:ENABLE_CRON = 'false'
$env:ENABLE_CRAWLERS = 'false'
$env:ENABLE_OUTREACH = 'false'
$env:QUEUE_USE_BULLMQ = 'false'
$env:AI_FEATURES_ENABLED = 'false'
$env:AI_CHAT_ENABLED = 'false'
$env:AI_PROFILE_ENABLED = 'false'
$env:AI_EMBEDDINGS_ENABLED = 'false'
$env:AI_OCR_ENABLED = 'false'
$env:AI_FRAUD_ENABLED = 'false'

npx prisma validate --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma

# Review the pending initial SQL before the next command.
Get-Content -LiteralPath 'prisma\migrations\00000000000000_init\migration.sql'

# This mutates only the disposable database asserted above.
npx prisma migrate deploy --schema prisma/schema.prisma
npm start
```

Wait for both `PostgreSQL connected through Prisma` and `Server running on port 5051` before proceeding.

### Terminal 2 — allowlisted probes

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

# Expected HTTP 401; curl itself may return a nonzero status with --fail.
curl.exe --include --request POST "$base/api/v1/admin/login" `
  --header 'Content-Type: application/json' `
  --data '{"email":"missing-smoke-admin@example.invalid","password":"not-a-real-password"}'

curl.exe --include "$base/api/auth/me"
```

Optional disposable write probes:

```powershell
curl.exe --fail-with-body --request POST "$base/api/public/newsletter/subscribe" `
  --header 'Content-Type: application/json' `
  --data '{"email":"postgres-smoke@example.invalid"}'

curl.exe --fail-with-body --request POST "$base/api/enquiry" `
  --header 'Content-Type: application/json' `
  --data '{"name":"Postgres Smoke","email":"postgres-smoke@example.invalid","message":"Disposable database smoke test"}'
```

Stop the Node process with Ctrl+C, then remove the disposable database:

```powershell
docker stop lucohire-pg-smoke
```

Do not use `prisma db push`, `prisma migrate dev`, any seed/import/Mongo migration command, or any route outside the allowlist during this first test.

## Offline check results

- Prisma validate: passed with an offline placeholder URL; no connection was made.
- Prisma generate: passed (`v6.19.1`).
- JavaScript syntax parse: 709 files passed.
- Tests: 45 passed, 0 failed.
- Full `git diff --check`: still reports pre-existing trailing whitespace in deferred `workers/candidateOutreach.worker.js` and `workers/crawlerWorker.js`.
