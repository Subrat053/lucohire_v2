const prisma = require('../../config/prisma');
const { calculateAtsAnalysis } = require('./atsEngine.service');
const { calculateReadinessVerdict } = require('./readiness.service');

async function getFullJourneyState(userId) {
  // 1. Get or initialize FreelancerJourneyState
  let state = await prisma.freelancerJourneyState.findUnique({
    where: { userId },
  });

  if (!state) {
    state = await prisma.freelancerJourneyState.create({
      data: {
        userId,
        activeStep: 1,
        highestUnlockedStep: 5,
        selectedPaths: ['p1'],
        activeTrackKey: 'qw',
      },
    });
  }

  // 2. Fetch Latest Active Resume
  const latestResume = await prisma.candidateResume.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  // 3. Fetch Completed Chapters
  const completions = await prisma.chapterCompletion.findMany({
    where: { userId },
    include: { chapter: { select: { chapterKey: true } } },
  });
  const completedChapterKeys = completions.map((c) => c.chapter?.chapterKey).filter(Boolean);

  // 4. Fetch Latest Practice Attempt & Streak
  const latestPractice = await prisma.practiceAttempt.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const topicPerfs = await prisma.topicPerformance.findMany({
    where: { userId, weaknessScore: { gt: 0.2 } },
    orderBy: { weaknessScore: 'desc' },
    select: { topicName: true },
    take: 3,
  });
  const weakTopics = topicPerfs.map((tp) => tp.topicName);

  // 5. Fetch Latest Assessment Attempt
  const latestAssessment = await prisma.assessmentAttempt.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  });

  // 6. Fetch Latest Certificate
  const activeCert = await prisma.journeyCertificate.findFirst({
    where: { userId, status: 'active' },
    orderBy: { issuedAt: 'desc' },
  });

  // 7. Fetch Latest ATS Result
  const selectedPathSlug = Array.isArray(state.selectedPaths) && state.selectedPaths.length > 0
    ? state.selectedPaths[0]
    : 'p1';

  let latestAts = await prisma.aTSScoringResult.findFirst({
    where: { userId, careerPathId: selectedPathSlug },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestAts) {
    try {
      latestAts = await calculateAtsAnalysis({ userId, careerPathSlug: selectedPathSlug });
    } catch {
      latestAts = { atsScore: 64 };
    }
  }

  // 8. Fetch Latest Readiness Result
  let latestReadiness;
  try {
    latestReadiness = await calculateReadinessVerdict({ userId, careerPathSlug: selectedPathSlug });
  } catch {
    latestReadiness = { combinedScore: 68, bandClass: 'mid', bandLabel: 'Nearly Ready', percentile: 65 };
  }

  return {
    activeStep: state.activeStep || 1,
    highestUnlockedStep: state.highestUnlockedStep || 5,
    selectedPaths: state.selectedPaths || ['p1'],
    activeTrackKey: state.activeTrackKey || 'qw',
    currentResume: latestResume
      ? {
          name: latestResume.originalFilename,
          url: latestResume.storageUrl,
          size: `${Math.round(latestResume.fileSizeBytes / 1024)} KB`,
          isReal: true,
        }
      : null,
    atsScore: latestAts?.score || latestAts?.atsScore || 64,
    customAtsScore: state.customAtsScore,
    completedChapters: completedChapterKeys,
    practiceState: {
      mode: latestPractice?.modeKey || 'mixed',
      streak: latestPractice?.streak || 0,
      pScore: latestPractice?.score || 0,
      pTotal: latestPractice?.totalQuestions || 0,
      weakTopics,
      completedCount: latestPractice ? 1 : 0,
    },
    testState: latestAssessment
      ? {
          status: latestAssessment.status,
          score: latestAssessment.score,
          total: latestAssessment.totalQuestions,
          timeUsed: latestAssessment.timeUsedSeconds,
          topicBreakdown: latestAssessment.topicBreakdown || {},
          weakTopics: latestAssessment.weakTopics || [],
          expiresAt: latestAssessment.expiresAt,
        }
      : {
          status: 'intro',
          score: null,
          total: null,
          timeUsed: 0,
          topicBreakdown: {},
          weakTopics: [],
        },
    readinessVerdict: latestReadiness,
    certificate: activeCert
      ? {
          verificationId: activeCert.verificationId,
          targetRole: activeCert.targetRole,
          compositeScore: activeCert.compositeScore,
          issuedAt: activeCert.issuedAt,
        }
      : null,
  };
}

async function updateJourneyProgress({ userId, activeStep, selectedPaths, activeTrackKey, customAtsScore }) {
  const updateData = {};
  if (activeStep !== undefined) updateData.activeStep = activeStep;
  if (selectedPaths !== undefined) updateData.selectedPaths = selectedPaths;
  if (activeTrackKey !== undefined) updateData.activeTrackKey = activeTrackKey;
  if (customAtsScore !== undefined) updateData.customAtsScore = customAtsScore;

  return prisma.freelancerJourneyState.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      activeStep: activeStep || 1,
      selectedPaths: selectedPaths || ['p1'],
      activeTrackKey: activeTrackKey || 'qw',
      customAtsScore: customAtsScore || null,
    },
  });
}

async function resetJourneyProgress(userId) {
  // Clear attempt records and reset state
  await prisma.chapterCompletion.deleteMany({ where: { userId } });
  await prisma.practiceAttempt.deleteMany({ where: { userId } });
  await prisma.topicPerformance.deleteMany({ where: { userId } });
  await prisma.assessmentAttempt.deleteMany({ where: { userId } });

  await prisma.freelancerJourneyState.upsert({
    where: { userId },
    update: {
      activeStep: 1,
      highestUnlockedStep: 5,
      selectedPaths: ['p1'],
      activeTrackKey: 'qw',
      customAtsScore: null,
    },
    create: {
      userId,
      activeStep: 1,
      highestUnlockedStep: 5,
      selectedPaths: ['p1'],
      activeTrackKey: 'qw',
    },
  });

  return { success: true, message: 'Journey progress reset successfully' };
}

module.exports = {
  getFullJourneyState,
  updateJourneyProgress,
  resetJourneyProgress,
};
