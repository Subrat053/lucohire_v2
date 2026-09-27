const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

if (schemaContent.includes('model CareerPath {')) {
  console.log('CareerPath already exists in schema.prisma. Skipping addition.');
  process.exit(0);
}

const userRelationFields = `  chapterCompletionLinks ChapterCompletion[] @relation("Rel_ChapterCompletion_userId_User")
  practiceAttemptLinks PracticeAttempt[] @relation("Rel_PracticeAttempt_userId_User")
  topicPerformanceLinks TopicPerformance[] @relation("Rel_TopicPerformance_userId_User")
  assessmentAttemptLinks AssessmentAttempt[] @relation("Rel_AssessmentAttempt_userId_User")
  candidateResumeLinks CandidateResume[] @relation("Rel_CandidateResume_userId_User")
  atsScoringResultLinks ATSScoringResult[] @relation("Rel_ATSScoringResult_userId_User")
  readinessResultLinks ReadinessResult[] @relation("Rel_ReadinessResult_userId_User")
  journeyCertificateLinks JourneyCertificate[] @relation("Rel_JourneyCertificate_userId_User")
  candidateActionPlanLinks CandidateActionPlan[] @relation("Rel_CandidateActionPlan_userId_User")
  recommendationEventLogLinks RecommendationEventLog[] @relation("Rel_RecommendationEventLog_userId_User")
  freelancerJourneyStateLinks FreelancerJourneyState? @relation("Rel_FreelancerJourneyState_userId_User")
`;

// Insert into model User before @@index([phone_hash])
const targetUserMarker = '  @@index([phone_hash])';
if (!schemaContent.includes(targetUserMarker)) {
  console.error('Target marker in model User not found!');
  process.exit(1);
}

const updatedWithUser = schemaContent.replace(
  targetUserMarker,
  `${userRelationFields}\n  @@index([phone_hash])`
);

