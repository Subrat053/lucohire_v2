const prisma = require('../../config/prisma');

// ─── High-Concurrency In-Memory Cache (TTL: 10 minutes) ─────────────────────
let cachedPaths = null;
let cachedPathsExpiry = 0;
const pathSlugCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function invalidateCareerPathCache() {
  cachedPaths = null;
  cachedPathsExpiry = 0;
  pathSlugCache.clear();
}

// ─── Target Career Path Specifications & Requirements ───────────────────────
const PATH_SPECIFICATIONS = {
  p1: {
    slug: 'p1',
    targetTitle: 'Fast Track Frontend / Junior Engineer',
    targetSalary: '3–6 LPA',
    timelineDays: '0–30 Days',
    minExperienceYears: 0,
    coreSkills: ['JavaScript', 'React', 'HTML5', 'CSS3', 'Tailwind CSS', 'Git', 'REST API'],
    bonusSkills: ['TypeScript', 'Next.js', 'Redux', 'Responsive Design'],
    focusArea: 'Quick interview calls, clean component delivery, and modern UI turnaround',
    quickWinsTemplates: [
      { skill: 'TypeScript', time: '6 hours', jobs: '+7,200 unlock', line: 'Migrated legacy components to strict TypeScript with interfaces' },
      { skill: 'Next.js', time: '1 day', jobs: '+3,100 unlock', line: 'Built modern web application with Next.js, boosting SSR speed by 40%' },
      { skill: 'Tailwind CSS', time: '4 hours', jobs: '+2,400 unlock', line: 'Refactored stylesheets using utility-first Tailwind, shrinking bundle size by 55%' },
    ],
  },
  p2: {
    slug: 'p2',
    targetTitle: 'Mid-Level Product Engineer',
    targetSalary: '8–12 LPA',
    timelineDays: '60–90 Days',
    minExperienceYears: 2,
    coreSkills: ['TypeScript', 'Next.js', 'React Server Components', 'System Design', 'Performance Optimization', 'Tailwind CSS'],
    bonusSkills: ['Node.js', 'GraphQL', 'PostgreSQL', 'Docker', 'Web Vitals'],
    focusArea: 'Shortlisting at top product companies, server-side data fetching, and web performance',
    quickWinsTemplates: [
      { skill: 'React Server Components', time: '1 day', jobs: '2,800 jobs · +58%', line: 'Architected data-heavy dashboard with React Server Components, cutting client bundle by 45%' },
      { skill: 'System Design Basics', time: '2 hours', jobs: '9,100 jobs at 15 LPA+', line: 'Designed scalable real-time notification service with rate limiting for 50k DAU' },
      { skill: 'Core Web Vitals Optimization', time: '1 hour', jobs: '5,600 jobs at 15 LPA+', line: 'Optimized Largest Contentful Paint (LCP) from 3.8s to 1.2s across primary landing pages' },
    ],
  },
  p3: {
    slug: 'p3',
    targetTitle: 'Senior Software Engineer / Tech Lead',
    targetSalary: '15–25 LPA',
    timelineDays: '90–120 Days',
    minExperienceYears: 4,
    coreSkills: ['System Design', 'GenAI Integration', 'Distributed Systems', 'TypeScript', 'Next.js', 'Node.js', 'Microservices'],
    bonusSkills: ['RAG', 'Vector Embeddings', 'Redis', 'Kafka', 'CI/CD Automation', 'Zero-Trust Security'],
    focusArea: 'Top startup tech leads, high-throughput microservices, and AI-enabled product workflows',
    quickWinsTemplates: [
      { skill: 'GenAI Integration (LLM APIs, RAG)', time: '1 day', jobs: '4,100 jobs · +340%', line: 'Integrated OpenAI embeddings with PGVector RAG pipeline, automating 80% of support queries' },
      { skill: 'Distributed System Design', time: '2 days', jobs: '15–25 LPA senior tier', line: 'Designed resilient distributed event-processing pipeline handling 10M+ daily events' },
      { skill: 'DSA & Performance Tuning', time: '3 days', jobs: 'Core interview tier', line: 'Optimized complex query execution and memoization algorithms, reducing P99 latency by 62%' },
    ],
  },
  p4: {
    slug: 'p4',
    targetTitle: 'Future-Proof Full-Stack & AI Systems Architect',
    targetSalary: '18–30+ LPA',
    timelineDays: 'Long-term 2026–2030',
    minExperienceYears: 3,
    coreSkills: ['Full-Stack (Node + DB)', 'AI Tools (Cursor / Copilot)', 'GenAI Integration', 'Docker / Cloud', 'Web Security & Resilience'],
    bonusSkills: ['Kubernetes', 'Serverless', 'Python', 'AI Agent Workflows', 'Observability'],
    focusArea: 'Immunity to AI automation, full-stack systems ownership, and multi-agent coordination',
    quickWinsTemplates: [
      { skill: 'AI-Assisted Engineering (Cursor / Copilot)', time: '2 hours', jobs: '2026 roadmap priority', line: 'Shipped production features 3x faster leveraging AI agentic engineering workflows' },
      { skill: 'Full-Stack Architecture (Node + PostgreSQL)', time: '1 day', jobs: '2028–30 priority', line: 'Implemented end-to-end multi-tenant backend with PostgreSQL and atomic transactions' },
      { skill: 'Zero-Trust Security & Observability', time: '4 hours', jobs: '2027 priority', line: 'Hardened application perimeter with strict RBAC, rate-limiting, and OpenTelemetry instrumentation' },
    ],
  },
};

