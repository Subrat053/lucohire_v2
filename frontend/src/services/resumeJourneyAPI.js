import API from './api';

export const resumeJourneyAPI = {
  // State and Progress
  getState: () => API.get('/v2/freelancer/journey/state'),
  updateProgress: (data) => API.put('/v2/freelancer/journey/progress', data),
  resetJourney: () => API.post('/v2/freelancer/journey/reset'),

  // Step 1: Career Paths & Resume ATS
  getCareerPaths: () => API.get('/v2/freelancer/journey/career-paths'),
  selectPaths: (selectedPaths) => API.post('/v2/freelancer/journey/select-paths', { selectedPaths }),
  uploadResume: (formData) =>
    API.post('/v2/freelancer/journey/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAtsAudit: (params) => API.post('/v2/freelancer/journey/resume/ats-audit', params),
  autoFixAts: (params) => API.post('/v2/freelancer/journey/resume/auto-fix', params),

  // Step 2: Padhaao (Learning Tracks & Chapters)
  getPadhaaoTracks: (pathSlug) =>
    API.get('/v2/freelancer/journey/padhaao/tracks', { params: { pathSlug } }),
  toggleChapter: (chapterKey, chapterId) =>
    API.post('/v2/freelancer/journey/padhaao/chapter/toggle', { chapterKey, chapterId }),
  explainConcept: (data) =>
    API.post('/v2/freelancer/journey/padhaao/ai-explain', data),

  // Step 3: Practice Drills
  getPracticeModes: () => API.get('/v2/freelancer/journey/practice/modes'),
  getPracticeQuestions: (pathSlug, modeKey) =>
    API.get('/v2/freelancer/journey/practice/questions', { params: { pathSlug, modeKey } }),
  submitPractice: (data) => API.post('/v2/freelancer/journey/practice/submit', data),

  // Step 4: Official Assessment Test
  getAssessmentConfig: (pathSlug) =>
    API.get('/v2/freelancer/journey/assessment/config', { params: { pathSlug } }),
  startAssessment: (pathSlug) =>
    API.post('/v2/freelancer/journey/assessment/start', { pathSlug }),
  saveAssessmentAnswer: (data) =>
    API.post('/v2/freelancer/journey/assessment/answer', data),
  submitAssessment: (data) =>
    API.post('/v2/freelancer/journey/assessment/submit', data),

  // Step 5: Bata Do (Readiness, Certificate & Leads)
  getReadiness: (pathSlug) =>
    API.get('/v2/freelancer/journey/readiness', { params: { pathSlug } }),
  getCertificate: (pathSlug) =>
    API.get('/v2/freelancer/journey/certificate', { params: { pathSlug } }),
  getLeadEligibility: (category) =>
    API.get('/v2/freelancer/journey/lead-eligibility', { params: { category } }),

  // Public Verification
  verifyCertificate: (verificationId) =>
    API.get(`/v2/verify/certificate/${verificationId}`),
};

export default resumeJourneyAPI;
