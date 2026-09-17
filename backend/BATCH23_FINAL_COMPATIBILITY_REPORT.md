# Batch 23: Final compatibility sweep and schema-risk report

## Scope and counting method

The runtime scan includes JavaScript/TypeScript under `backend/` and excludes `legacy-mongoose-models`, generated Prisma files, tests, archived code, and intentionally retained migration/seed/import/repair scripts. Commented-out imports are not counted.

- Compatibility-model imports: **282 occurrences in 89 files**
- Direct Mongoose imports in active runtime: **0 occurrences in 0 files**
- Ungated core HTTP compatibility paths found: **0**
- Database, startup, migration, seed, worker, crawler, AI, provider, or external-service commands run: **0**

The remaining count is deliberately non-zero: it represents deferred systems whose HTTP or background execution is disabled unless explicit operational flags are set.

## Batch 23 changes

- Made `ChatMessage.clientMessageId` nullable and removed its unsafe empty-string default. Chat persistence now writes `NULL` when the client does not provide an id, so PostgreSQL's `(conversationId, clientMessageId)` uniqueness no longer rejects multiple ordinary messages.
- Added bounded optimistic compare-and-retry updates for JSON-based provider and recruiter AI usage counters. This avoids the previous read/modify/write lost-update behavior without adding schema or business concepts.
- Converted small persistence-only leftovers in search, SEO settings, refunds, reports, automation task logs, provider subscription intelligence, account deletion, webhooks, job interaction, and job lookup code to direct Prisma.
- Added/strengthened default-off HTTP gates for AI admin/health, matching/search, wage AI, SEO automation, pipeline/freelancer, outreach/claim profile, payment webhooks, provider AI insights, and recruiter outreach analytics.
- Added `ENABLE_PAYMENT_PROVIDERS=false`, `ENABLE_WEBHOOKS=false`, and `ENABLE_WAGE_AI=false` to `.env.example`.
- Kept external profile-asset deletion disabled unless `ENABLE_EXTERNAL_PROFILE_ASSETS=true`.

### Changed files

- `backend/.env.example`
- `backend/BATCH23_FINAL_COMPATIBILITY_REPORT.md`
- `backend/prisma/schema.prisma`
- `backend/controllers/authController.js`
- `backend/controllers/jobController.js`
- `backend/controllers/jobInteractionController.js`
- `backend/controllers/refundController.js`
- `backend/controllers/reportsController.js`
- `backend/controllers/searchController.js`
- `backend/controllers/seoCommandController.js`
- `backend/middleware/aiUsage.js`
- `backend/middleware/recruiterAiUsage.js`
- `backend/modules/ai/services/chatHistory.service.js`
- `backend/routes/adminAIRoutes.js`
- `backend/routes/adminHealthRoutes.js`
- `backend/routes/adminRoutes.js`
- `backend/routes/claimProfileRoutes.js`
- `backend/routes/freelancer.routes.js`
- `backend/routes/providerRoutes.js`
- `backend/routes/recruiterRoutes.js`
- `backend/routes/searchRoutes.js`
- `backend/routes/wageEstimatorRoutes.js`
- `backend/routes/webhookRoutes.js`
- `backend/server.js`
- `backend/services/aiUsageCounterService.js`
- `backend/services/automationQueueService.js`
- `backend/services/providerIntelligenceService.js`
- `backend/tests/finalCompatibilitySweepBatch23.test.js`

## Remaining active/importable compatibility files

All files below are deferred and unavailable by default. Route modules may import their controllers, but the compatibility queries/external actions are behind route middleware, an early controller guard, or a startup gate.

### HTTP controllers and routes (24 files)

- `backend/controllers/adminAIController.js`
- `backend/controllers/adminCrawlerController.js`
- `backend/controllers/adminDataPipeline.controller.js`
- `backend/controllers/adminHealth.controller.js`
- `backend/controllers/adminOutreach.controller.js`
- `backend/controllers/adminScraperController.js`
- `backend/controllers/aiCoachController.js`
- `backend/controllers/candidateBenchmark.controller.js`
- `backend/controllers/candidateForms.controller.js`
- `backend/controllers/careerHealth.controller.js`
- `backend/controllers/claimProfile.controller.js`
- `backend/controllers/claimProfileController.js`
- `backend/controllers/freelancer.controller.js`
- `backend/controllers/growWithAI.controller.js`
- `backend/controllers/matchmakingController.js`
- `backend/controllers/pipeline.controller.js`
- `backend/controllers/providerAI.controller.js`
- `backend/controllers/providerJobsAIController.js`
- `backend/controllers/recruiterAiWorkspaceController.js`
- `backend/controllers/recruiterController.js` — mixed core controller; its 18 remaining imports are local to matching, AI, talent-pool, or outreach branches that guard before loading/using the wrappers.
- `backend/controllers/recruiterCopilot.controller.js`
- `backend/controllers/wageEstimatorController.js`
- `backend/routes/candidateReportRoutes.js`
- `backend/routes/recruiterAiRoutes.js`