function normalizeStr(str) {
  if (!str) return '';
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Calculates heuristic probability of achieving a career path target based on
 * the candidate's existing skills, experience years, and ATS score.
 */
function calculatePathMatchProbability(candidateSkills = [], experienceYears = 2, pathSlug = 'p1', atsScore = 65) {
  const spec = PATH_SPECIFICATIONS[pathSlug] || PATH_SPECIFICATIONS.p1;
  const normCandidate = candidateSkills.map(normalizeStr).filter(Boolean);

  const matchedCore = [];
  const missingCore = [];

  for (const coreSkill of spec.coreSkills) {
    const normCore = normalizeStr(coreSkill);
    const hasSkill = normCandidate.some((c) => c.includes(normCore) || normCore.includes(c));
    if (hasSkill) {
      matchedCore.push(coreSkill);
    } else {
      missingCore.push(coreSkill);
    }
  }

  // 1. Skill Match Component (up to 55 points)
  const coreRatio = spec.coreSkills.length > 0 ? matchedCore.length / spec.coreSkills.length : 0;
  const skillScore = coreRatio * 55;

  // 2. Experience Match Component (up to 25 points)
  const expNum = Number(experienceYears) || 0;
  let expScore = 15;
  if (expNum >= spec.minExperienceYears) {
    expScore = 25;
  } else if (expNum >= Math.max(0, spec.minExperienceYears - 1)) {
    expScore = 20;
  } else {
    expScore = 12;
  }

  // 3. Current ATS Quality Component (up to 20 points)
  const atsBonus = Math.min(20, Math.max(5, (atsScore / 100) * 20));

  const totalProb = Math.min(95, Math.max(25, Math.round(skillScore + expScore + atsBonus)));

  let probabilityLabel;
  let timelineEstimate;
  if (totalProb >= 78) {
    probabilityLabel = 'High Match Probability';
    timelineEstimate = spec.slug === 'p1' ? 'Ready in 15–30 days' : 'Ready in 30–60 days';
  } else if (totalProb >= 55) {
    probabilityLabel = 'Moderate Match Probability';
    timelineEstimate = 'Requires 1–2 months targeted upskilling';
  } else {
    probabilityLabel = 'Stretch Target';
    timelineEstimate = 'Requires 2–3 months structured prep';
  }

  // Build dynamic 3 quick wins tailored to missing or priority skills
  const quickWins = spec.quickWinsTemplates.map((qw, idx) => ({
    n: String(idx + 1),
    skill: qw.skill,
    time: qw.time,
    jobs: qw.jobs,
    line: qw.line,
    isAlreadyAcquired: normCandidate.some((c) => c.includes(normalizeStr(qw.skill))),
  }));

  return {
    pathSlug,
    targetTitle: spec.targetTitle,
    targetSalary: spec.targetSalary,
    timelineDays: spec.timelineDays,
    timelineEstimate,
    probability: totalProb,
    probabilityLabel,
    matchedSkills: matchedCore,
    missingSkills: missingCore,
    matchedCount: matchedCore.length,
    totalCoreCount: spec.coreSkills.length,
    quickWins,
    focusArea: spec.focusArea,
  };
}

async function getCareerPaths() {
  const now = Date.now();
  if (cachedPaths && now < cachedPathsExpiry) {
    return cachedPaths;
  }

  const paths = await prisma.careerPath.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      subTitle: true,
      badge: true,
      isRecommended: true,
      kya: true,
      oneLiner: true,
      lessonsCount: true,
      jobsCount: true,
      tracks: {
        where: { isActive: true },
        select: { id: true, trackKey: true, label: true },
      },
    },
  });

  const formatted = paths.map((p) => {
    const spec = PATH_SPECIFICATIONS[p.slug] || {};
    return {
      id: p.slug,
      slug: p.slug,
      title: p.title,
      sub: p.subTitle,
      badge: p.badge,
      recommended: p.isRecommended,
      kya: p.kya,
      oneLiner: p.oneLiner,
      lessons: p.lessonsCount,
      jobs: p.jobsCount,
      targetSalary: spec.targetSalary || '6–12 LPA',
      coreSkills: spec.coreSkills || [],
      tracksCount: p.tracks?.length || 0,
    };
  });

  cachedPaths = formatted;
  cachedPathsExpiry = now + CACHE_TTL_MS;
  return formatted;
}

async function getCareerPathBySlug(slug) {
  if (pathSlugCache.has(slug)) {
    const cached = pathSlugCache.get(slug);
    if (Date.now() < cached.expiry) {
      return cached.data;
    }
  }

  const path = await prisma.careerPath.findUnique({
    where: { slug },
    include: {
      tracks: {
        where: { isActive: true },
        include: {
          chapters: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      atcScoringConfigs: {
        where: { status: 'PUBLISHED' },
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          rules: {
            where: { isEnabled: true },
            orderBy: { priority: 'asc' },
          },
        },
      },
    },
  });

  if (path) {
    pathSlugCache.set(slug, {
      data: path,
      expiry: Date.now() + CACHE_TTL_MS,
    });
  }

  return path;
}

module.exports = {
  getCareerPaths,
  getCareerPathBySlug,
  calculatePathMatchProbability,
  PATH_SPECIFICATIONS,
  invalidateCareerPathCache,
};
