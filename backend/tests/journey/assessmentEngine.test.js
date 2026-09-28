const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  getAssessmentConfig,
  startAssessmentAttempt,
  saveAssessmentAnswer,
  submitAssessment,
  seedAssessmentQuestionsToDB,
} = require('../../services/resumeJourney/assessment.service');
const prisma = require('../../config/prisma');

describe('Server-Authoritative Assessment Engine Tests', () => {
  test('getAssessmentConfig returns published exam parameters', async () => {
    const config = await getAssessmentConfig('p1');
    assert.ok(config);
    assert.equal(config.careerPathSlug, 'p1');
    assert.ok(config.timeLimitSeconds > 0);
    assert.equal(config.passingScorePercentage, 70);
    assert.ok(config.totalQuestions >= 5);
  });

  test('seedAssessmentQuestionsToDB populates multi-stack questions into PostgreSQL', async () => {
    await seedAssessmentQuestionsToDB();
    const count = await prisma.assessmentQuestion.count();
    assert.ok(count >= 20, 'PostgreSQL assessmentQuestion bank must contain at least 20 questions');

    // Verify multi-stack topics exist
    const topics = await prisma.assessmentQuestion.findMany({
      select: { topicName: true },
      distinct: ['topicName'],
    });
    const topicNames = topics.map((t) => t.topicName);
    assert.ok(topicNames.some((t) => /python|asyncio/i.test(t)), 'Must contain Python topics');
    assert.ok(topicNames.some((t) => /java|spring|jpa/i.test(t)), 'Must contain Java topics');
    assert.ok(topicNames.some((t) => /docker|kubernetes|go/i.test(t)), 'Must contain DevOps/Go topics');
  });

  test('startAssessmentAttempt sanitizes questions and hides answers', async () => {
    const user = await prisma.user.findFirst();
    const userId = user?.id || 'test-user-id';

    const attempt = await startAssessmentAttempt({ userId, careerPathSlug: 'p1' });
    assert.ok(attempt.attemptId);
    assert.ok(attempt.idempotencyKey);
    assert.ok(attempt.expiresAt);
    assert.ok(attempt.timeRemainingSeconds > 0);
    assert.ok(Array.isArray(attempt.questions));
    assert.ok(attempt.questions.length >= 5);

    // CRITICAL: Ensure correctOptionIndex and explain are NOT present in client question objects!
    for (const q of attempt.questions) {
      assert.equal(q.correct, undefined, 'Correct option index must not leak to client!');
      assert.equal(q.correctOptionIndex, undefined, 'Correct option index must not leak to client!');
      assert.equal(q.explain, undefined, 'Explanation must not leak during active exam!');
      assert.ok(Array.isArray(q.options), 'Options must be present for presentation');
    }

    // Test saving an answer (quiet sync, no correctness leaked)
    const firstQ = attempt.questions[0];
    const saveRes = await saveAssessmentAnswer({
      attemptId: attempt.attemptId,
      questionId: firstQ.id,
      selectedOptionIndex: 1,
      isFlagged: true,
    });
    assert.equal(saveRes.success, true);
    assert.equal(saveRes.isCorrect, undefined, 'Answer correctness must not be leaked during active exam');

    // Submit attempt to grade
    const submission = await submitAssessment({
      attemptId: attempt.attemptId,
      userId,
      answers: { [firstQ.id]: 1 },
    });
    assert.ok(submission);
    assert.equal(typeof submission.score, 'number');
    assert.equal(typeof submission.percentage, 'number');
    assert.ok(Array.isArray(submission.questionReviews));
    assert.equal(submission.questionReviews.length, attempt.questions.length);

    // In solution review, correctOptionIndex and explain are safely provided post-exam
    const reviewedFirst = submission.questionReviews[0];
    assert.ok(reviewedFirst);
    assert.equal(typeof reviewedFirst.correctOptionIndex, 'number');
    assert.equal(typeof reviewedFirst.isCorrect, 'boolean');

    // Test idempotency: submitting same attempt again must return duplicate without throwing
    const duplicate = await submitAssessment({
      attemptId: attempt.attemptId,
      userId,
      answers: {},
    });
    assert.equal(duplicate.isDuplicate, true);
    assert.equal(duplicate.score, submission.score);
    assert.ok(Array.isArray(duplicate.questionReviews));

    // Clean up
    await prisma.assessmentAnswer.deleteMany({ where: { attemptId: attempt.attemptId } }).catch(() => {});
    await prisma.assessmentAttemptQuestion.deleteMany({ where: { attemptId: attempt.attemptId } }).catch(() => {});
    await prisma.assessmentAttempt.delete({ where: { id: attempt.attemptId } }).catch(() => {});
  });
});
