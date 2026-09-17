
# 🚀 SERVICEHUB MASTER SYSTEM PROMPT

## 🎯 Objective
Reconstruct and enhance the full functionality of my project "ServiceHub".

---

## 🧠 SYSTEM OVERVIEW
This is a service marketplace platform with:

### Roles:
- Admin
- Recruiter (Job Poster)
- Provider (Service Worker)

---

## 🔄 CORE FLOW

### 1. Authentication
- Users & Providers use OTP login
- Admin uses email/password

---

### 2. Recruiter Flow
- Post Job
- View Providers
- Subscribe to plans
- Get notifications

---

### 3. Provider Flow
- View Jobs
- Apply to jobs
- Maintain profile
- Receive notifications

---

### 4. Admin Flow
- Manage users
- Manage subscriptions
- Control system settings

---

### 5. Profile System
- Public profile view
- Editable only by owner
- Includes:
  - Ratings
  - Reviews
  - Work history

---

### 6. Review System
- Only allowed after interaction
- Stored per user
- Visible publicly

---

### 7. Subscription System
- Free plan (limited)
- Paid plans (3 tiers)
- Controlled by admin

---

## 📂 DETECTED PROJECT STRUCTURE

### Controllers:
D:\Project_new\React\ServiceHub\backend\controllers\adminAIController.js
D:\Project_new\React\ServiceHub\backend\controllers\adminAuthController.js
D:\Project_new\React\ServiceHub\backend\controllers\adminController.js
D:\Project_new\React\ServiceHub\backend\controllers\adminPartnerController.js
D:\Project_new\React\ServiceHub\backend\controllers\adminProviderSubscriptionController.js
D:\Project_new\React\ServiceHub\backend\controllers\authController.js
D:\Project_new\React\ServiceHub\backend\controllers\chatController.js
D:\Project_new\React\ServiceHub\backend\controllers\enquiryController.js
D:\Project_new\React\ServiceHub\backend\controllers\googleVisionController.js
D:\Project_new\React\ServiceHub\backend\controllers\jobController.js
D:\Project_new\React\ServiceHub\backend\controllers\locationController.js
D:\Project_new\React\ServiceHub\backend\controllers\managerBankAccountController.js
D:\Project_new\React\ServiceHub\backend\controllers\notificationController.js
D:\Project_new\React\ServiceHub\backend\controllers\partnerController.js
D:\Project_new\React\ServiceHub\backend\controllers\paymentController.js
D:\Project_new\React\ServiceHub\backend\controllers\profileController.js
D:\Project_new\React\ServiceHub\backend\controllers\providerAI.controller.js
D:\Project_new\React\ServiceHub\backend\controllers\providerController.js
D:\Project_new\React\ServiceHub\backend\controllers\providerPlanController.js
D:\Project_new\React\ServiceHub\backend\controllers\recruiterController.js
D:\Project_new\React\ServiceHub\backend\controllers\referralController.js
D:\Project_new\React\ServiceHub\backend\controllers\reviewController.js
D:\Project_new\React\ServiceHub\backend\controllers\searchController.js
D:\Project_new\React\ServiceHub\backend\controllers\subscriptionController.js
D:\Project_new\React\ServiceHub\backend\controllers\translationController.js
D:\Project_new\React\ServiceHub\backend\modules\ai\controllers\ai.controller.js

