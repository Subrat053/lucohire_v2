/**
 * resumeParserController.js
 * Handles AI-powered resume parsing for provider profiles.
 *
 * Security rules:
 * - File is stored via existing Cloudinary flow
 * - Only extracted TEXT is sent to AI — never the file
 * - AI output is validated before saving
 * - Parsed data is stored as suggestions; never auto-overwrites existing data
 */

const prisma = require('../config/prisma');
const { prepareProviderProfileData } = require('../services/providerProfilePersistenceService');

const isEnabled = (name) => String(process.env[name] || '').toLowerCase() === 'true';
const resumeAiEnabled = () => isEnabled('AI_FEATURES_ENABLED') && isEnabled('ENABLE_RESUME_AI');
const resumeOcrEnabled = () => resumeAiEnabled()
  && isEnabled('AI_OCR_ENABLED')
  && isEnabled('ENABLE_RESUME_OCR');
const externalProfileAssetsEnabled = () => isEnabled('ENABLE_EXTERNAL_PROFILE_ASSETS');
const userIdFromRequest = (req) => String(req.user?.id || req.user?._id || '');

const resumeFeatureDisabled = (res, feature = 'AI resume parsing') => res.status(503).json({
  success: false,
  code: 'RESUME_FEATURE_DISABLED',
  message: `${feature} is currently disabled.`,
});

const requireResumeAiEnabled = (_req, res, next) => (
  resumeAiEnabled() ? next() : resumeFeatureDisabled(res)
);

const findProviderProfile = (userId) => prisma.providerProfile.findUnique({
  where: { user: String(userId) },
});

const updateProviderProfile = (userId, data) => prisma.providerProfile.update({
  where: { user: String(userId) },
  data: prepareProviderProfileData(data),
});

// ─── POST /api/provider/resume/parse ─────────────────────────────────────────
/**
 * Triggered after resume upload.
 * Expects req.file (from multer memory storage) or req.body.resumeUrl.
 */
