const prisma = require('../../config/prisma');

// ─── Multi-Stack Tech Detection Helper ──────────────────────────────────────
/**
 * Detects the candidate's primary and secondary engineering stacks from
 * their uploaded resume, profile skills, and ATS scoring analysis.
 */
async function detectCandidateTechStack(userId, careerPathSlug = 'p1') {
  let candidateSkills = [];
  let resumeText = '';

  if (userId) {
    try {
      const [profile, latestAts, resume] = await Promise.all([
        prisma.providerProfile.findUnique({
          where: { user: userId },
          select: { skills: true, experience: true },
        }).catch(() => null),
        prisma.aTSScoringResult.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { matchedSkills: true, missingSkills: true },
        }).catch(() => null),
        prisma.candidateResume.findFirst({
          where: { userId, isActive: true },
          orderBy: { createdAt: 'desc' },
          select: { parsedText: true },
        }).catch(() => null),
      ]);

      if (Array.isArray(profile?.skills)) candidateSkills.push(...profile.skills);
      if (Array.isArray(latestAts?.matchedSkills)) candidateSkills.push(...latestAts.matchedSkills);
      if (Array.isArray(latestAts?.missingSkills)) candidateSkills.push(...latestAts.missingSkills);
      if (resume?.parsedText) resumeText = resume.parsedText.toLowerCase();
    } catch (_) {}
  }

  const rawTokens = candidateSkills.map((s) => String(s).toLowerCase().trim()).join(' ') + ' ' + resumeText;

  const scores = {
    python: 0,
    java: 0,
    go_devops: 0,
    node_ts: 0,
    react_next: 0,
    data_sysdesign: 0,
  };

  // Python indicators
  if (/python|django|fastapi|flask|pandas|numpy|pytorch|sqlalchemy|celery|asyncio/i.test(rawTokens)) {
    scores.python += (rawTokens.match(/python|django|fastapi|flask|pandas|numpy|pytorch|sqlalchemy|celery|asyncio/gi) || []).length;
  }

  // Java indicators
  if (/java|spring|springboot|hibernate|jvm|maven|gradle|micronaut|quarkus/i.test(rawTokens)) {
    scores.java += (rawTokens.match(/java|spring|springboot|hibernate|jvm|maven|gradle|micronaut|quarkus/gi) || []).length;
  }

  // Go & DevOps indicators
  if (/golang|go\b|kubernetes|docker|terraform|aws|gcp|ansible|helm|ci\/cd|devops/i.test(rawTokens)) {
    scores.go_devops += (rawTokens.match(/golang|go\b|kubernetes|docker|terraform|aws|gcp|ansible|helm|ci\/cd|devops/gi) || []).length;
  }

  // Node & TypeScript indicators
  if (/node|express|nestjs|typescript|deno|bun/i.test(rawTokens)) {
    scores.node_ts += (rawTokens.match(/node|express|nestjs|typescript|deno|bun/gi) || []).length;
  }

  // React & Next.js indicators
  if (/react|next\.?js|redux|tailwind|vite|html|css|javascript/i.test(rawTokens)) {
    scores.react_next += (rawTokens.match(/react|next\.?js|redux|tailwind|vite|html|css|javascript/gi) || []).length;
  }

  // Database & System Design indicators
  if (/postgres|sql|redis|kafka|system design|microservices|distributed|mongodb/i.test(rawTokens)) {
    scores.data_sysdesign += (rawTokens.match(/postgres|sql|redis|kafka|system design|microservices|distributed|mongodb/gi) || []).length;
  }

  // Find dominant stack
  let dominantStack = 'react_next';
  let maxScore = 0;

  for (const [stk, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantStack = stk;
    }
  }

  // Fallback to path default if no clear signal
  if (maxScore === 0) {
    if (careerPathSlug === 'p3') dominantStack = 'data_sysdesign';
    else if (careerPathSlug === 'p4') dominantStack = 'node_ts';
    else dominantStack = 'react_next';
  }

  const stackLabels = {
    python: 'Python & Modern Backend Architecture',
    java: 'Java, Spring Boot & Enterprise Services',
    go_devops: 'Go, Cloud Native & Container Infrastructure',
    node_ts: 'Node.js & Strict TypeScript Architecture',
    react_next: 'React Declarative UI & Next.js RSC',
    data_sysdesign: 'Distributed Databases & High Concurrency',
  };

  return {
    stackKey: dominantStack,
    stackLabel: stackLabels[dominantStack],
    scores,
    skillsSample: candidateSkills.slice(0, 8),
  };
}