These are controlled by one or more of `AI_FEATURES_ENABLED`, `AI_CHAT_ENABLED`, `AI_PROFILE_ENABLED`, `ENABLE_RECRUITER_AI`, `ENABLE_RECRUITER_MATCHING`, `ENABLE_PROVIDER_AI_INSIGHTS`, `ENABLE_PROVIDER_AI_JOBS`, `ENABLE_OUTREACH`, `ENABLE_COMMUNICATION_PROVIDERS`, `ENABLE_CRAWLERS`, `ENABLE_CONNECTORS`, `ENABLE_PIPELINE_JOBS`, `ENABLE_WAGE_AI`, or `ENABLE_SELF_HEALING`.

### Deferred architecture modules and services (50 files)

- `backend/modules/ai/controllers/ai.controller.js`
- `backend/modules/ai/services/chatHistory.service.js`
- `backend/modules/candidateSourcing/csvImport.service.js`
- `backend/modules/candidateSourcing/dedupe.service.js`
- `backend/modules/candidateSourcing/smartRun.service.js`
- `backend/modules/connectors/BaseConnector.js`
- `backend/modules/connectors/types/adzuna.connector.js`
- `backend/modules/connectors/types/contact_enricher.connector.js`
- `backend/modules/connectors/types/customCrawler.connector.js`
- `backend/modules/connectors/types/greenhouse.connector.js`
- `backend/modules/connectors/types/mca_india.connector.js`
- `backend/modules/connectors/types/ycombinator.connector.js`
- `backend/modules/externalJobs/externalJob.controller.js`
- `backend/modules/jobMatching/matching.controller.js`
- `backend/modules/jobMatching/matching.service.js`
- `backend/modules/jobSources/jobSource.controller.js`
- `backend/modules/jobSources/syncRunner.js`
- `backend/modules/queue/job.handlers.js`
- `backend/modules/recruiterIntelligence/recruiterLeads.controller.js`
- `backend/modules/seoAutomation/seo.service.js`
- `backend/modules/smartScraper/rule-engine/index.js`
- `backend/modules/smartScraper/selector-cache/index.js`
- `backend/modules/syncEngine/syncEngine.service.js`
- `backend/services/ai/aiPipelineService.js`
- `backend/services/ai/anthropicService.js`
- `backend/services/ai/autoAnalyzer.js`
- `backend/services/ai/embeddingsService.js`
- `backend/services/ai/llmService.js`
- `backend/services/ai/providerChatService.js`
- `backend/services/ai/providerProfileService.js`
- `backend/services/ai/recruiterCopilot.service.js`
- `backend/services/ai/vectorSearchService.js`
- `backend/services/ai/visionOcrService.js`
- `backend/services/apifyScraper.service.js`
- `backend/services/demandSpikeService.js`
- `backend/services/fraudRulesService.js`
- `backend/services/matchWeightService.js`
- `backend/services/pipeline/batchImportService.js`
- `backend/services/pipeline/canonicalJobSelectionService.js`
- `backend/services/pipeline/categoryClassifierService.js`
- `backend/services/pipeline/jobAnalyticsService.js`
- `backend/services/pipeline/jobDeduplicationService.js`
- `backend/services/pipeline/jobNormalizationService.js`
- `backend/services/pipeline/jsearchScanService.js`
- `backend/services/pipeline/queryGenerationService.js`
- `backend/services/pipelineCron.service.js`
- `backend/services/providerAIOrchestrationService.js`
- `backend/services/providerRankingService.js`
- `backend/services/searchIntentService.js`
- `backend/services/trustScoreService.js`

These need separate AI/vector, crawler/connector, job-source, matching, or pipeline architecture work. They should not be enabled for the disposable PostgreSQL smoke test.

### Background cron/job/worker files (15 files)

