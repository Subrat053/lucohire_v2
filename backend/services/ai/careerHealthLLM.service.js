const { callOpenAI, callGeminiFlashLite, hasOpenAIKey, hasGeminiKey } = require('./llmService');
const logger = require('../../utils/logger');

async function generateCareerHealthReport(parsedProfileData, existingReport = null) {
  const basePrompt = `
You are an expert Career Coach and AI Analyst for a professional service platform.
Your job is to analyze the following extracted candidate profile data and generate a comprehensive "Career Health Report".

Extract and infer the following deeply analytical metrics. Return ONLY valid JSON.
Do not include markdown, explanation, or comments.

IMPORTANT: When generating "market_insights" (especially avgSalary, topCities, and jobsInDemand), you MUST base them EXACTLY on the Indian market. Even if the candidate's profile data indicates a location outside of India (e.g. US), you MUST assume they are targeting roles in India. Ensure the salary and cities reflect the local Indian market realistically. "topCities" MUST only contain Indian cities.

STRICT OUTPUT JSON SCHEMA:
{
  "career_health_score": number,
  "employability_score": number,
  "salary_growth_score": number,
  "market_demand_score": number,
  "future_readiness_score": number,
  "ai_resistance_score": number,
  "summary": string, // 1-2 sentence encouraging but honest summary of overall career health
  "top_strengths": string[], // 3-4 deep, highly specific strengths identified from their skills and experience
  "top_weaknesses": string[], // 2-3 specific areas for improvement or missing elements in their profile
  "next_best_actions": string[], // 3 highly actionable, prioritized next steps they can take today to improve their score
  "employability_breakdown": {
    "core_skills_match": number,
    "experience_relevance": number,
    "resume_formatting": number
  },
  "salary_growth_breakdown": {
    "industry_benchmark": number,
    "promotion_velocity": number,
    "skill_scarcity": number
  },
  "market_demand_breakdown": {
    "job_openings_trend": number,
    "remote_opportunities": number,
    "industry_growth_rate": number
  },
  "future_readiness_breakdown": {
    "trend_alignment": number,
    "continuous_learning": number,
    "adaptability_indicators": number
  },
  "ai_resistance_breakdown": {
    "automation_risk_inverted": number,
    "creative_thinking": number,
    "strategic_complexity": number
  },
  "overall_fit_score": number,
  "target_role": string,
  "expected_salary_range": string,
  "ai_tip": string,
  "radar_data": [
    { "subject": string, "A": number, "fullMark": 100 }
  ],
  "role_fit_breakdown": [
    { "name": string, "score": number, "benchmark": number }
  ],
  "skills_to_improve": [
    { "name": string, "score": number, "impact": string, "impactColor": string }
  ],
  "in_demand_skills": string[],
  "market_insights": {
    "jobsInDemand": string,
    "jobsGrowth": string,
    "avgSalary": string,
    "salaryGrowth": string,
    "topCities": string
  },
  "career_growth_path": [ // Generate an extensive and highly detailed career roadmap with 7 to 10 sequential roles, showing a complete long-term trajectory all the way up to executive/leadership levels (e.g., Junior -> Mid -> Senior -> Lead -> Principal -> Director -> VP -> Head/C-Level).
    { "title": string, "status": string, "current": boolean, "description": string }
  ]
}

All scores must be integers between 0 and 100. Provide a realistic, analytical, and professional assessment based on the provided profile. Do not inflate scores blindly.`;

  const prompt = existingReport
    ? `${basePrompt}

CRITICAL IMPROVEMENT TASK:
You are provided with the user's CURRENT Career Health Report below. Your task is to vastly IMPROVE this report. 
Do not just return the same data. Dive deeper into the candidate's profile to extract more nuanced, highly detailed, and radically practical insights. Provide much more advanced "next_best_actions" and identify deeply hidden "top_strengths" and "top_weaknesses" that a senior career coach would notice. Re-evaluate the scores critically.

Current Report:
${JSON.stringify(existingReport, null, 2)}

Candidate Profile Data:
${JSON.stringify(parsedProfileData, null, 2)}
`
    : `${basePrompt}

Candidate Profile Data:
${JSON.stringify(parsedProfileData, null, 2)}
`;

  // Priority: Gemini -> OpenAI
  if (hasGeminiKey()) {
    const geminiResult = await callGeminiFlashLite(prompt);
    if (geminiResult.used) return geminiResult;
    logger.warn('[CareerHealthLLM] Gemini failed, falling back:', geminiResult.reason);
  }

  if (hasOpenAIKey()) {
    const openaiResult = await callOpenAI(prompt);
    if (openaiResult.used) return openaiResult;
    logger.warn('[CareerHealthLLM] OpenAI failed, falling back:', openaiResult.reason);
  }

  return { used: false, reason: "All AI providers failed or API keys missing" };
}

module.exports = {
  generateCareerHealthReport,
};
