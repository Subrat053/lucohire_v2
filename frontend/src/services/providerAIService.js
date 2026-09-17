import API from './api';

export function sendChatMessage(payload) {
  return API.post('/provider/ai/chat', payload);
}

export function buildProfile(payload) {
  return API.post('/provider/ai/build-profile', payload);
}

export function getAIHealth() {
  return API.get('/provider/ai/health');
}

export function getAiUsage() {
  return API.get('/provider/ai/usage', { timeout: 30000 });
}

export function getResumeToolkit(force = false, cachedOnly = false) {
  let url = '/provider/ai/resume-toolkit?';
  if (force) url += 'force=true&';
  if (cachedOnly) url += 'cachedOnly=true&';
  return API.get(url, { timeout: 45000 });
}

export function testAIParser(payload) {
  return API.post('/provider/ai/test', payload);
}

export function uploadResume(formData) {
  return API.post('/provider/ai/build-from-resume', formData, {
    timeout: 180000,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export function getAtsOptimizer(data) {
  return API.post('/provider/ai/ats-optimizer', data);
}

export function getCareerHealth(payload) {
  return API.post('/provider/ai/career-health', payload, {
    timeout: 60000,
  });
}

export function getCareerGPS(payload) {
  return API.post('/provider/ai/career-gps', payload, {
    timeout: 60000,
  });
}

export function getHiringBarriers(payload) {
  return API.post('/provider/ai/hiring-barriers', payload, {
    timeout: 60000,
  });
}

export function getSkillGap(payload) {
  return API.post('/provider/ai/skill-gap', payload, {
    timeout: 60000,
  });
}

export function getJobMatchingEngine(payload) {
  return API.post('/provider/ai/job-matching-engine', payload, {
    timeout: 90000,
  });
}

export function getInterviewQuestions(payload) {
  return API.post('/provider/ai/interview-questions', payload, {
    timeout: 90000,
  });
}

export function refreshInterviewQuestions() {
  return API.post('/provider/ai/interview-questions-refresh');
}

export function getAICareerReport(payload) {
  return API.post('/provider/ai/career-report', payload, {
    timeout: 90000,
  });
}

export function getIncomeOpportunities() {
  return API.post('/provider/ai/income-opportunities', {}, {
    timeout: 60000,
  });
}

export function improveCareerGPS(payload) {
  return API.post('/provider/ai/improve-career-gps', payload, {
    timeout: 90000,
  });
}

export function improveHiringBarriers(payload) {
  return API.post('/provider/ai/improve-hiring-barriers', payload, {
    timeout: 90000,
  });
}

export function improveSkillGap(payload) {
  return API.post('/provider/ai/improve-skill-gap', payload, {
    timeout: 90000,
  });
}

export function improveAICareerReport(payload) {
  return API.post('/provider/ai/improve-career-report', payload, {
    timeout: 90000,
  });
}

export function improveCareerHealth(payload) {
  return API.post('/provider/ai/improve-career-health', payload, {
    timeout: 90000,
  });
}

export function optimizeFullResume(payload) {
  return API.post('/provider/ai/optimize-full-resume', payload, {
    timeout: 120000, // It takes a while to rewrite the whole JSON
  });
}
