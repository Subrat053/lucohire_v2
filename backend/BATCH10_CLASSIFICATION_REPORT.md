# Batch 10 remaining persistence classification

Generated from the current working tree. This report excludes `backend/legacy-mongoose-models` from runtime classification. No database, crawler, worker, AI, webhook, seed, import, repair, migration, or external-provider operation was executed.

## Category A — converted now

| File path | Model used | Usage type | Category | Recommended action | Risk |
|---|---|---|---|---|---|
| `backend/controllers/supportController.js` | SupportTicket | API CRUD/listing | A | Converted to direct Prisma | Low |
| `backend/middleware/featureFlag.js` | FeatureFlag, AdminSetting | request-time feature lookup | A | Converted to direct Prisma | Low |
| `backend/middleware/idempotency.js` | AutomationTaskLog | request-time idempotency lookup | A | Converted to direct Prisma | Low |
| `backend/routes/autocompleteRoutes.js` | GeoNamesCity | public fallback search | A | Converted to direct Prisma | Low |
| `backend/routes/faqRoutes.js` | Faq | public FAQ CRUD | A | Converted to direct Prisma | Low |
| `backend/routes/profileShareRoutes.js` | ProfileShareToken | share-token CRUD/counter | A | Converted to direct Prisma | Low |

## Category B — retain for migration

| File path | Model used | Usage type | Category | Recommended action | Risk |
|---|---|---|---|---|---|
| `backend/migrate-db.js` | migration orchestrator / source data | migration-only | B | Keep for later controlled data migration; review before execution | High |
| `backend/scripts/backfillHashes.js` | Mongoose + User source records | migration-only | B | Keep for data reconciliation; never run against production without review | High |
| `backend/scripts/generatePrismaModelFiles.js` | Mongoose schema metadata | schema conversion tooling | B | Keep until migration and compatibility removal are complete | Medium |
| `backend/scripts/generatePrismaSchema.js` | Mongoose schema metadata | schema conversion tooling | B | Keep until migration and schema reconciliation are complete | Medium |
| `backend/scripts/migrateAdmins.js` | User, Admin | migration-only | B | Keep for later controlled data migration | High |
| `backend/scripts/migrateApprovalStatus.js` | Mongoose, User, ProviderProfile, RecruiterProfile | migration-only | B | Keep for later controlled data migration | High |
| `backend/scripts/migrateReferralCodes.js` | Mongoose, User | migration-only | B | Keep for later controlled data migration | High |
| `backend/utils/migratePlansAndSubscriptions.js` | Plan, User, UserSubscription, ProviderProfile, RecruiterProfile, AdminSetting | migration-only | B | Keep for later controlled data migration | High |
| `backend/utils/migrateReviews.js` | Review, Lead | migration-only | B | Keep for later controlled data migration | High |
| `backend/utils/migrateUserRoles.js` | User, UserSubscription | migration-only | B | Keep for later controlled data migration | High |

## Category C — archive as non-runtime legacy

