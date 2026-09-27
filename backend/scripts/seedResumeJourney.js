require('dotenv').config();
const prisma = require('../config/prisma');

async function seedResumeJourney() {
  console.log('[Seed] Starting Resume Journey dynamic data seeding...');

  // 1. Seed Career Paths
  const careerPaths = [
    {
      slug: 'p1',
      title: 'Abhi 3-6 LPA job chahiye',
      subTitle: '0-30 din me calls badhani hai',
      badge: 'Fast Track',
      isRecommended: true,
      sortOrder: 1,
      kya: '+12,700 jobs unlock · Resume score 64→82 · Expected calls 3x',
      oneLiner: 'TypeScript + Next.js + Tailwind → 3x calls',
      lessonsCount: 3,
      jobsCount: 12700,
    },
    {
      slug: 'p2',
      title: '8-12 LPA pe jump karna hai',
      subTitle: '2-3 mahine • product me jana hai',
      badge: 'Most Popular',
      isRecommended: false,
      sortOrder: 2,
      kya: 'Product companies me shortlist · Avg 10-14 LPA · System Design questions clear',
      oneLiner: 'RSC + System Design → Product companies shortlist',
      lessonsCount: 6,
      jobsCount: 9400,
    },
    {
      slug: 'p3',
      title: '15 LPA+ High Paid banna hai',
      subTitle: 'Senior tag • Top startups',
      badge: 'High Salary',
      isRecommended: false,
      sortOrder: 3,
      kya: 'Razorpay, CRED, Swiggy type companies · 15-25 LPA · Senior tag',
      oneLiner: 'System Design + GenAI → 15-25 LPA',
      lessonsCount: 8,
      jobsCount: 4100,
    },
    {
      slug: 'p4',
      title: '2030 tak job secure karni hai',
      subTitle: 'AI replace na kare',
      badge: 'Future Safe',
      isRecommended: false,
      sortOrder: 4,
      kya: 'AI replace nahi karega · Full-stack + AI = safe for next 5 years',
      oneLiner: 'AI Tools + Full-stack → 5 saal safe',
      lessonsCount: 10,
      jobsCount: 6800,
    },
  ];

  const pathMap = new Map();
  for (const cp of careerPaths) {
    const record = await prisma.careerPath.upsert({
      where: { slug: cp.slug },
      update: cp,
      create: cp,
    });
    pathMap.set(cp.slug, record.id);
  }
  console.log(`[Seed] Seeded ${pathMap.size} Career Paths.`);

  // 2. Seed Skills Taxonomy
  const skillsData = [
    { canonicalName: 'Next.js', category: 'Frontend', status: 'rising', trend: '+41%', salaryRange: '14-18 LPA', actionPrompt: 'Master App Router and Server Components' },
    { canonicalName: 'TypeScript', category: 'Language', status: 'rising', trend: '+33%', salaryRange: '16-22 LPA', actionPrompt: 'Migrate components to strict TypeScript' },
    { canonicalName: 'GenAI Integration', category: 'AI/ML', status: 'rising', trend: '+340%', salaryRange: '22-30 LPA', actionPrompt: 'Integrate LLM APIs and RAG workflows' },
    { canonicalName: 'React Server Components', category: 'Frontend', status: 'rising', trend: '+58%', salaryRange: '15-20 LPA', actionPrompt: 'Understand server-client component boundaries' },
    { canonicalName: 'Tailwind CSS', category: 'Frontend', status: 'rising', trend: '+45%', salaryRange: '10-16 LPA', actionPrompt: 'Style modern UI with utility classes' },
    { canonicalName: 'System Design', category: 'Architecture', status: 'rising', trend: '+50%', salaryRange: '18-28 LPA', actionPrompt: 'Design scalable distributed frontend systems' },
    { canonicalName: 'Node.js', category: 'Backend', status: 'active', trend: '+20%', salaryRange: '12-20 LPA', actionPrompt: 'Build scalable asynchronous REST APIs' },
    { canonicalName: 'JavaScript', category: 'Language', status: 'active', trend: 'Stable', salaryRange: '8-15 LPA', actionPrompt: 'Deep dive into event loop and async patterns' },
    { canonicalName: 'jQuery', category: 'Frontend', status: 'outdated', trend: '-28%', salaryRange: '', actionPrompt: 'Remove from primary skills, replace with React' },
    { canonicalName: 'Bootstrap only', category: 'Frontend', status: 'outdated', trend: '-22%', salaryRange: '', actionPrompt: 'Replace with Tailwind CSS' },
    { canonicalName: 'PHP Core (without Laravel)', category: 'Backend', status: 'outdated', trend: '-19%', salaryRange: '', actionPrompt: 'Upgrade to modern backend frameworks' },
    { canonicalName: 'JavaScript (vanilla only)', category: 'Language', status: 'fading', trend: '-11%', salaryRange: '', actionPrompt: 'Pair with React, Next.js, or Vue' },
    { canonicalName: 'CSS only (no Tailwind)', category: 'Frontend', status: 'fading', trend: '-14%', salaryRange: '', actionPrompt: 'Adopt modern utility-first CSS frameworks' },
  ];

  for (const sk of skillsData) {
    const skillRecord = await prisma.skillTaxonomy.upsert({
      where: { canonicalName: sk.canonicalName },
      update: sk,
      create: sk,
    });

    // Create common aliases
    const raw = sk.canonicalName.toLowerCase();
    const alias1 = raw.replace(/[^a-z0-9]/g, '');
    const alias2 = raw.replace(/\s+/g, '-');
    for (const a of [alias1, alias2]) {
      if (a) {
        await prisma.skillAlias.upsert({
          where: { alias: a },
          update: { skillId: skillRecord.id },
          create: { alias: a, skillId: skillRecord.id },
        }).catch(() => {});
      }
    }
  }
  console.log(`[Seed] Seeded ${skillsData.length} Skills.`);

  // 3. Seed Topics
  const topicsData = [
    'TypeScript', 'Next.js', 'Tailwind', 'Server Components',
    'System Design', 'Performance', 'GenAI Integration', 'DSA Patterns', 'Git & GitHub'
  ];
  const topicMap = new Map();
  for (const t of topicsData) {
    const record = await prisma.journeyTopic.upsert({
      where: { name: t },
      update: { name: t },
      create: { name: t, category: 'engineering' },
    });
    topicMap.set(t, record.id);
  }
  console.log(`[Seed] Seeded ${topicsData.length} Topics.`);

  // 4. Seed Practice Modes
  const modesData = [
    { modeKey: 'quick5', label: 'Quick 5', questionCount: 5, timeLimitSeconds: 300, description: 'Rapid 5-question check-in drill' },
    { modeKey: 'full15', label: 'Full 15', questionCount: 15, timeLimitSeconds: 900, description: 'Comprehensive technical rehearsal' },
    { modeKey: 'weak', label: 'Weak Areas', questionCount: 5, timeLimitSeconds: 300, description: 'Adaptive drill targeting missed topics' },
    { modeKey: 'speed', label: 'Speed Drill', questionCount: 5, timeLimitSeconds: 150, description: 'Fast-paced blitz challenge' },
    { modeKey: 'mixed', label: 'Mixed Practice', questionCount: 5, timeLimitSeconds: 300, description: 'Balanced multi-topic drill' },
  ];
  for (const m of modesData) {
    await prisma.practiceMode.upsert({
      where: { modeKey: m.modeKey },
      update: m,
      create: m,
    });
  }
  console.log(`[Seed] Seeded ${modesData.length} Practice Modes.`);

  // 5. Seed Learning Tracks & Chapters
  const tracksByPath = {
    p1: [
      {
        trackKey: 'qw',
        label: 'Quick wins',
        impact: '+35% more matches',
        banner: 'Closes gaps recruiters filter on right now — fastest path to more interview calls.',
        chapters: [
          {
            chapterKey: 'qw-0',
            name: 'Git & GitHub essentials',
            readTimeMinutes: 45,
            tagLevel: 'high',
            tagLabel: 'Critical gap',
            stat1Value: '81%', stat1Label: 'of matched roles ask for this', stat1Dir: 'down',
            stat2Value: '0', stat2Label: 'mentions on current resume', stat2Dir: 'down',
            why: "Most companies run resumes through an ATS filter before a human opens them — searching for Git or GitHub. Zero mentions means auto-rejection.",
            companyWork: [
              "Every single commit goes through Git to prevent merge chaos.",
              "Code review happens through GitHub Pull Requests.",
              "Take-home hiring assignments require a GitHub repo link."
            ],
            interviewQs: [
              "Walk me through your Git workflow when fixing a live production bug.",
              "Difference between git merge and git rebase?",
              "How do you resolve a complex merge conflict?"
            ],
            core: [
              "Git is distributed version control tracking every change.",
              "Core loop: git add → git commit -m → git push → git pull.",
              "Branching allows isolated feature development without breaking main."
            ],
            exampleType: 'code',
            beforeCode: "final_project_v3_ACTUALLY_FINAL.zip\n// emailed to team",
            afterCode: "git commit -m 'add payment validation'\ngit push origin feature/payment-fix",
            checklist: ["Initialize a repo and make first commit", "Create a branch and open a PR", "Resolve a merge conflict"],
            resumeLine: "Managed version control and code review using Git & GitHub across 6+ production projects"
          },
          {
            chapterKey: 'qw-1',
            name: 'REST APIs, hands-on',
            readTimeMinutes: 55,
            tagLevel: 'high',
            tagLabel: 'Critical gap',
            stat1Value: '92%', stat1Label: 'of JS roles expect this', stat1Dir: 'down',
            stat2Value: '0', stat2Label: 'API integration projects on resume', stat2Dir: 'down',
            why: "Every product interacts with servers via APIs. Frontend roles require data fetching, caching, and error state handling.",
            companyWork: [
              "Fetching and rendering dynamic data in real-time.",
              "Submitting forms with robust validation and error handling.",
              "Managing loading skeletons and network timeouts."
            ],
            interviewQs: [
              "How do you handle an API call that times out?",
              "Difference between PUT and PATCH?",
              "How do you prevent duplicate submissions on double-clicks?"
            ],
            core: [
              "REST uses standard HTTP methods: GET, POST, PUT, DELETE.",
              "Always wrap fetch/axios in try-catch with UI error states.",
              "Handle auth tokens with HTTP-only cookies or Authorization headers."
            ],
            exampleType: 'code',
            beforeCode: "fetch('/api/user').then(r => r.json()).then(setUser);\n// crashes on 500 error",
            afterCode: "try {\n  const res = await fetch('/api/user');\n  if (!res.ok) throw new Error('API failed');\n  setUser(await res.json());\n} catch (err) {\n  setError(err.message);\n}",
            checklist: ["Fetch data with error handling", "Send JSON with POST request", "Implement loading and empty states"],
            resumeLine: "Integrated REST APIs for data fetching, caching, and authentication across client features"
          },
          {
            chapterKey: 'qw-2',
            name: 'React fundamentals & Hooks',
            readTimeMinutes: 75,
            tagLevel: 'mid',
            tagLabel: 'High demand',
            stat1Value: '+18%', stat1Label: 'React demand vs last quarter', stat1Dir: 'up',
            stat2Value: 'jQuery', stat2Label: 'listed, React missing', stat2Dir: 'down',
            why: "React is the industry standard for modern web apps. Transitioning from jQuery expands available jobs by 10x.",
            companyWork: [
              "Building modular component libraries.",
              "Managing reactive state with useState, useReducer, and custom hooks.",
              "Optimizing re-renders with useMemo and useCallback."
            ],
            interviewQs: [
              "Explain the React component lifecycle and useEffect dependencies.",
              "What causes unnecessary re-renders and how do you profile them?",
              "Controlled vs uncontrolled inputs?"
            ],
            core: [
              "Components encapsulate UI and logic.",
              "State changes trigger declarative reconciliation via the virtual DOM.",
              "Custom hooks share business logic across components."
            ],
            exampleType: 'code',
            beforeCode: "$('#counter').text(count++); // direct DOM mutation",
            afterCode: "const [count, setCount] = useState(0);\nreturn <button onClick={() => setCount(c => c + 1)}>{count}</button>;",
            checklist: ["Build 3 reusable components", "Create a custom useDebounce hook", "Implement controlled form"],
            resumeLine: "Architected modular React component library with custom hooks and optimized rendering"
          }
        ]
      }
    ],
    p2: [
      {
        trackKey: 'sd',
        label: 'System Design & Scalability',
        impact: '+50% salary bump',
        banner: 'Design patterns required for mid to senior product engineer screening rounds.',
        chapters: [
          {
            chapterKey: 'sd-0',
            name: 'React Server Components & Boundaries',
            readTimeMinutes: 60,
            tagLevel: 'high',
            tagLabel: 'Senior Requirement',
            stat1Value: '85%', stat1Label: 'of top startups ask this', stat1Dir: 'up',
            stat2Value: '0', stat2Label: 'RSC projects demonstrated', stat2Dir: 'down',
            why: "Understanding the client-server boundary is the hallmark of modern senior frontend engineering.",
            companyWork: ["Isolating server-side DB calls from interactive client buttons."],
            interviewQs: ["When should a component be client vs server rendered?"],
            core: ["Server components render to a stream on the server; client components handle interactivity."],
            exampleType: 'code',
            beforeCode: "'use client';\n// whole page client side",
            afterCode: "// Server Component default\nexport default async function Page() {\n  const data = await db.query();\n  return <ClientButton data={data} />;\n}",
            checklist: ["Separate data-fetching from interactivity", "Use Suspense boundaries"],
            resumeLine: "Implemented React Server Components reducing client bundle size by 45%"
          }
        ]
      }
    ]
  };

  for (const [pSlug, tracks] of Object.entries(tracksByPath)) {
    const cpId = pathMap.get(pSlug);
    if (!cpId) continue;

    for (let tIdx = 0; tIdx < tracks.length; tIdx++) {
      const tr = tracks[tIdx];
      const trackRecord = await prisma.learningTrack.upsert({
        where: { careerPathId_trackKey: { careerPathId: cpId, trackKey: tr.trackKey } },
        update: { label: tr.label, impact: tr.impact, banner: tr.banner, sortOrder: tIdx },
        create: { careerPathId: cpId, trackKey: tr.trackKey, label: tr.label, impact: tr.impact, banner: tr.banner, sortOrder: tIdx },
      });

      for (let cIdx = 0; cIdx < tr.chapters.length; cIdx++) {
        const ch = tr.chapters[cIdx];
        await prisma.learningChapter.upsert({
          where: { trackId_chapterKey: { trackId: trackRecord.id, chapterKey: ch.chapterKey } },
          update: { ...ch, sortOrder: cIdx },
          create: { ...ch, trackId: trackRecord.id, sortOrder: cIdx },
        });
      }
    }
  }
  console.log('[Seed] Seeded Learning Tracks and Chapters.');

  // 6. Seed Practice Questions
  const practiceQuestions = [
    {
      pathSlug: 'p1',
      topicName: 'TypeScript',
      difficulty: 'medium',
      scenario: "You convert a .js file to .ts and suddenly get 40 type errors on an old API-response object. What's the right first move?",
      options: [
        "Add // @ts-nocheck to the file so it compiles",
        "Set strict:false for the whole project",
        "Define a proper interface for the API response and fix errors from there",
        "Rename the file back to .js"
      ],
      correctOptionIndex: 2,
      explain: "Right call: define the real shape of the data first. Turning off strict mode or suppressing errors hides the exact bugs TypeScript exists to catch.",
      mistake: "Most people pick @ts-nocheck or strict:false because it makes red squiggles disappear, but interviewers probe for this shortcut."
    },
    {
      pathSlug: 'p1',
      topicName: 'Next.js',
      difficulty: 'medium',
      scenario: "You're building a product page that needs live cart state but also SEO-friendly product details. How do you split the components?",
      options: [
        "Make the whole page a Client Component for simplicity",
        "Server Component for product details, Client Component for the cart widget",
        "Client Component for everything, fetch data with useEffect",
        "Server Component for everything, no client interactivity"
      ],
      correctOptionIndex: 1,
      explain: "Right call: Server Components for static/SEO content, Client Components only where interactivity is needed.",
      mistake: "Client Component for everything throws away SEO and performance benefits."
    },
    {
      pathSlug: 'p1',
      topicName: 'Tailwind',
      difficulty: 'easy',
      scenario: "A teammate wants a one-off gradient button used nowhere else in the app. Utility classes or a custom CSS file?",
      options: [
        "Always write custom CSS for anything non-trivial",
        "Utility classes inline — that's what Tailwind is for, even for one-off styles",
        "Use Bootstrap instead",
        "Inline style attribute with hardcoded hex values"
      ],
      correctOptionIndex: 1,
      explain: "Right call: Tailwind's whole model is composing utilities even for one-offs.",
      mistake: "Writing separate CSS files breaks the utility-first paradigm."
    },
    {
      pathSlug: 'p2',
      topicName: 'Server Components',
      difficulty: 'medium',
      scenario: "A Server Component needs to respond to a button click. What do you do?",
      options: [
        "Add onClick directly to the Server Component",
        "Move just that interactive piece into a small Client Component",
        "Convert the entire page to a Client Component",
        "Use a server action for every click, no client code at all"
      ],
      correctOptionIndex: 1,
      explain: "Right call: keep the interactive boundary as small as possible.",
      mistake: "Converting the whole page throws away every Server Component benefit."
    },
    {
      pathSlug: 'p2',
      topicName: 'System Design',
      difficulty: 'easy',
      scenario: "Your API is getting hammered by one user's misbehaving script. What's the first thing you add?",
      options: [
        "A bigger server",
        "Rate limiting per user/IP",
        "A CAPTCHA on every request",
        "Nothing — scale horizontally instead"
      ],
      correctOptionIndex: 1,
      explain: "Right call: rate limiting is the standard first line of defense.",
      mistake: "Adding a bigger server treats the symptom at high cost rather than the cause."
    }
  ];

  for (const pq of practiceQuestions) {
    const cpId = pathMap.get(pq.pathSlug);
    if (!cpId) continue;

    const topicId = topicMap.get(pq.topicName) || null;
    await prisma.practiceQuestion.create({
      data: {
        careerPathId: cpId,
        topicId,
        topicName: pq.topicName,
        difficulty: pq.difficulty,
        scenario: pq.scenario,
        options: pq.options,
        correctOptionIndex: pq.correctOptionIndex,
        explain: pq.explain,
        mistake: pq.mistake,
      }
    });
  }
  console.log(`[Seed] Seeded Practice Questions.`);

  // 7. Seed Assessment Configuration & Questions
  for (const [pSlug, cpId] of pathMap.entries()) {
    const config = await prisma.assessmentConfiguration.upsert({
      where: { careerPathId_version: { careerPathId: cpId, version: 1 } },
      update: {},
      create: {
        careerPathId: cpId,
        version: 1,
        timeLimitSeconds: 900,
        secondsPerQuestion: 90,
        passingScorePercentage: 70,
        totalQuestions: 5,
        cooldownHours: 24,
        maxAttempts: 10,
        isPublished: true,
      }
    });

    // Add exam questions
    const examQuestions = [
      {
        scenario: "You convert a .js file to .ts and get 40 type errors on an old API object. What is the production-grade approach?",
        options: ["Use // @ts-ignore", "Disable strict mode", "Define interface and type the boundary", "Revert to .js"],
        correctOptionIndex: 2,
        topicName: 'TypeScript',
        explain: "Typing the boundary isolates runtime errors without compromising type safety."
      },
      {
        scenario: "When should an App Router component be marked with 'use client'?",
        options: ["Always for any React component", "Only when using useState, useEffect, or browser event listeners", "Never in Next.js 14", "For all data-fetching components"],
        correctOptionIndex: 1,
        topicName: 'Next.js',
        explain: "'use client' is necessary only when using browser lifecycle hooks or event listeners."
      },
      {
        scenario: "Lighthouse flags an LCP of 4.2 seconds on a landing page hero image. Which is the highest-impact initial fix?",
        options: ["Add more JS to lazy load it", "Compress, preload, and serve modern WebP/AVIF format", "Switch to CSR", "Convert to base64 inline string"],
        correctOptionIndex: 1,
        topicName: 'Performance',
        explain: "Optimizing the hero image format and preloading directly lowers LCP without JS execution overhead."
      },
      {
        scenario: "Your API receives repeated burst requests from an automated scraper. What should be implemented first?",
        options: ["Upgrade DB CPU", "Token bucket rate limiting middleware with Redis", "Delete user accounts", "Disable public endpoints"],
        correctOptionIndex: 1,
        topicName: 'System Design',
        explain: "Token bucket or sliding window rate limiting prevents resource exhaustion."
      },
      {
        scenario: "What is the primary advantage of Tailwind CSS utility classes over traditional monolithic CSS files?",
        options: ["Generates larger stylesheets", "Co-locates styles with markup and purges unused styles in build time", "Requires jQuery", "Only works on desktop"],
        correctOptionIndex: 1,
        topicName: 'Tailwind',
        explain: "Tailwind purges unused CSS resulting in tiny static bundles and eliminates naming conflicts."
      }
    ];

    for (const eq of examQuestions) {
      const topicId = topicMap.get(eq.topicName) || null;
      await prisma.assessmentQuestion.create({
        data: {
          configId: config.id,
          topicId,
          topicName: eq.topicName,
          scenario: eq.scenario,
          options: eq.options,
          correctOptionIndex: eq.correctOptionIndex,
          explain: eq.explain,
          difficulty: 'medium',
          version: 1,
        }
      });
    }
  }
  console.log('[Seed] Seeded Assessment Configurations & Questions.');

  // 8. Seed ATS Scoring Configurations & Rules
  for (const [pSlug, cpId] of pathMap.entries()) {
    const atsConfig = await prisma.aTSScoringConfiguration.upsert({
      where: { careerPathId_version: { careerPathId: cpId, version: 1 } },
      update: {},
      create: {
        careerPathId: cpId,
        version: 1,
        name: `ATS Scoring Engine V1 - ${pSlug.toUpperCase()}`,
        status: 'PUBLISHED',
        baseScore: 60,
        maxScore: 96,
      }
    });

    const rules = [
      {
        ruleName: 'Profile Biography Present',
        category: 'completeness',
        ruleDSL: { field: 'bio', op: 'exists', value: true },
        points: 4,
        maxContribution: 4,
        priority: 1
      },
      {
        ruleName: 'Professional Title Defined',
        category: 'completeness',
        ruleDSL: { field: 'title', op: 'exists', value: true },
        points: 3,
        maxContribution: 3,
        priority: 2
      },
      {
        ruleName: 'Relevant Work Experience Records',
        category: 'experience',
        ruleDSL: { field: 'experienceYears', op: 'gte', value: 1 },
        points: 5,
        maxContribution: 5,
        priority: 3
      },
      {
        ruleName: 'Core Path Skill Match',
        category: 'skills',
        ruleDSL: { field: 'skills', op: 'containsAny', value: ['Next.js', 'TypeScript', 'React', 'Node.js'] },
        points: 12,
        maxContribution: 16,
        priority: 4
      },
      {
        ruleName: 'Modern Architecture Skills (RSC / GenAI)',
        category: 'skills',
        ruleDSL: { field: 'skills', op: 'containsAny', value: ['React Server Components', 'GenAI Integration', 'System Design'] },
        points: 8,
        maxContribution: 10,
        priority: 5
      },
      {
        ruleName: 'Live Resume Upload Attached',
        category: 'formatting',
        ruleDSL: { field: 'hasResumeUrl', op: 'eq', value: true },
        points: 4,
        maxContribution: 4,
        priority: 6
      }
    ];

    for (const r of rules) {
      await prisma.aTSScoringRule.create({
        data: {
          configId: atsConfig.id,
          ruleName: r.ruleName,
          category: r.category,
          ruleDSL: r.ruleDSL,
          points: r.points,
          maxContribution: r.maxContribution,
          priority: r.priority,
          isEnabled: true,
        }
      });
    }
  }
  console.log('[Seed] Seeded ATS Scoring Configurations and Safe Rule DSLs.');

  // 9. Seed Readiness Configuration & Bands
  for (const [pSlug, cpId] of pathMap.entries()) {
    const rConfig = await prisma.readinessConfiguration.upsert({
      where: { careerPathId_version: { careerPathId: cpId, version: 1 } },
      update: {},
      create: {
        careerPathId: cpId,
        version: 1,
        atsWeight: 0.40,
        assessmentWeight: 0.60,
        testPendingWeight: 0.85,
        isPublished: true,
      }
    });

    const bands = [
      {
        minScore: 75,
        maxScore: 100,
        bandClass: 'good',
        statusLabel: 'Job Ready',
        percentileBenchmark: 90,
        clientShortlistProbability: 'Top 15% · High Shortlist Match',
        certificateEligible: true,
        leadAccessGranted: true,
        recommendedActions: ['Apply to Verified Client Leads', 'Share LucoHire Credential on LinkedIn']
      },
      {
        minScore: 50,
        maxScore: 74,
        bandClass: 'mid',
        statusLabel: 'Nearly Ready',
        percentileBenchmark: 65,
        clientShortlistProbability: 'Fast-Track Recommended',
        certificateEligible: false,
        leadAccessGranted: true,
        recommendedActions: ['Complete Padhaao Quick-Win Chapters', 'Retake Assessment targeting 75%+']
      },
      {
        minScore: 0,
        maxScore: 49,
        bandClass: 'low',
        statusLabel: 'Foundation Needed',
        percentileBenchmark: 35,
        clientShortlistProbability: 'Dedicated Prep Required',
        certificateEligible: false,
        leadAccessGranted: false,
        recommendedActions: ['Follow 30-Day Closing Plan', 'Review Git & REST API fundamentals']
      }
    ];

    for (const b of bands) {
      await prisma.readinessBand.create({
        data: {
          configId: rConfig.id,
          ...b
        }
      });
    }
  }
  console.log('[Seed] Seeded Readiness Configurations and Bands.');

  // 10. Seed Lead Eligibility Rule
  await prisma.leadEligibilityRule.upsert({
    where: { category: 'all' },
    update: { minAtsScore: 60, minAssessmentScore: 70, requireCertificate: false, isActive: true },
    create: { category: 'all', minAtsScore: 60, minAssessmentScore: 70, requireCertificate: false, isActive: true },
  });
  console.log('[Seed] Seeded Lead Eligibility Rules.');

  console.log('[Seed] Resume Journey dynamic database seeding complete!');
}

seedResumeJourney()
  .catch((e) => {
    console.error('[Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
