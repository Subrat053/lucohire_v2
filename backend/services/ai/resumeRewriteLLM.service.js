const axios = require('axios');
const crypto = require('crypto');

// ─── High-Performance In-Memory Cache (TTL: 15 minutes) ─────────────────────
const rewriteCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCachedRewrites(cacheKey) {
  const item = rewriteCache.get(cacheKey);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  if (item) rewriteCache.delete(cacheKey);
  return null;
}

function setCachedRewrites(cacheKey, data) {
  if (rewriteCache.size > 100) {
    const oldestKey = rewriteCache.keys().next().value;
    rewriteCache.delete(oldestKey);
  }
  rewriteCache.set(cacheKey, {
    data,
    expiry: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Extracts and sanitizes JSON from LLM text responses.
 */
function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {}

  const match = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (_) {
    return null;
  }
}

/**
 * Fast direct OpenAI call with gpt-4o-mini (tuned for ~1.5s response).
 */
async function callFastOpenAI(prompt) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 450, // Optimal size for 3-4 punchy before/after rewrites in ~1s
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an elite corporate technical recruiter and ATS specialist. Return compact valid JSON only.' },
          { role: 'user', content: prompt },
        ],
      },
      {
        timeout: 6000, // Fast 6s ceiling
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);
    return Array.isArray(parsed) ? parsed : (parsed?.rewrites || parsed?.fixes || null);
  } catch (err) {
    console.warn('[ResumeRewriteLLM] Fast OpenAI failed:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

/**
 * Secondary Gemini 1.5 Flash fallback.
 */
async function callGeminiForRewrites(prompt) {
  const apiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!apiKey) return null;

  let model = process.env.GEMINI_RESUME_MODEL || 'gemini-1.5-flash';
  if (model.endsWith('-latest')) {
    model = model.replace('-latest', '');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post(
      url,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 450,
          responseMimeType: 'application/json',
        },
      },
      {
        timeout: 6000,
        headers: { 'content-type': 'application/json' },
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = extractJson(text);
    return Array.isArray(parsed) ? parsed : (parsed?.rewrites || parsed?.fixes || null);
  } catch (err) {
    console.warn('[ResumeRewriteLLM] Gemini call failed:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

/**
 * Dynamically scans the candidate's extracted resume text and suggests
 * tailored "Before -> After" actionable rewrites for top professional jobs.
 */
async function generateDynamicResumeRewrites({ rawText, targetRole = 'Software Engineer', careerPathSlug = 'p1' }) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 50) {
    return null;
  }

  // 1. Check in-memory cache for instant 0ms return on repeated lookups
  const textHash = crypto.createHash('sha1').update(rawText.slice(0, 1500) + careerPathSlug).digest('hex');
  const cached = getCachedRewrites(textHash);
  if (cached) {
    return cached;
  }

  // 2. Focused bullet & experience extraction: filter candidate bullet-like sentences
  const lines = rawText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && l.length < 250);

  // Pick lines likely to be project/experience bullets
  const candidateLines = lines.slice(0, 25).join('\n');
  const sanitizedText = (candidateLines.length > 100 ? candidateLines : rawText.slice(0, 2000))
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const prompt = `Target Role: "${targetRole}" (Path: ${careerPathSlug})

Extracted Candidate Experience / Bullet Points:
"""
${sanitizedText}
"""

Task:
1. Scan the real bullet points above.
2. Pick 3 distinct sentences from the resume that sound passive, vague, or lack measurable business metrics.
3. For each found line:
   - "tag": One of ["Rewrite", "Quantify", "Tech-Upgrade"]
   - "before": Quote their EXACT sentence from the text above.
   - "after": High-impact rewrite using strong verbs (Engineered, Architected, Spearheaded, Optimized), specific technologies, and measurable outcomes (%, latency, users).
   - "why": 1 concise sentence explaining why recruiters prefer the rewritten version for a professional job.

Return strict JSON:
{
  "rewrites": [
    { "tag": "Rewrite", "before": "exact line from resume", "after": "high-impact rewrite", "why": "concise reason" }
  ]
}`;

  let result = null;

  // 3. Primary: Ultra-fast OpenAI gpt-4o-mini (<1.8s)
  if (process.env.OPENAI_API_KEY) {
    result = await callFastOpenAI(prompt);
  }

  // 4. Secondary: Gemini 1.5 Flash fallback
  if (!Array.isArray(result) || result.length === 0) {
    result = await callGeminiForRewrites(prompt);
  }

  // 5. Validate & normalize result
  if (Array.isArray(result) && result.length > 0) {
    const validRewrites = result
      .filter((item) => item && typeof item.before === 'string' && typeof item.after === 'string' && item.before.trim() && item.after.trim())
      .map((item) => ({
        tag: ['Rewrite', 'Quantify', 'Tech-Upgrade', 'Reorder', 'Leadership', 'Remove', 'Add'].includes(item.tag)
          ? item.tag
          : 'Rewrite',
        before: item.before.trim(),
        after: item.after.trim(),
        why: String(item.why || 'Recruiters and corporate ATS evaluate quantifiable business impact and technical depth over passive task descriptions.').trim(),
      }));

    if (validRewrites.length >= 3) {
      const finalRewrites = validRewrites.slice(0, 4);
      setCachedRewrites(textHash, finalRewrites);
      return finalRewrites;
    }
  }

  return null;
}

module.exports = {
  generateDynamicResumeRewrites,
};