### Models:
D:\Project_new\React\ServiceHub\backend\models\Admin.js
D:\Project_new\React\ServiceHub\backend\models\AdminSetting.js
D:\Project_new\React\ServiceHub\backend\models\AIInteractionLog.js
D:\Project_new\React\ServiceHub\backend\models\AIPromptTemplate.js
D:\Project_new\React\ServiceHub\backend\models\AIUsageLog.js
D:\Project_new\React\ServiceHub\backend\models\Application.js
D:\Project_new\React\ServiceHub\backend\models\ApprovalLog.js
D:\Project_new\React\ServiceHub\backend\models\AuditEvent.js
D:\Project_new\React\ServiceHub\backend\models\AutomationTaskLog.js
D:\Project_new\React\ServiceHub\backend\models\BoostSuggestion.js
D:\Project_new\React\ServiceHub\backend\models\ChatConversation.js
D:\Project_new\React\ServiceHub\backend\models\ChatMessage.js
D:\Project_new\React\ServiceHub\backend\models\CommissionTransaction.js
D:\Project_new\React\ServiceHub\backend\models\DemandSnapshot.js
D:\Project_new\React\ServiceHub\backend\models\DocumentVerificationResult.js
D:\Project_new\React\ServiceHub\backend\models\Enquiry.js
D:\Project_new\React\ServiceHub\backend\models\Faq.js
D:\Project_new\React\ServiceHub\backend\models\FeatureFlag.js
D:\Project_new\React\ServiceHub\backend\models\FraudFlag.js
D:\Project_new\React\ServiceHub\backend\models\JobMatch.js
D:\Project_new\React\ServiceHub\backend\models\JobPost.js
D:\Project_new\React\ServiceHub\backend\models\JobSearchIntent.js
D:\Project_new\React\ServiceHub\backend\models\Lead.js
D:\Project_new\React\ServiceHub\backend\models\LeadDistributionLog.js
D:\Project_new\React\ServiceHub\backend\models\LeadEvent.js
D:\Project_new\React\ServiceHub\backend\models\Location.js
D:\Project_new\React\ServiceHub\backend\models\Notification.js
D:\Project_new\React\ServiceHub\backend\models\Otp.js
D:\Project_new\React\ServiceHub\backend\models\PartnerBankAccount.js
D:\Project_new\React\ServiceHub\backend\models\PartnerProfile.js
D:\Project_new\React\ServiceHub\backend\models\PartnerReward.js
D:\Project_new\React\ServiceHub\backend\models\Payment.js
D:\Project_new\React\ServiceHub\backend\models\PayoutRequest.js
D:\Project_new\React\ServiceHub\backend\models\Plan.js
D:\Project_new\React\ServiceHub\backend\models\ProviderAIProfile.js
D:\Project_new\React\ServiceHub\backend\models\ProviderAvailability.js
D:\Project_new\React\ServiceHub\backend\models\ProviderEmbedding.js
D:\Project_new\React\ServiceHub\backend\models\ProviderMetrics.js
D:\Project_new\React\ServiceHub\backend\models\ProviderProfile.js
D:\Project_new\React\ServiceHub\backend\models\ProviderServiceArea.js
D:\Project_new\React\ServiceHub\backend\models\ProviderSubscription.js
D:\Project_new\React\ServiceHub\backend\models\RecruiterHireEmbedding.js
D:\Project_new\React\ServiceHub\backend\models\RecruiterProfile.js
D:\Project_new\React\ServiceHub\backend\models\RecruiterSearchLog.js
D:\Project_new\React\ServiceHub\backend\models\Referral.js
D:\Project_new\React\ServiceHub\backend\models\RepeatHireInsight.js
D:\Project_new\React\ServiceHub\backend\models\Review.js
D:\Project_new\React\ServiceHub\backend\models\RotationPool.js
D:\Project_new\React\ServiceHub\backend\models\SkillCategory.js
D:\Project_new\React\ServiceHub\backend\models\SkillSynonym.js
D:\Project_new\React\ServiceHub\backend\models\TranslationCache.js
D:\Project_new\React\ServiceHub\backend\models\TrustScore.js
D:\Project_new\React\ServiceHub\backend\models\User.js
D:\Project_new\React\ServiceHub\backend\models\UserSubscription.js
D:\Project_new\React\ServiceHub\backend\models\VisitHistory.js
D:\Project_new\React\ServiceHub\backend\models\WalletTransaction.js
D:\Project_new\React\ServiceHub\backend\models\WhatsappLog.js

### Routes:
D:\Project_new\React\ServiceHub\backend\modules\ai\routes\ai.routes.js
D:\Project_new\React\ServiceHub\backend\routes\adminAIRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\adminAuthRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\adminBankAccountRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\adminPartnerRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\adminRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\authRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\authRoutesV1.js
D:\Project_new\React\ServiceHub\backend\routes\chatRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\enquiryRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\faqRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\googleVisionRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\jobRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\locationRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\managerBankAccountRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\notificationRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\partnerRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\paymentRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\planRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\profileRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\providerAI.js
D:\Project_new\React\ServiceHub\backend\routes\providerAI.routes.js
D:\Project_new\React\ServiceHub\backend\routes\providerRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\recruiterRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\referralRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\reviewRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\searchRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\subscriptionRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\testAI.js
D:\Project_new\React\ServiceHub\backend\routes\testOCR.js
D:\Project_new\React\ServiceHub\backend\routes\translateRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\userRoutes.js
D:\Project_new\React\ServiceHub\frontend\src\components\common\AdminProtectedRoute.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\PartnerProtectedRoute.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\ProtectedRoute.jsx

