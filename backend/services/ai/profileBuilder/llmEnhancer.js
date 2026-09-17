const axios = require("axios");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.PROFILE_BUILDER_LLM_MODEL || "gpt-3.5-turbo";
const DEFAULT_TIMEOUT_MS = Math.max(
  1500,
  Number(process.env.PROFILE_BUILDER_LLM_TIMEOUT_MS || 10000),
);

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function extractTextFromOpenAIResponse(payload) {
  return String(payload?.choices?.[0]?.message?.content || "").trim();
}

function safeJsonParse(raw) {
  if (!raw || typeof raw !== "string") return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch && fencedMatch[1]) {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch (__) {
        return null;
      }
    }

    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      } catch (__) {
        return null;
      }
    }

    return null;
  }
}

function sanitizeString(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function sanitizeSkillArray(candidateSkills, fallbackSkills) {
  const merged = [
    ...(Array.isArray(fallbackSkills) ? fallbackSkills : []),
    ...(Array.isArray(candidateSkills) ? candidateSkills : []),
  ];

  return Array.from(
    new Set(merged.map((item) => String(item || "").trim()).filter(Boolean)),
  ).slice(0, 10);
}

async function enhanceWithLLM(parserData, options = {}) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const llmEnabled = parseBool(process.env.PROFILE_BUILDER_LLM_ENABLED, false)
    && parseBool(process.env.AI_FEATURES_ENABLED, false)
    && parseBool(process.env.AI_PROFILE_ENABLED, false);

  if (!llmEnabled || !apiKey) {
    return {
      source: "rule_based",
      data: parserData,
      usedLLM: false,
      reason: llmEnabled ? "openai_key_missing" : "llm_disabled",
    };
  }

  const timeoutMs = Math.max(
    1500,
    Number(options.timeoutMs || DEFAULT_TIMEOUT_MS),
  );

  const prompt = [
    "You are improving provider profile JSON for a service marketplace.",
    "Rules:",
    "- Return JSON only.",
    "- Keep city, category, languages, experienceMonths, experienceLabel unchanged unless empty.",
    "- Do not invent a different role/category than parser output.",
    "- Improve only headline, description, and optionally enrich skills list.",
    "- In the description, weave the provider's skills and experience together into a professional and engaging bio without referencing any generic placeholders.",
    "- Keep output concise and production-safe.",
    "",
    "Current parser JSON:",
    JSON.stringify(parserData),
  ].join("\n");

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: DEFAULT_MODEL,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        temperature: 0.15,
      },
      {
        timeout: timeoutMs,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const raw = extractTextFromOpenAIResponse(response.data);
    const candidate = safeJsonParse(raw);
    
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      return {
        source: "rule_based",
        data: parserData,
        usedLLM: false,
        reason: "invalid_llm_json",
      };
    }

    const next = {
      ...parserData,
      headline: sanitizeString(candidate.headline, parserData.headline),
      description: sanitizeString(
        candidate.description,
        parserData.description,
      ),
      skills: sanitizeSkillArray(candidate.skills, parserData.skills),
    };

    return {
      source: "llm_enhanced",
      data: next,
      usedLLM: true,
    };
  } catch (error) {
    console.error("OpenAI enhance error:", error.response?.data || error.message);
    return {
      source: "rule_based",
      data: parserData,
      usedLLM: false,
      reason: {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        model: DEFAULT_MODEL,
      },
    };
  }
}

module.exports = {
  enhanceWithLLM,
};

