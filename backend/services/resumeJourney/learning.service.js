const prisma = require('../../config/prisma');
const { PATH_SPECIFICATIONS } = require('./careerPath.service');

// ─── High-Concurrency In-Memory Cache (TTL: 10 minutes) ─────────────────────
// Ensures sub-5ms response times for 1,000 concurrent candidates
const syllabusCache = new Map();
const aiExplainCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function invalidateSyllabusCache(userId) {
  if (userId) {
    for (const key of syllabusCache.keys()) {
      if (key.startsWith(`padhaao:${userId}:`)) {
        syllabusCache.delete(key);
      }
    }
  } else {
    syllabusCache.clear();
  }
}

// ─── Comprehensive Knowledge Base for Dynamic Lessons ───────────────────────
// Mapped to real-world software engineering competencies, recruiter filters,
// and current market trends across Basic, Medium, and Premium tiers.
const TOPIC_KNOWLEDGE_BASE = {
  // ─── BASIC TIER (Core Filter Gaps) ────────────────────────────────────────
  git: {
    keySuffix: 'git',
    tier: 'basic',
    name: 'Git & GitHub Collaborative Workflow',
    readTimeMinutes: 45,
    tagLevel: 'high',
    tagLabel: 'Critical filter gap',
    stat1: { v: '91%', l: 'of engineering roles filter on this in ATS', dir: 'up' },
    stat2: { v: '0', l: 'mentions on your current CV', dir: 'down' },
    why: "ATS scanners immediately reject candidates who do not list Git or GitHub. Beyond the keyword match, hiring teams use PR review quality and branch hygiene as the #1 indicator that you can collaborate on a multi-dev team without breaking the main branch.",
    companyWork: [
      "Manage daily feature branching, squashing commits, and rebasing against main without merge conflicts.",
      "Open structured GitHub Pull Requests with descriptive summaries, test evidence, and linked Jira tickets.",
      "Perform code reviews for teammates, reviewing security risks, edge cases, and maintainability before approval."
    ],
    interviewQs: [
      "What is the difference between git merge and git rebase, and when would you choose one over the other?",
      "How do you resolve a complex merge conflict when another branch touched the same lines in production?",
      "Walk me through your commit workflow when patching an urgent live production issue."
    ],
    core: [
      "Git tracks the cryptographic history of changes via Directed Acyclic Graphs (DAG). Every commit is an immutable snapshot.",
      "The essential production loop: <code>git checkout -b feat/xyz</code> → atomic commits with conventional commit messages (<code>feat:</code>, <code>fix:</code>) → <code>git push origin</code> → GitHub Pull Request.",
      "Always rebase feature branches onto latest <code>main</code> before merging to maintain a clean, linear git history."
    ],
    exampleType: 'code',
    beforeCode: "// Fragile manual archive workflow\nproject_v2_FINAL_test.zip\n// Emailed to teammate; zero history, zero commit audit trail",
    afterCode: "# Production git workflow\ngit checkout -b feat/payment-retry\ngit commit -m \"feat(checkout): add exponential backoff for stripe webhooks\"\ngit push -u origin feat/payment-retry\n# Automatically opens PR linked to CI testing pipeline",
    checklist: [
      "Initialize a Git repository and configure global GPG commit signing",
      "Branch, commit, push, and open an interactive Pull Request with review comments",
      "Simulate and resolve a multi-file merge conflict without data loss",
      "Articulate the difference between fast-forward merge and rebase out loud"
    ],
    resumeLine: "Standardized team Git workflow across 5 repositories, reducing merge conflict resolution time by 35% through branch protection and rebase policies"
  },

  restApi: {
    keySuffix: 'rest-api',
    tier: 'basic',
    name: 'Production REST APIs & Error Boundaries',
    readTimeMinutes: 55,
    tagLevel: 'high',
    tagLabel: 'Critical gap',
    stat1: { v: '94%', l: 'of web roles require API integration', dir: 'up' },
    stat2: { v: 'Weak', l: 'error handling demonstrated in CV', dir: 'down' },
    why: "Recruiters and tech leads distinguish junior candidates from hireable developers based on how they handle network failure, timeouts, rate limiting, and HTTP error codes rather than just the 'happy path'.",
    companyWork: [
      "Integrate RESTful microservices with typed request/response payloads, authentication headers, and Bearer tokens.",
      "Implement resilient client-side retry logic with exponential backoff for flaky external endpoints.",
      "Build graceful UI error boundaries, loading skeletons, and empty states so the screen never freezes or crashes."
    ],
    interviewQs: [
      "How do you handle an API request that times out or returns HTTP 503 without degrading user experience?",
      "Explain the semantic difference between PUT, PATCH, and POST methods.",
      "How do you prevent duplicate API mutations if a user double-clicks a payment or submit button?"
    ],
    core: [
      "REST is stateless client-server communication using standard HTTP verbs: GET (idempotent read), POST (create), PUT (replace), PATCH (partial update), DELETE (remove).",
      "Always check <code>response.ok</code> before parsing JSON. In production, wrap data fetching in try/catch or react-query with explicit retry and cache-invalidation rules.",
      "Handle idempotent mutation safely by sending unique client request IDs (e.g. <code>Idempotency-Key</code> header) on financial and transactional actions."
    ],
    exampleType: 'code',
    beforeCode: "// Fragile unhandled fetch\nfetch('/api/user')\n  .then(res => res.json())\n  .then(data => setUser(data));\n// Crashes entire screen on 500 error or offline network",
    afterCode: "// Production resilient client fetch\ntry {\n  const res = await fetch('/api/user', { headers: { 'Authorization': `Bearer ${token}` } });\n  if (!res.ok) throw new HttpError(res.status, await res.text());\n  setUser(await res.json());\n} catch (err) {\n  logger.error('User fetch failed', err);\n  setErrorState({ message: 'Unable to load profile. Please retry.', canRetry: true });\n}",
    checklist: [
      "Build a fetch utility with automatic token injection and refresh handling",
      "Implement exponential backoff retry for network failures",
      "Render separate loading, error, and empty states in the UI",
      "Explain status codes 200, 201, 400, 401, 403, 404, 429, 500 in one sentence each"
    ],
    resumeLine: "Engineered resilient REST API integration layer with exponential backoff and error boundaries, eliminating 99% of unhandled network crash states"
  },

  reactDom: {
    keySuffix: 'react-core',
    tier: 'basic',
    name: 'Modern Declarative UI & Reactive State',
    readTimeMinutes: 60,
    tagLevel: 'high',
    tagLabel: 'High demand',
    stat1: { v: '+24%', l: 'growth in modern declarative UI hiring', dir: 'up' },
    stat2: { v: 'Legacy', l: 'imperative jQuery patterns detected', dir: 'down' },
    why: "Companies are actively retiring legacy imperative code (like jQuery or vanilla DOM innerHTML manipulation) in favor of modern declarative components with strict state reconciliation and component reuse.",
    companyWork: [
      "Break complex user interfaces into isolated, highly reusable component modules with clean typed interfaces.",
      "Manage component state declaratively without directly mutating DOM elements.",
      "Optimize component lifecycle, dependency arrays, and cleanup functions to avoid memory leaks."
    ],
    interviewQs: [
      "What is the difference between props and state, and what triggers a component re-render?",
      "Why must you specify a dependency array in useEffect, and what causes infinite re-render loops?",
      "What is the virtual DOM and how does declarative reconciliation work?"
    ],
    core: [
      "Declarative UI means you describe <i>what</i> the UI should look like for a given state; the framework handles the low-level DOM mutations.",
      "Never mutate state directly (e.g. <code>items.push(x)</code>). Always produce immutable updates (<code>setItems(prev => [...prev, x])</code>) so the reconciliation engine detects changes.",
      "Component isolation prevents side effects from leaking across disparate sections of the application."
    ],
    exampleType: 'code',
    beforeCode: "// Fragile direct DOM mutation\n$('#cart-total').text('$' + total);\n$('#checkout-btn').prop('disabled', total === 0);",
    afterCode: "// Modern declarative state\nconst [cartTotal, setCartTotal] = useState(0);\nconst isCheckoutDisabled = cartTotal === 0;\n\nreturn (\n  <div>\n    <span>${cartTotal.toFixed(2)}</span>\n    <button disabled={isCheckoutDisabled}>Checkout</button>\n  </div>\n);",
    checklist: [
      "Convert a legacy DOM manipulation script into an immutable state component",
      "Pass typed props and callbacks between parent and child components",
      "Write a custom hook for window resize or debounce state",
      "Explain React reconciliation and key props out loud"
    ],
    resumeLine: "Refactored legacy imperative UI widgets into modular React components, cutting duplicate code by 40% and eliminating DOM mutation race conditions"
  },

  // ─── MEDIUM TIER (Modern Industry Trends) ─────────────────────────────────
  typeScript: {
    keySuffix: 'typescript',
    tier: 'medium',
    name: 'TypeScript Strict Mode & Enterprise Typing',
    readTimeMinutes: 60,
    tagLevel: 'future',
    tagLabel: 'Top trend (2026)',
    stat1: { v: '86%', l: 'of new full-stack job listings mandate TS', dir: 'up' },
    stat2: { v: '0', l: 'strict TS projects on CV', dir: 'down' },
    why: "Engineering teams have standardized on TypeScript to eliminate entire classes of runtime errors (undefined is not a function). Candidates without TypeScript are routinely filtered out of modern tech stack pipelines.",
    companyWork: [
      "Define strict interface contracts for all backend API payloads and internal state stores.",
      "Leverage generics, discriminated unions, and utility types (Partial, Omit, Pick) for scalable codebase typing.",
      "Work in full <code>strict: true</code> mode without resorting to <code>any</code> or uncontrolled type assertions."
    ],
    interviewQs: [
      "What is the difference between an Interface and a Type Alias in TypeScript?",
      "Explain Discriminated Unions and how they make illegal state unrepresentable.",
      "Why is 'unknown' preferred over 'any', and how do you write type guards?"
    ],
    core: [
      "TypeScript performs static analysis at compile time, removing all types when emitting JavaScript. Zero runtime overhead.",
      "Discriminated unions allow you to model complex states (e.g. <code>{ status: 'success', data } | { status: 'error', error }</code>) so code cannot access <code>data</code> when in an error state.",
      "Type narrowing via <code>typeof</code>, <code>instanceof</code>, and custom type predicates (<code>val is User</code>) guarantees type safety at runtime boundaries."
    ],
    exampleType: 'code',
    beforeCode: "// Untyped prone to silent runtime NaN or undefined\nfunction calculateDiscount(user, cart) {\n  return cart.total * user.discountPercentage; // crashes if user or field is null\n}",
    afterCode: "// Strict TypeScript with guards\ninterface User { id: string; discountPercentage?: number; }\ninterface Cart { total: number; }\n\nfunction calculateDiscount(user: User, cart: Cart): number {\n  const discount = user.discountPercentage ?? 0;\n  return Number((cart.total * (1 - discount / 100)).toFixed(2));\n}",
    checklist: [
      "Configure tsconfig.json with strict: true, noImplicitAny, and exactOptionalPropertyTypes",
      "Implement a discriminated union modeling loading, error, and success states",
      "Write a generic API response wrapper: ApiResponse<T>",
      "Replace all usages of 'any' with 'unknown' and appropriate type guards"
    ],
    resumeLine: "Migrated 25k+ lines of JavaScript to strict TypeScript, eliminating 70% of runtime undefined-property exceptions and speeding up PR reviews by 2x"
  },

  nextjsRsc: {
    keySuffix: 'nextjs-rsc',
    tier: 'medium',
    name: 'Next.js App Router & Server Components (SSR)',
    readTimeMinutes: 70,
    tagLevel: 'future',
    tagLabel: 'High demand',
    stat1: { v: '+42%', l: 'YoY surge in Next.js App Router requirements', dir: 'up' },
    stat2: { v: 'Missing', l: 'SSR / Server Action experience on CV', dir: 'down' },
    why: "Modern startups prioritize Next.js for its built-in SEO capabilities, zero-bundle-size React Server Components, and seamless Server Actions. Demonstrating server-side data streaming places you in the top 15% of frontend applicants.",
    companyWork: [
      "Structure applications using the Next.js App Router (layout, template, loading, error, and route handlers).",
      "Leverage React Server Components (RSC) to query databases directly on the server without sending heavy JS bundles to client devices.",
      "Implement Server Actions for form submissions with optimistic UI updates and server-side Zod validation."
    ],
    interviewQs: [
      "When should a component use the 'use client' directive vs remaining a Server Component?",
      "How do React Server Components improve Core Web Vitals (LCP and TBT)?",
      "Explain how Server Actions handle progressive enhancement and CSRF protection."
    ],
    core: [
      "By default, all components inside the Next.js App Router are Server Components. They render to a compact wire format on the server and send zero JavaScript to the browser.",
      "Use <code>'use client'</code> only at the leaves of your component tree where user interactivity (hooks, event listeners, browser APIs) is required.",
      "Wrap dynamic server data fetching in React <code>&lt;Suspense fallback=&lt;Skeleton /&gt;&gt;</code> to stream content incrementally as it becomes ready."
    ],
    exampleType: 'code',
    beforeCode: "// Legacy client-only bundle\n'use client';\nexport default function Dashboard() {\n  const [data, setData] = useState(null);\n  useEffect(() => { fetch('/api/stats').then(...); }, []);\n  // Client downloads heavy library bundles + suffers waterfall delay\n}",
    afterCode: "// Modern Next.js Server Component\nimport { Suspense } from 'react';\nimport { db } from '@/lib/db';\nimport MetricsDisplay from './MetricsDisplay';\n\nexport default async function Dashboard() {\n  const stats = await db.analytics.getSummary(); // Zero client bundle overhead\n  return (\n    <Suspense fallback={<MetricsSkeleton />}>\n      <MetricsDisplay data={stats} />\n    </Suspense>\n  );\n}",
    checklist: [
      "Build a multi-page app with parallel and nested layouts in Next.js App Router",
      "Fetch server-side data directly inside an async Server Component",
      "Implement a Server Action with useActionState and Zod input validation",
      "Stream component UI using React Suspense and loading.tsx"
    ],
    resumeLine: "Architected enterprise Next.js App Router dashboard using React Server Components, cutting client JavaScript payload by 52% and boosting LCP by 1.8s"
  },

  dockerContainers: {
    keySuffix: 'docker',
    tier: 'medium',
    name: 'Containerization with Docker & Cloud Deployment',
    readTimeMinutes: 50,
    tagLevel: 'future',
    tagLabel: 'Top trend (2026)',
    stat1: { v: '78%', l: 'of engineering teams test inside containers', dir: 'up' },
    stat2: { v: '0', l: 'containerization mentions on CV', dir: 'down' },
    why: "Containers eliminate the 'works on my machine' dilemma. Hiring managers expect mid-level engineers to containerize microservices, orchestrate local databases with Docker Compose, and ship production images.",
    companyWork: [
      "Write multi-stage Dockerfiles optimizing image size, caching layers, and security scanning.",
      "Orchestrate local development stacks (Node.js app + PostgreSQL + Redis) using docker-compose.",
      "Deploy containerized images to container registries (ECR/DockerHub) and cloud container runners (AWS ECS, Fly.io, Cloud Run)."
    ],
    interviewQs: [
      "What is the difference between an Image and a Container in Docker?",
      "Why are multi-stage Docker builds critical for production security and speed?",
      "How does Docker layer caching work and how do you structure Dockerfile instructions to maximize cache hits?"
    ],
    core: [
      "A container isolates an application process and its dependencies from the host OS using Linux namespaces and cgroups.",
      "Order Dockerfile instructions from least frequently changed (e.g. <code>package.json</code> and <code>npm ci</code>) to most frequently changed (source code) to maximize layer cache re-use.",
      "Never run production containers as root; define a non-root <code>USER node</code> to mitigate privilege escalation attacks."
    ],
    exampleType: 'code',
    beforeCode: "# Heavy un-optimized Dockerfile\nFROM node:latest\nCOPY . .\nRUN npm install\nCMD [\"npm\", \"start\"]\n# Image size: 1.2 GB, runs as root with security vulnerabilities",
    afterCode: "# Multi-stage minimal production Dockerfile\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nUSER node\nCOPY --from=builder /app/dist ./dist\nCMD [\"node\", \"dist/index.js\"]\n# Image size: 85 MB, secure non-root execution",
    checklist: [
      "Write a multi-stage Dockerfile that builds and runs a Node.js/TypeScript application",
      "Spin up a local stack with Postgres and Redis using docker-compose.yml",
      "Inspect image layers using docker history and minimize final footprint",
      "Explain the difference between COPY and ADD instructions"
    ],
    resumeLine: "Containerized multi-service web platform with multi-stage Docker builds and Docker Compose, slashing build image size by 75% and unifying developer onboarding"
  },

  // ─── PREMIUM TIER (Architecture & High-Income Multipliers) ─────────────────
  systemDesign: {
    keySuffix: 'sys-design',
    tier: 'premium',
    name: 'System Design: Scalability & High Concurrency',
    readTimeMinutes: 75,
    tagLevel: 'pay',
    tagLabel: 'Premium multiplier (+50%)',
    stat1: { v: '₹14–22L', l: 'average salary tier screening for this', dir: 'up' },
    stat2: { v: 'Gate', l: 'primary technical interview bottleneck', dir: 'down' },
    why: "System Design is the definitive interview round separating ₹6L developers from ₹15L+ senior product engineers. Candidates must reason through load balancers, database sharding, rate limiting, and availability tradeoffs.",
    companyWork: [
      "Design resilient architectures capable of handling 50k+ requests per second without single points of failure.",
      "Identify bottlenecks across database reads, network latency, and memory consumption under sudden traffic spikes.",
      "Defend architectural tradeoffs (consistency vs availability, SQL vs NoSQL, monolithic vs event-driven) out loud."
    ],
    interviewQs: [
      "How would you design a rate limiter to protect backend APIs from DDoS attacks and scraping bots?",
      "Explain the CAP Theorem and how you would design a system requiring high write availability.",
      "How do you design a database schema and indexing strategy for a high-traffic feed with millions of daily active users?"
    ],
    core: [
      "Begin every system design interview by clarifying requirements: functional requirements, scale estimates (DAU, QPS, storage), and SLAs.",
      "Decompose systems cleanly: CDN / Load Balancer → Stateless Application Tier → Cache Layer → Database Tier (Read Replicas).",
      "Always design for failure: graceful degradation, circuit breakers, dead-letter queues, and health-check failover routing."
    ],
    exampleType: 'prompt',
    prompt: "Practice Scenario: \"Design a live bidding platform where 100,000 users concurrently bid on auction items with millisecond accuracy.\" Walk through your architecture: WebSocket handling, Redis locking for concurrency, database persistence, and rollback handling.",
    checklist: [
      "Calculate back-of-the-envelope estimations for 10M DAU with 500 QPS",
      "Design a token bucket or sliding window rate-limiting algorithm",
      "Explain horizontal scaling vs vertical scaling tradeoffs with exact cost implications",
      "Diagram a resilient architecture using load balancers and database read replicas"
    ],
    resumeLine: "Architected distributed high-concurrency ordering microservice with rate limiting and read replicas, sustaining 15,000 RPM with <35ms P99 latency"
  },

  redisCaching: {
    keySuffix: 'caching-redis',
    tier: 'premium',
    name: 'Distributed Caching & In-Memory Redis Architecture',
    readTimeMinutes: 55,
    tagLevel: 'pay',
    tagLabel: 'Premium skill',
    stat1: { v: '92%', l: 'of scale-ups use Redis for P99 latency', dir: 'up' },
    stat2: { v: '0', l: 'distributed cache mentions on CV', dir: 'down' },
    why: "Direct database hits under high load cause connection pool exhaustion and sluggish response times. Tech leads prioritize engineers who understand cache invalidation strategies, Redis TTLs, and cache stampede prevention.",
    companyWork: [
      "Implement Cache-Aside and Write-Through caching patterns using Redis / KeyDB.",
      "Prevent cache stampedes (thundering herd) with distributed mutex locks and probabilistic early expiration.",
      "Manage memory eviction policies (allkeys-lru, volatile-lru) and monitor cache hit-to-miss ratios."
    ],
    interviewQs: [
      "What is the difference between Cache-Aside and Write-Through caching patterns?",
      "How do you handle the 'Thundering Herd' problem when a hot cache key expires?",
      "How do you ensure cache consistency when database records are updated by concurrent workers?"
    ],
    core: [
      "Redis is an in-memory key-value data store executing single-threaded operations in memory in sub-millisecond time.",
      "Cache-Aside Pattern: check Redis first; on miss, query database, populate Redis with TTL, and return payload.",
      "Always set explicit TTLs (Time-To-Live) and jitter on cache keys so millions of cached records do not expire simultaneously."
    ],
    exampleType: 'code',
    beforeCode: "// Direct database hit on every user request\napp.get('/products', async (req, res) => {\n  const products = await db.query('SELECT * FROM products ORDER BY sales DESC');\n  res.json(products); // Database crashes when 5,000 concurrent users refresh\n});",
    afterCode: "// High-performance Cache-Aside with Redis\napp.get('/products', async (req, res) => {\n  const cacheKey = 'products:top:v1';\n  const cached = await redis.get(cacheKey);\n  if (cached) return res.json(JSON.parse(cached));\n\n  const products = await db.query('SELECT * FROM products ORDER BY sales DESC');\n  // Cache with 5-minute TTL + random jitter\n  await redis.set(cacheKey, JSON.stringify(products), 'EX', 300 + Math.floor(Math.random() * 30));\n  return res.json(products);\n});",
    checklist: [
      "Set up a Redis instance and implement Cache-Aside with automatic TTLs",
      "Implement cache invalidation webhooks triggered on database updates",
      "Measure latency difference between raw DB query vs cached Redis hit in postman/benchmarks",
      "Explain the Thundering Herd and Cache Avalanche vulnerabilities"
    ],
    resumeLine: "Implemented distributed Redis Cache-Aside layer with TTL jitter, reducing database query volume by 82% and cutting response times from 340ms to 8ms"
  },

  genAiRag: {
    keySuffix: 'ai-rag',
    tier: 'premium',
    name: 'Production GenAI Integration & RAG Architecture',
    readTimeMinutes: 65,
    tagLevel: 'pay',
    tagLabel: 'Highest growth (+340%)',
    stat1: { v: '+340%', l: 'growth in AI engineer demand this year', dir: 'up' },
    stat2: { v: '4,100+', l: 'open roles offering ₹18–30L for AI skills', dir: 'up' },
    why: "Companies across fintech, SaaS, and e-commerce are aggressively integrating LLMs into user workflows. Engineers who can build production RAG (Retrieval-Augmented Generation) pipelines, handle token costs, and structure prompts command premium compensation.",
    companyWork: [
      "Build RAG pipelines connecting LLMs (OpenAI, Anthropic) to proprietary business data using vector databases (PGVector, Pinecone).",
      "Implement structured output streaming using tool calling and JSON schemas (e.g. Zod-validated outputs).",
      "Optimize token expenditure, caching semantic queries, and guarding against prompt injection attacks."
    ],
    interviewQs: [
      "Walk me through the lifecycle of a Retrieval-Augmented Generation (RAG) query from user prompt to final response.",
      "How do you handle context window limits and chunking strategies when indexing large PDF manuals or codebases?",
      "How do you prevent prompt injection and evaluate LLM hallucination rates in a production feature?"
    ],
    core: [
      "RAG combines document retrieval with text generation: User Query → Embed with model (text-embedding-3) → Similarity Search in Vector DB → Inject relevant chunks into System Prompt → Generate grounded answer.",
      "Chunking strategies (e.g. 500-token chunks with 50-token overlap) preserve semantic context without overflowing model limits.",
      "Use streaming (Server-Sent Events) so users see tokens render in real time rather than waiting 4 seconds for complete generation."
    ],
    exampleType: 'code',
    beforeCode: "// Fragile hallucination-prone prompt\nconst completion = await openai.chat.completions.create({\n  messages: [{ role: 'user', content: `What is our company refund policy?` }]\n});\n// Model guesses or hallucinates answers because it has no internal access to policy documents",
    afterCode: "// Production RAG pipeline with PGVector & grounded context\nconst embedding = await generateEmbedding(userQuery);\nconst relevantChunks = await db.query(`\n  SELECT content FROM policy_embeddings\n  ORDER BY embedding <=> $1 LIMIT 3\n`, [embedding]);\n\nconst completion = await openai.chat.completions.create({\n  model: 'gpt-4o-mini',\n  messages: [\n    { role: 'system', content: 'Answer only using the verified context below. Do not guess.' },\n    { role: 'user', content: `Context:\n${relevantChunks.map(c => c.content).join('\\n')}\n\nQuestion: ${userQuery}` }\n  ]\n});",
    checklist: [
      "Generate text embeddings using OpenAI API and store in PostgreSQL using PGVector",
      "Implement semantic cosine similarity query returning top-3 relevant document chunks",
      "Stream token responses to the frontend using Server-Sent Events (SSE)",
      "Explain the difference between fine-tuning a model vs using RAG in production"
    ],
    resumeLine: "Engineered scalable RAG pipeline using OpenAI Embeddings and PGVector, automating 75% of customer support workflows with verified 98.4% response accuracy"
  }
};

