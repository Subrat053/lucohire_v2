const axios = require('axios');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

/**
 * Downloads the HTML content of a URL.
 * Attempts static fetch with Axios first. If it detects a JS-dependent SPA,
 * it falls back to Playwright.
 * 
 * @param {string} url - The URL to download
 * @returns {Promise<{ html: string, method: 'axios' | 'playwright' }>}
 */
async function download(url) {
  let axiosHtml = null;
  try {
    // Attempt 1: Static Download
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000 // 10 seconds
    });
    
    axiosHtml = response.data;

    // Check if the page is likely a JS-rendered SPA
    const isDynamic = axiosHtml.length < 5000 || 
                      axiosHtml.includes('<noscript>You need to enable JavaScript to run this app.</noscript>') ||
                      axiosHtml.includes('<div id="root"></div>') ||
                      axiosHtml.includes('<div id="root" ') ||
                      axiosHtml.includes('<div id="app"></div>') ||
                      axiosHtml.includes('<div id="app" ') ||
                      axiosHtml.includes('<app-root') || 
                      axiosHtml.includes('id="__next"') || 
                      axiosHtml.includes('id="__nuxt"');

    if (!isDynamic) {
      return { html: axiosHtml, method: 'axios' };
    }
  } catch (err) {
    console.warn(`[Downloader] Axios failed for ${url} (${err.message}). Falling back to Playwright.`);
  }

  // Attempt 2: Dynamic Download (Playwright)
  let browser;
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Intercept JSON API calls
    const interceptedData = [];
    page.on('response', async res => {
      const resUrl = res.url();
      if(resUrl.includes('api') || resUrl.includes('json') || res.request().resourceType() === 'fetch' || res.request().resourceType() === 'xhr') {
        try {
          // Only process responses that look like JSON (avoid heavy media)
          const contentType = res.headers()['content-type'] || '';
          if (contentType.includes('application/json') || resUrl.includes('api')) {
            const text = await res.text();
            if (text && text.length > 100) {
              interceptedData.push({ url: resUrl, data: text });
            }
          }
        } catch(e) {
          // Ignore failures for reading response body (e.g. CORS or aborted)
        }
      }
    });

    // Wait until DOM is ready — networkidle times out on sites with continuous analytics/polling (e.g. TCS)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Give JS frameworks time to render content after DOM load
    await page.waitForTimeout(5000);

    
    // Auto-scroll to the bottom of the page to trigger lazy-loading / scroll-based animations
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          // Stop if we hit the bottom or scrolled for too long (prevent infinite scrolling)
          if (totalHeight >= scrollHeight || totalHeight > 10000) {
            clearInterval(timer);
            resolve();
          }
        }, 200); // Scroll every 200ms
      });
    });

    // Wait an extra moment for any triggered fetch requests to finish
    await page.waitForTimeout(3000);

    // Inject intercepted API data into the DOM so the LLM can see it
    if (interceptedData.length > 0) {
      await page.evaluate((data) => {
        const script = document.createElement('script');
        script.id = 'intercepted-api-data';
        script.type = 'application/json';
        script.textContent = JSON.stringify(data);
        document.body.appendChild(script);
      }, interceptedData);
    }

    const html = await page.content();
    await browser.close();
    
    return { html, method: 'playwright' };
  } catch (err) {
    if (browser) await browser.close();
    console.warn(`[Downloader] Playwright failed for ${url}: ${err.message}.`);
    if (axiosHtml) {
      console.warn(`[Downloader] Falling back to axios HTML since Playwright failed.`);
      return { html: axiosHtml, method: 'axios (fallback)' };
    }
    throw new Error(`[Downloader] Failed to fetch URL dynamically: ${err.message}`);
  }
}

module.exports = { download };
