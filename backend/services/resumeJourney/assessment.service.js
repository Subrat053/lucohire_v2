const crypto = require('crypto');
const prisma = require('../../config/prisma');

// ─── High-Concurrency In-Memory RAM Cache (10-minute TTL) ───────────────────
const cache = {
  configs: new Map(), // slug -> { data, cachedAt }
  questions: new Map(), // configId -> { data, cachedAt }
  TTL_MS: 10 * 60 * 1000,
};

function getCachedConfig(slug) {
  const item = cache.configs.get(slug);
  if (item && Date.now() - item.cachedAt < cache.TTL_MS) {
    return item.data;
  }
  return null;
}

function setCachedConfig(slug, data) {
  cache.configs.set(slug, { data, cachedAt: Date.now() });
}

function getCachedQuestions(configId) {
  const item = cache.questions.get(configId);
  if (item && Date.now() - item.cachedAt < cache.TTL_MS) {
    return item.data;
  }
  return null;
}

function setCachedQuestions(configId, data) {
  cache.questions.set(configId, { data, cachedAt: Date.now() });
}

function invalidateAssessmentCache() {
  cache.configs.clear();
  cache.questions.clear();
}

// ─── Multi-Stack Assessment Questions Seed Bank ─────────────────────────────
const MULTI_STACK_ASSESSMENT_SEED = {
  // Python Backend & Distributed Systems
  python: [
    {
      topicName: 'Python Asyncio',
      difficulty: 'medium',
      scenario: 'You have a FastAPI endpoint calling a heavy synchronous CPU-bound calculation inside an async def route. The entire API server experiences latency spikes. What is the production fix?',
      options: [
        'Add async keyword to the CPU-bound function without changing its internal execution',
        'Offload the CPU calculation to a ProcessPoolExecutor or Celery task worker',
        'Increase FastAPI worker count to 100 on the same machine',
        'Use time.sleep() instead of asyncio.sleep()'
      ],
      correctOptionIndex: 1,
      explain: 'Synchronous CPU-bound tasks block Node/Python async event loops. Offloading to a process pool or external worker frees the loop to handle I/O.',
    },
    {
      topicName: 'Python SQLAlchemy',
      difficulty: 'medium',
      scenario: 'In an SQLAlchemy query with Celery batch tasks, you notice database connections remaining stuck in IDLE in transaction state until Postgres exhausts connection pools. What is the root cause?',
      options: [
        'Postgres vacuuming tables during query execution',
        'Session transactions not explicitly committed or rolled back inside worker task blocks',
        'Using raw SQL instead of the ORM query builder',
        'Connecting via TLS certificate instead of unencrypted sockets'
      ],
      correctOptionIndex: 1,
      explain: 'Uncommitted or unclosed ORM sessions in workers leave server-side transactions open, exhausting Postgres connection pools.',
    },
  ],

  // Java & Spring Enterprise
  java: [
    {
      topicName: 'Java Spring Boot',
      difficulty: 'medium',
      scenario: 'A high-throughput Spring Boot service experiences frequent Stop-The-World GC pauses under 5,000 req/sec load. Heap analysis reveals millions of short-lived DTO objects. What is the most effective JVM adjustment?',
      options: [
        'Switch to ZGC or Generational Shenandoah GC and inspect object allocation escaping',
        'Increase initial heap size to 64GB without profiling',
        'Disable Garbage Collection using -XX:+DisableExplicitGC',
        'Force System.gc() after every HTTP request'
      ],
      correctOptionIndex: 0,
      explain: 'Low-latency collectors like ZGC or Shenandoah reduce pause times to sub-millisecond ranges by performing concurrent marking and compaction.',
    },
    {
      topicName: 'Hibernate JPA',
      difficulty: 'medium',
      scenario: 'Loading 100 User entities with their Orders generates 101 separate SQL queries in your logs. Which JPA pattern eliminates this N+1 query problem?',
      options: [
        'FetchType.EAGER on all associations',
        'Use JOIN FETCH in JPQL or an @EntityGraph declaration',
        'Disable SQL query logging in application.properties',
        'Wrap the repository method in @Transactional(readOnly = false)'
      ],
      correctOptionIndex: 1,
      explain: 'JOIN FETCH executes a single SQL JOIN query, pre-populating relational collections in one round-trip.',
    },
  ],

  // Go & Cloud DevOps
  go_devops: [
    {
      topicName: 'Go Concurrency',
      difficulty: 'medium',
      scenario: 'A Go HTTP microservice worker loop launches goroutines to process incoming jobs from an unbuffered channel without synchronization. Over time, memory climbs indefinitely until OOM. What is happening?',
      options: [
        'Goroutine leak: workers are blocked waiting on channel sends/receives without exit conditions',
        'Go garbage collector stops functioning after 1,000 goroutines',
        'The Go runtime requires manual free() calls for struct pointers',
        'Linux kernel terminating channels automatically'
      ],
      correctOptionIndex: 0,
      explain: 'Blocked goroutines holding references are never reclaimed by the GC, causing steady memory growth until process termination.',
    },
    {
      topicName: 'Docker & Kubernetes',
      difficulty: 'medium',
      scenario: 'Your Dockerfile places "COPY . ." before "RUN npm install" or "RUN go mod download". What is the operational downside during CI/CD builds?',
      options: [
        'Docker fails to compile the application binary',
        'Any local code change invalidates Docker layer cache, forcing dependencies to re-download on every build',
        'The resulting container image cannot be pushed to registries',
        'Kubernetes refuses to deploy images built this way'
      ],
      correctOptionIndex: 1,
      explain: 'Copying dependency manifests (package.json / go.mod) first leverages Docker layer caching, dramatically accelerating build pipelines.',
    },
  ],

  // Node.js & TypeScript
  node_ts: [
    {
      topicName: 'TypeScript',
      difficulty: 'medium',
      scenario: 'You need to handle a discriminated union of PaymentMethod (Card, UPI, NetBanking). What is the safest way to ensure all cases are handled at compile time?',
      options: [
        'Use a type assertion (as any) in the default branch',
        'Assign the unhandled case to type never in the default switch branch',
        'Disable strictNullChecks in tsconfig.json',
        'Check types with typeof at runtime only'
      ],
      correctOptionIndex: 1,
      explain: 'Assigning unhandled union cases to never produces a compile-time error if a new union variant is added without being handled.',
    },
    {
      topicName: 'Node.js Event Loop',
      difficulty: 'medium',
      scenario: 'An Express server parses 50MB JSON payloads synchronously using JSON.parse() on the main thread, causing health check timeouts. What is the recommended architectural fix?',
      options: [
        'Stream the payload with a chunked parser or offload parsing to worker_threads',
        'Increase server timeout to 5 minutes',
        'Run Node with --max-old-space-size=8192',
        'Return 200 OK before parsing begins'
      ],
      correctOptionIndex: 0,
      explain: 'Large JSON.parse operations block Node single-threaded event loop. Streaming or worker threads maintain event-loop responsiveness.',
    },
  ],

  // High-Scale Architecture & Databases
  system_design: [
    {
      topicName: 'PostgreSQL Indexing',
      difficulty: 'medium',
      scenario: 'A query filtering by "WHERE status = active AND created_at > NOW() - INTERVAL 7 days" runs slowly on a table with 10M rows. How should the compound index be ordered?',
      options: [
        'INDEX (created_at, status)',
        'INDEX (status, created_at)',
        'Two separate single-column indexes on each field',
        'An index is not necessary if status has high cardinality'
      ],
      correctOptionIndex: 1,
      explain: 'Placing equality filter columns (status) before range filter columns (created_at) allows PostgreSQL B-tree indexes to narrow scans efficiently.',
    },
    {
      topicName: 'Distributed Caching',
      difficulty: 'medium',
      scenario: 'Under 10,000 concurrent user traffic, an expired Redis cache key causes hundreds of requests to hit PostgreSQL simultaneously. What is this phenomenon called and how is it prevented?',
      options: [
        'Cache Avalanche; prevented by using mutex locking or probabilistic early expiration (XFetch)',
        'Buffer Overflow; prevented by expanding Redis RAM',
        'Deadlock; prevented by restarting Postgres',
        'Cold Cache; prevented by removing TTL entirely'
      ],
      correctOptionIndex: 0,
      explain: 'Cache stampede (or avalanche) occurs when hot keys expire. Mutex locks or early recomputation prevent DB connection saturation.',
    },
  ],
};

