const { download } = require('./downloader');
const { cleanHtml } = require('./cleaner');
const { analyzeDOM } = require('./analyzer');
const { extractWithRules } = require('./rule-engine');
const { extractWithLLM } = require('./llm');
const { validateAndNormalize } = require('./validator');
const { hashHtml, getCachedData, setCachedData, learnSelectors } = require('./selector-cache');

/**
 * Smart Scraper V2 Orchestrator
 * Implements the 10-step AI/Heuristic Hybrid extraction pipeline.
 * 
 * @param {string} url - The URL to scrape
 * @returns {Promise<any>} The extracted and structured JSON data conforming to the OUTPUT FORMAT
 */
async function scrapeCareerPage(url) {
  const startTime = Date.now();
  let extractionMethod = 'unknown';
  let confidence = 0;
  let cacheHit = false;
  let markdownSize = 0;
  let extractedData = { jobs: [] };
  let rawHtmlSize = 0;
  const emailsFound = new Set();

  const extractEmails = (text) => {
    if (!text) return;
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      const email = match[1].toLowerCase();
      if (!email.includes('.png') && !email.includes('.jpg') && !email.includes('.webp') && !email.includes('@example.com')) {
        emailsFound.add(email);
      }
    }
  };

  try {
    const domain = new URL(url).hostname.replace('www.', '');

    // STEP 1: Downloader
    const { html, method } = await download(url);
    if (!html) throw new Error('Downloader returned empty HTML');
    rawHtmlSize = html.length;
    extractEmails(html);
    console.log(`[Smart Scraper] Downloaded ${url} via ${method} — ${rawHtmlSize} bytes`);

    // STEP 2: HTML Cleaning
    const cleanedHtml = cleanHtml(html);

    // STEP 8: Caching
    const htmlHash = hashHtml(cleanedHtml);
    const cached = await getCachedData(url, htmlHash);
    
    if (cached) {
      cacheHit = true;
      extractionMethod = cached.extractionMethod;
      confidence = cached.confidence;
      extractedData = cached.data;
    } else {
      // STEP 3: DOM Analyzer
      const htmlSubtree = analyzeDOM(cleanedHtml);

      // STEP 4: Rule Engine
      console.log(`[Smart Scraper] Running rule engine / keyword matching on DOM subtree...`);
      const ruleResult = await extractWithRules(htmlSubtree, domain, url);
      
      console.log(`[Smart Scraper] Rule engine found ${ruleResult.data.jobs.length} jobs with confidence ${ruleResult.confidence}%`);

      if (ruleResult.data.jobs.length > 0 && ruleResult.confidence >= 90) {
        extractionMethod = 'css';
        confidence = ruleResult.confidence;
        extractedData = ruleResult.data;
      } else {
        console.log(`[Smart Scraper] Keyword matching / rules gave zero acceptable results (or low confidence). Switching to OpenAI LLM request...`);
        // STEP 5: LLM Extraction
        try {
          const llmResult = await extractWithLLM(cleanedHtml);
          extractionMethod = ruleResult.confidence > 0 ? 'mixed' : 'llm';
          confidence = 100; // LLM output is highly confident by default if it passes JSON parsing
          markdownSize = llmResult.markdownSize;
          
          const validated = validateAndNormalize(llmResult.data, url);
          if (validated.success) {
            extractedData = validated.data;
            console.log('[Smart Scraper] LLM Validation SUCCESS.');
          } else {
            confidence = 0;
            console.warn('[Smart Scraper] Validation failed for LLM output:', JSON.stringify(validated.error, null, 2));
            throw new Error('Zod validation failed on LLM output');
          }
        } catch (llmError) {
           console.error('[Smart Scraper] LLM EXTRACTION FAILED. ERROR:', llmError);
           // Fallback to whatever the rule engine found
           console.log('[Smart Scraper] Falling back to CSS Rule Engine (which might produce mashed text).');
           extractionMethod = 'css (fallback)';
           confidence = ruleResult.confidence;
           extractedData = ruleResult.data;
        }
      }

      // STEP 7: Deep Crawling for Details
      // If we found jobs, but some are missing descriptions and they have distinct applyUrls, fetch their details.
      if (extractedData && extractedData.jobs && extractedData.jobs.length > 0) {
        const jobsToDeepScrape = extractedData.jobs.filter(job => 
          (!job.description || job.description.length < 50) && 
          job.applyUrl && job.applyUrl.startsWith('http') && 
          job.applyUrl !== url
        );

        if (jobsToDeepScrape.length > 0) {
          console.log(`[Smart Scraper] Deep scraping ${jobsToDeepScrape.length} job(s) for missing details...`);
          const batchSize = 5;
          for (let i = 0; i < jobsToDeepScrape.length; i += batchSize) {
            const batch = jobsToDeepScrape.slice(i, i + batchSize);
            await Promise.all(batch.map(async (job) => {
              try {
                console.log(`[Deep Scrape] Fetching ${job.applyUrl}`);
                const { html: detailHtml } = await download(job.applyUrl);
                extractEmails(detailHtml);
                const cleanedDetailHtml = cleanHtml(detailHtml);
                const llmDetail = await extractWithLLM(cleanedDetailHtml);
                
                // Merge detailed description and arrays back into job
                const detailData = llmDetail.data && llmDetail.data.jobs ? llmDetail.data.jobs[0] : null;
                if (detailData) {
                  if (detailData.description) job.description = detailData.description;
                  if (detailData.skills && detailData.skills.length > 0) job.skills = detailData.skills;
                  if (detailData.responsibilities && detailData.responsibilities.length > 0) job.responsibilities = detailData.responsibilities;
                  if (detailData.qualifications && detailData.qualifications.length > 0) job.qualifications = detailData.qualifications;
                }
              } catch (e) {
                console.warn(`[Deep Scrape] Failed for ${job.applyUrl}: ${e.message}`);
              }
            }));
          }
        }
      }

      // Save to cache
      if (extractedData && extractedData.jobs.length > 0) {
        await setCachedData(url, htmlHash, extractedData, extractionMethod, confidence);
      }
    }

    const processingTime = Date.now() - startTime;

    // Output Format requested in blueprint
    return {
      url,
      extractionMethod,
      confidence,
      processingTime: `${processingTime}ms`,
      htmlSize: rawHtmlSize,
      markdownSize,
      cacheHit,
      emails: Array.from(emailsFound),
      data: extractedData
    };
  } catch (error) {
    console.error(`[Smart Scraper] Fatal error processing ${url}:`, error.message);
    return {
      url,
      extractionMethod: 'error',
      confidence: 0,
      processingTime: `${Date.now() - startTime}ms`,
      htmlSize: rawHtmlSize,
      markdownSize,
      cacheHit,
      error: error.message,
      emails: Array.from(emailsFound),
      data: { jobs: [] }
    };
  }
}

module.exports = { scrapeCareerPage };
