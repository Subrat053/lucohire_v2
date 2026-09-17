# Batch 22 AI, Matching, Outreach, and Sourcing Isolation

## Result

AI, chat, profile generation, OCR, embeddings, recruiter AI, matching, provider AI insights/jobs, job-expiry prediction, outreach, candidate digests, and AI-adjacent worker entry points are disabled unless their explicit environment flags are `true`. HTTP route imports do not start workers, cron jobs, queues, outreach, or provider calls.

No AI, embedding, OCR, outreach, communication, crawler, scraper, connector, sync, pipeline, payment, webhook, database, migration, seed, or application-startup command was run.

## Category A — converted now

| File | Persistence converted | Result |
|---|---|---|
| `backend/services/ai/promptTemplateService.js` | `AIPromptTemplate` active-template lookup | Direct `prisma.aIPromptTemplate.findFirst` |
| `backend/modules/ai/config/ai.config.js` | `AdminSetting` feature lookup | Direct `prisma.adminSetting.findUnique`; environment flags are authoritative and default off |
| `backend/controllers/recruiterAIUsage.controller.js` | Active subscription, plan, and recruiter usage reads | Direct Prisma, same response keys |
| `backend/middleware/recruiterAiUsage.js` | Recruiter subscription/plan/usage read-create-update | Direct Prisma with temporary `_id` aliases on middleware data |
| `backend/middleware/aiUsage.js` | Provider subscription/plan/usage read-create-update | Direct Prisma with temporary `_id` aliases on middleware data |

## Remaining compatibility classification

Each file has one primary classification: **B** requires separate AI/ranking architecture work; **C** must remain disabled from runtime; **D** depends on an external AI, OCR, embedding, scraping, or communication provider and must stay gated.

| File | Category | Recommended action |
|---|---:|---|
| `backend/controllers/adminAIController.js` | B | Split persistence dashboards from AI re-run/OCR/fraud operations before conversion; re-run/OCR/fraud routes are gated |
| `backend/controllers/adminOutreach.controller.js` | C | Keep disabled; redesign queue and provider delivery boundaries |
| `backend/controllers/aiCoachController.js` | D | Redesign coach state and LLM boundary before Prisma conversion |
| `backend/controllers/candidateBenchmark.controller.js` | B | Define benchmark/ranking query semantics first |
| `backend/controllers/candidateForms.controller.js` | C | Keep candidate-sourcing ingestion disabled until its staging design is approved |
| `backend/controllers/claimProfile.controller.js` | C | Keep coupled staging/claim workflow deferred |
| `backend/controllers/claimProfileController.js` | C | Consolidate duplicate claim workflow before conversion |
| `backend/controllers/growWithAI.controller.js` | D | Separate cached persistence from model execution |
| `backend/controllers/matchmakingController.js` | B | Redesign internal/external matching and scraping branches; routes are gated |
| `backend/controllers/providerAI.controller.js` | D | Split chat/profile generation from usage and cache persistence; routes are gated |
| `backend/controllers/providerJobsAIController.js` | D | Keep job-insight generation gated |
| `backend/controllers/recruiterAiWorkspaceController.js` | B | Convert with chat-history design after resolving message id uniqueness |
| `backend/controllers/recruiterCopilot.controller.js` | D | Keep copilot/ranking/provider lookup flow gated |
| `backend/controllers/recruiterController.js` | B | Normal runtime remains Prisma; deferred matching, outreach, and AI branches remain gated |
| `backend/controllers/jobController.js` | D | Normal jobs remain Prisma; only the legacy AI-expiry branch remains and is gated |
| `backend/controllers/jobInteractionController.js` | B | Normal interactions remain Prisma; defer optional AI-evaluation relation branch |
| `backend/controllers/reportsController.js` | B | Separate normal reports from AI/outreach analytics before conversion |
| `backend/routes/candidateReportRoutes.js` | D | Keep compatibility-heavy AI report flow gated by AI/profile flags |
| `backend/routes/recruiterAiRoutes.js` | D | Keep monolithic model/provider logic gated by global and recruiter AI flags |
| `backend/modules/ai/controllers/ai.controller.js` | B | Split persistence endpoints from AI/OCR/vector orchestration |
| `backend/modules/ai/services/chatHistory.service.js` | B | Resolve blank `clientMessageId` uniqueness semantics before direct conversion |
| `backend/modules/jobMatching/matching.controller.js` | B | Keep matching API gated until matching persistence is redesigned |
| `backend/modules/jobMatching/matching.service.js` | B | Redesign ranking queries and cached match lifecycle |
| `backend/modules/candidateSourcing/csvImport.service.js` | C | Keep import path disabled; do not treat as core HTTP runtime |
| `backend/modules/candidateSourcing/dedupe.service.js` | B | Keep staging dedupe coupled to disabled sourcing pipeline |
| `backend/modules/candidateSourcing/smartRun.service.js` | C | Keep connector/staging ingestion disabled pending architecture design |
| `backend/services/ai/aiPipelineService.js` | B | Separate analysis persistence, prompt lookup, provider calls, and cache policy |
| `backend/services/ai/anthropicService.js` | D | Keep external model calls gated |
| `backend/services/ai/autoAnalyzer.js` | D | Keep scheduled/provider analysis disabled |
| `backend/services/ai/embeddingsService.js` | D | Define vector storage/search approach before conversion |
| `backend/services/ai/llmService.js` | B/D | Keep external model calls gated |
| `backend/services/ai/profileBuilder/geminiExtractor.js` | D | Keep external model extraction gated |
| `backend/services/ai/providerChatService.js` | D | Resolve cache/conversation schema and external model boundary |
| `backend/services/ai/providerProfileService.js` | B | Separate profile persistence from model output processing |
| `backend/services/ai/recruiterCopilot.service.js` | D | Keep prompt/model/ranking workflow gated |
| `backend/services/ai/vectorSearchService.js` | B | Requires PostgreSQL vector-search design and indexing |
| `backend/services/ai/visionOcrService.js` | D | Keep OCR and remote document behavior gated |
| `backend/services/matchWeightService.js` | B | Convert with ranking architecture so weight semantics remain consistent |
| `backend/services/providerAIOrchestrationService.js` | B | Split embeddings, OCR, and persistence before conversion |
| `backend/services/providerRankingService.js` | B | Redesign ranking query and subscription boost semantics |
| `backend/workers/candidateDigest.worker.js` | C | Compatibility logic retained; worker and delivery require worker, matching, and communication flags |
| `backend/jobs/candidateDigest.cron.js` | C | Compatibility logic retained; registration requires cron, matching, and communication flags |
| `backend/workers/candidateOutreach.worker.js` | C | Import-time Redis/worker creation now requires worker, outreach, and communication flags; persistence remains deferred |
| `backend/workers/candidateRescan.worker.js` | C | Import-time worker creation now requires worker, AI, and embedding flags |
| `backend/workers/outreach.worker.js` | C | Import-time Redis/worker creation now requires worker, outreach, and communication flags |
| `backend/jobs/outreach.cron.js` | C | Cron registration now requires cron, outreach, and communication flags |
| `backend/services/outreachGateway.service.js` | D | Provider methods refuse execution unless outreach and communication flags are enabled |

