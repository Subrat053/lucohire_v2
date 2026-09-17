const cheerio = require('cheerio');
const { DEFAULT_SELECTORS } = require('./extractors');
const LearnedSelector = require('../../../models/LearnedSelector');

/**
 * Attempts deterministic extraction using CSS selectors.
 * If confidence > 90%, returns result immediately.
 * 
 * @param {string} htmlSubtree - The relevant HTML subtree
 * @param {string} domain - The domain of the website (for finding learned selectors)
 * @param {string} sourceUrl - The original URL
 * @returns {Promise<{ confidence: number, data: any }>}
 */
async function extractWithRules(htmlSubtree, domain, sourceUrl) {
  if (!htmlSubtree) return { confidence: 0, data: null };
  const $ = cheerio.load(htmlSubtree, { decodeEntities: false });

  // 1. Fetch Learned Selectors for this domain from DB
  let learned = {};
  try {
    const selectors = await LearnedSelector.find({ domain }).lean();
    selectors.forEach(s => {
      learned[s.field] = s.selector;
    });
  } catch (err) {
    console.warn('[Rule Engine] Failed to fetch learned selectors:', err.message);
  }

  // 2. Identify Job Containers
  // We first try learned container selector, then fall back to defaults
  let containerSelector = learned['jobContainer'];
  let $containers = containerSelector ? $(containerSelector) : [];
  
  if ($containers.length === 0) {
    for (const sel of DEFAULT_SELECTORS.jobContainer) {
      $containers = $(sel);
      if ($containers.length > 0) {
        containerSelector = sel;
        break;
      }
    }
  }

  const jobs = [];
  let totalConfidence = 0;

  // If no containers found, we should NOT treat the whole page as a single job because it mashes everything.
  // Just return empty, which gives 0 confidence and lets the LLM take over.
  const elementsToParse = $containers.length > 0 ? $containers.toArray() : [];

  elementsToParse.forEach(containerEl => {
    const $c = $(containerEl);
    const job = {
      title: null, company: null, location: null, employmentType: null,
      experience: null, salary: null, skills: [], responsibilities: [],
      qualifications: [], description: null, applyUrl: null
    };

    let fieldConfidence = 0;
    let fieldsFound = 0;
    const requiredFields = ['title', 'location', 'applyUrl'];
    
    const extractField = (fieldKey, isArray = false) => {
      let val = null;
      // Try learned selector first
      if (learned[fieldKey]) {
        const match = $c.find(learned[fieldKey]);
        if (match.length) {
          if (isArray) {
            val = match.map((i, el) => $(el).text().trim()).get();
          } else {
            val = fieldKey === 'applyUrl' ? (match.attr('href') || match.text()) : match.text();
          }
        }
      }
      // Fallback to default selectors
      if (!val || (isArray && val.length === 0)) {
        const fallbacks = DEFAULT_SELECTORS[fieldKey] || [];
        for (const sel of fallbacks) {
          const match = $c.find(sel);
          if (match.length) {
            if (isArray) {
              val = match.map((i, el) => $(el).text().trim()).get();
            } else {
              val = fieldKey === 'applyUrl' ? (match.attr('href') || match.text()) : match.text();
            }
            break;
          }
        }
      }
      
      // Additional fallback for applyUrl (looking for generic links)
      if (fieldKey === 'applyUrl' && !val) {
         const links = $c.find('a');
         links.each((_, l) => {
           const href = $(l).attr('href');
           const text = $(l).text().toLowerCase();
           if (href && (text.includes('apply') || href.includes('apply') || href.includes('job'))) {
             val = href;
           }
         });
      }

      if (val && (!isArray || val.length > 0)) {
        if (typeof val === 'string') val = val.trim();
        job[fieldKey] = val;
        fieldsFound++;
        if (requiredFields.includes(fieldKey)) fieldConfidence += 30; // Critical fields
        else fieldConfidence += 10; // Optional fields
      }
    };

    Object.keys(job).forEach(k => {
      const isArray = Array.isArray(job[k]);
      extractField(k, isArray);
    });

    // Score capping
    if (fieldConfidence > 100) fieldConfidence = 100;
    
    // Only push if it actually resembles a job (has a title and location or apply URL)
    if (job.title) {
      jobs.push(job);
      totalConfidence += fieldConfidence;
    }
  });

  const avgConfidence = jobs.length > 0 ? (totalConfidence / jobs.length) : 0;

  return {
    confidence: avgConfidence,
    data: { jobs }
  };
}

module.exports = { extractWithRules };