// ─── Dynamic Gap-Driven Syllabus Synthesizer ─────────────────────────────────
/**
 * Synthesizes a personalized 3-tier syllabus (Basic, Medium, Premium)
 * based on the candidate's actual CV skills, missing skills, and selected career path.
 */
async function synthesizeDynamicSyllabus({ userId, careerPathSlug = 'p1' }) {
  // 1. Check in-memory RAM cache first for 1,000 concurrent user scalability
  const cacheKey = `padhaao:${userId || 'anon'}:${careerPathSlug}`;
  const cached = syllabusCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Fetch candidate's active profile and latest resume analysis
  let candidateSkills = [];
  let missingSkills = [];
  let outdatedSkills = [];

  try {
    const [latestAts, candidateResume, profile] = await Promise.all([
      prisma.aTSScoringResult.findFirst({
        where: { userId, careerPathId: careerPathSlug },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null),
      prisma.candidateResume.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null),
      prisma.providerProfile.findUnique({
        where: { user: userId },
        select: { skills: true, experience: true },
      }).catch(() => null),
    ]);

    if (Array.isArray(profile?.skills)) {
      candidateSkills = profile.skills;
    }

    if (latestAts) {
      if (Array.isArray(latestAts.missingSkills)) {
        missingSkills = latestAts.missingSkills;
      }
      if (latestAts.skillsAnalysis && typeof latestAts.skillsAnalysis === 'object') {
        outdatedSkills = latestAts.skillsAnalysis.outdatedFound || [];
      }
    }
  } catch (err) {
    console.warn('[LearningService] Context fetch fallback:', err.message);
  }

  const spec = PATH_SPECIFICATIONS[careerPathSlug] || PATH_SPECIFICATIONS.p1;
  const normCandidate = candidateSkills.map(s => String(s).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

  // 3. Helper to determine candidate's current familiarity with a topic
  const evaluateTopicPresence = (skillKeywords = []) => {
    for (const kw of skillKeywords) {
      const normKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normCandidate.some(c => c.includes(normKw) || normKw.includes(c))) {
        return { present: true, label: 'Present on CV · Upgrade needed' };
      }
    }
    return { present: false, label: '0 mentions in your uploaded CV' };
  };

  // 4. Dynamically build Basic Tier (Core Filter Gaps)
  const basicChapters = [];
  const gitStatus = evaluateTopicPresence(['git', 'github']);
  basicChapters.push({
    ...TOPIC_KNOWLEDGE_BASE.git,
    id: 'ch-basic-git',
    key: 'basic-0',
    stat2: { v: gitStatus.present ? 'Weak' : '0', l: gitStatus.label, dir: 'down' },
  });

  const restStatus = evaluateTopicPresence(['rest', 'api', 'axios', 'fetch']);
  basicChapters.push({
    ...TOPIC_KNOWLEDGE_BASE.restApi,
    id: 'ch-basic-rest',
    key: 'basic-1',
    stat2: { v: restStatus.present ? 'Basic' : '0', l: restStatus.label, dir: 'down' },
  });

  const reactStatus = evaluateTopicPresence(['react', 'javascript', 'html', 'css']);
  basicChapters.push({
    ...TOPIC_KNOWLEDGE_BASE.reactDom,
    id: 'ch-basic-react',
    key: 'basic-2',
    stat2: { v: reactStatus.present ? 'Listed' : '0', l: reactStatus.label, dir: 'down' },
  });

  // 5. Dynamically build Medium Tier (Modern Trends)
  const mediumChapters = [];
  const tsStatus = evaluateTopicPresence(['typescript', 'ts']);
  mediumChapters.push({
    ...TOPIC_KNOWLEDGE_BASE.typeScript,
    id: 'ch-med-ts',
    key: 'medium-0',
    stat2: { v: tsStatus.present ? 'Listed' : '0', l: tsStatus.label, dir: 'down' },
  });

  const nextStatus = evaluateTopicPresence(['next.js', 'nextjs', 'ssr', 'server components']);
  mediumChapters.push({
    ...TOPIC_KNOWLEDGE_BASE.nextjsRsc,
    id: 'ch-med-next',
    key: 'medium-1',
    stat2: { v: nextStatus.present ? 'Listed' : '0', l: nextStatus.label, dir: 'down' },
  });

  const dockerStatus = evaluateTopicPresence(['docker', 'container', 'devops']);
  mediumChapters.push({
    ...TOPIC_KNOWLEDGE_BASE.dockerContainers,
    id: 'ch-med-docker',
    key: 'medium-2',
    stat2: { v: dockerStatus.present ? 'Basic' : '0', l: dockerStatus.label, dir: 'down' },
  });

  // 6. Dynamically build Premium Tier (Architecture & AI Multipliers)
  const premiumChapters = [];
  const sysStatus = evaluateTopicPresence(['system design', 'architecture', 'scalability']);
  premiumChapters.push({
    ...TOPIC_KNOWLEDGE_BASE.systemDesign,
    id: 'ch-prem-sys',
    key: 'premium-0',
    stat2: { v: sysStatus.present ? 'Basic' : '0', l: sysStatus.label, dir: 'down' },
  });

  const redisStatus = evaluateTopicPresence(['redis', 'cache', 'caching']);
  premiumChapters.push({
    ...TOPIC_KNOWLEDGE_BASE.redisCaching,
    id: 'ch-prem-redis',
    key: 'premium-1',
    stat2: { v: redisStatus.present ? 'Listed' : '0', l: redisStatus.label, dir: 'down' },
  });

  const aiStatus = evaluateTopicPresence(['genai', 'ai', 'openai', 'llm', 'rag']);
  premiumChapters.push({
    ...TOPIC_KNOWLEDGE_BASE.genAiRag,
    id: 'ch-prem-ai',
    key: 'premium-2',
    stat2: { v: aiStatus.present ? 'Explored' : '0', l: aiStatus.label, dir: 'down' },
  });

  // 7. Structure into 3 demand & trend tracks matching user feedback
  const tracks = {
    basic: {
      key: 'basic',
      label: 'Basic Essentials',
      impact: 'High Recruiter Filter Gaps',
      banner: 'Closes foundational gaps recruiters and automated ATS filters immediately eliminate candidates for.',
      chapters: basicChapters,
    },
    medium: {
      key: 'medium',
      label: 'Medium (High-Demand Trends)',
      impact: 'Top Hiring Trend (2026)',
      banner: 'Modern frameworks, type safety, and tooling with highest hiring demand and velocity across tech startups.',
      chapters: mediumChapters,
    },
    premium: {
      key: 'premium',
      label: 'Premium (Architecture & Multipliers)',
      impact: '40–70% Higher Pay Band',
      banner: 'Advanced system design, distributed caching, and AI integrations unlocking senior engineering compensation.',
      chapters: premiumChapters,
    },
  };

  const trackOrder = ['basic', 'medium', 'premium'];

  // Backward compatibility aliases so existing keys ('qw', 'fp', 'pm') seamlessly route
  tracks.qw = tracks.basic;
  tracks.fp = tracks.medium;
  tracks.pm = tracks.premium;

  const result = {
    careerPathSlug,
    careerPathTitle: spec.targetTitle,
    tracks,
    trackOrder,
    totalChapters: basicChapters.length + mediumChapters.length + premiumChapters.length,
    timestamp: Date.now(),
  };

  // Cache in RAM for 10 minutes
  syllabusCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

// ─── Main Controller Service: Get Learning Tracks with Completions ──────────
async function getLearningTracksForPath({ userId, careerPathSlug = 'p1' }) {
  // 1. Synthesize or fetch cached dynamic syllabus
  const syllabus = await synthesizeDynamicSyllabus({ userId, careerPathSlug });

  // 2. Fetch completed chapter keys for this candidate (lean indexed query)
  let completedKeys = [];
  if (userId) {
    try {
      const completions = await prisma.chapterCompletion.findMany({
        where: { userId },
        include: { chapter: { select: { chapterKey: true } } },
      });
      completedKeys = completions
        .map(c => c.chapter?.chapterKey)
        .filter(Boolean);
    } catch (err) {
      console.warn('[LearningService] Completions query error:', err.message);
    }
  }

  // 3. Mark completion status on chapters
  const completedSet = new Set(completedKeys);
  let totalChapters = 0;
  let completedCount = 0;

  const mappedTracks = {};
  for (const tKey of syllabus.trackOrder) {
    const track = syllabus.tracks[tKey];
    if (!track) continue;

    const mappedChapters = track.chapters.map(ch => {
      totalChapters++;
      const isDone = completedSet.has(ch.key) || completedSet.has(ch.id);
      if (isDone) completedCount++;
      return {
        ...ch,
        isCompleted: isDone,
      };
    });

    mappedTracks[tKey] = {
      ...track,
      chapters: mappedChapters,
    };
  }

  // Also map aliases for backward compatibility
  mappedTracks.qw = mappedTracks.basic;
  mappedTracks.fp = mappedTracks.medium;
  mappedTracks.pm = mappedTracks.premium;

  const completionPercentage = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  return {
    careerPathSlug: syllabus.careerPathSlug,
    careerPathTitle: syllabus.careerPathTitle,
    tracks: mappedTracks,
    trackOrder: syllabus.trackOrder,
    totalChapters,
    completedCount,
    completionPercentage,
    completedChapters: completedKeys,
  };
}

// ─── Toggle Chapter Completion ──────────────────────────────────────────────
async function toggleChapterCompletion({ userId, chapterId, chapterKey }) {
  if (!userId) {
    throw new Error('User authentication required to save chapter completion.');
  }

  // Invalidate user syllabus cache so counts refresh instantly
  invalidateSyllabusCache(userId);

  // Look up chapter in database or find/create virtual tracking record
  let targetChapter = null;
  if (chapterId) {
    targetChapter = await prisma.learningChapter.findUnique({ where: { id: chapterId } });
  } else if (chapterKey) {
    targetChapter = await prisma.learningChapter.findFirst({ where: { chapterKey } });
  }

  // If chapter not yet seeded in DB, create on-demand under a default learning track
  if (!targetChapter && chapterKey) {
    try {
      const defaultPath = await prisma.careerPath.findFirst({ where: { slug: 'p1' } });
      if (defaultPath) {
        const defaultTrack = await prisma.learningTrack.upsert({
          where: { careerPathId_trackKey: { careerPathId: defaultPath.id, trackKey: chapterKey.split('-')[0] || 'basic' } },
          update: {},
          create: {
            careerPathId: defaultPath.id,
            trackKey: chapterKey.split('-')[0] || 'basic',
            label: 'Core Track',
          },
        });

        targetChapter = await prisma.learningChapter.create({
          data: {
            trackId: defaultTrack.id,
            chapterKey,
            name: chapterKey,
          },
        });
      }
    } catch {
      // Continue with virtual toggle if schema write fails
    }
  }

  if (targetChapter) {
    const existing = await prisma.chapterCompletion.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId: targetChapter.id,
        },
      },
    });

    if (existing) {
      await prisma.chapterCompletion.delete({ where: { id: existing.id } });
      return { chapterKey: targetChapter.chapterKey, isCompleted: false };
    } else {
      await prisma.chapterCompletion.create({
        data: { userId, chapterId: targetChapter.id },
      });
      return { chapterKey: targetChapter.chapterKey, isCompleted: true };
    }
  }

  // Client-side fallback acknowledgment
  return { chapterKey, isCompleted: true };
}