| File path | Model used | Usage type | Category | Recommended action | Risk |
|---|---|---|---|---|---|
| `backend/scripts/fixImages.js` | Mongoose raw database | repair script | C | Archive as legacy; replace only if a PostgreSQL repair is later required | High |
| `backend/scripts/importGeoNames.js` | Mongoose, GeoNamesCity | one-off import | C | Archive as legacy; create a reviewed Prisma importer later | High |
| `backend/scripts/removeGst.js` | Mongoose raw database | repair script | C | Archive as legacy after manual approval | High |
| `backend/scripts/seed100UsersAndJobs.js` | Mongoose, User, ProviderProfile, JobPost | development seed | C | Archive as legacy; do not reuse for PostgreSQL | High |
| `backend/scripts/seedDataSources.js` | Mongoose, DataSourceConfig | development seed | C | Archive as legacy; recreate explicitly for Prisma if needed | Medium |
| `backend/scripts/seedExternalJobsSystem.js` | Mongoose, CountryConfig, JobSourceConfig | development seed | C | Archive as legacy; recreate explicitly for Prisma if needed | Medium |
| `backend/scripts/seedFreeRecruiterPlan.js` | Mongoose, Plan | development seed | C | Archive as legacy | Medium |
| `backend/scripts/seedPlans.js` | Mongoose, Plan | development seed | C | Archive as legacy | Medium |
| `backend/scripts/seedProviderPlans.js` | Mongoose, Plan | development seed | C | Archive as legacy | Medium |
| `backend/scripts/seedRecruiterPlans.js` | Mongoose, Plan | development seed | C | Archive as legacy | Medium |
| `backend/scripts/seedReferralSettings.js` | Mongoose, AdminSetting | development seed | C | Archive as legacy; path is also currently suspect | Medium |
| `backend/scripts/sourceSeeder.js` | Mongoose, source configuration | development seed | C | Archive as legacy | Medium |
| `backend/seed.js` | Plan | legacy seed entry point | C | Archive as legacy | Medium |
| `backend/seed-free-plan.js` | Plan | legacy seed entry point | C | Archive as legacy | Medium |
| `backend/utils/seed.js` | User, ProviderProfile, RecruiterProfile, Plan, AdminSetting, JobPost | legacy seed utility | C | Archive as legacy | Medium |
| `backend/utils/seedFreshState.js` | multiple runtime models | destructive development seed | C | Archive as legacy; do not run | High |
| `backend/utils/seedPlans.js` | Plan | legacy seed utility | C | Archive as legacy | Medium |
| `backend/utils/seedProviderVisibilityPlans.js` | Plan | legacy seed utility | C | Archive as legacy | Medium |
| `backend/utils/seedSkills.js` | SkillCategory | legacy seed utility | C | Archive as legacy | Medium |

## Category D — separate subsystem design required

