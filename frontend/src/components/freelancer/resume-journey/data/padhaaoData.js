// Step 2: Padhaao Tracks & Syllabus Datasets

export const TRACKS = {
  qw: { key:'qw', label:'Quick wins', impact:'+35% more matches',
    banner:'Closes gaps recruiters filter on right now — fastest path to more interview calls.',
    chapters:[
      { name:"Git & GitHub essentials", time:"45 min", tag:"high", tagLbl:"Critical gap",
        stat1:{v:"81%",l:"of your matched roles ask for this",dir:"down"}, stat2:{v:"0",l:"mentions on your current resume",dir:"down"},
        why:"Most companies run resumes through an ATS filter before a human ever opens them — it's literally searching for the word \"Git\" or \"GitHub.\" Zero mentions means your resume can get auto-rejected before anyone sees your actual coding ability. This isn't optional tooling knowledge; it's the #1 keyword gap on your profile right now.",
        companyWork:[
          "Every single commit you make on the job goes through Git — it's how teams avoid overwriting each other's code when 5 people touch the same file in a week.",
          "Code review happens through GitHub Pull Requests. You'll open a PR, a senior dev leaves comments, you push fixes, they approve, it merges.",
          "Almost every take-home hiring assignment today asks for a GitHub repo link, not a zipped folder emailed to HR."
        ],
        interviewQs:[
          "Walk me through your Git workflow when you find a bug that's already live in production.",
          "What's the difference between git merge and git rebase — when would you use each one?",
          "Tell me about a merge conflict you've resolved. What caused it, and how did you fix it without losing anyone's work?"
        ],
        core:[
          "Git is version control — a running history of every change ever made to a codebase, who made it, and why. Instead of files named <i>final_v2_ACTUALLY_final.zip</i>, every change is a tracked \"commit\" with a message explaining what changed.",
          "The core loop you'll use daily: <b>git add</b> (stage your changes) → <b>git commit -m \"message\"</b> (save a checkpoint) → <b>git push</b> (send it to GitHub) → <b>git pull</b> (get everyone else's latest changes). Branching lets you work on a feature (<b>git checkout -b feature-name</b>) without touching the main, working codebase — you merge it back in only once it's tested.",
          "GitHub is where the Git history lives online and where teams collaborate: Pull Requests (a request to merge your branch into main), code review comments, and Issues (bug/task tracking) all happen here."
        ],
        exampleType:"code",
        before:"final_project_v3_ACTUALLY_FINAL.zip\n// emailed to a teammate, who has no idea what changed since v2",
        after:"git commit -m \"add payment validation\"\ngit push origin feature/payment-fix\n// teammate runs \"git pull\" and gets the exact change, with full history",
        checklist:["Initialize a repo and make your first commit","Create a branch, make changes, and open a Pull Request","Resolve a merge conflict without losing either person's work","Explain git rebase vs git merge in plain English, out loud"],
        resumeLine:"Managed version control and collaborative code review using Git & GitHub across 6+ projects"
      },
      { name:"REST APIs, hands-on", time:"55 min", tag:"high", tagLbl:"Critical gap",
        stat1:{v:"92%",l:"of JS roles above your level expect this",dir:"down"}, stat2:{v:"0",l:"API integration projects on your resume",dir:"down"},
        why:"Every app you've ever used talks to a server through an API — and every frontend job past entry-level assumes you can fetch, send, and handle that data yourself, not just style a static page. This is the line between \"can build a UI\" and \"can build a working product.\"",
        companyWork:[
          "You'll fetch data from a backend (or third-party service) and render it — product listings, user profiles, live prices — this is 70% of daily frontend work.",
          "You'll send data back: form submissions, login requests, file uploads — all as API calls with proper error handling when the server is slow or down.",
          "You'll read API documentation you didn't write, often incomplete or outdated, and figure out the right request format anyway — a skill in itself."
        ],
        interviewQs:[
          "How do you handle an API call that fails or times out — walk me through your error handling?",
          "What's the difference between GET, POST, PUT and DELETE, and when do you use each?",
          "How would you avoid making the same API call twice if a user double-clicks a button?"
        ],
        core:[
          "A REST API is a set of URLs a server exposes so your app can ask for data (<b>GET</b>), create something new (<b>POST</b>), update it (<b>PUT/PATCH</b>), or delete it (<b>DELETE</b>). You call it, the server sends back data — usually in JSON format — and your code decides what to render.",
          "In practice this means using <b>fetch()</b> or a library like <b>axios</b>, always wrapped in error handling: what happens if the network drops, if the server returns a 404, if the response takes 8 seconds? A junior developer forgets this. A hireable one plans for it every time.",
          "You'll also deal with authentication headers (sending a login token with each request) and loading states — showing a spinner while data is in flight instead of a blank, broken-looking screen."
        ],
        exampleType:"code",
        before:"fetch('/api/user').then(res => res.json()).then(data => setUser(data))\n// no error handling — one bad response and the whole page silently breaks",
        after:"fetch('/api/user')\n  .then(res => { if(!res.ok) throw new Error('Failed'); return res.json(); })\n  .then(data => setUser(data))\n  .catch(err => setError('Could not load your profile'))\n// user sees a real message instead of a frozen screen",
        checklist:["Fetch data from a public API and render it on screen","Handle a failed request with a visible, useful error message","Send form data to a server with a POST request","Explain the difference between GET and POST in one sentence"],
        resumeLine:"Integrated REST APIs for data fetching, form submission, and authentication across production features"
      },
      { name:"React fundamentals", time:"1 hr 15 min", tag:"mid", tagLbl:"High demand",
        stat1:{v:"+18%",l:"React demand vs last quarter",dir:"up"}, stat2:{v:"jQuery",l:"experience listed, but React not",dir:"down"},
        why:"You already know jQuery — React is the direct, modern upgrade path recruiters search for by name. Companies aren't hiring new jQuery projects anymore; they're maintaining old ones while building new features in React. Bridging this gap is the single fastest way to widen how many job posts you even qualify for.",
        companyWork:[
          "You'll break a page into reusable components (a button, a card, a form) instead of copy-pasting the same HTML in five places.",
          "You'll manage \"state\" — data that changes over time, like a shopping cart count or a toggled menu — and make the UI update automatically when it changes.",
          "You'll work inside an existing component library or design system, following patterns a senior dev already set up, not building from a blank file."
        ],
        interviewQs:[
          "What's the difference between props and state in React?",
          "Why would you use useEffect, and what's a common mistake people make with it?",
          "How does React know when to re-render a component?"
        ],
        core:[
          "React lets you build UI out of small, reusable <b>components</b> — a function that returns what should appear on screen. Instead of directly editing the page (like jQuery's <b>$('.button').text('Clicked')</b>), you update a piece of <b>state</b>, and React re-renders the affected part automatically.",
          "<b>Props</b> are how a parent component passes data down to a child (like passing a product's name and price into a ProductCard component). <b>State</b> (via <b>useState</b>) is data a component manages and can change itself — like whether a dropdown is open.",
          "<b>useEffect</b> handles anything that happens \"outside\" the render — fetching data when a component loads, or updating the page title. The most common beginner mistake: forgetting the dependency array, causing an API call to fire in an infinite loop."
        ],
        exampleType:"code",
        before:"$('#cart-count').text(cartItems.length)\n// you manually find the element and update it every single time the cart changes",
        after:"export const [cartItems, setCartItems] = useState([]);\n<span>{cartItems.length}</span>\n// update the state once — React re-renders the count everywhere it's used, automatically",
        checklist:["Build a component that manages its own state (e.g. a counter or toggle)","Pass data from a parent component to a child using props","Fetch data inside useEffect and handle the loading state","Explain, out loud, why React re-renders when state changes"],
        resumeLine:"Migrated legacy jQuery UI modules to React, reducing DOM-manipulation bugs and duplicate code"
      }
    ]},
  fp: { key:'fp', label:'Future-proof', impact:'Relevant past 2029',
    banner:'Keeps you employable as jQuery-era, plain-JS stacks phase out of new job listings.',
    chapters:[
      { name:"TypeScript for JS developers", time:"1 hr", tag:"future", tagLbl:"Future-proof",
        stat1:{v:"-19%",l:"plain-JS-only listings vs last year",dir:"down"}, stat2:{v:"2,600+",l:"open roles asking for TS by name",dir:"up"},
        why:"Listings asking for plain JavaScript are shrinking year over year as teams standardize on TypeScript to catch bugs before code ships. It's not a new language — it's the JavaScript you already know, plus a type system that catches mistakes while you type instead of after a user finds them in production.",
        companyWork:[
          "You'll define the \"shape\" of data your functions expect, so a teammate calling your function gets an error in their editor, not a crash in production.",
          "Most companies past a certain size require TypeScript for any new file — it's a baseline hiring filter, similar to Git.",
          "You'll read type errors as part of debugging — they're not extra work, they're the compiler doing QA for you before a human has to."
        ],
        interviewQs:[
          "What's the difference between an interface and a type in TypeScript?",
          "How would you type a function that takes an array of objects and returns just their names?",
          "What does the 'any' type mean, and why do senior engineers avoid using it?"
        ],
        core:[
          "TypeScript adds a <b>type system</b> on top of JavaScript. Instead of a function silently accepting whatever you throw at it, you declare what it expects — and your editor flags a mismatch immediately, not three files later when the app crashes.",
          "The most common real gain: catching the classic JS bug where a number and a string get mixed up (<b>\"2\" + 3</b> = <b>\"23\"</b>, not 5). TypeScript flags this the moment you write it.",
          "You don't need to type everything perfectly on day one — most teams migrate gradually, file by file. Knowing enough to add basic types to functions and objects is what almost every job listing actually expects at your level."
        ],
        exampleType:"code",
        before:"function add(a, b) { return a + b }\n// works fine, until someone calls add(\"2\", 3) and gets \"23\" instead of 5",
        after:"function add(a: number, b: number): number { return a + b }\n// the mistake gets caught in your editor, before you ever run the code",
        checklist:["Add basic types to a function's parameters and return value","Define an interface for a data object (e.g. a User)","Fix a type error your editor flags, and explain why it happened","Explain in one sentence why 'any' defeats the point of TypeScript"],
        resumeLine:"Migrated core components to TypeScript, reducing runtime type errors across the codebase"
      },
      { name:"Cloud basics (AWS)", time:"1 hr 10 min", tag:"future", tagLbl:"Future-proof",
        stat1:{v:"2028–30",l:"roadmap year this becomes standard",dir:"up"}, stat2:{v:"almost none",l:"mid-level roles skip this in listings",dir:"down"},
        why:"Almost no mid-level role in your field skips a cloud mention anymore — even frontend-focused listings now expect you to understand where your app actually runs. You don't need to be a DevOps engineer; you need to know enough to not be lost when a teammate mentions S3, EC2, or a deployment pipeline.",
        companyWork:[
          "You'll deploy a static site or app to cloud hosting (S3 + CloudFront, or similar) instead of a shared FTP server.",
          "You'll understand environment variables and secrets — how an app knows it's running in \"production\" vs \"development\" without hardcoding passwords into code.",
          "You'll read basic cloud cost/usage dashboards well enough to flag when something looks wrong, even if a dedicated infra person owns the fix."
        ],
        interviewQs:[
          "What's the difference between staging and production environments, and why do teams keep them separate?",
          "How would you securely store an API key your app needs, without putting it directly in your code?",
          "What is S3 used for, in plain terms?"
        ],
        core:[
          "\"The cloud\" is just someone else's computer, rented by the hour or by usage — AWS (Amazon Web Services) is the largest provider. Instead of a physical server in an office, your app's code and data live on Amazon's infrastructure, accessible from anywhere.",
          "The handful of services you'll actually touch at your level: <b>S3</b> (file/object storage — images, static site files), <b>EC2</b> (a virtual server your app can run on), and <b>environment variables</b> (a safe way to store secrets like API keys outside your actual code).",
          "The mental model that matters most for interviews: separating <b>staging</b> (a safe copy for testing) from <b>production</b> (what real users see) — so a broken deploy never directly hits paying customers."
        ],
        exampleType:"code",
        before:"export const API_KEY = \"sk_live_51H8x...\";\n// hardcoded directly in the source file — visible to anyone with repo access",
        after:"export const API_KEY = process.env.STRIPE_SECRET_KEY;\n// pulled from an environment variable, never committed to the codebase",
        checklist:["Explain what S3 and EC2 each do, in one sentence","Set up an environment variable and read it in your app","Explain the difference between staging and production","Deploy a simple static page to cloud hosting"],
        resumeLine:"Deployed and maintained application infrastructure using core AWS services (S3, EC2)"
      },
      { name:"CI/CD basics", time:"50 min", tag:"future", tagLbl:"Future-proof",
        stat1:{v:"signals",l:"you can ship on a real team, not just write code",dir:"up"}, stat2:{v:"most",l:"teams reject manual-only deploy workflows",dir:"down"},
        why:"CI/CD is the difference between \"I wrote the code\" and \"I can ship the code safely, as part of a team.\" Almost every company past a handful of engineers automates testing and deployment — knowing the basics signals you won't slow a team down when you join.",
        companyWork:[
          "Every time you push code, automated tests run before it's even allowed to merge — you'll write and maintain some of those tests.",
          "Deployments happen automatically once code merges to the main branch — no one manually uploading files to a server anymore.",
          "You'll read a failed pipeline log to figure out why your change broke the build, before asking a senior dev for help."
        ],
        interviewQs:[
          "What does CI/CD actually stand for, and what problem does each part solve?",
          "What happens in your team's pipeline when a test fails on your Pull Request?",
          "Why is automated deployment safer than manually uploading files to a server?"
        ],
        core:[
          "<b>CI (Continuous Integration)</b> means every code change is automatically tested the moment it's pushed — catching bugs within minutes, not weeks later. <b>CD (Continuous Deployment)</b> means code that passes those tests gets automatically released, without a human manually copying files to a server.",
          "In practice, this runs through a config file (like a GitHub Actions workflow) that says: on every push, run the test suite; if it passes, build the app; if the build succeeds, deploy it. You don't need to write this pipeline from scratch at your level — you need to read one, understand why it failed, and fix your code accordingly.",
          "The single most valuable interview-ready fact: manual deployment means a tired engineer at 11pm can upload the wrong file version. Automated CI/CD removes that human error entirely."
        ],
        exampleType:"prompt",
        prompt:"Practice prompt: Your Pull Request shows a red ✕ next to \"CI: failed.\" Walk through, out loud, the exact steps you'd take to find out what broke and fix it — this is what a senior dev actually watches for in your first week.",
        checklist:["Explain CI and CD as two separate concepts, in plain English","Read a failed pipeline log and identify which step failed","Explain why automated deploys reduce human error","Describe what happens, step by step, when you push code to a CI/CD-enabled repo"],
        resumeLine:"Worked within CI/CD pipelines (GitHub Actions) for automated testing and deployment"
      }
    ]},
  pm: { key:'pm', label:'Premium', impact:'40–70% higher pay band',
    banner:'What separates ₹6L roles from ₹12L+ roles at the same job title.',
    chapters:[
      { name:"System design, level 1", time:"1 hr 30 min", tag:"pay", tagLbl:"Premium skill",
        stat1:{v:"#1",l:"gate between mid-level and senior pay",dir:"up"}, stat2:{v:"live",l:"tested in the interview room, not on paper",dir:"down"},
        why:"This is the single biggest gate between mid-level and senior pay bands at the exact same job title. It's almost never assessed by reading your resume — it's tested live, in the interview room, through open-ended questions with no single right answer. This chapter ends in a practice prompt, not a resume line, because that's genuinely how it's evaluated.",
        companyWork:[
          "Senior engineers are expected to plan a feature's architecture before writing code — how data flows, what breaks under load, what to build first.",
          "You'll be asked to estimate scale: how many users, how much data, how many requests per second — and design around real numbers, not guesses.",
          "You'll trade off decisions out loud — \"a simple solution now vs a scalable one later\" — because interviewers are grading your reasoning, not a perfect diagram."
        ],
        interviewQs:[
          "Design a URL shortener — walk me through your approach.",
          "How would you design a notification system for 10 million users across 3 delivery channels (push, email, SMS)?",
          "Where would you introduce caching in a typical web app, and why there specifically?"
        ],
        core:[
          "System design interviews aren't about knowing one \"correct\" architecture — they're about a structured way of thinking: clarify requirements first (how many users? read-heavy or write-heavy?), then sketch the simplest version that works, then discuss what breaks at scale and how you'd fix it.",
          "At level 1, the concepts that come up constantly: <b>load balancing</b> (spreading traffic across multiple servers so one doesn't get overwhelmed), <b>caching</b> (storing a frequently-requested answer so you don't recompute it every time), and <b>database basics</b> (when to use a relational DB vs a simpler key-value store).",
          "The single habit that separates a strong answer from a weak one: asking clarifying questions before designing anything. \"How many users are we talking about?\" and \"Is this read-heavy or write-heavy?\" show an interviewer you think like an engineer who's shipped real systems, not memorized a diagram."
        ],
        exampleType:"prompt",
        prompt:"Practice prompt: \"Design a notification system for 10 million users across 3 delivery channels.\" Before sketching anything, write down 3 clarifying questions you'd ask the interviewer first — this is the exact level of thinking this chapter prepares you to demonstrate.",
        checklist:["Ask clarifying questions before designing anything, every time","Explain what load balancing solves, in plain English","Explain caching with one real example","Sketch a simple system on a whiteboard/paper and defend your choices out loud"],
        resumeLine:null
      },
      { name:"Cloud architecture patterns", time:"1 hr 15 min", tag:"pay", tagLbl:"Premium skill",
        stat1:{v:"rare",l:"at your current level — strong differentiator",dir:"up"}, stat2:{v:"senior",l:"tag roles specifically screen for this",dir:"up"},
        why:"This is rare among candidates at your current level, which makes it a strong differentiator rather than table stakes. Where the earlier \"Cloud basics\" chapter covered using individual services, this one is about how those services fit together into a design that survives real traffic and real failures — the kind of thinking senior-tag interviews specifically screen for.",
        companyWork:[
          "You'll design for failure — what happens if one server goes down, not just the happy path where everything works.",
          "You'll separate concerns across services (a database service, an auth service, a file-storage service) instead of one giant app doing everything.",
          "You'll make cost-aware decisions — the \"correct\" architecture on paper is sometimes the wrong one because it's needlessly expensive to run."
        ],
        interviewQs:[
          "How would you design a system so that if one server crashes, users don't notice?",
          "What's the difference between vertical and horizontal scaling, and when would you choose each?",
          "How would you architect a system to handle a 10x traffic spike during a flash sale?"
        ],
        core:[
          "<b>Horizontal scaling</b> means adding more servers to share the load; <b>vertical scaling</b> means making one server bigger/more powerful. Most modern systems favor horizontal scaling because it has no hard ceiling and tolerates individual server failures gracefully.",
          "A <b>microservices</b> pattern splits an app into independent services (auth, payments, notifications) that can be built, deployed, and scaled separately — versus a <b>monolith</b> where everything is one large, tightly-coupled application. Both are valid; interviews are testing whether you know the real trade-offs, not that microservices are automatically \"better.\"",
          "<b>Redundancy</b> — running multiple copies of a critical service — is what actually prevents a single server crash from taking your whole product down. This is the concept behind almost every \"design for 10 million users\" style question."
        ],
        exampleType:"prompt",
        prompt:"Practice prompt: \"Your app currently runs on a single server. Traffic is about to increase 10x for a flash sale. Walk through, step by step, what you'd change and why.\" Focus on trade-offs, not a single \"perfect\" answer.",
        checklist:["Explain horizontal vs vertical scaling with a real example","Explain the monolith vs microservices trade-off honestly, both ways","Explain why redundancy prevents a single point of failure","Reason out loud about cost vs scalability trade-offs, not just 'the best' option"],
        resumeLine:null
      },
      { name:"AI integration basics", time:"1 hr", tag:"pay", tagLbl:"Premium skill",
        stat1:{v:"+340%",l:"fastest-growing line item in listings this year",dir:"up"}, stat2:{v:"4,100+",l:"open roles specifically asking for this",dir:"up"},
        why:"This is the fastest-growing line item in job descriptions this year, growing far faster than any other skill on this roadmap. The bar is lower than people assume — a single well-placed API call that replaces a manual, repetitive task is exactly the kind of concrete, measurable story that makes a resume line stand out.",
        companyWork:[
          "You'll wire an LLM API call (like OpenAI's) into an existing feature — summarizing text, generating a draft reply, classifying support tickets.",
          "You'll handle the practical realities: API costs per request, response latency, and what happens when the AI's output isn't quite right.",
          "You'll be expected to know basic prompt design — how the wording of what you send the model changes the quality of what you get back."
        ],
        interviewQs:[
          "Tell me about a time you used an LLM API in a project — what problem did it actually solve?",
          "How would you handle it if an AI-generated response was factually wrong in a user-facing feature?",
          "What is RAG (Retrieval-Augmented Generation), in plain terms?"
        ],
        core:[
          "At a practical level, \"AI integration\" usually means calling an LLM (Large Language Model) API — sending it text and a set of instructions (a <b>prompt</b>), and getting generated text back. You don't need to train a model; you need to know how to use one inside a real feature.",
          "<b>RAG (Retrieval-Augmented Generation)</b> is the pattern behind most real production AI features: instead of relying only on what the model \"knows,\" you first retrieve relevant data (from your own database or documents) and feed it to the model alongside the question — so answers are grounded in your actual data, not the model's guesswork.",
          "The realistic, resume-ready version of this skill for most roles: automating one clearly repetitive task — summarizing long text, drafting a first-pass reply, or classifying incoming requests — and measuring the time it saves. That measurable outcome is what actually gets noticed."
        ],
        exampleType:"code",
        before:"Manually summarizing customer support notes into a weekly report\n// ~2 hours every week, done by hand",
        after:"One OpenAI API call auto-summarizes each ticket into 2 lines\n// same report, same accuracy, saves 2 hrs/week per person doing it",
        checklist:["Make a working API call to an LLM and handle its response","Explain RAG in one sentence, without jargon","Identify one repetitive task in a real workflow an LLM could reasonably automate","Explain the cost/latency trade-off of adding AI to a feature"],
        resumeLine:"Integrated OpenAI API to automate ticket summarization, saving ~2 hrs/week per support agent"
      }
    ]}
};
export const TRACK_ORDER=['qw','fp','pm'];

