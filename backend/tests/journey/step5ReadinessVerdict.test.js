const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../../config/prisma');
const { calculateReadinessVerdict } = require('../../services/resumeJourney/readiness.service');
const { getOrCreateCertificate, verifyPublicCertificate } = require('../../services/resumeJourney/certificate.service');

describe('Step 5: Dynamic Readiness Verdict & Certificate Ledger Tests', () => {
  let testUser;
  let testCareerPath;

  before(async () => {
    // 1. Create or retrieve test career path
    testCareerPath = await prisma.careerPath.upsert({
      where: { slug: 'p1' },
      update: {},
      create: {
        slug: 'p1',
        title: 'Junior Frontend Developer',
        subTitle: 'Entry-level frontend specialist',
        badge: 'Popular',
        kya: 'Frontend development foundation',
        oneLiner: 'Build modern user interfaces with React and JavaScript',
      },
    });

    // 2. Create test user with real name
    testUser = await prisma.user.create({
      data: {
        email: `test_step5_candidate_${Date.now()}@example.com`,
        name: 'Aarav Sharma',
        role: 'freelancer',
      },
    });

    // 3. Seed ATS Scoring Result (Step 1)
    await prisma.aTSScoringResult.create({
      data: {
        userId: testUser.id,
        careerPathId: testCareerPath.id,
        score: 82,
        components: { core: 80, experience: 85 },
        matchedSkills: ['JavaScript', 'HTML5', 'React'],
        missingSkills: ['TypeScript Generics', 'Next.js App Router'],
        bulletRewrites: [],
      },
    });

    // 4. Seed Chapter Completions (Step 2)
    const testTrack = await prisma.learningTrack.upsert({
      where: {
        careerPathId_trackKey: {
          careerPathId: testCareerPath.id,
          trackKey: 'basic',
        },
      },
      update: {},
      create: {
        careerPathId: testCareerPath.id,
        trackKey: 'basic',
        label: 'Foundation',
      },
    });

    const testChapter1 = await prisma.learningChapter.upsert({
      where: {
        trackId_chapterKey: {
          trackId: testTrack.id,
          chapterKey: 'git_essentials',
        },
      },
      update: {},
      create: {
        trackId: testTrack.id,
        chapterKey: 'git_essentials',
        name: 'Git Essentials',
      },
    });

    const testChapter2 = await prisma.learningChapter.upsert({
      where: {
        trackId_chapterKey: {
          trackId: testTrack.id,
          chapterKey: 'react_core_hooks',
        },
      },
      update: {},
      create: {
        trackId: testTrack.id,
        chapterKey: 'react_core_hooks',
        name: 'React Core Hooks',
      },
    });

    await prisma.chapterCompletion.create({
      data: {
        userId: testUser.id,
        chapterId: testChapter1.id,
      },
    });
    await prisma.chapterCompletion.create({
      data: {
        userId: testUser.id,
        chapterId: testChapter2.id,
      },
    });

    // 5. Seed Practice Reps (Step 3)
    await prisma.practiceAttempt.create({
      data: {
        userId: testUser.id,
        careerPathId: testCareerPath.id,
        modeKey: 'mixed',
        totalQuestions: 10,
        score: 8,
      },
    });

    // 6. Seed Assessment Attempt (Step 4)
    const testConfig = await prisma.assessmentConfiguration.findFirst({
      where: { careerPathId: testCareerPath.id },
    }) || await prisma.assessmentConfiguration.create({
      data: {
        careerPathId: testCareerPath.id,
        version: 1,
        questionCount: 10,
        timeLimitSeconds: 900,
        passingScore: 7,
      },
    });

    await prisma.assessmentAttempt.create({
      data: {
        userId: testUser.id,
        careerPathId: testCareerPath.id,
        configId: testConfig.id,
        status: 'submitted',
        totalQuestions: 10,
        score: 8,
        timeUsedSeconds: 320,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        idempotencyKey: `idem_test_${Date.now()}`,
        weakTopics: ['REST API Caching'],
      },
    });
  });

  after(async () => {
    // Cleanup seeded records
    try {
      if (testUser) {
        await prisma.journeyCertificate.deleteMany({ where: { userId: testUser.id } });
        await prisma.candidateActionPlan.deleteMany({ where: { userId: testUser.id } });
        await prisma.readinessResult.deleteMany({ where: { userId: testUser.id } });
        await prisma.assessmentAttempt.deleteMany({ where: { userId: testUser.id } });
        await prisma.practiceAttempt.deleteMany({ where: { userId: testUser.id } });
        await prisma.chapterCompletion.deleteMany({ where: { userId: testUser.id } });
        await prisma.aTSScoringResult.deleteMany({ where: { userId: testUser.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
      }
    } catch {
      // Ignore cleanup error in test
    }
  });

  test('calculateReadinessVerdict synthesizes all 4 pillars and persists action plan', async () => {
    const verdict = await calculateReadinessVerdict({
      userId: testUser.id,
      careerPathSlug: 'p1',
      forceRefresh: true,
    });

    assert.ok(verdict);
    assert.equal(verdict.careerPathSlug, 'p1');
    assert.equal(verdict.roleTitle, 'Junior Frontend Developer');
    assert.ok(verdict.combinedScore >= 70, `Expected score >= 70, got ${verdict.combinedScore}`);
    assert.equal(verdict.hasTestData, true);
    assert.equal(verdict.testPct, 80);
    assert.equal(verdict.atsScore, 82);
    assert.equal(verdict.lessonsCompleted, 2);
    assert.equal(verdict.totalLessons, 12);
    assert.equal(verdict.practiceReps, 10);
    assert.equal(verdict.isCached, false);

    // Verify 30-Day Action Plan
    assert.ok(Array.isArray(verdict.actionPlan));
    assert.equal(verdict.actionPlan.length, 4);
    assert.equal(verdict.actionPlan[0].week, 'Week 1');

    // Verify Persisted DB Plan
    const dbPlan = await prisma.candidateActionPlan.findUnique({
      where: {
        userId_careerPathId: {
          userId: testUser.id,
          careerPathId: testCareerPath.id,
        },
      },
    });
    assert.ok(dbPlan);
    assert.ok(Array.isArray(dbPlan.tasks));
  });

  test('Database cache check returns existing action plan without consuming tokens', async () => {
    const cachedVerdict = await calculateReadinessVerdict({
      userId: testUser.id,
      careerPathSlug: 'p1',
      forceRefresh: false,
    });

    assert.ok(cachedVerdict);
    assert.equal(cachedVerdict.isCached, true);
    assert.equal(cachedVerdict.combinedScore >= 70, true);
    assert.ok(Array.isArray(cachedVerdict.actionPlan));
  });

  test('Plan comparison provides feasible Plan A and Plan B pathways', async () => {
    const verdict = await calculateReadinessVerdict({
      userId: testUser.id,
      careerPathSlug: 'p1',
    });

    assert.ok(verdict.planA);
    assert.ok(verdict.planB);

    assert.equal(verdict.planA.role, 'Junior Frontend Developer');
    assert.ok(verdict.planA.timeline.includes('3–4 weeks'));

    assert.equal(verdict.planB.role, 'Frontend Developer');
    assert.ok(verdict.planB.matchProbability >= 85);
    assert.ok(verdict.planB.timeline.includes('Immediate'));
  });

  test('getOrCreateCertificate generates verified credential with real candidate name', async () => {
    const cert = await getOrCreateCertificate({
      userId: testUser.id,
      careerPathSlug: 'p1',
    });

    assert.ok(cert);
    assert.ok(cert.verificationId.startsWith('LH-VER-'));
    assert.equal(cert.candidateName, 'Aarav Sharma');
    assert.equal(cert.targetRole, 'Junior Frontend Developer');
    assert.ok(cert.compositeScore >= 70);
    assert.equal(cert.status, 'active');

    // Verify public ledger
    const publicRecord = await verifyPublicCertificate(cert.verificationId);
    assert.equal(publicRecord.valid, true);
    assert.equal(publicRecord.candidateName, 'Aarav Sharma');
    assert.equal(publicRecord.verificationId, cert.verificationId);
    assert.equal(publicRecord.targetRole, 'Junior Frontend Developer');
  });
});