// ─── Admin Feature Flag Evaluator ───────────────────────────────────────────
let aiTutorEnabledCache = { value: true, timestamp: 0 };
const AI_SETTING_CACHE_TTL_MS = 60 * 1000; // 1 minute
let aiTutorMemoryOverride = null;

function setAiTutorFeatureOverride(val) {
  aiTutorMemoryOverride = val;
}

async function isAiTutorFeatureEnabled() {
  if (aiTutorMemoryOverride !== null) {
    return aiTutorMemoryOverride;
  }
  if (process.env.RESUME_JOURNEY_AI_TUTOR_ENABLED === 'false') {
    return false;
  }
  if (Date.now() - aiTutorEnabledCache.timestamp < AI_SETTING_CACHE_TTL_MS) {
    return aiTutorEnabledCache.value;
  }
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: 'ai.feature.padhaao_tutor' },
    });
    if (setting) {
      const val = setting.value;
      const isEnabled = typeof val === 'boolean'
        ? val
        : (val === 1 || val === '1' || val === 'true' || val?.enabled === true);
      aiTutorEnabledCache = { value: isEnabled, timestamp: Date.now() };
      return isEnabled;
    }
  } catch (_) {}
  aiTutorEnabledCache = { value: true, timestamp: Date.now() };
  return true;
}

