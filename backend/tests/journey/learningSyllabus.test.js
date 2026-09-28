const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  synthesizeDynamicSyllabus,
  getAiExplanationForTopic,
  getRecruiterQuestionsForTopic,
  setAiTutorFeatureOverride,
  TOPIC_KNOWLEDGE_BASE,
} = require('../../services/resumeJourney/learning.service');

describe('Step 2 Padhaao Dynamic Syllabus & AI Learning Tests', () => {
  test('synthesizeDynamicSyllabus generates 3 demand-weighted tiers (Basic, Medium, Premium)', async () => {
    const syllabus = await synthesizeDynamicSyllabus({ userId: 'test_candidate_1', careerPathSlug: 'p1' });

    assert.ok(syllabus, 'Syllabus must be returned');
    assert.equal(syllabus.careerPathSlug, 'p1');
    assert.deepEqual(syllabus.trackOrder, ['basic', 'medium', 'premium']);

    // Check Basic Tier
    assert.ok(syllabus.tracks.basic, 'Basic track must exist');
    assert.equal(syllabus.tracks.basic.label, 'Basic Essentials');
    assert.equal(syllabus.tracks.basic.impact, 'High Recruiter Filter Gaps');
    assert.ok(syllabus.tracks.basic.chapters.length >= 3, 'Must have at least 3 basic chapters');

    // Check Medium Tier
    assert.ok(syllabus.tracks.medium, 'Medium track must exist');
    assert.equal(syllabus.tracks.medium.label, 'Medium (High-Demand Trends)');
    assert.equal(syllabus.tracks.medium.impact, 'Top Hiring Trend (2026)');
    assert.ok(syllabus.tracks.medium.chapters.length >= 3, 'Must have at least 3 medium chapters');

    // Check Premium Tier
    assert.ok(syllabus.tracks.premium, 'Premium track must exist');
    assert.equal(syllabus.tracks.premium.label, 'Premium (Architecture & Multipliers)');
    assert.equal(syllabus.tracks.premium.impact, '40–70% Higher Pay Band');
    assert.ok(syllabus.tracks.premium.chapters.length >= 3, 'Must have at least 3 premium chapters');

    // Verify backward compatibility aliases
    assert.equal(syllabus.tracks.qw, syllabus.tracks.basic);
    assert.equal(syllabus.tracks.fp, syllabus.tracks.medium);
    assert.equal(syllabus.tracks.pm, syllabus.tracks.premium);
  });

  test('chapters contain comprehensive, truthful educational details', async () => {
    const syllabus = await synthesizeDynamicSyllabus({ userId: 'test_candidate_2', careerPathSlug: 'p1' });
    const gitChapter = syllabus.tracks.basic.chapters.find(c => c.key === 'basic-0');

    assert.ok(gitChapter, 'Git chapter must exist');
    assert.equal(gitChapter.name, 'Git & GitHub Collaborative Workflow');
    assert.ok(gitChapter.readTimeMinutes > 0);
    assert.ok(gitChapter.stat1?.v, 'Stat 1 value must be present');
    assert.ok(gitChapter.stat2?.v, 'Stat 2 value must be present');
    assert.ok(gitChapter.why.length > 20, 'Why explanation must be detailed');
    assert.ok(Array.isArray(gitChapter.companyWork) && gitChapter.companyWork.length >= 2);
    assert.ok(Array.isArray(gitChapter.interviewQs) && gitChapter.interviewQs.length >= 2);
    assert.ok(Array.isArray(gitChapter.core) && gitChapter.core.length >= 2);
    assert.ok(gitChapter.beforeCode, 'Before code must be provided');
    assert.ok(gitChapter.afterCode, 'After code must be provided');
    assert.ok(Array.isArray(gitChapter.checklist) && gitChapter.checklist.length >= 2);
    assert.ok(gitChapter.resumeLine.length > 20, 'Resume bullet point must be provided');
  });

  test('in-memory RAM cache returns cached instance within TTL', async () => {
    const start1 = Date.now();
    const syllabus1 = await synthesizeDynamicSyllabus({ userId: 'cached_user', careerPathSlug: 'p1' });
    const duration1 = Date.now() - start1;

    const start2 = Date.now();
    const syllabus2 = await synthesizeDynamicSyllabus({ userId: 'cached_user', careerPathSlug: 'p1' });
    const duration2 = Date.now() - start2;

    assert.equal(syllabus1.timestamp, syllabus2.timestamp, 'Cached timestamp must match');
    assert.ok(duration2 <= duration1 + 5, 'Second call should hit in-memory RAM cache');
  });

  test('getAiExplanationForTopic produces structured guidance for on-topic question', async () => {
    setAiTutorFeatureOverride(null); // Ensure enabled
    const explanation = await getAiExplanationForTopic({
      userId: 'test_candidate_3',
      chapterKey: 'medium-0',
      topicName: 'TypeScript Strict Mode & Enterprise Typing',
      question: 'How do I use discriminated unions in my Next.js project?',
    });

    assert.ok(explanation, 'AI explanation must return structured object');
    assert.equal(explanation.isOffTopic, false);
    assert.ok(explanation.topic);
    assert.ok(explanation.summary.length > 20);
    assert.ok(Array.isArray(explanation.keyTakeaways) && explanation.keyTakeaways.length >= 2);
    assert.ok(explanation.recommendedAction.length > 10);
    assert.ok(Array.isArray(explanation.suggestedQuestions));
  });

  test('topic relevance guardrail rejects off-topic questions politely with zero token spend', async () => {
    setAiTutorFeatureOverride(null);
    const offTopicResult = await getAiExplanationForTopic({
      userId: 'test_candidate_4',
      chapterKey: 'basic-0',
      topicName: 'Git & GitHub Collaborative Workflow',
      question: 'What is the best chocolate cake recipe for a birthday party?',
    });

    assert.ok(offTopicResult, 'Result must be returned');
    assert.equal(offTopicResult.isOffTopic, true, 'Must flag query as off-topic');
    assert.ok(
      offTopicResult.explanation.includes('Please ask questions related to this lesson'),
      'Must contain polite redirection without rude phrasing'
    );
    assert.ok(!offTopicResult.explanation.includes('business'), 'Must not contain rude phrases');
    assert.ok(Array.isArray(offTopicResult.suggestedQuestions), 'Must provide suggested topic questions');
    assert.ok(offTopicResult.suggestedQuestions.length > 0);
  });

  test('admin feature flag disables AI tutor gracefully when toggled off', async () => {
    // Set override to false
    setAiTutorFeatureOverride(false);

    const disabledResult = await getAiExplanationForTopic({
      userId: 'test_candidate_5',
      chapterKey: 'basic-0',
      topicName: 'Git & GitHub Collaborative Workflow',
      question: 'Explain git rebase in plain English',
    });

    assert.ok(disabledResult, 'Result must be returned');
    assert.equal(disabledResult.isFeatureDisabled, true, 'Must indicate feature is disabled');
    assert.ok(disabledResult.explanation.includes('paused in administrator settings'));

    // Reset override
    setAiTutorFeatureOverride(null);
  });

  test('getRecruiterQuestionsForTopic returns varied questions with category, difficulty and tips', async () => {
    setAiTutorFeatureOverride(null);
    const result = await getRecruiterQuestionsForTopic({
      chapterKey: 'basic-0',
      topicName: 'Git & GitHub Collaborative Workflow',
      count: 3,
    });

    assert.ok(result, 'Result should exist');
    assert.equal(result.isFeatureDisabled, false);
    assert.equal(result.topic, 'Git & GitHub Collaborative Workflow');
    assert.ok(Array.isArray(result.questions));
    assert.equal(result.questions.length, 3);

    for (const q of result.questions) {
      assert.ok(q.question && typeof q.question === 'string');
      assert.ok(q.category, 'Question must have category');
      assert.ok(q.difficulty, 'Question must have difficulty');
      assert.ok(q.recruiterTip, 'Question must have recruiterTip');
      assert.ok(q.sampleAnswerHook, 'Question must have sampleAnswerHook');
    }
  });

  test('getRecruiterQuestionsForTopic excludes previously seen questions correctly', async () => {
    setAiTutorFeatureOverride(null);
    const batch1 = await getRecruiterQuestionsForTopic({
      chapterKey: 'basic-0',
      topicName: 'Git & GitHub Collaborative Workflow',
      count: 3,
      excludeQuestions: [],
    });

    const seenQuestions = batch1.questions.map((q) => q.question);

    const batch2 = await getRecruiterQuestionsForTopic({
      chapterKey: 'basic-0',
      topicName: 'Git & GitHub Collaborative Workflow',
      count: 3,
      excludeQuestions: seenQuestions,
    });

    assert.ok(batch2.questions.length > 0);
    for (const q of batch2.questions) {
      assert.ok(
        !seenQuestions.includes(q.question),
        `Question "${q.question}" should not have been repeated from batch 1`
      );
    }
  });

  test('getRecruiterQuestionsForTopic respects admin feature flag when disabled', async () => {
    setAiTutorFeatureOverride(false);

    const disabledResult = await getRecruiterQuestionsForTopic({
      chapterKey: 'basic-0',
      topicName: 'Git & GitHub Collaborative Workflow',
      count: 3,
    });

    assert.ok(disabledResult);
    assert.equal(disabledResult.isFeatureDisabled, true);
    assert.ok(disabledResult.questions.length > 0);
    assert.ok(disabledResult.message.includes('paused'));

    setAiTutorFeatureOverride(null);
  });
});

