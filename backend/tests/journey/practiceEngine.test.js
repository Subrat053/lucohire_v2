const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  detectCandidateTechStack,
  getPracticeModes,
  getPracticeQuestions,
  recordPracticeSubmission,
} = require('../../services/resumeJourney/practice.service');

describe('Step 3: Dynamic Multi-Stack Practice Engine Tests', () => {
  test('getPracticeModes returns 3 interactive modes with metadata', async () => {
    const modes = await getPracticeModes();
    assert.ok(Array.isArray(modes));
    assert.equal(modes.length, 3);

    const modeKeys = modes.map((m) => m.key);
    assert.ok(modeKeys.includes('easy'));
    assert.ok(modeKeys.includes('mixed'));
    assert.ok(modeKeys.includes('hard'));

    for (const m of modes) {
      assert.ok(m.title);
      assert.ok(m.description);
      assert.ok(m.questionCount > 0);
    }
  });

  test('detectCandidateTechStack defaults gracefully for unauthenticated users', async () => {
    const stack = await detectCandidateTechStack(null, 'p1');
    assert.ok(stack);
    assert.ok(stack.stackKey);
    assert.ok(stack.stackLabel);
    assert.ok(Array.isArray(stack.skillsSample));
  });

  test('getPracticeQuestions returns scenario questions with recruiter traps and explanations', async () => {
    const result = await getPracticeQuestions({
      careerPathSlug: 'p1',
      modeKey: 'mixed',
      count: 5,
    });

    assert.ok(result);
    assert.ok(result.techStack);
    assert.ok(Array.isArray(result.questions));
    assert.equal(result.questions.length, 5);

    for (const q of result.questions) {
      assert.ok(q.id);
      assert.ok(q.scenario && q.scenario.length > 10, 'Scenario must have descriptive problem');
      assert.ok(Array.isArray(q.options) && q.options.length >= 3, 'Must have at least 3 options');
      assert.equal(typeof q.correct, 'number');
      assert.ok(q.explain && q.explain.length > 5, 'Must provide architectural explanation');
      assert.ok(q.mistake && q.mistake.length > 5, 'Must provide recruiter pitfall insight');
    }
  });

  test('getPracticeQuestions respects easy and hard difficulty filters', async () => {
    const easyResult = await getPracticeQuestions({
      careerPathSlug: 'p1',
      modeKey: 'easy',
      count: 4,
    });
    assert.ok(easyResult.questions.length > 0);

    const hardResult = await getPracticeQuestions({
      careerPathSlug: 'p1',
      modeKey: 'hard',
      count: 4,
    });
    assert.ok(hardResult.questions.length > 0);
  });

  test('recordPracticeSubmission calculates streaks and identifies weak topics', async () => {
    const answers = [
      {
        questionId: 'q-test-1',
        topic: 'Python Asyncio',
        selectedOptionIndex: 0,
        isCorrect: true,
      },
      {
        questionId: 'q-test-2',
        topic: 'Java Spring Security',
        selectedOptionIndex: 1,
        isCorrect: true,
      },
      {
        questionId: 'q-test-3',
        topic: 'Database Indexes',
        selectedOptionIndex: 3,
        isCorrect: false,
      },
    ];

    const result = await recordPracticeSubmission({
      userId: null,
      careerPathSlug: 'p1',
      modeKey: 'mixed',
      answers,
      currentStreak: 2,
    });

    assert.ok(result);
    assert.equal(result.score, 2);
    assert.equal(result.total, 3);
    // Since answer 3 was incorrect, streak should reset to 0
    assert.equal(result.streak, 0);
    assert.ok(result.weakTopics.includes('Database Indexes'));
  });

  test('recordPracticeSubmission increments streak on perfect round', async () => {
    const answers = [
      { questionId: 'q-test-1', topic: 'Docker', selectedOptionIndex: 0, isCorrect: true },
      { questionId: 'q-test-2', topic: 'Kubernetes', selectedOptionIndex: 1, isCorrect: true },
    ];

    const result = await recordPracticeSubmission({
      userId: null,
      careerPathSlug: 'p1',
      modeKey: 'mixed',
      answers,
      currentStreak: 3,
    });

    assert.equal(result.score, 2);
    assert.equal(result.total, 2);
    // All correct: 3 + 2 = 5
    assert.equal(result.streak, 5);
    assert.equal(result.weakTopics.length, 0);
  });
});