### Services:
D:\Project_new\React\ServiceHub\Ai-implement.prompt
D:\Project_new\React\ServiceHub\backend\.env
D:\Project_new\React\ServiceHub\backend\.env.example
D:\Project_new\React\ServiceHub\backend\config\db.js
D:\Project_new\React\ServiceHub\backend\config\env.js
D:\Project_new\React\ServiceHub\backend\config\firebaseAdmin.js
D:\Project_new\React\ServiceHub\backend\config\rewardConfig.js
D:\Project_new\React\ServiceHub\backend\controllers\adminAIController.js
D:\Project_new\React\ServiceHub\backend\controllers\adminAuthController.js
D:\Project_new\React\ServiceHub\backend\controllers\adminController.js
D:\Project_new\React\ServiceHub\backend\controllers\adminPartnerController.js
D:\Project_new\React\ServiceHub\backend\controllers\adminProviderSubscriptionController.js
D:\Project_new\React\ServiceHub\backend\controllers\authController.js
D:\Project_new\React\ServiceHub\backend\controllers\chatController.js
D:\Project_new\React\ServiceHub\backend\controllers\enquiryController.js
D:\Project_new\React\ServiceHub\backend\controllers\googleVisionController.js
D:\Project_new\React\ServiceHub\backend\controllers\jobController.js
D:\Project_new\React\ServiceHub\backend\controllers\locationController.js
D:\Project_new\React\ServiceHub\backend\controllers\managerBankAccountController.js
D:\Project_new\React\ServiceHub\backend\controllers\notificationController.js
D:\Project_new\React\ServiceHub\backend\controllers\partnerController.js
D:\Project_new\React\ServiceHub\backend\controllers\paymentController.js
D:\Project_new\React\ServiceHub\backend\controllers\profileController.js
D:\Project_new\React\ServiceHub\backend\controllers\providerAI.controller.js
D:\Project_new\React\ServiceHub\backend\controllers\providerController.js
D:\Project_new\React\ServiceHub\backend\controllers\providerPlanController.js
D:\Project_new\React\ServiceHub\backend\controllers\recruiterController.js
D:\Project_new\React\ServiceHub\backend\controllers\referralController.js
D:\Project_new\React\ServiceHub\backend\controllers\reviewController.js
D:\Project_new\React\ServiceHub\backend\controllers\searchController.js
D:\Project_new\React\ServiceHub\backend\controllers\subscriptionController.js
D:\Project_new\React\ServiceHub\backend\controllers\translationController.js
D:\Project_new\React\ServiceHub\backend\middleware\adminAuth.js
D:\Project_new\React\ServiceHub\backend\middleware\aiRateLimit.js
D:\Project_new\React\ServiceHub\backend\middleware\auth.js
D:\Project_new\React\ServiceHub\backend\middleware\errorHandler.js
D:\Project_new\React\ServiceHub\backend\middleware\featureFlag.js
D:\Project_new\React\ServiceHub\backend\middleware\idempotency.js
D:\Project_new\React\ServiceHub\backend\middleware\profileAccess.js
D:\Project_new\React\ServiceHub\backend\middleware\providerApproval.js
D:\Project_new\React\ServiceHub\backend\middleware\recruiterApproval.js
D:\Project_new\React\ServiceHub\backend\middleware\subscription.js
D:\Project_new\React\ServiceHub\backend\middleware\upload.js
D:\Project_new\React\ServiceHub\backend\middleware\uploadVision.js
D:\Project_new\React\ServiceHub\backend\middleware\validate.js
D:\Project_new\React\ServiceHub\backend\models\Admin.js
D:\Project_new\React\ServiceHub\backend\models\AdminSetting.js
D:\Project_new\React\ServiceHub\backend\models\AIInteractionLog.js
D:\Project_new\React\ServiceHub\backend\models\AIPromptTemplate.js
D:\Project_new\React\ServiceHub\backend\models\AIUsageLog.js
D:\Project_new\React\ServiceHub\backend\models\Application.js
D:\Project_new\React\ServiceHub\backend\models\ApprovalLog.js
D:\Project_new\React\ServiceHub\backend\models\AuditEvent.js
D:\Project_new\React\ServiceHub\backend\models\AutomationTaskLog.js
D:\Project_new\React\ServiceHub\backend\models\BoostSuggestion.js
D:\Project_new\React\ServiceHub\backend\models\ChatConversation.js
D:\Project_new\React\ServiceHub\backend\models\ChatMessage.js
D:\Project_new\React\ServiceHub\backend\models\CommissionTransaction.js
D:\Project_new\React\ServiceHub\backend\models\DemandSnapshot.js
D:\Project_new\React\ServiceHub\backend\models\DocumentVerificationResult.js
D:\Project_new\React\ServiceHub\backend\models\Enquiry.js
D:\Project_new\React\ServiceHub\backend\models\Faq.js
D:\Project_new\React\ServiceHub\backend\models\FeatureFlag.js
D:\Project_new\React\ServiceHub\backend\models\FraudFlag.js
D:\Project_new\React\ServiceHub\backend\models\JobMatch.js
D:\Project_new\React\ServiceHub\backend\models\JobPost.js
D:\Project_new\React\ServiceHub\backend\models\JobSearchIntent.js
D:\Project_new\React\ServiceHub\backend\models\Lead.js
D:\Project_new\React\ServiceHub\backend\models\LeadDistributionLog.js
D:\Project_new\React\ServiceHub\backend\models\LeadEvent.js
D:\Project_new\React\ServiceHub\backend\models\Location.js
D:\Project_new\React\ServiceHub\backend\models\Notification.js
D:\Project_new\React\ServiceHub\backend\models\Otp.js
D:\Project_new\React\ServiceHub\backend\models\PartnerBankAccount.js
D:\Project_new\React\ServiceHub\backend\models\PartnerProfile.js
D:\Project_new\React\ServiceHub\backend\models\PartnerReward.js
D:\Project_new\React\ServiceHub\backend\models\Payment.js
D:\Project_new\React\ServiceHub\backend\models\PayoutRequest.js
D:\Project_new\React\ServiceHub\backend\models\Plan.js
D:\Project_new\React\ServiceHub\backend\models\ProviderAIProfile.js
D:\Project_new\React\ServiceHub\backend\models\ProviderAvailability.js
D:\Project_new\React\ServiceHub\backend\models\ProviderEmbedding.js
D:\Project_new\React\ServiceHub\backend\models\ProviderMetrics.js
D:\Project_new\React\ServiceHub\backend\models\ProviderProfile.js
D:\Project_new\React\ServiceHub\backend\models\ProviderServiceArea.js
D:\Project_new\React\ServiceHub\backend\models\ProviderSubscription.js
D:\Project_new\React\ServiceHub\backend\models\RecruiterHireEmbedding.js
D:\Project_new\React\ServiceHub\backend\models\RecruiterProfile.js
D:\Project_new\React\ServiceHub\backend\models\RecruiterSearchLog.js
D:\Project_new\React\ServiceHub\backend\models\Referral.js
D:\Project_new\React\ServiceHub\backend\models\RepeatHireInsight.js
D:\Project_new\React\ServiceHub\backend\models\Review.js
D:\Project_new\React\ServiceHub\backend\models\RotationPool.js
D:\Project_new\React\ServiceHub\backend\models\SkillCategory.js
D:\Project_new\React\ServiceHub\backend\models\SkillSynonym.js
D:\Project_new\React\ServiceHub\backend\models\TranslationCache.js
D:\Project_new\React\ServiceHub\backend\models\TrustScore.js
D:\Project_new\React\ServiceHub\backend\models\User.js
D:\Project_new\React\ServiceHub\backend\models\UserSubscription.js
D:\Project_new\React\ServiceHub\backend\models\VisitHistory.js
D:\Project_new\React\ServiceHub\backend\models\WalletTransaction.js
D:\Project_new\React\ServiceHub\backend\models\WhatsappLog.js
D:\Project_new\React\ServiceHub\backend\modules\ai\config\ai.config.js
D:\Project_new\React\ServiceHub\backend\modules\ai\controllers\ai.controller.js
D:\Project_new\React\ServiceHub\backend\modules\ai\routes\ai.routes.js
D:\Project_new\React\ServiceHub\backend\modules\ai\services\aiOrchestrator.service.js
D:\Project_new\React\ServiceHub\backend\modules\ai\services\chat.service.js
D:\Project_new\React\ServiceHub\backend\modules\ai\services\chatHistory.service.js
D:\Project_new\React\ServiceHub\backend\modules\ai\services\embedding.service.js
D:\Project_new\React\ServiceHub\backend\modules\ai\services\fraud.service.js
D:\Project_new\React\ServiceHub\backend\modules\ai\services\ocr.service.js
D:\Project_new\React\ServiceHub\backend\modules\ai\services\profileBuilder.service.js
D:\Project_new\React\ServiceHub\backend\modules\ai\services\queue.service.js
D:\Project_new\React\ServiceHub\backend\modules\ai\utils\messageOrder.js
D:\Project_new\React\ServiceHub\backend\modules\ai\validators\ai.validators.js
D:\Project_new\React\ServiceHub\backend\modules\ai\workers\ai.worker.js
D:\Project_new\React\ServiceHub\backend\modules\queue\job.handlers.js
D:\Project_new\React\ServiceHub\backend\modules\queue\queue.factory.js
D:\Project_new\React\ServiceHub\backend\modules\queue\queue.names.js
D:\Project_new\React\ServiceHub\backend\modules\queue\redis.client.js
D:\Project_new\React\ServiceHub\backend\package-lock.json
D:\Project_new\React\ServiceHub\backend\package.json
D:\Project_new\React\ServiceHub\backend\queues\jobNames.js
D:\Project_new\React\ServiceHub\backend\README_AI_PHASE1.md
D:\Project_new\React\ServiceHub\backend\routes\adminAIRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\adminAuthRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\adminBankAccountRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\adminPartnerRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\adminRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\authRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\authRoutesV1.js
D:\Project_new\React\ServiceHub\backend\routes\chatRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\enquiryRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\faqRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\googleVisionRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\jobRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\locationRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\managerBankAccountRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\notificationRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\partnerRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\paymentRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\planRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\profileRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\providerAI.js
D:\Project_new\React\ServiceHub\backend\routes\providerAI.routes.js
D:\Project_new\React\ServiceHub\backend\routes\providerRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\recruiterRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\referralRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\reviewRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\searchRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\subscriptionRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\testAI.js
D:\Project_new\React\ServiceHub\backend\routes\testOCR.js
D:\Project_new\React\ServiceHub\backend\routes\translateRoutes.js
D:\Project_new\React\ServiceHub\backend\routes\userRoutes.js
D:\Project_new\React\ServiceHub\backend\scripts\migrateAdmins.js
D:\Project_new\React\ServiceHub\backend\scripts\migrateApprovalStatus.js
D:\Project_new\React\ServiceHub\backend\scripts\migrateReferralCodes.js
D:\Project_new\React\ServiceHub\backend\scripts\seedAdmin.js
D:\Project_new\React\ServiceHub\backend\scripts\seedPlans.js
D:\Project_new\React\ServiceHub\backend\scripts\seedReferralSettings.js
D:\Project_new\React\ServiceHub\backend\server.js
D:\Project_new\React\ServiceHub\backend\services\ai\anthropicService.js
D:\Project_new\React\ServiceHub\backend\services\ai\embeddingsService.js
D:\Project_new\React\ServiceHub\backend\services\ai\llmService.js
D:\Project_new\React\ServiceHub\backend\services\ai\profileBuilder\index.js
D:\Project_new\React\ServiceHub\backend\services\ai\profileBuilder\llmEnhancer.js
D:\Project_new\React\ServiceHub\backend\services\ai\profileBuilder\profileParser.js
D:\Project_new\React\ServiceHub\backend\services\ai\promptTemplateService.js
D:\Project_new\React\ServiceHub\backend\services\ai\providerChatService.js
D:\Project_new\React\ServiceHub\backend\services\ai\providerFallbackService.js
D:\Project_new\React\ServiceHub\backend\services\ai\providerIntentService.js
D:\Project_new\React\ServiceHub\backend\services\ai\providerParser.js
D:\Project_new\React\ServiceHub\backend\services\ai\providerProfileService.js
D:\Project_new\React\ServiceHub\backend\services\ai\utils.js
D:\Project_new\React\ServiceHub\backend\services\ai\vectorSearchService.js
D:\Project_new\React\ServiceHub\backend\services\ai\visionOcrService.js
D:\Project_new\React\ServiceHub\backend\services\aiAssistService.js
D:\Project_new\React\ServiceHub\backend\services\automationQueueService.js
D:\Project_new\React\ServiceHub\backend\services\badgeService.js
D:\Project_new\React\ServiceHub\backend\services\chatAssistantService.js
D:\Project_new\React\ServiceHub\backend\services\demandSpikeService.js
D:\Project_new\React\ServiceHub\backend\services\eventLogService.js
D:\Project_new\React\ServiceHub\backend\services\fraudRulesService.js
D:\Project_new\React\ServiceHub\backend\services\googlePlacesService.js
D:\Project_new\React\ServiceHub\backend\services\googleTranslate.service.js
D:\Project_new\React\ServiceHub\backend\services\googleVision.service.js
D:\Project_new\React\ServiceHub\backend\services\leadDistributionService.js
D:\Project_new\React\ServiceHub\backend\services\locationRelevanceService.js
D:\Project_new\React\ServiceHub\backend\services\locationService.js
D:\Project_new\React\ServiceHub\backend\services\mailService.js
D:\Project_new\React\ServiceHub\backend\services\matchScoringService.js
D:\Project_new\React\ServiceHub\backend\services\matchWeightService.js
D:\Project_new\React\ServiceHub\backend\services\notificationService.js
D:\Project_new\React\ServiceHub\backend\services\providerAIOrchestrationService.js
D:\Project_new\React\ServiceHub\backend\services\providerRankingService.js
D:\Project_new\React\ServiceHub\backend\services\providerService.js
D:\Project_new\React\ServiceHub\backend\services\queueHandlers.js
D:\Project_new\React\ServiceHub\backend\services\queueService.js
D:\Project_new\React\ServiceHub\backend\services\referralTrackingService.js
D:\Project_new\React\ServiceHub\backend\services\reviewService.js
D:\Project_new\React\ServiceHub\backend\services\searchIntentService.js
D:\Project_new\React\ServiceHub\backend\services\translateService.js
D:\Project_new\React\ServiceHub\backend\services\trustScoreService.js
D:\Project_new\React\ServiceHub\backend\test\exp.jpeg
D:\Project_new\React\ServiceHub\backend\test\testOCR.js
D:\Project_new\React\ServiceHub\backend\tests\aiMessageOrder.test.js
D:\Project_new\React\ServiceHub\backend\tests\distance.test.js
D:\Project_new\React\ServiceHub\backend\tests\matchScoringService.test.js
D:\Project_new\React\ServiceHub\backend\tests\profileParser.test.js
D:\Project_new\React\ServiceHub\backend\tests\queueFactory.test.js
D:\Project_new\React\ServiceHub\backend\tests\searchIntentService.test.js
D:\Project_new\React\ServiceHub\backend\utils\appError.js
D:\Project_new\React\ServiceHub\backend\utils\asyncHandler.js
D:\Project_new\React\ServiceHub\backend\utils\cloudinary.js
D:\Project_new\React\ServiceHub\backend\utils\cronJobs.js
D:\Project_new\React\ServiceHub\backend\utils\distance.js
D:\Project_new\React\ServiceHub\backend\utils\exchangeRates.js
D:\Project_new\React\ServiceHub\backend\utils\generateAdminToken.js
D:\Project_new\React\ServiceHub\backend\utils\generateReferralCode.js
D:\Project_new\React\ServiceHub\backend\utils\generateToken.js
D:\Project_new\React\ServiceHub\backend\utils\geoLocation.js
D:\Project_new\React\ServiceHub\backend\utils\locationDictionary.js
D:\Project_new\React\ServiceHub\backend\utils\logger.js
D:\Project_new\React\ServiceHub\backend\utils\maskBankAccount.js
D:\Project_new\React\ServiceHub\backend\utils\messaging.js
D:\Project_new\React\ServiceHub\backend\utils\migratePlansAndSubscriptions.js
D:\Project_new\React\ServiceHub\backend\utils\migrateReviews.js
D:\Project_new\React\ServiceHub\backend\utils\migrateUserRoles.js
D:\Project_new\React\ServiceHub\backend\utils\port-tools.js
D:\Project_new\React\ServiceHub\backend\utils\razorpay.js
D:\Project_new\React\ServiceHub\backend\utils\rotation.js
D:\Project_new\React\ServiceHub\backend\utils\seed.js
D:\Project_new\React\ServiceHub\backend\utils\seedFreshState.js
D:\Project_new\React\ServiceHub\backend\utils\seedPlans.js
D:\Project_new\React\ServiceHub\backend\utils\seedProviderVisibilityPlans.js
D:\Project_new\React\ServiceHub\backend\utils\seedSkills.js
D:\Project_new\React\ServiceHub\backend\utils\serviceRoleDictionary.js
D:\Project_new\React\ServiceHub\backend\utils\stripe.js
D:\Project_new\React\ServiceHub\backend\validators\aiValidators.js
D:\Project_new\React\ServiceHub\backend\validators\searchValidators.js
D:\Project_new\React\ServiceHub\backend\workers\queueWorker.js
D:\Project_new\React\ServiceHub\frontend\.env
D:\Project_new\React\ServiceHub\frontend\.env.example
D:\Project_new\React\ServiceHub\frontend\dist\assets\index-Cegbx0xo.css
D:\Project_new\React\ServiceHub\frontend\dist\assets\index-Ct1k8-ry.js
D:\Project_new\React\ServiceHub\frontend\dist\index.html
D:\Project_new\React\ServiceHub\frontend\dist\laptop.png
D:\Project_new\React\ServiceHub\frontend\dist\newstand.png
D:\Project_new\React\ServiceHub\frontend\dist\stand.png
D:\Project_new\React\ServiceHub\frontend\dist\vite.svg
D:\Project_new\React\ServiceHub\frontend\dist\work.png
D:\Project_new\React\ServiceHub\frontend\eslint.config.js
D:\Project_new\React\ServiceHub\frontend\index.html
D:\Project_new\React\ServiceHub\frontend\package-lock.json
D:\Project_new\React\ServiceHub\frontend\package.json
D:\Project_new\React\ServiceHub\frontend\public\laptop.png
D:\Project_new\React\ServiceHub\frontend\public\newstand.png
D:\Project_new\React\ServiceHub\frontend\public\stand.png
D:\Project_new\React\ServiceHub\frontend\public\vite.svg
D:\Project_new\React\ServiceHub\frontend\public\work.png
D:\Project_new\React\ServiceHub\frontend\README.md
D:\Project_new\React\ServiceHub\frontend\scripts\syncTranslations.cjs
D:\Project_new\React\ServiceHub\frontend\src\App.jsx
D:\Project_new\React\ServiceHub\frontend\src\assets\react.svg
D:\Project_new\React\ServiceHub\frontend\src\components\admin\AdminLayout.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\ConfirmModal.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\DashboardStatsCard.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\EarningsSourceChart.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\PlanSummary.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\PlatformSummary.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\RejectModal.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\RemarksModal.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\RevenueChart.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\RewardPoolCard.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\RewardProgramTable.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\admin\TopPartnersTable.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\AdminProtectedRoute.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\AIChatWidget.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\Footer.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\GuaranteeModal.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\LoadingSpinner.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\Navbar.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\NotFound.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\NotificationBell.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\PartnerProtectedRoute.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\ProtectedRoute.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\ReviewSection.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\RoleCompletionModal.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\ScrollToTop.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\SkillPicker.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\SubscriptionPlansPopup.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\common\WhatsAppNumberModal.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\LanguageDropdown.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\LocationSearch.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\provider\AIProfileAssistant.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\provider\BoostSuggestionCard.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\provider\DocumentVerificationStatusCard.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\provider\PricingSuggestionCard.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\provider\ProviderAIChat.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\provider\ProviderAIDebugPanel.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\provider\ProviderLayout.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\providers\ProviderCard.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\recruiter\CompareProvidersModal.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\recruiter\InstantHirePanel.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\recruiter\NaturalLanguageIntentBar.jsx
D:\Project_new\React\ServiceHub\frontend\src\components\recruiter\RecruiterLayout.jsx
D:\Project_new\React\ServiceHub\frontend\src\config\firebase.js
D:\Project_new\React\ServiceHub\frontend\src\context\AdminAuthContext.jsx
D:\Project_new\React\ServiceHub\frontend\src\context\AuthContext.jsx
D:\Project_new\React\ServiceHub\frontend\src\context\LanguageContext.js
D:\Project_new\React\ServiceHub\frontend\src\context\LocaleContext.jsx
D:\Project_new\React\ServiceHub\frontend\src\data\skillsData.js
D:\Project_new\React\ServiceHub\frontend\src\hooks\useDebounce.js
D:\Project_new\React\ServiceHub\frontend\src\hooks\useRazorpay.js
D:\Project_new\React\ServiceHub\frontend\src\hooks\useStripePayment.js
D:\Project_new\React\ServiceHub\frontend\src\hooks\useTranslation.js
D:\Project_new\React\ServiceHub\frontend\src\index.css
D:\Project_new\React\ServiceHub\frontend\src\main.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\AdminPartnerPayouts.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\AdminReferrals.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\AdminRewardPool.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\AIControlCenter.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Currency.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Dashboard.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Enquiries.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Login.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\ManagerBankAccounts.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Managers.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\PartnerReferrals.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Partners.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Payments.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Plans.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Privacy.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\ProfilePhotoApprovals.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Providers.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\ProviderSubscriptions.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Recruiters.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Settings.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Skills.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Terms.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\Users.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\admin\WhatsApp.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\auth\ForgotPassword.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\auth\ResetPassword.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\AuthPage.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\ContactUs.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\Faq.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\LandingPage.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\newLandingpage.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\partner\CreatePartnerProvider.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\partner\CreatePartnerRecruiter.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\partner\PartnerBankDetails.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\partner\PartnerDashboard.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\partner\PartnerLayout.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\partner\PartnerPayouts.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\PendingApproval.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\Privacy.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\ProfilePage.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\provider\Contacted.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\provider\Dashboard.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\provider\History.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\provider\Jobs.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\provider\Leads.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\provider\Plans.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\provider\Profile.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\ProviderPublicProfile.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\Applications.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\Dashboard.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\FindProviders.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\History.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\JobPostings.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\PendingApproval.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\Plans.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\PostJob.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\Profile.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\SavedCandidates.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\SearchHistory.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\Settings.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\ShortlistedCandidates.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\recruiter\Transactions.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\SearchPage.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\Terms.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\user\ChangePassword.jsx
D:\Project_new\React\ServiceHub\frontend\src\pages\user\ReferralManagement.jsx
D:\Project_new\React\ServiceHub\frontend\src\services\api.js
D:\Project_new\React\ServiceHub\frontend\src\services\bankAccountService.js
D:\Project_new\React\ServiceHub\frontend\src\services\partnerApi.js
D:\Project_new\React\ServiceHub\frontend\src\services\providerAIService.js
D:\Project_new\React\ServiceHub\frontend\src\services\providerPlanService.js
D:\Project_new\React\ServiceHub\frontend\src\services\providerService.js
D:\Project_new\React\ServiceHub\frontend\src\translations\ar.json
D:\Project_new\React\ServiceHub\frontend\src\translations\bn.json
D:\Project_new\React\ServiceHub\frontend\src\translations\de.json
D:\Project_new\React\ServiceHub\frontend\src\translations\en.json
D:\Project_new\React\ServiceHub\frontend\src\translations\es.json
D:\Project_new\React\ServiceHub\frontend\src\translations\fr.json
D:\Project_new\React\ServiceHub\frontend\src\translations\hi.json
D:\Project_new\React\ServiceHub\frontend\src\translations\id.json
D:\Project_new\React\ServiceHub\frontend\src\translations\ja.json
D:\Project_new\React\ServiceHub\frontend\src\translations\mr.json
D:\Project_new\React\ServiceHub\frontend\src\translations\pt.json
D:\Project_new\React\ServiceHub\frontend\src\translations\ru.json
D:\Project_new\React\ServiceHub\frontend\src\translations\ta.json
D:\Project_new\React\ServiceHub\frontend\src\translations\te.json
D:\Project_new\React\ServiceHub\frontend\src\translations\ur.json
D:\Project_new\React\ServiceHub\frontend\src\translations\zh.json
D:\Project_new\React\ServiceHub\frontend\src\utils\location.js
D:\Project_new\React\ServiceHub\frontend\src\utils\media.js
D:\Project_new\React\ServiceHub\frontend\src\utils\providerData.js
D:\Project_new\React\ServiceHub\frontend\vite.config.js
D:\Project_new\React\ServiceHub\frontend\vite.config.js.timestamp-1777980193418-d24b7962e33638.mjs
D:\Project_new\React\ServiceHub\generate-flow.js
D:\Project_new\React\ServiceHub\package-lock.json
D:\Project_new\React\ServiceHub\Readme.txt
D:\Project_new\React\ServiceHub\screencapture-id-preview-f527a3b0-1d71-4322-9eeb-2299736385d1-lovable-app-2026-04-23-12_01_19 (1).pdf
D:\Project_new\React\ServiceHub\SERVICEHUB_AI_UPGRADE_PLAN.md
D:\Project_new\React\ServiceHub\SERVICEHUB_FLOW_DOCUMENTATION.md
D:\Project_new\React\ServiceHub\testAi.js
D:\Project_new\React\ServiceHub\test_google_native.js

