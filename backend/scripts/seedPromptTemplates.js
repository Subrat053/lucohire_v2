require('dotenv').config();
const AIPromptTemplate = require('../models/AIPromptTemplate');
const connectDB = require('../config/db');

const templatesToSeed = [
  {
    feature_name: "resume_parser",
    description: "Extract structured candidate profile details from raw resume text",
    role: "provider",
    prompt_template: `Extract all candidate details from the provided resume text.
Resume Text:
{{input_data}}

Output JSON format:
{
  "success": true,
  "feature_name": "resume_parser",
  "confidence_score": 90,
  "needs_review": false,
  "data": {
    "fullName": "string or null",
    "phone": "string or null",
    "email": "string or null",
    "city": "string or null",
    "state": "string or null",
    "country": "string or null",
    "bio": "string or null (a short bio summarizing candidate under 25 words)",
    "skills": ["string"],
    "specialities": ["string"],
    "experienceYears": number or null (years of experience as a number),
    "education": [
      {
        "degree": "string or null",
        "institution": "string or null",
        "startYear": "string/number or null",
        "endYear": "string/number or null"
      }
    ],
    "workExperience": [
      {
        "company": "string or null",
        "position": "string or null",
        "duration": "string or null",
        "description": "string or null"
      }
    ],
    "portfolioLinks": ["string"],
    "languages": ["string"],
    "serviceCategory": "string or null",
    "pricingSuggestion": {
      "amount": number or null,
      "pricingType": "hourly" | "monthly" | "project" | null,
      "reason": "string or null"
    }
  },
  "warnings": []
}`,
    model_name: "gemini-1.5-flash",
    version: 1,
    is_active: true,
  },
  {
    feature_name: "ats_score",
    description: "Evaluate matching details and ATS compatibility against a job description",
    role: "recruiter",
    prompt_template: `Compare candidate profile details against the job description.
Candidate Profile:
{{candidate_data}}

Job Description:
{{job_data}}`,
    model_name: "gemini-1.5-flash",
    version: 1,
    is_active: true,
  },
  {
    feature_name: "job_match",
    description: "Explain and score similarity between candidate and a single job post",
    role: "recruiter",
    prompt_template: `Evaluate matching details between the candidate and the job post.
Candidate Profile:
{{candidate_data}}

Job Details:
{{job_data}}`,
    model_name: "gemini-1.5-flash",
    version: 1,
    is_active: true,
  },
  {
    feature_name: "premium_skill_gap",
    description: "Deep premium skill gap analysis comparing candidate details against job requirements",
    role: "provider",
    prompt_template: `Analyze professional skill gap comparing candidate details against job requirements.
Candidate Profile:
{{candidate_data}}

Job Description:
{{job_data}}`,
    model_name: "claude-3-5-sonnet-20241022",
    version: 1,
    is_active: true,
  },
  {
    feature_name: "career_gps",
    description: "Suggest career paths, timeline and learning plan steps based on profile",
    role: "provider",
    prompt_template: `Determine recommended career next steps and timelines for the candidate.
Candidate Profile:
{{candidate_data}}`,
    model_name: "claude-3-5-sonnet-20241022",
    version: 1,
    is_active: true,
  },
  {
    feature_name: "income_opportunities",
    description: "Recommend suitable income paths (full-time, freelance, remote, etc.) based on candidate profile and opportunity counts",
    role: "provider",
    prompt_template: `You are LucoHire AI Decision Engine. Task: recommend income paths for the candidate.
Use ONLY the structured data below. Do NOT scan job listings. Do NOT assume missing facts.
Return compact valid JSON only. No explanation outside JSON.

Candidate Summary:
{{candidate_summary}}

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
}`,
    model_name: "gpt-4o-mini",
    version: 1,
    is_active: true,
  }
];

const seedPromptTemplates = async () => {
  try {
    await connectDB();
    console.log('MongoDB Connected.');

    for (const temp of templatesToSeed) {
      const existing = await AIPromptTemplate.findOne({ feature_name: temp.feature_name });
      if (existing) {
        console.log(`Prompt template for '${temp.feature_name}' already exists. Skipping.`);
      } else {
        await AIPromptTemplate.create(temp);
        console.log(`Created prompt template for '${temp.feature_name}'.`);
      }
    }

    console.log('Prompt templates seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding prompt templates failed:', error.message);
    process.exit(1);
  }
};

seedPromptTemplates();