// ─── Comprehensive Multi-Stack Scenario Question Bank ───────────────────────
const MULTI_STACK_PRACTICE_BANK = {
  python: [
    {
      topic: 'Python Core',
      difficulty: 'easy',
      scenario: 'You define a function `def append_item(item, list_target=[])`. Calling it multiple times without passing `list_target` leads to items accumulating. Why?',
      options: [
        'Default argument expressions are evaluated once when the function is defined, not each time it is called',
        'Python lists are immutable by default',
        'The garbage collector is failing to clean up local scope',
        'Functions in Python automatically retain caller scope variables'
      ],
      correct: 0,
      explain: 'In Python, default arguments are evaluated only once at function definition time. Using a mutable object like `[]` or `{}` creates a shared instance across all invocations.',
      mistake: 'Assuming default arguments are re-instantiated on every call is the #1 Python beginner mistake. The standard idiom is `list_target=None` and initialize inside the function.'
    },
    {
      topic: 'FastAPI / Production APIs',
      difficulty: 'medium',
      scenario: 'In a FastAPI service, you have a synchronous CPU-heavy image resizing function. How should you define its path operation to avoid blocking the event loop?',
      options: [
        'Define it as a standard synchronous `def` function so FastAPI runs it in an external threadpool',
        'Define it as `async def` so it runs faster',
        'Disable asyncio in `uvicorn` config',
        'Wrap it in an infinite `while` loop'
      ],
      correct: 0,
      explain: 'FastAPI runs standard synchronous `def` route handlers inside an external `anyio` threadpool worker, preventing synchronous blocking of the primary asyncio event loop.',
      mistake: 'Declaring CPU-bound or blocking synchronous code inside `async def` freezes the entire event loop, choking all concurrent incoming requests.'
    },
    {
      topic: 'Python Concurrency',
      difficulty: 'hard',
      scenario: 'You are processing 10,000 I/O requests concurrently with `asyncio.gather()`. One task fails with an unhandled exception. What happens to the remaining tasks by default?',
      options: [
        'The remaining tasks continue running in the background unless explicitly cancelled, potentially leaking resources',
        'All tasks immediately terminate without executing cleanup',
        'The entire Python interpreter process crashes',
        'Asyncio retries the failed task 3 times automatically'
      ],
      correct: 0,
      explain: '`asyncio.gather()` raises the exception immediately to the caller, but the other pending futures continue running in the background unless wrapped in a TaskGroup (Python 3.11+) or cancelled.',
      mistake: 'Assuming `gather()` automatically aborts other tasks leads to phantom background tasks and leaked open sockets/DB connections.'
    }
  ],

  java: [
    {
      topic: 'Java Memory Model',
      difficulty: 'easy',
      scenario: 'You compare two String variables initialized as `String a = "hello"; String b = new String("hello");` using `a == b`. What is the result?',
      options: [
        'false, because == compares memory references and `b` was created on the heap outside the String Pool',
        'true, because the contents are identical',
        'Compilation error',
        'Runtime NullPointerException'
      ],
      correct: 0,
      explain: '`==` compares object references. Literal `"hello"` resides in the String Intern Pool, whereas `new String("hello")` forces creation of a distinct object on the Java heap.',
      mistake: 'Using `==` instead of `.equals()` for object comparison is a classic junior screening blunder in Java interviews.'
    },
    {
      topic: 'Spring Boot Architecture',
      difficulty: 'medium',
      scenario: 'A service method `methodA()` annotated without `@Transactional` calls another method `methodB()` in the SAME class annotated with `@Transactional`. Why does the transaction fail to start?',
      options: [
        'Spring uses dynamic proxies; internal self-invocation bypasses the proxy interceptor completely',
        'Spring Boot does not support transactions on public methods',
        'The database driver requires an explicit commit statement',
        '@Transactional only works on Controller classes'
      ],
      correct: 0,
      explain: 'Spring AOP manages `@Transactional` via proxies. When calling a method on `this`, the call does not pass through the Spring proxy, so transaction advice is never executed.',
      mistake: 'Junior Java devs assume annotations work unconditionally inside the same class without understanding Spring AOP proxy mechanics.'
    },
    {
      topic: 'Java Concurrency & GC',
      difficulty: 'hard',
      scenario: 'In a high-throughput Spring Boot service running on Tomcat, you store request authentication data in a `ThreadLocal` without calling `.remove()`. What production catastrophe occurs?',
      options: [
        'Memory leak and data cross-contamination because Tomcat worker threads are pooled and reused across subsequent user requests',
        'The database tables lock permanently',
        'The CPU enters an infinite kernel interrupt loop',
        'Nothing, Java Garbage Collector cleans ThreadLocals automatically when the HTTP request ends'
      ],
      correct: 0,
      explain: 'Tomcat reuses worker threads from an executor pool. If a thread’s `ThreadLocal` is not cleared in a `finally` block, subsequent requests handled by that thread inherit stale, sensitive user credentials and leak heap memory.',
      mistake: 'Believing the GC cleans up ThreadLocal values when the HTTP request returns. ThreadLocal maps are tied to the Thread lifecycle, which lives as long as the server.'
    }
  ],

  go_devops: [
    {
      topic: 'Go Concurrency',
      difficulty: 'easy',
      scenario: 'You send a value into an unbuffered Go channel (`ch := make(chan int)`) in the main goroutine without any other goroutine receiving from it. What happens?',
      options: [
        'Fatal error: all goroutines are asleep - deadlock!',
        'The program silently buffers the value in memory',
        'The channel drops the value without blocking',
        'The Go runtime automatically spawns a consumer thread'
      ],
      correct: 0,
      explain: 'Sends on an unbuffered channel block until another goroutine reads from it. If no receiver is running, the Go runtime detects a permanent deadlock and terminates.',
      mistake: 'Treating unbuffered channels like message queues with internal storage.'
    },
    {
      topic: 'Docker & Multi-Stage',
      difficulty: 'medium',
      scenario: 'Your production Docker container is 1.4 GB because it includes the Go compiler, git, and build tools. How do you reduce it to under 25 MB?',
      options: [
        'Use a multi-stage Dockerfile that builds in `golang:alpine` and copies only the compiled binary into a `scratch` or `alpine` base',
        'Run `npm prune` inside the container',
        'Zip the container image with gzip before pushing',
        'Compress the host Linux kernel'
      ],
      correct: 0,
      explain: 'Multi-stage builds separate the compile environment from the final execution runtime, discarding compilers, SDKs, and build caches to yield a clean, minimal binary container.',
      mistake: 'Shipping the entire build toolchain to production increases attack surface and bloats deployment latency.'
    },
    {
      topic: 'Kubernetes & Resilience',
      difficulty: 'hard',
      scenario: 'A Kubernetes Pod repeatedly enters `CrashLoopBackOff` with Exit Code 137 under sudden traffic spikes. What is the root cause and remediation?',
      options: [
        'The container exceeded its configured memory limit and was terminated by the Linux OOM killer; increase memory limits and inspect heap profiles',
        'A network port collision occurred in the ingress controller',
        'The Pod failed its initial readiness probe',
        'The Docker daemon lost disk access'
      ],
      correct: 0,
      explain: 'Exit Code 137 = 128 + 9 (SIGKILL), universally emitted by the Linux kernel OOM (Out Of Memory) killer when cgroup memory limits are breached.',
      mistake: 'Blaming network timeouts or restarting pods without checking `kubectl describe pod` for `OOMKilled: true`.'
    }
  ],

  node_ts: [
    {
      topic: 'TypeScript Strictness',
      difficulty: 'easy',
      scenario: 'Why should you prefer the `unknown` type over `any` when accepting unvalidated external API payloads?',
      options: [
        '`unknown` forces explicit type checking/narrowing before any property or method can be accessed',
        '`unknown` runs faster at runtime',
        '`any` is deprecated in modern TypeScript compilers',
        '`unknown` automatically casts strings to numbers'
      ],
      correct: 0,
      explain: '`any` completely disables the TypeScript type checker, allowing runtime errors to slip through. `unknown` maintains type safety by mandating type guards or validation before use.',
      mistake: 'Using `any` as an escape hatch undermines the entire purpose of having TypeScript in an enterprise codebase.'
    },
    {
      topic: 'Node.js Event Loop',
      difficulty: 'medium',
      scenario: 'You execute `fs.readFileSync()` inside an Express route handler handling 500 requests per second. What happens to the other 499 concurrent requests?',
      options: [
        'They are blocked completely from being processed until the synchronous file read finishes',
        'Node.js automatically creates a new operating system thread for each request',
        'The other requests are forwarded to a backup worker process',
        'Nothing, Node.js handles all I/O asynchronously by default'
      ],
      correct: 0,
      explain: 'Node.js runs user JavaScript on a single event loop thread. Synchronous calls like `readFileSync` block the thread entirely, halting event loop processing for all concurrent requests.',
      mistake: 'Assuming Node.js is multi-threaded for user code execution.'
    },
    {
      topic: 'High Scale Microservices',
      difficulty: 'hard',
      scenario: 'In an event-driven Node.js microservice architecture with Kafka, a worker crashes mid-processing. How do you prevent duplicate side effects when the message is redelivered?',
      options: [
        'Implement an Idempotent Consumer pattern using unique event IDs and database transaction locks or Redis keys',
        'Increase Kafka consumer timeout to 24 hours',
        'Disable commit offsets in Kafka consumer group config',
        'Wrap all operations in standard try/catch without persistence'
      ],
      correct: 0,
      explain: 'At-least-once message delivery in distributed systems means redeliveries will occur. Consumers must track processed message IDs atomically to guarantee idempotent execution.',
      mistake: 'Relying strictly on Kafka auto-commit without implementing consumer-side idempotency.'
    }
  ],

  react_next: [
    {
      topic: 'React Fundamentals',
      difficulty: 'easy',
      scenario: 'You have a state array `const [items, setItems] = useState([])`. A function runs `items.push(newItem); setItems(items);`. The UI fails to re-render. Why?',
      options: [
        'Array reference did not change; React shallow-compares state references during reconciliation',
        'push() is not a valid JavaScript method',
        'setItems must be called inside a setTimeout',
        'State can only hold primitive numbers and strings'
      ],
      correct: 0,
      explain: 'React checks if the new state reference is different from the old state using `Object.is`. Mutating the array in place keeps the same reference, so React skips re-rendering.',
      mistake: 'Direct state mutation instead of immutable updates (`setItems(prev => [...prev, newItem])`).'
    },
    {
      topic: 'Next.js App Router',
      difficulty: 'medium',
      scenario: 'A page requires high SEO visibility and live search filters. How do you structure Server and Client Components?',
      options: [
        'Keep the page and initial catalog data as a Server Component; isolate search inputs and interactive filter state into small Client Components',
        'Make the entire page a Client Component with "use client"',
        'Render everything as a Server Component with no interactive inputs',
        'Fetch all data with client-side useEffect'
      ],
      correct: 0,
      explain: 'Keep data fetching on the server for instant SSR and SEO, pushing the client boundary down to the leaves of the component tree where interactivity is required.',
      mistake: 'Marking the whole root page with "use client" throws away all server-side rendering and streaming benefits.'
    },
    {
      topic: 'Performance & Architecture',
      difficulty: 'hard',
      scenario: 'A large React application suffers from high Total Blocking Time (TBT) during heavy list filtering. How does `useTransition` resolve this without freezing input keystrokes?',
      options: [
        '`useTransition` marks the list filtering state update as non-urgent, allowing high-priority user keystrokes to interrupt and render immediately',
        'It moves the calculation to a Web Worker automatically',
        'It disables React reconciliation for 2 seconds',
        'It converts React components into native Web Components'
      ],
      correct: 0,
      explain: 'React 18 Concurrent Rendering allows transitions to be interrupted by urgent updates (like typing in an input field), ensuring the browser remains responsive.',
      mistake: 'Assuming debouncing is the only solution when concurrent transitions provide native interruptible rendering.'
    }
  ],

  data_sysdesign: [
    {
      topic: 'Databases & Indexing',
      difficulty: 'easy',
      scenario: 'A SQL query `SELECT * FROM orders WHERE user_id = ? AND status = ?` is running slow on a table with 5 million rows. What is the most effective fix?',
      options: [
        'Create a composite B-tree index on (user_id, status)',
        'Run the database on SSD storage',
        'Add a LIMIT 10 clause to the query',
        'Normalize the database into 10 smaller tables'
      ],
      correct: 0,
      explain: 'A composite index on `(user_id, status)` allows the database engine to perform an index seek directly to the matching records without scanning millions of table rows.',
      mistake: 'Creating two separate single-column indexes instead of a composite index covering both predicate columns.'
    },
    {
      topic: 'Distributed Caching',
      difficulty: 'medium',
      scenario: 'In a high-traffic e-commerce flash sale, a popular product cache key expires. Thousands of requests hit the database simultaneously, causing a crash. What pattern prevents this?',
      options: [
        'Prevent Cache Stampede (Thundering Herd) with distributed mutex locks or probabilistic early background refresh',
        'Disable Redis caching during flash sales',
        'Increase database connection pool to 50,000 connections',
        'Cache records forever without TTL'
      ],
      correct: 0,
      explain: 'Using distributed locks (e.g. Redis `SET resource id NX EX 5`) ensures only one worker rebuilds the cache on expiration while others receive stale data or wait briefly.',
      mistake: 'Setting standard TTLs on hot keys without stampede protection mechanisms.'
    },
    {
      topic: 'System Scalability',
      difficulty: 'hard',
      scenario: 'You are designing an order payment processing system. How do you guarantee that a customer is never double-charged even if their mobile connection drops and retries?',
      options: [
        'Client attaches a unique Idempotency-Key UUID header; backend verifies the key in an atomic distributed lock/store before mutating payments',
        'Disable retries on client apps completely',
        'Store credit card details in client cookies',
        'Rely on network firewall deduplication'
      ],
      correct: 0,
      explain: 'Idempotency keys ensure payment mutations can be safely retried without risk of duplicate billing, adhering to strict financial consistency standards.',
      mistake: 'Treating payment endpoints as standard non-idempotent POST operations.'
    }
  ]
};

