const { callOpenAI } = require('./llmService');

async function getCareerGPSAnalysis(parsedData, existingReport = null) {
  let extraContext = '';
  if (existingReport) {
    extraContext = `
Previous Analysis Report:
${JSON.stringify(existingReport, null, 2)}

This is the latest profile data. Please provide an improved and deeper analysis taking into account the previous report and focusing on what has changed or how the previous recommendations can be expanded upon.
`;
  }

  const prompt = `
You are LucoHire AI Decision Engine. Task: recommend next career path.
Use only provided data. Do not assume missing facts.
Return valid JSON only. Max 5 items per array. No explanation outside JSON.
${extraContext}

Input Data:
${JSON.stringify(parsedData, null, 2)}

Output Schema:
{
  "current_role": string,
  "recommended_next_role": string,
  "alternative_roles": string[],
  "required_skills": string[],
  "missing_skills": string[],
  "estimated_timeline_months": number | string,
  "salary_growth_potential_percent": number,
  "learning_path": [
    {
      "step": string,
      "description": string
    }
  ],
  "reasoning_summary": string
}
  `;

  const result = await callOpenAI(prompt);
  if (!result.used) {
    throw new Error(result.reason || 'Failed to generate Career GPS');
  }
  return result.output;
}

async function getHiringBarriersAnalysis(parsedData, marketSkills = [], existingReport = null) {
  const marketSkillsContext = marketSkills.length > 0 
    ? `\nMarket Skills (Extracted from real recent job postings for this role):\n${JSON.stringify(marketSkills, null, 2)}\n\nInstructions for skill_issues:\nIdentify the top trending skills from the Market Skills provided. Compare the candidate's skills against these trending skills. If the candidate is missing critical trending skills, explicitly list them in the skill_issues array.`
    : `\nInstructions for skill_issues:\nAnalyze the candidate's skills and list any missing critical skills commonly required for this role.`;

  let extraContext = '';
  if (existingReport) {
    extraContext = `\nPrevious Analysis Report:\n${JSON.stringify(existingReport, null, 2)}\n\nThis is the latest profile data. Please provide an improved and deeper analysis taking into account the previous report and focusing on what has changed.\n`;
  }

  const prompt = `
You are LucoHire AI Decision Engine. Task: identify hiring barriers.
Analyze why this candidate might not be getting hired based on their resume data.
Use only provided data. Do not assume missing facts.
Return valid JSON only. Max 5 items per array. No explanation outside JSON.
${extraContext}

Input Data:
${JSON.stringify(parsedData, null, 2)}
${marketSkillsContext}

Output Schema:
{
  "hiring_barrier_score": number, // out of 100 (lower is better, meaning fewer barriers)
  "top_reasons": string[],
  "resume_issues": string[],
  "skill_issues": string[],
  "salary_or_location_issues": string[],
  "immediate_action_plan": [
    {
      "action": string,
      "priority": "High" | "Medium" | "Low"
    }
  ]
}
  `;

  const result = await callOpenAI(prompt);
  if (!result.used) {
    throw new Error(result.reason || 'Failed to generate Hiring Barriers analysis');
  }
  return result.output;
}

async function getSkillGapAnalysis(parsedData, jobDescription, existingReport = null) {
  let extraContext = '';
  if (existingReport) {
    extraContext = `\nPrevious Analysis Report:\n${JSON.stringify(existingReport, null, 2)}\n\nThis is the latest profile data. Please provide an improved and deeper analysis taking into account the previous report and focusing on what has changed.\n`;
  }

  const prompt = `
You are LucoHire AI Decision Engine. Task: compare candidate with job description and skill gap.
Use only provided data. Do not assume missing facts.
Return compact valid JSON only. Max 5 items per array. No explanation outside JSON.
${extraContext}

Candidate Data:
${JSON.stringify(parsedData, null, 2)}

Job Description:
${jobDescription}

Output schema:
{
  "job_match_score": number, // out of 100
  "matched_skills": string[],
  "missing_critical_skills": string[],
  "missing_optional_skills": string[],
  "fastest_hire_path": string, // Actionable path to bridge the gap
  "hire_ready_after": string // e.g. "1 month", "2 weeks"
}
  `;

  const result = await callOpenAI(prompt);
  if (!result.used) {
    throw new Error(result.reason || 'Failed to generate Skill Gap analysis');
  }
  return result.output;
}

