const crypto = require('crypto');
const prisma = require('../../config/prisma');

async function getAssessmentConfig(careerPathSlug = 'p1') {
  const careerPath = await prisma.careerPath.findUnique({
    where: { slug: careerPathSlug },
    include: {
      assessmentConfigs: {
        where: { isPublished: true },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!careerPath) {
    throw new Error(`Career path ${careerPathSlug} not found`);
  }

  const config = careerPath.assessmentConfigs?.[0];
  if (!config) {
    throw new Error(`No published assessment configuration found for ${careerPathSlug}`);
  }

  return {
    careerPathSlug,
    careerPathTitle: careerPath.title,
    timeLimitSeconds: config.timeLimitSeconds,
    secondsPerQuestion: config.secondsPerQuestion,
    passingScorePercentage: config.passingScorePercentage,
    totalQuestions: config.totalQuestions,
    cooldownHours: config.cooldownHours,
    maxAttempts: config.maxAttempts,
  };
}

async function startAssessmentAttempt({ userId, careerPathSlug = 'p1' }) {
  const careerPath = await prisma.careerPath.findUnique({
    where: { slug: careerPathSlug },
    include: {
      assessmentConfigs: {
        where: { isPublished: true },
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          questions: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (!careerPath) throw new Error(`Career path ${careerPathSlug} not found`);
  const config = careerPath.assessmentConfigs?.[0];
  if (!config) throw new Error('Assessment configuration not found');

  // Check for any currently running attempt
  const existingRunning = await prisma.assessmentAttempt.findFirst({
    where: {
      userId,
      careerPathId: careerPath.id,
      status: 'running',
      expiresAt: { gt: new Date() },
    },
    include: {
      attemptQuestions: { orderBy: { orderIndex: 'asc' } },
    },
  });

  if (existingRunning) {
    // Return existing running attempt with sanitized questions
    const sanitizedQuestions = existingRunning.attemptQuestions.map((aq) => ({
      orderIndex: aq.orderIndex,
      questionId: aq.questionId,
      scenario: aq.snapshotScenario,
      options: aq.snapshotOptions,
      topic: aq.snapshotTopic,
    }));

    return {
      attemptId: existingRunning.id,
      idempotencyKey: existingRunning.idempotencyKey,
      startedAt: existingRunning.startedAt,
      expiresAt: existingRunning.expiresAt,
      timeRemainingSeconds: Math.max(0, Math.round((new Date(existingRunning.expiresAt) - new Date()) / 1000)),
      totalQuestions: existingRunning.totalQuestions,
      questions: sanitizedQuestions,
      isResumed: true,
    };
  }

  // Create new attempt
  const pool = config.questions;
  if (!pool || pool.length === 0) {
    throw new Error('Insufficient questions in assessment question bank.');
  }

  // Take up to configured totalQuestions
  const selectedQuestions = pool.slice(0, config.totalQuestions);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (config.timeLimitSeconds * 1000));
  const idempotencyKey = crypto.randomUUID();

  const attempt = await prisma.$transaction(async (tx) => {
    const createdAttempt = await tx.assessmentAttempt.create({
      data: {
        userId,
        careerPathId: careerPath.id,
        configId: config.id,
        status: 'running',
        startedAt: now,
        expiresAt,
        totalQuestions: selectedQuestions.length,
        idempotencyKey,
      },
    });

    const questionSnapshots = selectedQuestions.map((q, idx) => ({
      attemptId: createdAttempt.id,
      questionId: q.id,
      orderIndex: idx,
      snapshotScenario: q.scenario,
      snapshotOptions: q.options,
      snapshotTopic: q.topicName,
      snapshotDifficulty: q.difficulty,
    }));

    await tx.assessmentAttemptQuestion.createMany({
      data: questionSnapshots,
    });

    return createdAttempt;
  });

  // Sanitized payload for browser (NEVER expose correct answer!)
  const sanitizedQuestions = selectedQuestions.map((q, idx) => ({
    orderIndex: idx,
    questionId: q.id,
    scenario: q.scenario,
    options: q.options,
    topic: q.topicName,
  }));

  return {
    attemptId: attempt.id,
    idempotencyKey,
    startedAt: now,
    expiresAt,
    timeRemainingSeconds: config.timeLimitSeconds,
    totalQuestions: selectedQuestions.length,
    questions: sanitizedQuestions,
    isResumed: false,
  };
}

async function saveAssessmentAnswer({ attemptId, questionId, selectedOptionIndex, isFlagged = false }) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt || attempt.status !== 'running') {
    return { success: false, reason: 'Attempt not active' };
  }

  // Check if expired
  if (new Date() > new Date(attempt.expiresAt)) {
    return { success: false, reason: 'Time expired' };
  }

  await prisma.assessmentAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId,
      },
    },
    update: {
      selectedOptionIndex,
      isFlagged,
      answeredAt: new Date(),
    },
    create: {
      attemptId,
      questionId,
      selectedOptionIndex,
      isFlagged,
    },
  });

  return { success: true };
}

