# Batch 21 Pipeline Isolation Report

This report covers active sync-engine, connector, crawler, scraper, and pipeline code. No migration-only file was changed or classified as an active pipeline dependency.

## Category A — safe direct Prisma conversion

| File | Persistence | Action |
|---|---|---|
| `backend/controllers/adminRegistryController.js` | `CompanyMaster`, `CompanySource`, `ExternalJob` | Completed direct Prisma reads/writes; crawler execution is gated. |
| `backend/controllers/selfHealingController.js` | `JobPost`, `PipelineAuditLog` | Completed direct Prisma read/fix/undo flow; all handlers are gated. |
| `backend/modules/companySources/companySource.controller.js` | `CompanySource`, `JobPost` | CRUD was already Prisma; live-scrape job persistence converted and execution gated. |
| `backend/modules/companySources/discovery.service.js` | `CountryConfig`, `CompanySource` | Remaining country lookup converted; external discovery is gated. |
| `backend/modules/syncEngine/syncLogs.controller.js` | `SyncLog`, `JobPost`, `JobSourceConfig`, `CompanySource`, `CompanyMaster`, `CompanyContact` | Reporting and trigger preflight persistence converted; trigger functions lazy-load the legacy engine only after gates pass. |
| `backend/controllers/recruiterDiscoveryController.js` | `User`, recruiter profile, subscription and OTP audit helpers | Already direct Prisma/helper based; no crawler/pipeline conversion required. |

## Category B — must remain for MongoDB data migration

None in this active runtime scope. MongoDB-to-PostgreSQL migration/import scripts remain outside Batch 21 and were not touched.

## Category C — defer for crawler/pipeline architecture design

| File | Compatibility models | Reason |
|---|---|---|
| `backend/controllers/adminCrawlerController.js` | `ExternalJob`, `AdminSetting`, `CrawlerBatch` | Mixed admin CRUD, queue dispatch, scraping and external execution. |
| `backend/controllers/adminDataPipeline.controller.js` | `DataSourceConfig`, `PipelineAutomation`, `StagingCandidate`, `IngestionSettings`, `CountryConfig` | Large ingestion/orchestration controller with connectors and AI branches. |
| `backend/controllers/adminScraperController.js` | `StagingCandidate` | Coupled to staging/import workflow. |
| `backend/controllers/pipeline.controller.js` | Pipeline config, scan, raw import, job, audit, category, company, location, confidence, duplicate and analytics models | Full pipeline API requires a coordinated persistence redesign. |
| `backend/jobs/batchScraper.cron.js` | `JobPost`, `AdminSetting`, `StagingCandidate` | Scheduled scraper/import workflow. |
| `backend/jobs/nightlyScraper.cron.js` | `CompanySource`, `AdminSetting`, `ExternalJob` | Scheduled external scraping workflow. |
| `backend/modules/connectors/BaseConnector.js` | `SyncLog`, `CompanySource`, `RecruiterLead` | Shared mutation lifecycle for every connector; now default-gated. |
| `backend/modules/connectors/types/adzuna.connector.js` | `JobPost` | External connector-specific fetch/upsert semantics. |
| `backend/modules/connectors/types/contact_enricher.connector.js` | `CompanyContact` | External enrichment workflow. |
| `backend/modules/connectors/types/customCrawler.connector.js` | `JobPost`, `RecruiterLead` | Scraper and lead extraction workflow. |
| `backend/modules/connectors/types/greenhouse.connector.js` | `JobPost`, `CompanyMaster` | External ATS fetch and multi-model upsert. |
| `backend/modules/connectors/types/mca_india.connector.js` | `CompanyMaster` | External registry connector. |
| `backend/modules/connectors/types/ycombinator.connector.js` | `CompanyMaster` | External registry connector. |
| `backend/modules/smartScraper/rule-engine/index.js` | `LearnedSelector` | Scraper learning/cache design. |
| `backend/modules/smartScraper/selector-cache/index.js` | `ScraperCache`, `LearnedSelector` | Scraper cache lifecycle. |
| `backend/modules/syncEngine/syncEngine.service.js` | `CountryConfig`, `JobSourceConfig`, `CompanySource`, `JobPost`, `SyncLog`, `RecruiterLead` | Large multi-connector engine with cleanup, SEO and matching side effects; now default-gated. |
| `backend/services/apifyScraper.service.js` | `AdminSetting`, `DataSourceConfig` | External Apify integration. |
| `backend/services/pipeline/batchImportService.js` | `ImportBatch`, `User`, `ProviderProfile`, `RecruiterProfile` | Large import and profile-creation transaction design. |
| `backend/services/pipeline/canonicalJobSelectionService.js` | `JobPost`, `JobSourceVersion`, `DuplicateGroup` | Coupled canonicalization workflow. |
| `backend/services/pipeline/categoryClassifierService.js` | `Category`, `CategorySuggestion`, `PipelineAuditLog` | Pipeline classification/review workflow. |
| `backend/services/pipeline/jobAnalyticsService.js` | `JobAnalyticsEvent`, `JobAnalyticsMetric` | Aggregation and metric-update workflow. |
| `backend/services/pipeline/jobDeduplicationService.js` | `JobPost`, `JobSourceVersion`, `DuplicateGroup` | Cross-model deduplication workflow. |
| `backend/services/pipeline/jobNormalizationService.js` | `CompanyMaster`, `CompanyAliasSuggestion`, `LocationMaster` | Master-data normalization workflow. |
| `backend/services/pipeline/jsearchScanService.js` | `JSearchScanRun`, `RawJobImport`, `JobPost`, `PipelineAuditLog`, `JobSourceVersion`, `DuplicateGroup`, `CountryPipelineConfig` | External scan and publication orchestration. |
| `backend/services/pipeline/queryGenerationService.js` | `CountryPipelineConfig`, `QuerySeedHistory` | Query scheduling/history workflow. |
| `backend/services/pipelineCron.service.js` | `PipelineAutomation` | Scheduler and controller orchestration; now default-gated. |
| `backend/workers/crawlerWorker.js` | `CrawlerBatch`, `CompanySource`, `ExternalJob` | Queue worker with scraping side effects. |
| `backend/workers/jobScraper.js` | `JobPost`, `ProviderProfile` | Scheduled scraper/matching worker. |
| `backend/workers/nightlyScraper.worker.js` | `CompanySource`, `ExternalJob` | Nightly external scraper worker. |

