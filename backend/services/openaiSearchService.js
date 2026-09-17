const OpenAI = require("openai");
const axios = require("axios");

/**
 * Helper to translate raw query into English using Google Translate API.
 * Auto-detects the source language (crucial for Hindi, Hinglish, regional scripts).
 */
const translateQueryToEnglish = async (text) => {
  const apiKey = String(
    process.env.GOOGLE_TRANSLATE_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_VISION_API_KEY ||
    ""
  ).trim();

  if (!apiKey) {
    console.warn("[GOOGLE TRANSLATE WARNING] No Google Translate API key found in environment variables (tried GOOGLE_TRANSLATE_API_KEY, GOOGLE_API_KEY, GOOGLE_PLACES_API_KEY, GOOGLE_VISION_API_KEY).");
    return text;
  }

  if (!text || !String(text).trim()) return text;

  try {
    const endpoint = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
    const response = await axios.post(
      endpoint,
      {
        q: [String(text).trim()],
        target: "en",
        format: "text"
      },
      {
        timeout: 10000,
        headers: { "Content-Type": "application/json" }
      }
    );

    const translations = response?.data?.data?.translations;
    if (Array.isArray(translations) && translations.length > 0) {
      const translatedText = String(translations[0].translatedText || "")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
      
      // console.log(`[GOOGLE TRANSLATE SUCCESS] Translated query: "${text}" -> "${translatedText}" (Detected: ${translations[0].detectedSourceLanguage || 'unknown'})`);
      return translatedText || text;
    }
  } catch (error) {
    console.error("[GOOGLE TRANSLATE ERROR] Direct call failed:", error.response?.data || error.message);
  }
  return text;
};

/**
 * Parses search query using Google Translate + OpenAI to extract skill and location.
 * Translates queries in other languages internally to English using Google Translate first,
 * then sends both original and English translation to OpenAI for structured JSON extraction.
 *
 * @param {string} query
 * @returns {Promise<{skill: string|null, location: string|null}>}
 */
const extractSearchFilters = async (query) => {
  const originalText = String(query || "").trim();
  let translatedText = originalText;

  // 1. Direct Google Translate Call with Auto-Detection
  if (originalText) {
    translatedText = await translateQueryToEnglish(originalText);
  }

  // 2. OpenAI Structured Extraction Layer
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured in the environment.");
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an information extraction engine.

Original User Input:
"${originalText}"

English Translation:
"${translatedText}"

Extract only:

1. skill
2. location

Rules:

- Return JSON only.
- If skill is not present return null.
- If location is not present return null.
- Do not invent values.
- Do not infer values.
- Ignore company names.
- Ignore salary information.
- Ignore experience information.
- Ignore job type.
- Ignore all unrelated text.`
        },
        {
          role: "user",
          content: `Extract from query: "${originalText}"`,
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    const extractedSkill = parsed.skill || null;
    const extractedLocation = parsed.location || null;

    // console.log({
    //   originalText,
    //   translatedText,
    //   extractedSkill,
    //   extractedLocation
    // });

    return {
      skill: extractedSkill,
      location: extractedLocation,
    };
  } catch (error) {
    console.error("[OPENAI EXTRACTION ERROR] Exception thrown during OpenAI API call:", error.message);
    throw error;
  }
};

module.exports = {
  extractSearchFilters,
};