// ─── Ensure Seed Questions in Database ───────────────────────────────────────
let isSeeding = false;
async function seedAssessmentQuestionsToDB() {
  if (isSeeding) return;
  isSeeding = true;
  try {
    const configs = await prisma.assessmentConfiguration.findMany({
      where: { isPublished: true },
      include: {
        _count: { select: { questions: true } },
      },
    });

    for (const cfg of configs) {
      if (cfg._count.questions < 10) {
        // Collect question candidates across stacks
        const candidateQuestions = [
          ...MULTI_STACK_ASSESSMENT_SEED.python,
          ...MULTI_STACK_ASSESSMENT_SEED.java,
          ...MULTI_STACK_ASSESSMENT_SEED.go_devops,
          ...MULTI_STACK_ASSESSMENT_SEED.node_ts,
          ...MULTI_STACK_ASSESSMENT_SEED.system_design,
        ];

        for (const q of candidateQuestions) {
          const exists = await prisma.assessmentQuestion.findFirst({
            where: {
              configId: cfg.id,
              scenario: q.scenario,
            },
          });

          if (!exists) {
            await prisma.assessmentQuestion.create({
              data: {
                configId: cfg.id,
                topicName: q.topicName,
                difficulty: q.difficulty,
                scenario: q.scenario,
                options: q.options,
                correctOptionIndex: q.correctOptionIndex,
                explain: q.explain,
                version: 1,
                isActive: true,
              },
            }).catch(() => {});
          }
        }

        // Update totalQuestions in config to 10 if less
        if (cfg.totalQuestions < 10) {
          await prisma.assessmentConfiguration.update({
            where: { id: cfg.id },
            data: { totalQuestions: 10 },
          }).catch(() => {});
        }
      }
    }
    invalidateAssessmentCache();
  } catch (err) {
    console.warn('[assessment.service] Question seeding warning:', err.message);
  } finally {
    isSeeding = false;
  }
}