## Runtime gates added or tightened

- `backend/modules/ai/routes/ai.routes.js`: global AI gate plus profile, chat, OCR, and embedding gates.
- `backend/routes/providerAI.routes.js`: global AI gate and route-family profile/chat gates.
- `backend/routes/chatRoutes.js`: AI and chat gates.
- `backend/routes/recruiterAiRoutes.js` and `backend/routes/recruiterCopilot.routes.js`: AI and recruiter-AI gates.
- `backend/routes/recruiterRoutes.js`: targeted recruiter AI, chat, matching, evaluation, and outreach gates.
- `backend/routes/providerRoutes.js`: provider AI/profile, matching, scraper, and insight gates.
- `backend/routes/jobRoutes.js`: AI job-expiry gate.
- `backend/modules/jobMatching/matching.routes.js`: job-matching gate.
- `backend/routes/candidateReportRoutes.js`: AI/profile gate.
- `backend/routes/adminOutreach.routes.js`: outreach and communication-provider gates.
- `backend/routes/adminAIRoutes.js`: external re-run, OCR, and fraud operations gated; read-only configuration/accounting routes remain available to admins.
- `backend/server.js`: candidate digest, candidate rescan, and outreach startup now require their subsystem flags in addition to worker/cron flags.

## Compatibility and Mongoose status

- Category A files have no compatibility-model imports.
- The table above records **47 deferred compatibility files** in Batch 22 scope. They are deliberately retained for architectural follow-up and isolated from default runtime execution.
- Direct `mongoose` imports/usages in the scanned Batch 22 controller/service/route/module/worker/job scope: **0**.
- No legacy Mongoose model file was deleted.

## Schema gaps and risks

1. `ChatMessage.clientMessageId` defaults to an empty string while `@@unique([conversationId, clientMessageId])` is present. Multiple server-created messages without a client id can collide.
2. Provider/recruiter AI usage is stored in `Json`. Direct Prisma updates replace the JSON object and cannot atomically increment one nested counter, so concurrent successful requests can lose increments.
3. Prompt templates retain duplicate legacy/new field pairs (`key`/`feature_name`, `isActive`/`is_active`, `template`/`prompt_template`). A canonical contract is needed before admin CRUD is converted.
4. Embeddings use scalar arrays and do not define a PostgreSQL vector type, similarity operator, or vector index. Matching/vector code needs a separate storage and query design.
5. Several AI results, scoring explanations, sourcing metadata, and workflow states are JSON blobs. Their validation/versioning contract should be fixed before broad conversion.

## Validation

- `npx prisma validate --schema prisma/schema.prisma`: passed.
- `npx prisma generate --schema prisma/schema.prisma`: passed; Prisma Client 6.19.1 generated.
- JavaScript syntax checks: passed for all 27 Batch 22-touched JavaScript files, including the regression test.
- Full `npm test`: passed, 67 tests, 0 failures. After the final candidate-outreach guard, the 4 Batch 22 regression tests were rerun and passed.
- Batch 22 scoped `git diff --check`: passed (line-ending conversion warnings only).
- Full-worktree `git diff --check`: still reports pre-existing trailing whitespace in `backend/workers/crawlerWorker.js`, which is outside Batch 22. The in-scope candidate-outreach whitespace was cleaned while adding its safety gate.
