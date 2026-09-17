const { handleProviderChat } = require('../services/ai/providerChatService');
const { buildProviderProfileSuggestion } = require('../services/ai/providerProfileService');
const { parseProviderMessage } = require('../services/ai/providerParser');
const { detectProviderIntent } = require('../services/ai/providerIntentService');
const { buildFallbackReply } = require('../services/ai/providerFallbackService');
const { getLLMHealth } = require('../services/ai/llmService');
const logger = require('../utils/logger');

function normalizeRecentMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(-8)
    .map((item) => ({
      author: item?.author || item?.role || 'user',
      text: String(item?.text || item?.content || '').trim(),
    }))
    .filter((item) => item.text);
}

async function chatWithAssistant(req, res) {
  try {
    const message = String(req.body?.message || '').trim();
    const providerId = req.user?._id || req.body?.providerId;
    const profileContext = req.body?.profileContext || {};
    const recentMessages = normalizeRecentMessages(req.body?.recentMessages || []);
    const conversationId = req.body?.conversationId || null;

    logger.info('provider_ai_chat_incoming', {
      providerId: String(providerId || ''),
      message,
      profileContext,
      recentMessageCount: recentMessages.length,
      conversationId,
    });

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized provider context',
      });
    }

    if (!message || message.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'message must be at least 2 characters',
      });
    }

    const result = await handleProviderChat({
      message,
      providerId,
      profileContext,
      recentMessages,
      conversationId,
    });

    if (!result.debug?.usedLLM) {
      logger.warn('provider_ai_chat_fallback_used', {
        providerId: String(providerId),
        reason: result.debug?.fallbackReason || 'Fallback parser used',
      });
    }

    logger.info('provider_ai_chat_response', {
      providerId: String(providerId),
      detectedIntent: result.detectedIntent,
      extracted: result.extracted,
      debug: result.debug,
      conversationId: result.conversationId,
      replyPreview: String(result.reply || '').slice(0, 180),
    });

    return res.status(200).json({
      success: true,
      data: {
        reply: result.reply,
        detectedIntent: result.detectedIntent,
        extracted: result.extracted,
        suggestions: result.suggestions,
        debug: result.debug,
        conversationId: result.conversationId,
      },
    });
  } catch (error) {
    logger.error('provider_ai_chat_error', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to process provider AI chat request',
      data: {
        reply: 'Assistant temporarily unavailable. Thodi der baad try karein.',
      },
    });
  }
}

async function buildProfileSuggestion(req, res) {
  try {
    const freeText = String(req.body?.freeText || '').trim();

    if (!freeText || freeText.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'freeText must be at least 5 characters',
      });
    }

    const result = await buildProviderProfileSuggestion({
      freeText,
      existingSkills: Array.isArray(req.body?.existingSkills) ? req.body.existingSkills : [],
      existingLanguages: Array.isArray(req.body?.existingLanguages) ? req.body.existingLanguages : [],
      profileContext: req.body?.profileContext || {},
    });

    logger.info('provider_ai_build_profile', {
      providerId: String(req.user?._id || ''),
      freeText,
      debug: result.debug,
      source: result.source,
    });

    return res.status(200).json({
      success: true,
      source: result.source,
      data: result.data,
      debug: result.debug,
    });
  } catch (error) {
    logger.error('provider_ai_build_profile_error', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to build profile suggestion',
    });
  }
}

async function healthCheck(req, res) {
  try {
    const llm = await getLLMHealth();

    return res.status(200).json({
      success: true,
      services: {
        api: 'ok',
        llm: llm.status,
        parser: 'ok',
      },
      env: {
        hasAnthropicKey: llm.hasAnthropicKey,
        hasOpenAIKey: llm.hasOpenAIKey,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch AI health',
    });
  }
}

async function testParser(req, res) {
  try {
    const message = String(req.body?.message || '').trim();
    const profileContext = req.body?.profileContext || {};

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'message is required',
      });
    }

    const parsed = parseProviderMessage({ message, profileContext });
    const intent = detectProviderIntent({ message, extracted: parsed.extracted });
    const fallback = buildFallbackReply({ intent, extracted: parsed.extracted });

    return res.status(200).json({
      success: true,
      data: {
        message,
        detectedIntent: intent,
        extracted: parsed.extracted,
        parserMatched: parsed.parserMatched,
        fallbackPreview: fallback,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to test parser',
    });
  }
}