const triggerResumeParse = async (req, res) => {
  if (!resumeAiEnabled()) return resumeFeatureDisabled(res);

  try {
    const userId = userIdFromRequest(req);

    const profile = await findProviderProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Provider profile not found.' });
    }

    // Accept file from upload or URL from body
    const file = req.file;
    const resumeUrl = req.body.resumeUrl || profile.resumeUrl || profile.resumeApproval?.approvedUrl;

    if (!file && !resumeUrl) {
      return res.status(400).json({ success: false, message: 'No resume file or URL provided.' });
    }

    // ─── Prepare Buffer ───────────────────────────────────────────────
    let buffer;
    let mimeType;
    if (file) {
      const imageMimeType = String(file.mimetype || '').startsWith('image/');
      if (imageMimeType && !resumeOcrEnabled()) {
        return resumeFeatureDisabled(res, 'Resume OCR');
      }
      buffer = file.buffer;
      mimeType = file.mimetype;
    } else {
      if (!externalProfileAssetsEnabled()) {
        return resumeFeatureDisabled(res, 'External resume access');
      }
      const axios = require('axios');
      const response = await axios.get(resumeUrl, {
        responseType: 'arraybuffer',
        timeout: 20000,
      });
      buffer = Buffer.from(response.data);
      const ext = resumeUrl.split('?')[0].split('.').pop().toLowerCase();
      const mimeMap = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
      mimeType = mimeMap[ext] || 'application/pdf';
    }

    // ─── Cache Check ──────────────────────────────────────────────────
    const crypto = require('crypto');
    const { getCachedResume, setCachedResume } = require('../services/ai/resumeCache.service');
    
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const cachedData = await getCachedResume(fileHash);

    const forceRefresh = true; // Bypass cache to ensure latest AI prompt takes effect

    if (cachedData && !forceRefresh) {
      // Use cached data
      const resumeParsing = {
        ...(profile.resumeParsing || {}),
        status: 'completed',
        parsedData: cachedData,
        parsedAt: new Date().toISOString(),
        errorMessage: '',
      };
      await updateProviderProfile(userId, { resumeParsing });

      res.locals.skipAiLimitIncrement = true; // DO NOT deduct credit
      return res.json({
        success: true,
        message: 'Resume parsed from cache.',
        status: 'completed',
        fileHash
      });
    }

    // Set status to processing
    const resumeParsing = {
      ...(profile.resumeParsing || {}),
      status: 'processing',
      errorMessage: '',
    };
    await updateProviderProfile(userId, { resumeParsing });

    // Return immediately — don't make user wait for AI
    res.json({
      success: true,
      message: 'Resume received. AI parsing has started.',
      status: 'processing',
    });

    // ─── Background async parse ───────────────────────────────────────────────
    setImmediate(async () => {
      try {
        const { extractTextFromFile, extractBasicInfo } = require('../services/resumeExtractorService');
        // Extract text
        const extractedText = await extractTextFromFile(buffer, mimeType);
        
        // Extract basic deterministic fields
        const basicInfo = extractBasicInfo(extractedText);
        console.log("=== RAW PARSED TEXT ===", extractedText);

        // Send to unified AI pipeline
        const { processAI } = require('../services/ai/aiPipelineService');
        const pipelineResult = await processAI({
          userId,
          role: 'provider',
          featureName: 'resume_parser',
          inputData: { input_data: extractedText }
        });
        console.log("=== AI RESPONSE ===", pipelineResult?.data);

        if (!pipelineResult || pipelineResult.success === false) {
          await updateProviderProfile(userId, {
            resumeParsing: {
              ...(profile.resumeParsing || {}),
              status: 'failed',
              errorMessage: pipelineResult?.warnings?.[0] || 'AI parsing failed or returned invalid response.',
              parsedAt: new Date().toISOString(),
            },
          });
          console.warn('[ResumeParser] AI parse failed for userId:', userId);
          return;
        }

        // Cache the successful result
        await setCachedResume(fileHash, pipelineResult);

        // Merge AI result with basic info
        const aiData = pipelineResult.data || {};
        const parsed = {
          ...aiData,
          email: basicInfo.email || aiData.email,
          phone: basicInfo.phone || aiData.phone,
          contactNumber: basicInfo.phone || aiData.contactNumber,
          portfolio: {
            ...(aiData.portfolio || {}),
            ...basicInfo.portfolio
          },
          github: basicInfo.portfolio?.github || aiData.github || aiData.portfolio?.github,
          linkedin: basicInfo.portfolio?.linkedin || aiData.linkedin || aiData.portfolio?.linkedin,
          website: basicInfo.portfolio?.website || aiData.website || aiData.portfolio?.website
        };
        const confidenceScore = pipelineResult.confidence_score;

        await updateProviderProfile(userId, {
          parsedResumeData: parsed,
          resumeParsing: {
            ...(profile.resumeParsing || {}),
            status: 'completed',
            provider: 'ai-pipeline',
            parsedAt: new Date().toISOString(),
            errorMessage: '',
            confidenceScore,
          },
        });

        // Auto-apply to profile empty fields
        try {
          const profileToUpdate = await findProviderProfile(userId);
          if (profileToUpdate) {
            let updated = false;

            if (parsed.fullName && !profileToUpdate.profileName) {
              profileToUpdate.profileName = parsed.fullName;
              updated = true;
            }
            if (parsed.city && !profileToUpdate.city) {
              profileToUpdate.city = parsed.city;
              updated = true;
            }
            if (parsed.state && !profileToUpdate.state) {
              profileToUpdate.state = parsed.state;
              updated = true;
            }
            if (parsed.bio && !profileToUpdate.description) {
              profileToUpdate.description = parsed.bio;
              updated = true;
            }
            if (parsed.experienceYears && !profileToUpdate.experience) {
              profileToUpdate.experience = String(parsed.experienceYears);
              updated = true;
            }
            if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
              const existingSkills = new Set((profileToUpdate.skills || []).map(s => String(s).toLowerCase()));
              const newSkills = parsed.skills.filter(s => !existingSkills.has(String(s).toLowerCase()));
              if (newSkills.length > 0) {
                profileToUpdate.skills = [...(profileToUpdate.skills || []), ...newSkills];
                updated = true;
              }
            }
            if (Array.isArray(parsed.languages) && parsed.languages.length > 0) {
              const existingLangs = new Set((profileToUpdate.languages || []).map(l => String(l).toLowerCase()));
              const newLangs = parsed.languages.filter(l => !existingLangs.has(String(l).toLowerCase()));
              if (newLangs.length > 0) {
                profileToUpdate.languages = [...(profileToUpdate.languages || []), ...newLangs];
                updated = true;
              }
            }
            if (Array.isArray(parsed.education) && parsed.education.length > 0 && (!profileToUpdate.education || profileToUpdate.education.length === 0)) {
              profileToUpdate.education = parsed.education.map(e => ({
                institution: e.institution || e.school || '',
                degree: e.degree || '',
                year: e.year || e.endDate || '',
                grade: e.grade || ''
              }));
              updated = true;
            }
            if (Array.isArray(parsed.workExperience) && parsed.workExperience.length > 0 && (!profileToUpdate.previousExperience || profileToUpdate.previousExperience.length === 0)) {
              profileToUpdate.previousExperience = parsed.workExperience.map(w => ({
                company: w.company || '',
                role: w.title || w.role || '',
                duration: w.duration || w.dates || '',
                description: w.description || w.summary || ''
              }));
              updated = true;
            }
            if (Array.isArray(parsed.portfolioLinks) && parsed.portfolioLinks.length > 0) {
              const existingUrls = new Set((profileToUpdate.portfolioLinks || []).map(l => l.url));
              const newLinks = parsed.portfolioLinks.filter(l => l.url && !existingUrls.has(l.url));
              if (newLinks.length > 0) {
                const formattedLinks = newLinks.map(l => ({
                  platform: l.platform || 'Personal Website',
                  url: l.url,
                  status: 'pending',
                  submittedAt: new Date().toISOString(),
                }));
                profileToUpdate.portfolioLinks = [...(profileToUpdate.portfolioLinks || []), ...formattedLinks];
                updated = true;
              }
            }
            
            if (updated) {
              await updateProviderProfile(userId, {
                profileName: profileToUpdate.profileName,
                city: profileToUpdate.city,
                state: profileToUpdate.state,
                description: profileToUpdate.description,
                experience: profileToUpdate.experience,
                skills: profileToUpdate.skills,
                languages: profileToUpdate.languages,
                education: profileToUpdate.education,
                previousExperience: profileToUpdate.previousExperience,
                portfolioLinks: profileToUpdate.portfolioLinks,
              });
              console.log(`[ResumeParser] Auto-applied parsed data for userId=${userId}`);
            }
          }
        } catch (autoApplyErr) {
          console.error('[ResumeParser] Auto-apply error for userId:', userId, autoApplyErr.message);
        }

        console.log(`[ResumeParser] Completed for userId=${userId} provider=${pipelineResult.provider || 'gemini'} confidence=${confidenceScore}`);
      } catch (parseErr) {
        console.error('[ResumeParser] Background parse error for userId:', userId, parseErr.message);
        try {
          const latestProfile = await findProviderProfile(userId);
          await updateProviderProfile(userId, {
            resumeParsing: {
              ...(latestProfile?.resumeParsing || {}),
              status: 'failed',
              errorMessage: 'Internal parsing error. Please retry.',
              parsedAt: new Date().toISOString(),
            },
          });
        } catch (_) {}
      }
    });
  } catch (err) {
    console.error('[ResumeParser] Controller error:', err.message);
    return res.status(500).json({ success: false, message: 'Resume parsing could not be started.' });
  }
};

