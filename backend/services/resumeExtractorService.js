/**
 * resumeExtractorService.js
 * Extracts text from uploaded resume files (PDF, DOCX, images).
 * Only the extracted TEXT is sent to the AI — never the file itself.
 */

const path = require('path');

// ─── PDF extraction ───────────────────────────────────────────────────────────
async function extractFromPdf(buffer) {
  const pdfParse = require('pdf-parse');
  const render_page = async function(pageData) {
    let render_options = { normalizeWhitespace: false, disableCombineTextItems: false };
    let textContent = await pageData.getTextContent(render_options);
    let textString = textContent.items.map(i => i.str).join(' ');

    try {
      let annotations = await pageData.getAnnotations();
      let links = annotations
        .filter(a => a.subtype === 'Link' && a.url)
        .map(a => a.url);
      if (links.length > 0) {
        textString += '\n--- EMBEDDED LINKS ---\n' + links.join('\n') + '\n';
      }
    } catch(e) {
      console.warn('Could not extract PDF annotations:', e.message);
    }
    return textString;
  };

  const parserResult = await pdfParse(buffer, { pagerender: render_page });
  return (parserResult?.text || '').trim();
}

// ─── DOCX extraction ─────────────────────────────────────────────────────────
async function extractFromDocx(buffer) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

// ─── Image OCR (reuse existing Google Vision service) ────────────────────────
async function extractFromImage(buffer) {
  const { detectDocumentText } = require('./googleVision.service');
  const result = await detectDocumentText(buffer);
  return result?.fullText || '';
}

// ─── DOC (legacy Word) extraction ────────────────────────────────────────────
async function extractFromDoc(buffer) {
  // word-extractor is installed in the project
  try {
    const WordExtractor = require('word-extractor');
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(buffer);
    return extracted.getBody() || '';
  } catch (_) {
    // Fallback: try mammoth on .doc too
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (__) {
      return '';
    }
  }
}

// ─── PII sanitizer ───────────────────────────────────────────────────────────
/**
 * Strip sensitive government ID patterns before sending text to LLM.
 * The AI doesn't need Aadhaar/PAN numbers to parse a resume.
 */
function sanitizeResumeText(text) {
  let clean = String(text || '');

  // Mask Aadhaar (12 digit sequences with optional spaces)
  clean = clean.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[REDACTED]');

  // Mask PAN (AAAAA9999A format)
  clean = clean.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[REDACTED]');

  // Mask full credit/debit card numbers
  clean = clean.replace(/\b(?:\d[ -]?){13,16}\b/g, '[REDACTED]');

  // Remove null bytes and control chars
  // eslint-disable-next-line no-control-regex
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

  // Collapse excessive whitespace
  clean = clean.replace(/[ \t]{3,}/g, '  ').replace(/\n{4,}/g, '\n\n\n');

  // Truncate to 8000 characters to stay within LLM context limits
  if (clean.length > 8000) {
    clean = clean.slice(0, 8000) + '\n[... truncated for length ...]';
  }

  return clean.trim();
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────
/**
 * Extract text from a file buffer based on MIME type.
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<string>} Sanitized extracted text
 */
async function extractTextFromFile(buffer, mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  let rawText = '';

  try {
    if (mime === 'application/pdf') {
      rawText = await extractFromPdf(buffer);
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/docx'
    ) {
      rawText = await extractFromDocx(buffer);
    } else if (
      mime === 'application/msword' ||
      mime === 'application/x-msword' ||
      mime === 'application/doc'
    ) {
      rawText = await extractFromDoc(buffer);
    } else if (
      mime.startsWith('image/') &&
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)
    ) {
      rawText = await extractFromImage(buffer);
    } else {
      throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
    }
  } catch (err) {
    console.error(`[ResumeExtractor] Extraction failed for ${mime}:`, err.message);
    throw new Error(`Could not extract text from file: ${err.message}`);
  }

  if (!rawText || rawText.trim().length < 20) {
    throw new Error('Extracted text is too short to be a valid resume. Please upload a proper resume document.');
  }

  return sanitizeResumeText(rawText);
}

// ─── Regex Basic Info Extractor ────────────────────────────────────────────────
/**
 * Extract exact fields deterministically from raw text.
 * Helps overcome AI hallucination/omission for standard formats.
 */
function extractBasicInfo(text) {
  if (!text) return {};
  
  const extracted = {
    email: '',
    phone: '',
    portfolio: {}
  };

  // 1. Email Extraction
  let headerText = text;
  
  // Fix spaces around @ and . (e.g. "sahoo97292 @ gmail . com" -> "sahoo97292@gmail.com")
  headerText = headerText.replace(/([a-zA-Z0-9._%+-]+)\s*@\s*([a-zA-Z0-9.-]+)\s*\.\s*([a-zA-Z]{2,})/gi, (match, p1, p2, p3) => {
    return p1 + '@' + p2 + '.' + p3;
  });

  // Fix emails broken by PDF spacing (e.g., "Soumyaranjan sahoo97292@gmail.com" -> "Soumyaranjansahoo97292@gmail.com")
  headerText = headerText.replace(/([a-zA-Z0-9._%+-]+)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi, (match, p1, p2) => {
    const skipLabels = ['email', 'contact', 'mail', 'to', 'name', 'phone', 'mobile', 'e-mail'];
    const lp = p1.toLowerCase().replace(/[^a-z]/g, '');
    if (skipLabels.includes(lp)) return match;
    return p1 + p2;
  });

  const emailMatch = headerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    extracted.email = emailMatch[0].trim();
  }

  // 2. Phone Extraction (Basic international & local formats)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    extracted.phone = phoneMatch[0].trim();
  }

  // 3. Portfolio & Links Extraction
  // Find all URLs in the text
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  const urls = [...text.matchAll(urlRegex)].map(m => m[0]);

  urls.forEach(url => {
    const lowerUrl = url.toLowerCase();
    // Skip email domains that might get caught as URLs
    if (lowerUrl.includes('@')) return;
    
    if (lowerUrl.includes('github.com')) {
      extracted.portfolio.github = url;
    } else if (lowerUrl.includes('linkedin.com/in')) {
      extracted.portfolio.linkedin = url;
    } else if (lowerUrl.includes('behance.net')) {
      extracted.portfolio.behance = url;
    } else if (lowerUrl.includes('dribbble.com')) {
      extracted.portfolio.dribbble = url;
    } else if (lowerUrl.includes('kaggle.com')) {
      extracted.portfolio.kaggle = url;
    } else if (lowerUrl.includes('leetcode.com')) {
      extracted.portfolio.leetcode = url;
    } else if (lowerUrl.includes('notion.so') || lowerUrl.includes('notion.site')) {
      extracted.portfolio.notion = url;
    } else if (lowerUrl.includes('medium.com')) {
      extracted.portfolio.medium = url;
    } else {
      // Treat as generic website if it starts with http/https
      if (lowerUrl.startsWith('http')) {
        if (!extracted.portfolio.website) {
          extracted.portfolio.website = url;
        }
      }
    }
  });

  return extracted;
}

module.exports = { extractTextFromFile, sanitizeResumeText, extractBasicInfo };
