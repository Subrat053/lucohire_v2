const axios = require('axios');

// Extracts profile data strictly as JSON using Gemini 1.5 Flash.
// param rawText - The raw user input text
// returns Promise with skill, experience_years, location, hourly_rate
const handelExtractProfileDataWithGemini = async (rawText) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_API_KEY is not configured in environment variables.');
    return { skill: null, experience_years: null, location: null, hourly_rate: null };
  }

  const systemPrompt = `You are a strict JSON data extraction engine. Extract only: skill, experience_years, location, and hourly_rate from the user text.

CRITICAL:
Do not invent or add any data not provided by the user.
If a field is missing, set its value strictly to null.
Do not return any conversational filler text.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            parts: [{ text: rawText }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1, // Keep it deterministic
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const candidates = response.data.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts.length > 0) {
      const rawJsonString = candidates[0].content.parts[0].text;
      try {
        const parsedData = JSON.parse(rawJsonString);
        return {
          skill: parsedData.skill || null,
          experience_years: parsedData.experience_years || null,
          location: parsedData.location || null,
          hourly_rate: parsedData.hourly_rate || null,
        };
      } catch (parseError) {
        console.error('Gemini returned invalid JSON:', rawJsonString);
        return { skill: null, experience_years: null, location: null, hourly_rate: null };
      }
    }

    return { skill: null, experience_years: null, location: null, hourly_rate: null };
  } catch (error) {
    console.error('Error fetching data from Gemini API:', error?.response?.data || error.message);
    return { skill: null, experience_years: null, location: null, hourly_rate: null };
  }
}

module.exports = {
  handelExtractProfileDataWithGemini,
};
