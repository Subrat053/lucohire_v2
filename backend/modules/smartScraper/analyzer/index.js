const cheerio = require('cheerio');

const KEYWORDS = [
  'job', 'career', 'apply', 'location', 'experience', 
  'requirements', 'responsibilities', 'qualification', 
  'skills', 'salary', 'company', 'description'
];

/**
 * Analyzes the DOM and extracts the most relevant subtree containing job listings.
 * 
 * @param {string} cleanedHtml - The cleaned HTML string from Step 2
 * @returns {string} The HTML string of the most relevant subtree
 */
function analyzeDOM(cleanedHtml) {
  if (!cleanedHtml) return '';
  const $ = cheerio.load(cleanedHtml, { decodeEntities: false });

  let bestNode = null;
  let maxScore = -1;

  // Score every block-level node
  $('div, section, ul, article, main, table').each((_, el) => {
    const $el = $(el);
    
    // Avoid scoring massive containers that just wrap everything (like body or main wrapper)
    // if a more specific child actually has the density. We handle this by choosing the 
    // deepest node that maintains a high score, or by normalizing by length.
    
    const text = $el.text();
    const textLen = text.length;
    if (textLen < 50) return; // Ignore very small nodes

    let score = 0;

    // 1. Keyword Frequency
    const lowerText = text.toLowerCase();
    let keywordCount = 0;
    KEYWORDS.forEach(kw => {
      // rough occurrences
      const matches = lowerText.match(new RegExp(`\\b${kw}\\b`, 'g'));
      if (matches) {
        keywordCount += matches.length;
      }
    });
    // Add points for keywords, capped to avoid keyword stuffing scoring too high
    score += Math.min(keywordCount * 2, 50);

    // 2. Link Density
    const links = $el.find('a');
    const linkCount = links.length;
    // Job listings usually have multiple "apply" or "job title" links.
    if (linkCount >= 1 && linkCount <= 50) {
      score += (linkCount * 2);
    } else if (linkCount > 50) {
      // Too many links might just be a footer or massive nav directory
      score -= 10;
    }

    let linkHasApply = false;
    links.each((i, link) => {
      const linkText = $(link).text().toLowerCase();
      if (linkText.includes('apply') || linkText.includes('view')) {
        linkHasApply = true;
      }
    });
    if (linkHasApply) score += 20;

    // 3. Semantic tags & Heading proximity
    const headings = $el.find('h1, h2, h3, h4, h5');
    if (headings.length > 0) score += 10;

    // 4. Text density (text to HTML ratio)
    const htmlLen = $el.html() ? $el.html().length : 0;
    if (htmlLen > 0) {
      const textRatio = textLen / htmlLen;
      if (textRatio > 0.3) score += 15; // High text density
    }

    // Assign score to data attribute for debugging/reference
    $el.attr('data-score', score);

    // Penalty for being the root body/main if a child has a similar score
    // We want the most specific container
    const childCount = $el.children().length;
    if (childCount > 50) {
      score -= 20; 
    }

    if (score > maxScore) {
      maxScore = score;
      bestNode = el;
    }
  });

  if (bestNode) {
    return $.html(bestNode);
  }

  // Fallback if no specific node scores well, return the whole body
  return $('body').length ? $('body').html() : cleanedHtml;
}

module.exports = { analyzeDOM };
