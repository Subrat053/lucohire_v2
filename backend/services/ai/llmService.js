const axios = require('axios');

const AIPromptTemplate = require('../../models/AIPromptTemplate');

function hasAnthropicKey() {
  return Boolean(String(process.env.ANTHROPIC_API_KEY || '').trim());
}

function hasOpenAIKey() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

function hasGeminiKey() {
  return Boolean(String(process.env.GEMINI_API_KEY || '').trim());
}

async function callGeminiFlashLite(prompt) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return { used: false, reason: 'GEMINI_API_KEY missing' };
  }

  const model = process.env.GEMINI_RESUME_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstructionText = await AIPromptTemplate.getActivePrompt('resume_parser');

  try {
    const response = await axios.post(
      url,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
        systemInstruction: {
          parts: [{
            text: systemInstructionText
          }]
        }
      },
      {
        timeout: Number(process.env.PROVIDER_AI_LLM_TIMEOUT_MS || 45000),
        headers: { 'content-type': 'application/json' },
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = extractJson(text);
    if (!parsed) return { used: false, reason: 'Gemini response parse failed' };

    // Record AI Usage Log for Gemini
    try {
      const AIUsageLog = require('../../models/AIUsageLog');
      const promptTokens = response.data?.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
      const candidateTokens = response.data?.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
      const totalTokens = promptTokens + candidateTokens;
      const estimatedCostUsd = (promptTokens * 0.000000075) + (candidateTokens * 0.0000003);

      AIUsageLog.create({
        provider: 'gemini',
        model,
        inputTokens: promptTokens,
        outputTokens: candidateTokens,
        totalTokens,
        estimatedCostUsd,
        featureKey: 'candidate_grow_with_ai',
        feature: 'candidate_grow_with_ai',
        featureName: 'AI Interview Prep & Mock Simulator',
        role: 'candidate'
      }).catch(() => {});
    } catch (_) {}

    return { used: true, provider: 'gemini', output: parsed };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.warn('[Gemini] Request failed:', msg);
    return { used: false, reason: `Gemini request failed: ${msg}` };
  }
}

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

async function callAnthropic(prompt) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) {
    return { used: false, reason: 'ANTHROPIC_API_KEY missing' };
  }

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
        max_tokens: 700,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        timeout: Number(process.env.PROVIDER_AI_LLM_TIMEOUT_MS || 45000),
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      }
    );

    const text = response.data?.content?.[0]?.text || '';
    const parsed = extractJson(text);
    if (!parsed) return { used: false, reason: 'LLM response parse failed' };

    return { used: true, provider: 'anthropic', output: parsed };
  } catch (error) {
    return { used: false, reason: `LLM request failed: ${error.message}` };
  }
}

async function callOpenAI(prompt) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return { used: false, reason: 'OPENAI_API_KEY missing' };
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Return strict JSON only.' },
          { role: 'user', content: prompt },
        ],
      },
      {
        timeout: Number(process.env.PROVIDER_AI_LLM_TIMEOUT_MS || 45000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
      }
    );

    const text = response.data?.choices?.[0]?.message?.content || '';
    console.log('[OpenAI Raw Text Response]:\n', text);
    const parsed = extractJson(text);
    if (!parsed) {
      console.log('[OpenAI Parsing Failed]: Could not extract JSON from the text.');
      return { used: false, reason: 'LLM response parse failed' };
    }

    // Record AI Usage Log for OpenAI
    try {
      const AIUsageLog = require('../../models/AIUsageLog');
      const inputTokens = response.data?.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
      const outputTokens = response.data?.usage?.completion_tokens || Math.ceil(text.length / 4);
      const totalTokens = response.data?.usage?.total_tokens || (inputTokens + outputTokens);
      const estimatedCostUsd = (inputTokens * 0.00000015) + (outputTokens * 0.0000006);

      AIUsageLog.create({
        provider: 'openai',
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd,
        featureKey: 'candidate_resume_ats',
        feature: 'candidate_resume_ats',
        featureName: 'AI ATS Optimizer & Resume Generator',
        role: 'candidate'
      }).catch(() => {});
    } catch (_) {}

    return { used: true, provider: 'openai', output: parsed };
  } catch (error) {
    return { used: false, reason: `LLM request failed: ${error.message}` };
  }
}