async function buildProfileFromResume(req, res) {
  try {
    const path = require('path');
    const { detectDocumentText, detectPdfText } = require('../services/googleVision.service');
    const { parseResumeText } = require('../services/ai/llmService');

    // 17. Add backend logs for debugging
    logger.info('[Resume AI] Incoming resume upload request', {
      userId: String(req.user?._id || 'unauthorized'),
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype,
    });

    // 18. Ensure only logged-in provider can update/parse
    if (!req.user || req.user.activeRole !== 'provider') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Only logged-in providers can use the AI profile builder.',
      });
    }

    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a resume file using form-data field "resume".',
      });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp',
      'application/msword',
      'application/x-msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.docx', '.doc'];

    // 3. Block exe/js/html/svg/csv/xls/xlsx and unsupported files
    const blockedExtensions = ['.exe', '.js', '.html', '.htm', '.svg', '.sh', '.bat', '.csv', '.xls', '.xlsx'];
    const blockedMimeTypes = ['html', 'javascript', 'svg', 'executable', 'shell', 'csv', 'excel', 'spreadsheet'];

    const isBlocked = blockedExtensions.includes(ext) || 
                      blockedMimeTypes.some(m => file.mimetype.includes(m)) ||
                      !allowedMimeTypes.includes(file.mimetype) ||
                      !allowedExtensions.includes(ext);

    if (isBlocked) {
      logger.warn('[Resume AI] Blocked unsupported or potentially malicious file upload', {
        userId: String(req.user._id),
        fileName: file.originalname,
        mimeType: file.mimetype,
        extension: ext,
      });
      return res.status(400).json({
        success: false,
        message: '16. Invalid file. Allowed formats: PDF, DOCX, DOC, JPG, JPEG, PNG, WEBP. Executable, scripts, and spreadsheets are blocked.',
      });
    }

    // 4. File Hash Caching Check
    const crypto = require('crypto');
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const { getCachedResume, setCachedResume } = require('../services/ai/resumeCache.service');
    
    const cachedData = await getCachedResume(fileHash);
    let parsedResult;
    let secureUrl = '';

    const forceRefresh = true; // Cache bypassed as requested
    const isOldRawUrl = cachedData && cachedData.resumeUrl && cachedData.resumeUrl.includes('/raw/');

    if (cachedData && !forceRefresh && !isOldRawUrl) {
      logger.info('[Resume AI] Bypassing AI processing due to cache hit', { userId: String(req.user._id) });
      parsedResult = cachedData.parsedResult;
      secureUrl = cachedData.resumeUrl;
      res.locals.skipAiLimitIncrement = true; // DO NOT burn user quota on cache hits!
    } else {
      let extractedText = '';
      let fileData = null;
      
      const isPdf = ext === '.pdf' || file.mimetype === 'application/pdf';
      const isWord = ext === '.docx' || ext === '.doc' || 
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                     file.mimetype === 'application/msword' ||
                     file.mimetype === 'application/x-msword';

      let basicInfo = {};

      try {
        const { extractTextFromFile, extractBasicInfo } = require('../services/resumeExtractorService');
        extractedText = await extractTextFromFile(file.buffer, file.mimetype);
        
        // Extract basic deterministic fields (including newly parsed icon links)
        basicInfo = extractBasicInfo(extractedText);
        
        const isImageFile = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
        if (isImageFile || isPdf) {
            fileData = { mimeType: file.mimetype, base64: file.buffer.toString("base64") };
        }
      } catch (ocrError) {
        const isImageFile = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
        if (isImageFile || isPdf) {
          logger.warn('[Resume AI] Document text extraction failed, but falling back to LLM Multimodal', {
            userId: String(req.user._id),
            error: ocrError.message,
          });
          fileData = { mimeType: file.mimetype, base64: file.buffer.toString("base64") };
        } else {
          logger.error('[Resume AI] Document extraction failed (No multimodal fallback for this type)', {
            userId: String(req.user._id),
            error: ocrError.message,
          });
          return res.status(502).json({
            success: false,
            message: '16. Extraction failed. Could not read text from the file.',
            details: ocrError.message,
          });
        }
      }

      const cleanText = String(extractedText || '').trim();
      if (!cleanText && !fileData) {
        logger.warn('[Resume AI] Extraction completed but no text was found in the document, and no multimodal data available', {
          userId: String(req.user._id),
          fileName: file.originalname,
        });
        return res.status(422).json({
          success: false,
          message: '16. No text found. The document appears to be empty or scan quality is too low.',
        });
      }

      logger.info('[Resume AI] Successfully extracted context. Initiating LLM parsing...', {
        userId: String(req.user._id),
        textLength: cleanText.length,
        hasFileData: !!fileData
      });

      console.log('\n\n--- EXTRACTED RESUME TEXT FOR OPENAI ---');
      console.log(cleanText);
      console.log('--- BASIC INFO ---', basicInfo);
      console.log('------------------------------------------\n\n');

      // 6. Send extracted text to unified AI pipeline
      try {
        const { processAI } = require('../services/ai/aiPipelineService');
        const pipelineResult = await processAI({
          userId: req.user._id,
          role: 'provider',
          featureName: 'resume_parser',
          inputData: { input_data: cleanText, fileData }
        });

        if (!pipelineResult || pipelineResult.success === false) {
          throw new Error(pipelineResult?.warnings?.[0] || 'AI parsing failed or returned invalid response.');
        }

        const llmResult = {
          used: true,
          provider: 'ai-pipeline',
          output: pipelineResult.data,
        };

        // Fetch market pricing aggregates for suggested skills and city
        const suggestedSkill = llmResult.output?.specialities?.[0] || llmResult.output?.skills?.[0] || '';
        const suggestedCity = llmResult.output?.city || llmResult.output?.serviceLocations?.[0] || '';
        
        let marketStats = null;
        if (suggestedSkill && suggestedCity) {
          try {
            const JobPost = require('../models/JobPost');
            const match = {};
            match.skill = { $regex: String(suggestedSkill).trim(), $options: 'i' };
            match.city = { $regex: '^' + String(suggestedCity).trim(), $options: 'i' };
            
            const [agg] = await JobPost.aggregate([
              { $match: match },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  avgMin: { $avg: '$budgetMin' },
                  avgMax: { $avg: '$budgetMax' },
                },
              },
            ]);
            
            if (agg && Number(agg.count || 0) > 0) {
              const avgMin = Math.max(0, Math.round(Number(agg.avgMin || 0)));
              const avgMax = Math.max(avgMin, Math.round(Number(agg.avgMax || 0)));
              marketStats = {
                avgMin,
                avgMax,
                avg: Math.round((avgMin + avgMax) / 2),
                sampleSize: Number(agg.count || 0),
              };
            }
          } catch (marketErr) {
            logger.warn('[Resume AI] Failed to query market stats', { error: marketErr.message });
          }
        }
        // Normalize parsed suggestions to match profile field schema, and merge basicInfo
        parsedResult = normalizeProfileSuggestions(llmResult.output, marketStats, basicInfo);
        
        console.log('\n\n======================================================');
        console.log('         AI RESUME PARSING RESULT (GEMINI 1.5 PRO)    ');
        console.log('======================================================\n');
        console.log(JSON.stringify(parsedResult, null, 2));
        console.log('\n======================================================\n\n');

      } catch (llmError) {
        logger.error('[Resume AI] LLM structured parsing failed', {
          userId: String(req.user._id),
          error: llmError.message,
        });
        return res.status(502).json({
          success: false,
          message: '16. AI parsing failed. AI was unable to structure the resume details.',
          details: llmError.message,
        });
      }

      // Save resume locally in uploads/resumes (same as standard upload)
      try {
        const fs = require('fs');
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `resume_${req.user._id}_${Date.now()}${ext}`;
        const uploadPath = path.join(__dirname, '..', 'uploads', 'resumes', filename);
        
        fs.writeFileSync(uploadPath, file.buffer);
        secureUrl = `/uploads/resumes/${filename}`;
        
        logger.info('[Resume AI] Saved resume locally', { url: secureUrl });
      } catch (saveErr) {
        logger.error('[Resume AI] Failed to save resume locally', {
          userId: String(req.user._id),
          error: saveErr.message
        });
        // We can still proceed even if save fails, but secureUrl will be empty
      }

      // Save to cache after successfully completing the heavy lifting
      if (parsedResult && secureUrl) {
        await setCachedResume(fileHash, parsedResult, secureUrl);
      }
    }

    // Common Step: Always link the resume to the ProviderProfile and User, whether cached or not
    try {
      if (secureUrl) {
        const ProviderProfile = require('../models/ProviderProfile');
        const profile = await ProviderProfile.findOne({ user: req.user._id });
        if (profile) {
          // --- Auto apply parsed fields to missing profile data ---
          if (parsedResult) {
            let updatedProfile = false;
            if (parsedResult.fullName && !profile.profileName) { profile.profileName = parsedResult.fullName; updatedProfile = true; }
            if (parsedResult.headline && !profile.designation) { profile.designation = parsedResult.headline; updatedProfile = true; }
            if (parsedResult.city && !profile.city) { profile.city = parsedResult.city; updatedProfile = true; }
            if (parsedResult.bio && !profile.description) { profile.description = parsedResult.bio; updatedProfile = true; }
            if (parsedResult.experienceYears && !profile.experience) { profile.experience = String(parsedResult.experienceYears); updatedProfile = true; }
            
            if (Array.isArray(parsedResult.skills) && parsedResult.skills.length > 0) {
              const existing = new Set((profile.skills || []).map(s => String(s).toLowerCase()));
              const newSkills = parsedResult.skills.filter(s => !existing.has(String(s).toLowerCase()));
              if (newSkills.length > 0) {
                profile.skills = [...(profile.skills || []), ...newSkills];
                updatedProfile = true;
              }
            }
            if (Array.isArray(parsedResult.languages) && parsedResult.languages.length > 0) {
              const existing = new Set((profile.languages || []).map(l => String(l).toLowerCase()));
              const newLangs = parsedResult.languages.filter(l => !existing.has(String(l).toLowerCase()));
              if (newLangs.length > 0) {
                profile.languages = [...(profile.languages || []), ...newLangs];
                updatedProfile = true;
              }
            }
            if (Array.isArray(parsedResult.education) && parsedResult.education.length > 0 && (!profile.education || profile.education.length === 0)) {
              profile.education = parsedResult.education;
              updatedProfile = true;
            }
            if (Array.isArray(parsedResult.previousWork) && parsedResult.previousWork.length > 0 && (!profile.previousExperience || profile.previousExperience.length === 0)) {
              profile.previousExperience = parsedResult.previousWork;
              updatedProfile = true;
            }
            if (Array.isArray(parsedResult.projects) && parsedResult.projects.length > 0 && (!profile.projects || profile.projects.length === 0)) {
              profile.projects = parsedResult.projects;
              updatedProfile = true;
            }
            if (Array.isArray(parsedResult.portfolioLinks) && parsedResult.portfolioLinks.length > 0) {
              const existingUrls = new Set((profile.portfolioLinks || []).map(l => l.url));
              const newLinks = parsedResult.portfolioLinks.filter(l => l.url && !existingUrls.has(l.url));
              if (newLinks.length > 0) {
                profile.portfolioLinks = [...(profile.portfolioLinks || []), ...newLinks];
                updatedProfile = true;
              }
            }
            if (updatedProfile) logger.info('[Resume AI] Auto-applied parsed data to empty fields on ProviderProfile', { userId: String(req.user._id) });
          }
          // --------------------------------------------------------

          profile.uploadedAssets = profile.uploadedAssets || [];
          profile.uploadedAssets.push({
            originalName: file.originalname,
            mimeType: file.mimetype,
            finalSize: file.size,
            uploadedBy: req.user._id,
            uploadedAt: new Date(),
            assetType: 'document',
            url: secureUrl
          });
          
          profile.resumeUrl = secureUrl;
          
          // Clear any pending approvals since we auto-approved it
          if (profile.resumeApproval) {
            profile.resumeApproval.status = "approved";
            profile.resumeApproval.pendingUrl = "";
            profile.resumeApproval.approvedUrl = secureUrl;
          }

          await profile.save();

          // Also sync to User model
          const User = require('../models/User');
          await User.findByIdAndUpdate(req.user._id, {
            resumeUrl: secureUrl,
            "resumeApproval.status": "approved",
            "resumeApproval.approvedUrl": secureUrl,
            "resumeApproval.pendingUrl": "",
          });

          logger.info('[Resume AI] Saved resume directly to profile', { userId: String(req.user._id) });
        } else {
          logger.warn('[Resume AI] ProviderProfile not found to save resume', { userId: String(req.user._id) });
        }
      }
    } catch (dbError) {
      logger.error('[Resume AI] Failed to save resume link to DB', {
        userId: String(req.user._id),
        error: dbError.message
      });
    }

    parsedResult.resumeUrl = secureUrl;

    logger.info('[Resume AI] LLM parsing succeeded. Returning structured preview data', {
      userId: String(req.user._id),
      extractedSkillsCount: parsedResult.skills?.length || 0,
      cacheHit: !!cachedData
    });

    return res.status(200).json({
      success: true,
      message: cachedData ? 'Resume parsed from cache.' : 'Resume parsed successfully.',
      data: parsedResult,
      fileHash: fileHash
    });
  } catch (error) {
    logger.error('[Resume AI] Unexpected error in buildProfileFromResume', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: 'Server error. Failed to parse resume.',
      error: error.message,
    });
  }
}

