-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "name" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admincommissionsettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL DEFAULT '',
    "key" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "admincommissionsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adminsettings" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL DEFAULT '',
    "key" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "adminsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis_results" (
    "id" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3),
    "error_message" TEXT NOT NULL DEFAULT '',
    "estimated_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feature_name" TEXT NOT NULL,
    "input_hash" TEXT NOT NULL,
    "input_snapshot" JSONB,
    "model_name" TEXT NOT NULL,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "parsed_json" JSONB,
    "prompt_version" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "raw_response" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'success',
    "token_usage" JSONB,
    "updated_at" TIMESTAMP(3),
    "user_id" TEXT,

    CONSTRAINT "ai_analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aichatcaches" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedIntent" TEXT NOT NULL DEFAULT '',
    "extracted" JSONB,
    "message" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'openai',
    "reply" TEXT NOT NULL,
    "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aichatcaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aievaluations" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL DEFAULT '',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aievaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aifeaturecaches" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "featureName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "reportData" JSONB NOT NULL,

    CONSTRAINT "aifeaturecaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aifeaturecontrols" (
    "id" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defaultModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "featureKey" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "lastUpdatedBy" TEXT NOT NULL DEFAULT 'admin',
    "status" TEXT NOT NULL DEFAULT 'active',
    "unitCostInr" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aifeaturecontrols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aiinteractionlogs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feature" TEXT NOT NULL,
    "input" JSONB,
    "model" TEXT NOT NULL DEFAULT 'rule-only',
    "output" JSONB,
    "promptType" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'system',
    "status" TEXT NOT NULL DEFAULT 'success',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "aiinteractionlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompt_templates" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3),
    "description" TEXT NOT NULL DEFAULT '',
    "feature_name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "key" TEXT,
    "maxTokens" DOUBLE PRECISION NOT NULL DEFAULT 800,
    "model_name" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "outputSchema" JSONB,
    "prompt_template" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'system',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "template" TEXT,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    "version" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "ai_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aiusagelogs" (
    "id" TEXT NOT NULL,
    "costEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feature" TEXT,
    "featureKey" TEXT,
    "featureName" TEXT,
    "inputTokens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "model" TEXT NOT NULL,
    "outputTokens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'system',
    "status" TEXT NOT NULL DEFAULT 'success',
    "totalTokens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT,

    CONSTRAINT "aiusagelogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coverLetter" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobPost" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvallogs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL DEFAULT '',
    "actorRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT '',
    "targetName" TEXT NOT NULL DEFAULT '',
    "targetProfileId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvallogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditevents" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "piiSafe" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditevents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automationtasklogs" (
    "id" TEXT NOT NULL,
    "attemptCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT NOT NULL DEFAULT '',
    "executedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,
    "relatedEntityId" TEXT NOT NULL DEFAULT '',
    "relatedEntityType" TEXT NOT NULL DEFAULT '',
    "result" JSONB,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "taskType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automationtasklogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billingrules" (
    "id" TEXT NOT NULL,
    "cashbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cashbackMaxCap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashbackMinTransactionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashbackType" TEXT NOT NULL DEFAULT 'percentage',
    "cashbackValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "changeReason" TEXT NOT NULL DEFAULT '',
    "countryGst" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fixedWithdrawalFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "legacyUserReferralCommissionPercentage" DOUBLE PRECISION,
    "minPayoutThreshold" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "platformCommissionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "referralCommissionType" TEXT NOT NULL DEFAULT 'percentage',
    "referralCommissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralEnabled" BOOLEAN NOT NULL DEFAULT false,
    "referralMaxCap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "version" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "billingrules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boostsuggestions" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryMeta" JSONB,
    "message" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "skill" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boostsuggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidateactivitylogs" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,
    "metadataJson" JSONB,
    "source" TEXT NOT NULL DEFAULT 'System',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidateactivitylogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatecareerversions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "reasonForVersion" TEXT NOT NULL DEFAULT 'Routine Scan',
    "snapshotData" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'System',
    "userId" TEXT,
    "versionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidatecareerversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatedigestlogs" (
    "id" TEXT NOT NULL,
    "candidate" TEXT NOT NULL,
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TEXT NOT NULL,
    "emailStatus" TEXT NOT NULL DEFAULT 'none',
    "error" TEXT NOT NULL DEFAULT '',
    "jobsMatched" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whatsappStatus" TEXT NOT NULL DEFAULT 'none',

    CONSTRAINT "candidatedigestlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatejobmatches" (
    "id" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "experienceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "jobCollection" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobTypeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "salaryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savedAt" TIMESTAMP(3),
    "skillScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "candidatejobmatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careerhealthcaches" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileHash" TEXT NOT NULL,
    "reportData" JSONB NOT NULL,

    CONSTRAINT "careerhealthcaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorysuggestions" (
    "id" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "occurrenceCount" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sampleJobIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "suggestedName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorysuggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatconversations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "role" TEXT NOT NULL DEFAULT 'recruiter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "chatconversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatmessages" (
    "id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "content" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "parentMessageId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'recruiter',
    "status" TEXT NOT NULL DEFAULT 'sent',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "chatmessages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citygeos" (
    "id" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citygeos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissiontransactions" (
    "id" TEXT NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partnerId" TEXT NOT NULL,
    "paymentId" TEXT,
    "planAmount" DOUBLE PRECISION NOT NULL,
    "referralId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "remarks" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'earned',
    "subscriptionId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'first_subscription_commission',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissiontransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companyaliassuggestions" (
    "id" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawCompanyName" TEXT NOT NULL,
    "sampleJobIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "suggestedCompanyId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companyaliassuggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companycontacts" (
    "id" TEXT NOT NULL,
    "companyDomain" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "sourcePage" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companycontacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companymasters" (
    "id" TEXT NOT NULL,
    "companyDomain" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "externalId" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companymasters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companysources" (
    "id" TEXT NOT NULL,
    "activeJobCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atsIdentifier" TEXT NOT NULL DEFAULT '',
    "atsType" TEXT NOT NULL DEFAULT 'unknown',
    "careerUrl" TEXT NOT NULL DEFAULT '',
    "companyDomain" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hiringLevel" TEXT NOT NULL DEFAULT 'normal',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "lastSyncedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'active',
    "successCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companysources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactclicklogs" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user" TEXT NOT NULL,

    CONSTRAINT "contactclicklogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countryconfigs" (
    "id" TEXT NOT NULL,
    "allowedLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "currency" TEXT NOT NULL,
    "currencySymbol" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "defaultTaxName" TEXT NOT NULL DEFAULT 'GST',
    "defaultTaxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isJobSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isNotificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isPricingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isSeoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "jobTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notificationRules" JSONB,
    "phoneCode" TEXT,
    "pricingRules" JSONB,
    "salaryFormat" JSONB,
    "seoRules" JSONB,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "slug" TEXT,
    "supportedAtsSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportedJobSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "syncRules" JSONB,
    "timezone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validationStatus" TEXT NOT NULL DEFAULT 'setup_incomplete',

    CONSTRAINT "countryconfigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countrypipelineconfigs" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailyQueryLimit" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "defaultLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleCron" TEXT NOT NULL DEFAULT '0 1 * * *',
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "seedQueries" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countrypipelineconfigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawlerbatches" (
    "id" TEXT NOT NULL,
    "companies" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "name" TEXT NOT NULL,
    "processedCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawlerbatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customplanrequests" (
    "id" TEXT NOT NULL,
    "boostDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boostJobs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "campaigns" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMonths" DOUBLE PRECISION NOT NULL,
    "estimatedPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobsPerMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "offerDetails" JSONB,
    "profileUnlocks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recruiterId" TEXT NOT NULL,
    "selectedFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customplanrequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customvisibilityplans" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endDate" TIMESTAMP(3),
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "items" JSONB,
    "paymentId" TEXT NOT NULL DEFAULT '',
    "planType" TEXT NOT NULL DEFAULT 'custom',
    "providerId" TEXT NOT NULL,
    "selectedGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subscriptionId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customvisibilityplans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasourceconfigs" (
    "id" TEXT NOT NULL,
    "actorInputSchema" TEXT NOT NULL DEFAULT '',
    "aiPromptTemplate" TEXT NOT NULL,
    "apiHeaders" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "apiMethod" TEXT NOT NULL DEFAULT 'GET',
    "costPerRecord" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpointOrActorId" TEXT NOT NULL DEFAULT '',
    "failureCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSuccess" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Ready / Free',
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datasourceconfigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandsnapshots" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "demandCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skill" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "supplyCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unmetDemandScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandsnapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentverificationresults" (
    "id" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentType" TEXT NOT NULL DEFAULT 'aadhaar',
    "documentUrl" TEXT NOT NULL,
    "extractedFields" JSONB,
    "profileComparison" JSONB,
    "providerId" TEXT NOT NULL,
    "rawOcrText" TEXT NOT NULL DEFAULT '',
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentverificationresults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicategroups" (
    "id" TEXT NOT NULL,
    "canonicalJobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duplicateJobIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duplicateSourceVersionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchingRule" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duplicategroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "subject" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "externaljobs" (
    "id" TEXT NOT NULL,
    "applyMode" TEXT NOT NULL DEFAULT 'external_redirect',
    "applyUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "companyDomain" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT NOT NULL,
    "duplicateHash" TEXT,
    "experienceRequired" TEXT NOT NULL DEFAULT '',
    "externalJobId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jobOrigin" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'full_time',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationText" TEXT NOT NULL DEFAULT '',
    "salaryMax" DOUBLE PRECISION,
    "salaryMin" DOUBLE PRECISION,
    "salaryPeriod" TEXT NOT NULL DEFAULT 'yearly',
    "seoSlug" TEXT,
    "skillsTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL,
    "sourceJobUrl" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "externaljobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "question" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featureflags" (
    "id" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featureflags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraudflags" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "source" TEXT NOT NULL DEFAULT 'rule_engine',
    "status" TEXT NOT NULL DEFAULT 'open',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "fraudflags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelancercontactconsentrequests" (
    "id" TEXT NOT NULL,
    "auditLogId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freelancerId" TEXT NOT NULL,
    "requestMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesterId" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freelancercontactconsentrequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geonamescities" (
    "id" TEXT NOT NULL,
    "admin1Code" TEXT,
    "admin1Name" TEXT,
    "admin2Code" TEXT,
    "alternateNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "asciiName" TEXT,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geonameId" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "location" JSONB,
    "longitude" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "population" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "searchText" TEXT,
    "timezone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geonamescities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importbatches" (
    "id" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "csvData" TEXT,
    "errors" JSONB,
    "failedCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fileName" TEXT NOT NULL,
    "originalSize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processedRows" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "successCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRows" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "importbatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_path_caches" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "candidateSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileVersion" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "result" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,

    CONSTRAINT "income_path_caches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestionsettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailyRecordsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailySpendUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxRecordsPerDay" DOUBLE PRECISION NOT NULL DEFAULT 3000,
    "maxRecordsPerMonth" DOUBLE PRECISION NOT NULL DEFAULT 90000,
    "maxSpendPerDay" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "maxSpendPerMonth" DOUBLE PRECISION NOT NULL DEFAULT 150000,
    "monthlyRecordsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlySpendUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestionsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobanalyticsevents" (
    "id" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device" TEXT,
    "eventType" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,

    CONSTRAINT "jobanalyticsevents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobanalyticsmetrics" (
    "id" TEXT NOT NULL,
    "activeViewerCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "applyClicks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobId" TEXT NOT NULL,
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "views" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "jobanalyticsmetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobmatches" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),
    "jobId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerId" TEXT NOT NULL,
    "responseAt" TIMESTAMP(3),
    "responseStatus" TEXT NOT NULL DEFAULT 'pending',
    "scoreBreakdown" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobmatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobposts" (
    "id" TEXT NOT NULL,
    "aiGenerated" JSONB,
    "applicants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applyMode" TEXT NOT NULL DEFAULT 'internal_apply',
    "applyUrl" TEXT NOT NULL DEFAULT '',
    "boostExpiresAt" TIMESTAMP(3),
    "boostedAt" TIMESTAMP(3),
    "budget" JSONB,
    "budgetMax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetType" TEXT NOT NULL DEFAULT 'negotiable',
    "candidates" JSONB,
    "category" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "cityName" TEXT,
    "companyDomain" TEXT NOT NULL DEFAULT '',
    "companyInfo" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT NOT NULL,
    "duplicateHash" TEXT,
    "embedding" JSONB,
    "embeddingText" TEXT NOT NULL DEFAULT '',
    "experienceRequired" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "externalJobId" TEXT,
    "externalUrl" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geoPoint" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBoosted" BOOLEAN NOT NULL DEFAULT false,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "jobLocationData" JSONB,
    "jobOrigin" TEXT NOT NULL DEFAULT 'internal',
    "jobType" TEXT NOT NULL DEFAULT 'full_time',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "locality" TEXT NOT NULL DEFAULT '',
    "location" JSONB,
    "locationData" JSONB,
    "locationText" TEXT NOT NULL DEFAULT '',
    "longitude" DOUBLE PRECISION,
    "matchRadiusUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchedProviders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxBudget" DOUBLE PRECISION,
    "minBudget" DOUBLE PRECISION,
    "nativeLanguage" TEXT NOT NULL DEFAULT 'en',
    "pricingType" TEXT,
    "recruiter" TEXT,
    "relocationSupport" BOOLEAN NOT NULL DEFAULT false,
    "requiredSkillLevel" TEXT NOT NULL DEFAULT 'semi-skilled',
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salaryPeriod" TEXT NOT NULL DEFAULT 'yearly',
    "scheduleType" TEXT NOT NULL DEFAULT 'flexible',
    "seoSlug" TEXT,
    "skill" TEXT NOT NULL DEFAULT '',
    "skillsTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'internal',
    "sourceJobUrl" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL DEFAULT 'internal',
    "speciality" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "timeOfDay" TEXT NOT NULL DEFAULT 'any',
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "workMode" TEXT NOT NULL DEFAULT 'onsite',

    CONSTRAINT "jobposts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobroles" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roleName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobroles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobsearchintents" (
    "id" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extractedBudgetMax" DOUBLE PRECISION,
    "extractedBudgetMin" DOUBLE PRECISION,
    "extractedCity" TEXT NOT NULL DEFAULT '',
    "extractedLocality" TEXT NOT NULL DEFAULT '',
    "extractedShiftType" TEXT NOT NULL DEFAULT '',
    "extractedSkill" TEXT NOT NULL DEFAULT '',
    "extractedTimeOfDay" TEXT NOT NULL DEFAULT '',
    "extractedUrgency" TEXT NOT NULL DEFAULT '',
    "locationData" JSONB,
    "normalizedQuery" TEXT NOT NULL DEFAULT '',
    "rawQuery" TEXT NOT NULL DEFAULT 'All Providers',
    "sourceUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobsearchintents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobsourceconfigs" (
    "id" TEXT NOT NULL,
    "apiBaseUrl" TEXT NOT NULL DEFAULT '',
    "apiCredentialsRef" TEXT NOT NULL DEFAULT '',
    "authType" TEXT NOT NULL DEFAULT 'No auth',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inputSchemaJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isZeroCode" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT NOT NULL DEFAULT '',
    "lastSyncAt" TIMESTAMP(3),
    "outputMappingJson" JSONB,
    "rateLimit" JSONB,
    "requiresApiKey" BOOLEAN NOT NULL DEFAULT false,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paused',
    "supportedCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "syncRules" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "webhookUrl" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "jobsourceconfigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobsourceversions" (
    "id" TEXT NOT NULL,
    "applyUrl" TEXT NOT NULL,
    "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duplicateGroupId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freshnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCanonical" BOOLEAN NOT NULL DEFAULT false,
    "jobId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB,
    "requisitionId" TEXT,
    "sourceConfidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceJobId" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobsourceversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsearchscanruns" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "finishedAt" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "rawMeta" JSONB,
    "retryCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scanType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalFailed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFetched" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPublished" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSavedRaw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalValidated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "triggeredBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jsearchscanruns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "assignedByEngine" BOOLEAN NOT NULL DEFAULT false,
    "confirmationStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "jobPost" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "notes" JSONB,
    "notifiedViaWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL,
    "recruiter" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'new',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" TEXT NOT NULL,
    "unlockPaymentId" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaddistributionlogs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distributionBatchId" TEXT NOT NULL,
    "intentId" TEXT,
    "jobId" TEXT,
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerId" TEXT NOT NULL,
    "reason" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recruiterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaddistributionlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadevents" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leadevents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learnedselectors" (
    "id" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "domain" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learnedselectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'place',

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchlogs" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL DEFAULT 'email',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matchlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newslettersubscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newslettersubscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "automationSource" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "sourceTag" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "user" JSONB,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "attempts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "channel" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "otpHash" TEXT NOT NULL,
    "providerUsed" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL,
    "resendCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resendWindowStart" TIMESTAMP(3),
    "target" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreachcampaigns" (
    "id" TEXT NOT NULL,
    "candidates" JSONB,
    "candidatesContacted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'running',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreachcampaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partnerbankaccounts" (
    "id" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'Savings',
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ifscCode" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "partnerId" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "upiId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "partnerbankaccounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partnerprofiles" (
    "id" TEXT NOT NULL,
    "activityLogs" JSONB,
    "approvalSections" JSONB,
    "availableCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdByModel" TEXT NOT NULL DEFAULT 'Admin',
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "level" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "pendingPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "referralLink" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "tier" TEXT NOT NULL DEFAULT 'Gold',
    "totalCommissionEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenueCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "withdrawnCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "partnerprofiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partnerrewards" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" DOUBLE PRECISION,
    "paidAt" TIMESTAMP(3),
    "partner" TEXT NOT NULL,
    "referral" TEXT,
    "referredUser" TEXT,
    "remarks" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "year" DOUBLE PRECISION,

    CONSTRAINT "partnerrewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "billingRuleSnapshot" JSONB,
    "cashbackAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "netPlatformRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT '',
    "plan" TEXT,
    "platformCommissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceSnapshot" JSONB,
    "providerShareAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralCommissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'created',
    "stripePaymentIntentId" TEXT NOT NULL DEFAULT '',
    "stripeSessionId" TEXT,
    "transactionId" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user" TEXT NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payoutmethods" (
    "id" TEXT NOT NULL,
    "bankDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "providerName" TEXT NOT NULL DEFAULT '',
    "qrCodeImage" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "upiId" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,

    CONSTRAINT "payoutmethods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payoutrequests" (
    "id" TEXT NOT NULL,
    "adminRemarks" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partnerId" TEXT NOT NULL,
    "partnerProfileId" TEXT NOT NULL,
    "paymentDetails" JSONB,
    "paymentMethod" TEXT NOT NULL DEFAULT '',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payoutrequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelineauditlogs" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "adminUserId" TEXT,
    "afterState" JSONB,
    "beforeState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "metadata" JSONB,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerSource" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelineauditlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelineautomations" (
    "id" TEXT NOT NULL,
    "activeFilters" JSONB,
    "autoSendClaimLink" BOOLEAN NOT NULL DEFAULT true,
    "configId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "experienceMax" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "experienceMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failureCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "jobType" TEXT NOT NULL DEFAULT '',
    "lastRunAt" TIMESTAMP(3),
    "location" TEXT NOT NULL DEFAULT '',
    "maxRecordsPerRun" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "maxSpendPerRun" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "name" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3),
    "outreachChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchQuery" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelineautomations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelinecategories" (
    "id" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelinecategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelinecompanymasters" (
    "id" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canonicalName" TEXT NOT NULL,
    "companyDomain" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelinecompanymasters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelinejobs" (
    "id" TEXT NOT NULL,
    "applyUrl" TEXT NOT NULL,
    "canonicalLocationId" TEXT,
    "canonicalSourceVersionId" TEXT,
    "categoryId" TEXT,
    "categoryName" TEXT,
    "city" TEXT,
    "companyDomain" TEXT,
    "companyId" TEXT,
    "companyName" TEXT NOT NULL,
    "compositeKey" TEXT,
    "contentFingerprint" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "duplicateGroupId" TEXT,
    "employmentType" TEXT,
    "expiryReason" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobType" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationText" TEXT NOT NULL,
    "missingSuccessfulScanCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "postedDate" TIMESTAMP(3),
    "requisitionId" TEXT,
    "salaryCurrency" TEXT,
    "salaryMax" DOUBLE PRECISION,
    "salaryMin" DOUBLE PRECISION,
    "salaryNormalizedAnnual" DOUBLE PRECISION,
    "salaryRaw" TEXT,
    "salaryUnit" TEXT,
    "sourceApplyUrl" TEXT,
    "sourceConfidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceJobId" TEXT,
    "sourceName" TEXT,
    "sourceType" TEXT,
    "state" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validThrough" TIMESTAMP(3),
    "validationErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "validationStatus" TEXT NOT NULL DEFAULT 'needs_review',

    CONSTRAINT "pipelinejobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelinelocationmasters" (
    "id" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canonicalName" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "normalizedKey" TEXT NOT NULL,
    "state" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelinelocationmasters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "aiLimits" JSONB,
    "allowedCities" JSONB,
    "allowedPincodes" JSONB,
    "allowedSkills" JSONB,
    "audience" TEXT,
    "availableCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "boostWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "code" TEXT,
    "contactLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "countryPricing" JSONB,
    "coverageType" TEXT NOT NULL DEFAULT 'pincode',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "customConfig" JSONB,
    "description" TEXT NOT NULL DEFAULT '',
    "discountedPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 365,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCustomisable" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultFree" BOOLEAN NOT NULL DEFAULT false,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isProviderDefault" BOOLEAN NOT NULL DEFAULT false,
    "isRotationEligible" BOOLEAN NOT NULL DEFAULT false,
    "maxCities" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxJobApplications" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxPincodes" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxSkills" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "metadata" JSONB,
    "name" TEXT NOT NULL,
    "planBenefits" JSONB,
    "planCategory" TEXT NOT NULL DEFAULT 'general',
    "planType" TEXT NOT NULL DEFAULT 'paid',
    "price" DOUBLE PRECISION NOT NULL,
    "priceAED" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priorityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "showOnLandingPage" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "supportsPerformanceInsights" BOOLEAN NOT NULL DEFAULT false,
    "supportsSmsAlerts" BOOLEAN NOT NULL DEFAULT false,
    "supportsWhatsappAlerts" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "unlockCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usageResetCycle" TEXT NOT NULL DEFAULT 'monthly',
    "visibilityLevel" TEXT NOT NULL DEFAULT 'basic',

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profilesharetokens" (
    "id" TEXT NOT NULL,
    "accessCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByRole" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "lastAccessedAt" TIMESTAMP(3),
    "token" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profilesharetokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profileunlocks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "jobId" TEXT,
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "planId" TEXT,
    "providerId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'full_profile',
    "recruiterId" TEXT NOT NULL,
    "sourcePlanId" TEXT,
    "subscriptionId" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "profileunlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provideraiprofiles" (
    "id" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedProfile" JSONB,
    "model" TEXT NOT NULL DEFAULT '',
    "providerId" TEXT NOT NULL,
    "rawInput" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'fallback',
    "status" TEXT NOT NULL DEFAULT 'success',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "provideraiprofiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provideraiusages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usage" JSONB,

    CONSTRAINT "provideraiusages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provideravailabilities" (
    "id" TEXT NOT NULL,
    "availableSlots" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAvailableNow" BOOLEAN NOT NULL DEFAULT true,
    "providerId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workingDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workingHours" JSONB,

    CONSTRAINT "provideravailabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providerembeddings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dimensions" DOUBLE PRECISION NOT NULL DEFAULT 1536,
    "metadata" JSONB,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "providerId" TEXT NOT NULL,
    "textSnapshot" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedAtSource" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vector" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],

    CONSTRAINT "providerembeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providermetrics" (
    "id" TEXT NOT NULL,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hireConversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastLeadAssignedAt" TIMESTAMP(3),
    "profileCompletionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerId" TEXT NOT NULL,
    "rankingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAcceptedLeads" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAssignedLeads" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCompletedDeals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providermetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providerprofiles" (
    "id" TEXT NOT NULL,
    "activePlanId" TEXT,
    "activeSubscriptionId" TEXT,
    "activityLogs" JSONB,
    "aiGeneratedDraft" JSONB,
    "aiSuggestions" JSONB,
    "allowedCitiesCount" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "allowedPincodesCount" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "allowedSkillsCount" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "approvalAction" TEXT NOT NULL DEFAULT 'pending',
    "approvalNote" TEXT NOT NULL DEFAULT '',
    "approvalSections" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedByRole" TEXT,
    "availability" TEXT NOT NULL DEFAULT '',
    "availabilitySummary" JSONB,
    "boostWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boostedUntil" TIMESTAMP(3),
    "category" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "contactVisibility" TEXT NOT NULL DEFAULT 'both',
    "contactsUnlocked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentCtc" TEXT NOT NULL DEFAULT '',
    "currentPlan" TEXT NOT NULL DEFAULT 'free',
    "customConfig" JSONB,
    "description" TEXT NOT NULL DEFAULT '',
    "designation" TEXT NOT NULL DEFAULT '',
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "education" JSONB,
    "embedding" JSONB,
    "embeddingText" TEXT NOT NULL DEFAULT '',
    "expandedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expectedCtc" TEXT NOT NULL DEFAULT '',
    "experience" TEXT NOT NULL DEFAULT '',
    "finalBio" TEXT NOT NULL DEFAULT '',
    "followBackRequest" JSONB,
    "freelancerAnalytics" JSONB,
    "geoPoint" JSONB,
    "inRotationPool" BOOLEAN NOT NULL DEFAULT false,
    "isActiveSubscription" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isPublicProfile" BOOLEAN NOT NULL DEFAULT false,
    "isResumeAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isTopCity" BOOLEAN NOT NULL DEFAULT false,
    "isTopInCity" BOOLEAN NOT NULL DEFAULT false,
    "isTopInCountry" BOOLEAN NOT NULL DEFAULT false,
    "isTopInPincode" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "jobType" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languageEntries" JSONB,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastAnalyzedHash" TEXT,
    "lastShownAt" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "leadsReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" JSONB,
    "locationData" JSONB,
    "locationUpdatedAt" TIMESTAMP(3),
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "longitude" DOUBLE PRECISION,
    "nearestLocation" TEXT NOT NULL DEFAULT '',
    "noticePeriod" TEXT NOT NULL DEFAULT '',
    "originalBio" TEXT NOT NULL DEFAULT '',
    "originalPortfolioLinks" JSONB,
    "originalSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parsedResumeData" JSONB,
    "photo" TEXT NOT NULL DEFAULT '',
    "planBenefitsSnapshot" JSONB,
    "planCoverageType" TEXT NOT NULL DEFAULT 'pincode',
    "planExpiresAt" TIMESTAMP(3),
    "portfolioLinks" JSONB,
    "preferredCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previousExperience" JSONB,
    "pricing" TEXT NOT NULL DEFAULT '',
    "pricingEntries" JSONB,
    "pricingType" TEXT NOT NULL DEFAULT '',
    "priorityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profileCompletion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profileExpiresAt" TIMESTAMP(3),
    "profileName" TEXT NOT NULL DEFAULT '',
    "profilePhoto" TEXT NOT NULL DEFAULT '',
    "profilePhotoApproval" JSONB,
    "profileStatus" TEXT NOT NULL DEFAULT 'draft',
    "profileViews" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projects" JSONB,
    "rankingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "relocationAvailable" BOOLEAN NOT NULL DEFAULT false,
    "remoteAvailable" BOOLEAN NOT NULL DEFAULT false,
    "renewalReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "resumeApproval" JSONB,
    "resumeParsing" JSONB,
    "resumeUrl" TEXT NOT NULL DEFAULT '',
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceLocationData" JSONB,
    "serviceLocations" JSONB,
    "skillLevel" TEXT NOT NULL DEFAULT 'unskilled',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialities" JSONB,
    "state" TEXT NOT NULL DEFAULT '',
    "subscriptionEndDate" TIMESTAMP(3),
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStartDate" TIMESTAMP(3),
    "tier" TEXT NOT NULL DEFAULT 'unskilled',
    "totalReviews" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedAssets" JSONB,
    "user" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "visibilityLevel" TEXT NOT NULL DEFAULT 'basic',
    "whatsappAlerts" BOOLEAN NOT NULL DEFAULT true,
    "whatsappConsent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappFreelancePlanActive" BOOLEAN NOT NULL DEFAULT false,
    "whatsappFreelancePlanExpiry" TIMESTAMP(3),
    "whatsappFreelancePlanSubscriptionId" TEXT,
    "willingToTravelKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workMode" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "providerprofiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providerserviceareas" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geoPoint" JSONB,
    "locality" TEXT NOT NULL DEFAULT '',
    "providerId" TEXT NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providerserviceareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providersubscriptions" (
    "id" TEXT NOT NULL,
    "benefits" JSONB,
    "coverageLabel" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "customConfig" JSONB,
    "customLimits" JSONB,
    "durationMonths" DOUBLE PRECISION NOT NULL,
    "endDate" TIMESTAMP(3),
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAutoRenew" BOOLEAN NOT NULL DEFAULT false,
    "maxJobApplications" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderId" TEXT NOT NULL DEFAULT '',
    "paymentId" TEXT NOT NULL DEFAULT '',
    "paymentProvider" TEXT NOT NULL DEFAULT '',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "planCategory" TEXT NOT NULL DEFAULT 'general',
    "planId" TEXT NOT NULL,
    "planSnapshot" JSONB,
    "priceSnapshot" JSONB,
    "priorityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerId" TEXT NOT NULL,
    "remainingDurationMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selectedAddons" JSONB,
    "selectedCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedPincodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3),
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'pending',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usageResetCycle" TEXT NOT NULL DEFAULT 'monthly',
    "visibilityLevel" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "providersubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providerusages" (
    "id" TEXT NOT NULL,
    "cityCoverageUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobApplicationsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locationsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "pincodeCoverageUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerId" TEXT NOT NULL,
    "skillsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subscriptionId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providerusages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providerwallets" (
    "id" TEXT NOT NULL,
    "availableBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pendingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "withdrawnAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "providerwallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providerwallettransactions" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL DEFAULT '',
    "referenceId" TEXT,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,

    CONSTRAINT "providerwallettransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providerwithdrawals" (
    "id" TEXT NOT NULL,
    "adminNotes" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payoutMethodId" TEXT NOT NULL,
    "payoutMethodSnapshot" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transactionId" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "providerwithdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queryseedhistories" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureReason" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "rawTerm" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queryseedhistories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rawjobimports" (
    "id" TEXT NOT NULL,
    "applyUrl" TEXT,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jsearchJobId" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'raw',
    "query" TEXT NOT NULL,
    "rawCompanyName" TEXT,
    "rawDescription" TEXT,
    "rawEmploymentType" TEXT,
    "rawJobType" TEXT,
    "rawLocation" TEXT,
    "rawPayload" JSONB,
    "rawPostedDate" TIMESTAMP(3),
    "rawSalary" TEXT,
    "rawTitle" TEXT,
    "requisitionId" TEXT,
    "scanRunId" TEXT NOT NULL,
    "sourceApplyUrl" TEXT,
    "sourceConfidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "sourceJobId" TEXT,
    "sourceName" TEXT NOT NULL DEFAULT 'JSearch',
    "sourceType" TEXT NOT NULL DEFAULT 'aggregated',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validationErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "rawjobimports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiteraiusages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usage" JSONB,

    CONSTRAINT "recruiteraiusages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitercvviewtrackers" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recruiterId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruitercvviewtrackers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiterhireembeddings" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dimensions" DOUBLE PRECISION NOT NULL DEFAULT 1536,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "recruiterId" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL DEFAULT '',
    "skill" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL DEFAULT 'hire_history',
    "successSignals" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vector" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],

    CONSTRAINT "recruiterhireembeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiterleads" (
    "id" TEXT NOT NULL,
    "activeJobCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atsUsed" TEXT NOT NULL DEFAULT '',
    "careersEmail" TEXT NOT NULL DEFAULT '',
    "companyDomain" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPageUrl" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiringLevel" TEXT NOT NULL DEFAULT 'normal',
    "linkedInCompanyUrl" TEXT NOT NULL DEFAULT '',
    "publicHrEmail" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'ats_sync',
    "status" TEXT NOT NULL DEFAULT 'new',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiterleads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiterleadtrackers" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recruiterId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiterleadtrackers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiterprofiles" (
    "id" TEXT NOT NULL,
    "activityLogs" JSONB,
    "aiCopilotRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiJdGeneratorRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiJdParsingRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvalAction" TEXT NOT NULL DEFAULT 'pending',
    "approvalNote" TEXT NOT NULL DEFAULT '',
    "approvalSections" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedByRole" TEXT,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bio" TEXT NOT NULL DEFAULT '',
    "boostDaysRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boostJobsRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "businessType" TEXT NOT NULL DEFAULT '',
    "careerPageSettings" JSONB,
    "city" TEXT NOT NULL DEFAULT '',
    "companyLogo" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "companySize" TEXT NOT NULL DEFAULT '',
    "companyType" TEXT NOT NULL DEFAULT 'individual',
    "companyWebsite" TEXT NOT NULL DEFAULT '',
    "contactPersonName" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPlan" TEXT NOT NULL DEFAULT 'free',
    "customReportsRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "designation" TEXT NOT NULL DEFAULT '',
    "directMessagingRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "foundedYear" TEXT NOT NULL DEFAULT '',
    "freeProfileViews" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeUnlockResetAt" TIMESTAMP(3),
    "freeViewResetAt" TIMESTAMP(3),
    "geoPoint" JSONB,
    "gstNumber" TEXT NOT NULL DEFAULT '',
    "hiringLocation" TEXT NOT NULL DEFAULT '',
    "hiringPreferences" JSONB,
    "industry" TEXT NOT NULL DEFAULT '',
    "interviewKitsRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "jobPostLimitRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "location" JSONB,
    "locationData" JSONB,
    "locationUpdatedAt" TIMESTAMP(3),
    "longitude" DOUBLE PRECISION,
    "nearestLocation" TEXT NOT NULL DEFAULT '',
    "outreachCampaignsRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "planExpiresAt" TIMESTAMP(3),
    "profileExpiresAt" TIMESTAMP(3),
    "profileName" TEXT NOT NULL DEFAULT '',
    "profilePhoto" TEXT NOT NULL DEFAULT '',
    "profilePhotoApproval" JSONB,
    "renewalReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "skillsNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "state" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT '',
    "totalHires" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalJobsPosted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUnlocks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlockPackSize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlocksRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user" TEXT NOT NULL,
    "whatsappAlerts" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recruiterprofiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitersearchlogs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiredProviderId" TEXT,
    "parsedIntent" JSONB,
    "query" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "resultCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "semanticEmbeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "wasSuccessful" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "recruitersearchlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitersubscriptions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "durationMonths" DOUBLE PRECISION NOT NULL,
    "endDate" TIMESTAMP(3),
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAutoRenew" BOOLEAN NOT NULL DEFAULT false,
    "lastUsageResetAt" TIMESTAMP(3),
    "orderId" TEXT NOT NULL DEFAULT '',
    "paymentId" TEXT NOT NULL DEFAULT '',
    "paymentProvider" TEXT NOT NULL DEFAULT 'razorpay',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "planId" TEXT NOT NULL,
    "planSnapshot" JSONB,
    "priceSnapshot" JSONB,
    "razorpaySubscriptionId" TEXT,
    "recruiterId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'pending',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usageResetCycle" TEXT NOT NULL DEFAULT 'monthly',

    CONSTRAINT "recruitersubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "commissionStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstPaymentId" TEXT,
    "firstPlanAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstSubscriptionId" TEXT,
    "jobsCompleted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobsCreated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "partnerProfileId" TEXT,
    "referralCode" TEXT NOT NULL DEFAULT '',
    "referredRole" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referrerType" TEXT NOT NULL,
    "registrationSource" TEXT NOT NULL DEFAULT 'referral_link',
    "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardEligible" BOOLEAN NOT NULL DEFAULT false,
    "rewardStatus" TEXT NOT NULL DEFAULT 'pending',
    "selectedPlanId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "subscriptionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refundrequests" (
    "id" TEXT NOT NULL,
    "adminReason" TEXT NOT NULL DEFAULT '',
    "bankDetails" JSONB,
    "cancellationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planId" TEXT NOT NULL,
    "planPrice" DOUBLE PRECISION NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Refund Requested',
    "subscriptionId" TEXT NOT NULL,
    "totalCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionId" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usedCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "refundrequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repeathireinsights" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hireCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastHiredAt" TIMESTAMP(3),
    "providerId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "skillId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repeathireinsights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumeaccesslogs" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "recruiterId" TEXT NOT NULL,
    "resumeObjectKey" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "resumeaccesslogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumefilecaches" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileHash" TEXT NOT NULL,
    "parsedResult" JSONB NOT NULL,
    "resumeUrl" TEXT NOT NULL,

    CONSTRAINT "resumefilecaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobPost" TEXT,
    "leadId" TEXT,
    "provider" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "recruiter" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotationpools" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "history" JSONB,
    "maxPoolSize" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "providers" JSONB,
    "rotationInterval" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "rotationStrategy" TEXT NOT NULL DEFAULT 'round_robin',
    "skill" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotationpools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savedjobs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalJob" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "jobPost" TEXT,
    "provider" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savedjobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrapercaches" (
    "id" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "extractionMethod" TEXT,
    "htmlHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "scrapercaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seometas" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "page_slug" TEXT NOT NULL,
    "schema_enabled" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seometas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seopages" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "job_count" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keyword" TEXT NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'job_listing',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seopages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skillcategories" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedBy" TEXT,
    "deactivationReason" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '🔧',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "reactivatedAt" TIMESTAMP(3),
    "reactivatedBy" TEXT,
    "skills" JSONB,
    "slug" TEXT NOT NULL,
    "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'unskilled',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skillcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skillgapreports" (
    "id" TEXT NOT NULL,
    "aiProvider" TEXT NOT NULL DEFAULT 'claude-sonnet',
    "candidateId" TEXT NOT NULL,
    "candidateSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detailedAnalysis" TEXT NOT NULL DEFAULT '',
    "matchedJobIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawAiResponse" JSONB,
    "recommendedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportDate" TEXT NOT NULL,
    "reportSummary" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skillgapreports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skillsynonyms" (
    "id" TEXT NOT NULL,
    "canonicalSkillId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "normalizedLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skillsynonyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sourceconfidences" (
    "id" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sourceconfidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sourceconnectors" (
    "id" TEXT NOT NULL,
    "activeSignalMappingJson" JSONB,
    "actorId" TEXT NOT NULL DEFAULT '',
    "apiBaseUrl" TEXT NOT NULL DEFAULT '',
    "authType" TEXT NOT NULL DEFAULT 'No auth',
    "countriesSupported" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "dailyBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyQuota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dedupeRulesJson" JSONB,
    "encryptedSecretReference" TEXT NOT NULL DEFAULT '',
    "formId" TEXT NOT NULL DEFAULT '',
    "inputSchemaJson" JSONB,
    "monthlyBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyQuota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputMappingJson" JSONB,
    "riskLevel" TEXT NOT NULL DEFAULT 'Low',
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ready to Run',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "webhookUrl" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "sourceconnectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sourcerunlogs" (
    "id" TEXT NOT NULL,
    "activeLeadsFound" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adminId" TEXT,
    "completedAt" TIMESTAMP(3),
    "costUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "country" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duplicateRecords" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "expectedRecords" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "filtersJson" JSONB,
    "importedRecords" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keyword" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Success',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sourcerunlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stagingcandidates" (
    "id" TEXT NOT NULL,
    "activeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apifyRunId" TEXT NOT NULL DEFAULT '',
    "appliedToJob" BOOLEAN NOT NULL DEFAULT false,
    "careerHistory" JSONB,
    "claimExpiresAt" TIMESTAMP(3) NOT NULL,
    "claimLinkClicked" BOOLEAN NOT NULL DEFAULT false,
    "claimToken" TEXT NOT NULL,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "emailToggle" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "jobTitle" TEXT NOT NULL DEFAULT '',
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadStatus" TEXT NOT NULL DEFAULT 'Raw Lead',
    "location" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "noticePeriodAvailable" BOOLEAN NOT NULL DEFAULT false,
    "openToWork" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT NOT NULL DEFAULT '',
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "preferredJobTypeAvailable" BOOLEAN NOT NULL DEFAULT false,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "publicProfileUrl" TEXT NOT NULL DEFAULT '',
    "recentlyActive" BOOLEAN NOT NULL DEFAULT false,
    "resumeUpdatedAt" TIMESTAMP(3),
    "resumeUploaded" BOOLEAN NOT NULL DEFAULT false,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "smsSentAt" TIMESTAMP(3),
    "smsToggle" BOOLEAN NOT NULL DEFAULT false,
    "sourceQuery" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'staged',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whatsappSentAt" TIMESTAMP(3),
    "whatsappToggle" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stagingcandidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supporttickets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user" TEXT NOT NULL,

    CONSTRAINT "supporttickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synclogs" (
    "id" TEXT NOT NULL,
    "companiesAdded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "companiesChecked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duplicatesSkipped" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorDetails" JSONB,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "jobsDeactivated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobsFetched" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobsInserted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobsUpdated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "synclogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systemcostlogs" (
    "id" TEXT NOT NULL,
    "computeUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costInUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "serviceName" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokensUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "systemcostlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "attachments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "candidateName" TEXT NOT NULL DEFAULT '',
    "candidateRole" TEXT NOT NULL DEFAULT '',
    "comments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TEXT NOT NULL DEFAULT 'No date',
    "jobId" TEXT,
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "recruiterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translationcaches" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalText" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translationcaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trustscores" (
    "id" TEXT NOT NULL,
    "breakdown" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configVersion" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerId" TEXT NOT NULL,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "score" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trustscores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "__enc_bankDetails" JSONB,
    "accountExpiresAt" TIMESTAMP(3),
    "activePanel" TEXT,
    "activeRole" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'approved',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'email',
    "avatar" TEXT NOT NULL DEFAULT '',
    "bankDetails" JSONB,
    "cityName" TEXT,
    "claimToken" TEXT,
    "commissionBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "country" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByPartnerId" TEXT,
    "currency" TEXT NOT NULL DEFAULT '',
    "deviceInfo" TEXT NOT NULL DEFAULT '',
    "email" TEXT,
    "emailOtp" TEXT NOT NULL DEFAULT '',
    "emailOtpExpires" TIMESTAMP(3),
    "email_hash" TEXT,
    "firebaseUid" TEXT,
    "firstRegisteredRole" TEXT,
    "firstSubscriptionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "fullPhone" TEXT NOT NULL DEFAULT '',
    "googleId" TEXT,
    "hasPassword" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublicProfile" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isWhatsappSameAsMobile" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "location" JSONB,
    "longitude" DOUBLE PRECISION,
    "magicLinkExpires" TIMESTAMP(3),
    "magicLinkToken" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "nationalNumber" TEXT NOT NULL DEFAULT '',
    "panelAccess" JSONB,
    "partnerStatus" TEXT NOT NULL DEFAULT 'active',
    "password" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "passwordResetExpires" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "phone" TEXT,
    "phoneHistory" JSONB,
    "phoneVerification" JSONB,
    "phone_hash" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "profilePhoto" TEXT NOT NULL DEFAULT '',
    "profilePhotoApproval" JSONB,
    "providerProfileId" TEXT,
    "recruiterProfileId" TEXT,
    "referralCode" TEXT,
    "referralCodeUsed" TEXT NOT NULL DEFAULT '',
    "referralWalletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referredBy" TEXT,
    "referredByCode" TEXT NOT NULL DEFAULT '',
    "referredByPartnerId" TEXT,
    "referredUsersCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referrerType" TEXT,
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "renewalReminder2Sent" BOOLEAN NOT NULL DEFAULT false,
    "renewalReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "resumeApproval" JSONB,
    "role" TEXT,
    "roleIntent" TEXT NOT NULL DEFAULT 'provider',
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signupCashbackCredited" BOOLEAN NOT NULL DEFAULT false,
    "signupCashbackCreditedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'direct',
    "source_profile_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "subscriptionBadge" TEXT NOT NULL DEFAULT '',
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,
    "totalReferralCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReferrals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlockOtp" TEXT NOT NULL DEFAULT '',
    "unlockOtpExpires" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whatsappAlerts" BOOLEAN NOT NULL DEFAULT true,
    "whatsappConsent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNumber" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usersubscriptions" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "audience" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "billingCycle" TEXT NOT NULL DEFAULT '',
    "billingRuleSnapshot" JSONB,
    "boostMeta" JSONB,
    "cashbackAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMonths" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "endDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "monthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPlatformRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentId" TEXT NOT NULL DEFAULT '',
    "paymentStatus" TEXT NOT NULL DEFAULT '',
    "planCode" TEXT NOT NULL DEFAULT '',
    "planId" TEXT,
    "platformCommissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceSnapshot" JSONB,
    "priorityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerShareAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralCommissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlockCreditsRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlockCreditsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlockCreditsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usage" JSONB,
    "userId" TEXT NOT NULL,

    CONSTRAINT "usersubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visithistories" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "searchCity" TEXT NOT NULL DEFAULT '',
    "searchQuery" TEXT NOT NULL DEFAULT '',
    "searchSkill" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user" TEXT NOT NULL,
    "visitedProfile" TEXT,
    "visitedUser" TEXT,

    CONSTRAINT "visithistories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wageestimatecaches" (
    "id" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimate" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "pricingType" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wageestimatecaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallettransactions" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL DEFAULT '',
    "direction" TEXT NOT NULL DEFAULT 'credit',
    "sourceJobId" TEXT,
    "sourcePaymentId" TEXT,
    "sourceReferralId" TEXT,
    "sourceSubscriptionId" TEXT,
    "sourceUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'credited',
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "wallettransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapplogs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "templateName" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user" TEXT,

    CONSTRAINT "whatsapplogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawalrequests" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "withdrawalrequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspacechats" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messages" JSONB,
    "recruiterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspacechats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admincommissionsettings_key_key" ON "admincommissionsettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "adminsettings_key_key" ON "adminsettings"("key");

-- CreateIndex
CREATE INDEX "ai_analysis_results_user_id_idx" ON "ai_analysis_results"("user_id");

-- CreateIndex
CREATE INDEX "ai_analysis_results_feature_name_idx" ON "ai_analysis_results"("feature_name");

-- CreateIndex
CREATE INDEX "ai_analysis_results_input_hash_idx" ON "ai_analysis_results"("input_hash");

-- CreateIndex
CREATE INDEX "ai_analysis_results_status_idx" ON "ai_analysis_results"("status");

-- CreateIndex
CREATE INDEX "ai_analysis_results_input_hash_status_idx" ON "ai_analysis_results"("input_hash", "status");

-- CreateIndex
CREATE UNIQUE INDEX "aichatcaches_message_key" ON "aichatcaches"("message");

-- CreateIndex
CREATE UNIQUE INDEX "aievaluations_jobId_candidateId_key" ON "aievaluations"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "aifeaturecaches_fileHash_idx" ON "aifeaturecaches"("fileHash");

-- CreateIndex
CREATE INDEX "aifeaturecaches_featureName_idx" ON "aifeaturecaches"("featureName");

-- CreateIndex
CREATE INDEX "aifeaturecaches_createdAt_idx" ON "aifeaturecaches"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "aifeaturecaches_fileHash_featureName_key" ON "aifeaturecaches"("fileHash", "featureName");

-- CreateIndex
CREATE UNIQUE INDEX "aifeaturecontrols_featureKey_key" ON "aifeaturecontrols"("featureKey");

-- CreateIndex
CREATE INDEX "aifeaturecontrols_audience_idx" ON "aifeaturecontrols"("audience");

-- CreateIndex
CREATE INDEX "aiinteractionlogs_userId_idx" ON "aiinteractionlogs"("userId");

-- CreateIndex
CREATE INDEX "aiinteractionlogs_role_idx" ON "aiinteractionlogs"("role");

-- CreateIndex
CREATE INDEX "aiinteractionlogs_feature_idx" ON "aiinteractionlogs"("feature");

-- CreateIndex
CREATE INDEX "aiinteractionlogs_status_idx" ON "aiinteractionlogs"("status");

-- CreateIndex
CREATE INDEX "aiinteractionlogs_createdAt_idx" ON "aiinteractionlogs"("createdAt");

-- CreateIndex
CREATE INDEX "aiinteractionlogs_feature_createdAt_idx" ON "aiinteractionlogs"("feature", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_templates_feature_name_key" ON "ai_prompt_templates"("feature_name");

-- CreateIndex
CREATE INDEX "ai_prompt_templates_key_idx" ON "ai_prompt_templates"("key");

-- CreateIndex
CREATE INDEX "ai_prompt_templates_role_idx" ON "ai_prompt_templates"("role");

-- CreateIndex
CREATE INDEX "ai_prompt_templates_isActive_idx" ON "ai_prompt_templates"("isActive");

-- CreateIndex
CREATE INDEX "ai_prompt_templates_is_active_idx" ON "ai_prompt_templates"("is_active");

-- CreateIndex
CREATE INDEX "ai_prompt_templates_key_isActive_idx" ON "ai_prompt_templates"("key", "isActive");

-- CreateIndex
CREATE INDEX "ai_prompt_templates_feature_name_is_active_idx" ON "ai_prompt_templates"("feature_name", "is_active");

-- CreateIndex
CREATE INDEX "aiusagelogs_userId_idx" ON "aiusagelogs"("userId");

-- CreateIndex
CREATE INDEX "aiusagelogs_feature_idx" ON "aiusagelogs"("feature");

-- CreateIndex
CREATE INDEX "aiusagelogs_featureKey_idx" ON "aiusagelogs"("featureKey");

-- CreateIndex
CREATE INDEX "aiusagelogs_featureName_idx" ON "aiusagelogs"("featureName");

-- CreateIndex
CREATE INDEX "applications_provider_createdAt_idx" ON "applications"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "applications_jobPost_status_idx" ON "applications"("jobPost", "status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_jobPost_provider_key" ON "applications"("jobPost", "provider");

-- CreateIndex
CREATE INDEX "approvallogs_targetType_createdAt_idx" ON "approvallogs"("targetType", "createdAt");

-- CreateIndex
CREATE INDEX "approvallogs_actorId_createdAt_idx" ON "approvallogs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "auditevents_eventType_idx" ON "auditevents"("eventType");

-- CreateIndex
CREATE INDEX "auditevents_actorId_idx" ON "auditevents"("actorId");

-- CreateIndex
CREATE INDEX "auditevents_actorRole_idx" ON "auditevents"("actorRole");

-- CreateIndex
CREATE INDEX "auditevents_entityType_idx" ON "auditevents"("entityType");

-- CreateIndex
CREATE INDEX "auditevents_entityId_idx" ON "auditevents"("entityId");

-- CreateIndex
CREATE INDEX "auditevents_eventType_createdAt_idx" ON "auditevents"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "automationtasklogs_taskType_idx" ON "automationtasklogs"("taskType");

-- CreateIndex
CREATE INDEX "automationtasklogs_relatedEntityType_idx" ON "automationtasklogs"("relatedEntityType");

-- CreateIndex
CREATE INDEX "automationtasklogs_relatedEntityId_idx" ON "automationtasklogs"("relatedEntityId");

-- CreateIndex
CREATE INDEX "automationtasklogs_status_idx" ON "automationtasklogs"("status");

-- CreateIndex
CREATE INDEX "automationtasklogs_executedAt_idx" ON "automationtasklogs"("executedAt");

-- CreateIndex
CREATE INDEX "automationtasklogs_idempotencyKey_idx" ON "automationtasklogs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "automationtasklogs_taskType_relatedEntityType_relatedEntity_idx" ON "automationtasklogs"("taskType", "relatedEntityType", "relatedEntityId", "createdAt");

-- CreateIndex
CREATE INDEX "billingrules_isActive_idx" ON "billingrules"("isActive");

-- CreateIndex
CREATE INDEX "billingrules_isActive_version_idx" ON "billingrules"("isActive", "version");

-- CreateIndex
CREATE INDEX "billingrules_effectiveFrom_idx" ON "billingrules"("effectiveFrom");

-- CreateIndex
CREATE INDEX "boostsuggestions_providerId_idx" ON "boostsuggestions"("providerId");

-- CreateIndex
CREATE INDEX "boostsuggestions_status_idx" ON "boostsuggestions"("status");

-- CreateIndex
CREATE INDEX "boostsuggestions_scheduledFor_idx" ON "boostsuggestions"("scheduledFor");

-- CreateIndex
CREATE INDEX "boostsuggestions_providerId_status_createdAt_idx" ON "boostsuggestions"("providerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "candidatecareerversions_providerId_idx" ON "candidatecareerversions"("providerId");

-- CreateIndex
CREATE INDEX "candidatecareerversions_userId_idx" ON "candidatecareerversions"("userId");

-- CreateIndex
CREATE INDEX "candidatecareerversions_versionDate_idx" ON "candidatecareerversions"("versionDate");

-- CreateIndex
CREATE INDEX "candidatedigestlogs_candidate_idx" ON "candidatedigestlogs"("candidate");

-- CreateIndex
CREATE INDEX "candidatedigestlogs_date_idx" ON "candidatedigestlogs"("date");

-- CreateIndex
CREATE UNIQUE INDEX "candidatedigestlogs_candidate_date_key" ON "candidatedigestlogs"("candidate", "date");

-- CreateIndex
CREATE INDEX "candidatejobmatches_userId_idx" ON "candidatejobmatches"("userId");

-- CreateIndex
CREATE INDEX "candidatejobmatches_jobId_idx" ON "candidatejobmatches"("jobId");

-- CreateIndex
CREATE INDEX "candidatejobmatches_matchScore_idx" ON "candidatejobmatches"("matchScore");

-- CreateIndex
CREATE UNIQUE INDEX "candidatejobmatches_userId_jobId_key" ON "candidatejobmatches"("userId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "careerhealthcaches_fileHash_key" ON "careerhealthcaches"("fileHash");

-- CreateIndex
CREATE INDEX "careerhealthcaches_createdAt_idx" ON "careerhealthcaches"("createdAt");

-- CreateIndex
CREATE INDEX "chatconversations_userId_idx" ON "chatconversations"("userId");

-- CreateIndex
CREATE INDEX "chatconversations_role_idx" ON "chatconversations"("role");

-- CreateIndex
CREATE INDEX "chatconversations_status_idx" ON "chatconversations"("status");

-- CreateIndex
CREATE INDEX "chatconversations_lastMessageAt_idx" ON "chatconversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "chatconversations_userId_role_lastMessageAt_idx" ON "chatconversations"("userId", "role", "lastMessageAt");

-- CreateIndex
CREATE INDEX "chatmessages_conversationId_idx" ON "chatmessages"("conversationId");

-- CreateIndex
CREATE INDEX "chatmessages_userId_idx" ON "chatmessages"("userId");

-- CreateIndex
CREATE INDEX "chatmessages_role_idx" ON "chatmessages"("role");

-- CreateIndex
CREATE INDEX "chatmessages_author_idx" ON "chatmessages"("author");

-- CreateIndex
CREATE INDEX "chatmessages_status_idx" ON "chatmessages"("status");

-- CreateIndex
CREATE INDEX "chatmessages_clientMessageId_idx" ON "chatmessages"("clientMessageId");

-- CreateIndex
CREATE INDEX "chatmessages_parentMessageId_idx" ON "chatmessages"("parentMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "chatmessages_conversationId_clientMessageId_key" ON "chatmessages"("conversationId", "clientMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "citygeos_cityName_countryCode_key" ON "citygeos"("cityName", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "commissiontransactions_referralId_type_key" ON "commissiontransactions"("referralId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "companycontacts_companyId_email_key" ON "companycontacts"("companyId", "email");

-- CreateIndex
CREATE INDEX "companymasters_companyName_idx" ON "companymasters"("companyName");

-- CreateIndex
CREATE INDEX "companymasters_countryCode_idx" ON "companymasters"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "companymasters_externalId_source_key" ON "companymasters"("externalId", "source");

-- CreateIndex
CREATE INDEX "companysources_status_idx" ON "companysources"("status");

-- CreateIndex
CREATE INDEX "companysources_atsType_idx" ON "companysources"("atsType");

-- CreateIndex
CREATE UNIQUE INDEX "companysources_companyDomain_countryCode_key" ON "companysources"("companyDomain", "countryCode");

-- CreateIndex
CREATE INDEX "contactclicklogs_provider_createdAt_idx" ON "contactclicklogs"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "contactclicklogs_user_createdAt_idx" ON "contactclicklogs"("user", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "countryconfigs_countryCode_key" ON "countryconfigs"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "countrypipelineconfigs_countryCode_key" ON "countrypipelineconfigs"("countryCode");

-- CreateIndex
CREATE INDEX "customvisibilityplans_providerId_status_idx" ON "customvisibilityplans"("providerId", "status");

-- CreateIndex
CREATE INDEX "customvisibilityplans_subscriptionId_idx" ON "customvisibilityplans"("subscriptionId");

-- CreateIndex
CREATE INDEX "demandsnapshots_skill_idx" ON "demandsnapshots"("skill");

-- CreateIndex
CREATE INDEX "demandsnapshots_city_idx" ON "demandsnapshots"("city");

-- CreateIndex
CREATE INDEX "demandsnapshots_snapshotDate_idx" ON "demandsnapshots"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "demandsnapshots_skill_city_snapshotDate_key" ON "demandsnapshots"("skill", "city", "snapshotDate");

-- CreateIndex
CREATE INDEX "documentverificationresults_providerId_idx" ON "documentverificationresults"("providerId");

-- CreateIndex
CREATE INDEX "documentverificationresults_documentType_idx" ON "documentverificationresults"("documentType");

-- CreateIndex
CREATE INDEX "documentverificationresults_status_idx" ON "documentverificationresults"("status");

-- CreateIndex
CREATE INDEX "documentverificationresults_providerId_status_createdAt_idx" ON "documentverificationresults"("providerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "externaljobs_duplicateHash_key" ON "externaljobs"("duplicateHash");

-- CreateIndex
CREATE UNIQUE INDEX "externaljobs_seoSlug_key" ON "externaljobs"("seoSlug");

-- CreateIndex
CREATE INDEX "externaljobs_countryCode_category_city_idx" ON "externaljobs"("countryCode", "category", "city");

-- CreateIndex
CREATE INDEX "externaljobs_isActive_idx" ON "externaljobs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "externaljobs_source_externalJobId_key" ON "externaljobs"("source", "externalJobId");

-- CreateIndex
CREATE UNIQUE INDEX "featureflags_key_key" ON "featureflags"("key");

-- CreateIndex
CREATE INDEX "featureflags_enabled_idx" ON "featureflags"("enabled");

-- CreateIndex
CREATE INDEX "featureflags_scope_idx" ON "featureflags"("scope");

-- CreateIndex
CREATE INDEX "fraudflags_userId_idx" ON "fraudflags"("userId");

-- CreateIndex
CREATE INDEX "fraudflags_severity_idx" ON "fraudflags"("severity");

-- CreateIndex
CREATE INDEX "fraudflags_source_idx" ON "fraudflags"("source");

-- CreateIndex
CREATE INDEX "fraudflags_status_idx" ON "fraudflags"("status");

-- CreateIndex
CREATE INDEX "fraudflags_userId_status_createdAt_idx" ON "fraudflags"("userId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "geonamescities_geonameId_key" ON "geonamescities"("geonameId");

-- CreateIndex
CREATE INDEX "geonamescities_countryCode_idx" ON "geonamescities"("countryCode");

-- CreateIndex
CREATE INDEX "geonamescities_admin1Name_idx" ON "geonamescities"("admin1Name");

-- CreateIndex
CREATE INDEX "geonamescities_name_idx" ON "geonamescities"("name");

-- CreateIndex
CREATE INDEX "geonamescities_countryCode_name_idx" ON "geonamescities"("countryCode", "name");

-- CreateIndex
CREATE UNIQUE INDEX "income_path_caches_cacheKey_key" ON "income_path_caches"("cacheKey");

-- CreateIndex
CREATE INDEX "income_path_caches_expiresAt_idx" ON "income_path_caches"("expiresAt");

-- CreateIndex
CREATE INDEX "income_path_caches_userId_weekKey_profileVersion_idx" ON "income_path_caches"("userId", "weekKey", "profileVersion");

-- CreateIndex
CREATE UNIQUE INDEX "jobanalyticsmetrics_jobId_key" ON "jobanalyticsmetrics"("jobId");

-- CreateIndex
CREATE INDEX "jobmatches_jobId_idx" ON "jobmatches"("jobId");

-- CreateIndex
CREATE INDEX "jobmatches_providerId_idx" ON "jobmatches"("providerId");

-- CreateIndex
CREATE INDEX "jobmatches_matchScore_idx" ON "jobmatches"("matchScore");

-- CreateIndex
CREATE INDEX "jobmatches_responseStatus_idx" ON "jobmatches"("responseStatus");

-- CreateIndex
CREATE UNIQUE INDEX "jobmatches_jobId_providerId_key" ON "jobmatches"("jobId", "providerId");

-- CreateIndex
CREATE INDEX "jobposts_urgency_idx" ON "jobposts"("urgency");

-- CreateIndex
CREATE INDEX "jobposts_duplicateHash_idx" ON "jobposts"("duplicateHash");

-- CreateIndex
CREATE INDEX "jobposts_seoSlug_idx" ON "jobposts"("seoSlug");

-- CreateIndex
CREATE INDEX "jobposts_skill_city_idx" ON "jobposts"("skill", "city");

-- CreateIndex
CREATE INDEX "jobposts_recruiter_idx" ON "jobposts"("recruiter");

-- CreateIndex
CREATE INDEX "jobposts_source_externalJobId_idx" ON "jobposts"("source", "externalJobId");

-- CreateIndex
CREATE INDEX "jobposts_countryCode_category_city_idx" ON "jobposts"("countryCode", "category", "city");

-- CreateIndex
CREATE UNIQUE INDEX "jobposts_externalUrl_key" ON "jobposts"("externalUrl");

-- CreateIndex
CREATE UNIQUE INDEX "jobroles_roleName_key" ON "jobroles"("roleName");

-- CreateIndex
CREATE INDEX "jobsearchintents_normalizedQuery_idx" ON "jobsearchintents"("normalizedQuery");

-- CreateIndex
CREATE INDEX "jobsearchintents_extractedSkill_idx" ON "jobsearchintents"("extractedSkill");

-- CreateIndex
CREATE INDEX "jobsearchintents_extractedCity_idx" ON "jobsearchintents"("extractedCity");

-- CreateIndex
CREATE INDEX "jobsearchintents_confidence_idx" ON "jobsearchintents"("confidence");

-- CreateIndex
CREATE INDEX "jobsearchintents_sourceUserId_idx" ON "jobsearchintents"("sourceUserId");

-- CreateIndex
CREATE INDEX "jobsearchintents_extractedSkill_extractedCity_createdAt_idx" ON "jobsearchintents"("extractedSkill", "extractedCity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "jobsourceconfigs_sourceName_key" ON "jobsourceconfigs"("sourceName");

-- CreateIndex
CREATE INDEX "leads_sourceType_idx" ON "leads"("sourceType");

-- CreateIndex
CREATE INDEX "leads_assignedByEngine_idx" ON "leads"("assignedByEngine");

-- CreateIndex
CREATE INDEX "leads_confirmationStatus_idx" ON "leads"("confirmationStatus");

-- CreateIndex
CREATE INDEX "leads_provider_status_idx" ON "leads"("provider", "status");

-- CreateIndex
CREATE INDEX "leads_recruiter_idx" ON "leads"("recruiter");

-- CreateIndex
CREATE UNIQUE INDEX "leads_provider_recruiter_jobPost_key" ON "leads"("provider", "recruiter", "jobPost");

-- CreateIndex
CREATE INDEX "leaddistributionlogs_distributionBatchId_idx" ON "leaddistributionlogs"("distributionBatchId");

-- CreateIndex
CREATE INDEX "leaddistributionlogs_jobId_idx" ON "leaddistributionlogs"("jobId");

-- CreateIndex
CREATE INDEX "leaddistributionlogs_recruiterId_idx" ON "leaddistributionlogs"("recruiterId");

-- CreateIndex
CREATE INDEX "leaddistributionlogs_intentId_idx" ON "leaddistributionlogs"("intentId");

-- CreateIndex
CREATE INDEX "leaddistributionlogs_providerId_idx" ON "leaddistributionlogs"("providerId");

-- CreateIndex
CREATE INDEX "leaddistributionlogs_status_idx" ON "leaddistributionlogs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "leaddistributionlogs_distributionBatchId_providerId_key" ON "leaddistributionlogs"("distributionBatchId", "providerId");

-- CreateIndex
CREATE INDEX "leadevents_leadId_idx" ON "leadevents"("leadId");

-- CreateIndex
CREATE INDEX "leadevents_eventType_idx" ON "leadevents"("eventType");

-- CreateIndex
CREATE INDEX "leadevents_timestamp_idx" ON "leadevents"("timestamp");

-- CreateIndex
CREATE INDEX "leadevents_leadId_eventType_timestamp_idx" ON "leadevents"("leadId", "eventType", "timestamp");

-- CreateIndex
CREATE INDEX "learnedselectors_domain_idx" ON "learnedselectors"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "learnedselectors_domain_field_key" ON "learnedselectors"("domain", "field");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "matchlogs_jobId_idx" ON "matchlogs"("jobId");

-- CreateIndex
CREATE INDEX "matchlogs_providerId_idx" ON "matchlogs"("providerId");

-- CreateIndex
CREATE INDEX "matchlogs_recruiterId_idx" ON "matchlogs"("recruiterId");

-- CreateIndex
CREATE INDEX "matchlogs_alertType_idx" ON "matchlogs"("alertType");

-- CreateIndex
CREATE UNIQUE INDEX "matchlogs_jobId_providerId_alertType_key" ON "matchlogs"("jobId", "providerId", "alertType");

-- CreateIndex
CREATE UNIQUE INDEX "newslettersubscribers_email_key" ON "newslettersubscribers"("email");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_automationSource_idx" ON "notifications"("automationSource");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "otps_expiresAt_idx" ON "otps"("expiresAt");

-- CreateIndex
CREATE INDEX "otps_createdAt_idx" ON "otps"("createdAt");

-- CreateIndex
CREATE INDEX "otps_userId_purpose_idx" ON "otps"("userId", "purpose");

-- CreateIndex
CREATE INDEX "otps_target_purpose_idx" ON "otps"("target", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "partnerbankaccounts_partnerId_key" ON "partnerbankaccounts"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "partnerprofiles_referralCode_key" ON "partnerprofiles"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "partnerprofiles_userId_key" ON "partnerprofiles"("userId");

-- CreateIndex
CREATE INDEX "partnerrewards_partner_status_idx" ON "partnerrewards"("partner", "status");

-- CreateIndex
CREATE INDEX "partnerrewards_referral_idx" ON "partnerrewards"("referral");

-- CreateIndex
CREATE INDEX "partnerrewards_month_year_idx" ON "partnerrewards"("month", "year");

-- CreateIndex
CREATE INDEX "payments_user_idx" ON "payments"("user");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeSessionId_key" ON "payments"("stripeSessionId");

-- CreateIndex
CREATE INDEX "payoutmethods_userId_idx" ON "payoutmethods"("userId");

-- CreateIndex
CREATE INDEX "payoutrequests_partnerId_status_idx" ON "payoutrequests"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pipelinecategories_name_key" ON "pipelinecategories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pipelinecompanymasters_canonicalName_key" ON "pipelinecompanymasters"("canonicalName");

-- CreateIndex
CREATE UNIQUE INDEX "pipelinelocationmasters_canonicalName_key" ON "pipelinelocationmasters"("canonicalName");

-- CreateIndex
CREATE UNIQUE INDEX "pipelinelocationmasters_normalizedKey_key" ON "pipelinelocationmasters"("normalizedKey");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plans_type_slug_duration_key" ON "plans"("type", "slug", "duration");

-- CreateIndex
CREATE UNIQUE INDEX "plans_type_slug_duration_country_billingCycle_key" ON "plans"("type", "slug", "duration", "country", "billingCycle");

-- CreateIndex
CREATE INDEX "plans_type_isProviderDefault_status_idx" ON "plans"("type", "isProviderDefault", "status");

-- CreateIndex
-- CreateIndex
CREATE UNIQUE INDEX "profilesharetokens_token_key" ON "profilesharetokens"("token");

-- CreateIndex
CREATE INDEX "profilesharetokens_candidateId_idx" ON "profilesharetokens"("candidateId");

-- CreateIndex
CREATE INDEX "profilesharetokens_isRevoked_idx" ON "profilesharetokens"("isRevoked");

-- CreateIndex
CREATE INDEX "profileunlocks_recruiterId_idx" ON "profileunlocks"("recruiterId");

-- CreateIndex
CREATE INDEX "profileunlocks_providerId_idx" ON "profileunlocks"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "profileunlocks_recruiterId_providerId_key" ON "profileunlocks"("recruiterId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "provideraiprofiles_providerId_key" ON "provideraiprofiles"("providerId");

-- CreateIndex
CREATE INDEX "provideraiprofiles_status_idx" ON "provideraiprofiles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "provideraiusages_providerId_subscriptionId_periodStart_peri_key" ON "provideraiusages"("providerId", "subscriptionId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "provideravailabilities_providerId_key" ON "provideravailabilities"("providerId");

-- CreateIndex
CREATE INDEX "provideravailabilities_isAvailableNow_idx" ON "provideravailabilities"("isAvailableNow");

-- CreateIndex
CREATE INDEX "provideravailabilities_isAvailableNow_updatedAt_idx" ON "provideravailabilities"("isAvailableNow", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "providerembeddings_providerId_key" ON "providerembeddings"("providerId");

-- CreateIndex
CREATE INDEX "providerembeddings_providerId_updatedAt_idx" ON "providerembeddings"("providerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "providermetrics_providerId_key" ON "providermetrics"("providerId");

-- CreateIndex
CREATE INDEX "providermetrics_providerId_rankingScore_idx" ON "providermetrics"("providerId", "rankingScore");

-- CreateIndex
CREATE UNIQUE INDEX "providerprofiles_user_key" ON "providerprofiles"("user");

-- CreateIndex
CREATE INDEX "providerprofiles_city_idx" ON "providerprofiles"("city");

-- CreateIndex
CREATE INDEX "providerprofiles_tier_idx" ON "providerprofiles"("tier");

-- CreateIndex
CREATE INDEX "providerprofiles_boostWeight_idx" ON "providerprofiles"("boostWeight");

-- CreateIndex
CREATE INDEX "providerprofiles_latitude_longitude_idx" ON "providerprofiles"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "providerprofiles_user_rankingScore_idx" ON "providerprofiles"("user", "rankingScore");

-- CreateIndex
CREATE INDEX "providerserviceareas_providerId_idx" ON "providerserviceareas"("providerId");

-- CreateIndex
CREATE INDEX "providerserviceareas_city_idx" ON "providerserviceareas"("city");

-- CreateIndex
CREATE INDEX "providerserviceareas_locality_idx" ON "providerserviceareas"("locality");

-- CreateIndex
CREATE INDEX "providerserviceareas_providerId_city_locality_idx" ON "providerserviceareas"("providerId", "city", "locality");

-- CreateIndex
CREATE INDEX "providersubscriptions_providerId_subscriptionStatus_endDate_idx" ON "providersubscriptions"("providerId", "subscriptionStatus", "endDate");

-- CreateIndex
CREATE INDEX "providersubscriptions_paymentStatus_createdAt_idx" ON "providersubscriptions"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "providersubscriptions_planId_createdAt_idx" ON "providersubscriptions"("planId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "providerusages_providerId_subscriptionId_periodStart_period_key" ON "providerusages"("providerId", "subscriptionId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "providerwallets_userId_key" ON "providerwallets"("userId");

-- CreateIndex
CREATE INDEX "providerwallettransactions_userId_idx" ON "providerwallettransactions"("userId");

-- CreateIndex
CREATE INDEX "providerwallettransactions_userId_createdAt_idx" ON "providerwallettransactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "providerwithdrawals_userId_idx" ON "providerwithdrawals"("userId");

-- CreateIndex
CREATE INDEX "providerwithdrawals_status_idx" ON "providerwithdrawals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "recruiteraiusages_recruiterId_subscriptionId_periodStart_pe_key" ON "recruiteraiusages"("recruiterId", "subscriptionId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "recruitercvviewtrackers_recruiterId_idx" ON "recruitercvviewtrackers"("recruiterId");

-- CreateIndex
CREATE UNIQUE INDEX "recruitercvviewtrackers_recruiterId_candidateId_key" ON "recruitercvviewtrackers"("recruiterId", "candidateId");

-- CreateIndex
CREATE INDEX "recruiterhireembeddings_recruiterId_idx" ON "recruiterhireembeddings"("recruiterId");

-- CreateIndex
CREATE INDEX "recruiterhireembeddings_sourceType_idx" ON "recruiterhireembeddings"("sourceType");

-- CreateIndex
CREATE INDEX "recruiterhireembeddings_recruiterId_sourceType_createdAt_idx" ON "recruiterhireembeddings"("recruiterId", "sourceType", "createdAt");

-- CreateIndex
CREATE INDEX "recruiterleads_status_idx" ON "recruiterleads"("status");

-- CreateIndex
CREATE INDEX "recruiterleads_hiringLevel_idx" ON "recruiterleads"("hiringLevel");

-- CreateIndex
CREATE UNIQUE INDEX "recruiterleads_companyDomain_countryCode_key" ON "recruiterleads"("companyDomain", "countryCode");

-- CreateIndex
CREATE INDEX "recruiterleadtrackers_recruiterId_idx" ON "recruiterleadtrackers"("recruiterId");

-- CreateIndex
CREATE UNIQUE INDEX "recruiterleadtrackers_recruiterId_candidateId_key" ON "recruiterleadtrackers"("recruiterId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "recruiterprofiles_user_key" ON "recruiterprofiles"("user");

-- CreateIndex
CREATE INDEX "recruitersearchlogs_recruiterId_idx" ON "recruitersearchlogs"("recruiterId");

-- CreateIndex
CREATE INDEX "recruitersearchlogs_hiredProviderId_idx" ON "recruitersearchlogs"("hiredProviderId");

-- CreateIndex
CREATE INDEX "recruitersearchlogs_wasSuccessful_idx" ON "recruitersearchlogs"("wasSuccessful");

-- CreateIndex
CREATE INDEX "recruitersearchlogs_recruiterId_createdAt_idx" ON "recruitersearchlogs"("recruiterId", "createdAt");

-- CreateIndex
CREATE INDEX "recruitersubscriptions_recruiterId_subscriptionStatus_endDa_idx" ON "recruitersubscriptions"("recruiterId", "subscriptionStatus", "endDate");

-- CreateIndex
CREATE INDEX "recruitersubscriptions_paymentStatus_createdAt_idx" ON "recruitersubscriptions"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "recruitersubscriptions_planId_createdAt_idx" ON "recruitersubscriptions"("planId", "createdAt");

-- CreateIndex
CREATE INDEX "referrals_referrerId_status_idx" ON "referrals"("referrerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredUserId_referrerId_key" ON "referrals"("referredUserId", "referrerId");

-- CreateIndex
CREATE INDEX "refundrequests_userId_createdAt_idx" ON "refundrequests"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "refundrequests_status_idx" ON "refundrequests"("status");

-- CreateIndex
CREATE INDEX "repeathireinsights_recruiterId_idx" ON "repeathireinsights"("recruiterId");

-- CreateIndex
CREATE INDEX "repeathireinsights_providerId_idx" ON "repeathireinsights"("providerId");

-- CreateIndex
CREATE INDEX "repeathireinsights_skillId_idx" ON "repeathireinsights"("skillId");

-- CreateIndex
CREATE INDEX "repeathireinsights_city_idx" ON "repeathireinsights"("city");

-- CreateIndex
CREATE UNIQUE INDEX "repeathireinsights_recruiterId_providerId_key" ON "repeathireinsights"("recruiterId", "providerId");

-- CreateIndex
CREATE INDEX "resumeaccesslogs_recruiterId_idx" ON "resumeaccesslogs"("recruiterId");

-- CreateIndex
CREATE INDEX "resumeaccesslogs_candidateId_idx" ON "resumeaccesslogs"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "resumefilecaches_fileHash_key" ON "resumefilecaches"("fileHash");

-- CreateIndex
CREATE INDEX "resumefilecaches_createdAt_idx" ON "resumefilecaches"("createdAt");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "reviews_revieweeId_idx" ON "reviews"("revieweeId");

-- CreateIndex
CREATE INDEX "reviews_provider_idx" ON "reviews"("provider");

-- CreateIndex
CREATE INDEX "reviews_revieweeId_createdAt_idx" ON "reviews"("revieweeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewerId_revieweeId_leadId_key" ON "reviews"("reviewerId", "revieweeId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "rotationpools_skill_city_key" ON "rotationpools"("skill", "city");

-- CreateIndex
CREATE UNIQUE INDEX "savedjobs_provider_jobPost_externalJob_key" ON "savedjobs"("provider", "jobPost", "externalJob");

-- CreateIndex
CREATE UNIQUE INDEX "scrapercaches_url_key" ON "scrapercaches"("url");

-- CreateIndex
CREATE INDEX "scrapercaches_createdAt_idx" ON "scrapercaches"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "seometas_page_slug_key" ON "seometas"("page_slug");

-- CreateIndex
CREATE UNIQUE INDEX "seopages_slug_key" ON "seopages"("slug");

-- CreateIndex
CREATE INDEX "seopages_city_idx" ON "seopages"("city");

-- CreateIndex
CREATE INDEX "seopages_keyword_idx" ON "seopages"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "skillcategories_tier_slug_key" ON "skillcategories"("tier", "slug");

-- CreateIndex
CREATE INDEX "skillgapreports_candidateId_idx" ON "skillgapreports"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "skillgapreports_candidateId_reportDate_key" ON "skillgapreports"("candidateId", "reportDate");

-- CreateIndex
CREATE INDEX "skillsynonyms_canonicalSkillId_idx" ON "skillsynonyms"("canonicalSkillId");

-- CreateIndex
CREATE INDEX "skillsynonyms_normalizedLabel_idx" ON "skillsynonyms"("normalizedLabel");

-- CreateIndex
CREATE INDEX "skillsynonyms_locale_idx" ON "skillsynonyms"("locale");

-- CreateIndex
CREATE INDEX "skillsynonyms_status_idx" ON "skillsynonyms"("status");

-- CreateIndex
CREATE UNIQUE INDEX "skillsynonyms_canonicalSkillId_normalizedLabel_locale_key" ON "skillsynonyms"("canonicalSkillId", "normalizedLabel", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "stagingcandidates_claimToken_key" ON "stagingcandidates"("claimToken");

-- CreateIndex
CREATE INDEX "stagingcandidates_claimExpiresAt_idx" ON "stagingcandidates"("claimExpiresAt");

-- CreateIndex
CREATE INDEX "synclogs_startedAt_idx" ON "synclogs"("startedAt");

-- CreateIndex
CREATE INDEX "synclogs_source_status_idx" ON "synclogs"("source", "status");

-- CreateIndex
CREATE INDEX "systemcostlogs_timestamp_idx" ON "systemcostlogs"("timestamp");

-- CreateIndex
CREATE INDEX "translationcaches_targetLanguage_idx" ON "translationcaches"("targetLanguage");

-- CreateIndex
CREATE UNIQUE INDEX "translationcaches_originalText_targetLanguage_key" ON "translationcaches"("originalText", "targetLanguage");

-- CreateIndex
CREATE UNIQUE INDEX "trustscores_providerId_key" ON "trustscores"("providerId");

-- CreateIndex
CREATE INDEX "trustscores_score_idx" ON "trustscores"("score");

-- CreateIndex
CREATE INDEX "trustscores_computedAt_idx" ON "trustscores"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_phone_hash_idx" ON "users"("phone_hash");

-- CreateIndex
CREATE INDEX "users_email_hash_idx" ON "users"("email_hash");

-- CreateIndex
CREATE INDEX "users_source_profile_url_idx" ON "users"("source_profile_url");

-- CreateIndex
CREATE INDEX "users_claimToken_idx" ON "users"("claimToken");

-- CreateIndex
CREATE INDEX "users_activeRole_idx" ON "users"("activeRole");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_approvalStatus_idx" ON "users"("approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_hash_source_profile_url_key" ON "users"("phone_hash", "source_profile_url");

-- CreateIndex
CREATE INDEX "usersubscriptions_userId_role_status_idx" ON "usersubscriptions"("userId", "role", "status");

-- CreateIndex
CREATE INDEX "usersubscriptions_userId_role_createdAt_idx" ON "usersubscriptions"("userId", "role", "createdAt");

-- CreateIndex
CREATE INDEX "usersubscriptions_endDate_status_idx" ON "usersubscriptions"("endDate", "status");

-- CreateIndex
CREATE INDEX "visithistories_user_createdAt_idx" ON "visithistories"("user", "createdAt");

-- CreateIndex
CREATE INDEX "visithistories_visitedUser_createdAt_idx" ON "visithistories"("visitedUser", "createdAt");

-- CreateIndex
CREATE INDEX "wageestimatecaches_expiresAt_idx" ON "wageestimatecaches"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "wageestimatecaches_cityName_pricingType_skill_key" ON "wageestimatecaches"("cityName", "pricingType", "skill");

-- CreateIndex
CREATE INDEX "wallettransactions_userId_createdAt_idx" ON "wallettransactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "workspacechats_recruiterId_updatedAt_idx" ON "workspacechats"("recruiterId", "updatedAt");

-- AddForeignKey
ALTER TABLE "ai_analysis_results" ADD CONSTRAINT "ai_analysis_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aievaluations" ADD CONSTRAINT "aievaluations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aievaluations" ADD CONSTRAINT "aievaluations_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "providerprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aiinteractionlogs" ADD CONSTRAINT "aiinteractionlogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_prompt_templates" ADD CONSTRAINT "ai_prompt_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aiusagelogs" ADD CONSTRAINT "aiusagelogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobPost_fkey" FOREIGN KEY ("jobPost") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_provider_fkey" FOREIGN KEY ("provider") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvallogs" ADD CONSTRAINT "approvallogs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvallogs" ADD CONSTRAINT "approvallogs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditevents" ADD CONSTRAINT "auditevents_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billingrules" ADD CONSTRAINT "billingrules_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boostsuggestions" ADD CONSTRAINT "boostsuggestions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidateactivitylogs" ADD CONSTRAINT "candidateactivitylogs_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "stagingcandidates"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatecareerversions" ADD CONSTRAINT "candidatecareerversions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providerprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatecareerversions" ADD CONSTRAINT "candidatecareerversions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatedigestlogs" ADD CONSTRAINT "candidatedigestlogs_candidate_fkey" FOREIGN KEY ("candidate") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatejobmatches" ADD CONSTRAINT "candidatejobmatches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorysuggestions" ADD CONSTRAINT "categorysuggestions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatconversations" ADD CONSTRAINT "chatconversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatmessages" ADD CONSTRAINT "chatmessages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chatconversations"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatmessages" ADD CONSTRAINT "chatmessages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatmessages" ADD CONSTRAINT "chatmessages_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "chatmessages"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissiontransactions" ADD CONSTRAINT "commissiontransactions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissiontransactions" ADD CONSTRAINT "commissiontransactions_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissiontransactions" ADD CONSTRAINT "commissiontransactions_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissiontransactions" ADD CONSTRAINT "commissiontransactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "usersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissiontransactions" ADD CONSTRAINT "commissiontransactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companyaliassuggestions" ADD CONSTRAINT "companyaliassuggestions_suggestedCompanyId_fkey" FOREIGN KEY ("suggestedCompanyId") REFERENCES "pipelinecompanymasters"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companycontacts" ADD CONSTRAINT "companycontacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companymasters"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactclicklogs" ADD CONSTRAINT "contactclicklogs_provider_fkey" FOREIGN KEY ("provider") REFERENCES "providerprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactclicklogs" ADD CONSTRAINT "contactclicklogs_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "countryconfigs" ADD CONSTRAINT "countryconfigs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customplanrequests" ADD CONSTRAINT "customplanrequests_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customvisibilityplans" ADD CONSTRAINT "customvisibilityplans_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customvisibilityplans" ADD CONSTRAINT "customvisibilityplans_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "providersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentverificationresults" ADD CONSTRAINT "documentverificationresults_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentverificationresults" ADD CONSTRAINT "documentverificationresults_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicategroups" ADD CONSTRAINT "duplicategroups_canonicalJobId_fkey" FOREIGN KEY ("canonicalJobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraudflags" ADD CONSTRAINT "fraudflags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelancercontactconsentrequests" ADD CONSTRAINT "freelancercontactconsentrequests_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelancercontactconsentrequests" ADD CONSTRAINT "freelancercontactconsentrequests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelancercontactconsentrequests" ADD CONSTRAINT "freelancercontactconsentrequests_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "pipelineauditlogs"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importbatches" ADD CONSTRAINT "importbatches_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_path_caches" ADD CONSTRAINT "income_path_caches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobanalyticsevents" ADD CONSTRAINT "jobanalyticsevents_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobanalyticsevents" ADD CONSTRAINT "jobanalyticsevents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobanalyticsmetrics" ADD CONSTRAINT "jobanalyticsmetrics_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobmatches" ADD CONSTRAINT "jobmatches_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobmatches" ADD CONSTRAINT "jobmatches_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobposts" ADD CONSTRAINT "jobposts_recruiter_fkey" FOREIGN KEY ("recruiter") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobsearchintents" ADD CONSTRAINT "jobsearchintents_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobsourceversions" ADD CONSTRAINT "jobsourceversions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobsourceversions" ADD CONSTRAINT "jobsourceversions_duplicateGroupId_fkey" FOREIGN KEY ("duplicateGroupId") REFERENCES "duplicategroups"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsearchscanruns" ADD CONSTRAINT "jsearchscanruns_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_provider_fkey" FOREIGN KEY ("provider") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_recruiter_fkey" FOREIGN KEY ("recruiter") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_jobPost_fkey" FOREIGN KEY ("jobPost") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaddistributionlogs" ADD CONSTRAINT "leaddistributionlogs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaddistributionlogs" ADD CONSTRAINT "leaddistributionlogs_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaddistributionlogs" ADD CONSTRAINT "leaddistributionlogs_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "jobsearchintents"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaddistributionlogs" ADD CONSTRAINT "leaddistributionlogs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadevents" ADD CONSTRAINT "leadevents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadevents" ADD CONSTRAINT "leadevents_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchlogs" ADD CONSTRAINT "matchlogs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchlogs" ADD CONSTRAINT "matchlogs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchlogs" ADD CONSTRAINT "matchlogs_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otps" ADD CONSTRAINT "otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreachcampaigns" ADD CONSTRAINT "outreachcampaigns_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreachcampaigns" ADD CONSTRAINT "outreachcampaigns_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnerbankaccounts" ADD CONSTRAINT "partnerbankaccounts_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnerbankaccounts" ADD CONSTRAINT "partnerbankaccounts_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnerprofiles" ADD CONSTRAINT "partnerprofiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnerprofiles" ADD CONSTRAINT "partnerprofiles_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnerrewards" ADD CONSTRAINT "partnerrewards_partner_fkey" FOREIGN KEY ("partner") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnerrewards" ADD CONSTRAINT "partnerrewards_referral_fkey" FOREIGN KEY ("referral") REFERENCES "referrals"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnerrewards" ADD CONSTRAINT "partnerrewards_referredUser_fkey" FOREIGN KEY ("referredUser") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_fkey" FOREIGN KEY ("plan") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payoutmethods" ADD CONSTRAINT "payoutmethods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payoutrequests" ADD CONSTRAINT "payoutrequests_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payoutrequests" ADD CONSTRAINT "payoutrequests_partnerProfileId_fkey" FOREIGN KEY ("partnerProfileId") REFERENCES "partnerprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payoutrequests" ADD CONSTRAINT "payoutrequests_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelineauditlogs" ADD CONSTRAINT "pipelineauditlogs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelineautomations" ADD CONSTRAINT "pipelineautomations_configId_fkey" FOREIGN KEY ("configId") REFERENCES "datasourceconfigs"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelinecategories" ADD CONSTRAINT "pipelinecategories_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelinejobs" ADD CONSTRAINT "pipelinejobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companymasters"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelinejobs" ADD CONSTRAINT "pipelinejobs_canonicalSourceVersionId_fkey" FOREIGN KEY ("canonicalSourceVersionId") REFERENCES "jobsourceversions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelinejobs" ADD CONSTRAINT "pipelinejobs_duplicateGroupId_fkey" FOREIGN KEY ("duplicateGroupId") REFERENCES "duplicategroups"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profilesharetokens" ADD CONSTRAINT "profilesharetokens_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profilesharetokens" ADD CONSTRAINT "profilesharetokens_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profileunlocks" ADD CONSTRAINT "profileunlocks_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profileunlocks" ADD CONSTRAINT "profileunlocks_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profileunlocks" ADD CONSTRAINT "profileunlocks_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profileunlocks" ADD CONSTRAINT "profileunlocks_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profileunlocks" ADD CONSTRAINT "profileunlocks_sourcePlanId_fkey" FOREIGN KEY ("sourcePlanId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profileunlocks" ADD CONSTRAINT "profileunlocks_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "usersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provideraiprofiles" ADD CONSTRAINT "provideraiprofiles_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provideraiusages" ADD CONSTRAINT "provideraiusages_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provideraiusages" ADD CONSTRAINT "provideraiusages_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "providersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provideravailabilities" ADD CONSTRAINT "provideravailabilities_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerembeddings" ADD CONSTRAINT "providerembeddings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providermetrics" ADD CONSTRAINT "providermetrics_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerprofiles" ADD CONSTRAINT "providerprofiles_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerprofiles" ADD CONSTRAINT "providerprofiles_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerprofiles" ADD CONSTRAINT "providerprofiles_activePlanId_fkey" FOREIGN KEY ("activePlanId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerprofiles" ADD CONSTRAINT "providerprofiles_activeSubscriptionId_fkey" FOREIGN KEY ("activeSubscriptionId") REFERENCES "providersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerserviceareas" ADD CONSTRAINT "providerserviceareas_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providersubscriptions" ADD CONSTRAINT "providersubscriptions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providersubscriptions" ADD CONSTRAINT "providersubscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerusages" ADD CONSTRAINT "providerusages_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerusages" ADD CONSTRAINT "providerusages_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "providersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerwallets" ADD CONSTRAINT "providerwallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerwallettransactions" ADD CONSTRAINT "providerwallettransactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "providerwallets"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerwallettransactions" ADD CONSTRAINT "providerwallettransactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerwithdrawals" ADD CONSTRAINT "providerwithdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerwithdrawals" ADD CONSTRAINT "providerwithdrawals_payoutMethodId_fkey" FOREIGN KEY ("payoutMethodId") REFERENCES "payoutmethods"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providerwithdrawals" ADD CONSTRAINT "providerwithdrawals_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rawjobimports" ADD CONSTRAINT "rawjobimports_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "jsearchscanruns"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiteraiusages" ADD CONSTRAINT "recruiteraiusages_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiteraiusages" ADD CONSTRAINT "recruiteraiusages_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "usersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitercvviewtrackers" ADD CONSTRAINT "recruitercvviewtrackers_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitercvviewtrackers" ADD CONSTRAINT "recruitercvviewtrackers_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "providerprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiterhireembeddings" ADD CONSTRAINT "recruiterhireembeddings_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiterleadtrackers" ADD CONSTRAINT "recruiterleadtrackers_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiterleadtrackers" ADD CONSTRAINT "recruiterleadtrackers_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "providerprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiterprofiles" ADD CONSTRAINT "recruiterprofiles_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiterprofiles" ADD CONSTRAINT "recruiterprofiles_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitersearchlogs" ADD CONSTRAINT "recruitersearchlogs_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitersearchlogs" ADD CONSTRAINT "recruitersearchlogs_hiredProviderId_fkey" FOREIGN KEY ("hiredProviderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitersubscriptions" ADD CONSTRAINT "recruitersubscriptions_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitersubscriptions" ADD CONSTRAINT "recruitersubscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_partnerProfileId_fkey" FOREIGN KEY ("partnerProfileId") REFERENCES "partnerprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_selectedPlanId_fkey" FOREIGN KEY ("selectedPlanId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_firstSubscriptionId_fkey" FOREIGN KEY ("firstSubscriptionId") REFERENCES "usersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_firstPaymentId_fkey" FOREIGN KEY ("firstPaymentId") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refundrequests" ADD CONSTRAINT "refundrequests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refundrequests" ADD CONSTRAINT "refundrequests_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "providersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refundrequests" ADD CONSTRAINT "refundrequests_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repeathireinsights" ADD CONSTRAINT "repeathireinsights_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repeathireinsights" ADD CONSTRAINT "repeathireinsights_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repeathireinsights" ADD CONSTRAINT "repeathireinsights_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skillcategories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumeaccesslogs" ADD CONSTRAINT "resumeaccesslogs_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumeaccesslogs" ADD CONSTRAINT "resumeaccesslogs_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_fkey" FOREIGN KEY ("provider") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_recruiter_fkey" FOREIGN KEY ("recruiter") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_jobPost_fkey" FOREIGN KEY ("jobPost") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savedjobs" ADD CONSTRAINT "savedjobs_provider_fkey" FOREIGN KEY ("provider") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savedjobs" ADD CONSTRAINT "savedjobs_jobPost_fkey" FOREIGN KEY ("jobPost") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savedjobs" ADD CONSTRAINT "savedjobs_externalJob_fkey" FOREIGN KEY ("externalJob") REFERENCES "externaljobs"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skillcategories" ADD CONSTRAINT "skillcategories_deactivatedBy_fkey" FOREIGN KEY ("deactivatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skillcategories" ADD CONSTRAINT "skillcategories_reactivatedBy_fkey" FOREIGN KEY ("reactivatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skillgapreports" ADD CONSTRAINT "skillgapreports_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skillsynonyms" ADD CONSTRAINT "skillsynonyms_canonicalSkillId_fkey" FOREIGN KEY ("canonicalSkillId") REFERENCES "skillcategories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourceconnectors" ADD CONSTRAINT "sourceconnectors_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcerunlogs" ADD CONSTRAINT "sourcerunlogs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sourceconnectors"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcerunlogs" ADD CONSTRAINT "sourcerunlogs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supporttickets" ADD CONSTRAINT "supporttickets_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trustscores" ADD CONSTRAINT "trustscores_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredByPartnerId_fkey" FOREIGN KEY ("referredByPartnerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdByPartnerId_fkey" FOREIGN KEY ("createdByPartnerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "providerprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_recruiterProfileId_fkey" FOREIGN KEY ("recruiterProfileId") REFERENCES "recruiterprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usersubscriptions" ADD CONSTRAINT "usersubscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usersubscriptions" ADD CONSTRAINT "usersubscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visithistories" ADD CONSTRAINT "visithistories_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visithistories" ADD CONSTRAINT "visithistories_visitedUser_fkey" FOREIGN KEY ("visitedUser") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visithistories" ADD CONSTRAINT "visithistories_visitedProfile_fkey" FOREIGN KEY ("visitedProfile") REFERENCES "providerprofiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallettransactions" ADD CONSTRAINT "wallettransactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallettransactions" ADD CONSTRAINT "wallettransactions_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallettransactions" ADD CONSTRAINT "wallettransactions_sourceSubscriptionId_fkey" FOREIGN KEY ("sourceSubscriptionId") REFERENCES "usersubscriptions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallettransactions" ADD CONSTRAINT "wallettransactions_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallettransactions" ADD CONSTRAINT "wallettransactions_sourceReferralId_fkey" FOREIGN KEY ("sourceReferralId") REFERENCES "referrals"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallettransactions" ADD CONSTRAINT "wallettransactions_sourceJobId_fkey" FOREIGN KEY ("sourceJobId") REFERENCES "jobposts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapplogs" ADD CONSTRAINT "whatsapplogs_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawalrequests" ADD CONSTRAINT "withdrawalrequests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspacechats" ADD CONSTRAINT "workspacechats_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
