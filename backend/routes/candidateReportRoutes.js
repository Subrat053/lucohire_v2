const express = require("express");
const router = express.Router();
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const SkillGapReport = require("../models/SkillGapReport");
const ProviderProfile = require("../models/ProviderProfile");
const JobPost = require("../models/JobPost");
const AiUsageLog = require("../models/AIUsageLog");
const { protect } = require("../middleware/auth"); // assuming there's an auth protect middleware
const { isProviderSubscribed } = require("../utils/subscriptionHelper");
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');
const axios = require("axios");

router.use(requireOperationalFlags('AI_FEATURES_ENABLED', 'AI_PROFILE_ENABLED'));

// Helper to safely parse JSON from AI response text
function parseResponseJson(text) {
  const clean = String(text || "").trim();
  
  try {
    return JSON.parse(clean);
  } catch (err) {}

  // Attempt to extract JSON if surrounded by markdown code blocks
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (_) {}
  }
  return null;
}

// Call AI (Gemini / OpenAI / Anthropic fallback)
async function callClaudeSonnet(prompt, repairPrompt = null) {
  const systemMessage = "You are a senior career skill-gap analyst. Return ONLY a strict JSON object. No explanation, no comments, no markdown code block formatting (do not wrap in ```json).";

  // 1. Try Gemini
  const geminiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_RESUME_MODEL || 'gemini-1.5-flash-latest';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      
      let fullPrompt = prompt;
      if (repairPrompt) {
        fullPrompt += `\n\nAssistant: {}\n\nUser: ${repairPrompt}`;
      }

      const response = await axios.post(
        url,
        {
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2500,
            responseMimeType: 'application/json',
          },
          systemInstruction: {
            parts: [{ text: systemMessage }]
          }
        },
        { timeout: 15000 }
      );
      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) {
        return { text, provider: "gemini", model, inputTokens: 0, outputTokens: 0 };
      }
    } catch (err) {
      console.warn("[Skill Gap Report] Gemini call failed, trying next provider...", err.message);
    }
  }

  // 2. Try OpenAI
  const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (openaiKey) {
    try {
      const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
      
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ];
      if (repairPrompt) {
        messages.push(
          { role: 'assistant', content: '{}' },
          { role: 'user', content: repairPrompt }
        );
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages,
        },
        {
          headers: { Authorization: `Bearer ${openaiKey}` },
          timeout: 15000
        }
      );
      const text = response.data?.choices?.[0]?.message?.content || '';
      if (text) {
        return { text, provider: "openai", model, inputTokens: 0, outputTokens: 0 };
      }
    } catch (err) {
      console.warn("[Skill Gap Report] OpenAI call failed, trying next provider...", err.message);
    }
  }

  // 3. Try Anthropic (Claude)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured and fallbacks failed");
  }

  const model = "claude-3-5-sonnet-20241022";
  const url = "https://api.anthropic.com/v1/messages";

  const messages = [
    {
      role: "user",
      content: prompt,
    },
  ];

  if (repairPrompt) {
    messages.push(
      { role: "assistant", content: "{}" },
      { role: "user", content: repairPrompt }
    );
  }

  const response = await axios.post(
    url,
    {
      model,
      max_tokens: 2500,
      temperature: 0.1,
      system: systemMessage,
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

  const text = response.data?.content?.[0]?.text || "";
  const inputTokens = response.data?.usage?.input_tokens || 0;
  const outputTokens = response.data?.usage?.output_tokens || 0;

  return { text, provider: "anthropic", model, inputTokens, outputTokens };
}

// @desc    Generate premium Claude Sonnet candidate skill-gap report
// @route   POST /api/candidate/skill-gap-report
// @access  Private (Provider/Candidate only)
router.post("/skill-gap-report", protect, async (req, res) => {
  try {
    // 1. Authenticate candidate profile
    const profile = await ProviderProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Candidate profile not found" });
    }

    // 2. Check candidate subscription
    if (!isProviderSubscribed(profile)) {
      return res.status(403).json({
        success: false,
        code: "PREMIUM_REQUIRED",
        message: "Premium subscription is required to generate deep skill-gap reports.",
      });
    }

    // 3. Get candidate local date
    const tz = req.user.timezone || "Asia/Kolkata";
    const todayStr = dayjs().tz(tz).format("YYYY-MM-DD");

    // 4. Check if report already exists for today
    const existingReport = await SkillGapReport.findOne({
      candidateId: req.user._id,
      reportDate: todayStr,
    }).lean();

    if (existingReport) {
      return res.json({
        success: true,
        source: "cached_today",
        report: existingReport,
      });
    }

    // 5. Query top 5 matching active jobs
    const candidateSkills = profile.skills || [];
    const candidateLat = profile.latitude;
    const candidateLng = profile.longitude;

    let matchedJobs = [];

    // Prefer coordinates + distance matching first
    if (candidateLat !== undefined && candidateLng !== undefined && candidateLat !== null && candidateLng !== null) {
      matchedJobs = await JobPost.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [Number(candidateLng), Number(candidateLat)],
            },
            distanceField: "distance",
            maxDistance: 100000, // 100 km
            query: { isActive: true },
            spherical: true,
          },
        },
        {
          $addFields: {
            overlapCount: {
              $size: {
                $setIntersection: [
                  { $ifNull: ["$requirements", []] },
                  candidateSkills
                ],
              },
            },
          },
        },
        {
          $sort: {
            overlapCount: -1,
            distance: 1,
          },
        },
        { $limit: 5 },
      ]);
    }

    // Fallback if coordinates are missing or no jobs nearby
    if (matchedJobs.length === 0) {
      matchedJobs = await JobPost.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $addFields: {
            overlapCount: {
              $size: {
                $setIntersection: [
                  { $ifNull: ["$requirements", []] },
                  candidateSkills
                ],
              },
            },
          },
        },
        {
          $sort: {
            overlapCount: -1,
            createdAt: -1,
          },
        },
        { $limit: 5 },
      ]);
    }

    const matchedJobIds = matchedJobs.map((j) => j._id);

    // 6. Call Claude Sonnet to generate the report
    const candidateProfileContext = {
      name: req.user.name,
      description: profile.description || "",
      experience: profile.experience || "",
      city: profile.city || "",
    };

    const promptInput = `
You are a senior career skill-gap analyst.
Analyze the candidate only against the provided top 5 matching jobs.
Do not assume access to any other database.

Candidate Profile:
${JSON.stringify(candidateProfileContext, null, 2)}

Candidate Skills:
${JSON.stringify(candidateSkills, null, 2)}

Top 5 Matching Jobs:
${JSON.stringify(matchedJobs.map(j => ({ id: j._id, title: j.title, skillsNeeded: j.requirements || [], description: j.description || "" })), null, 2)}

Task:
Find missing skills, weak skills, recommended learning path, and role readiness.

Return JSON in exactly this schema:
{
  "missingSkills": ["string"],
  "weakSkills": ["string"],
  "recommendedSkills": ["string"],
  "roleReadinessScore": number,
  "confidence": "low" | "medium" | "high",
  "reportSummary": "short summary",
  "detailedAnalysis": "deep but practical analysis",
  "learningRoadmap": [
    {
      "skill": "string",
      "priority": "high" | "medium" | "low",
      "reason": "string"
    }
  ]
}
`;

    // 6. Call unified AI pipeline
    const { processAI } = require("../services/ai/aiPipelineService");
    const pipelineResult = await processAI({
      userId: req.user._id,
      role: "provider",
      featureName: "premium_skill_gap",
      inputData: {
        candidate_data: {
          profile: candidateProfileContext,
          skills: candidateSkills,
        },
        job_data: matchedJobs.map(j => ({
          id: j._id,
          title: j.title,
          skillsNeeded: j.requirements || [],
          description: j.description || ""
        }))
      }
    });

    if (!pipelineResult || pipelineResult.success === false) {
      if (pipelineResult?.locked) {
        return res.status(403).json(pipelineResult);
      }
      return res.status(502).json({
        success: false,
        message: pipelineResult?.message || "AI model failed to generate a structured report. Daily quota not deducted.",
      });
    }

    const parsedJson = pipelineResult;

    // 7. Save report to MongoDB
    const report = await SkillGapReport.create({
      candidateId: req.user._id,
      reportDate: todayStr,
      candidateSkills,
      matchedJobIds,
      missingSkills: parsedJson.missing_skills || [],
      recommendedSkills: parsedJson.priority_skills || [],
      reportSummary: parsedJson.summary || "",
      detailedAnalysis: parsedJson.career_impact || "",
      confidence: parsedJson.confidence_score >= 80 ? "high" : parsedJson.confidence_score >= 50 ? "medium" : "low",
      aiProvider: "ai-pipeline",
      rawAiResponse: parsedJson,
    });


    res.status(201).json({
      success: true,
      source: "generated_today",
      report,
    });

  } catch (error) {
    console.error("[Skill Gap Report Error] Failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
