const OpenAI = require("openai");
const { z } = require("zod");
const JobPost = require("../models/JobPost");
const WageEstimateCache = require("../models/WageEstimateCache");
const { findNearestCity } = require("../services/cityGeo.service");

// Zod schema for validation of OpenAI output
const estimateSchema = z.object({
  avgWage: z.coerce.number().catch(0),
  minWage: z.coerce.number().catch(0),
  maxWage: z.coerce.number().catch(0),
  confidence: z.coerce.number().min(0).max(1).catch(0.5),
  currency: z.string().catch("INR"),
  topCities: z.any().optional(),
  analysis: z.string().catch(""),
});

/**
 * Gets a wage estimate for a given skill, city, and pricing type.
 * POST /api/wage-estimator
 */
async function getWageEstimate(req, res) {
  try {
    const { latitude, longitude, cityName: rawCityName, country: rawCountry, pricingType, skill } = req.body;

    if (!skill || typeof skill !== "string" || !skill.trim()) {
      return res.status(400).json({ message: "Skill is required and must be a valid string." });
    }

    if (!pricingType || !["hourly", "daily", "fixed", "monthly", "yearly", "gig"].includes(pricingType)) {
      return res.status(400).json({ message: "pricingType must be one of: hourly, daily, fixed, monthly, yearly, gig." });
    }

    let cityName = rawCityName ? String(rawCityName).trim() : "";

    // If coordinates are provided, find nearest seeded city
    if (latitude !== undefined && longitude !== undefined) {
      const nearestCity = await findNearestCity(latitude, longitude);
      if (nearestCity) {
        cityName = nearestCity.cityName;
      }
    }

    if (!cityName && !rawCountry) {
      return res.status(400).json({
        message: "City name or country could not be resolved. Please provide coordinates, a valid city, or country.",
      });
    }

    let cityNameFinal = rawCityName ? String(rawCityName).trim() : (cityName ? String(cityName).trim() : "");
    const normalizedCity = cityNameFinal.toLowerCase();
    const normalizedCountry = (rawCountry ? String(rawCountry) : "India").trim();
    const normalizedSkill = String(skill).trim().toLowerCase();

    // 1. Check cache
    const cacheKey = {
      cityName: normalizedCity || normalizedCountry.toLowerCase(),
      pricingType,
      skill: normalizedSkill,
    };

    const cachedEstimate = await WageEstimateCache.findOne(cacheKey);
    if (cachedEstimate && cachedEstimate.estimate && cachedEstimate.estimate.topCities) {
      return res.status(200).json({
        success: true,
        source: "cache",
        data: cachedEstimate.estimate,
      });
    }

    // 2. Aggregate internal job stats
    // Search both active and inactive jobs for better historical data, prioritizing active jobs
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchQuery = {
      cityName: { $regex: new RegExp("^" + escapeRegExp(cityNameFinal) + "$", "i") },
      pricingType: pricingType,
      skill: { $regex: new RegExp("^" + escapeRegExp(normalizedSkill) + "$", "i") },
    };

    let aggregation = await JobPost.aggregate([
      { $match: { ...matchQuery, isActive: true } },
      {
        $group: {
          _id: null,
          avgMin: { $avg: "$minBudget" },
          avgMax: { $avg: "$maxBudget" },
          minVal: { $min: "$minBudget" },
          maxVal: { $max: "$maxBudget" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Fallback to inactive jobs if no active jobs exist for this category
    if (aggregation.length === 0) {
      aggregation = await JobPost.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            avgMin: { $avg: "$minBudget" },
            avgMax: { $avg: "$maxBudget" },
            minVal: { $min: "$minBudget" },
            maxVal: { $max: "$maxBudget" },
            count: { $sum: 1 },
          },
        },
      ]);
    }

    const hasStats = aggregation.length > 0;
    const stats = hasStats
      ? {
          count: aggregation[0].count,
          avgMin: Math.round(aggregation[0].avgMin),
          avgMax: Math.round(aggregation[0].avgMax),
          minVal: aggregation[0].minVal,
          maxVal: aggregation[0].maxVal,
        }
      : { count: 0, avgMin: 0, avgMax: 0, minVal: 0, maxVal: 0 };

    // 3. Call OpenAI for estimation
    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({ message: "OpenAI API key is not configured on the server." });
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a professional local labor market wage estimator. Your goal is to estimate the average, minimum, and maximum local market rates for a specific skill in ${cityNameFinal ? cityNameFinal + ', ' : ''}${normalizedCountry}.
You must return only a JSON object.

Input parameters:
- Skill: ${skill}
- Location: ${cityNameFinal ? cityNameFinal + ', ' : ''}${normalizedCountry}
- Pricing Type: ${pricingType}

Historical platform data:
- Number of similar jobs in database: ${stats.count}
- Minimum salary/budget in database: ${stats.minVal}
- Maximum salary/budget in database: ${stats.maxVal}
- Average minimum budget: ${stats.avgMin}
- Average maximum budget: ${stats.avgMax}

Please estimate the current realistic local market rate (in local currency) for this request. Consider local living costs in ${cityNameFinal || normalizedCountry}, demand for ${skill}, and the pricing model (${pricingType}).
If historical platform data is insufficient (count is 0 or low), rely on your general knowledge of the job market, prioritizing local factors for ${cityNameFinal || normalizedCountry}.
CRITICAL: The "topCities" MUST ONLY include cities located strictly inside ${normalizedCountry}. Do NOT return international cities like San Francisco or New York unless ${normalizedCountry} is the United States.
CRITICAL: The "currency" MUST be the official currency of ${normalizedCountry} (e.g. INR for India). Under no circumstances should you return USD unless ${normalizedCountry} is the United States.

Response JSON structure:
{
  "avgWage": number (estimated average wage/salary in local currency),
  "minWage": number (estimated realistic minimum wage/salary in local currency),
  "maxWage": number (estimated realistic maximum wage/salary in local currency),
  "confidence": number (your confidence score from 0.0 to 1.0 based on availability of data/familiarity),
  "currency": string (the 3-letter currency code, e.g., "INR", "USD", "EUR"),
  "topCities": ["string", "string"] (list of 3-4 top cities with the highest demand for this skill in the specified country),
  "analysis": string (a concise 2-3 sentences explaining the estimate, highlighting local trends or demand)
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate wage estimate for "${skill}" in "${cityNameFinal || normalizedCountry}" using pricing type "${pricingType}".` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    const parsedData = JSON.parse(content);

    // Validate with Zod
    const validated = estimateSchema.parse(parsedData);


    // Normalize topCities if it came back as a string
    if (typeof validated.topCities === "string") {
      validated.topCities = validated.topCities.split(",").map(s => s.trim());
    } else if (!Array.isArray(validated.topCities)) {
      validated.topCities = [];
    }

    // Hard override to guarantee INR for India
    if (normalizedCountry.toLowerCase() === "india") {
      validated.currency = "INR";
    }

    // Save to Cache (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await WageEstimateCache.findOneAndUpdate(
      cacheKey,
      {
        $set: {
          estimate: validated,
          expiresAt,
        }
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      source: "api",
      data: validated,
    });
  } catch (error) {
    console.error("Error in wage estimator controller:", error);
    try {
      require('fs').appendFileSync('wage_error.log', new Date().toISOString() + ' - ' + (error.stack || error) + '\n');
    } catch(e) {}
    if (error instanceof z.ZodError) {
      return res.status(500).json({
        message: "Failed to validate AI wage estimate response.",
        error: error.errors,
      });
    }
    return res.status(500).json({ message: "Internal server error during wage estimation.", error: String(error) });
  }
}

module.exports = {
  getWageEstimate,
};
