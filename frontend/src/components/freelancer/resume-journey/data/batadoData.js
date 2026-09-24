// Step 5: Bata Do Readiness Verdict Datasets

export const PATH_LABELS = { p1: "Fast Track", p2: "Most Popular", p3: "High Salary", p4: "Future Safe" };

export const RESUME_BREAKDOWN = { ats: 72, keyword: 54, depth: 61, formatting: 88 };

export const ROLE_BY_PATH = {
  p1: { role: 'Junior Frontend Developer', pay: '3–6 LPA' },
  p2: { role: 'Frontend Developer', pay: '6–10 LPA' },
  p3: { role: 'Senior Frontend Engineer', pay: '15 LPA+' },
  p4: { role: 'Full-stack Developer', pay: 'Future-safe roles' }
};

export const PLAN_B_BY_PATH = {
  p1: { role: 'Frontend Developer', context: 'service-based companies', pay: '2.5–4.5 LPA',
       why: 'Roughly 10x more open roles than product companies, and a far lower technical bar — your current JS/HTML/CSS already clears it.' },
  p2: { role: 'Frontend Developer', context: 'service-based companies', pay: '4–6 LPA',
       why: 'Skips the portfolio and system-design bar product companies expect. Your resume already clears this bar.' },
  p3: { role: 'Frontend Developer', context: 'mid-level, product companies', pay: '6–10 LPA',
       why: 'One rung below your target, with no system-design gate — your Quick Wins + Future-Proof modules alone get you here.' },
  p4: { role: 'Frontend Developer', context: 'frontend-only, no full-stack ask', pay: '6–10 LPA',
       why: 'If backend / database questions feel heavy, drop the full-stack angle — frontend roles paying the same bracket exist without that requirement.' }
};

export const RESUME_GOOD = [
  'Formatting — 88/100, clean single-column layout parses cleanly through ATS',
  'JavaScript & MySQL — both still strongly in demand for the roles you match'
];

export const RESUME_BAD = [
  { problem: 'Keyword match — 54/100, the single biggest score drag',
    fix: 'Name exact tools (say "MySQL", not "worked with databases") to mirror job-description language. ~15 min.' },
  { problem: 'jQuery, Bootstrap, PHP 5 syntax — fading out of new listings',
    fix: 'Pair jQuery/Bootstrap with React/Tailwind, and relabel "PHP 5" to whichever version you actually use.' }
];