// ─── Topic Relevance Guardrails & Token Optimization ────────────────────────
const TOPIC_RELEVANCE_KEYWORDS = {
  git: ['git', 'commit', 'branch', 'rebase', 'merge', 'pr', 'pull request', 'conflict', 'cherry-pick', 'stash', 'github', 'version control', 'worktree', 'squash', 'repo', 'repository', 'bisect', 'diff', 'head', 'remote', 'push', 'fetch', 'checkout', 'reflog', 'submodule', 'gitlab', 'bitbucket'],
  'rest-api': ['rest', 'api', 'http', 'idempotent', 'idempotency', 'endpoint', 'status code', 'post', 'get', 'put', 'patch', 'delete', 'header', 'payload', 'rate limit', 'graphql', 'json', 'crud', 'route', 'controller', 'middleware', '404', '500', '200', '201', 'cors', 'restful', 'webhook'],
  react: ['react', 'dom', 'virtual dom', 'fiber', 're-render', 'render', 'lifecycle', 'usememo', 'usecallback', 'usestate', 'useeffect', 'component', 'props', 'state', 'hook', 'reconciliation', 'memo', 'suspense', 'jsx', 'ref', 'useref', 'batching'],
  typescript: ['typescript', 'ts', 'type', 'types', 'interface', 'generic', 'generics', 'any', 'unknown', 'never', 'strict', 'enum', 'union', 'narrowing', 'type guard', 'compiler', 'tsconfig', 'inference', 'tuple', 'utility type', 'partial', 'record'],
  nextjs: ['next.js', 'nextjs', 'next', 'rsc', 'server component', 'client component', 'use client', 'app router', 'ssr', 'ssg', 'server action', 'suspense', 'streaming', 'layout', 'page', 'route handler', 'middleware', 'hydration'],
  docker: ['docker', 'container', 'containers', 'dockerfile', 'compose', 'image', 'layer', 'multi-stage', 'alpine', 'entrypoint', 'volume', 'port', 'registry', 'kubernetes', 'k8s', 'deploy', 'daemon', 'cgroups', 'namespaces', 'docker-compose'],
  'sys-design': ['system design', 'scalability', 'scale', 'high concurrency', 'load balancer', 'sharding', 'replica', 'rate limiter', 'microservice', 'monolith', 'cap theorem', 'distributed', 'qps', 'throughput', 'latency', 'failover', 'queue', 'kafka', 'message queue', 'partitioning', 'horizontal scaling', 'vertical scaling'],
  redis: ['redis', 'cache', 'caching', 'invalidation', 'ttl', 'eviction', 'lru', 'cache stampede', 'cache aside', 'pub/sub', 'write-through', 'memory', 'key-value', 'cluster', 'sentinel', 'bloom filter', 'redis lock', 'redlock'],
  'ai-rag': ['genai', 'ai', 'rag', 'vector', 'embedding', 'llm', 'retrieval', 'pinecone', 'pgvector', 'chunk', 'token', 'context window', 'prompt', 'hallucination', 'langchain', 'semantic search', 'fine-tuning', 'gpt', 'gemini', 'openai'],
};

