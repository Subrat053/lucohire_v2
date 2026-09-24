// Step 4: Test Karo Assessment Datasets
export const TEST_QUESTION_BANK = {
  p1:{ label:"Fast Track", topic:"TypeScript / Next.js / Tailwind", questions:[
    { topic:"TypeScript", scenario:"You convert a .js file to .ts and suddenly get 40 type errors on an old API-response object. What's the right first move?",
      options:["Add // @ts-nocheck to the file so it compiles","Set strict:false for the whole project","Define a proper interface for the API response and fix errors from there","Rename the file back to .js"],
      correct:2, explain:"Define the real shape of the data first. Turning off strict mode or suppressing errors hides the exact bugs TypeScript exists to catch." },
    { topic:"Next.js", scenario:"You're building a product page that needs live cart state but also SEO-friendly product details. How do you split the components?",
      options:["Make the whole page a Client Component for simplicity","Server Component for product details, Client Component for the cart widget","Client Component for everything, fetch data with useEffect","Server Component for everything, no client interactivity"],
      correct:1, explain:"Server Components for static/SEO content, Client Components only where interactivity is needed." },
    { topic:"Tailwind", scenario:"A teammate wants a one-off gradient button used nowhere else in the app. Utility classes or a custom CSS file?",
      options:["Always write custom CSS for anything non-trivial","Utility classes inline — that's what Tailwind is for, even for one-off styles","Use Bootstrap instead","Inline style attribute with hardcoded hex values"],
      correct:1, explain:"Tailwind's whole model is composing utilities even for one-offs." }
  ], extra:[
    { topic:"TypeScript", scenario:"You keep typing a value as `any` just to stop the compiler from complaining. What's the safer alternative?",
      options:["Keep using any, it's faster to ship","Type it as unknown and narrow it before use","Delete the type entirely","Wrap every access in try/catch instead"],
      correct:1, explain:"unknown forces you to narrow the type before using it — any silently disables type checking altogether." },
    { topic:"Next.js", scenario:"A product listing page needs fresh data on every request, but a blog page can be built once and reused. How do you fetch data for each?",
      options:["Use client-side useEffect for both","Server-render the listing per request; statically generate the blog page at build time","Statically generate both and never update them","Fetch both on the client after page load"],
      correct:1, explain:"Match the fetching strategy to how often the data actually changes — per-request vs build-time." },
    { topic:"Tailwind", scenario:"Your layout looks perfect on desktop but breaks on phones. What's the idiomatic Tailwind fix?",
      options:["Write a separate mobile.css file","Add responsive prefixes like sm: and md: to adjust utilities per breakpoint","Force a fixed pixel width on the container","Disable the layout on small screens"],
      correct:1, explain:"Tailwind's breakpoint prefixes are built exactly for adjusting the same markup across screen sizes." }
  ]},
  p2:{ label:"Most Popular", topic:"React Server Components / System Design / Performance", questions:[
    { topic:"Server Components", scenario:"A Server Component needs to respond to a button click. What do you do?",
      options:["Add onClick directly to the Server Component","Move just that interactive piece into a small Client Component","Convert the entire page to a Client Component","Use a server action for every click, no client code at all"],
      correct:1, explain:"Keep the interactive boundary as small as possible." },
    { topic:"System Design", scenario:"Your API is getting hammered by one user's misbehaving script. What's the first thing you add?",
      options:["A bigger server","Rate limiting per user/IP","A CAPTCHA on every request","Nothing — scale horizontally instead"],
      correct:1, explain:"Rate limiting is the standard first line of defense." },
    { topic:"Performance", scenario:"Lighthouse flags a poor LCP score on your landing page. The hero image is the largest element. First fix?",
      options:["Compress and preload the hero image, serve modern formats (webp/avif)","Add more JavaScript to lazy-load everything","Switch the whole site to client-side rendering","Ignore it, LCP doesn't affect ranking"],
      correct:0, explain:"LCP is almost always fixed at the image layer first." }
  ], extra:[
    { topic:"Server Components", scenario:"A Server Component needs data from your database to render a product page. Where should that fetch happen?",
      options:["Directly inside the Server Component, awaited before render","In a useEffect after the page loads","Through a client-side API call only","It can't fetch data at all"],
      correct:0, explain:"Server Components can fetch directly on the server — no client round trip needed for initial render." },
    { topic:"System Design", scenario:"Your site serves the same images and CSS to users worldwide, and load times vary a lot by region. What's the standard fix?",
      options:["Add more application servers","Put static assets behind a CDN so they're served from a location near the user","Compress the database instead","Tell users to clear their cache"],
      correct:1, explain:"A CDN caches static assets at edge locations close to users — the standard fix for geography-driven latency." },
    { topic:"Performance", scenario:"Your JS bundle is 2MB and most of it is a charting library only used on one settings page. What's the fix?",
      options:["Ship it in the main bundle, 2MB is fine","Code-split so the charting library only loads when that page is visited","Remove charts from the product entirely","Minify the whole bundle harder and stop there"],
      correct:1, explain:"Code-splitting keeps rarely-used, heavy dependencies out of the critical path for everyone else." }
  ]},
  p3:{ label:"High Salary", topic:"System Design / GenAI / DSA Patterns", questions:[
    { topic:"System Design (deep)", scenario:"You need to show near-real-time notification counts to 2 million users without hammering the DB. What's the standard approach?",
      options:["Query the DB directly on every page load","Cache counts in Redis, update via events, poll or use websockets for delivery","Email everyone instead of in-app notifications","Store counts in a spreadsheet"],
      correct:1, explain:"Cache + event-driven updates is the textbook senior-level answer." },
    { topic:"GenAI Integration", scenario:"You need an AI feature that answers questions using your company's private docs, which change weekly. Fine-tune a model, or use RAG?",
      options:["Fine-tune a model every week","RAG — retrieve relevant docs at query time and feed them to the model","Hardcode all the answers manually","Neither — this can't be done"],
      correct:1, explain:"RAG is built exactly for fast-changing knowledge — no retraining needed." },
    { topic:"DSA Patterns", scenario:"You need to find the longest substring without repeating characters — what pattern fits?",
      options:["Brute force, check every substring","Sliding window with a set/map","Sort the string first","Recursion with memoization on characters"],
      correct:1, explain:"Sliding window is the standard O(n) pattern here." }
  ], extra:[
    { topic:"System Design (deep)", scenario:"Traffic to your API has grown 10x and one server can't keep up. What's the standard next step before a full rearchitecture?",
      options:["Buy a much bigger single server and hope it lasts","Add a load balancer and run multiple instances of the same service","Turn off logging to save resources","Ask users to make fewer requests"],
      correct:1, explain:"Horizontal scaling behind a load balancer is the standard first move — vertical scaling alone hits a ceiling fast." },
    { topic:"GenAI Integration", scenario:"Your AI support bot can be tricked into ignoring its instructions if a user pastes certain text into the chat. What's this called, and what's a mitigation?",
      options:["A bug, unrelated to AI — just add more try/catch","Prompt injection — validate/sanitize input and constrain what the model is allowed to act on","Normal AI behavior, no fix needed","Fixed automatically by using a bigger model"],
      correct:1, explain:"Prompt injection is a known class of attack on LLM apps — mitigated with input handling and tight action boundaries, not just a bigger model." },
    { topic:"DSA Patterns", scenario:"You need to check if a sorted array contains a pair that sums to a target value, in better than O(n²). What pattern fits?",
      options:["Nested loops checking every pair","Two pointers, one from each end, moving inward","Sort it again first","Recursion trying every subset"],
      correct:1, explain:"Two pointers on a sorted array solves this in O(n), the classic pattern for sorted-pair problems." }
  ]},
  p4:{ label:"Future Safe", topic:"AI Tools / Full-stack / Security", questions:[
    { topic:"AI Tools", scenario:"Copilot suggests a full function for handling payments. What should you do before merging it?",
      options:["Merge it directly, AI tools are reliable enough now","Read and test it like any other code — AI-suggested code still needs review","Reject all AI suggestions on principle","Ask Copilot to write the tests too and merge both blindly"],
      correct:1, explain:"Treat AI-generated code as a first draft — always reviewed, especially near money or security." },
    { topic:"Full-stack", scenario:"Your frontend-only project needs to store user signups. What's the minimum you need to add?",
      options:["Nothing, store it in the browser","A backend endpoint plus a database to persist the data","A spreadsheet emailed to yourself","Local state only, refresh loses it and that's fine"],
      correct:1, explain:"Any real signup flow needs a server + database." },
    { topic:"Security", scenario:"You render user-submitted comments directly as HTML on the page. What's the risk, and the fix?",
      options:["No risk, comments are just text","XSS — sanitize or escape user input before rendering it as HTML","Risk only if the user is an admin","Fixed automatically by the browser"],
      correct:1, explain:"Classic XSS opening — always escape or sanitize user content before rendering as HTML." }
  ], extra:[
    { topic:"AI Tools", scenario:"An AI assistant confidently gives you a library function name that doesn't actually exist. What should you do before using it?",
      options:["Trust it, AI wouldn't make that up","Check the official docs or package registry to confirm the function exists","Use it anyway and fix errors in production","Assume the AI meant a different, similar-sounding function"],
      correct:1, explain:"AI hallucination of APIs is common — always verify against real documentation before relying on it." },
    { topic:"Full-stack", scenario:"Where should your database password and API keys live in a full-stack app?",
      options:["Hardcoded directly in the frontend JS file","In environment variables, kept out of the client bundle and version control","In a public GitHub gist for easy access","In the page's HTML comments"],
      correct:1, explain:"Secrets belong in environment variables on the server — never shipped to the browser or committed to source control." },
    { topic:"Security", scenario:"You're storing user passwords in your database. What's the right approach?",
      options:["Store them as plain text for easy lookup","Hash them with a strong, salted algorithm like bcrypt","Encrypt them with a key you also store in the same database","Email users their password back if they forget it"],
      correct:1, explain:"Passwords should be hashed and salted, never stored or transmitted in plain text." }
  ]}
};

export const SECONDS_PER_QUESTION = 90;
