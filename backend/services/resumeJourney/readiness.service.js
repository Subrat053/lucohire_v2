const prisma = require('../../config/prisma');

const ROLE_BY_PATH = {
  p1: { role: 'Junior Frontend Developer', pay: '3–6 LPA', marketComp: '₹3–6 LPA' },
  p2: { role: 'Frontend Developer', pay: '6–10 LPA', marketComp: '₹8–12 LPA' },
  p3: { role: 'Senior Frontend Engineer', pay: '15 LPA+', marketComp: '₹15–25 LPA' },
  p4: { role: 'Full-stack Developer', pay: 'Future-safe roles', marketComp: '₹18–28 LPA' },
};

const PLAN_B_BY_PATH = {
  p1: { role: 'Frontend Developer', context: 'Service-based companies & client contracts', pay: '2.5–4.5 LPA', why: '10x more open listings with lower entry gate. Current profile already clears it.' },
  p2: { role: 'Frontend Developer', context: 'High-volume agency & mid-tier service roles', pay: '4–6 LPA', why: 'Skips the high portfolio and system design barrier product startups expect.' },
  p3: { role: 'Frontend Developer', context: 'Mid-level product companies & agency leads', pay: '6–10 LPA', why: 'One level below target with immediate interview calls and 90%+ shortlist rate.' },
  p4: { role: 'Frontend Developer', context: 'Frontend-only specialization without database bottlenecks', pay: '6–10 LPA', why: 'Focuses strictly on client-side engineering without fullstack database bottlenecks.' },
};

