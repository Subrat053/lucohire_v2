const express = require("express");
const router = express.Router();
const JobPost = require("../models/JobPost");
const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const { findRecruiterProfileByUserId } = require('../services/recruiterCompanyPersistenceService');
const WageEstimateCache = require("../models/WageEstimateCache");
const AiUsageLog = require("../models/AIUsageLog");
const { protect } = require("../middleware/auth");
const { isRecruiterSubscribed } = require("../utils/subscriptionHelper");
const { lockCandidate, lockCandidateList } = require("../utils/maskCandidateData");
const { callOpenAI, extractJson, hasOpenAIKey } = require("../services/ai/llmService");
const { checkRecruiterAiLimit } = require('../middleware/recruiterAiUsage');
const { getRecruiterAiUsage } = require('../controllers/recruiterAIUsage.controller');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

router.use(requireOperationalFlags('AI_FEATURES_ENABLED', 'ENABLE_RECRUITER_AI'));

router.get('/usage', protect, getRecruiterAiUsage);

// Helper to log AI usage for GPT-4o-mini
async function logOpenAIUsage(userId, featureName, inputPrompt, outputText) {
  const inputTokens = Math.round(inputPrompt.length / 4); // rough approximation
  const outputTokens = Math.round(outputText.length / 4); // rough approximation
  const costEstimate = (inputTokens / 1000000) * 0.15 + (outputTokens / 1000000) * 0.60;

  await AiUsageLog.create({
    userId,
    role: "recruiter",
    featureName,
    provider: "openai",
    model: "gpt-4o-mini",
    inputTokens,
    outputTokens,
    costEstimate: Number(costEstimate.toFixed(6)),
    status: "success",
  });
}

// POST /api/recruiter/ai/dashboard-insights
router.post("/dashboard-insights", protect, async (req, res) => {
  try {
    if (!hasOpenAIKey()) {
      return res.status(503).json({ success: false, error: "OpenAI API key not configured" });
    }

    const prompt = `Generate exactly 3 short hiring market insights in a strict JSON array format. 
Format: [{ "title": "...", "desc": "...", "color": "emerald" | "orange" | "blue" | "purple" }]. 
Output only JSON, no markdown formatting or extra text.`;

    const aiResponse = await callOpenAI(prompt, "gpt-4o-mini", 500);
    
    if (!aiResponse || !aiResponse.used) {
       return res.status(500).json({ success: false, error: "Failed to fetch AI insights" });
    }
    
    const parsedData = aiResponse.output;
    const outputText = JSON.stringify(parsedData);
    
    await logOpenAIUsage(req.user._id, "dashboard-insights", prompt, outputText);

    res.json({ success: true, insights: parsedData });
  } catch (error) {
    console.error("Dashboard Insights error:", error);
    res.status(500).json({ success: false, error: "Failed to generate insights" });
  }
});

