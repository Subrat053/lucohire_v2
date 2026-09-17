const prisma = require('../config/prisma');
const crypto = require('crypto');
const logger = require('../utils/logger');

const isEnabled = (name) => String(process.env[name] || '').toLowerCase() === 'true';
const resumeAiEnabled = () => isEnabled('AI_FEATURES_ENABLED') && isEnabled('ENABLE_RESUME_AI');

async function getResumeToolkit(req, res) {
  if (!resumeAiEnabled()) {
    return res.status(503).json({
      success: false,
      code: 'RESUME_FEATURE_DISABLED',
      message: 'AI resume toolkit is currently disabled.',
    });
  }

  try {
    const { callOpenAI } = require('../services/ai/llmService');
    const { resolveUserData } = require('../utils/aiResolution');
    const { getAiFeatureCache, setAiFeatureCache } = require('../services/ai/mongoCacheHelper');
    const userId = req.user?.id || req.user?._id;
    const force = req.query.force === 'true';

    // 1. Try resolveUserData first (works if user has resume or skills+description)
    let dataToAnalyze = null;
    let fileHash = null;

    const resolved = await resolveUserData(userId);
    if (!resolved.error) {
      dataToAnalyze = resolved.dataToAnalyze;
      fileHash = resolved.fileHash;
    } else {
      // Fallback: build from whatever profile fields exist, even incomplete
      const provider = await prisma.providerProfile.findUnique({
        where: { user: String(userId) },
        include: { userRecord: true },
      });
      if (provider) {
        const partial = {
          name: provider.userRecord?.name || provider.profileName || '',
          skills: provider.skills || [],
          experience: provider.experience || '',
          description: provider.description || '',
          desiredRole: provider.desiredRole || provider.tier || '',
          city: provider.city || '',
          education: provider.education || '',
          languages: provider.languages || [],
        };
        // Only error out if truly nothing exists
        const hasAnything = partial.name || partial.skills.length > 0 || partial.experience || partial.description;
        if (!hasAnything) {
          return res.status(400).json({
            success: false,
            code: 'REQUIRED_DATA_MISSING',
            message: 'Please complete your profile with at least your name, skills, or experience to get AI analysis.',
          });
        }
        dataToAnalyze = partial;
        fileHash = crypto.createHash('sha256').update(JSON.stringify(partial)).digest('hex');
      } else {
        return res.status(404).json({ success: false, message: 'Profile not found.' });
      }
    }

    // 2. Check cache (skip if force refresh)
    const cacheKey = `resumeToolkit_v6:${fileHash}`;
    if (!force) {
      const cached = await getAiFeatureCache('resumeToolkit_v6', fileHash, cacheKey);
      if (cached) {
        res.locals.skipAiLimitIncrement = true;
        return res.status(200).json({ success: true, data: cached, cached: true });
      }
    }

    if (req.query.cachedOnly === 'true' || req.query.cachedOnly === true) {
      return res.status(200).json({ success: true, needsGeneration: true });
    }

    // 3. Build profile-specific prompt with whatever data we have
    const name = dataToAnalyze?.name || 'the candidate';
    const role = dataToAnalyze?.desiredRole || dataToAnalyze?.current_role || dataToAnalyze?.title || dataToAnalyze?.tier || 'Job Seeker';
    const skills = Array.isArray(dataToAnalyze?.skills)
      ? dataToAnalyze.skills.slice(0, 20).join(', ')
      : String(dataToAnalyze?.skills || 'Not specified');
    const experience = String(dataToAnalyze?.experience || '').substring(0, 600) || 'Not provided';
    const education = Array.isArray(dataToAnalyze?.education) ? JSON.stringify(dataToAnalyze.education).substring(0, 300) : (String(dataToAnalyze?.education || '').substring(0, 300) || 'Not provided');
    const projects = Array.isArray(dataToAnalyze?.projects) ? JSON.stringify(dataToAnalyze.projects).substring(0, 300) : 'None listed';
    const languages = Array.isArray(dataToAnalyze?.languages) ? dataToAnalyze.languages.join(', ') : 'Not specified';
    const description = String(dataToAnalyze?.description || '').substring(0, 400) || 'Not provided';
    const city = dataToAnalyze?.city || 'Not specified';

    const prompt = `You are an expert AI Resume & Profile Analyzer. Analyze this candidate profile and return a JSON analysis.

CANDIDATE PROFILE:
Name: ${name}
Target Role: ${role}
Skills: ${skills || 'None listed'}
Experience: ${experience}
Education: ${education}
Projects: ${projects}
Languages: ${languages}
Profile Summary: ${description}
Location: ${city}

INSTRUCTIONS: Analyze the profile above and return ONLY valid JSON with this EXACT structure. No markdown, no explanation, no code blocks:
{"resumeScore":{"overall":0,"content":0,"structure":0,"ats":0},"aiSuggestions":["Detailed specific recommendation 1...", "Detailed specific recommendation 2..."],"resumeStats":{"atsScore":0,"readability":"Good","sections":"5/10","keywords":"8/20"},"targetRole":"${role}","strengthSummary":"summary text"}

Rules:
- overall: 0-100 based on profile quality. If very little data, give 30-50. If rich data, 70-90.
- content: quality of experience/skills descriptions
- structure: how organized and complete the profile is  
- ats: keyword relevance for the target role
- aiSuggestions: MUST provide exactly 5 highly specific, actionable, and tailored recommendations (formatted as detailed bullet points) based strictly on what is missing or weak in the provided profile. DO NOT give generic advice. Instead of "add keywords", say exactly WHICH keywords to add (e.g., "Add 'React Hooks' and 'Redux' to your skills") based on the Target Role. Instead of "add metrics", give a concrete example related to their role (e.g., "Quantify your ${role} experience by adding metrics like 'Reduced API latency by X%'").
- readability: one of "Excellent", "Good", "Average", "Poor"
- sections: X/10 based on how many standard resume sections are filled
- keywords: estimate based on skills vs typical keywords for ${role}
- strengthSummary: 1-2 sentences about what is strong in this profile`;

    let llmResponse = { used: false, output: null, reason: 'Failed to call OpenAI' };
    try {
      const result = await callOpenAI(prompt);
      
      if (result.used && result.output) {
        llmResponse.output = result.output;
        llmResponse.used = true;
      } else {
        llmResponse.reason = result.reason || 'OpenAI returned empty';
      }
    } catch (apiError) {
      logger.error('resume_toolkit_openai_error', { error: apiError.message });
      llmResponse.reason = apiError.message;
    }

    let aiData;
    if (llmResponse.used && llmResponse.output && typeof llmResponse.output === 'object') {
      // Validate scores are numbers
      const s = llmResponse.output.resumeScore || {};
      aiData = {
        ...llmResponse.output,
        resumeScore: {
          overall: Number(s.overall) || 40,
          content: Number(s.content) || 40,
          structure: Number(s.structure) || 35,
          ats: Number(s.ats) || 35,
        },
        resumeStats: {
          atsScore: Number(llmResponse.output.resumeStats?.atsScore) || 35,
          readability: llmResponse.output.resumeStats?.readability || 'Average',
          sections: llmResponse.output.resumeStats?.sections || '4/10',
          keywords: llmResponse.output.resumeStats?.keywords || '5/20',
        },
        aiSuggestions: Array.isArray(llmResponse.output.aiSuggestions)
          ? llmResponse.output.aiSuggestions
          : [],
        targetRole: role,
      };
    } else {
      logger.warn('resume_toolkit_llm_fallback', { reason: llmResponse.reason });
      const skillCount = Array.isArray(dataToAnalyze?.skills) ? dataToAnalyze.skills.length : 0;
      const hasExp = !!(dataToAnalyze?.experience);
      const hasDesc = !!(dataToAnalyze?.description);
      const baseScore = Math.min(85, 35 + skillCount * 4 + (hasExp ? 10 : 0) + (hasDesc ? 5 : 0));
      aiData = {
        resumeScore: { overall: baseScore, content: baseScore + 3, structure: Math.max(30, baseScore - 5), ats: Math.max(25, baseScore - 8) },
        aiSuggestions: [
          `Add highly specific keywords relevant to your target role (${role}) directly into your Experience and Skills sections to improve ATS parsing.`,
          'Quantify your professional achievements by adding concrete metrics (e.g., "Increased sales by 15%", "Reduced load time by 2 seconds") to your job descriptions.',
          'Ensure every technical skill listed in your Skills section is explicitly backed up by a real-world project or work experience bullet point.',
          'Expand your professional summary into a 3-4 sentence paragraph that highlights your core strengths, years of experience, and a major career achievement.',
          'Consider uploading a formal PDF version of your resume so our AI can perform a deep structural analysis and give you line-by-line optimization tips.'
        ],
        resumeStats: {
          atsScore: Math.max(25, baseScore - 8),
          readability: skillCount > 5 ? 'Good' : 'Average',
          sections: `${Math.min(10, 3 + skillCount)}/${10}`,
          keywords: `${Math.min(20, skillCount * 2)}/20`,
        },
        targetRole: role,
        strengthSummary: `Your profile shows ${skillCount} skills${hasExp ? ' and work experience' : ''}. ${hasDesc ? 'Your summary is a good start.' : 'Adding a professional summary will improve visibility.'}`,
      };
    }

    // 4. Cache result
    await setAiFeatureCache('resumeToolkit_v6', fileHash, cacheKey, aiData);

    return res.status(200).json({ success: true, data: aiData });
  } catch (error) {
    logger.error('resume_toolkit_error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to analyze resume & profile' });
  }
}

module.exports = { getResumeToolkit };