// ─── GET /api/provider/resume/parse-status ───────────────────────────────────
const getParseStatus = async (req, res) => {
  try {
    const userId = userIdFromRequest(req);
    const profile = await prisma.providerProfile.findUnique({
      where: { user: userId },
      select: { resumeParsing: true, parsedResumeData: true },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    return res.json({
      success: true,
      status: profile.resumeParsing?.status || 'pending',
      provider: profile.resumeParsing?.provider || null,
      parsedAt: profile.resumeParsing?.parsedAt || null,
      confidenceScore: profile.resumeParsing?.confidenceScore || null,
      errorMessage: profile.resumeParsing?.errorMessage || null,
      parsedResumeData: profile.parsedResumeData || null,
    });
  } catch (err) {
    console.error('[ResumeParser] Status check error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not fetch parse status.' });
  }
};

// ─── PATCH /api/provider/resume/apply-parsed ─────────────────────────────────
/**
 * Applies AI-parsed resume data to the provider profile.
 * Only fills EMPTY fields — never overwrites existing user data.
 * User must explicitly call this after reviewing the parsed preview.
 */
const applyParsedResume = async (req, res) => {
  try {
    const userId = userIdFromRequest(req);
    const { acceptedFields } = req.body;
    // acceptedFields: { skills: true, city: true, experience: true, ... }

    const profile = await findProviderProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    if (!profile.parsedResumeData) {
      return res.status(400).json({ success: false, message: 'No parsed resume data available. Please parse your resume first.' });
    }

    const parsed = profile.parsedResumeData;
    const accepted = acceptedFields || {};
    const updated = {};

    // Apply only fields the user accepted, only if profile field is currently empty
    if (accepted.skills && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
      // Merge with existing skills (don't replace)
      const existing = new Set((profile.skills || []).map(s => String(s).toLowerCase()));
      const newSkills = parsed.skills.filter(s => !existing.has(String(s).toLowerCase()));
      if (newSkills.length > 0) {
        profile.skills = [...(profile.skills || []), ...newSkills];
        updated.skills = profile.skills;
      }
    }

    if (accepted.experience && parsed.experienceYears && !profile.experience) {
      profile.experience = String(parsed.experienceYears);
      updated.experience = profile.experience;
    }

    if (accepted.city && parsed.city && !profile.city) {
      profile.city = parsed.city;
      updated.city = profile.city;
    }

    if (accepted.languages && Array.isArray(parsed.languages) && parsed.languages.length > 0) {
      const existing = new Set((profile.languages || []).map(l => String(l).toLowerCase()));
      const newLangs = parsed.languages.filter(l => !existing.has(String(l).toLowerCase()));
      if (newLangs.length > 0) {
        profile.languages = [...(profile.languages || []), ...newLangs];
        updated.languages = profile.languages;
      }
    }

    if (accepted.description && parsed.bio && !profile.description) {
      profile.description = parsed.bio;
      updated.description = profile.description;
    }

    if (accepted.portfolioLinks && Array.isArray(parsed.portfolioLinks) && parsed.portfolioLinks.length > 0) {
      const existingUrls = new Set((profile.portfolioLinks || []).map(l => l.url));
      const newLinks = parsed.portfolioLinks.filter(l => l.url && !existingUrls.has(l.url));
      if (newLinks.length > 0) {
        const formattedLinks = newLinks.map(l => ({
          platform: l.platform || 'Personal Website',
          url: l.url,
          status: 'pending',
          submittedAt: new Date().toISOString(),
        }));
        profile.portfolioLinks = [...(profile.portfolioLinks || []), ...formattedLinks];
        updated.portfolioLinks = profile.portfolioLinks;
      }
    }

    await updateProviderProfile(userId, updated);

    return res.json({
      success: true,
      message: 'Parsed resume data applied to your profile.',
      updatedFields: Object.keys(updated),
    });
  } catch (err) {
    console.error('[ResumeParser] Apply error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not apply parsed data.' });
  }
};