// ─── Service Methods ────────────────────────────────────────────────────────

async function getPracticeModes() {
  return [
    {
      id: 'easy',
      key: 'easy',
      modeKey: 'easy',
      title: 'Core Basics',
      label: 'Core Basics',
      tagline: 'Syntax & APIs',
      description: 'Foundational syntax, standard API contracts & baseline rules.',
      desc: 'Foundational syntax, standard API contracts & baseline rules.',
      difficulty: 'easy',
      questionCount: 5,
      badge: '🌱 Foundation Level'
    },
    {
      id: 'mixed',
      key: 'mixed',
      modeKey: 'mixed',
      title: 'Real Interview Blend',
      label: 'Real Interview Blend',
      tagline: 'Real Interview Blend',
      description: 'Balanced architectural trade-offs & recruiter screening traps.',
      desc: 'Balanced architectural trade-offs & recruiter screening traps.',
      difficulty: 'medium',
      questionCount: 5,
      badge: '⚡ Mid-Senior Blend'
    },
    {
      id: 'hard',
      key: 'hard',
      modeKey: 'hard',
      title: 'Edge Cases',
      label: 'Edge Cases',
      tagline: 'Architecture & Bugs',
      description: 'Live outages, race conditions, memory leaks & scaling bottlenecks.',
      desc: 'Live outages, race conditions, memory leaks & scaling bottlenecks.',
      difficulty: 'hard',
      questionCount: 5,
      badge: '🚀 Senior Multiplier'
    }
  ];
}