// 1. Recruiter Auto Ranking
// POST /api/recruiter/ai/auto-ranking
router.post("/auto-ranking", protect, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    const job = await JobPost.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job post not found" });
    }

    const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
    const isSubscribed = isRecruiterSubscribed(recruiterProfile);

    // 1. Find candidates matching the job's skills/city
    const candidates = await ProviderProfile.find({
      skills: { $in: job.skillsNeeded || [] },
      city: job.cityName || recruiterProfile?.city,
    }).populate("user", "name email phone avatar isEmailVerified").lean();

    // 2. Calculate deterministic matching scores
    const scoredCandidates = candidates.map((candidate) => {
      let score = 0;
      const matchingSkills = (candidate.skills || []).filter((s) =>
        (job.skillsNeeded || []).includes(s)
      );
      score += matchingSkills.length * 10; // skill match

      const exp = parseFloat(candidate.experience) || 0;
      score += exp * 2; // experience match

      if (candidate.city === job.cityName) {
        score += 20; // location match
      }

      return {
        ...candidate,
        matchScore: score,
      };
    });

    // Sort by matchScore desc
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
    const topCandidates = scoredCandidates.slice(0, 5);

    // 3. Call AI to explain ranking for the top candidates
    let explanations = {};
    if (topCandidates.length > 0 && hasOpenAIKey()) {
      const candidatesInfo = topCandidates.map((c) => ({
        id: String(c.user?._id),
        name: isSubscribed ? c.user?.name : "Masked Candidate",
        skills: c.skills,
        experience: c.experience,
        description: c.description || "",
      }));

      const prompt = `
      You are an expert AI recruiting assistant.
      Job Title: ${job.title}
      Required Skills: ${JSON.stringify(job.skillsNeeded)}
      Job Description: ${job.description}

      Candidates List:
      ${JSON.stringify(candidatesInfo, null, 2)}

      Evaluate why these top candidates are a good fit for this job. Return a JSON object with candidate IDs as keys, and a short explanation string (max 2 sentences) as the value.
      JSON Schema:
      {
        "candidateId": "explanation string"
      }
      `;

      try {
        const aiResponse = await callOpenAI(prompt);
        if (aiResponse.used && aiResponse.output) {
          explanations = aiResponse.output;
          await logOpenAIUsage(req.user._id, "auto_ranking", prompt, JSON.stringify(aiResponse.output));
        }
      } catch (err) {
        console.error("[Copilot Auto-Ranking AI Error]:", err.message);
      }
    }

    // Apply data masking if unsubscribed
    const maskedCandidates = topCandidates.map((c) => {
      const candidateUser = c.user;
      const maskedUser = lockCandidate(candidateUser, isSubscribed);
      
      return {
        ...c,
        user: maskedUser,
        explanation: explanations[String(candidateUser?._id)] || "Matching candidate based on skill profile.",
      };
    });

    res.json({
      success: true,
      jobId,
      candidates: maskedCandidates,
    });
  } catch (error) {
    console.error("[Auto Ranking Error] Failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 2. Salary Prediction
// POST /api/recruiter/ai/salary-prediction
router.post("/salary-prediction", protect, async (req, res) => {
  try {
    const { skill, city, experience, pricingType } = req.body;
    if (!skill || !city) {
      return res.status(400).json({ message: "skill and city are required" });
    }

    const expVal = parseFloat(experience) || 0;
    const pType = pricingType || "monthly";

    // 1. Check Cache
    const cached = await WageEstimateCache.findOne({
      cityName: city,
      skill,
      pricingType: pType,
    });

    if (cached) {
      return res.json({
        success: true,
        source: "cache",
        prediction: {
          min: cached.minEstimate,
          max: cached.maxEstimate,
          avg: cached.avgEstimate,
          reasoning: cached.reasoning,
        },
      });
    }

    // 2. Check internal job budget data
    const matchedJobs = await JobPost.find({
      cityName: city,
      skillsNeeded: skill,
      minBudget: { $gt: 0 },
    }).lean();

    let prediction = null;

    if (matchedJobs.length >= 3) {
      const budgets = matchedJobs.map((j) => j.minBudget);
      const min = Math.min(...budgets);
      const max = Math.max(...budgets);
      const avg = Math.round(budgets.reduce((sum, b) => sum + b, 0) / budgets.length);

      prediction = {
        min,
        max,
        avg,
        reasoning: `Based on platform statistics from ${matchedJobs.length} active jobs in ${city} for ${skill}.`,
      };
    }

    // 3. Fallback to AI Prediction
    if (!prediction && hasOpenAIKey()) {
      const prompt = `
      Predict the typical local labor market pricing rate in Indian Rupees (INR) for:
      Skill: ${skill}
      City: ${city}
      Experience: ${expVal} years
      Pricing Type: ${pType}

      Return ONLY a strict JSON object with this schema:
      {
        "min": number,
        "max": number,
        "avg": number,
        "reasoning": "string (brief explanation under 2 sentences)"
      }
      `;

      try {
        const aiResponse = await callOpenAI(prompt);
        if (aiResponse.used && aiResponse.output) {
          const out = aiResponse.output;
          prediction = {
            min: Number(out.min || 1000),
            max: Number(out.max || 5000),
            avg: Number(out.avg || 3000),
            reasoning: out.reasoning || "Estimated based on average Indian local market trends.",
          };
          await logOpenAIUsage(req.user._id, "salary_prediction", prompt, JSON.stringify(out));
        }
      } catch (err) {
        console.error("[Salary Prediction AI Error]:", err.message);
      }
    }

    // Ultimate default fallback
    if (!prediction) {
      prediction = {
        min: 500,
        max: 2000,
        avg: 1200,
        reasoning: "Platform fallback estimate based on general service averages.",
      };
    }

    // 4. Save to Cache
    await WageEstimateCache.create({
      cityName: city,
      skill,
      pricingType: pType,
      minEstimate: prediction.min,
      maxEstimate: prediction.max,
      avgEstimate: prediction.avg,
      reasoning: prediction.reasoning,
    });

    res.json({
      success: true,
      source: "calculated",
      prediction,
    });
  } catch (error) {
    console.error("[Salary Prediction Error] Failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 3. JD Generator
// POST /api/recruiter/ai/jd-generator
router.post("/jd-generator", protect, checkRecruiterAiLimit('aiJdGenerator'), async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "prompt is required" });
    }

    if (!hasOpenAIKey()) {
      return res.json({
        success: false,
        message: "AI model key is missing. JD cannot be generated.",
      });
    }

    const aiPrompt = `
    Create a professional Job Description (JD) using this requirement:
    "${prompt}"

    Return ONLY a strict JSON object with this schema:
    {
      "title": "string",
      "description": "string",
      "responsibilities": ["string"],
      "requiredSkills": ["string"],
      "niceToHaveSkills": ["string"],
      "salaryRange": "string",
      "screeningQuestions": ["string"]
    }
    `;

    const aiResponse = await callOpenAI(aiPrompt);
    if (aiResponse.used && aiResponse.output) {
      await logOpenAIUsage(req.user._id, "jd_generator", aiPrompt, JSON.stringify(aiResponse.output));
      return res.json({
        success: true,
        jd: aiResponse.output,
      });
    }

    res.status(502).json({ message: "Failed to generate Job Description." });
  } catch (error) {
    console.error("[JD Generator Error] Failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 4. AI Recruitment Copilot
// POST /api/recruiter/ai/copilot
router.post("/copilot", protect, checkRecruiterAiLimit('aiCopilot'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    if (!hasOpenAIKey()) {
      return res.json({
        success: true,
        reply: "Hello, I am your Recruitment Copilot. AI credentials are not configured, so I can only offer keyword responses. Please ask about candidates or roles.",
      });
    }

    const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
    const isSubscribed = isRecruiterSubscribed(recruiterProfile);

    // Fetch candidate context to feed to copilot
    const candidates = await ProviderProfile.find({
      city: recruiterProfile?.city || "Delhi",
    }).populate("user", "name email phone avatar").limit(5).lean();

    // Mask candidate details if recruiter is unsubscribed
    const maskedCandidates = topCandidatesContext = candidates.map((c) => {
      const u = c.user;
      return {
        id: String(u?._id),
        name: isSubscribed ? u?.name : "Masked Candidate",
        skills: c.skills,
        experience: c.experience,
        pricing: c.pricing,
        pricingType: c.pricingType,
        description: c.description || "",
      };
    });

    const prompt = `
    You are an AI Recruitment Copilot on the ServiceHub platform.
    Answer the recruiter's query using only the candidate data and project context provided. Do not hallucinate.

    Recruiter Query: "${message}"

    Candidates Context in Recruiter's City:
    ${JSON.stringify(maskedCandidates, null, 2)}

    Return a strict JSON object:
    {
      "reply": "string (answering the question professionally)"
    }
    `;

    const aiResponse = await callOpenAI(prompt);
    if (aiResponse.used && aiResponse.output) {
      await logOpenAIUsage(req.user._id, "recruiter_copilot", prompt, JSON.stringify(aiResponse.output));
      return res.json({
        success: true,
        reply: aiResponse.output.reply || "I am analyzing the candidates list. How else can I help you?",
      });
    }

    res.status(502).json({ message: "Copilot failed to generate response." });
  } catch (error) {
    console.error("[Copilot Error] Failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 5. Skill Gap Report
// POST /api/recruiter/ai/skill-gap
router.post("/skill-gap", protect, async (req, res) => {
  try {
    const { providerId, jobId } = req.body;
    if (!providerId || !jobId) {
      return res.status(400).json({ message: "providerId and jobId are required" });
    }

    const job = await JobPost.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job post not found" });
    }

    const providerProfile = await ProviderProfile.findById(providerId);
    if (!providerProfile) {
      return res.status(404).json({ message: "Candidate profile not found" });
    }

    const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
    const isSubscribed = isRecruiterSubscribed(recruiterProfile);

    // Prepare candidate data
    let candidateData = providerProfile.parsedResumeData;
    if (!candidateData) {
      candidateData = {
        skills: providerProfile.skills || [],
        experience: providerProfile.experience || "",
        bio: providerProfile.description || "",
        location: providerProfile.city || ""
      };
    }

    // Prepare job description
    const jobDescription = `Title: ${job.title}\nSkills Needed: ${(job.skillsNeeded || []).join(', ')}\nDescription: ${job.description || ""}`;

    const { getSkillGapAnalysis } = require("../services/ai/growWithAILLM.service");
    
    // Call unified AI pipeline
    const { processAI } = require("../services/ai/aiPipelineService");
    const pipelineResult = await processAI({
      userId: req.user._id,
      role: "recruiter",
      featureName: "premium_skill_gap",
      inputData: {
        candidate_data: candidateData,
        job_data: jobDescription
      }
    });

    if (!pipelineResult || pipelineResult.success === false) {
      if (pipelineResult?.locked) {
        return res.status(403).json(pipelineResult);
      }
      return res.status(502).json({
        success: false,
        message: pipelineResult?.message || "Failed to generate AI skill gap analysis."
      });
    }

    res.json({
      success: true,
      isSubscribed,
      analysis: {
        job_match_score: pipelineResult.confidence_score, // Map confidence as match score
        matched_skills: pipelineResult.current_strengths || [],
        missing_critical_skills: pipelineResult.missing_skills || [],
        missing_optional_skills: [],
        fastest_hire_path: pipelineResult.summary || "",
        hire_ready_after: pipelineResult.learning_plan?.[0]?.step || "N/A"
      }
    });
  } catch (error) {
    console.error("[Recruiter Skill Gap Error] Failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 6. Overall Profile Rating
// POST /api/recruiter/ai/profile-rating
router.post("/profile-rating", protect, async (req, res) => {
  try {
    const { providerId } = req.body;
    if (!providerId) {
      return res.status(400).json({ message: "providerId is required" });
    }

    const providerProfile = await ProviderProfile.findById(providerId)
      .populate("user", "name")
      .lean();
      
    if (!providerProfile) {
      return res.status(404).json({ message: "Candidate profile not found" });
    }

    if (!hasOpenAIKey()) {
      return res.json({
        success: true,
        score: Math.floor(Math.random() * 40) + 50, // mock score 50-90
        explanation: "AI credentials not configured. Returning mock score."
      });
    }

    // Basic heuristic to avoid LLM call if the profile is completely empty
    if (!providerProfile.skills?.length && !providerProfile.experience && !providerProfile.description) {
      return res.json({
        success: true,
        score: 20,
        explanation: "Profile is largely incomplete and missing key details."
      });
    }

    const prompt = `
    You are an expert AI technical recruiter.
    Evaluate the following candidate's OVERALL profile strength and employability.
    Do NOT evaluate against a specific job. Evaluate based on the completeness, clarity, in-demand nature of skills, and experience described.

    Candidate Skills: ${JSON.stringify(providerProfile.skills || [])}
    Experience: ${providerProfile.experience || "Not specified"}
    City: ${providerProfile.city || "Not specified"}
    Bio/Description: ${providerProfile.description || "Not specified"}
    Pricing/Fee: ${providerProfile.pricing || "Not specified"}

    Provide an overall rating score from 0 to 100, where:
    - 90-100: Exceptional, highly employable profile with clear, in-demand skills and solid experience.
    - 70-89: Strong profile, very employable.
    - 50-69: Average profile, might need more detail or experience.
    - 0-49: Weak or incomplete profile.

    Return a strict JSON object:
    {
      "score": number (0-100),
      "explanation": "string (1-2 sentences explaining why this score was given)"
    }
    `;

    const aiResponse = await callOpenAI(prompt);
    
    if (aiResponse.used && aiResponse.output) {
      const output = aiResponse.output;
      await logOpenAIUsage(req.user._id, "profile_rating", prompt, JSON.stringify(output));
      return res.json({
        success: true,
        score: output.score || 60,
        explanation: output.explanation || "Profile evaluated."
      });
    }

    res.status(502).json({ message: "Failed to generate profile rating." });
  } catch (error) {
    console.error("[Profile Rating Error] Failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
