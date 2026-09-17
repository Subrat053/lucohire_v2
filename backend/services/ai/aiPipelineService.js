const crypto = require("crypto");
const axios = require("axios");
const { z } = require("zod");
const AIPromptTemplate = require("../../models/AIPromptTemplate");
const AiAnalysisResult = require("../../models/AiAnalysisResult");
const AiUsageLog = require("../../models/AIUsageLog");
const ProviderProfile = require("../../models/ProviderProfile");
const RecruiterProfile = require("../../models/RecruiterProfile");
const { isProviderSubscribed, isRecruiterSubscribed } = require("../../utils/subscriptionHelper");

// Mandatory guardrail prepended to all prompts
const MANDATORY_GUARDRAIL = `Return compact valid JSON only. Use only provided data. Do not assume missing facts. Max 5 items per array. Keep summaries under 25 words. Include confidence_score.`;

// JSON repair prompt
const REPAIR_PROMPT = `You returned invalid JSON. Convert the previous response into compact valid JSON only.
Do not add explanation.
Do not add markdown.
Use the required schema exactly.
If data is missing, use null, empty string, or empty array.`;

// Zod schemas for mandatory AI features
const schemas = {
  resume_parser: z.object({
    success: z.boolean().default(true),
    feature_name: z.literal("resume_parser").default("resume_parser"),
    confidence_score: z.number().min(0).max(100),
    profile_strength_score: z.number().min(0).max(100).default(75),
    needs_review: z.boolean().default(false),
    data: z.object({
      fullName: z.string().nullable().default(""),
      phone: z.string().nullable().default(""),
      email: z.string().nullable().default(""),
      linkedin: z.string().nullable().default(""),
      github: z.string().nullable().default(""),
      city: z.string().nullable().default(""),
      state: z.string().nullable().default(""),
      country: z.string().nullable().default(""),
      bio: z.string().nullable().default(""),
      headline: z.string().nullable().default(""),
      skills: z.array(z.string()).default([]),
      roles: z.array(z.string()).default([]),
      specialities: z.array(z.string()).default([]),
      experienceYears: z.union([z.string(), z.number()]).nullable().default(""),
      education: z.array(z.any()).default([]),
      workExperience: z.array(z.any()).default([]),
      projects: z.array(z.any()).default([]),
      portfolioLinks: z.array(z.any()).default([]),
      languages: z.array(z.string()).default([]),
      serviceCategory: z.string().nullable().default(""),
      pricingSuggestion: z.object({
        amount: z.number().nullable().default(null),
        pricingType: z.string().nullable().default(""),
        reason: z.string().nullable().default(""),
      }).default({}),
    }).default({}),
    warnings: z.array(z.string()).default([]),
  }),

  ats_score: z.object({
    success: z.boolean().default(true),
    feature_name: z.literal("ats_score").default("ats_score"),
    confidence_score: z.number().min(0).max(100),
    needs_review: z.boolean().default(false),
    ats_score: z.number().min(0).max(100),
    matched_skills: z.array(z.string()).default([]),
    missing_skills: z.array(z.string()).default([]),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    summary: z.string().default(""),
    recommended_actions: z.array(z.string()).default([]),
  }),

  job_match: z.object({
    success: z.boolean().default(true),
    feature_name: z.literal("job_match").default("job_match"),
    confidence_score: z.number().min(0).max(100),
    needs_review: z.boolean().default(false),
    match_score: z.number().min(0).max(100),
    skill_match: z.number().min(0).max(100),
    location_match: z.number().min(0).max(100),
    experience_match: z.number().min(0).max(100),
    pricing_match: z.number().min(0).max(100),
    matched_points: z.array(z.string()).default([]),
    missing_points: z.array(z.string()).default([]),
    summary: z.string().default(""),
  }),

  premium_skill_gap: z.object({
    success: z.boolean().default(true),
    feature_name: z.literal("premium_skill_gap").default("premium_skill_gap"),
    confidence_score: z.number().min(0).max(100),
    needs_review: z.boolean().default(false),
    current_strengths: z.array(z.string()).default([]),
    missing_skills: z.array(z.string()).default([]),
    priority_skills: z.array(z.string()).default([]),
    learning_plan: z.array(z.any()).default([]),
    career_impact: z.string().default(""),
    summary: z.string().default(""),
  }),

  career_gps: z.object({
    success: z.boolean().default(true),
    feature_name: z.literal("career_gps").default("career_gps"),
    confidence_score: z.number().min(0).max(100),
    needs_review: z.boolean().default(false),
    current_role: z.string().nullable().default(""),
    recommended_next_role: z.string().nullable().default(""),
    alternative_roles: z.array(z.string()).default([]),
    required_skills: z.array(z.string()).default([]),
    missing_skills: z.array(z.string()).default([]),
    estimated_timeline_months: z.union([z.string(), z.number()]).nullable().default(""),
    salary_growth_potential_percent: z.number().default(0),
    learning_plan: z.array(z.any()).default([]),
    reasoning_summary: z.string().default(""),
  }),

  income_opportunities: z.object({
    success: z.boolean().default(true),
    feature_name: z.literal("income_opportunities").default("income_opportunities"),
    confidence_score: z.number().min(0).max(100),
    needs_review: z.boolean().default(false),
    summary: z.string().default(""),
    recommended_paths: z.array(z.object({
      path_type: z.enum(["full_time", "part_time", "freelance", "contract", "consulting", "local_service", "remote"]).default("full_time"),
      title: z.string().default(""),
      reason: z.string().default(""),
      weekly_earning_estimate: z.string().default(""),
      action_step: z.string().default(""),
      priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
    })).max(7).default([]),
  }),
};