## Category D — gate from startup/runtime

| File | Gate applied |
|---|---|
| `backend/server.js` | Pipeline schedulers require pipeline-jobs, connectors and cron flags; crawler workers retain crawler/worker gates. |
| `backend/utils/cronJobs.js` | Sync callbacks require sync/connector flags and lazy-load the sync engine; crawler sync also requires the crawler flag. |
| `backend/cron/pipelineCron.js` | Refuses initialization unless pipeline jobs, connectors and cron are enabled. |
| `backend/services/pipelineCron.service.js` | Refuses initialization unless pipeline jobs, connectors and cron are enabled, and refuses processing unless pipeline jobs remain enabled. |
| `backend/modules/syncEngine/syncEngine.service.js` | Public engine entry points return before persistence or connector calls unless sync and connector flags are enabled. |
| `backend/modules/syncEngine/customScraper.js` | Exported scraper entry points throw before external work unless crawlers are enabled. |
| `backend/modules/connectors/BaseConnector.js` | Connector `run()` returns before logging/fetching unless connectors are enabled. |
| `backend/routes/pipeline.routes.js` | Entire legacy pipeline API is disabled unless pipeline jobs and connectors are enabled. |
| `backend/routes/adminDataPipeline.routes.js` | Entire ingestion/automation API is disabled unless pipeline jobs and connectors are enabled. |
| `backend/modules/syncEngine/syncLogs.routes.js` | Execution/retry routes require sync and connector flags; read-only reports remain available. |
| `backend/modules/companySources/companySource.routes.js` | Discovery/live-test routes require crawler and connector flags; metadata CRUD remains available. |
| `backend/routes/adminRoutes.js` | Self-healing, crawler execution and registry sync endpoints have explicit operational gates. |

## Remaining counts

- Compatibility-model import files in the audited active pipeline scope: **29**
- Files using Mongoose-style model APIs in that scope: **25**
- Direct `require('mongoose')` imports in that scope: **0**

These remaining files are isolated, not approved for PostgreSQL runtime execution, and should be migrated together in a separately designed crawler/pipeline batch.
