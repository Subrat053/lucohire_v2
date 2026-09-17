const crypto = require('crypto');
const cheerio = require('cheerio');
const ScraperCache = require('../../../models/ScraperCache');
const LearnedSelector = require('../../../models/LearnedSelector');

/**
 * Hashes the cleaned HTML to check for cache hits
 */
function hashHtml(html) {
  return crypto.createHash('sha256').update(html).digest('hex');
}

/**
 * Retrieves cached data if the hash matches (Step 8)
 */
async function getCachedData(url, htmlHash) {
  try {
    const cache = await ScraperCache.findOne({ url, htmlHash }).lean();
    if (cache) {
      return cache;
    }
  } catch (err) {
    console.error('[Cache] Error retrieving cache:', err.message);
  }
  return null;
}

/**
 * Saves extracted data to cache
 */
async function setCachedData(url, htmlHash, data, extractionMethod, confidence) {
  try {
    await ScraperCache.findOneAndUpdate(
      { url },
      { url, htmlHash, data, extractionMethod, confidence },
      { upsert: true }
    );
  } catch (err) {
    console.error('[Cache] Error saving cache:', err.message);
  }
}

/**
 * Generates a unique CSS selector for a Cheerio element
 */
function generateSelector($el) {
  let path = '';
  let current = $el;
  
  while (current.length) {
    let name = current.get(0).name;
    if (!name || name === 'body' || name === 'html') break;
    
    // Prefer ID
    let id = current.attr('id');
    if (id) {
      path = `${name}#${id} ${path}`;
      break;
    }

    // Prefer Class (take the first specific one)
    let className = current.attr('class');
    if (className) {
      let classes = className.split(' ').map(c => c.trim()).filter(c => c && !c.includes(':'));
      if (classes.length > 0) {
        path = `${name}.${classes[0]} ${path}`;
      } else {
        path = `${name} ${path}`;
      }
    } else {
      path = `${name} ${path}`;
    }

    current = current.parent();
  }
  return path.trim();
}

/**
 * Selector Learning (Step 9) & Auto Healing (Step 10)
 * If the LLM successfully parses fields, we search the DOM for those exact texts
 * and save their CSS selectors to the DB for the rule engine.
 */
async function learnSelectors(domain, htmlSubtree, extractedJobs) {
  if (!extractedJobs || extractedJobs.length === 0) return;
  
  const $ = cheerio.load(htmlSubtree, { decodeEntities: false });
  // We'll just try to learn from the first job for simplicity
  const job = extractedJobs[0];
  const fieldsToLearn = ['title', 'location', 'salary'];
  
  for (const field of fieldsToLearn) {
    const val = job[field];
    if (!val || typeof val !== 'string') continue;

    // Find nodes containing this exact text
    let matchedNode = null;
    $('*').each((i, el) => {
      // Find the deepest node that matches the text
      if ($(el).children().length === 0) {
        const text = $(el).text().trim();
        if (text === val) {
          matchedNode = el;
          return false; // break loop
        }
      }
    });

    if (matchedNode) {
      const selector = generateSelector($(matchedNode));
      if (selector) {
        try {
          await LearnedSelector.findOneAndUpdate(
            { domain, field },
            { domain, field, selector, confidence: 100 },
            { upsert: true }
          );
        } catch (err) {
           console.error('[Selector Cache] Error saving learned selector:', err.message);
        }
      }
    }
  }
}

module.exports = {
  hashHtml,
  getCachedData,
  setCachedData,
  learnSelectors
};
