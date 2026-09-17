const axios = require('axios');
const cheerio = require('cheerio');

const assertCrawlerEnabled = () => {
  if (String(process.env.ENABLE_CRAWLERS || '').toLowerCase() !== 'true') {
    throw new Error('Crawler execution is disabled');
  }
};

/**
 * Perform a DuckDuckGo HTML Lite search to find the domain, then probe common career paths.
 * @param {string} companyName
 * @returns {Promise<string|null>}
 */
async function findCareerPageUrl(companyName) {
  assertCrawlerEnabled();
  try {
    const query = encodeURIComponent(`${companyName} official site`);
    const { data } = await axios.post('https://lite.duckduckgo.com/lite/', `q=${query}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(data);
    let firstResult = null;

    $('a.result-url, a.result-link, td.result-snippet a').each((i, el) => {
      if (!firstResult) {
        const h = $(el).attr('href');
        if (h && !h.includes('wikipedia.org') && !h.includes('linkedin.com') && !h.includes('glassdoor.com')) {
          firstResult = h;
        }
      }
    });

    if (firstResult && firstResult.includes('uddg=')) {
      const urlParams = new URLSearchParams(firstResult.split('?')[1]);
      if (urlParams.has('uddg')) firstResult = decodeURIComponent(urlParams.get('uddg'));
    }

    if (!firstResult) {
      console.warn(`Could not find domain for ${companyName}`);
      return null;
    }

    const origin = new URL(firstResult).origin;

    const tryUrl = async (path) => {
      const url = `${origin}${path}`;
      try {
        const response = await axios.get(url, {
          timeout: 5000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml'
          }
        });
        if (response.status === 200 && typeof response.data === 'string') {
          const html = response.data.toLowerCase();
          if (!html.includes('404') && !html.includes('page not found')) return url;
        }
        return null;
      } catch (_) {
        return null;
      }
    };

    const pathsToTry = [
      '/careers', '/career', '/jobs', '/join-us', '/join',
      '/work-with-us', '/work', '/open-positions', '/openings',
      '/about/careers', '/company/careers', '/about/jobs',
      '/en/careers', '/us/careers', '/global/careers',
      '/team/careers', '/hiring', '/opportunities'
    ];

    for (const path of pathsToTry) {
      const found = await tryUrl(path);
      if (found) {
        console.log(`[Domain Guesser] Career URL for ${companyName}: ${found}`);
        return found;
      }
    }

    const fallback = `${origin}/careers`;
    console.log(`[Domain Guesser] Fallback career URL for ${companyName}: ${fallback}`);
    return fallback;

  } catch (err) {
    console.error(`Error finding career page for ${companyName}:`, err.message);
    return null;
  }
}

// ── Detect embedded ATS platforms from page HTML ──
const ATS_PATTERNS = [
  { name: 'greenhouse', re: /boards\.greenhouse\.io\/([^/"?]+)/,         url: (m) => `https://boards.greenhouse.io/${m[1]}` },
  { name: 'lever',      re: /jobs\.lever\.co\/([^/"?]+)/,                url: (m) => `https://jobs.lever.co/${m[1]}` },
  { name: 'workday',    re: /([a-z0-9-]+)\.wd\d+\.myworkdayjobs\.com/,   url: (m) => `https://${m[1]}.wd5.myworkdayjobs.com` },
  { name: 'ashby',      re: /jobs\.ashbyhq\.com\/([^/"?]+)/,             url: (m) => `https://jobs.ashbyhq.com/${m[1]}` },
];

function detectAtsUrl(html) {
  for (const ats of ATS_PATTERNS) {
    const m = html.match(ats.re);
    if (m) return ats.url(m);
  }
  return null;
}

// ── In-browser extraction logic (runs inside page.evaluate) ──
function browserExtract(evalUrl) {
  const jobs = [];
  const seen = new Set();
  const emails = new Set();
  const viewAllLinks = [];
  const origin = new URL(evalUrl).origin;
  const currentPath = new URL(evalUrl).pathname.replace(/\/$/, '');

  // Extract emails
  const bodyText = document.body?.innerText || '';
  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  (bodyText.match(emailRe) || []).forEach(e => {
    if (!e.includes('example.com') && !e.startsWith('sentry') && !e.includes('yourdomain') && !e.endsWith('.png') && !e.endsWith('.jpg')) {
      emails.add(e.toLowerCase());
    }
  });
  document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
    const mail = el.getAttribute('href').replace('mailto:', '').split('?')[0].trim();
    if (mail) emails.add(mail.toLowerCase());
  });

  // Layer 2: JSON-LD (Schema.org) Extraction
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.innerText);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'JobPosting') {
          const title = item.title;
          if (title) {
            const key = title.toLowerCase().replace(/\s+/g, ' ');
            if (!seen.has(key)) {
              seen.add(key);
              const location = typeof item.jobLocation === 'string' ? item.jobLocation : (item.jobLocation?.address?.addressLocality || '');
              const url = item.url || evalUrl;
              jobs.push({
                title,
                description: item.description || 'No description provided.',
                locationText: location.substring(0, 100),
                applyUrl: url.startsWith('http') ? url : origin + url,
                externalJobId: item.identifier?.value || url
              });
            }
          }
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // Strategy 1: Job-URL links (only if JSON-LD didn't find much)
  if (jobs.length < 5) {
    for (const link of Array.from(document.querySelectorAll('a[href]'))) {
      if (link.closest('nav, header, footer, [role="navigation"], [class*="nav"], [class*="header"], [class*="footer"], [class*="menu"]')) continue;

      const href = link.getAttribute('href') || '';
      const text = (link.innerText || link.textContent || '').trim().replace(/\s+/g, ' ');

      if (text.length > 2 && text.length < 80) {
        if (/\b(view all|see all|browse|find.*role|explore|all (jobs?|roles?)|open positions?|job (list|board)|search jobs?|our openings?)\b/i.test(text)) {
          let fh = href.startsWith('/') ? origin + href : href;
          if (fh.startsWith('http') && fh !== evalUrl) viewAllLinks.push({ text, href: fh });
        }
      }

      if (!text || text.length < 4 || text.length > 150) continue;
      if (/^(home|about|contact|blog|login|sign up|privacy|terms|cookie|back|menu|close|search|solutions?|resources?|webinar|white paper|press|news|trust|channel)/i.test(text)) continue;

      let fullUrl = href.startsWith('/') ? origin + href : href;
      if (!fullUrl.startsWith('http')) continue;

      try {
        if (new URL(fullUrl).pathname.replace(/\/$/, '') === currentPath) continue;
      } catch (_) {}

      const hrefLower = href.toLowerCase();
      const isJobLink =
        /\/(jobs?|positions?|openings?|roles?|vacanc|posting|apply)\//i.test(hrefLower) ||
        (/\d{5,}/.test(href) && /\/(jobs?|boards?|positions?|apply)/i.test(hrefLower));

      const parent = link.closest('[class*="job"], [class*="position"], [class*="opening"], [class*="listing"], [class*="vacancy"], [class*="role-item"], [data-job], [data-position]');

      if (!isJobLink && !parent) continue;

      let title = text;
      if (/^(apply|learn more|view|read more|details|see more|view details|apply for this job)$/i.test(text)) {
        const container = parent || link.parentElement?.parentElement;
        if (container) {
          const h = container.querySelector('h1, h2, h3, h4, h5, strong, [class*="title"]');
          if (h) title = (h.innerText || h.textContent || '').trim().replace(/\s+/g, ' ');
        }
        if (/^(apply|learn more|view|read more|details|see more|view details|apply for this job)$/i.test(title)) continue;
      }

      let location = '';
      const container = parent || link.parentElement?.parentElement;
      if (container) {
        const locEl = container.querySelector('[class*="location"], [class*="loc"], [class*="city"], [class*="region"], [data-location]');
        if (locEl) location = (locEl.innerText || locEl.textContent || '').trim();
      }

      const key = title.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      jobs.push({ title, description: 'No description provided.', locationText: location.substring(0, 100), applyUrl: fullUrl, externalJobId: fullUrl });
    }
  }

  // Strategy 2: Card/list pattern fallback
  if (jobs.length < 3) {
    const cardSelectors = [
      '[class*="job-listing"]', '[class*="job_listing"]', '[class*="job-card"]', '[class*="job_card"]',
      '[class*="position-item"]', '[class*="opening-item"]', '[class*="job-item"]',
      '[class*="vacancy"]', '[class*="JobItem"]', '[class*="jobItem"]',
      'li[class*="job"]', 'div[class*="position"]', 'tr[class*="job"]',
      '[data-job-id]', '[data-position-id]'
    ];

    for (const sel of cardSelectors) {
      const cards = document.querySelectorAll(sel);
      if (cards.length < 2) continue;

      for (const card of cards) {
        const titleEl = card.querySelector('h1, h2, h3, h4, h5, a, strong, [class*="title"]');
        const locEl   = card.querySelector('[class*="location"], [class*="loc"], [class*="city"]');
        const linkEl  = card.querySelector('a[href]');

        let title = (titleEl?.innerText || titleEl?.textContent || '').trim().replace(/\s+/g, ' ');
        if (!title || title.length < 3 || title.length > 150) continue;
        title = title.replace(/(?:\/|-|\|)?\s*(Apply for this job|Apply Now|Apply|Learn More|View Details)$/i, '').trim();

        let location = (locEl?.innerText || locEl?.textContent || '').trim();
        if (location && title.endsWith(location)) {
          title = title.substring(0, title.length - location.length).replace(/(?:\/|-|\|)\s*$/, '').trim();
        }

        const key = title.toLowerCase().replace(/\s+/g, ' ');
        if (seen.has(key)) continue;
        seen.add(key);

        let applyUrl = linkEl?.getAttribute('href') || evalUrl;
        if (applyUrl.startsWith('/')) applyUrl = origin + applyUrl;
        if (!applyUrl.startsWith('http')) applyUrl = evalUrl;

        jobs.push({ title, description: 'No description provided.', locationText: location.substring(0, 100), applyUrl, externalJobId: applyUrl });
      }
      if (jobs.length > 0) break;
    }
  }

  return { jobs, emails: Array.from(emails), bodyText: bodyText.substring(0, 15000), viewAllLinks };
}

/**
 * Scrape jobs from any career page using Playwright.
 * @param {string} url
 * @returns {Promise<{jobs: Array, emails: Array}>}
 */
async function scrapeManualCareerPage(url) {
  assertCrawlerEnabled();
  const { chromium } = require('playwright');
  let browser = null;

  try {
    console.log(`[Scraper] Launching headless browser for: ${url}`);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const allJobs = [];
    const allEmails = new Set();
    const seen = new Set();
    
    // Layer 1: Network Interception for JSON APIs
    const interceptedJobs = [];
    context.on('response', async (response) => {
      try {
        const reqUrl = response.url().toLowerCase();
        // Ignore static assets
        if (reqUrl.match(/\.(png|jpg|jpeg|gif|css|woff2|svg|ico)$/i)) return;
        
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json') && response.status() === 200) {
          const body = await response.json();
          // Heuristic: check if this JSON has job-like arrays
          let dataArray = null;
          if (Array.isArray(body)) dataArray = body;
          else if (body.jobs && Array.isArray(body.jobs)) dataArray = body.jobs;
          else if (body.postings && Array.isArray(body.postings)) dataArray = body.postings;
          else if (body.data && Array.isArray(body.data)) dataArray = body.data;
          else if (body.results && Array.isArray(body.results)) dataArray = body.results;

          if (dataArray && dataArray.length > 0) {
            for (const item of dataArray) {
              if (item && (item.title || item.name || item.jobTitle)) {
                const title = String(item.title || item.name || item.jobTitle);
                const desc = String(item.description || item.jobDescription || 'No description provided.');
                const loc = String(item.location || (item.locations ? item.locations[0] : '') || '');
                const applyUrl = String(item.url || item.applyUrl || item.hostedUrl || url);
                const id = String(item.id || item.reqId || applyUrl);
                
                interceptedJobs.push({
                  title,
                  description: desc,
                  locationText: loc.substring(0, 100),
                  applyUrl: applyUrl.startsWith('http') ? applyUrl : new URL(url).origin + (applyUrl.startsWith('/') ? '' : '/') + applyUrl,
                  externalJobId: id
                });
              }
            }
            if (interceptedJobs.length > 0) {
               console.log(`[Scraper] Intercepted JSON API with ${interceptedJobs.length} jobs.`);
            }
          }
        }
      } catch (err) {
        // Silent catch for network parsing errors
      }
    });

    const CTA_RE = /\b(view|see|browse|find|explore|search|show|discover)\b.{0,20}\b(jobs?|roles?|positions?|openings?|careers?|opportunities|vacancies)\b|\b(open positions?|all jobs?|job listings?|our openings?|work with us)\b/i;

    const scrapeOnePage = async (pageUrl, depth = 'root') => {
      const page = await context.newPage();
      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Layer 3: Infinite Scroll / Load More Handler
        let previousHeight = 0;
        for (let i = 0; i < 3; i++) { // Max 3 scrolls/clicks
          // Try clicking "load more"
          const loadMoreBtns = await page.$$('button:has-text("Load More"), button:has-text("Show More"), a:has-text("Load More")');
          for (const btn of loadMoreBtns) {
             try { await btn.click({ timeout: 2000 }); } catch (e) {}
          }
          // Scroll down
          await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
          
          try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch (e) { await page.waitForTimeout(2000); }
          
          const newHeight = await page.evaluate('document.body.scrollHeight');
          if (newHeight === previousHeight) break;
          previousHeight = newHeight;
        }

        const html = await page.content();

        if (depth === 'root') {
          const atsUrl = detectAtsUrl(html);
          if (atsUrl && atsUrl !== pageUrl) {
            console.log(`[Scraper] ATS embed detected (${atsUrl}), following...`);
            await page.close();
            return { jobs: [], emails: [], bodyText: '', viewAllLinks: [], atsUrl };
          }
        }

        const result = await page.evaluate(browserExtract, pageUrl);

        if (depth !== 'hop') {
          const ctaTargets = await page.evaluate((ctaReStr) => {
            const ctaRe = new RegExp(ctaReStr, 'i');
            const found = [];
            const sel = 'a[href], button, [role="button"], [onclick], [data-href]';
            for (const el of document.querySelectorAll(sel)) {
              const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
              if (!text || text.length < 3 || text.length > 120) continue;
              if (!ctaRe.test(text)) continue;

              const href = el.getAttribute('href') || el.getAttribute('data-href') || '';
              const origin = window.location.origin;
              let fullHref = href.startsWith('/') ? origin + href : href;

              if (fullHref.startsWith('http') && fullHref !== window.location.href) {
                found.push({ text, href: fullHref, needsClick: false });
              } else if (!fullHref.startsWith('http')) {
                found.push({ text, href: null, needsClick: true, tagName: el.tagName, textContent: text });
              }
            }
            return found;
          }, CTA_RE.source);

          for (const cta of ctaTargets.filter(c => c.needsClick).slice(0, 2)) {
            try {
              console.log(`[Scraper] Clicking CTA button: "${cta.text}"`);
              await Promise.all([
                page.waitForNavigation({ timeout: 8000, waitUntil: 'domcontentloaded' }).catch(() => null),
                page.click(`${cta.tagName.toLowerCase()}:has-text("${cta.textContent.substring(0, 40)}")`, { timeout: 5000 }).catch(() => null)
              ]);
              const newUrl = page.url();
              if (newUrl && newUrl !== pageUrl && newUrl.startsWith('http')) {
                result.viewAllLinks.unshift({ text: cta.text, href: newUrl }); 
              }
              await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            } catch (clickErr) {}
          }

          for (const cta of ctaTargets.filter(c => !c.needsClick && c.href)) {
            if (!result.viewAllLinks.some(v => v.href === cta.href)) {
              result.viewAllLinks.push({ text: cta.text, href: cta.href });
            }
          }
        }

        return { ...result, atsUrl: null };
      } finally {
        await page.close();
      }
    };

    let rootResult = await scrapeOnePage(url, 'root');

    if (rootResult.atsUrl) {
      console.log(`[Scraper] Scraping ATS board: ${rootResult.atsUrl}`);
      rootResult = await scrapeOnePage(rootResult.atsUrl, 'ats');
    }

    (rootResult.emails || []).forEach(e => allEmails.add(e));
    
    // Add intercepted jobs first (highest quality)
    for (const job of interceptedJobs) {
      const key = job.title.toLowerCase().replace(/\s+/g, ' ');
      if (!seen.has(key)) { seen.add(key); allJobs.push(job); }
    }
    
    for (const job of rootResult.jobs) {
      const key = job.title.toLowerCase().replace(/\s+/g, ' ');
      if (!seen.has(key)) { seen.add(key); allJobs.push(job); }
    }

    if (allJobs.length < 3 && rootResult.viewAllLinks && rootResult.viewAllLinks.length > 0) {
      for (const hop of rootResult.viewAllLinks.slice(0, 3)) {
        console.log(`[Scraper] Multi-hop: following "${hop.text}" → ${hop.href}`);
        try {
          const hopResult = await scrapeOnePage(hop.href, 'hop');
          (hopResult.emails || []).forEach(e => allEmails.add(e));
          
          for (const job of interceptedJobs) {
            const key = job.title.toLowerCase().replace(/\s+/g, ' ');
            if (!seen.has(key)) { seen.add(key); allJobs.push(job); }
          }
          for (const job of hopResult.jobs) {
            const key = job.title.toLowerCase().replace(/\s+/g, ' ');
            if (!seen.has(key)) { seen.add(key); allJobs.push(job); }
          }
          if (allJobs.length >= 3) break;
        } catch (hopErr) {}
      }
    }

    if (allJobs.length === 0 && rootResult.bodyText && rootResult.bodyText.length > 100) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        try {
          console.log(`[Scraper] DOM heuristics found 0 jobs, trying OpenAI extraction...`);
          const OpenAI = require('openai');
          const openai = new OpenAI({ apiKey });
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: 'You are a job extraction engine. Extract open job positions from the given careers page text. Return ONLY JSON with this schema: { "jobs": [ { "title": "string", "locationText": "string", "description": "string (short snippet)" } ] }. If no jobs are found, return { "jobs": [] }.'
              },
              { role: 'user', content: rootResult.bodyText }
            ]
          });
          const aiContent = JSON.parse(response.choices[0].message.content || '{"jobs":[]}');
          if (aiContent.jobs && Array.isArray(aiContent.jobs)) {
            aiContent.jobs.forEach((j, idx) => {
              allJobs.push({
                title: j.title || 'Unknown Role',
                description: j.description || 'No description provided.',
                locationText: j.locationText || '',
                applyUrl: url,
                externalJobId: `${url}-ai-${idx}`
              });
            });
          }
        } catch (aiErr) {}
      }
    }
    
    // Layer 4: Deep Job Crawling
    // Unconditionally fetch full descriptions for any jobs that have short/default descriptions
    for (const job of allJobs) {
      if (!job.description || job.description.length < 200 || job.description === 'No description provided.') {
         console.log(`[Scraper] Deep crawling description for: ${job.title}`);
         const detailPage = await context.newPage();
         try {
           await detailPage.goto(job.applyUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
           const detailResult = await detailPage.evaluate(() => {
              const scripts = document.querySelectorAll('script[type="application/ld+json"]');
              for (const s of scripts) {
                 try {
                    const data = JSON.parse(s.innerText);
                    const items = Array.isArray(data) ? data : [data];
                    for (const item of items) {
                       if (item['@type'] === 'JobPosting') {
                          return item.description || item.text;
                       }
                    }
                 } catch(e) {}
              }
              // Try to find the main content block to avoid returning headers/footers
              const mainBlock = document.querySelector('main, article, [role="main"], .job-description, .post-content, #content');
              return (mainBlock?.innerText || document.body?.innerText || '');
           });
           if (detailResult && detailResult.length > 50) {
             job.description = detailResult.substring(0, 15000);
           }
         } catch(e) {
           console.warn(`[Scraper] Deep crawl failed for ${job.applyUrl}`);
         } finally {
           await detailPage.close();
         }
      }
    }

    console.log(`[Scraper] Result for ${url}: ${allJobs.length} jobs, ${allEmails.size} emails`);
    return { jobs: allJobs, emails: Array.from(allEmails) };

  } catch (err) {
    console.error(`[Scraper] Error scraping ${url}:`, err.message);
    return { jobs: [], emails: [] };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Find LinkedIn recruiter profiles for a company via DuckDuckGo.
 * @param {string} companyName
 * @returns {Array}
 */
async function scrapeLeadsForCompany(companyName) {
  assertCrawlerEnabled();
  try {
    const query = encodeURIComponent(`site:linkedin.com/in "${companyName}" ("Talent" OR "Recruiter" OR "HR")`);
    const { data } = await axios.post('https://lite.duckduckgo.com/lite/', `q=${query}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64 AppleWebKit/537.36)'
      }
    });

    const $ = cheerio.load(data);
    const leadsMap = new Map();

    $('tr').each((i, el) => {
      const titleEl = $(el).find('td.result-snippet').prev('tr').find('a.result-url, a.result-link');
      if (!titleEl.length) return;

      const url = titleEl.attr('href');
      const titleText = titleEl.text().trim();

      if (url && url.includes('linkedin.com/in/')) {
        let cleanUrl = url;
        if (cleanUrl.includes('uddg=')) {
          const p = new URLSearchParams(cleanUrl.split('?')[1]);
          if (p.has('uddg')) cleanUrl = decodeURIComponent(p.get('uddg'));
        }
        const namePart = titleText.split('-')[0].trim();
        const rolePart = titleText.split('-')[1]?.trim() || 'Recruiter';
        if (!leadsMap.has(cleanUrl) && namePart.length > 2) {
          leadsMap.set(cleanUrl, { name: namePart, role: rolePart, companyName, contactDetails: cleanUrl });
        }
      }
    });

    return Array.from(leadsMap.values());
  } catch (err) {
    console.error(`Error finding leads for ${companyName}:`, err.message);
    return [];
  }
}

module.exports = {
  findCareerPageUrl,
  scrapeManualCareerPage,
  scrapeLeadsForCompany
};
