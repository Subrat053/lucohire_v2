const prisma = require('../../config/prisma');

const ROLE_BY_PATH = {
  p1: { role: 'Junior Frontend Developer', pay: '3–6 LPA', marketComp: '₹3–6 LPA' },
  p2: { role: 'Frontend Developer', pay: '6–10 LPA', marketComp: '₹8–12 LPA' },
  p3: { role: 'Senior Frontend Engineer', pay: '15 LPA+', marketComp: '₹15–25 LPA' },
  p4: { role: 'Full-stack Developer', pay: 'Future-safe roles', marketComp: '₹18–28 LPA' },
};

const PLAN_B_BY_PATH = {
  p1: { role: 'Frontend Developer', context: 'service-based companies', pay: '2.5–4.5 LPA', why: '10x more open listings with lower entry gate. Current profile already clears it.' },
  p2: { role: 'Frontend Developer', context: 'service-based companies', pay: '4–6 LPA', why: 'Skips the high portfolio and system design barrier product startups expect.' },
  p3: { role: 'Frontend Developer', context: 'mid-level product companies', pay: '6–10 LPA', why: 'One level below target with immediate interview calls.' },
  p4: { role: 'Frontend Developer', context: 'frontend-only without heavy backend ask', pay: '6–10 LPA', why: 'Focuses strictly on client-side engineering without database bottlenecks.' },
};

async function calculateReadinessVerdict({ userId, careerPathSlug = 'p1' }) {
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

  // 2. Fetch Latest ATS Result
  const latestAts = await prisma.aTSScoringResult.findFirst({
    where: { userId, careerPathId: careerPath.id },
    orderBy: { createdAt: 'desc' },
  });
  const atsScore = latestAts?.score || 64;

  // 3. Fetch Latest Assessment Attempt
  const latestAssessment = await prisma.assessmentAttempt.findFirst({
    where: { userId, careerPathId: careerPath.id, status: 'submitted' },
    orderBy: { submittedAt: 'desc' },
  });

  const hasTestData = Boolean(latestAssessment && latestAssessment.totalQuestions > 0);
  const testScore = latestAssessment?.score || 0;
  const testTotal = latestAssessment?.totalQuestions || 0;
  const testPct = hasTestData ? Math.round((testScore / testTotal) * 100) : null;

  // 4. Fetch Practice Reps & Weak Topics
  const practiceAttempts = await prisma.practiceAttempt.findMany({
    where: { userId, careerPathId: careerPath.id },
  });
  const practiceReps = practiceAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);

  const topicPerfs = await prisma.topicPerformance.findMany({
    where: { userId, weaknessScore: { gt: 0.2 } },
    orderBy: { weaknessScore: 'desc' },
    take: 3,
  });
  const weakTopics = [
    ...(latestAssessment?.weakTopics || []),
    ...topicPerfs.map((tp) => tp.topicName),
  ];
  const uniqueWeakTopics = [...new Set(weakTopics)];

  // 5. Compute Composite Score
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

  // 6. Match against Dynamic Bands
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

  // 7. Dynamic 4-Week Action Plan
  const actionTopics = uniqueWeakTopics.length > 0
    ? uniqueWeakTopics
    : ['Next.js App Router', 'TypeScript Strict Mode', 'REST API Caching'];

  const dynamicActionPlan = [
    {
      week: 'Week 1',
      title: 'Fix High-Priority Weak Spots',
      badge: 'Immediate Impact',
      items: [
        `Master ${actionTopics[0] || 'Core Syntax'} with targeted repository drills`,
        'Update resume summary and top bullet points with quantifiable impact metrics',
        'Review architecture gotchas in the Padhaao learning module'
      ],
      isCompleted: false,
    },
    {
      week: 'Week 2',
      title: actionTopics[1] ? `Deep Dive: ${actionTopics[1]}` : 'System Design & Scalability',
      badge: 'Technical Edge',
      items: [
        actionTopics[1] ? `Build a mini-project focusing on ${actionTopics[1]}` : 'Design scalable state architecture using React Server Components',
        'Solve 5 targeted practice drills in Practice Karao',
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
        'Audit web performance metrics for portfolio demos'
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

  // 8. Persist ReadinessResult
  const readinessResult = await prisma.readinessResult.create({
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
      pillarBreakdown: {
        atsScore,
        testScore: testPct,
        practiceReps,
      },
    },
  });

  // 9. Persist CandidateActionPlan
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

  const roleInfo = ROLE_BY_PATH[careerPathSlug] || ROLE_BY_PATH.p1;
  const planBInfo = PLAN_B_BY_PATH[careerPathSlug] || PLAN_B_BY_PATH.p1;

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
    certificateEligible: matchedBand.certificateEligible,
    leadAccessGranted: matchedBand.leadAccessGranted,
    planA: roleInfo,
    planB: planBInfo,
    actionPlan: dynamicActionPlan,
    evaluatedAt: readinessResult.createdAt,
  };
}

module.exports = {
  calculateReadinessVerdict,
  ROLE_BY_PATH,
  PLAN_B_BY_PATH,
};