// Automatically trigger background seed check on startup
seedAssessmentQuestionsToDB().catch(() => {});

// ─── Background AI Assessment Question Generator ────────────────────────────
/**
 * Asynchronously generates fresh technical assessment questions via low-token prompt
 * and directly saves them into PostgreSQL without blocking active user traffic.
 */
async function generateBackgroundAssessmentQuestions({ careerPathSlug = 'p1', count = 5 }) {
  try {
    const careerPath = await prisma.careerPath.findUnique({
      where: { slug: careerPathSlug },
      include: { assessmentConfigs: { where: { isPublished: true }, take: 1 } },
    });
    const config = careerPath?.assessmentConfigs?.[0];
    if (!config) return { success: false, reason: 'Config not found' };

    const { hasGeminiKey, hasOpenAIKey, callGeminiFlashLite, callOpenAI } = require('../ai/llmService');
    if (!hasGeminiKey() && !hasOpenAIKey()) {
      return { success: false, reason: 'No AI key configured' };
    }

    // Low-token, compact JSON prompt
    const prompt = `You are a Principal Software Engineering Assessor.
Generate ${count} technical scenario multiple-choice questions for technical roles.
Return ONLY a valid JSON array of objects:
[
  {
    "topic": "Topic Name",
    "difficulty": "medium",
    "scenario": "Short production code or system architecture scenario problem",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explain": "1 sentence architectural reasoning why correct"
  }
]`;

    let llmResult = null;
    if (hasGeminiKey()) llmResult = await callGeminiFlashLite(prompt);
    if ((!llmResult || !llmResult.used) && hasOpenAIKey()) llmResult = await callOpenAI(prompt);

    if (llmResult?.used && Array.isArray(llmResult.output)) {
      let savedCount = 0;
      for (const q of llmResult.output) {
        if (q.scenario && Array.isArray(q.options) && typeof q.correct === 'number') {
          await prisma.assessmentQuestion.create({
            data: {
              configId: config.id,
              topicName: q.topic || 'Engineering',
              difficulty: q.difficulty || 'medium',
              scenario: q.scenario,
              options: q.options,
              correctOptionIndex: q.correct,
              explain: q.explain || '',
              version: 1,
              isActive: true,
            },
          }).catch(() => {});
          savedCount++;
        }
      }
      invalidateAssessmentCache();
      return { success: true, savedCount };
    }
  } catch (err) {
    console.warn('[assessment.service] Background AI generation error:', err.message);
  }
  return { success: false };
}