function detectPlatform(url) {
  const lower = String(url || '').toLowerCase();
  if (lower.includes('linkedin.com')) return 'LinkedIn';
  if (lower.includes('github.com')) return 'GitHub';
  if (lower.includes('behance.net')) return 'Behance';
  if (lower.includes('dribbble.com')) return 'Dribbble';
  if (lower.includes('instagram.com')) return 'Instagram';
  if (lower.includes('facebook.com')) return 'Facebook';
  return 'Personal Website';
}

function normalizeUrl(url) {
  let clean = String(url || '').trim();
  clean = clean.replace(/[.,/#!$%^&*;:{}=\-_`~()]+$/, '');
  if (clean && !/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function normalizeProfileSuggestions(aiData, marketStats = null, basicInfo = {}) {
  if (!aiData) return {};

  const fullName = aiData.fullName || aiData.name || null;
  const contactNumber = aiData.contactNumber || aiData.phone || null;
  const bio = aiData.bio || null;

  const skills = Array.isArray(aiData.skills) ? aiData.skills : [];
  const roles = Array.isArray(aiData.roles) ? aiData.roles : [];
  const specialities = Array.isArray(aiData.specialities)
    ? aiData.specialities
    : Array.isArray(aiData.skills)
      ? aiData.skills
      : [];

  const skillLevel = aiData.skillLevel || null;

  // 1. Improved Experience Years Extraction
  let experienceYears =
    aiData.experienceYears ||
    aiData.totalExperience ||
    aiData.yearsOfExperience ||
    null;

  if (!experienceYears) {
    if (skillLevel === 'skilled') {
      experienceYears = '3-5 years';
    } else if (skillLevel === 'semi_skilled' || skillLevel === 'semi-skilled') {
      experienceYears = '1-2 years';
    } else if (Array.isArray(aiData.previousWork) && aiData.previousWork.length > 0) {
      experienceYears = '1-2 years';
    } else if (skills.length > 0 || (Array.isArray(aiData.certifications) && aiData.certifications.length > 0)) {
      experienceYears = '1 year';
    }
  }

  const serviceCategory = aiData.serviceCategory || null;
  const servicesOffered = Array.isArray(aiData.servicesOffered)
    ? aiData.servicesOffered
    : [];

  const city = aiData.city || null;
  const serviceLocations = Array.isArray(aiData.serviceLocations)
    ? aiData.serviceLocations
    : aiData.city
      ? [aiData.city]
      : [];

  // 2. Pricing Suggestion Logic
  let pricing =
    aiData.pricing !== null && aiData.pricing !== undefined && aiData.pricing !== ""
      ? Number(aiData.pricing)
      : null;

  let pricingType = aiData.pricingType || "hourly";
  let pricingReason = aiData.pricingReason || null;

  if (!pricing) {
    const activeCity = city || serviceLocations[0] || '';
    const isMetro = ['delhi', 'mumbai', 'bengaluru', 'bangalore', 'chennai', 'kolkata', 'pune', 'hyderabad', 'noida', 'gurgaon', 'delhi ncr'].includes(String(activeCity).trim().toLowerCase());
    
    let expNum = 0;
    const expMatch = String(experienceYears || '').match(/(\d+)/);
    if (expMatch) expNum = Number(expMatch[1]);

    let baseRate = 250;
    pricingReason = "Suggested based on skill level and city demand.";

    const normalizedLevel = String(skillLevel || 'unskilled').toLowerCase().replace('_', '-');

    if (normalizedLevel === 'unskilled') {
      baseRate = 180;
      pricingReason = "Suggested base rate for entry level or helper skills.";
    } else if (normalizedLevel === 'semi-skilled' || normalizedLevel === 'semi_skilled') {
      baseRate = 350;
      pricingReason = "Suggested market rate for experienced hands-on technicians.";
    } else if (normalizedLevel === 'skilled') {
      baseRate = 750;
      pricingReason = "Suggested premium rate for certified, highly-experienced professionals.";
    }

    if (marketStats && marketStats.sampleSize > 0) {
      baseRate = marketStats.avg;
      pricingReason = `Suggested based on average market rates in ${activeCity}.`;
    } else {
      if (isMetro) {
        baseRate = baseRate * 1.25;
        pricingReason += " Increased rate due to higher metro city demand.";
      }
      if (expNum >= 3) {
        baseRate = baseRate * 1.20;
        pricingReason += ` Enhanced payout for ${expNum}+ years of proven expertise.`;
      }
    }

    pricing = Math.round(baseRate);
  }

  // 4. Languages field detection & Indian Language mapping
  let languages = [];
  const COMMON_INDIAN_LANGUAGES = [
    "Hindi", "English", "Odia", "Bengali", "Telugu", "Tamil", "Marathi", "Gujarati", "Punjabi", "Urdu", "Kannada", "Malayalam"
  ];
  
  const rawLangs = Array.isArray(aiData.languages) 
    ? aiData.languages 
    : typeof aiData.languages === 'string' 
      ? aiData.languages.split(/[,\s]+/).map(l => l.trim()) 
      : [];

  rawLangs.forEach(lang => {
    if (!lang) return;
    const clean = lang.trim();
    const match = COMMON_INDIAN_LANGUAGES.find(c => c.toLowerCase() === clean.toLowerCase());
    if (match) {
      if (!languages.includes(match)) languages.push(match);
    } else {
      const capLang = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
      if (!languages.includes(capLang)) languages.push(capLang);
    }
  });

  return {
    fullName,
    name: fullName,
    bio: bio,
    skills,
    roles,
    specialities,
    tier: skillLevel,
    experienceYears,
    serviceCategory,
    servicesOffered,
    pricing,
    pricingType,
    city,
    serviceLocations,
    languages,
    certifications: Array.isArray(aiData.certifications) ? aiData.certifications : [],
    portfolioLinks: (() => {
      // Merge AI portfolio links and basicInfo.portfolio URLs
      const allLinks = [];
      const aiLinks = Array.isArray(aiData.portfolioLinks) ? aiData.portfolioLinks : [];
      aiLinks.forEach(link => {
        if (link && link.url) {
          allLinks.push({ url: link.url, platform: link.platform });
        }
      });
      // Add explicit platforms from basicInfo if missing
      ['github', 'linkedin', 'website'].forEach(key => {
        if (basicInfo.portfolio && basicInfo.portfolio[key]) {
          allLinks.push({ url: basicInfo.portfolio[key], platform: key });
        }
      });
      
      // Additional check for portfolioLinks in basicInfo
      if (Array.isArray(basicInfo.portfolio?.portfolioLinks)) {
        basicInfo.portfolio.portfolioLinks.forEach(url => allLinks.push({ url }));
      }
      
      // Deduplicate by URL
      const uniqueLinks = new Map();
      allLinks.forEach(link => {
        const normalized = normalizeUrl(link.url);
        if (isValidUrl(normalized) && !uniqueLinks.has(normalized)) {
          uniqueLinks.set(normalized, {
            platform: link.platform || detectPlatform(normalized),
            url: normalized,
            status: "pending",
            isPublic: false,
            approvedAt: null
          });
        }
      });
      return Array.from(uniqueLinks.values());
    })(),
    // workExperience is the field name used by AI pipeline; previousWork is what the frontend expects
    previousWork: Array.isArray(aiData.workExperience)
      ? aiData.workExperience.map(w => ({ role: w.position || w.designation || w.role || '', company: w.company || '', duration: w.duration || '', description: w.description || '' }))
      : Array.isArray(aiData.previousWork)
        ? aiData.previousWork
        : [],
    education: Array.isArray(aiData.education) ? aiData.education : [],
    projects: Array.isArray(aiData.projects) ? aiData.projects : [],
    headline: aiData.headline || null,
    email: (() => {
      console.log('--- EMAIL EXTRACTION DEBUG ---');
      console.log('AI Data Email:', aiData.email);
      console.log('Basic Info Email:', basicInfo.email);
      console.log('------------------------------');
      return basicInfo.email || aiData.email || null;
    })(),
    phone: basicInfo.phone || aiData.phone || null,
    contactNumber: basicInfo.phone || aiData.contactNumber || aiData.phone || null,
    availability: aiData.availability || null,
    whatsappAlerts: aiData.whatsappAlerts ?? null,
    pricingReason
  };
}

const getAiUsage = async (req, res) => {
  try {
    const ProviderSubscription = require('../models/ProviderSubscription');
    const ProviderAiUsage = require('../models/ProviderAiUsage');
    const userId = req.user._id;

    const subscription = await ProviderSubscription.findOne({
      providerId: userId,
      subscriptionStatus: 'active',
      endDate: { $gt: new Date() },
    }).populate('planId');

    if (!subscription || !subscription.planId) {
      return res.json({ success: true, limits: {}, usage: {} });
    }

    // .toObject() ensures Mongoose subdocuments (aiLimits) serialize as plain JS objects
    const planObj = subscription.planId.toObject ? subscription.planId.toObject() : subscription.planId;
    const limits = planObj.aiLimits || {};
    
    // Ensure active subscriptions get valid limits for all AI features
    const resolveLimit = (primaryKey, fallbackKeys) => {
      if (limits[primaryKey] !== undefined && limits[primaryKey] !== 0) return limits[primaryKey];
      for (const fKey of fallbackKeys) {
        if (limits[fKey] !== undefined && limits[fKey] !== 0) return limits[fKey];
      }
      return 10; // Default active plan limit allowance
    };

    limits.refreshInsight = resolveLimit('refreshInsight', ['interviewQuestionsRefresh', 'careerGpsRefresh', 'whyNotHiredRefresh', 'skillGapRefresh', 'aiCareerAnalysis']);
    limits.careerHealth = resolveLimit('careerHealth', ['careerHealthRefresh', 'aiCareerAnalysis']);
    limits.careerReport = resolveLimit('careerReport', ['aiTipsRefresh', 'autoAnalysisLimit', 'aiCareerAnalysis']);
    limits.resumeImprovement = resolveLimit('resumeImprovement', ['resumeOptimization', 'resumeScoreRefresh']);
    limits.careerGps = resolveLimit('careerGps', ['careerGpsRefresh']);
    limits.mockInterview = resolveLimit('mockInterview', ['interviewQuestionsRefresh']);
    limits.salaryInsights = resolveLimit('salaryInsights', ['autoAnalysisLimit']);
    limits.atsScore = resolveLimit('atsScore', ['atsOptimizerRefresh']);
    limits.skillGapReport = resolveLimit('skillGapReport', ['skillGapRefresh']);
    limits.whyNotHired = resolveLimit('whyNotHired', ['whyNotHiredRefresh']);
    limits.interviewCallProb = resolveLimit('interviewCallProb', ['autoAnalysisLimit']);

    const aiUsageDoc = await ProviderAiUsage.findOne({
      providerId: userId,
      subscriptionId: subscription._id,
      periodStart: { $lte: new Date() },
      periodEnd: { $gte: new Date() }
    });

    const rawUsage = aiUsageDoc
      ? (aiUsageDoc.usage?.toObject ? aiUsageDoc.usage.toObject() : aiUsageDoc.usage || {})
      : {};

    const resolveUsage = (primaryKey, fallbackKeys) => {
      let total = rawUsage[primaryKey] || 0;
      for (const fKey of fallbackKeys) {
        total += (rawUsage[fKey] || 0);
      }
      return total;
    };

    const usageObj = { ...rawUsage };
    usageObj.refreshInsight = resolveUsage('refreshInsight', ['interviewQuestionsRefresh', 'careerGpsRefresh', 'whyNotHiredRefresh', 'skillGapRefresh', 'aiCareerAnalysis']);
    usageObj.careerHealth = resolveUsage('careerHealth', ['careerHealthRefresh', 'aiCareerAnalysis']);
    usageObj.careerReport = resolveUsage('careerReport', ['aiTipsRefresh', 'autoAnalysisLimit', 'aiCareerAnalysis']);
    usageObj.resumeImprovement = resolveUsage('resumeImprovement', ['resumeOptimization', 'resumeScoreRefresh']);
    usageObj.careerGps = resolveUsage('careerGps', ['careerGpsRefresh']);
    usageObj.mockInterview = resolveUsage('mockInterview', ['interviewQuestionsRefresh']);
    usageObj.salaryInsights = resolveUsage('salaryInsights', ['autoAnalysisLimit']);
    usageObj.atsScore = resolveUsage('atsScore', ['atsOptimizerRefresh']);
    usageObj.skillGapReport = resolveUsage('skillGapReport', ['skillGapRefresh']);
    usageObj.whyNotHired = resolveUsage('whyNotHired', ['whyNotHiredRefresh']);
    usageObj.interviewCallProb = resolveUsage('interviewCallProb', ['autoAnalysisLimit']);

    res.json({
      success: true,
      limits,
      usage: usageObj,
      planName: planObj.name,
      planSlug: planObj.slug,
    });
  } catch (error) {
    console.error('getAiUsage error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  chatWithAssistant,
  buildProfileSuggestion,
  healthCheck,
  testParser,
  buildProfileFromResume,
  normalizeProfileSuggestions,
  getAiUsage,
};