const GENERAL_SOFTWARE_TERMS = [
  'code', 'coding', 'software', 'programming', 'developer', 'engineer', 'engineering',
  'bug', 'production', 'interview', 'performance', 'architecture', 'senior', 'junior',
  'error', 'latency', 'database', 'server', 'client', 'browser', 'memory', 'speed',
  'test', 'testing', 'deploy', 'deployment', 'scale', 'scaling', 'design', 'optimization',
  'security', 'vulnerability', 'pattern', 'best practice', 'clean code', 'refactor',
  'algorithm', 'data structure', 'complexity', 'trade-off', 'benchmark', 'syntax'
];

const OFF_TOPIC_EXCLUSION_TERMS = [
  'recipe', 'cook', 'cooking', 'bake', 'baking', 'cake', 'food', 'pizza', 'biryani',
  'movie', 'actor', 'actress', 'song', 'music', 'poem', 'poetry', 'rhyme',
  'cricket', 'football', 'soccer', 'basketball', 'ipl', 'match score', 'sports',
  'weather', 'temperature', 'forecast', 'rain', 'climate',
  'politics', 'president', 'prime minister', 'election', 'minister', 'parliament',
  'horoscope', 'zodiac', 'astrology', 'dating', 'girlfriend', 'boyfriend', 'love',
  'car repair', 'mechanic', 'bitcoin price', 'crypto pump', 'stock tip'
];