async function generateStructuredProviderReply({ message, intent, extracted, profileContext = {}, recentMessages = [] }) {
  const prompt = [
    'You are an expert AI assistant helping local Indian service providers complete their profiles.',
    'Analyze the provider\'s message and conversation history to extract all possible profile details.',
    'Strict rules for extraction:',
    '1. Do not hallucinate. If a detail is not explicitly mentioned or inferred from the text, set it to null.',
    '2. For "tier", classify as unskilled, semi-skilled, or skilled. If unsure, set null.',
    '3. For "pricingType", classify as hourly, daily, monthly, or fixed. If unsure, set null.',
    '4. For "phone", extract valid phone numbers. If not mentioned, set null.',
    '5. Return strict JSON with exactly these keys: name, skill, tier, experience, location, phone, pricing, pricingType, description, languages, reply, suggestions.',
    '6. If information is missing, ask the provider for the missing mandatory fields one by one in Hinglish/Hindi.',
    `intent: ${intent}`,
    `message: ${message}`,
    `extracted: ${JSON.stringify(extracted)}`,
    `profileContext: ${JSON.stringify(profileContext)}`,
    `recentMessages: ${JSON.stringify(recentMessages.slice(-6))}`,
  ].join('\n');

  if (hasAnthropicKey()) {
    const anthropicResult = await callAnthropic(prompt);
    if (anthropicResult.used) return anthropicResult;
    return anthropicResult;
  }

  if (hasOpenAIKey()) {
    return callOpenAI(prompt);
  }

  return { used: false, reason: 'ANTHROPIC_API_KEY and OPENAI_API_KEY missing' };
}

async function getLLMHealth() {
  const hasAnthropic = hasAnthropicKey();
  const hasOpenAI = hasOpenAIKey();

  if (!hasAnthropic && !hasOpenAI) {
    return { status: 'missing_key', hasAnthropicKey: false, hasOpenAIKey: false };
  }

  return {
    status: 'connected',
    hasAnthropicKey: hasAnthropic,
    hasOpenAIKey: hasOpenAI,
  };
}

const ALL_SKILLS = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Driver",
  "Cook",
  "Welder",
  "Mason",
  "AC Technician",
  "CCTV Installer",
  "Tiler",
  "Interior Designer",
  "UI/UX Designer",
  "Graphic Designer",
  "Web Developer",
  "Mobile Developer",
  "Content Writer",
  "Digital Marketer",
  "Accountant",
  "Data Entry Operator",
  "Receptionist",
  "Security Guard",
  "Housekeeping",
  "Nurse",
  "Caretaker",
  "Tailor",
  "Beautician",
  "Yoga Trainer",
  "Tutor",
];

