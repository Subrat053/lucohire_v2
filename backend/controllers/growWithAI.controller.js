const crypto = require('crypto');
const { getAiFeatureCache, setAiFeatureCache } = require('../services/ai/mongoCacheHelper');
const { getCareerGPSAnalysis, getHiringBarriersAnalysis, getSkillGapAnalysis, getAICareerReportAnalysis, getIncomeOpportunitiesAnalysis, getFullResumeOptimizationAnalysis, getInterviewQuestionsAnalysis } = require('../services/ai/growWithAILLM.service');
const logger = require('../utils/logger');
const ProviderProfile = require('../models/ProviderProfile');
const JobPost = require('../models/JobPost');
const IncomePathCache = require('../models/IncomePathCache');
const StagingCandidate = require('../models/StagingCandidate');

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

exports.getCareerGPS = async (req, res) => {
  try {
    const userId = req.user.id;
    let { fileHash, parsedData } = req.body;

    let targetHash = fileHash;
    let dataToAnalyze = parsedData;

    if (!targetHash && !dataToAnalyze) {
      const { resolveUserData } = require('../utils/aiResolution');
      const resolved = await resolveUserData(userId);
      if (resolved.error) {
        return res.status(400).json({ success: false, code: 'REQUIRED_DATA_MISSING', message: resolved.error });
      }
      targetHash = resolved.fileHash;
      dataToAnalyze = resolved.dataToAnalyze;
    } else if (dataToAnalyze) {
      targetHash = crypto.createHash('sha256').update(JSON.stringify(dataToAnalyze)).digest('hex');
    }

    const redisKey = `careerGPS:${targetHash}`;

    let gpsData = await getAiFeatureCache('careerGPS', targetHash, redisKey);
    let existingReport = null;

    if (req.body.improve && gpsData) {
      existingReport = gpsData;
      gpsData = null; // force regeneration
    }

    if (!gpsData) {
      if (req.body.cachedOnly || req.query.cachedOnly === 'true') {
        return res.status(200).json({ success: true, needsGeneration: true });
      }

      if (!dataToAnalyze) {
        const { getCachedResume } = require('../services/ai/resumeCache.service');
        const resumeCache = await getCachedResume(targetHash);
        if (resumeCache && resumeCache.parsedResult) {
          dataToAnalyze = resumeCache.parsedResult;
        } else {
          return res.status(400).json({ success: false, message: 'Parsed resume data is required for first-time analysis' });
        }
      }
      
      gpsData = await getCareerGPSAnalysis(dataToAnalyze, existingReport);
      
      await setAiFeatureCache('careerGPS', targetHash, redisKey, gpsData);
    } else { 
      if (!req.body.improve) {
        res.locals.skipAiLimitIncrement = true; 
      }
    }

    // Check Premium Status
    const providerProfile = await ProviderProfile.findOne({ user: userId });
    // Assuming isPremium logic from careerHealth
    const isPremium = providerProfile && providerProfile.subscription && providerProfile.subscription.planId !== 'free' && providerProfile.subscription.status === 'active';

    // if (!isPremium) {
    //   // Free users get a stripped down version
    //   return res.status(200).json({
    //     success: true,
    //     isLocked: true,
    //     data: {
    //       current_role: gpsData.current_role,
    //       recommended_next_role: gpsData.recommended_next_role,
    //       reasoning_summary: gpsData.reasoning_summary,
    //     }
    //   });
    // }

    return res.status(200).json({
      success: true,
      isLocked: false,
      data: gpsData
    });

  } catch (error) {
    logger.error('Error generating Career GPS', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate Career GPS' });
  }
};

exports.getHiringBarriers = async (req, res) => {
  try {
    const userId = req.user.id;
    let { fileHash, parsedData } = req.body;

    let targetHash = fileHash;
    let dataToAnalyze = parsedData;

    if (!targetHash && !dataToAnalyze) {
      const { resolveUserData } = require('../utils/aiResolution');
      const resolved = await resolveUserData(userId);
      if (resolved.error) {
        return res.status(400).json({ success: false, code: 'REQUIRED_DATA_MISSING', message: resolved.error });
      }
      targetHash = resolved.fileHash;
      dataToAnalyze = resolved.dataToAnalyze;
    } else if (dataToAnalyze) {
      targetHash = crypto.createHash('sha256').update(JSON.stringify(dataToAnalyze)).digest('hex');
    }

    const redisKey = `hiringBarriers:${targetHash}`;
    let barrierData = await getAiFeatureCache('hiringBarriers', targetHash, redisKey);
    let existingReport = null;

    if (req.body.improve && barrierData) {
      existingReport = barrierData;
      barrierData = null; // force regeneration
    }

    if (!barrierData) {
      if (req.body.cachedOnly || req.query.cachedOnly === 'true') {
        return res.status(200).json({ success: true, needsGeneration: true });
      }

      if (!dataToAnalyze) {
        const { getCachedResume } = require('../services/ai/resumeCache.service');
        const resumeCache = await getCachedResume(targetHash);
        if (resumeCache && resumeCache.parsedResult) {
          dataToAnalyze = resumeCache.parsedResult;
        } else {
          return res.status(400).json({ success: false, message: 'Parsed resume data is required for first-time analysis' });
        }
      }
      
      // Dynamic Skill Gap: Fetch real market skills from scraped jobs
      let marketSkills = [];
      try {
        const candidateTitle = dataToAnalyze?.basics?.label || dataToAnalyze?.work?.[0]?.position || '';
        
        let jobQuery = { skills: { $exists: true, $not: { $size: 0 } } };
        
        // If candidate has a title, try to find somewhat relevant scraped jobs (case insensitive regex)
        if (candidateTitle) {
          // just taking the first word or main keyword if possible, or fallback to general
          const titleKeyword = candidateTitle.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
          if (titleKeyword.length > 2) {
             jobQuery.jobTitle = { $regex: titleKeyword, $options: 'i' };
          }
        }
        
        const scrapedJobs = await StagingCandidate.find(jobQuery)
          .sort({ createdAt: -1 })
          .limit(20)
          .select('skills');
          
        if (scrapedJobs.length > 0) {
          // Extract and flatten skills
          const allSkills = scrapedJobs.flatMap(job => job.skills || []);
          // Count frequencies to find the most common ones
          const skillCounts = {};
          allSkills.forEach(skill => {
            if (!skill) return;
            const s = skill.toLowerCase().trim();
            skillCounts[s] = (skillCounts[s] || 0) + 1;
          });
          // Take top 30 trending skills from market
          marketSkills = Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(e => e[0]);
            
          logger.info(`[Dynamic Skill Gap] Extracted ${marketSkills.length} market skills for title: ${candidateTitle}`);
        } else {
          // Fallback to latest jobs if no specific match
          const latestJobs = await StagingCandidate.find({ skills: { $exists: true, $not: { $size: 0 } } })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('skills');
            
          const allSkills = latestJobs.flatMap(job => job.skills || []);
          marketSkills = [...new Set(allSkills.map(s => s.toLowerCase().trim()))].slice(0, 30);
          logger.info(`[Dynamic Skill Gap] Fallback extracted ${marketSkills.length} general market skills`);
        }
      } catch (err) {
        logger.error('[Dynamic Skill Gap] Failed to fetch market skills:', err.message);
      }
      
      barrierData = await getHiringBarriersAnalysis(dataToAnalyze, marketSkills, existingReport);
      await setAiFeatureCache('hiringBarriers', targetHash, redisKey, barrierData);
    } else { 
      if (!req.body.improve) {
        res.locals.skipAiLimitIncrement = true; 
      }
    }

    // Check Premium Status
    const providerProfile = await ProviderProfile.findOne({ user: userId });
    const isPremium = providerProfile && providerProfile.subscription && providerProfile.subscription.planId !== 'free' && providerProfile.subscription.status === 'active';

    // if (!isPremium) {
    //   // Free users get a stripped down version
    //   return res.status(200).json({
    //     success: true,
    //     isLocked: true,
    //     data: {
    //       hiring_barrier_score: barrierData.hiring_barrier_score,
    //       top_reasons: barrierData.top_reasons && barrierData.top_reasons.length > 0 ? [barrierData.top_reasons[0]] : [],
    //     }
    //   });
    // }

    return res.status(200).json({
      success: true,
      isLocked: false,
      data: barrierData
    });

  } catch (error) {
    logger.error('Error generating Hiring Barriers', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate Hiring Barriers analysis' });
  }
};

exports.getSkillGap = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileHash, parsedData, jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ success: false, message: 'jobDescription is required' });
    }

    if (!fileHash && !parsedData) {
      return res.status(400).json({ success: false, message: 'fileHash or parsedData is required' });
    }

    let targetHash = fileHash;
    if (!targetHash && parsedData) {
      targetHash = crypto.createHash('sha256').update(JSON.stringify(parsedData)).digest('hex');
    }

    // Hash the JD to use in the cache key
    const jdHash = crypto.createHash('md5').update(jobDescription).digest('hex');
    const featureName = `skillGap:${jdHash}`;
    const redisKey = `skillGap:${targetHash}:${jdHash}`;

    let gapData = await getAiFeatureCache(featureName, targetHash, redisKey);
    let existingReport = null;

    if (req.body.improve && gapData) {
      existingReport = gapData;
      gapData = null; // force regeneration
    }

    if (!gapData) {
      let dataToAnalyze = parsedData;
      if (!dataToAnalyze) {
        const { getCachedResume } = require('../services/ai/resumeCache.service');
        const resumeCache = await getCachedResume(targetHash);
        if (resumeCache && resumeCache.parsedResult) {
          dataToAnalyze = resumeCache.parsedResult;
        } else {
          return res.status(400).json({ success: false, message: 'Parsed resume data is required for first-time analysis' });
        }
      }
      
      gapData = await getSkillGapAnalysis(dataToAnalyze, jobDescription, existingReport);
      await setAiFeatureCache(featureName, targetHash, redisKey, gapData);
    } else { 
      if (!req.body.improve) {
        res.locals.skipAiLimitIncrement = true; 
      }
    }

    // Check Premium Status
    const providerProfile = await ProviderProfile.findOne({ userId });
    const isPremium = providerProfile && providerProfile.subscription && providerProfile.subscription.planId !== 'free' && providerProfile.subscription.status === 'active';

    // Temporarily disabled premium lock for testing
    // if (!isPremium) {
    //   return res.status(200).json({
    //     success: true,
    //     isLocked: true,
    //     data: {
    //       job_match_score: gapData.job_match_score,
    //       matched_skills: gapData.matched_skills,
    //       missing_critical_skills: gapData.missing_critical_skills,
    //       missing_optional_skills: gapData.missing_optional_skills
    //     }
    //   });
    // }

    return res.status(200).json({
      success: true,
      isLocked: false,
      data: gapData
    });

  } catch (error) {
    logger.error('Error generating Skill Gap Report', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate Skill Gap Report' });
  }
};