async function calculateReadinessVerdict({ userId, careerPathSlug = 'p1', forceRefresh = false }) {
  // 1. Fetch Career Path and Published Readiness Configuration
  const careerPath = await prisma.careerPath.findUnique({
    where: { slug: careerPathSlug },
    include: {
      readinessConfigs: {
        where: { isPublished: true },
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          bands: {
            orderBy: { minScore: 'desc' },
          },
        },
      },
    },
  });

  if (!careerPath) throw new Error(`Career path ${careerPathSlug} not found`);
  const rConfig = careerPath.readinessConfigs?.[0];

  // 2. TOKEN-SAVING CACHE LOOKUP:
  // Check if candidate already has a saved Action Plan and Readiness Result
  const existingReadiness = await prisma.readinessResult.findFirst({
    where: { userId, careerPathId: careerPath.id },
    orderBy: { updatedAt: 'desc' },
  });

  const existingPlan = await prisma.candidateActionPlan.findUnique({
    where: {
      userId_careerPathId: {
        userId,
        careerPathId: careerPath.id,
      },
    },
  });

  // Check if any fresh activity has occurred since the existing result was calculated
  if (!forceRefresh && existingReadiness && existingPlan) {
    const lastEvaluationTime = existingReadiness.updatedAt || existingReadiness.createdAt;

    const [newerAssessment, newerAts, newerPractice, newerLesson] = await Promise.all([
      prisma.assessmentAttempt.findFirst({
        where: { userId, careerPathId: careerPath.id, submittedAt: { gt: lastEvaluationTime } },
      }),
      prisma.aTSScoringResult.findFirst({
        where: { userId, careerPathId: careerPath.id, createdAt: { gt: lastEvaluationTime } },
      }),
      prisma.practiceAttempt.findFirst({
        where: { userId, careerPathId: careerPath.id, createdAt: { gt: lastEvaluationTime } },
      }),
      prisma.chapterCompletion.findFirst({
        where: { userId, completedAt: { gt: lastEvaluationTime } },
      }),
    ]);

    const hasNewerActivity = Boolean(newerAssessment || newerAts || newerPractice || newerLesson);

    if (!hasNewerActivity) {
      // Re-use cached result without consuming LLM / token resources!
      const roleInfo = ROLE_BY_PATH[careerPathSlug] || { role: careerPath.title || 'Software Developer', pay: '4–8 LPA', marketComp: '₹4–8 LPA' };
      const planBInfo = PLAN_B_BY_PATH[careerPathSlug] || PLAN_B_BY_PATH.p1;
      const cachedBreakdown = existingReadiness.pillarBreakdown || {};

      // Check if certificate exists
      const activeCert = await prisma.journeyCertificate.findFirst({
        where: { userId, careerPathId: careerPath.id, status: 'active' },
      });

      return {
        id: existingReadiness.id,
        careerPathSlug,
        roleTitle: roleInfo.role,
        marketComp: roleInfo.marketComp,
        combinedScore: existingReadiness.compositeScore,
        bandClass: existingReadiness.bandClass,
        bandLabel: existingReadiness.bandLabel,
        percentile: existingReadiness.percentile,
        rankText: `Better than ${existingReadiness.percentile}% of applicants in this bracket`,
        hasTestData: Boolean(existingReadiness.assessmentScore != null),
        testPct: existingReadiness.assessmentScore,
        atsScore: existingReadiness.atsScore,
        practiceReps: existingReadiness.practiceScore || 0,
        lessonsCompleted: cachedBreakdown.lessonsCompleted || 0,
        totalLessons: cachedBreakdown.totalLessons || 12,
        certificateEligible: existingReadiness.certificateEligible,
        leadAccessGranted: existingReadiness.leadAccessGranted,
        certificate: activeCert ? {
          verificationId: activeCert.verificationId,
          issuedAt: activeCert.issuedAt,
          targetRole: activeCert.targetRole,
        } : null,
        planA: {
          ...roleInfo,
          matchProbability: existingReadiness.compositeScore,
          timeline: '3–4 weeks dedicated gap-closing',
          context: 'Top product teams and high-growth engineering firms',
        },
        planB: {
          ...planBInfo,
          matchProbability: Math.min(97, existingReadiness.compositeScore + 18),
          timeline: 'Immediate / 0 days (Ready today)',
        },
        actionPlan: existingPlan.tasks,
        isCached: true,
        evaluatedAt: existingReadiness.updatedAt,
      };
    }
  }

  // 3. SYNTHESIZE 4 PILLARS DYNAMICALLY:

  // Pillar 1: Resume Knowledge / ATS Result
  const latestAts = await prisma.aTSScoringResult.findFirst({
    where: { userId, careerPathId: careerPath.id },
    orderBy: { createdAt: 'desc' },
  });
  const atsScore = latestAts?.score || 64;
  const missingSkills = Array.isArray(latestAts?.missingSkills) ? latestAts.missingSkills : [];

  // Pillar 2: Lesson Knowledge / Chapter Completions
  const completions = await prisma.chapterCompletion.findMany({
    where: { userId },
  });
  const lessonsCompletedCount = completions.length;
  const totalLessonsCount = 12; // Standard 3-track syllabus count (4 basic + 4 medium + 4 advanced)

  // Pillar 3: Practice Reps, Streak & Topic Weaknesses
  const practiceAttempts = await prisma.practiceAttempt.findMany({
    where: { userId, careerPathId: careerPath.id },
  });
  const practiceReps = practiceAttempts.reduce((sum, a) => sum + (a.totalQuestions || 0), 0);

  const topicPerfs = await prisma.topicPerformance.findMany({
    where: { userId, weaknessScore: { gt: 0.2 } },
    orderBy: { weaknessScore: 'desc' },
    take: 3,
  });

  // Pillar 4: Assessment Attempt & Missed Questions
  const latestAssessment = await prisma.assessmentAttempt.findFirst({
    where: { userId, careerPathId: careerPath.id, status: 'submitted' },
    orderBy: { submittedAt: 'desc' },
  });

  const hasTestData = Boolean(latestAssessment && latestAssessment.totalQuestions > 0);
  const testScore = latestAssessment?.score || 0;
  const testTotal = latestAssessment?.totalQuestions || 0;
  const testPct = hasTestData ? Math.round((testScore / testTotal) * 100) : null;

  const weakTopics = [
    ...(latestAssessment?.weakTopics || []),
    ...topicPerfs.map((tp) => tp.topicName),
    ...missingSkills.slice(0, 2),
  ].filter(Boolean);
  const uniqueWeakTopics = [...new Set(weakTopics)];

  // 4. Compute Composite Score
  const atsWeight = rConfig?.atsWeight || 0.40;
  const assessmentWeight = rConfig?.assessmentWeight || 0.60;
  const testPendingWeight = rConfig?.testPendingWeight || 0.85;

  let combinedScore;
  if (hasTestData) {
    combinedScore = Math.round((atsScore * atsWeight) + (testPct * assessmentWeight));
  } else {
    combinedScore = Math.round(atsScore * testPendingWeight);
  }
  combinedScore = Math.min(98, Math.max(25, combinedScore));

  // 5. Match against Dynamic Bands
  const bands = rConfig?.bands || [];
  let matchedBand = bands.find((b) => combinedScore >= b.minScore && combinedScore <= b.maxScore);

  if (!matchedBand) {
    matchedBand = {
      bandClass: combinedScore >= 75 ? 'good' : combinedScore >= 50 ? 'mid' : 'low',
      statusLabel: combinedScore >= 75 ? 'Job Ready' : combinedScore >= 50 ? 'Nearly Ready' : 'Foundation Needed',
      percentileBenchmark: combinedScore >= 85 ? 94 : combinedScore >= 75 ? 86 : combinedScore >= 60 ? 68 : 42,
      certificateEligible: combinedScore >= 70,
      leadAccessGranted: combinedScore >= 50,
      recommendedActions: [],
    };
  }

  // 6. Generate Dynamic 30-Day Closing-the-Gap Action Plan
  const actionTopics = uniqueWeakTopics.length > 0
    ? uniqueWeakTopics
    : ['Component Optimization', 'TypeScript Strict Mode', 'REST API Architecture'];

  const dynamicActionPlan = [
    {
      week: 'Week 1',
      title: 'Fix High-Priority Weak Spots',
      badge: 'Immediate Impact',
      items: [
        `Master ${actionTopics[0] || 'Core Syntax'} with targeted repository code drills`,
        'Update resume summary and top bullet points with quantifiable impact metrics',
        'Review architecture gotchas and complete unread lessons in Padhaao'
      ],
      isCompleted: false,
    },
    {
      week: 'Week 2',
      title: actionTopics[1] ? `Deep Dive: ${actionTopics[1]}` : 'System Design & Scalability',
      badge: 'Technical Edge',
      items: [
        actionTopics[1] ? `Build a mini-project focusing on ${actionTopics[1]}` : 'Design scalable state architecture using React Server Components',
        'Solve 5 targeted practice drills in Practice Karao with recruiter trap review',
        'Add live GitHub repository demo link to resume header'
      ],
      isCompleted: false,
    },
    {
      week: 'Week 3',
      title: 'Simulate Client Screening Interviews',
      badge: 'Interview Readiness',
      items: [
        'Retake the timed technical assessment in Test Karo targeting 80%+',
        'Prepare 3 STAR-method story responses for technical screening',
        'Audit web performance metrics and Lighthouse scores for portfolio demos'
      ],
      isCompleted: false,
    },
    {
      week: 'Week 4',
      title: 'Apply to Verified Client Leads',
      badge: 'Conversion & Hiring',
      items: [
        'Filter for high-budget verified leads matching your primary career track',
        'Submit personalized proposals with portfolio attachments',
        'Activate WhatsApp instant notification alerts for recruiter replies'
      ],
      isCompleted: false,
    }
  ];

  // 7. Persist or Update ReadinessResult
  const pillarBreakdown = {
    atsScore,
    testScore: testPct,
    hasTestData,
    lessonsCompleted: lessonsCompletedCount,
    totalLessons: totalLessonsCount,
    practiceReps,
    weakTopics: uniqueWeakTopics,
  };

  let readinessResult;
  if (existingReadiness) {
    readinessResult = await prisma.readinessResult.update({
      where: { id: existingReadiness.id },
      data: {
        compositeScore: combinedScore,
        bandClass: matchedBand.bandClass,
        bandLabel: matchedBand.statusLabel,
        percentile: matchedBand.percentileBenchmark,
        atsScore,
        assessmentScore: testPct,
        practiceScore: practiceReps,
        certificateEligible: matchedBand.certificateEligible,
        leadAccessGranted: matchedBand.leadAccessGranted,
        pillarBreakdown,
      },
    });
  } else {
    readinessResult = await prisma.readinessResult.create({
      data: {
        userId,
        careerPathId: careerPath.id,
        compositeScore: combinedScore,
        bandClass: matchedBand.bandClass,
        bandLabel: matchedBand.statusLabel,
        percentile: matchedBand.percentileBenchmark,
        atsScore,
        assessmentScore: testPct,
        practiceScore: practiceReps,
        certificateEligible: matchedBand.certificateEligible,
        leadAccessGranted: matchedBand.leadAccessGranted,
        pillarBreakdown,
      },
    });
  }

  // 8. Persist CandidateActionPlan in Database
  await prisma.candidateActionPlan.upsert({
    where: {
      userId_careerPathId: {
        userId,
        careerPathId: careerPath.id,
      },
    },
    update: {
      title: `30-Day Gap-Closing Plan for ${careerPath.title}`,
      tasks: dynamicActionPlan,
    },
    create: {
      userId,
      careerPathId: careerPath.id,
      title: `30-Day Gap-Closing Plan for ${careerPath.title}`,
      tasks: dynamicActionPlan,
    },
  });

  const roleInfo = ROLE_BY_PATH[careerPathSlug] || { role: careerPath.title || 'Software Developer', pay: '4–8 LPA', marketComp: '₹4–8 LPA' };
  const planBInfo = PLAN_B_BY_PATH[careerPathSlug] || PLAN_B_BY_PATH.p1;

  // Check if certificate exists or create if eligible
  let activeCert = await prisma.journeyCertificate.findFirst({
    where: { userId, careerPathId: careerPath.id, status: 'active' },
  });

  return {
    id: readinessResult.id,
    careerPathSlug,
    roleTitle: roleInfo.role,
    marketComp: roleInfo.marketComp,
    combinedScore,
    bandClass: matchedBand.bandClass,
    bandLabel: matchedBand.statusLabel,
    percentile: matchedBand.percentileBenchmark,
    rankText: `Better than ${matchedBand.percentileBenchmark}% of applicants in this bracket`,
    hasTestData,
    testPct,
    atsScore,
    practiceReps,
    lessonsCompleted: lessonsCompletedCount,
    totalLessons: totalLessonsCount,
    certificateEligible: matchedBand.certificateEligible,
    leadAccessGranted: matchedBand.leadAccessGranted,
    certificate: activeCert ? {
      verificationId: activeCert.verificationId,
      issuedAt: activeCert.issuedAt,
      targetRole: activeCert.targetRole,
    } : null,
    planA: {
      ...roleInfo,
      matchProbability: combinedScore,
      timeline: '3–4 weeks dedicated gap-closing',
      context: 'Top product teams and high-growth engineering firms',
    },
    planB: {
      ...planBInfo,
      matchProbability: Math.min(97, combinedScore + 18),
      timeline: 'Immediate / 0 days (Ready today)',
    },
    actionPlan: dynamicActionPlan,
    isCached: false,
    evaluatedAt: readinessResult.updatedAt,
  };
}

module.exports = {
  calculateReadinessVerdict,
  ROLE_BY_PATH,
  PLAN_B_BY_PATH,
};

