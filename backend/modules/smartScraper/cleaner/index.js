const cheerio = require('cheerio');

/**
 * Cleans raw HTML by removing unnecessary tags, attributes, and whitespace.
 * Retains only structurally relevant elements for extraction.
 * 
 * @param {string} html - Raw HTML string
 * @returns {string} Cleaned HTML string
 */
function cleanHtml(html) {
  if (!html) return '';

  const $ = cheerio.load(html, { decodeEntities: true });

  // 1. Remove non-content tags only — keep iframe (ATS embeds), header/footer (job nav menus)
  const tagsToRemove = [
    'script', 'style', 'svg', 'canvas', 'noscript',
    'meta', 'link', 'head'
  ];
  $(tagsToRemove.join(', ')).remove();

  // 2. Remove noise elements (ads, cookie banners, popups)
  const noiseSelectors = [
    '[class*="cookie"]', '[id*="cookie"]',
    '[class*="banner"]', '[id*="banner"]',
    '[class*="ad-"]', '[id*="ad-"]',
    '[class*="advert"]', '[id*="advert"]',
    '[class*="popup"]', '[id*="popup"]',
    '[class*="modal"]', '[id*="modal"]',
    '[role="dialog"]'
  ];
  $(noiseSelectors.join(', ')).remove();

  // 3. Strip unnecessary attributes, keep semantic ones
  const allowedAttributes = ['class', 'id', 'href', 'src', 'alt', 'title'];
  $('*').each((i, el) => {
    if (el.attribs) {
      Object.keys(el.attribs).forEach(attr => {
        if (!allowedAttributes.includes(attr) && !attr.startsWith('data-')) {
          $(el).removeAttr(attr);
        }
      });
    }
  });

  // 4. Extract body content, normalize whitespace but preserve structure
  let cleanedStr = $('body').length ? $('body').html() : $.html();
  // Collapse runs of 3+ newlines to 2, but keep single newlines (preserve list structure)
  cleanedStr = cleanedStr.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();

  return cleanedStr;
}

module.exports = { cleanHtml };