// ─── Core Assessment Engine Methods ─────────────────────────────────────────

async function getAssessmentConfig(careerPathSlug = 'p1') {
  const cached = getCachedConfig(careerPathSlug);
  if (cached) return cached;

  const careerPath = await prisma.careerPath.findUnique({
    where: { slug: careerPathSlug },
    include: {
      assessmentConfigs: {
        where: { isPublished: true },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!careerPath) {
    throw new Error(`Career path ${careerPathSlug} not found`);
  }

  const config = careerPath.assessmentConfigs?.[0];
  if (!config) {
    throw new Error(`No published assessment configuration found for ${careerPathSlug}`);
  }

  const result = {
    careerPathSlug,
    careerPathTitle: careerPath.title,
    timeLimitSeconds: config.timeLimitSeconds,
    secondsPerQuestion: config.secondsPerQuestion,
    passingScorePercentage: config.passingScorePercentage,
    totalQuestions: config.totalQuestions,
    cooldownHours: config.cooldownHours,
    maxAttempts: config.maxAttempts,
  };

  setCachedConfig(careerPathSlug, result);
  return result;
}

async function startAssessmentAttempt({ userId, careerPathSlug = 'p1' }) {
  const careerPath = await prisma.careerPath.findUnique({
    where: { slug: careerPathSlug },
    include: {
      assessmentConfigs: {
        where: { isPublished: true },
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          questions: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (!careerPath) throw new Error(`Career path ${careerPathSlug} not found`);
  const config = careerPath.assessmentConfigs?.[0];
  if (!config) throw new Error('Assessment configuration not found');

  // 1. Check for any currently running attempt
  if (userId) {
    const existingRunning = await prisma.assessmentAttempt.findFirst({
      where: {
        userId,
        careerPathId: careerPath.id,
        status: 'running',
        expiresAt: { gt: new Date() },
      },
      include: {
        attemptQuestions: { orderBy: { orderIndex: 'asc' } },
        answers: true,
      },
    });

    if (existingRunning) {
      const sanitizedQuestions = existingRunning.attemptQuestions.map((aq) => ({
        id: aq.questionId,
        orderIndex: aq.orderIndex,
        questionId: aq.questionId,
        scenario: aq.snapshotScenario,
        options: aq.snapshotOptions,
        topic: aq.snapshotTopic,
        difficulty: aq.snapshotDifficulty,
      }));

      const existingAnswers = {};
      const existingFlags = {};
      for (const a of existingRunning.answers || []) {
        if (a.selectedOptionIndex !== null && a.selectedOptionIndex !== undefined) {
          existingAnswers[a.questionId] = a.selectedOptionIndex;
        }
        if (a.isFlagged) {
          existingFlags[a.questionId] = true;
        }
      }

      const timeRemaining = Math.max(0, Math.round((new Date(existingRunning.expiresAt) - new Date()) / 1000));

      return {
        attemptId: existingRunning.id,
        idempotencyKey: existingRunning.idempotencyKey,
        startedAt: existingRunning.startedAt,
        expiresAt: existingRunning.expiresAt,
        timeRemainingSeconds: timeRemaining,
        totalQuestions: existingRunning.totalQuestions,
        questions: sanitizedQuestions,
        existingAnswers,
        existingFlags,
        isResumed: true,
      };
    }
  }

  // 2. Question Pool Selection from Cache or DB
  let pool = getCachedQuestions(config.id);
  if (!pool || pool.length === 0) {
    pool = config.questions;
    if (!pool || pool.length === 0) {
      // Ensure seed
      await seedAssessmentQuestionsToDB();
      pool = await prisma.assessmentQuestion.findMany({
        where: { configId: config.id, isActive: true },
      });
    }
    setCachedQuestions(config.id, pool);
  }

  if (!pool || pool.length === 0) {
    throw new Error('Insufficient questions in assessment question bank.');
  }

  // Shuffle pool to give fresh questions across sessions
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const targetCount = Math.min(config.totalQuestions || 10, shuffled.length);
  const selectedQuestions = shuffled.slice(0, targetCount);

  const now = new Date();
  const timeLimit = config.timeLimitSeconds || (targetCount * (config.secondsPerQuestion || 90));
  const expiresAt = new Date(now.getTime() + (timeLimit * 1000));
  const idempotencyKey = crypto.randomUUID();

  // Create attempt in database
  const attempt = await prisma.$transaction(async (tx) => {
    const createdAttempt = await tx.assessmentAttempt.create({
      data: {
        userId: userId || null,
        careerPathId: careerPath.id,
        configId: config.id,
        status: 'running',
        startedAt: now,
        expiresAt,
        totalQuestions: selectedQuestions.length,
        idempotencyKey,
      },
    });

    const questionSnapshots = selectedQuestions.map((q, idx) => ({
      attemptId: createdAttempt.id,
      questionId: q.id,
      orderIndex: idx,
      snapshotScenario: q.scenario,
      snapshotOptions: q.options,
      snapshotTopic: q.topicName,
      snapshotDifficulty: q.difficulty,
    }));

    await tx.assessmentAttemptQuestion.createMany({
      data: questionSnapshots,
    });

    return createdAttempt;
  });

  // Sanitized payload for browser (Correct answers and explanations STRICTLY MASKED)
  const sanitizedQuestions = selectedQuestions.map((q, idx) => ({
    id: q.id,
    orderIndex: idx,
    questionId: q.id,
    scenario: q.scenario,
    options: q.options,
    topic: q.topicName,
    difficulty: q.difficulty,
  }));

  return {
    attemptId: attempt.id,
    idempotencyKey,
    startedAt: now,
    expiresAt,
    timeRemainingSeconds: timeLimit,
    totalQuestions: selectedQuestions.length,
    questions: sanitizedQuestions,
    isResumed: false,
  };
}

async function saveAssessmentAnswer({ attemptId, questionId, selectedOptionIndex, isFlagged = false }) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: { id: true, status: true, expiresAt: true },
  });

  if (!attempt || attempt.status !== 'running') {
    return { success: false, reason: 'Attempt not active' };
  }

  // Check if expired
  if (new Date() > new Date(attempt.expiresAt)) {
    return { success: false, reason: 'Time expired' };
  }

  await prisma.assessmentAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId,
      },
    },
    update: {
      selectedOptionIndex,
      isFlagged: Boolean(isFlagged),
      answeredAt: new Date(),
    },
    create: {
      attemptId,
      questionId,
      selectedOptionIndex,
      isFlagged: Boolean(isFlagged),
    },
  });

  // Note: Formal exam flow: correctness remains masked server-side during the active test
  return { success: true };
}

