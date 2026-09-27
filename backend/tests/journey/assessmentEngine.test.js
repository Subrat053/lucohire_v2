const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getAssessmentConfig, startAssessmentAttempt, submitAssessment } = require('../../services/resumeJourney/assessment.service');
const prisma = require('../../config/prisma');

describe('Server-Authoritative Assessment Engine Tests', () => {
  test('getAssessmentConfig returns published exam parameters', async () => {
    const config = await getAssessmentConfig('p1');
    assert.ok(config);
    assert.equal(config.careerPathSlug, 'p1');
    assert.ok(config.timeLimitSeconds > 0);
    assert.equal(config.passingScorePercentage, 70);
  });

  test('startAssessmentAttempt sanitizes questions and hides answers', async () => {
    const user = await prisma.user.findFirst();
    if (!user) return;

    const attempt = await startAssessmentAttempt({ userId: user.id, careerPathSlug: 'p1' });
    assert.ok(attempt.attemptId);
    assert.ok(attempt.idempotencyKey);
    assert.ok(attempt.expiresAt);
    assert.ok(Array.isArray(attempt.questions));
    assert.ok(attempt.questions.length > 0);

    // CRITICAL: Ensure correctOptionIndex and explain are NOT present in client question objects!
    for (const q of attempt.questions) {
      assert.equal(q.correct, undefined, 'Correct option index must not leak to client!');
      assert.equal(q.correctOptionIndex, undefined, 'Correct option index must not leak to client!');
      assert.equal(q.explain, undefined, 'Explanation must not leak during active exam!');
      assert.ok(Array.isArray(q.options), 'Options must be present for presentation');
    }

    // Submit attempt to clean up
    const submission = await submitAssessment({
      attemptId: attempt.attemptId,
      userId: user.id,
      answers: {},
    });
    assert.ok(submission);
    assert.equal(typeof submission.score, 'number');

    // Test idempotency: submitting same attempt again must return duplicate without throwing
    const duplicate = await submitAssessment({
      attemptId: attempt.attemptId,
      userId: user.id,
      answers: {},
    });
    assert.equal(duplicate.isDuplicate, true);
    assert.equal(duplicate.score, submission.score);

    // Clean up
    await prisma.assessmentAttemptQuestion.deleteMany({ where: { attemptId: attempt.attemptId } });
    await prisma.assessmentAttempt.delete({ where: { id: attempt.attemptId } });
  });
});