async function parseResumeText(resumeText) {
  const prompt = `
You are an expert resume-to-service-provider-profile parser.

Extract only information that is clearly present in the resume text.
Do not hallucinate.
If data is missing, return null or empty array.

Return ONLY valid JSON. No markdown. No explanation.

Target profile fields are for a ServiceHub provider profile.

STRICT OUTPUT JSON SCHEMA:
{
  "fullName": string | null,
  "email": string | null,
  "contactNumber": string | null,
  "bio": string | null,
  "skills": string[],
  "specialities": string[],
  "skillLevel": "unskilled" | "semi_skilled" | "skilled" | null,
  "experienceYears": string | number | null,
  "serviceCategory": string | null,
  "servicesOffered": string[],
  "pricing": number | null,
  "pricingType": "hourly" | "daily" | "monthly" | "fixed" | null,
  "city": string | null,
  "serviceLocations": string[],
  "languages": string[],
  "certifications": string[],
  "portfolioLinks": [
    {
      "platform": "LinkedIn" | "GitHub" | "Behance" | "Dribbble" | "Instagram" | "Facebook" | "Personal Website",
      "url": string
    }
  ],
  "previousWork": string[],
  "availability": "full-time" | "part-time" | "flexible" | null,
  "whatsappAlerts": boolean | null
}

FIELD RULES:
1. fullName: candidate name only.
2. contactNumber: phone/WhatsApp number, digits only with country code if present.
3. bio: create a short professional bio only from available resume facts.
4. skills: Extract service skills. You MUST extract BOTH the raw technical/specialized tools mentioned in the text (e.g. "ReactJS", "Node", "MongoDB", "AutoCAD") AND map the overall role to the standardized catalog of allowed skills:
   ${JSON.stringify(ALL_SKILLS)}
   For example, if the resume says "Developed APIs using Node.js and Express", your skills array should contain: ["Web Developer", "Node.js", "Express", "API Development"].
   Be aggressive in extracting any specialized software, languages, or tools mentioned as skills.
5. specialities: Same as selected role/speciality field. Extract from the resume and map them to their core domains (e.g., "Frontend Development", "Database Management", "UI/UX Design").
6. skillLevel:
   - "unskilled" if no experience or helper/basic work.
   - "semi_skilled" if 1-2 years or some field experience.
   - "skilled" if 3+ years, certifications, or strong work history.
7. experienceYears: Extract total years of experience from phrases like:
   - "3 years experience" -> "3 years"
   - "worked from 2020 to 2024" -> calculate and return "4 years"
   - "5+ years" -> "5+ years"
   - "fresher" -> "fresher"
   - "internship" -> count internship durations as experience (e.g. "3 months internship" -> "3 months" or "0.25 years")
   - "research assistant for 2 years" -> "2 years"
   If no explicit experience year number is mentioned, but work history exists, estimate approximate experience only when clearly supported by dates. Sum all work history durations to calculate. Do not leave blank if resume clearly mentions experience.
8. serviceCategory: infer only from skills/work title.
9. servicesOffered: list actual services the person can provide.
10. pricing: extract expected salary/rate/payment if mentioned. Otherwise null.
11. pricingType:
   - hourly if per hour mentioned
   - daily if per day mentioned
   - monthly if salary/month mentioned
   - fixed if project/fixed price mentioned
   - null if not mentioned
12. city: extract current city/location.
13. serviceLocations: cities/localities where candidate can work.
14. languages: Extract spoken/written languages. Explicitly scan for, detect, and map languages mentioned in the resume (especially common Indian languages like Hindi, English, Odia, Bengali, Telugu, Tamil, Marathi, Gujarati, Punjabi, Urdu, Kannada, Malayalam, etc.) to proper capitalized standard spelling (e.g., "Hindi", "English", "Tamil"). Return them as a string array. If none are found, return empty array.
15. certifications: certificates, licenses, courses, Aadhaar/PAN should NOT be certification.
16. portfolioLinks: Extract all URLs from the resume text. Detect their platforms: 
    - linkedin.com -> LinkedIn
    - github.com -> GitHub
    - behance.net -> Behance
    - dribbble.com -> Dribbble
    - instagram.com -> Instagram
    - facebook.com -> Facebook
    - any personal domain/other -> Personal Website
    Normalize each URL: add "https://" if missing, remove trailing punctuation, and validate URL format.
17. previousWork: previous company/project/work experience summary.
18. availability: full-time, part-time, flexible only if mentioned.
19. whatsappAlerts: true only if resume clearly says WhatsApp preferred/available; otherwise null.

Resume Text:
${resumeText}
`;

  // Priority: OpenAI → Gemini → Anthropic
  if (hasOpenAIKey()) {
    const openaiResult = await callOpenAI(prompt);
    if (openaiResult.used) return openaiResult;
    console.warn('[parseResumeText] OpenAI failed, falling back:', openaiResult.reason);
  }

  if (hasGeminiKey()) {
    const geminiResult = await callGeminiFlashLite(prompt);
    if (geminiResult.used) return geminiResult;
    console.warn('[parseResumeText] Gemini failed, falling back:', geminiResult.reason);
  }

  if (hasAnthropicKey()) {
    const anthropicResult = await callAnthropic(prompt);
    if (anthropicResult.used) return anthropicResult;
    console.warn('[parseResumeText] Anthropic failed, falling back:', anthropicResult.reason);
  }

  return { used: false, reason: "All AI providers failed or API keys missing" };
}

async function expandSkillsWithAI(baseSkills) {
  if (!baseSkills || baseSkills.length === 0) return [];
  
  const prompt = `You are an expert HR and recruitment AI.
Given the following list of skills or job roles: [${baseSkills.join(', ')}],
Generate an array of 5 to 10 closely related job titles, alternate skill names, or subsets of this role that a person with these skills could also apply for.
For example, if the input is "Full Stack Developer", output might include "Frontend Developer", "Backend Developer", "React Developer", "Node.js Developer".
Return ONLY a valid JSON array of strings. Do not include markdown formatting or any other text.`;

  try {
    let result;
    if (hasGeminiKey()) {
      result = await callGeminiFlashLite(prompt);
      if (!result.used && hasOpenAIKey()) {
        console.warn('[expandSkillsWithAI] Gemini failed, falling back to OpenAI');
        result = await callOpenAI(prompt);
      }
    } else if (hasOpenAIKey()) {
      result = await callOpenAI(prompt);
    }

    if (result && result.used && result.output) {
      if (Array.isArray(result.output)) {
        return result.output.filter(s => typeof s === 'string');
      }
    }
  } catch (err) {
    console.error('[expandSkillsWithAI] Failed to expand skills:', err);
  }
  return [];
}

module.exports = {
  generateStructuredProviderReply,
  getLLMHealth,
  parseResumeText,
  expandSkillsWithAI,
  callOpenAI,
  callGeminiFlashLite,
  hasOpenAIKey,
  hasGeminiKey,
  extractJson,
};
