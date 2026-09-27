const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const journeyCtrl = require('../controllers/resumeJourney.controller');

// ─── Journey State & Step Persistence ───────────────────────────────────────
router.get('/state', protect, journeyCtrl.getState);
router.put('/progress', protect, journeyCtrl.updateProgress);
router.post('/reset', protect, journeyCtrl.resetJourney);

// ─── Step 1: Career Paths, Resume Upload & ATS Audit ────────────────────────
router.get('/career-paths', protect, journeyCtrl.getCareerPaths);
router.post('/select-paths', protect, journeyCtrl.selectCareerPaths);
router.post('/resume/upload', protect, upload.single('resume'), journeyCtrl.uploadResume);
router.post('/resume/ats-audit', protect, journeyCtrl.getAtsAudit);
router.post('/resume/auto-fix', protect, journeyCtrl.autoFixAts);

// ─── Step 2: Padhaao (Learning Tracks & Syllabus) ───────────────────────────
router.get('/padhaao/tracks', protect, journeyCtrl.getPadhaaoTracks);
router.post('/padhaao/chapter/toggle', protect, journeyCtrl.toggleChapterCompletion);
router.post('/padhaao/ai-explain', protect, journeyCtrl.getAiExplanation);
router.get('/padhaao/ai-tutor/status', protect, journeyCtrl.getAiTutorStatus);

// ─── Step 3: Practice Drills (Modes, Questions & Submissions) ────────────────
router.get('/practice/modes', protect, journeyCtrl.getPracticeModes);
router.get('/practice/questions', protect, journeyCtrl.getPracticeQuestions);
router.post('/practice/submit', protect, journeyCtrl.submitPracticeDrill);

// ─── Step 4: Official Assessment Test ───────────────────────────────────────
router.get('/assessment/config', protect, journeyCtrl.getAssessmentConfig);
router.post('/assessment/start', protect, journeyCtrl.startAssessment);
router.post('/assessment/answer', protect, journeyCtrl.saveAssessmentAnswer);
router.post('/assessment/submit', protect, journeyCtrl.submitAssessment);

// ─── Step 5: Bata Do (Readiness Verdict, Certificate & Leads) ───────────────
router.get('/readiness', protect, journeyCtrl.getReadinessVerdict);
router.get('/certificate', protect, journeyCtrl.getCertificate);
router.get('/lead-eligibility', protect, journeyCtrl.getLeadEligibility);

module.exports = router;