async function getAtsOptimizerAnalysis(parsedData, jobDescription) {
  const prompt = `
You are LucoHire AI Decision Engine. Task: optimize resume for ATS without adding fake experience.
Use only provided data. Do not assume missing facts.
Return compact valid JSON only. Generate AT LEAST 5 specific bullet points for specific_recommendations. No explanation outside JSON.
Provide highly specific and actionable recommendations (e.g., exactly what keywords to add and to which section).

Candidate Data:
${JSON.stringify(parsedData, null, 2)}

Job Description:
${jobDescription}

Output schema:
{
  "ats_score_before": number, // out of 100
  "ats_score_after": number, // out of 100
  "missing_keywords": string[],
  "added_keywords": string[],
  "specific_recommendations": string[], // Actionable bullet points explaining exactly where and how to improve the resume (e.g. "Add 'React' to the Skills section", "Rewrite bullet 2 of Experience X to include 'Node.js'")
  "improved_summary": string,
  "warnings": string[] // e.g., "Do not add fake experience for X"
}
  `;

  const result = await callOpenAI(prompt);
  if (!result.used) {
    throw new Error(result.reason || 'Failed to generate ATS Optimizer analysis');
  }
  return result.output;
}

async function getJobMatchingEngineAnalysis(parsedData, jobsData) {
  const prompt = `
You are LucoHire AI Decision Engine. Task: explain and rank top job matches.
Use only provided data. Do not assume missing facts.
Return compact valid JSON only. Return an analysis object for EACH job provided. No explanation outside JSON.

Candidate Data:
${JSON.stringify(parsedData, null, 2)}

Top Matched Jobs:
${JSON.stringify(jobsData, null, 2)}

Output schema (return an array named "matched_jobs"):
{
  "matched_jobs": [
    {
      "job_id": "string",
      "matchScore": number,
      "fit_reason": "string (1-2 sentences explaining why they fit)",
      "matchedSkills": ["string"],
      "missingSkills": ["string"],
      "salaryInsight": "string (Estimated market salary for this role)",
      "hireBlocker": "string (A potential reason they might get rejected)",
      "interviewProbability": "High" | "Medium" | "Low",
      "growth_potential": "string (1 sentence on career growth for this role)",
      "most_demanded_skill": "string (Based on this specific job title, what is the single most demanded skill in the current market? e.g. for Python Developer it could be Django or FastAPI)"
    }
  ]
}
  `;

  const result = await callOpenAI(prompt);
  if (!result.used) {
    throw new Error(result.reason || 'Failed to generate Job Matching Engine analysis');
  }
  return result.output;
}

async function getAICareerReportAnalysis(parsedData, existingReport = null) {
  let extraContext = '';
  if (existingReport) {
    extraContext = `\nPrevious Analysis Report:\n${JSON.stringify(existingReport, null, 2)}\n\nThis is the latest profile data. Please provide an improved and deeper analysis taking into account the previous report and focusing on what has changed.\n`;
  }

  const prompt = `
You are LucoHire AI Decision Engine. Task: Generate an AI Career Report.
Analyze the candidate's profile to generate specific career insights.
Return valid JSON only. Keep advice actionable and professional.
${extraContext}

Input Data:
${JSON.stringify(parsedData, null, 2)}

Output Schema:
{
  "missing_skills": ["string (specific skills lacking based on their current trajectory)"],
  "top_skills": ["string (3-5 top skills they already possess and excel at)"],
  "resume_score": {
    "overall": "number (0-100)",
    "impact": "number (0-100)",
    "brevity": "number (0-100)",
    "skills_match": "number (0-100)"
  },
  "top_job_roles": [
    {
      "role": "string (Job Title)",
      "match_percentage": "number (0-100)",
      "reason": "string (short reason)"
    }
  ],
  "future_opportunities": ["string (specific roles or paths they could pivot to)"],
  "market_demand_analytics": {
    "scarcity_level": "High" | "Medium" | "Low",
    "demand_trend": "Increasing" | "Stable" | "Decreasing",
    "market_insight": "string (1-2 sentences on market demand for their skill set)"
  },
  "job_retention_tips": ["string (actionable advice to grow and retain their position)"],
  "interview_tips": ["string (specific interview tips to crack jobs in their domain)"]
}
  `;

  const result = await callOpenAI(prompt);
  if (!result.used) {
    throw new Error(result.reason || 'Failed to generate AI Career Report analysis');
  }
  return result.output;
}