async function submitAssessment({ attemptId, userId, answers = {} }) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      config: true,
      attemptQuestions: { orderBy: { orderIndex: 'asc' } },
      answers: true,
    },
  });

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.userId !== userId) throw new Error('Unauthorized attempt access');

  // Idempotency: if already submitted, return existing result
  if (attempt.status === 'submitted') {
    return {
      attemptId: attempt.id,
      score: attempt.score,
      total: attempt.totalQuestions,
      percentage: Math.round(((attempt.score || 0) / attempt.totalQuestions) * 100),
      passed: attempt.passed,
      timeUsedSeconds: attempt.timeUsedSeconds,
      topicBreakdown: attempt.topicBreakdown,
      weakTopics: attempt.weakTopics,
      isDuplicate: true,
    };
  }

  // Merge any answers passed in body
  for (const [qId, optIdx] of Object.entries(answers)) {
    await prisma.assessmentAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: qId } },
      update: { selectedOptionIndex: optIdx, answeredAt: new Date() },
      create: { attemptId, questionId: qId, selectedOptionIndex: optIdx },
    }).catch(() => {});
  }

  // Fetch updated answers
  const allAnswers = await prisma.assessmentAnswer.findMany({
    where: { attemptId },
  });
  const answerMap = new Map(allAnswers.map((a) => [a.questionId, a.selectedOptionIndex]));

  // Grade on server against actual questions
  const questionIds = attempt.attemptQuestions.map((aq) => aq.questionId);
  const actualQuestions = await prisma.assessmentQuestion.findMany({
    where: { id: { in: questionIds } },
  });
  const actualMap = new Map(actualQuestions.map((q) => [q.id, q]));

  let correctCount = 0;
  const topicBreakdown = {};
  const weakTopics = [];

  for (const aq of attempt.attemptQuestions) {
    const q = actualMap.get(aq.questionId);
    if (!q) continue;

    const chosen = answerMap.get(q.id);
    const isCorrect = chosen !== undefined && chosen === q.correctOptionIndex;

    if (isCorrect) correctCount++;

    const topic = q.topicName || 'General';
    if (!topicBreakdown[topic]) {
      topicBreakdown[topic] = { correct: 0, total: 0 };
    }
    topicBreakdown[topic].total++;
    if (isCorrect) {
      topicBreakdown[topic].correct++;
    } else {
      weakTopics.push(topic);
    }
  }

  const passingPct = attempt.config?.passingScorePercentage || 70;
  const pct = Math.round((correctCount / attempt.totalQuestions) * 100);
  const passed = pct >= passingPct;
  const timeUsed = Math.min(
    attempt.config?.timeLimitSeconds || 900,
    Math.round((new Date() - new Date(attempt.startedAt)) / 1000)
  );

  const updatedAttempt = await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'submitted',
      submittedAt: new Date(),
      score: correctCount,
      passed,
      timeUsedSeconds: timeUsed,
      topicBreakdown,
      weakTopics: [...new Set(weakTopics)],
    },
  });

  return {
    attemptId: updatedAttempt.id,
    score: correctCount,
    total: attempt.totalQuestions,
    percentage: pct,
    passed,
    timeUsedSeconds: timeUsed,
    topicBreakdown,
    weakTopics: [...new Set(weakTopics)],
    isDuplicate: false,
  };
}

module.exports = {
  getAssessmentConfig,
  startAssessmentAttempt,
  saveAssessmentAnswer,
  submitAssessment,
};