/**
 * Dynamically generates or samples practice questions tailored to the candidate's
 * detected resume tech stack (Python, Java, Go, Node, React, System Design) and mode.
 */
async function getPracticeQuestions({ careerPathSlug = 'p1', modeKey = 'mixed', userId = null, count = 5 }) {
  // 1. Detect candidate tech stack from resume & profile
  const techProfile = await detectCandidateTechStack(userId, careerPathSlug);
  const primaryStack = techProfile.stackKey;

  // 2. Fetch candidate weak topics from past practice attempts (Adaptive)
  let weakTopics = [];
  if (userId) {
    try {
      const perfs = await prisma.topicPerformance.findMany({
        where: { userId, weaknessScore: { gt: 0.25 } },
        orderBy: { weaknessScore: 'desc' },
        take: 3,
        select: { topicName: true },
      });
      weakTopics = perfs.map((p) => p.topicName);
    } catch (_) {}
  }

  // 3. Optional: Live LLM Synthesis if API key is active
  try {
    const { hasGeminiKey, hasOpenAIKey, callGeminiFlashLite, callOpenAI } = require('../ai/llmService');
    if (hasGeminiKey() || hasOpenAIKey()) {
      const prompt = `You are a Principal Technical Interviewer and Code Coach.
Candidate Tech Stack: ${techProfile.stackLabel}
Candidate Resume Skills: ${techProfile.skillsSample.join(', ') || 'Modern Software Engineering'}
Weak Topics to strengthen: ${weakTopics.join(', ') || 'None'}
Requested Practice Mode: ${modeKey} (easy = foundational syntax & core API rules, mixed = real interview trade-offs, hard = production outages, concurrency bugs & high-scale failure modes)

Generate ${count} highly realistic, scenario-based multiple-choice technical practice questions testing their ACTUAL skills in ${techProfile.stackLabel}.
Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "topic": "Specific Topic Name",
    "difficulty": "${modeKey === 'easy' ? 'easy' : modeKey === 'hard' ? 'hard' : 'medium'}",
    "scenario": "Concrete, real-world code or architecture problem scenario",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explain": "1-2 sentences explaining why the correct option is architecturally sound",
    "mistake": "1 sentence describing the common misconception junior/mid candidates fall into"
  }
]`;

      let llmResult = null;
      if (hasGeminiKey()) llmResult = await callGeminiFlashLite(prompt);
      if ((!llmResult || !llmResult.used) && hasOpenAIKey()) llmResult = await callOpenAI(prompt);

      if (llmResult?.used && Array.isArray(llmResult.output) && llmResult.output.length >= 3) {
        return {
          questions: llmResult.output.slice(0, count).map((q, idx) => ({
            id: `ai-gen-${Date.now()}-${idx}`,
            topic: q.topic || techProfile.stackLabel,
            difficulty: q.difficulty || modeKey,
            scenario: q.scenario,
            options: q.options || [],
            correct: typeof q.correct === 'number' ? q.correct : 0,
            explain: q.explain || '',
            mistake: q.mistake || '',
          })),
          techStack: techProfile.stackLabel,
          isAiGenerated: true,
          mode: modeKey,
        };
      }
    }
  } catch (err) {
    console.warn('[practice.service] LLM question generation fallback to multi-stack bank:', err.message);
  }

  // 4. Sample from Multi-Stack Question Bank
  let stackQuestions = MULTI_STACK_PRACTICE_BANK[primaryStack] || MULTI_STACK_PRACTICE_BANK.react_next;

  // Add questions from complementary stacks to ensure variety
  const secondaryStack = primaryStack === 'python' ? 'data_sysdesign'
    : primaryStack === 'java' ? 'data_sysdesign'
    : primaryStack === 'go_devops' ? 'data_sysdesign'
    : primaryStack === 'node_ts' ? 'react_next'
    : 'data_sysdesign';

  const combinedBank = [...stackQuestions, ...(MULTI_STACK_PRACTICE_BANK[secondaryStack] || [])];

  // Filter by requested mode
  let filtered = [];
  if (modeKey === 'easy') {
    filtered = combinedBank.filter((q) => q.difficulty === 'easy');
  } else if (modeKey === 'hard') {
    filtered = combinedBank.filter((q) => q.difficulty === 'hard');
  } else {
    // mixed
    filtered = combinedBank;
  }

  // Fallback to all if not enough in specific mode
  if (filtered.length < count) {
    filtered = combinedBank;
  }

  // Shuffle for variety
  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return {
    questions: selected.map((q, idx) => ({
      id: `q-stack-${primaryStack}-${idx}-${Date.now()}`,
      topic: q.topic,
      difficulty: q.difficulty,
      scenario: q.scenario,
      options: q.options,
      correct: q.correct,
      explain: q.explain,
      mistake: q.mistake,
    })),
    techStack: techProfile.stackLabel,
    isAiGenerated: false,
    mode: modeKey,
  };
}