| File path | Model used | Usage type | Category | Recommended action | Risk |
|---|---|---|---|---|---|
| `backend/controllers/adminAIController.js` | AdminSetting, AiAnalysisResult, AIPromptTemplate, AIUsageLog, DemandSnapshot, DocumentVerificationResult, FraudFlag, SkillSynonym | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/adminCrawlerController.js` | AdminSetting, CrawlerBatch, ExternalJob | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/adminDataPipeline.controller.js` | CountryConfig, DataSourceConfig, IngestionSettings, PipelineAutomation, StagingCandidate | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/adminOutreach.controller.js` | ProviderProfile, User | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/adminScraperController.js` | StagingCandidate | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/aiCoachController.js` | ProviderProfile, User | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/candidateBenchmark.controller.js` | ProviderProfile | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/careerHealth.controller.js` | ProviderProfile | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/claimProfile.controller.js` | StagingCandidate, User | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/claimProfileController.js` | StagingCandidate, User | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/growWithAI.controller.js` | IncomePathCache, JobPost, ProviderProfile, StagingCandidate | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/matchmakingController.js` | CandidateJobMatch, CountryConfig, ExternalJob, ProviderProfile | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/pipeline.controller.js` | JobPost, pipeline/Category, pipeline/CategorySuggestion, pipeline/CompanyAliasSuggestion, pipeline/CompanyMaster, pipeline/CountryPipelineConfig, pipeline/DuplicateGroup, pipeline/JobAnalyticsMetric, pipeline/JSearchScanRun, pipeline/LocationMaster, pipeline/PipelineAuditLog, pipeline/RawJobImport, pipeline/SourceConfidence | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/providerAI.controller.js` | JobPost, ProviderAiUsage, ProviderProfile, ProviderSubscription, User | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/providerJobsAIController.js` | JobPost, ProviderProfile, ProviderSubscription, User | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/recruiterAIUsage.controller.js` | RecruiterAiUsage, UserSubscription | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/recruiterAiWorkspaceController.js` | WorkspaceChat | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/seoCommandController.js` | AdminSetting | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/controllers/wageEstimatorController.js` | JobPost, WageEstimateCache | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/cron/recruiterUsageCron.js` | RecruiterProfile, RecruiterSubscription | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/cron/subscriptionCron.js` | ProviderProfile, ProviderSubscription | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/jobs/batchScraper.cron.js` | AdminSetting, JobPost, StagingCandidate | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/jobs/candidateDigest.cron.js` | User | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/jobs/nightlyScraper.cron.js` | AdminSetting, CompanySource, ExternalJob | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/jobs/outreach.cron.js` | StagingCandidate | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/jobs/seoScanner.cron.js` | AdminSetting, JobPost, User | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/middleware/aiUsage.js` | Plan, ProviderAiUsage, ProviderSubscription, User | request-time guard | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/middleware/recruiterAiUsage.js` | Plan, RecruiterAiUsage, User, UserSubscription | request-time guard | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/ai/config/ai.config.js` | AdminSetting | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/ai/controllers/ai.controller.js` | ProviderProfile, ProviderUsage | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/ai/services/chatHistory.service.js` | ChatConversation, ChatMessage | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/candidateSourcing/csvImport.service.js` | SourceConnector, SourceRunLog | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/candidateSourcing/dedupe.service.js` | StagingCandidate, User | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/candidateSourcing/smartRun.service.js` | CandidateActivityLog, SourceConnector, SourceRunLog, StagingCandidate | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/companySources/companySource.controller.js` | JobPost | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/companySources/discovery.service.js` | CountryConfig | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/connectors/BaseConnector.js` | CompanySource, RecruiterLead, SyncLog | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/connectors/types/adzuna.connector.js` | JobPost | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/connectors/types/contact_enricher.connector.js` | CompanyContact | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/connectors/types/customCrawler.connector.js` | JobPost, RecruiterLead | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/connectors/types/greenhouse.connector.js` | CompanyMaster, JobPost | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/connectors/types/mca_india.connector.js` | CompanyMaster | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/connectors/types/ycombinator.connector.js` | CompanyMaster | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/externalJobs/externalJob.controller.js` | CountryConfig, JobPost | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/jobMatching/matching.controller.js` | CandidateJobMatch, JobPost | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/jobMatching/matching.service.js` | CandidateJobMatch, CountryConfig, JobPost, ProviderProfile, User | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/jobSources/jobSource.controller.js` | JobSourceConfig | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/jobSources/syncRunner.js` | ExternalJob, JobSourceConfig | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/queue/job.handlers.js` | AiEvaluation, JobPost, ProviderProfile | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/recruiterIntelligence/recruiterLeads.controller.js` | ProviderProfile, RecruiterLead, RecruiterProfile, User | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/seoAutomation/seo.service.js` | CountryConfig, JobPost, SeoMeta, SeoPage | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/smartScraper/rule-engine/index.js` | LearnedSelector | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/modules/smartScraper/selector-cache/index.js` | LearnedSelector, ScraperCache | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/routes/candidateReportRoutes.js` | AIUsageLog, JobPost, ProviderProfile, SkillGapReport | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/routes/recruiterAiRoutes.js` | AIUsageLog, JobPost, ProviderProfile, User, WageEstimateCache | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/routes/seoRoutes.js` | CountryConfig, JobPost, SeoMeta, SeoPage | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/aiPipelineService.js` | AiAnalysisResult, AIPromptTemplate, AIUsageLog, ProviderProfile, RecruiterProfile | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/anthropicService.js` | AIInteractionLog, AIUsageLog | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/autoAnalyzer.js` | ProviderAiUsage, ProviderProfile, ProviderSubscription | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/embeddingsService.js` | AIUsageLog | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/llmService.js` | AIPromptTemplate, AIUsageLog | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/promptTemplateService.js` | AIPromptTemplate | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/providerChatService.js` | AIChatCache | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/providerProfileService.js` | ProviderAIProfile | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/recruiterCopilot.service.js` | AIPromptTemplate | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/resumeCache.service.js` | ResumeFileCache | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/vectorSearchService.js` | ProviderEmbedding, RecruiterHireEmbedding | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/ai/visionOcrService.js` | DocumentVerificationResult, ProviderProfile | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/apifyScraper.service.js` | AdminSetting, DataSourceConfig | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/demandSpikeService.js` | BoostSuggestion, DemandSnapshot, JobSearchIntent, ProviderProfile | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/fraudRulesService.js` | AdminSetting, FraudFlag, Lead, ProviderProfile, User | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/leadDistributionService.js` | JobPost, Lead, LeadDistributionLog, ProviderMetrics, User | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/matchWeightService.js` | AdminSetting | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/pipeline/batchImportService.js` | ImportBatch, ProviderProfile, RecruiterProfile, User | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/pipeline/canonicalJobSelectionService.js` | JobPost, pipeline/DuplicateGroup, pipeline/JobSourceVersion | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/pipeline/categoryClassifierService.js` | pipeline/Category, pipeline/CategorySuggestion, pipeline/PipelineAuditLog | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/pipeline/jobAnalyticsService.js` | pipeline/JobAnalyticsEvent, pipeline/JobAnalyticsMetric | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/pipeline/jobDeduplicationService.js` | JobPost, pipeline/DuplicateGroup, pipeline/JobSourceVersion | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/pipeline/jobNormalizationService.js` | pipeline/CompanyAliasSuggestion, pipeline/CompanyMaster, pipeline/LocationMaster | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/pipeline/jsearchScanService.js` | JobPost, pipeline/CountryPipelineConfig, pipeline/DuplicateGroup, pipeline/JobSourceVersion, pipeline/JSearchScanRun, pipeline/PipelineAuditLog, pipeline/RawJobImport | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/pipeline/queryGenerationService.js` | pipeline/CountryPipelineConfig, pipeline/QuerySeedHistory | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/pipelineCron.service.js` | PipelineAutomation | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/providerAIOrchestrationService.js` | JobPost, ProviderAIProfile, ProviderEmbedding, ProviderProfile, RecruiterHireEmbedding | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/providerIntelligenceService.js` | ProviderSubscription | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/providerRankingService.js` | ProviderAvailability, ProviderMetrics, ProviderProfile, ProviderSubscription, RepeatHireInsight, SkillCategory, UserSubscription | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/searchIntentService.js` | FeatureFlag, JobSearchIntent, SkillCategory, SkillSynonym | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/SeoEngineService.js` | JobPost, SeoMeta, SeoPage | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/services/trustScoreService.js` | AdminSetting, FraudFlag, ProviderMetrics, ProviderProfile, TrustScore | runtime service persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/utils/aiResolution.js` | ProviderProfile, ResumeFileCache | active API persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/utils/cronJobs.js` | JobPost, MatchLog, ProviderEmbedding, ProviderProfile, RecruiterHireEmbedding, RecruiterProfile, RotationPool, User, UserSubscription | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/workers/candidateDigest.worker.js` | CandidateJobMatch, CountryConfig, JobPost, ProviderProfile, User | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/workers/candidateOutreach.worker.js` | CandidateActivityLog, StagingCandidate | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/workers/candidateRescan.worker.js` | CandidateCareerVersion, DataSourceConfig, ProviderProfile, SystemCostLog | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/workers/crawlerWorker.js` | CompanySource, CrawlerBatch, ExternalJob | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/workers/homepageMetrics.worker.js` | JobPost, ProviderProfile, User | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/workers/jobScraper.js` | JobPost, ProviderProfile | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |
| `backend/workers/nightlyScraper.worker.js` | CompanySource, ExternalJob | background job persistence | D | Design and convert as a dedicated subsystem; do not mechanically rewrite | High |

## Category E — later conversion/removal after approval

| File path | Model used | Usage type | Category | Recommended action | Risk |
|---|---|---|---|---|---|
| `backend/controllers/adminController.js` | AdminSetting, CountryConfig, ExternalJob, FeatureFlag, ImportBatch, Lead, RecruiterLead, Review, RotationPool, SyncLog, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/adminHealth.controller.js` | AiAnalysisResult, AiFeatureControl, AIUsageLog, JobPost, ProviderProfile | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/adminPartnerController.js` | CandidateJobMatch, DocumentVerificationResult, FraudFlag, JobMatch, JobPost, MatchLog, SourceRunLog, SupportTicket, SyncLog, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/adminRegistryController.js` | ExternalJob | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/authController.js` | ChatConversation, ChatMessage, JobMatch, MatchLog, ProviderAIProfile, ProviderEmbedding, Review | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/candidateForms.controller.js` | SourceConnector | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/candidateViewController.js` | RecruiterProfile, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/enquiryController.js` | Enquiry | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/freelancer.controller.js` | pipeline/FreelancerContactConsentRequest, pipeline/PipelineAuditLog | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/guestOtpController.js` | User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/jobController.js` | ExternalJob, JobPost | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/jobInteractionController.js` | AiEvaluation, CandidateJobMatch, CountryConfig, ExternalJob, Lead, RecruiterLeadTracker, RecruiterProfile, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/profileController.js` | Review | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/profileReviewController.js` | PartnerProfile, ProviderProfile, RecruiterProfile, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/providerController.js` | DocumentVerificationResult, JobPost, Lead, ProviderMetrics, ProviderProfile, Review, RotationPool, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/providerWalletController.js` | Enquiry, ProviderProfile, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/recruiterController.js` | AdminSetting, AiEvaluation, JobMatch, JobPost, Lead, OutreachCampaign, Plan, ProviderProfile, RecruiterAiUsage, Review, RotationPool, Task, User, UserSubscription | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/recruiterCopilot.controller.js` | ProviderProfile, RecruiterProfile | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/recruiterDiscoveryController.js` | RecruiterProfile, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/refundController.js` | ProviderAiUsage | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/reportsController.js` | AiEvaluation, OutreachCampaign | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/resumeParserController.js` | ProviderProfile | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/resumeToolkit.controller.js` | ProviderProfile | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/reviewController.js` | Review, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/searchController.js` | AdminSetting, RepeatHireInsight, TrustScore | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/selfHealingController.js` | JobPost, pipeline/PipelineAuditLog | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/sitemapController.js` | JobPost, ProviderProfile, RecruiterProfile, SeoPage, SkillCategory, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/controllers/unlockProfileController.js` | User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/middleware/duplicateValidator.js` | User | request-time guard | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/middleware/providerApproval.js` | ProviderProfile, User | request-time guard | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/middleware/recruiterApproval.js` | RecruiterProfile, User | request-time guard | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/modules/syncEngine/syncEngine.service.js` | CompanySource, CountryConfig, JobPost, JobSourceConfig, RecruiterLead, SyncLog | runtime service persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/modules/syncEngine/syncLogs.controller.js` | CompanyContact, CompanyMaster, CompanySource, JobPost, JobSourceConfig, SyncLog | runtime service persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/routes/adminRoutes.js` | Lead, ProviderProfile | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/routes/jobRoutes.js` | User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/routes/webhookRoutes.js` | User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/server.js` | AdminSetting, NewsletterSubscriber, SkillCategory, User | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/services/automationQueueService.js` | AutomationTaskLog | runtime service persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/services/cityGeo.service.js` | CityGeo | runtime service persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/services/eventLogService.js` | AutomationTaskLog, LeadEvent | runtime service persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/services/googleTranslate.service.js` | TranslationCache | runtime service persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/services/locationService.js` | Location | runtime service persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/services/reviewService.js` | Lead, ProviderProfile, RecruiterProfile, Review, User | runtime service persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/services/translateService.js` | TranslationCache | runtime service persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/utils/cloudinary.js` | AdminSetting | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |
| `backend/utils/subscriptionHelper.js` | ProviderProfile, RecruiterProfile | active API persistence | E | Convert in a focused follow-up, then remove the compatibility import | Medium |

## Direct Mongoose usage

- Active runtime imports/calls outside legacy models: **none found**.
- Direct Mongoose remains in Category B/C scripts and in `backend/legacy-mongoose-models` by design.
- The `mongoose` packages remain installed and should be removed only after migration tooling and legacy schema generation are retired with manual approval.