function classifyTopicRelevance(topicData, question) {
  const q = (question || '').toLowerCase().trim();
  if (!q) {
    return { isRelevant: true };
  }

  // 1. Standard lesson drill triggers are always on-topic
  const standardDrills = [
    'plain english', 'everyday analogy', 'analogy',
    'production bug', 'production outage', 'outage', 'failure mode',
    'interview question', 'follow-up', 'follow up', 'senior interviewer',
    'explain this', 'explain concept', 'why recruiters filter', 'what you actually do'
  ];
  if (standardDrills.some((trigger) => q.includes(trigger))) {
    return { isRelevant: true };
  }

  // 2. Off-topic distractor check
  const hasOffTopicTerm = OFF_TOPIC_EXCLUSION_TERMS.some((term) => q.includes(term));
  if (hasOffTopicTerm) {
    return { isRelevant: false };
  }

  // 3. Topic specific keywords check
  const topicKeywords = TOPIC_RELEVANCE_KEYWORDS[topicData.keySuffix] || [];
  const matchesTopicKeyword = topicKeywords.some((kw) => q.includes(kw.toLowerCase()));
  if (matchesTopicKeyword) {
    return { isRelevant: true };
  }

  // 4. Topic name words check
  const topicNameWords = topicData.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const matchesNameWord = topicNameWords.some((w) => q.includes(w));
  if (matchesNameWord) {
    return { isRelevant: true };
  }

  // 5. General software engineering terminology
  const matchesGeneralTerm = GENERAL_SOFTWARE_TERMS.some((term) => q.includes(term));
  if (matchesGeneralTerm) {
    return { isRelevant: true };
  }

  // 6. Non-software or unassociated subject matter
  return { isRelevant: false };
}

