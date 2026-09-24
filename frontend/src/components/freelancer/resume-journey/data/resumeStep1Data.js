// Step 1: Resume Check Master Datasets

export const OUTDATED=[
  {skill:"jQuery", jobs:"1,140 jobs", trend:"-28%", action:"Resume se hatao"},
  {skill:"PHP Core (without Laravel)", jobs:"2,300 jobs", trend:"-19%", action:"Hatao, Laravel likho agar aata hai toh"},
  {skill:"Bootstrap only", jobs:"1,800 jobs", trend:"-22%", action:"Hatao, Tailwind likho"}
];
export const FADING=[
  {skill:"JavaScript (vanilla only)", jobs:"8,400 jobs", trend:"-11%", note:"JS aana chahiye par sirf JS se kaam nahi chalega, framework chahiye"},
  {skill:"CSS only (no Tailwind)", jobs:"3,200 jobs", trend:"-14%", note:"CSS ke saath Tailwind/Next jodna padega"},
  {skill:"WordPress Custom", jobs:"2,900 jobs", trend:"-9%", note:"Sirf ispe mat raho"}
];
export const RISING=[
  {skill:"Next.js 14 / App Router", jobs:"6,200 jobs", trend:"+41%", salary:"14-18 LPA"},
  {skill:"TypeScript", jobs:"12,400 jobs", trend:"+33%", salary:"16-22 LPA"},
  {skill:"GenAI Integration (LLM APIs, RAG)", jobs:"4,100 jobs", trend:"+340%", salary:"22-30 LPA"},
  {skill:"React Server Components", jobs:"2,800 jobs", trend:"+58%", salary:"15-20 LPA"}
];
/* one quick-wins set per path, so the "3 quick wins" section can switch to match whichever path is selected in Choose your path */
export const PATH_WINS={
  p1:[
    {n:"1", skill:"TypeScript", time:"6 hours", jobs:"+7,200 unlock", line:"Migrated 3 components to TypeScript"},
    {n:"2", skill:"Next.js", time:"1 day", jobs:"+3,100 unlock", line:"Built e-commerce with Next.js, SSR 40% faster"},
    {n:"3", skill:"Tailwind CSS", time:"4 hours", jobs:"+2,400 unlock", line:"Styled UI with Tailwind, reduced CSS by 60%"}
  ],
  p2:[
    {n:"1", skill:"React Server Components", time:"1 day", jobs:"2,800 jobs · +58%", line:"Rebuilt a data-heavy page with React Server Components"},
    {n:"2", skill:"System Design Basics", time:"50 min", jobs:"9,100 jobs at 15 LPA+", line:"Designed scalable notification flow for 10k users"},
    {n:"3", skill:"Performance Optimization", time:"35 min", jobs:"5,600 jobs at 15 LPA+", line:"Improved LCP from 3.2s to 1.4s"}
  ],
  p3:[
    {n:"1", skill:"GenAI Integration (LLM APIs, RAG)", time:"1 day", jobs:"4,100 jobs · +340%", line:"Integrated OpenAI API for auto-summary, saved 2 hrs/week per user"},
    {n:"2", skill:"System Design Deep", time:"2 days", jobs:"15-25 LPA · senior-tag roles", line:"Designed a horizontally-scalable system to handle 1M+ users"},
    {n:"3", skill:"DSA Patterns for frontend", time:"3 days", jobs:"Core interview round", line:"Practiced pattern-based problems for Razorpay/CRED/Swiggy-type rounds"}
  ],
  p4:[
    {n:"1", skill:"AI Tools (Cursor / Copilot)", time:"2 hours", jobs:"2026 roadmap priority", line:"Used AI-assisted tooling (Cursor/Copilot) to ship features faster"},
    {n:"2", skill:"Full-stack basics (Node + DB)", time:"1 day", jobs:"2028–30 roadmap priority", line:"Built a full-stack feature end-to-end with Node.js and a database"},
    {n:"3", skill:"Web Performance & Security", time:"4 hours", jobs:"2027 roadmap priority", line:"Audited and fixed core web vitals and key security gaps"}
  ]
};
let activeWinsPath='p1';
export const SALARY=[
  {title:"System Design Basics", jobs:"9,100 jobs at 15 LPA+", add:"Designed scalable notification flow for 10k users"},
  {title:"Performance Optimization", jobs:"5,600 jobs at 15 LPA+", add:"Improved LCP from 3.2s to 1.4s"},
  {title:"GenAI Feature", jobs:"4,100 jobs at 15 LPA+", add:"Integrated OpenAI API for auto-summary, saved 2 hrs/week per user"}
];
export const FIXES=[
  {tag:"Rewrite", before:"Worked on the company website using JavaScript and CSS.",
   after:"Rebuilt the company's marketing site in JavaScript, improving mobile load time by 35% for ~50K monthly visitors.",
   why:"Numbers + scale turn a duty into proof — ATS keyword-scoring and recruiters both reward specifics over descriptions."},
  {tag:"Rewrite", before:"Responsible for maintaining and updating web pages.",
   after:"Shipped weekly updates across 12+ pages using WordPress and custom PHP, cutting turnaround from 2 days to same-day.",
   why:"\"Responsible for\" reads passive. \"Shipped… cutting turnaround\" reads like impact."},
  {tag:"Remove", before:"\"References available upon request\" — sitting at the very bottom, in your most valuable resume real estate.",
   after:"Removed. Nobody calls references off a resume anymore — recruiters ask separately if they need them.",
   why:"That line is currently occupying the exact spot where a GitHub or portfolio link belongs."},
  {tag:"Add", before:"No links section — a recruiter has to Google you to find your work.",
   after:"Add one line under your name: GitHub · Portfolio · LinkedIn — three clickable links, nothing else.",
   why:"For dev roles, a live GitHub is often checked before the resume is read past line one."},
  {tag:"Reorder", before:"Education section placed above Experience — with 2+ years of work-ex already.",
   after:"Move Experience to the top. Education-first reads \"fresher\" to both ATS parsing and human recruiters.",
   why:"Section order isn't cosmetic — ATS often weighs whichever section it parses first more heavily."}
];
export const ROADMAP=[
  {year:"2026", title:"AI Tools (Cursor, Copilot)", note:"Nahi seekha toh junior bhi aage nikal jayega"},
  {year:"2027", title:"Performance + Security", note:"Har company maangegi"},
  {year:"2028–30", title:"Full-stack + AI", note:"Sirf frontend se kaam nahi chalega"}
];
export const PATHS=[
  {id:"p1", title:"Abhi 3-6 LPA job chahiye", sub:"0-30 din me calls badhani hai", badge:"Fast Track", recommended:true,
   syllabus:["TypeScript (6 hrs)","Next.js (1 day)","Tailwind (4 hrs)"],
   kya:"+12,700 jobs unlock · Resume score 64→82 · Expected calls 3x",
   oneLiner:"TypeScript + Next.js + Tailwind → 3x calls", lessons:3, jobs:12700},
  {id:"p2", title:"8-12 LPA pe jump karna hai", sub:"2-3 mahine • product me jana hai", badge:"Most Popular",
   syllabus:["Advanced React (Server Components)","System Design Basics","Performance Optimization"],
   kya:"Product companies me shortlist · Avg 10-14 LPA · System Design questions clear",
   oneLiner:"RSC + System Design → Product companies shortlist", lessons:6, jobs:9400},
  {id:"p3", title:"15 LPA+ High Paid banna hai", sub:"Senior tag • Top startups", badge:"High Salary",
   syllabus:["System Design Deep","GenAI Integration (LLM APIs, RAG)","DSA Patterns for frontend"],
   kya:"Razorpay, CRED, Swiggy type companies · 15-25 LPA · Senior tag",
   oneLiner:"System Design + GenAI → 15-25 LPA", lessons:8, jobs:4100},
  {id:"p4", title:"2030 tak job secure karni hai", sub:"AI replace na kare", badge:"Future Safe",
   syllabus:["AI Tools (Cursor / Copilot)","Full-stack basics (Node + DB)","Web Performance & Security"],
   kya:"AI replace nahi karega · Full-stack + AI = safe for next 5 years",
   oneLiner:"AI Tools + Full-stack → 5 saal safe", lessons:10, jobs:6800}
];


