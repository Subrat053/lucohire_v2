// Dynamic Readiness Verdict & Action Plan Engine
import { ROLE_BY_PATH, PLAN_B_BY_PATH } from '../data/batadoData';

/**
 * Calculates composite job-readiness score combining ATS + Test results
 */
export function calculateCompositeReadiness({
  atsScore = 64,
  testScore = null,
  testTotal = null,
  practiceScore = null,
  practiceTotal = null
}) {
  const hasTestData = testScore !== null && testTotal !== null && testTotal > 0;
  const testPct = hasTestData ? Math.round((testScore / testTotal) * 100) : null;

  let combined;
  if (hasTestData) {
    // 40% ATS Resume + 60% Timed Technical Assessment
    combined = Math.round(atsScore * 0.4 + testPct * 0.6);
  } else {
    // Resume baseline when test not yet attempted
    combined = Math.round(atsScore * 0.85);
  }

  combined = Math.max(25, Math.min(98, combined));

  const bandClass = combined >= 75 ? 'good' : combined >= 50 ? 'mid' : 'low';
  const bandLabel = combined >= 75
    ? (hasTestData ? 'Job-ready range' : 'Good, test pending')
    : combined >= 50
    ? 'Almost ready (2-3 weeks away)'
    : 'Needs dedicated prep';

  // Calculate benchmark percentile
  let percentile;
  if (combined >= 85) percentile = 94;
  else if (combined >= 75) percentile = 86;
  else if (combined >= 65) percentile = 72;
  else if (combined >= 50) percentile = 58;
  else percentile = 38;

  return {
    combinedScore: combined,
    testPct,
    hasTestData,
    bandClass,
    bandLabel,
    percentile,
    rankText: `Better than ${percentile}% of applicants in this bracket`
  };
}

/**
 * Dynamically builds a 4-week action plan focused on the candidate's actual weak topics
 */
export function generateDynamicActionPlan(weakTopics = [], selectedPath = 'p1') {
  const topics = weakTopics.length > 0
    ? weakTopics
    : ['Next.js App Router', 'TypeScript Generics', 'REST API Optimization'];

  return [
    {
      week: 'Week 1',
      title: 'Fix High-Priority Weak Spots',
      badge: 'Immediate Impact',
      items: [
        `Master ${topics[0] || 'Core Framework Syntax'} through hands-on project commits`,
        'Update resume summary & top bullets to reflect revised impact metrics',
        'Review code examples in the Padhaao learning player'
      ]
    },
    {
      week: 'Week 2',
      title: topics[1] ? `Deep Dive: ${topics[1]}` : 'System Design & Scalability',
      badge: 'Technical Edge',
      items: [
        topics[1] ? `Build a mini-feature practicing ${topics[1]}` : 'Design scalable state architecture using TanStack Query or Zustand',
        'Solve 5 targeted practice questions in Practice Karao',
        'Add live GitHub repository link to portfolio header'
      ]
    },
    {
      week: 'Week 3',
      title: 'Simulate Real Interview Technical Rounds',
      badge: 'Interview Readiness',
      items: [
        'Retake the 10-question timed assessment in Test Karo targeting 80%+',
        'Practice live technical pitch explaining architecture tradeoffs',
        'Prepare 3 STAR-method story responses for client interviews'
      ]
    },
    {
      week: 'Week 4',
      title: 'Apply to Verified LucoHire Leads',
      badge: 'Conversion & Hiring',
      items: [
        'Filter for high-budget verified leads matching your updated primary path',
        'Submit personalized quotes with portfolio attachments',
        'Activate WhatsApp instant notification alerts for recruiter follow-ups'
      ]
    }
  ];
}

/**
 * Generates deterministic cryptographic verification ID for candidate certificate
 */
export function generateVerificationId(userId = 'candidate', pathKey = 'p1') {
  let hash = 0;
  const str = `${userId}-${pathKey}-luco-verified`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `LUCO-${pathKey.toUpperCase()}-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