async function getIncomeOpportunitiesAnalysis(candidateSummary) {
  const prompt = `
You are LucoHire AI Decision Engine. Task: recommend income paths for the candidate.
Use ONLY the structured data below. Do NOT scan job listings. Do NOT assume missing facts.
Return compact valid JSON only. No explanation outside JSON.

Candidate Summary:
${JSON.stringify(candidateSummary, null, 2)}

Output schema:
{
  "feature_name": "income_opportunities",
  "confidence_score": number,
  "needs_review": boolean,
  "summary": "string (1-2 sentences overview of the candidate's income potential)",
  "recommended_paths": [
    {
      "path_type": "full_time" | "part_time" | "freelance" | "contract" | "consulting" | "local_service" | "remote",
      "title": "string (descriptive role/path name)",
      "reason": "string (max 25 words explaining why this path suits the candidate)",
      "weekly_earning_estimate": "string (e.g. \"₹8,000–₹12,000/week\")",
      "action_step": "string (max 20 words, concrete next action)",
      "priority": "High" | "Medium" | "Low"
    }
  ]
}
  `;

  const result = await callOpenAI(prompt);
  if (!result.used) {
    throw new Error(result.reason || 'Failed to generate Income Opportunities analysis');
  }
  return result.output;
}

async function getFullResumeOptimizationAnalysis(resumeData, jobDescription = '') {
  const prompt = `
You are an elite Executive ATS Resume Writer. Your task is to AGGRESSIVELY REWRITE and ENHANCE the provided JSON resume. 
DO NOT simply return the original text. You MUST drastically improve it by:
1. Rewriting the 'summary' to be a powerful, keyword-rich elevator pitch.
2. Rewriting EVERY work experience and project description using the XYZ formula (Accomplished [X] as measured by [Y], by doing [Z]).
3. Injecting strong industry keywords, removing fluff, and starting bullet points with powerful action verbs.
4. Expanding the 'skills' array with highly relevant keywords based on their current experience.
${jobDescription ? `\nCRITICAL: You MUST heavily tailor the entire resume to align with this Target Job Description, injecting its exact keywords wherever naturally possible:\n${jobDescription}` : ''}

You must return the EXACT same JSON structure, but with the text fields heavily rewritten and enhanced.
DO NOT change the schema of the JSON. Do NOT wrap the JSON in markdown code blocks.

Input JSON:
${JSON.stringify(resumeData, null, 2)}
`;

  const result = await callOpenAI(prompt);
  if (!result.used) {
    throw new Error(result.reason || 'AI optimization failed');
  }
  return result.output;
}

async function getInterviewQuestionsAnalysis(parsedData, category = 'technical', existingQuestions = []) {
  const existingContext = existingQuestions.length > 0 
    ? `Do NOT repeat any of these previously generated questions: \n${existingQuestions.map(q => q.q).join('\n')}` 
    : '';

  const prompt = `
You are LucoHire AI Interview Coach. Task: Generate exactly 5 highly relevant interview questions for the candidate based on their profile data.
Category: ${category} (Should be 'technical', 'behavioural', or 'hr')
${existingContext}

Return valid JSON only. Strictly return an array of 5 objects. No explanation outside JSON.

Input Data:
${JSON.stringify(parsedData, null, 2)}

Output Schema:
{
  "questions": [
    {
      "q": "The interview question",
      "a": "A high-quality, comprehensive example answer tailored to their profile (include STAR method if behavioural)"
    }
  ]
}
  `;

  const result = await callOpenAI(prompt);
  if (!result.used) {
    throw new Error(result.reason || `Failed to generate ${category} Interview Questions`);
  }
  
  return { questions: result.output.questions || [] };
}

module.exports = {
  getCareerGPSAnalysis,
  getHiringBarriersAnalysis,
  getSkillGapAnalysis,
  getAtsOptimizerAnalysis,
  getJobMatchingEngineAnalysis,
  getAICareerReportAnalysis,
  getIncomeOpportunitiesAnalysis,
  getFullResumeOptimizationAnalysis,
  getInterviewQuestionsAnalysis,
};