const newModels = `
// ─── RESUME JOURNEY DYNAMIC ENGINE MODELS ──────────────────────────────────

model CareerPath {
  id String @id @default(cuid())
  slug String @unique
  title String
  subTitle String @default("")
  badge String @default("")
  kya String @default("")
  oneLiner String @default("")
  isRecommended Boolean @default(false)
  sortOrder Int @default(0)
  lessonsCount Int @default(0)
  jobsCount Int @default(0)
  isActive Boolean @default(true)
  version Int @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tracks LearningTrack[]
  careerPathSkills CareerPathSkill[]
  practiceQuestions PracticeQuestion[]
  assessmentConfigs AssessmentConfiguration[]
  readinessConfigs ReadinessConfiguration[]
  atcScoringConfigs ATSScoringConfiguration[]
  practiceAttempts PracticeAttempt[]
  assessmentAttempts AssessmentAttempt[]
  atsScoringResults ATSScoringResult[]
  readinessResults ReadinessResult[]
  certificates JourneyCertificate[]
  actionPlans CandidateActionPlan[]

  @@map("careerpaths")
}

model SkillTaxonomy {
  id String @id @default(cuid())
  canonicalName String @unique
  category String @default("general")
  status String @default("active")
  description String @default("")
  trend String @default("")
  salaryRange String @default("")
  actionPrompt String @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  aliases SkillAlias[]
  careerPathSkills CareerPathSkill[]

  @@map("skilltaxonomies")
}

model SkillAlias {
  id String @id @default(cuid())
  skillId String
  alias String @unique
  skill SkillTaxonomy @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@map("skillaliases")
}

model JourneyTopic {
  id String @id @default(cuid())
  name String @unique
  category String @default("engineering")
  description String @default("")
  createdAt DateTime @default(now())

  practiceQuestions PracticeQuestion[]
  assessmentQuestions AssessmentQuestion[]
  topicPerformances TopicPerformance[]

  @@map("journey_topics")
}

model CareerPathSkill {
  id String @id @default(cuid())
  careerPathId String
  skillId String
  importance String @default("standard")
  salaryImpact String @default("")
  jobsUnlockText String @default("")
  sortOrder Int @default(0)

  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)
  skill SkillTaxonomy @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([careerPathId, skillId])
  @@map("careerpathskills")
}

model LearningTrack {
  id String @id @default(cuid())
  careerPathId String
  trackKey String
  label String
  impact String @default("")
  banner String @default("")
  sortOrder Int @default(0)
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)
  chapters LearningChapter[]

  @@unique([careerPathId, trackKey])
  @@map("learningtracks")
}

model LearningChapter {
  id String @id @default(cuid())
  trackId String
  chapterKey String
  name String
  readTimeMinutes Int @default(15)
  tagLevel String @default("high")
  tagLabel String @default("Critical gap")
  stat1Value String @default("")
  stat1Label String @default("")
  stat1Dir String @default("down")
  stat2Value String @default("")
  stat2Label String @default("")
  stat2Dir String @default("down")
  why String @default("")
  companyWork Json?
  interviewQs Json?
  core Json?
  exampleType String @default("code")
  beforeCode String @default("")
  afterCode String @default("")
  checklist Json?
  resumeLine String @default("")
  sortOrder Int @default(0)
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  track LearningTrack @relation(fields: [trackId], references: [id], onDelete: Cascade)
  completions ChapterCompletion[]

  @@unique([trackId, chapterKey])
  @@map("learningchapters")
}

model ChapterCompletion {
  id String @id @default(cuid())
  userId String
  chapterId String
  completedAt DateTime @default(now())

  user User @relation("Rel_ChapterCompletion_userId_User", fields: [userId], references: [id], onDelete: Cascade)
  chapter LearningChapter @relation(fields: [chapterId], references: [id], onDelete: Cascade)

  @@unique([userId, chapterId])
  @@map("chaptercompletions")
}

model PracticeMode {
  id String @id @default(cuid())
  modeKey String @unique
  label String
  questionCount Int @default(5)
  timeLimitSeconds Int @default(0)
  description String @default("")
  isActive Boolean @default(true)
  sortOrder Int @default(0)

  @@map("practicemodes")
}

model PracticeQuestion {
  id String @id @default(cuid())
  careerPathId String
  topicId String?
  topicName String @default("General")
  difficulty String @default("medium")
  scenario String
  options Json
  correctOptionIndex Int
  explain String @default("")
  mistake String @default("")
  isActive Boolean @default(true)
  createdAt DateTime @default(now())

  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)
  topic JourneyTopic? @relation(fields: [topicId], references: [id], onDelete: SetNull)

  @@map("practicequestions")
}

model PracticeAttempt {
  id String @id @default(cuid())
  userId String
  careerPathId String
  modeKey String
  score Int
  totalQuestions Int
  streak Int @default(0)
  createdAt DateTime @default(now())

  user User @relation("Rel_PracticeAttempt_userId_User", fields: [userId], references: [id], onDelete: Cascade)
  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)
  answers PracticeAnswer[]

  @@map("practiceattempts")
}

model PracticeAnswer {
  id String @id @default(cuid())
  attemptId String
  questionId String
  selectedOptionIndex Int
  isCorrect Boolean

  attempt PracticeAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)

  @@map("practiceanswers")
}

model TopicPerformance {
  id String @id @default(cuid())
  userId String
  topicId String?
  topicName String
  correctCount Int @default(0)
  incorrectCount Int @default(0)
  totalAttempts Int @default(0)
  weaknessScore Float @default(0)
  lastAttemptedAt DateTime @default(now())

  user User @relation("Rel_TopicPerformance_userId_User", fields: [userId], references: [id], onDelete: Cascade)
  topic JourneyTopic? @relation(fields: [topicId], references: [id], onDelete: SetNull)

  @@unique([userId, topicName])
  @@map("topicperformances")
}

model AssessmentConfiguration {
  id String @id @default(cuid())
  careerPathId String
  version Int @default(1)
  timeLimitSeconds Int @default(900)
  secondsPerQuestion Int @default(90)
  passingScorePercentage Float @default(70)
  totalQuestions Int @default(10)
  difficultyDistribution Json?
  cooldownHours Int @default(24)
  maxAttempts Int @default(10)
  isPublished Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)
  attempts AssessmentAttempt[]
  questions AssessmentQuestion[]

  @@unique([careerPathId, version])
  @@map("assessmentconfigurations")
}

model AssessmentQuestion {
  id String @id @default(cuid())
  configId String
  topicId String?
  topicName String @default("General")
  difficulty String @default("medium")
  scenario String
  options Json
  correctOptionIndex Int
  explain String @default("")
  version Int @default(1)
  isActive Boolean @default(true)
  createdAt DateTime @default(now())

  config AssessmentConfiguration @relation(fields: [configId], references: [id], onDelete: Cascade)
  topic JourneyTopic? @relation(fields: [topicId], references: [id], onDelete: SetNull)

  @@map("assessmentquestions")
}

model AssessmentAttempt {
  id String @id @default(cuid())
  userId String
  careerPathId String
  configId String
  status String @default("running")
  startedAt DateTime @default(now())
  expiresAt DateTime
  submittedAt DateTime?
  score Int?
  totalQuestions Int
  passed Boolean @default(false)
  timeUsedSeconds Int @default(0)
  topicBreakdown Json?
  weakTopics Json?
  idempotencyKey String @unique

  user User @relation("Rel_AssessmentAttempt_userId_User", fields: [userId], references: [id], onDelete: Cascade)
  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)
  config AssessmentConfiguration @relation(fields: [configId], references: [id], onDelete: Cascade)
  attemptQuestions AssessmentAttemptQuestion[]
  answers AssessmentAnswer[]

  @@index([userId, careerPathId, status])
  @@map("assessmentattempts")
}

model AssessmentAttemptQuestion {
  id String @id @default(cuid())
  attemptId String
  questionId String
  orderIndex Int
  snapshotScenario String
  snapshotOptions Json
  snapshotTopic String
  snapshotDifficulty String

  attempt AssessmentAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)

  @@unique([attemptId, orderIndex])
  @@map("assessmentattemptquestions")
}

model AssessmentAnswer {
  id String @id @default(cuid())
  attemptId String
  questionId String
  selectedOptionIndex Int?
  isFlagged Boolean @default(false)
  answeredAt DateTime @default(now())

  attempt AssessmentAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)

  @@unique([attemptId, questionId])
  @@map("assessmentanswers")
}

model CandidateResume {
  id String @id @default(cuid())
  userId String
  originalFilename String
  mimeType String
  fileSizeBytes Int
  fileHash String
  storageProvider String @default("local")
  storageKey String
  storageUrl String
  status String @default("ready")
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation("Rel_CandidateResume_userId_User", fields: [userId], references: [id], onDelete: Cascade)
  versions ResumeVersion[]

  @@index([userId, isActive])
  @@map("candidateresumes")
}

model ResumeVersion {
  id String @id @default(cuid())
  resumeId String
  versionNumber Int @default(1)
  rawText String @default("")
  canonicalData Json?
  targetRole String @default("")
  generationMethod String @default("uploaded")
  createdAt DateTime @default(now())

  resume CandidateResume @relation(fields: [resumeId], references: [id], onDelete: Cascade)
  evidences ResumeEvidence[]
  atsResults ATSScoringResult[]

  @@unique([resumeId, versionNumber])
  @@map("resumeversions")
}

model ResumeEvidence {
  id String @id @default(cuid())
  resumeVersionId String
  entityType String
  entityValue String
  normalizedValue String
  sourceSection String @default("EXPERIENCE")
  pageNumber Int @default(1)
  textEvidence String
  confidence Float @default(0.95)

  resumeVersion ResumeVersion @relation(fields: [resumeVersionId], references: [id], onDelete: Cascade)

  @@map("resumeevidences")
}

model ATSScoringConfiguration {
  id String @id @default(cuid())
  careerPathId String
  version Int @default(1)
  name String
  status String @default("PUBLISHED")
  baseScore Float @default(60)
  maxScore Float @default(98)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)
  rules ATSScoringRule[]

  @@unique([careerPathId, version])
  @@map("atsscoringconfigurations")
}

model ATSScoringRule {
  id String @id @default(cuid())
  configId String
  ruleName String
  category String @default("skills")
  ruleDSL Json
  points Float @default(0)
  maxContribution Float @default(20)
  priority Int @default(1)
  isEnabled Boolean @default(true)

  config ATSScoringConfiguration @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@map("atsscoringrules")
}

model ATSScoringResult {
  id String @id @default(cuid())
  userId String
  resumeVersionId String?
  careerPathId String
  score Float
  components Json
  matchedSkills Json
  missingSkills Json
  bulletRewrites Json
  futureRoadmap Json?
  createdAt DateTime @default(now())

  user User @relation("Rel_ATSScoringResult_userId_User", fields: [userId], references: [id], onDelete: Cascade)
  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)
  resumeVersion ResumeVersion? @relation(fields: [resumeVersionId], references: [id], onDelete: SetNull)

  @@index([userId, careerPathId])
  @@map("atsscoringresults")
}

model ReadinessConfiguration {
  id String @id @default(cuid())
  careerPathId String
  version Int @default(1)
  atsWeight Float @default(0.40)
  assessmentWeight Float @default(0.60)
  testPendingWeight Float @default(0.85)
  isPublished Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)
  bands ReadinessBand[]

  @@unique([careerPathId, version])
  @@map("readinessconfigurations")
}

model ReadinessBand {
  id String @id @default(cuid())
  configId String
  minScore Float
  maxScore Float
  bandClass String
  statusLabel String
  percentileBenchmark Int @default(50)
  clientShortlistProbability String @default("")
  certificateEligible Boolean @default(false)
  leadAccessGranted Boolean @default(false)
  recommendedActions Json?

  config ReadinessConfiguration @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@map("readinessbands")
}

model ReadinessResult {
  id String @id @default(cuid())
  userId String
  careerPathId String
  compositeScore Float
  bandClass String
  bandLabel String
  percentile Int
  atsScore Float
  assessmentScore Float?
  practiceScore Float?
  certificateEligible Boolean @default(false)
  leadAccessGranted Boolean @default(false)
  pillarBreakdown Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation("Rel_ReadinessResult_userId_User", fields: [userId], references: [id], onDelete: Cascade)
  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)

  @@index([userId, careerPathId])
  @@map("readinessresults")
}

model JourneyCertificate {
  id String @id @default(cuid())
  verificationId String @unique
  userId String
  careerPathId String
  targetRole String
  compositeScore Float
  assessmentScore Float
  atsScore Float
  issuedAt DateTime @default(now())
  expiresAt DateTime?
  status String @default("active")
  metadata Json?

  user User @relation("Rel_JourneyCertificate_userId_User", fields: [userId], references: [id], onDelete: Cascade)
  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)

  @@index([verificationId])
  @@index([userId, careerPathId])
  @@map("journeycertificates")
}

model CandidateActionPlan {
  id String @id @default(cuid())
  userId String
  careerPathId String
  title String
  tasks Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation("Rel_CandidateActionPlan_userId_User", fields: [userId], references: [id], onDelete: Cascade)
  careerPath CareerPath @relation(fields: [careerPathId], references: [id], onDelete: Cascade)

  @@unique([userId, careerPathId])
  @@map("candidateactionplans")
}

model LeadEligibilityRule {
  id String @id @default(cuid())
  category String @unique
  minAtsScore Float @default(60)
  minAssessmentScore Float @default(70)
  requireCertificate Boolean @default(false)
  requiredSkills Json?
  minExperienceYears Float @default(0)
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("leadeligibilityrules")
}

model RecommendationEventLog {
  id String @id @default(cuid())
  userId String
  entityType String
  entityId String
  eventType String
  metadata Json?
  createdAt DateTime @default(now())

  user User @relation("Rel_RecommendationEventLog_userId_User", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, entityType, eventType])
  @@map("recommendationeventlogs")
}

model JourneyAuditLog {
  id String @id @default(cuid())
  actorId String
  action String
  entityType String
  entityId String
  previousState Json?
  newState Json?
  createdAt DateTime @default(now())

  @@index([entityType, entityId])
  @@map("journeyauditlogs")
}

model FreelancerJourneyState {
  id String @id @default(cuid())
  userId String @unique
  activeStep Int @default(1)
  highestUnlockedStep Int @default(5)
  selectedPaths Json
  activeTrackKey String @default("qw")
  customAtsScore Float?
  updatedAt DateTime @updatedAt

  user User @relation("Rel_FreelancerJourneyState_userId_User", fields: [userId], references: [id], onDelete: Cascade)

  @@map("freelancerjourneystates")
}
`;

const finalContent = `${updatedWithUser}\n${newModels}`;

// Create backup first
fs.writeFileSync(`${schemaPath}.bak`, schemaContent);

// Write new content
fs.writeFileSync(schemaPath, finalContent);
console.log('Successfully added resume journey models to schema.prisma.');