### Middleware:
D:\Project_new\React\ServiceHub\backend\middleware\adminAuth.js
D:\Project_new\React\ServiceHub\backend\middleware\aiRateLimit.js
D:\Project_new\React\ServiceHub\backend\middleware\auth.js
D:\Project_new\React\ServiceHub\backend\middleware\errorHandler.js
D:\Project_new\React\ServiceHub\backend\middleware\featureFlag.js
D:\Project_new\React\ServiceHub\backend\middleware\idempotency.js
D:\Project_new\React\ServiceHub\backend\middleware\profileAccess.js
D:\Project_new\React\ServiceHub\backend\middleware\providerApproval.js
D:\Project_new\React\ServiceHub\backend\middleware\recruiterApproval.js
D:\Project_new\React\ServiceHub\backend\middleware\subscription.js
D:\Project_new\React\ServiceHub\backend\middleware\upload.js
D:\Project_new\React\ServiceHub\backend\middleware\uploadVision.js
D:\Project_new\React\ServiceHub\backend\middleware\validate.js

---

## ⚙️ TASK FOR COPILOT

Based on above structure:

1. Map all relationships between models
2. Identify role-based access logic
3. Reconstruct full backend flow
4. Fix missing links between:
   - Jobs
   - Users
   - Reviews
   - Subscriptions
5. Ensure:
   - Recruiter cannot see other recruiters
   - Provider cannot see other providers
6. Optimize API design
7. Suggest improvements

---

## 🎨 FRONTEND EXPECTATION
- Role-based dashboards
- Dynamic UI rendering
- Profile pages with reviews
- Notification system

---

## 🚀 OUTPUT REQUIRED
- Full architecture explanation
- API flow diagram (text)
- Missing features list
- Improved code suggestions