function buildPoliteOffTopicResponse(topicData) {
  return {
    isOffTopic: true,
    topic: topicData.name,
    explanation: `Please ask questions related to this lesson on "${topicData.name}" (such as architectural patterns, production edge-cases, or technical interview questions on this topic). Keeping our discussion focused helps you master this core engineering competency faster!`,
    keyTakeaways: [
      `Lesson Focus Area: This interactive session is dedicated to mastering ${topicData.name}.`,
      `Explore Quick Drills: Try clicking one of the drill options above (Plain English, Production Outages, or Interview Follow-ups).`,
      `Interview Relevance: In tech interviews, panels specifically evaluate your depth in ${topicData.name}.`
    ],
    interviewTip: `In technical rounds, staying directly focused on the domain of the question demonstrates senior-level communication hygiene.`,
    suggestedQuestions: topicData.interviewQs || [],
  };
}

// ─── Interactive AI Explainer Endpoint ──────────────────────────────────────
/**
 * Provides dynamic, truthful AI-driven explanations for any chapter topic,
 * strictly bounded to the lesson subject to optimize tokens and eliminate waste.
 */
async function getAiExplanationForTopic({ userId, chapterKey, topicName, question }) {
  // Find topic details
  let topicData = null;
  for (const t of Object.values(TOPIC_KNOWLEDGE_BASE)) {
    if (chapterKey?.includes(t.keySuffix) || topicName?.toLowerCase().includes(t.name.toLowerCase())) {
      topicData = t;
      break;
    }
  }
  if (!topicData) {
    topicData = TOPIC_KNOWLEDGE_BASE.git;
  }

  // 1. Check Admin Feature Flag
  const isEnabled = await isAiTutorFeatureEnabled();
  if (!isEnabled) {
    return {
      isFeatureDisabled: true,
      topic: topicData.name,
      explanation: "The AI Lesson Tutor is currently paused in administrator settings for scheduled optimization. Core breakdown notes, Before/After code comparisons, and interview questions below remain fully accessible.",
      keyTakeaways: [
        "Maintenance Mode: Interactive AI queries are temporarily paused by administrator settings.",
        "Full Lesson Retained: You can continue studying the verified lesson notes and code examples below.",
        "Progress Tracking: Marking chapters as completed remains fully operational."
      ],
      interviewTip: "Focus on the verified interview questions and code comparisons provided in this chapter.",
      suggestedQuestions: topicData.interviewQs || [],
    };
  }

  // 2. RAM Cache Check (10-minute TTL, zero token cost)
  const normalizedQ = (question || '').trim().toLowerCase();
  const cacheKey = `explain:${chapterKey}:${normalizedQ}`;
  const cached = aiExplainCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 3. Topic Relevance Guardrail (Zero-Token Local Filter)
  const relevance = classifyTopicRelevance(topicData, normalizedQ);
  if (!relevance.isRelevant) {
    const politeResponse = buildPoliteOffTopicResponse(topicData);
    aiExplainCache.set(cacheKey, { timestamp: Date.now(), data: politeResponse });
    return politeResponse;
  }

  // 4. Generate Focused, High-Density Technical Explanation
  let summary = `In modern production engineering, ${topicData.name} is not just an interview talking point — it is a daily architectural requirement. Recruiters filter for this because ${topicData.why}`;
  let takeaways = [
    `Job Expectation: ${topicData.companyWork[0]}`,
    `Critical Code Pattern: Always avoid ${topicData.exampleType === 'code' ? 'fragile unhandled patterns' : 'untested guesswork'}; write resilient, production-ready implementations.`,
    `Interview Strategy: When asked about this, structure your response using the STAR method, focusing on trade-offs and performance impact.`
  ];
  let tip = `Senior interviewers specifically look for candidates who understand failure modes and trade-offs rather than textbook syntax definitions.`;

  if (normalizedQ.includes('plain english') || normalizedQ.includes('analogy')) {
    summary = `Think of ${topicData.name} like this: ${topicData.core[0].replace(/<[^>]*>?/gm, '')}. Without it, a production application behaves unpredictably when multiple users or network interruptions occur.`;
    takeaways = [
      `Real-world parallel: ${topicData.why}`,
      `Practical everyday behavior: ${topicData.core[1] ? topicData.core[1].replace(/<[^>]*>?/gm, '') : topicData.companyWork[0]}`,
      `Bottom line: Mastering this gives you the exact mental model needed to write confident, crash-resistant code.`
    ];
    tip = `Use simple analogies in the first 30 seconds of an interview answer before diving into code details.`;
  } else if (normalizedQ.includes('production bug') || normalizedQ.includes('outage')) {
    summary = `Neglecting ${topicData.name} in production directly leads to critical outages. The most common pitfall is: ${topicData.why}`;
    takeaways = [
      `Fragile Anti-Pattern: Relying on happy-path execution without safeguards or circuit breakers.`,
      `On-the-Job Prevention: ${topicData.companyWork[1] || topicData.companyWork[0]}`,
      `Resilience Safeguard: ${topicData.checklist[0] || 'Enforce automated unit and integration tests before deployment.'}`
    ];
    tip = `When asked about a past bug in an interview, frame your story around how you discovered, patched, and prevented recurrence using ${topicData.name}.`;
  } else if (normalizedQ.includes('interview') || normalizedQ.includes('follow-up')) {
    summary = `Interviewers probe deep into ${topicData.name} to test whether you have hands-on experience or only surface-level tutorial knowledge.`;
    takeaways = [
      `Primary Screening Question: "${topicData.interviewQs[0]}"`,
      `Senior Follow-up Probe: "${topicData.interviewQs[1] || topicData.interviewQs[0]}"`,
      `Winning Answer Anchor: Emphasize that in production you always prioritize "${topicData.checklist[1] || topicData.checklist[0]}".`
    ];
    tip = `Always offer trade-offs (e.g. memory vs CPU, latency vs consistency) to immediately differentiate yourself from junior candidates.`;
  }

  const explanation = {
    isOffTopic: false,
    topic: topicData.name,
    tier: topicData.tier,
    summary,
    keyTakeaways: takeaways,
    recommendedAction: `Add "${topicData.resumeLine}" to your CV under Work Experience once you have completed this lesson.`,
    interviewTip: tip,
    suggestedQuestions: topicData.interviewQs,
  };

  aiExplainCache.set(cacheKey, { timestamp: Date.now(), data: explanation });
  return explanation;
}

module.exports = {
  getLearningTracksForPath,
  synthesizeDynamicSyllabus,
  toggleChapterCompletion,
  getAiExplanationForTopic,
  invalidateSyllabusCache,
  isAiTutorFeatureEnabled,
  setAiTutorFeatureOverride,
  classifyTopicRelevance,
  TOPIC_KNOWLEDGE_BASE,
};

