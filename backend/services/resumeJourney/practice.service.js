const prisma = require('../../config/prisma');

async function getPracticeModes() {
  return prisma.practiceMode.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

async function getPracticeQuestions({ careerPathSlug = 'p1', modeKey = 'mixed', userId = null }) {
  const careerPath = await prisma.careerPath.findUnique({
    where: { slug: careerPathSlug },
  });

  if (!careerPath) {
    throw new Error(`Career path ${careerPathSlug} not found`);
  }

  const mode = await prisma.practiceMode.findUnique({ where: { modeKey } });
  const questionLimit = mode?.questionCount || 5;

  let questions = [];

  if (modeKey === 'weak' && userId) {
    // Adaptive: fetch top weak topics for candidate
    const weakTopics = await prisma.topicPerformance.findMany({
      where: { userId, weaknessScore: { gt: 0.3 } },
      orderBy: { weaknessScore: 'desc' },
      take: 3,
      select: { topicName: true },
    });

    const weakNames = weakTopics.map((w) => w.topicName);
    if (weakNames.length > 0) {
      questions = await prisma.practiceQuestion.findMany({
        where: {
          careerPathId: careerPath.id,
          isActive: true,
          topicName: { in: weakNames },
        },
        take: questionLimit,
      });
    }
  }

  if (questions.length === 0) {
    const whereClause = {
      careerPathId: careerPath.id,
      isActive: true,
    };
    if (modeKey === 'speed') {
      whereClause.difficulty = { in: ['easy', 'medium'] };
    }
    questions = await prisma.practiceQuestion.findMany({
      where: whereClause,
      take: questionLimit,
    });
  }

  // Format questions with explanation for instant feedback loop
  return questions.map((q) => ({
    id: q.id,
    topic: q.topicName,
    difficulty: q.difficulty,
    scenario: q.scenario,
    options: q.options,
    correct: q.correctOptionIndex,
    explain: q.explain,
    mistake: q.mistake,
  }));
}

async function recordPracticeSubmission({ userId, careerPathSlug, modeKey, answers = [], currentStreak = 0 }) {
  const careerPath = await prisma.careerPath.findUnique({
    where: { slug: careerPathSlug },
  });

  if (!careerPath) {
    throw new Error(`Career path ${careerPathSlug} not found`);
  }

  let correctCount = 0;
  const missedTopics = [];
  const processedAnswers = [];

  for (const item of answers) {
    const question = await prisma.practiceQuestion.findUnique({
      where: { id: item.questionId },
    });

    if (!question) continue;

    const isCorrect = item.selectedOptionIndex === question.correctOptionIndex;
    if (isCorrect) {
      correctCount++;
    } else {
      missedTopics.push(question.topicName);
    }

    processedAnswers.push({
      questionId: question.id,
      selectedOptionIndex: item.selectedOptionIndex,
      isCorrect,
    });

    // Update TopicPerformance
    if (userId) {
      const perf = await prisma.topicPerformance.findUnique({
        where: {
          userId_topicName: {
            userId,
            topicName: question.topicName,
          },
        },
      });

      const newTotal = (perf?.totalAttempts || 0) + 1;
      const newCorrect = (perf?.correctCount || 0) + (isCorrect ? 1 : 0);
      const newIncorrect = (perf?.incorrectCount || 0) + (isCorrect ? 0 : 1);
      const weakness = newTotal > 0 ? (newIncorrect / newTotal) : 0;

      await prisma.topicPerformance.upsert({
        where: {
          userId_topicName: {
            userId,
            topicName: question.topicName,
          },
        },
        update: {
          correctCount: newCorrect,
          incorrectCount: newIncorrect,
          totalAttempts: newTotal,
          weaknessScore: weakness,
          lastAttemptedAt: new Date(),
        },
        create: {
          userId,
          topicName: question.topicName,
          correctCount: isCorrect ? 1 : 0,
          incorrectCount: isCorrect ? 0 : 1,
          totalAttempts: 1,
          weaknessScore: isCorrect ? 0 : 1,
        },
      });
    }
  }

  const finalStreak = answers.every((a) => processedAnswers.find((p) => p.questionId === a.questionId)?.isCorrect)
    ? currentStreak + answers.length
    : 0;

  // Persist PracticeAttempt
  const attempt = await prisma.practiceAttempt.create({
    data: {
      userId,
      careerPathId: careerPath.id,
      modeKey,
      score: correctCount,
      totalQuestions: answers.length,
      streak: finalStreak,
      answers: {
        create: processedAnswers.map((pa) => ({
          questionId: pa.questionId,
          selectedOptionIndex: pa.selectedOptionIndex,
          isCorrect: pa.isCorrect,
        })),
      },
    },
  });

  return {
    attemptId: attempt.id,
    score: correctCount,
    total: answers.length,
    streak: finalStreak,
    weakTopics: [...new Set(missedTopics)],
  };
}

module.exports = {
  getPracticeModes,
  getPracticeQuestions,
  recordPracticeSubmission,
};