// Common envelope schema fallback
const commonEnvelopeSchema = z.object({
  success: z.boolean().default(true),
  feature_name: z.string(),
  confidence_score: z.number().min(0).max(100).default(50),
  needs_review: z.boolean().default(false),
  summary: z.string().optional().default(""),
  data: z.any().optional().default({}),
  warnings: z.array(z.string()).optional().default([]),
});

const DEFAULT_PROMPTS = {
  resume_parser: `Extract candidate profile details from the provided resume document.
Read the attached multimodal document directly to capture precise formatting, hyperlinks, and hidden text.
(If a document is not attached, fall back to the text provided below).

Make sure to extract and map all details strictly according to their relevant fields: Name, Email, Mobile No, Location, LinkedIn, Github, Portfolio, Bio, Experience, Skills, Suggested Pricing, and Education.
IMPORTANT: Formulate a short professional "speciality" based on their core skills and place it in the "headline" field.
IMPORTANT: Analyze the candidate's skills and experience to determine their perfect matching role(s) (e.g. "Frontend Developer", "Data Scientist") and place them in the "roles" array.
IMPORTANT: Extract details EXACTLY AS THEY APPEAR. Do NOT summarize or abbreviate project descriptions, bullet points, or experience. Copy them exactly.
IMPORTANT: You must look at the "--- EMBEDDED LINKS ---" section at the bottom of the text if it exists. Extract any LinkedIn, GitHub, or Portfolio URLs found there and strictly assign them to the root properties "linkedin", "github", and "portfolio" respectively. Do not miss them!

Resume Text Fallback:
{{input_data}}

Output JSON format:
{
  "success": true,
  "feature_name": "resume_parser",
  "confidence_score": 90,
  "profile_strength_score": 85,
  "needs_review": false,
  "data": {
    "fullName": "string or null",
    "phone": "string or null",
    "email": "string or null",
    "linkedin": "string or null",
    "github": "string or null",
    "city": "string or null",
    "state": "string or null",
    "country": "string or null",
    "bio": "string or null",
    "headline": "string or null (this is the speciality)",
    "skills": ["string", "string"],
    "roles": ["string", "string"],
    "specialities": ["string", "string"],
    "experienceYears": "string or number",
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
    "projects": [
      {
        "name": "string or null",
        "description": "string or null",
        "technologies": ["string"],
        "link": "string or null (hyperlink if present)"
      }
    ],
    "portfolioLinks": ["string (extract any hyperlinks or URLs present)"],
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

  ats_score: `Compare candidate profile details against the job description.
Candidate Profile:
{{candidate_data}}

Job Description:
{{job_data}}`,

  job_match: `Evaluate matching details between the candidate and the job post.
Candidate Profile:
{{candidate_data}}

Job Details:
{{job_data}}`,

  premium_skill_gap: `Analyze professional skill gap comparing candidate details against job requirements.
Candidate Profile:
{{candidate_data}}

Job Description:
{{job_data}}`,

  career_gps: `Determine recommended career next steps and timelines for the candidate.
Candidate Profile:
{{candidate_data}}`,

  income_opportunities: `You are LucoHire AI Decision Engine. Task: recommend income paths for the candidate.
Use ONLY the structured data below. Do NOT scan job listings. Do NOT assume missing facts.
Return compact valid JSON only. No explanation outside JSON.

Candidate Summary:
{{candidate_summary}}

Output schema:
{
  "feature_name": "income_opportunities",
  "confidence_score": number,
  "needs_review": boolean,
  "summary": "string (1-2 sentences overview)",
  "recommended_paths": [
    {
      "path_type": "full_time" | "part_time" | "freelance" | "contract" | "consulting" | "local_service" | "remote",
      "title": "string",
      "reason": "string (max 25 words)",
      "weekly_earning_estimate": "string (e.g. \"₹8,000–₹12,000/week\")",
      "action_step": "string (max 20 words)",
      "priority": "High" | "Medium" | "Low"
    }
  ]
}`,
};

/**
 * Normalizes input objects/strings to ensure deterministic hash generation.
 */
function normalizeInput(input) {
  if (input === null || input === undefined) return "";
  if (typeof input !== "object") return String(input).trim().toLowerCase();

  const sortObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sortObject);
    } else if (obj !== null && typeof obj === "object") {
      return Object.keys(obj)
        .sort()
        .reduce((result, key) => {
          result[key] = sortObject(obj[key]);
          return result;
        }, {});
    }
    return obj;
  };

  return JSON.stringify(sortObject(input));
}

/**
 * Calculates hash using sha256.
 */
function generateHash(inputStr) {
  return crypto.createHash("sha256").update(inputStr).digest("hex");
}

/**
 * Estimate token count based on string length (approx. 1 token per 4 chars).
 */
function estimateTokens(str) {
  return Math.round(String(str || "").length / 4);
}

/**
 * Estimates cost for model usage.
 */
function estimateCost(model, inputTokens, outputTokens) {
  const modelLower = String(model || "").toLowerCase();
  let inputRate = 0.15 / 1000000; // default gpt-4o-mini rates
  let outputRate = 0.60 / 1000000;

  if (modelLower.includes("claude-3-5-sonnet") || modelLower.includes("sonnet")) {
    inputRate = 3.0 / 1000000;
    outputRate = 15.0 / 1000000;
  } else if (modelLower.includes("claude-3-5-haiku")) {
    inputRate = 0.80 / 1000000;
    outputRate = 4.0 / 1000000;
  } else if (modelLower.includes("gpt-4o") && !modelLower.includes("mini")) {
    inputRate = 5.0 / 1000000;
    outputRate = 15.0 / 1000000;
  } else if (modelLower.includes("gemini-1.5-pro") || modelLower.includes("pro")) {
    inputRate = 1.25 / 1000000;
    outputRate = 5.0 / 1000000;
  } else if (modelLower.includes("gemini-1.5-flash") || modelLower.includes("flash")) {
    inputRate = 0.075 / 1000000;
    outputRate = 0.30 / 1000000;
  }

  const cost = inputTokens * inputRate + outputTokens * outputRate;
  return Number(cost.toFixed(6));
}

/**
 * Log usage directly to AIUsageLog.
 */
async function logUsage({ userId, role, featureName, provider, model, inputTokens, outputTokens, latencyMs, status, errorMessage, wasCached }) {
  const cost = estimateCost(model, inputTokens, outputTokens);
  try {
    await AiUsageLog.create({
      userId,
      role: role || "system",
      feature: featureName,
      featureName,
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCostUsd: cost,
      costEstimate: cost,
      latencyMs: latencyMs || 0,
      status: status || "success",
      errorMessage: errorMessage || "",
      metadata: { was_cached: Boolean(wasCached) },
    });
  } catch (err) {
    console.error("[AiPipeline] Error logging usage:", err.message);
  }
  return cost;
}

/**
 * Core function to query the LLM API providers.
 */
async function executeLlmCall(provider, model, prompt, systemPrompt = "", messagesHistory = null, fileData = null) {
  const startTime = Date.now();
  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;

  if (provider === "openai") {
    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const messages = messagesHistory || [
      { role: "system", content: systemPrompt || "Return strict JSON only." },
      { role: "user", content: prompt },
    ];

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 25000,
      }
    );

    text = response.data?.choices?.[0]?.message?.content || "";
    inputTokens = response.data?.usage?.prompt_tokens || estimateTokens(prompt);
    outputTokens = response.data?.usage?.completion_tokens || estimateTokens(text);
  } else if (provider === "gemini") {
    const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const modelName = model || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    let contents = [];
    if (messagesHistory) {
      contents = messagesHistory.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    } else {
      let parts = [{ text: prompt }];
      if (fileData && fileData.base64 && fileData.mimeType) {
        parts.push({
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.base64
          }
        });
      }
      contents = [{ role: "user", parts }];
    }

    const response = await axios.post(
      url,
      {
        contents,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      },
      { timeout: 25000 }
    );

    text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    inputTokens = response.data?.usageMetadata?.promptTokenCount || estimateTokens(prompt);
    outputTokens = response.data?.usageMetadata?.candidatesTokenCount || estimateTokens(text);
  } else if (provider === "anthropic") {
    const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const modelName = model || "claude-3-5-sonnet-20241022";
    const messages = messagesHistory || [{ role: "user", content: prompt }];

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: modelName,
        max_tokens: 2048,
        temperature: 0.1,
        system: systemPrompt || "Return strict JSON only.",
        messages,
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        timeout: 25000,
      }
    );

    text = response.data?.content?.[0]?.text || "";
    inputTokens = response.data?.usage?.input_tokens || estimateTokens(prompt);
    outputTokens = response.data?.usage?.output_tokens || estimateTokens(text);
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  return {
    text: text.trim(),
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Safely extracts JSON from model response text.
 */
function parseLlmOutput(text) {
  const clean = String(text || "").trim();
  try {
    return JSON.parse(clean);
  } catch (err) {}

  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {}
  }
  return null;
}

/**
 * Main function of the AI pipeline.
 */
async function processAI({ userId, role, featureName, inputData, bypassCache = false }) {
  // Fix guest userId causing CastError in MongoDB ObjectId lookups
  if (userId === 'guest') {
    userId = null;
  }

  // 1. Normalize input and generate hash
  const normalizedInput = normalizeInput(inputData);
  const hashKey = generateHash(normalizedInput);

  // 2. Check persistent cache (ai_analysis_results)
  const cachedResult = await AiAnalysisResult.findOne({
    input_hash: hashKey,
    feature_name: featureName,
    status: { $in: ["success", "repaired"] },
  }).lean();

  if (cachedResult && !bypassCache && featureName !== "resume_parser") {
    console.log(`[AiPipeline] Cache hit for feature=${featureName} hash=${hashKey}`);
    // Log cached usage
    await logUsage({
      userId,
      role,
      featureName,
      provider: cachedResult.model_name.includes("claude")
        ? "anthropic"
        : cachedResult.model_name.includes("gpt")
        ? "openai"
        : "gemini",
      model: cachedResult.model_name,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      status: "cached",
      wasCached: true,
    });

    return {
      success: true,
      source: "cache",
      confidence_score: cachedResult.confidence_score,
      needs_review: cachedResult.needs_review,
      data: cachedResult.parsed_json,
    };
  }

  // 3. Resolve user plan & check access limits
  const featuresConfig = {
    resume_parser: { model_type: "free", daily_limit: 5, required_plan: "free" },
    ats_score: { model_type: "free", daily_limit: 5, required_plan: "free" },
    job_match: { model_type: "free", daily_limit: 5, required_plan: "free" },
    premium_skill_gap: { model_type: "premium", daily_limit: 2, required_plan: "premium" },
    career_gps: { model_type: "premium", daily_limit: 2, required_plan: "premium" },
  };

  const config = featuresConfig[featureName] || { model_type: "free", daily_limit: 5, required_plan: "free" };

  let isPremium = false;
  let currentPlan = "free";

  if (userId) {
    if (role === "provider" || role === "candidate") {
      const profile = await ProviderProfile.findOne({ user: userId });
      isPremium = isProviderSubscribed(profile);
      currentPlan = profile?.currentPlan || "free";
    } else if (role === "recruiter") {
      const profile = await RecruiterProfile.findOne({ user: userId });
      isPremium = isRecruiterSubscribed(profile);
      currentPlan = profile?.currentPlan || "free";
    }
  }

  // Premium enforcement
  if (config.required_plan === "premium" && !isPremium) {
    return {
      success: false,
      locked: true,
      reason: "Premium subscription required. Upgrade to access deep reports.",
      upgrade_required: true,
    };
  }

  // Limit check
  if (userId && featureName !== "resume_parser") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const count = await AiAnalysisResult.countDocuments({
      user_id: userId,
      feature_name: featureName,
      status: { $in: ["success", "repaired"] },
      created_at: { $gte: todayStart, $lte: todayEnd },
    });

    const dailyLimit = isPremium ? config.daily_limit * 5 : config.daily_limit;
    if (count >= dailyLimit) {
      return {
        success: false,
        locked: true,
        reason: "Daily AI limit reached",
        upgrade_required: !isPremium,
      };
    }
  }

  // 4. Load Prompt Template from DB
  const dbTemplate = await AIPromptTemplate.findOne({
    feature_name: featureName,
  }).lean();

  if (dbTemplate && !dbTemplate.is_active) {
    return {
      success: false,
      message: "This AI feature is temporarily deactivated by Admin.",
    };
  }

  // Construct prompt
  let baseTemplate = dbTemplate?.prompt_template || DEFAULT_PROMPTS[featureName] || "Return structured information based on {{input_data}}";
  let promptBody = baseTemplate;

  // Substitute variables
  if (typeof inputData === "object" && inputData !== null) {
    for (const [k, v] of Object.entries(inputData)) {
      const valStr = typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
      promptBody = promptBody.replace(new RegExp(`{{${k}}}`, "g"), valStr);
    }
  } else {
    promptBody = promptBody.replace(/{{input_data}}/g, String(inputData));
  }

  // Inject mandatory Guardrail at the top
  const finalPrompt = `${MANDATORY_GUARDRAIL}\n\n${promptBody}`;

  // 5. Model Routing
  let configuredModel = dbTemplate?.model_name || "";
  let resolvedProvider = "gemini";
  let resolvedModel = "gemini-1.5-flash";

  if (config.model_type === "premium") {
    // Premium routing defaults to Claude Sonnet
    resolvedProvider = "anthropic";
    resolvedModel = configuredModel || "claude-3-5-sonnet-20241022";
  } else {
    // Free routing defaults to Gemini Flash or GPT-4o-mini
    resolvedModel = configuredModel || "gemini-1.5-flash";
    if (resolvedModel.includes("gpt")) {
      resolvedProvider = "openai";
    } else if (resolvedModel.includes("claude")) {
      // Force free users to low cost model
      resolvedProvider = "gemini";
      resolvedModel = "gemini-1.5-flash";
    } else {
      resolvedProvider = "gemini";
    }
  }

  // resume_parser requires deep extraction capabilities. User requested removing Gemini.
  if (featureName === "resume_parser") {
    resolvedProvider = "openai";
    resolvedModel = "gpt-4o"; 
  }

  // Override model configured routing if env overrides exist
  if (resolvedProvider === "gemini" && process.env.GEMINI_API_KEY) {
    // Keep Gemini
  } else if (resolvedProvider === "openai" && process.env.OPENAI_API_KEY) {
    // Keep OpenAI
  } else if (resolvedProvider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    // Fall back premium feature to OpenAI or Gemini if key is missing
    if (process.env.OPENAI_API_KEY) {
      resolvedProvider = "openai";
      resolvedModel = "gpt-4o-mini";
    } else {
      resolvedProvider = "gemini";
      resolvedModel = "gemini-1.5-flash";
    }
  }

  const systemInstructions = "You are LucoHire AI Decision Engine. Output valid compact JSON only. No explanations. No markdown block wrapper.";

  // 6. Execute AI Call
  let responseText = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let callLatency = 0;
  let status = "success";
  let errorMessage = "";

  try {
    const callResult = await executeLlmCall(
      resolvedProvider,
      resolvedModel,
      finalPrompt,
      systemInstructions,
      null,
      inputData?.fileData
    );
    responseText = callResult.text;
    tokensIn = callResult.inputTokens;
    tokensOut = callResult.outputTokens;
    callLatency = callResult.latencyMs;
  } catch (err) {
    console.error(`[AiPipeline] LLM call failed for feature=${featureName} using ${resolvedProvider}/${resolvedModel}:`, err.message);
    if (resolvedProvider === "gemini" && process.env.OPENAI_API_KEY) {
      console.log(`[AiPipeline] Attempting fallback to OpenAI (gpt-4o-mini) for feature=${featureName}`);
      try {
        resolvedProvider = "openai";
        resolvedModel = "gpt-4o-mini";
        const callResult = await executeLlmCall(
          resolvedProvider,
          resolvedModel,
          finalPrompt,
          systemInstructions,
          null,
          inputData?.fileData
        );
        responseText = callResult.text;
        tokensIn = callResult.inputTokens;
        tokensOut = callResult.outputTokens;
        callLatency = callResult.latencyMs;
        status = "success";
        errorMessage = "";
      } catch (fallbackErr) {
        status = "failed";
        errorMessage = `Primary Gemini failed: ${err.message}. Fallback OpenAI failed: ${fallbackErr.message}`;
        console.error(`[AiPipeline] Fallback to OpenAI failed for feature=${featureName}:`, fallbackErr.message);
      }
    } else {
      status = "failed";
      errorMessage = err.message;
    }
  }

  // 7. Backend Validation
  let parsedJson = null;
  let isParsedOk = false;

  if (status === "success" && responseText) {
    parsedJson = parseLlmOutput(responseText);
    if (parsedJson) {
      // Validate schema
      const zodSchema = schemas[featureName] || commonEnvelopeSchema;
      const validation = zodSchema.safeParse(parsedJson);
      if (validation.success) {
        isParsedOk = true;
        parsedJson = validation.data;
      } else {
        console.warn(`[AiPipeline] Zod Schema validation failed for feature=${featureName}:`, validation.error.message);
      }
    }
  }

  // 8. JSON Repair (Retry once if failed validation)
  if (!isParsedOk && status === "success") {
    console.log(`[AiPipeline] Launching repair flow for feature=${featureName}`);
    try {
      const messagesHistory = [
        { role: "user", content: finalPrompt },
        { role: "assistant", content: responseText || "{}" },
        { role: "user", content: REPAIR_PROMPT },
      ];

      const repairResult = await executeLlmCall(
        resolvedProvider,
        resolvedModel,
        "",
        systemInstructions,
        messagesHistory
      );

      tokensIn += repairResult.inputTokens;
      tokensOut += repairResult.outputTokens;
      callLatency += repairResult.latencyMs;

      const repairedJson = parseLlmOutput(repairResult.text);
      if (repairedJson) {
        const zodSchema = schemas[featureName] || commonEnvelopeSchema;
        const validation = zodSchema.safeParse(repairedJson);
        if (validation.success) {
          isParsedOk = true;
          parsedJson = validation.data;
          status = "repaired";
          responseText = repairResult.text; // Update raw response
          console.log(`[AiPipeline] Repair succeeded for feature=${featureName}`);
        } else {
          errorMessage = "Repair attempt schema validation failed: " + validation.error.message;
        }
      } else {
        errorMessage = "Repair attempt returned invalid JSON content";
      }
    } catch (repairErr) {
      errorMessage = "Repair call failed: " + repairErr.message;
      console.error(`[AiPipeline] Repair attempt failed for feature=${featureName}:`, repairErr.message);
    }
  }

  // If still failed, stop and return safe fallback
  if (!isParsedOk) {
    status = "failed";
    const failCost = await logUsage({
      userId,
      role,
      featureName,
      provider: resolvedProvider,
      model: resolvedModel,
      inputTokens: tokensIn,
      outputTokens: tokensOut,
      latencyMs: callLatency,
      status: "failed",
      errorMessage,
    });

    // Save failed result for debugging
    await AiAnalysisResult.create({
      user_id: userId,
      feature_name: featureName,
      input_hash: hashKey,
      model_name: resolvedModel,
      prompt_version: dbTemplate?.version || 1,
      input_snapshot: inputData,
      raw_response: responseText || "",
      parsed_json: {},
      confidence_score: 0,
      needs_review: true,
      token_usage: {
        input_tokens: tokensIn,
        output_tokens: tokensOut,
        total_tokens: tokensIn + tokensOut,
      },
      estimated_cost: failCost,
      status: "failed",
      error_message: errorMessage,
    });

    // Safe fallback response structure based on feature
    const fallbackMap = {
      resume_parser: {
        success: false,
        feature_name: "resume_parser",
        confidence_score: 0,
        needs_review: true,
        data: {
          fullName: null,
          phone: null,
          email: null,
          city: null,
          state: null,
          country: null,
          skills: [],
          specialities: [],
          experienceYears: null,
          education: [],
          workExperience: [],
          portfolioLinks: [],
          languages: [],
          serviceCategory: null,
          pricingSuggestion: { amount: null, pricingType: null, reason: "Fallback estimation" },
        },
        warnings: ["AI response failed validation. Fallback data returned."],
      },
      ats_score: {
        success: false,
        feature_name: "ats_score",
        confidence_score: 0,
        needs_review: true,
        ats_score: 0,
        matched_skills: [],
        missing_skills: [],
        strengths: [],
        weaknesses: [],
        summary: "Unable to calculate ATS score. AI failed validation.",
        recommended_actions: [],
      },
      job_match: {
        success: false,
        feature_name: "job_match",
        confidence_score: 0,
        needs_review: true,
        match_score: 0,
        skill_match: 0,
        location_match: 0,
        experience_match: 0,
        pricing_match: 0,
        matched_points: [],
        missing_points: [],
        summary: "Job matching failed to generate verified results.",
      },
      premium_skill_gap: {
        success: false,
        feature_name: "premium_skill_gap",
        confidence_score: 0,
        needs_review: true,
        current_strengths: [],
        missing_skills: [],
        priority_skills: [],
        learning_plan: [],
        career_impact: "",
        summary: "Premium skill gap report generation failed.",
      },
      income_opportunities: {
        success: false,
        feature_name: "income_opportunities",
        confidence_score: 0,
        needs_review: true,
        summary: "Income path analysis failed. Please try again later.",
        recommended_paths: [],
      },
    };

    return fallbackMap[featureName] || {
      success: false,
      feature_name: featureName,
      confidence_score: 0,
      needs_review: true,
      summary: "AI pipeline processing failed.",
      data: {},
      warnings: ["AI parsing failed."],
    };
  }

  // Post-process confidence score and needs_review rules
  let finalConfidence = parsedJson.confidence_score !== undefined ? parsedJson.confidence_score : 50;
  if (finalConfidence < 0) finalConfidence = 0;
  if (finalConfidence > 100) finalConfidence = 100;

  parsedJson.confidence_score = finalConfidence;
  if (finalConfidence < 70) {
    parsedJson.needs_review = true;
  }

  // 9. Cost Tracking & Logging
  const totalCost = await logUsage({
    userId,
    role,
    featureName,
    provider: resolvedProvider,
    model: resolvedModel,
    inputTokens: tokensIn,
    outputTokens: tokensOut,
    latencyMs: callLatency,
    status: status,
  });

  // 10. Save successful parsing to database
  await AiAnalysisResult.create({
    user_id: userId,
    feature_name: featureName,
    input_hash: hashKey,
    model_name: resolvedModel,
    prompt_version: dbTemplate?.version || 1,
    input_snapshot: inputData,
    raw_response: responseText, // stored separately for admin debugging
    parsed_json: parsedJson, // stored separately for dashboard rendering
    confidence_score: finalConfidence,
    needs_review: parsedJson.needs_review,
    token_usage: {
      input_tokens: tokensIn,
      output_tokens: tokensOut,
      total_tokens: tokensIn + tokensOut,
    },
    estimated_cost: totalCost,
    status: status,
  });

  return parsedJson;
}

module.exports = {
  processAI,
};