- `backend/cron/recruiterUsageCron.js`
- `backend/cron/subscriptionCron.js`
- `backend/jobs/batchScraper.cron.js`
- `backend/jobs/candidateDigest.cron.js`
- `backend/jobs/nightlyScraper.cron.js`
- `backend/jobs/outreach.cron.js`
- `backend/jobs/seoScanner.cron.js`
- `backend/utils/cronJobs.js`
- `backend/workers/candidateDigest.worker.js`
- `backend/workers/candidateOutreach.worker.js`
- `backend/workers/candidateRescan.worker.js`
- `backend/workers/crawlerWorker.js`
- `backend/workers/homepageMetrics.worker.js`
- `backend/workers/jobScraper.js`
- `backend/workers/nightlyScraper.worker.js`

`server.js` loads/starts these only inside explicit `ENABLE_WORKERS`, `ENABLE_CRON`, `ENABLE_CRAWLERS`, `ENABLE_OUTREACH`, connector/pipeline, communication, matching, and AI checks. Their dedicated npm worker commands remain intentionally explicit operator actions and must not be used in the smoke test.

## MongoDB migration/seed/import files intentionally retained

These scripts directly reference `backend/legacy-mongoose-models` and were not changed or run:

- `backend/scripts/backfillHashes.js`
- `backend/scripts/importGeoNames.js`
- `backend/scripts/migrateApprovalStatus.js`
- `backend/scripts/migrateReferralCodes.js`
- `backend/scripts/seed100UsersAndJobs.js`
- `backend/scripts/seedDataSources.js`
- `backend/scripts/seedExternalJobsSystem.js`
- `backend/scripts/seedFreeRecruiterPlan.js`
- `backend/scripts/seedPlans.js`
- `backend/scripts/seedProviderPlans.js`
- `backend/scripts/seedRecruiterPlans.js`
- `backend/scripts/seedReferralSettings.js`
- `backend/scripts/sourceSeeder.js`

Schema-generation utilities also inspect the legacy schema directory by design. Other excluded old scripts that still import compatibility wrappers should remain excluded from runtime and be reviewed separately before any data migration exercise.

## Schema risk disposition

### Fixed

1. **Chat message idempotency key:** nullable `clientMessageId` plus `NULL` writes removes the blank/default composite-unique collision.
2. **JSON AI usage counter concurrency:** bounded optimistic updates now compare `updatedAt` and retry on contention.

### Still requires design

1. **Prompt template duplicate contracts:** `key`/`feature_name`, `isActive`/`is_active`, and `template`/`prompt_template` coexist. Choosing canonical fields requires an API/data-migration decision; no fields were removed.
2. **Embedding storage/indexing:** embeddings remain JSON/array-like data without pgvector types, distance operators, or vector indexes. Select the PostgreSQL extension, dimensions, index method, and fallback behavior before enabling semantic search.
3. **AI counter shape:** optimistic retries make current JSON writes safe enough for disabled/low-volume operation, but normalized rows or dedicated numeric columns would be preferable for high-contention accounting and reporting.
4. **Generated Mongo-era schema semantics:** string ids remain intentional for staged migration. Foreign-key/delete behavior and JSON-heavy legacy structures still need validation against representative migrated data before production.

## Readiness conclusion

- **HTTP startup safety:** yes, for the core API with every optional flag left false. This is based on static import/gate inspection; app startup was not run.
- **Disposable PostgreSQL smoke-test expansion:** yes, core auth/user/admin, recruiter/company, provider/profile, jobs, applications, audit, billing persistence, notifications, referrals/partners, profile review, and public Prisma-backed reads can expand beyond the old narrow allowlist. Continue excluding every deferred AI, matching, crawler, connector, sync, pipeline, outreach, webhook, payment-provider, communication-provider, worker, and cron route.
- **Production readiness:** no. A disposable empty-schema smoke test is the next appropriate stage; representative data migration, deferred systems, vector design, and production migration/rollback planning remain outstanding.

## Verification

- Prisma schema validation: passed
- Prisma client generation: passed
- JavaScript syntax checks for all Batch 23 changed runtime files: passed
- Full backend tests: 71 passed, 0 failed (including 4 Batch 23 focused tests)
- Scoped Batch 23 `git diff --check`: passed (line-ending warnings only)
- Full-worktree `git diff --check`: still reports pre-existing trailing whitespace in `backend/workers/crawlerWorker.js`; Batch 23 did not modify that deferred crawler file.
- Commit created: no
