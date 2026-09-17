const axios = require('axios');

// Extracts profile data strictly as JSON using GPT-4o-mini.
// param rawText - The raw user input text
// returns Promise with skill, experience_years, location, hourly_rate
const handelExtractProfileDataWithOpenAi = async (rawText) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY is not configured in environment variables.');
    return { skill: null, experience_years: null, location: null, hourly_rate: null };
  }

  const systemPrompt = `You are a strict JSON data extraction engine. Extract only: skill, experience_years, location, and hourly_rate from the user text.

CRITICAL:
Do not invent or add any data not provided by the user.
If a field is missing, set its value strictly to null.
Do not return any conversational filler text.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Keep it deterministic
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000,
      }
    );

    const messageContent = response.data.choices?.[0]?.message?.content;
    if (messageContent) {
      try {
        const parsedData = JSON.parse(messageContent);
        return {
          skill: parsedData.skill || null,
          experience_years: parsedData.experience_years || null,
          location: parsedData.location || null,
          hourly_rate: parsedData.hourly_rate || null,
        };
      } catch (parseError) {
        console.error('OpenAI returned invalid JSON:', messageContent);
        return { skill: null, experience_years: null, location: null, hourly_rate: null };
      }
    }

    return { skill: null, experience_years: null, location: null, hourly_rate: null };
  } catch (error) {
    console.error('Error fetching data from OpenAI API:', error?.response?.data || error.message);
    return { skill: null, experience_years: null, location: null, hourly_rate: null };
  }
};

const handlePricingSuggestionWithOpenAi = async (skill, city, experience, marketStats) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY is not configured in environment variables.');
    return { status: 'error', output: {} };
  }

  const systemPrompt = `You are an expert pricing consultant for service providers in ${city || 'their local area'}, India.
Your task is to analyze the user's role, their specific location, and their years of experience to suggest fair pricing.
You must output ONLY valid JSON format.

CRITICAL INSTRUCTIONS:
1. Base your prices on the most recent real-world market rates in India for this specific city.
2. The pricing must be mathematically aligned:
   - Assuming 8 working hours per day and 22 working days per month.
   - Example: If Monthly is ₹30000, then Daily should be around ₹1360, and Hourly should be around ₹170. Do NOT give drastically unaligned rates.
3. Keep the reasoning concise but highlight the specific location and experience level.

JSON Schema:
{
  "min": number (Minimum suggested MONTHLY price in INR),
  "max": number (Maximum suggested MONTHLY price in INR),
  "avg": number (Average recommended MONTHLY price in INR),
  "reasoning": string,
  "confidence": number (Between 0.0 and 1.0)
}`;

  const userPrompt = `Role: ${skill || 'Service Provider'}
Location (City/Area): ${city || 'India'}
Experience: ${experience || 'Not specified'}
Historical Market Data (if any): Min ₹${marketStats?.avgMin || 0}, Max ₹${marketStats?.avgMax || 0}`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 12000,
      }
    );

    const messageContent = response.data.choices?.[0]?.message?.content;
    if (messageContent) {
      try {
        const parsedData = JSON.parse(messageContent);
        return {
          status: 'success',
          model: 'gpt-4o-mini',
          output: {
            min: Number(parsedData.min || 0),
            max: Number(parsedData.max || 0),
            avg: Number(parsedData.avg || 0),
            reasoning: parsedData.reasoning || 'Based on AI market analysis.',
            confidence: Number(parsedData.confidence || 0.6)
          }
        };
      } catch (parseError) {
        return { status: 'error', output: {} };
      }
    }
    return { status: 'error', output: {} };
  } catch (error) {
    console.error('Error fetching pricing from OpenAI:', error?.response?.data || error.message);
    return { status: 'error', output: {} };
  }
};

module.exports = {
  handelExtractProfileDataWithOpenAi,
  handlePricingSuggestionWithOpenAi,
};