exports.getAtsOptimizer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileHash, parsedData, jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ success: false, message: 'jobDescription is required' });
    }

    const { resolveUserData } = require('../utils/aiResolution');
    const resolved = await resolveUserData(userId);
    
    let dataToAnalyze = parsedData;
    let targetHash = fileHash;

    if (!resolved.error && resolved.dataToAnalyze) {
      // Prioritize the backend-merged data (which includes the actual uploaded resume cache)
      dataToAnalyze = resolved.dataToAnalyze;
      targetHash = resolved.fileHash;
    } else if (!dataToAnalyze) {
      return res.status(400).json({ success: false, message: 'Parsed resume data or complete profile is required for analysis' });
    }

    if (!targetHash && dataToAnalyze) {
      targetHash = crypto.createHash('sha256').update(JSON.stringify(dataToAnalyze)).digest('hex');
    }

    // Hash the JD to use in the cache key
    const jdHash = crypto.createHash('md5').update(jobDescription).digest('hex');
    const featureName = `atsOptimizer_v2:${jdHash}`;
    const redisKey = `atsOptimizer_v2:${targetHash}:${jdHash}`;

    let gapData = await getAiFeatureCache(featureName, targetHash, redisKey);

    if (!gapData) {
      const { getAtsOptimizerAnalysis } = require('../services/ai/growWithAILLM.service');
      gapData = await getAtsOptimizerAnalysis(dataToAnalyze, jobDescription);
      
      await setAiFeatureCache(featureName, targetHash, redisKey, gapData);
    } else { res.locals.skipAiLimitIncrement = true; }

    // Unlocked per user request
    return res.status(200).json({
      success: true,
      isLocked: false,
      data: gapData
    });

  } catch (error) {
    logger.error('Error generating ATS Optimizer Report', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate ATS Optimizer Report' });
  }
};

