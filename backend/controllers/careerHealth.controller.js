const crypto = require('crypto');
const { getCachedCareerHealth, setCachedCareerHealth } = require('../services/ai/careerHealthCache.service');
const { generateCareerHealthReport } = require('../services/ai/careerHealthLLM.service');
const logger = require('../utils/logger');
const ProviderProfile = require('../models/ProviderProfile');

exports.getCareerHealth = async (req, res) => {
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
    } else if (!targetHash && dataToAnalyze) {
      targetHash = crypto.createHash('sha256').update(JSON.stringify(dataToAnalyze)).digest('hex');
    }

    // 2. Check Cache
    let cachedReport = await getCachedCareerHealth(targetHash);
    let existingReport = null;
    let fullReport = null;

    if (req.body.improve && cachedReport) {
      existingReport = cachedReport;
      cachedReport = null; // force regeneration
    }

    if (cachedReport) {
      logger.info('[CareerHealth Controller] Serving from cache', { targetHash });
      fullReport = cachedReport;
      res.locals.skipAiLimitIncrement = true;
    } else {
      logger.info('[CareerHealth Controller] Cache miss, calling LLM or falling back', { targetHash });
      
      const providerProfile = await ProviderProfile.findOne({ user: userId });
      // If we miss cache, check if we should fallback to lastAnalyzedHash (meaning out of credits so no new background generation occurred, or it's still processing)
      if (providerProfile && providerProfile.lastAnalyzedHash && providerProfile.lastAnalyzedHash !== targetHash) {
         let fallbackReport = await getCachedCareerHealth(providerProfile.lastAnalyzedHash);
         if (fallbackReport) {
           logger.info('[CareerHealth Controller] Falling back to lastAnalyzedHash cache', { targetHash: providerProfile.lastAnalyzedHash });
           fullReport = fallbackReport;
           res.locals.skipAiLimitIncrement = true;
         }
      }
      
      if (!fullReport) {
        // 3. Fallback to LLM if cache miss and no fallback
        if (!dataToAnalyze) {
          // Try to recover parsedData from the resume cache if it wasn't passed directly
          const { getCachedResume } = require('../services/ai/resumeCache.service');
          const resumeCache = await getCachedResume(targetHash);
          if (resumeCache && resumeCache.parsedResult) {
            logger.info('[CareerHealth Controller] Recovered parsedData from resume cache', { targetHash });
            dataToAnalyze = resumeCache.parsedResult;
          } else {
            return res.status(400).json({ success: false, message: 'Cache miss. parsedData must be provided to generate report, and no previous resume cache was found for this hash.' });
          }
        }

        const llmResult = await generateCareerHealthReport(dataToAnalyze, existingReport);
        
        if (!llmResult.used || !llmResult.output) {
          logger.error('[CareerHealth Controller] LLM generation failed', { reason: llmResult.reason });
          return res.status(500).json({ success: false, message: 'Failed to generate career health report' });
        }

        fullReport = llmResult.output;
        
        // 4. Save to Cache asynchronously
        setCachedCareerHealth(targetHash, fullReport).catch(err => 
          logger.error('Failed to async save career health cache', err)
        );
      }
    }

    // 5. Apply Access Logic (Data Security)
    const provider = await ProviderProfile.findOne({ user: userId }).lean();
    // Assuming plan is stored somewhere, e.g., on provider or user. For now checking provider plan
    const isPremium = provider?.plan === 'premium' || provider?.plan === 'basic' || provider?.plan === 'enterprise';

    let responseData = fullReport;

    // if (!isPremium) {
    //   logger.info('[CareerHealth Controller] User is Free plan, stripping sensitive deep analytics');
    //   // Redact sensitive data for free users. Frontend will use mock data.
    //   responseData = {
    //     career_health_score: fullReport.career_health_score,
    //     summary: fullReport.summary,
    //     isLocked: true,
    //   };
    // } else {
    //   responseData.isLocked = false;
    // }
    responseData.isLocked = false;

    return res.status(200).json({
      success: true,
      data: responseData,
      source: cachedReport ? 'cache' : 'llm'
    });

  } catch (error) {
    logger.error('[CareerHealth Controller] Error', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving career health' });
  }
};