async function submitAssessment({ attemptId, userId, answers = {} }) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      config: true,
      attemptQuestions: { orderBy: { orderIndex: 'asc' } },
      answers: true,
    },
  });

  if (!attempt) throw new Error('Attempt not found');
  if (userId && attempt.userId && attempt.userId !== userId) {
    throw new Error('Unauthorized attempt access');
  }

  const questionIds = attempt.attemptQuestions.map((aq) => aq.questionId);
  const actualQuestions = await prisma.assessmentQuestion.findMany({
    where: { id: { in: questionIds } },
  });
  const actualMap = new Map(actualQuestions.map((q) => [q.id, q]));

  // Idempotency: if already submitted, return existing result with question reviews
  if (attempt.status === 'submitted') {
    const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a.selectedOptionIndex]));
    const questionReviews = attempt.attemptQuestions.map((aq) => {
      const q = actualMap.get(aq.questionId);
      const chosen = answerMap.get(aq.questionId);
      return {
        orderIndex: aq.orderIndex,
        questionId: aq.questionId,
        topic: aq.snapshotTopic,
        scenario: aq.snapshotScenario,
        options: aq.snapshotOptions,
        selectedOptionIndex: chosen !== undefined ? chosen : null,
        correctOptionIndex: q?.correctOptionIndex,
        isCorrect: chosen !== undefined && q && chosen === q.correctOptionIndex,
        explain: q?.explain || '',
      };
    });

    return {
      attemptId: attempt.id,
      score: attempt.score,
      total: attempt.totalQuestions,
      percentage: Math.round(((attempt.score || 0) / attempt.totalQuestions) * 100),
      passed: attempt.passed,
      timeUsedSeconds: attempt.timeUsedSeconds,
      topicBreakdown: attempt.topicBreakdown,
      weakTopics: attempt.weakTopics,
      questionReviews,
      isDuplicate: true,
    };
  }

  // Merge any answers passed in body
  for (const [qId, optIdx] of Object.entries(answers)) {
    if (optIdx !== undefined && optIdx !== null) {
      await prisma.assessmentAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: qId } },
        update: { selectedOptionIndex: optIdx, answeredAt: new Date() },
        create: { attemptId, questionId: qId, selectedOptionIndex: optIdx },
      }).catch(() => {});
    }
  }

  // Fetch updated answers
  const allAnswers = await prisma.assessmentAnswer.findMany({
    where: { attemptId },
  });
  const answerMap = new Map(allAnswers.map((a) => [a.questionId, a.selectedOptionIndex]));

  let correctCount = 0;
  const topicBreakdown = {};
  const weakTopics = [];

  for (const aq of attempt.attemptQuestions) {
    const q = actualMap.get(aq.questionId);
    if (!q) continue;

    const chosen = answerMap.get(q.id);
    const isCorrect = chosen !== undefined && chosen === q.correctOptionIndex;

    if (isCorrect) correctCount++;

    const topic = q.topicName || aq.snapshotTopic || 'General';
    if (!topicBreakdown[topic]) {
      topicBreakdown[topic] = { correct: 0, total: 0 };
    }
    topicBreakdown[topic].total++;
    if (isCorrect) {
      topicBreakdown[topic].correct++;
    } else {
      weakTopics.push(topic);
    }
  }

  const passingPct = attempt.config?.passingScorePercentage || 70;
  const pct = attempt.totalQuestions > 0 ? Math.round((correctCount / attempt.totalQuestions) * 100) : 0;
  const passed = pct >= passingPct;
  const timeUsed = Math.min(
    attempt.config?.timeLimitSeconds || 900,
    Math.round((new Date() - new Date(attempt.startedAt)) / 1000)
  );

  const updatedAttempt = await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'submitted',
      submittedAt: new Date(),
      score: correctCount,
      passed,
      timeUsedSeconds: timeUsed,
      topicBreakdown,
      weakTopics: [...new Set(weakTopics)],
    },
  });

  const questionReviews = attempt.attemptQuestions.map((aq) => {
    const q = actualMap.get(aq.questionId);
    const chosen = answerMap.get(aq.questionId);
    return {
      orderIndex: aq.orderIndex,
      questionId: aq.questionId,
      topic: aq.snapshotTopic,
      scenario: aq.snapshotScenario,
      options: aq.snapshotOptions,
      selectedOptionIndex: chosen !== undefined ? chosen : null,
      correctOptionIndex: q?.correctOptionIndex,
      isCorrect: chosen !== undefined && q && chosen === q.correctOptionIndex,
      explain: q?.explain || '',
    };
  });

  return {
    attemptId: updatedAttempt.id,
    score: correctCount,
    total: attempt.totalQuestions,
    percentage: pct,
    passed,
    timeUsedSeconds: timeUsed,
    topicBreakdown,
    weakTopics: [...new Set(weakTopics)],
    questionReviews,
    isDuplicate: false,
  };
}

module.exports = {
  getAssessmentConfig,
  startAssessmentAttempt,
  saveAssessmentAnswer,
  submitAssessment,
  seedAssessmentQuestionsToDB,
  generateBackgroundAssessmentQuestions,
  invalidateAssessmentCache,
};