exports.getJobMatchingEngine = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileHash, parsedData, jobs } = req.body;

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ success: false, message: 'jobs array is required' });
    }

    let targetHash = fileHash;
    let dataToAnalyze = parsedData;

    if (!targetHash && !dataToAnalyze) {
      const { resolveUserData } = require('../utils/aiResolution');
      const resolved = await resolveUserData(userId);
      if (resolved.error) {
        return res.status(400).json({ success: false, code: 'REQUIRED_DATA_MISSING', message: resolved.error });
      }
      targetHash = resolved.fileHash;
      dataToAnalyze = resolved.dataToAnalyze;
    } else if (dataToAnalyze) {
      targetHash = crypto.createHash('sha256').update(JSON.stringify(dataToAnalyze)).digest('hex');
    }

    if (!dataToAnalyze) {
      const { getCachedResume } = require('../services/ai/resumeCache.service');
      const resumeCache = await getCachedResume(targetHash);
      if (resumeCache && resumeCache.parsedResult) {
        dataToAnalyze = resumeCache.parsedResult;
      } else {
        return res.status(400).json({ success: false, message: 'Parsed resume data is required for first-time analysis' });
      }
    }

    // Rank jobs based on basic code logic
    const rankedJobs = jobs.map(job => {
      let score = 0;
      
      const userSkills = (dataToAnalyze.skills || []).map(s => typeof s === 'string' ? s.toLowerCase() : '');
      const jobSkill = (job.skill || '').toLowerCase();
      
      if (userSkills.includes(jobSkill)) score += 10;
      
      const title = (job.title || '').toLowerCase();
      const currRole = (dataToAnalyze.current_role || '').toLowerCase();
      const headline = (dataToAnalyze.headline || '').toLowerCase();
      if (currRole && title.includes(currRole)) score += 5;
      if (headline && headline.includes(title)) score += 5;
      
      const userCity = (dataToAnalyze.personal_info?.location?.city || '').toLowerCase();
      const jobCity = (job.city || '').toLowerCase();
      if (userCity && jobCity === userCity) score += 5;
      
      return { ...job, rankScore: score };
    }).sort((a, b) => b.rankScore - a.rankScore);
    
    const top5Jobs = rankedJobs.slice(0, 5);

    // Hash the top 5 job IDs to use in the cache key
    const jobIdsHash = crypto.createHash('md5').update(top5Jobs.map(j => j._id || j.title).join(',')).digest('hex');
    const featureName = `jobMatchingEngineV2:${jobIdsHash}`;
    const redisKey = `jobMatchingEngineV2:${targetHash}:${jobIdsHash}`;

    let matchData = await getAiFeatureCache(featureName, targetHash, redisKey);

    if (!matchData) {
      const { getJobMatchingEngineAnalysis } = require('../services/ai/growWithAILLM.service');
      matchData = await getJobMatchingEngineAnalysis(dataToAnalyze, top5Jobs);
      await setAiFeatureCache(featureName, targetHash, redisKey, matchData);
    } else { res.locals.skipAiLimitIncrement = true; }

    return res.status(200).json({
      success: true,
      data: matchData
    });

  } catch (error) {
    logger.error('Error generating Job Matching Engine', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate Job Matching Engine analysis' });
  }
};
exports.getAICareerReport = async (req, res) => {
  try {
    const userId = req.user.id;
    let { fileHash, parsedData } = req.body;

    let targetHash = fileHash;
    let dataToAnalyze = parsedData;

    if (!targetHash && !dataToAnalyze) {
      const { resolveUserData } = require('../utils/aiResolution');
      const resolved = await resolveUserData(userId);
      if (resolved.error) {
        return res.status(400).json({ success: false, code: 'REQUIRED_DATA_MISSING', message: resolved.error });
      }
      targetHash = resolved.fileHash;
      dataToAnalyze = resolved.dataToAnalyze;
    } else if (dataToAnalyze) {
      targetHash = crypto.createHash('sha256').update(JSON.stringify(dataToAnalyze)).digest('hex');
    }

    const redisKey = `aiCareerReport:${targetHash}`;
    let reportData = await getAiFeatureCache('aiCareerReport', targetHash, redisKey);
    let existingReport = null;

    if (req.body.improve && reportData) {
      existingReport = reportData;
      reportData = null; // force regeneration
    }

    if (!reportData) {
      if (req.body.cachedOnly || req.query.cachedOnly === 'true') {
        return res.status(200).json({ success: true, needsGeneration: true });
      }

      if (!dataToAnalyze) {
        const { getCachedResume } = require('../services/ai/resumeCache.service');
        const resumeCache = await getCachedResume(targetHash);
        if (resumeCache && resumeCache.parsedResult) {
          dataToAnalyze = resumeCache.parsedResult;
        } else {
          return res.status(400).json({ success: false, message: 'Parsed resume data is required for first-time analysis' });
        }
      }
      
      reportData = await getAICareerReportAnalysis(dataToAnalyze, existingReport);
      await setAiFeatureCache('aiCareerReport', targetHash, redisKey, reportData);
    } else { 
      if (!req.body.improve) {
        res.locals.skipAiLimitIncrement = true; 
      }
    }

    return res.status(200).json({
      success: true,
      data: reportData
    });

  } catch (error) {
    logger.error('Error generating AI Career Report', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate AI Career Report' });
  }
};

/**
 * AI-08: Income Opportunities Dashboard
 * Backend-first: computes opportunity category counts from DB, then calls AI with summary snapshot.
 * Weekly cache: keyed by userId + ISO weekKey + profileVersion.
 */
exports.getIncomeOpportunities = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Load candidate profile
    const providerProfile = await ProviderProfile.findOne({ user: userId }).lean();
    if (!providerProfile) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    const isPremium = providerProfile.subscription &&
      providerProfile.subscription.planId !== 'free' &&
      providerProfile.subscription.status === 'active';

    const profileVersion = providerProfile.profileVersion || 1;

    // 2. Compute weekly cache key
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    const weekKey = `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    const rawCacheKey = `${userId}:${weekKey}:${profileVersion}`;
    const cacheKey = crypto.createHash('sha256').update(rawCacheKey).digest('hex');

    // 3. Check weekly cache in MongoDB
    const cached = await IncomePathCache.findOne({ cacheKey }).lean();
    if (cached && cached.result) {
      logger.info(`[AI-08] Cache hit for userId=${userId} weekKey=${weekKey}`);
      const result = cached.result;
      const paths = isPremium
        ? (result.recommended_paths || [])
        : (result.recommended_paths || []).slice(0, 3);
      return res.status(200).json({
        success: true,
        isLocked: !isPremium && (result.recommended_paths || []).length > 3,
        source: 'cache',
        data: { ...result, recommended_paths: paths },
      });
    }

    // 4. Backend counts opportunity categories from JobPost
    const candidateSkills = (providerProfile.skills || []).map(s => s.toLowerCase());
    const candidateCity = (providerProfile.city || '').toLowerCase();

    // Base filter: active jobs where skill matches one of candidate's skills OR city matches
    const baseQuery = {
      status: 'active',
      $or: [
        { skill: { $in: candidateSkills.map(s => new RegExp(s, 'i')) } },
        { city: new RegExp(candidateCity, 'i') },
      ],
    };

    // Run counts in parallel for each category
    const [
      fullTimeCount,
      partTimeCount,
      freelanceCount,
      remoteCount,
      contractCount,
      localServiceCount,
    ] = await Promise.all([
      JobPost.countDocuments({ ...baseQuery, scheduleType: 'full_time' }),
      JobPost.countDocuments({ ...baseQuery, scheduleType: 'part_time' }),
      JobPost.countDocuments({ ...baseQuery, scheduleType: { $in: ['flexible', 'one_time'] } }),
      JobPost.countDocuments({ ...baseQuery, workMode: 'remote' }),
      JobPost.countDocuments({ ...baseQuery, scheduleType: { $in: ['shift', 'part_time'] } }),
      JobPost.countDocuments({ ...baseQuery, workMode: 'onsite', city: new RegExp(candidateCity, 'i') }),
    ]);

    // 5. Build structured candidate summary (sent to AI — not raw jobs)
    const candidateSummary = {
      skills: providerProfile.skills || [],
      experience: providerProfile.experience || 'Not specified',
      location: providerProfile.city || providerProfile.location?.city || 'Not specified',
      state: providerProfile.state || providerProfile.location?.state || '',
      subscription_tier: isPremium ? 'premium' : 'free',
      availability: providerProfile.availability || 'Not specified',
      opportunity_counts: {
        full_time: fullTimeCount,
        part_time: partTimeCount,
        freelance: freelanceCount,
        contract: contractCount,
        remote: remoteCount,
        local_service: localServiceCount,
      },
    };

    // 6. Call AI
    let aiResult = null;
    try {
      aiResult = await getIncomeOpportunitiesAnalysis(candidateSummary);
    } catch (aiError) {
      logger.error('[AI-08] AI call failed', { error: aiError.message });
      // Return safe fallback without caching failure
      return res.status(200).json({
        success: false,
        isLocked: false,
        source: 'fallback',
        data: {
          summary: 'Unable to generate income path recommendations at this time.',
          recommended_paths: [],
        },
      });
    }

    // 7. Validate and normalize result
    if (!aiResult || !Array.isArray(aiResult.recommended_paths)) {
      aiResult = {
        summary: 'Income opportunity analysis complete.',
        recommended_paths: [],
        confidence_score: 0,
        needs_review: true,
      };
    }

    // Clamp paths to max 7
    aiResult.recommended_paths = (aiResult.recommended_paths || []).slice(0, 7);

    // 8. Save to weekly cache (expires in 7 days)
    const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);
    try {
      await IncomePathCache.create({
        userId,
        weekKey,
        profileVersion,
        cacheKey,
        candidateSummary,
        result: aiResult,
        expiresAt,
      });
    } catch (cacheErr) {
      // Non-fatal: log and continue (duplicate key on race condition)
      logger.warn('[AI-08] Cache save failed', { error: cacheErr.message });
    }

    // 9. Apply free/premium gating before returning
    const paths = isPremium
      ? aiResult.recommended_paths
      : aiResult.recommended_paths.slice(0, 3);

    return res.status(200).json({
      success: true,
      isLocked: !isPremium && aiResult.recommended_paths.length > 3,
      source: 'ai',
      data: { ...aiResult, recommended_paths: paths },
    });

  } catch (error) {
    logger.error('[AI-08] Error generating Income Opportunities', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate Income Opportunities' });
  }
};

exports.optimizeFullResume = async (req, res) => {
  try {
    const { parsedData, jobDescription } = req.body;
    if (!parsedData) {
      return res.status(400).json({ success: false, message: 'parsedData is required' });
    }

    const resultObj = await getFullResumeOptimizationAnalysis(parsedData, jobDescription);
    
    return res.status(200).json({
      success: true,
      data: resultObj
    });

  } catch (error) {
    logger.error('[AI-OPTIMIZE] Error optimizing full resume', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to optimize resume' });
  }
};

exports.getInterviewQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    let { fileHash, parsedData, category, existingQuestions } = req.body;

    let targetHash = fileHash;
    let dataToAnalyze = parsedData;

    if (!targetHash && !dataToAnalyze) {
      const { resolveUserData } = require('../utils/aiResolution');
      const resolved = await resolveUserData(userId);
      if (resolved.error) {
        return res.status(400).json({ success: false, code: 'REQUIRED_DATA_MISSING', message: resolved.error });
      }
      targetHash = resolved.fileHash;
      dataToAnalyze = resolved.dataToAnalyze;
    } else if (dataToAnalyze && !targetHash) {
      targetHash = crypto.createHash('sha256').update(JSON.stringify(dataToAnalyze)).digest('hex');
    }

    const featureName = 'interviewQuestions';
    const redisKey = `interviewQuestions:${userId}`;
    let cachedQuestions = await getAiFeatureCache(featureName, userId, redisKey) || { technical: [], behavioural: [], hr: [] };

    // If no category is provided, just return the cached questions
    if (!category) {
      return res.status(200).json({
        success: true,
        isLocked: false,
        data: cachedQuestions
      });
    }

    if (!dataToAnalyze) {
      const { getCachedResume } = require('../services/ai/resumeCache.service');
      const resumeCache = await getCachedResume(targetHash);
      if (resumeCache && resumeCache.parsedResult) {
        dataToAnalyze = resumeCache.parsedResult;
      } else {
        return res.status(400).json({ success: false, message: 'Parsed resume data is required' });
      }
    }

    const newQuestions = await getInterviewQuestionsAnalysis(dataToAnalyze, category, existingQuestions || []);
    
    // Append the newly generated questions to the cache for that category
    if (newQuestions && newQuestions.questions) {
      cachedQuestions[category] = [...(cachedQuestions[category] || []), ...newQuestions.questions];
      
      // Save updated cache
      await setAiFeatureCache(featureName, userId, redisKey, cachedQuestions);
    }

    return res.status(200).json({
      success: true,
      isLocked: false,
      data: newQuestions
    });
  } catch (error) {
    logger.error('Error generating Interview Questions', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to generate Interview Questions' });
  }
};

exports.refreshInterviewQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resolveUserData } = require('../utils/aiResolution');
    const resolved = await resolveUserData(userId);
    if (resolved.error) {
      return res.status(400).json({ success: false, message: resolved.error });
    }
    
    const targetHash = resolved.fileHash;
    const featureName = 'interviewQuestions';
    const redisKey = `interviewQuestions:${userId}`;
    
    // Clear the cache
    await setAiFeatureCache(featureName, userId, redisKey, { technical: [], behavioural: [], hr: [] });

    return res.status(200).json({ success: true, message: 'Cycle refreshed' });
  } catch (error) {
    logger.error('Error refreshing Interview Questions', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to refresh Interview Questions' });
  }
};