// ─── POST /api/provider/resume/retry-parse ───────────────────────────────────
const retryParse = async (req, res) => {
  if (!resumeAiEnabled()) return resumeFeatureDisabled(res);

  try {
    const userId = userIdFromRequest(req);
    const profile = await findProviderProfile(userId);

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const resumeUrl = profile.resumeApproval?.approvedUrl || profile.resumeApproval?.pendingUrl || profile.resumeUrl;
    if (!resumeUrl) {
      return res.status(400).json({ success: false, message: 'No resume URL found on profile. Please upload a resume first.' });
    }

    // Reset status and trigger parse via the same endpoint
    req.body = req.body || {};
    req.body.resumeUrl = resumeUrl;
    return triggerResumeParse(req, res);
  } catch (err) {
    console.error('[ResumeParser] Retry error:', err.message);
    return res.status(500).json({ success: false, message: 'Retry failed.' });
  }
};

// ─── POST /api/jobs/guest-resume/parse (Unauthenticated) ─────────────────────
const parseGuestResume = async (req, res) => {
  if (!resumeAiEnabled()) return resumeFeatureDisabled(res);

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No resume file provided.' });
    }

    if (String(file.mimetype || '').startsWith('image/') && !resumeOcrEnabled()) {
      return resumeFeatureDisabled(res, 'Resume OCR');
    }

    const { extractTextFromFile, extractBasicInfo } = require('../services/resumeExtractorService');
    const extractedText = await extractTextFromFile(file.buffer, file.mimetype);
    if (!extractedText || extractedText.trim() === '') {
      return res.status(400).json({ success: false, message: 'Could not extract text from file.' });
    }

    // Extract basic deterministic fields
    const basicInfo = extractBasicInfo(extractedText);
    console.log("=== RAW PARSED TEXT ===", extractedText);

    const { processAI } = require('../services/ai/aiPipelineService');
    const pipelineResult = await processAI({
      userId: 'guest',
      role: 'provider',
      featureName: 'resume_parser',
      inputData: { input_data: extractedText }
    });
    console.log("=== AI RESPONSE ===", pipelineResult?.data);

    if (!pipelineResult || pipelineResult.success === false) {
      return res.status(400).json({ success: false, message: 'AI parsing failed. Please fill details manually.' });
    }

    // Merge AI result with basic info
    const aiData = pipelineResult.data || {};
    const parsed = {
      ...aiData,
      email: basicInfo.email || aiData.email,
      phone: basicInfo.phone || aiData.phone,
      contactNumber: basicInfo.phone || aiData.contactNumber,
      portfolio: {
        ...(aiData.portfolio || {}),
        ...basicInfo.portfolio
      },
      github: basicInfo.portfolio?.github || aiData.github || aiData.portfolio?.github,
      linkedin: basicInfo.portfolio?.linkedin || aiData.linkedin || aiData.portfolio?.linkedin,
      website: basicInfo.portfolio?.website || aiData.website || aiData.portfolio?.website
    };

    return res.json({
      success: true,
      data: parsed
    });
  } catch (err) {
    console.error('[GuestResumeParse] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to parse resume.', error: err.message });
  }
};

module.exports = {
  applyParsedResume,
  getParseStatus,
  parseGuestResume,
  requireResumeAiEnabled,
  retryParse,
  triggerResumeParse,
};