/**
 * Persists practice attempt, updates topic weakness scores, and records real-time streak.
 */
async function recordPracticeSubmission({ userId, careerPathSlug = 'p1', modeKey = 'mixed', answers = [], currentStreak = 0 }) {
  let careerPath = null;
  try {
    careerPath = await prisma.careerPath.findUnique({ where: { slug: careerPathSlug } });
  } catch (_) {}

  let correctCount = 0;
  const missedTopics = [];
  const processedAnswers = [];

  for (const item of answers) {
    const isCorrect = Boolean(item.isCorrect);
    if (isCorrect) {
      correctCount++;
    } else if (item.topic) {
      missedTopics.push(item.topic);
    }

    processedAnswers.push({
      questionId: item.questionId || `q-${Date.now()}`,
      selectedOptionIndex: item.selectedOptionIndex ?? item.pickedIndex ?? 0,
      isCorrect,
    });

    // Update TopicPerformance in database
    if (userId && item.topic) {
      try {
        const perf = await prisma.topicPerformance.findUnique({
          where: {
            userId_topicName: {
              userId,
              topicName: item.topic,
            },
          },
        });

        const newTotal = (perf?.totalAttempts || 0) + 1;
        const newCorrect = (perf?.correctCount || 0) + (isCorrect ? 1 : 0);
        const newIncorrect = (perf?.incorrectCount || 0) + (isCorrect ? 0 : 1);
        const weakness = newTotal > 0 ? newIncorrect / newTotal : 0;

        await prisma.topicPerformance.upsert({
          where: {
            userId_topicName: {
              userId,
              topicName: item.topic,
            },
          },
          update: {
            correctCount: newCorrect,
            incorrectCount: newIncorrect,
            totalAttempts: newTotal,
            weaknessScore: weakness,
            lastAttemptedAt: new Date(),
          },
          create: {
            userId,
            topicName: item.topic,
            correctCount: isCorrect ? 1 : 0,
            incorrectCount: isCorrect ? 0 : 1,
            totalAttempts: 1,
            weaknessScore: isCorrect ? 0 : 1,
          },
        });
      } catch (_) {}
    }
  }

  // Calculate final streak
  const roundStreak = answers.length > 0 && answers.every((a) => a.isCorrect);
  const finalStreak = roundStreak ? currentStreak + answers.length : 0;

  // Persist PracticeAttempt if database is available
  let attemptId = null;
  if (userId) {
    try {
      const attempt = await prisma.practiceAttempt.create({
        data: {
          userId,
          careerPathId: careerPath?.id || 'p1',
          modeKey,
          score: correctCount,
          totalQuestions: answers.length,
          streak: finalStreak,
        },
      });
      attemptId = attempt.id;
    } catch (_) {}
  }

  return {
    attemptId,
    score: correctCount,
    total: answers.length,
    streak: finalStreak,
    weakTopics: [...new Set(missedTopics)],
  };
}

module.exports = {
  detectCandidateTechStack,
  getPracticeModes,
  getPracticeQuestions,
  recordPracticeSubmission,
  MULTI_STACK_PRACTICE_BANK,
};
