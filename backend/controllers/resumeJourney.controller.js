const careerPathService = require('../services/resumeJourney/careerPath.service');
const resumeIntelService = require('../services/resumeJourney/resumeIntelligence.service');
const atsEngineService = require('../services/resumeJourney/atsEngine.service');
const learningService = require('../services/resumeJourney/learning.service');
const practiceService = require('../services/resumeJourney/practice.service');
const assessmentService = require('../services/resumeJourney/assessment.service');
const readinessService = require('../services/resumeJourney/readiness.service');
const certificateService = require('../services/resumeJourney/certificate.service');
const leadEligibilityService = require('../services/resumeJourney/leadEligibility.service');
const journeyStateService = require('../services/resumeJourney/journeyState.service');

const getUserId = (req) => String(req.user?.id || req.user?._id || '');

// ─── Journey State & Navigation ─────────────────────────────────────────────

exports.getState = async (req, res) => {
  try {
    const userId = getUserId(req);
    const data = await journeyStateService.getFullJourneyState(userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ResumeJourney.getState Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProgress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { activeStep, selectedPaths, activeTrackKey, customAtsScore } = req.body;
    const data = await journeyStateService.updateJourneyProgress({
      userId,
      activeStep,
      selectedPaths,
      activeTrackKey,
      customAtsScore,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ResumeJourney.updateProgress Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetJourney = async (req, res) => {
  try {
    const userId = getUserId(req);
    const data = await journeyStateService.resetJourneyProgress(userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ResumeJourney.resetJourney Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Step 1: Career Paths & Resume ATS ──────────────────────────────────────

exports.getCareerPaths = async (req, res) => {
  try {
    const data = await careerPathService.getCareerPaths();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.selectCareerPaths = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { selectedPaths } = req.body;
    if (!Array.isArray(selectedPaths) || selectedPaths.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one career path.' });
    }
    await journeyStateService.updateJourneyProgress({ userId, selectedPaths });
    res.json({ success: true, selectedPaths });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadResume = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const careerPathSlug = req.body?.careerPathSlug || 'p1';

    // High-performance pipelined upload, parse, and ATS benchmarking
    const { uploadResult, atsAudit } = await resumeIntelService.processResumeUploadAndAudit({
      userId,
      fileBuffer: req.file.buffer,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      careerPathSlug,
    });

    res.json({
      success: true,
      message: 'Resume uploaded, parsed, and benchmarked successfully.',
      data: {
        ...uploadResult,
        atsAudit,
      },
    });
  } catch (err) {
    console.error('[ResumeJourney.uploadResume Error]:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAtsAudit = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { careerPathSlug, customScoreOverride } = req.body;
    const data = await atsEngineService.calculateAtsAnalysis({
      userId,
      careerPathSlug: careerPathSlug || 'p1',
      customScoreOverride,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ResumeJourney.getAtsAudit Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.autoFixAts = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { careerPathSlug } = req.body;
    const data = await atsEngineService.optimizeAtsAnalysis({
      userId,
      careerPathSlug: careerPathSlug || 'p1',
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ResumeJourney.autoFixAts Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Step 2: Padhaao (Learning) ─────────────────────────────────────────────

exports.getPadhaaoTracks = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { pathSlug } = req.query;
    const data = await learningService.getLearningTracksForPath({
      userId,
      careerPathSlug: pathSlug || 'p1',
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleChapterCompletion = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { chapterId, chapterKey } = req.body;
    const data = await learningService.toggleChapterCompletion({
      userId,
      chapterId,
      chapterKey,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAiExplanation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { chapterKey, topicName, question } = req.body;
    const data = await learningService.getAiExplanationForTopic({
      userId,
      chapterKey,
      topicName,
      question,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAiTutorStatus = async (req, res) => {
  try {
    const isEnabled = await learningService.isAiTutorFeatureEnabled();
    res.json({ success: true, data: { isEnabled } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAiRecruiterQuestions = async (req, res) => {
  try {
    const { chapterKey, topicName, excludeQuestions, count } = req.body;
    const data = await learningService.getRecruiterQuestionsForTopic({
      chapterKey,
      topicName,
      excludeQuestions,
      count: count ? Number(count) : 3,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// ─── Step 3: Practice Drills ────────────────────────────────────────────────

exports.getPracticeModes = async (req, res) => {
  try {
    const data = await practiceService.getPracticeModes();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPracticeQuestions = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { pathSlug, modeKey } = req.query;
    const data = await practiceService.getPracticeQuestions({
      careerPathSlug: pathSlug || 'p1',
      modeKey: modeKey || 'mixed',
      userId,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitPracticeDrill = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { pathSlug, modeKey, answers, currentStreak } = req.body;
    const data = await practiceService.recordPracticeSubmission({
      userId,
      careerPathSlug: pathSlug || 'p1',
      modeKey: modeKey || 'mixed',
      answers: answers || [],
      currentStreak: currentStreak || 0,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Step 4: Official Assessment ────────────────────────────────────────────

exports.getAssessmentConfig = async (req, res) => {
  try {
    const { pathSlug } = req.query;
    const data = await assessmentService.getAssessmentConfig(pathSlug || 'p1');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.startAssessment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { pathSlug } = req.body;
    const data = await assessmentService.startAssessmentAttempt({
      userId,
      careerPathSlug: pathSlug || 'p1',
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveAssessmentAnswer = async (req, res) => {
  try {
    const { attemptId, questionId, selectedOptionIndex, isFlagged } = req.body;
    const data = await assessmentService.saveAssessmentAnswer({
      attemptId,
      questionId,
      selectedOptionIndex,
      isFlagged,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitAssessment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { attemptId, answers } = req.body;
    const data = await assessmentService.submitAssessment({
      attemptId,
      userId,
      answers: answers || {},
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Step 5: Bata Do (Readiness & Certificate) ──────────────────────────────

exports.getReadinessVerdict = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { pathSlug, forceRefresh } = req.query;
    const data = await readinessService.calculateReadinessVerdict({
      userId,
      careerPathSlug: pathSlug || 'p1',
      forceRefresh: forceRefresh === 'true' || forceRefresh === true,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCertificate = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { pathSlug } = req.query;
    const data = await certificateService.getOrCreateCertificate({
      userId,
      careerPathSlug: pathSlug || 'p1',
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getLeadEligibility = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { category } = req.query;
    const data = await leadEligibilityService.evaluateLeadEligibility({
      userId,
      category: category || 'all',
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
