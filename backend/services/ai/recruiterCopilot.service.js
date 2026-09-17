const { callOpenAI } = require('./llmService');
const logger = require('../../utils/logger');

const AIPromptTemplate = require('../../models/AIPromptTemplate');

/**
 * Feature #18: Copilot Natural Language Parser
 * Converts plain english instructions into a structured MongoDB query object.
 */
exports.parseCopilotCommand = async (command) => {
  let prompt = await AIPromptTemplate.getActivePrompt('recruiter_copilot_parser');
  prompt = prompt.replace('{{INPUT}}', command);
  
  try {
    const res = await callOpenAI(prompt);
    if (res.used && res.output) {
      return res.output;
    }
    return null;
  } catch (err) {
    logger.error('Failed to parse Copilot command via OpenAI:', err);
    return null;
  }
};

/**
 * Feature #17: Auto Job Description Generator
 */
exports.generateJobDescription = async (promptText) => {
  let aiPrompt = await AIPromptTemplate.getActivePrompt('job_description_generator');
  aiPrompt = aiPrompt.replace('{{INPUT}}', promptText);
  try {
    const res = await callOpenAI(aiPrompt);
    if (res.used && res.output && res.output.markdown) {
      return res.output.markdown;
    }
    throw new Error('Failed to extract markdown from response');
} catch (err) {
    logger.error('Failed to generate JD via OpenAI:', err);
    throw new Error('Failed to generate Job Description');
  }
};

/**
 * Feature #18 V2: Deep AI Candidate Evaluation
 * Second pass evaluation of top candidates using LLM reasoning.
 */
exports.evaluateCandidatesBatch = async (candidates, requiredSkills) => {
  const payload = candidates.map(c => ({
    id: c._id.toString(),
    skills: c.skills || [],
    experience: c.experience,
    status: c.jobSearchStatus,
    noticePeriod: c.noticePeriodDays,
    description: c.description || ''
  }));

  let aiPrompt = await AIPromptTemplate.getActivePrompt('candidate_evaluator');
  aiPrompt = aiPrompt.replace('{{REQUIRED_SKILLS}}', requiredSkills.join(', '));
  aiPrompt = aiPrompt.replace('{{CANDIDATES_DATA}}', JSON.stringify(payload, null, 2));

  try {
    const res = await callOpenAI(aiPrompt);
    if (res.used && res.output && Array.isArray(res.output)) {
      return res.output;
    }
    return [];
  } catch (err) {
    logger.error('Failed to evaluate candidates batch via OpenAI:', err);
    return [];
  }
};

/**
 * Evaluates candidate predictive analytics. 
 * (In production, this would use an ML model or robust heuristic engine.)
 */
exports.computeCandidateAnalytics = async (candidate, querySkills) => {
  // Simple heuristic simulation for now
  
  let skillMatch = 50;
  if (querySkills && querySkills.length > 0 && candidate.skills) {
    const matched = candidate.skills.filter(cs => querySkills.some(qs => cs.toLowerCase().includes(qs.toLowerCase()) || qs.toLowerCase().includes(cs.toLowerCase())));
    skillMatch = Math.min(100, Math.round((matched.length / querySkills.length) * 100));
  } else {
    skillMatch = Math.floor(Math.random() * (98 - 60 + 1)) + 60; // fallback mock
  }

  const joiningProb = Math.floor(Math.random() * (95 - 60 + 1)) + 60;
  const responseProb = Math.floor(Math.random() * (95 - 60 + 1)) + 60;
  const retentionProb = Math.floor(Math.random() * (95 - 60 + 1)) + 60;

  const totalSuccessScore = Math.round((skillMatch * 0.4) + (joiningProb * 0.2) + (responseProb * 0.2) + (retentionProb * 0.2));

  // Feature: AI Web Search Salary Estimation
  let marketValue = 800000;
  let candidateAsking = 900000;

  let aiPrompt = await AIPromptTemplate.getActivePrompt('salary_estimator');
  aiPrompt = aiPrompt.replace('{{SKILLS}}', candidate.skills && candidate.skills.length > 0 ? candidate.skills.join(', ') : 'General IT');
  aiPrompt = aiPrompt.replace('{{EXPERIENCE}}', candidate.experience || '0-2 years');
  aiPrompt = aiPrompt.replace('{{LOCATION}}', candidate.city || 'India');

  try {
    const res = await callOpenAI(aiPrompt);
    if (res.used && res.output && typeof res.output.marketValue === 'number') {
      marketValue = res.output.marketValue;
      candidateAsking = res.output.candidateAsking || res.output.marketValue + 100000;
    }
  } catch (err) {
    logger.error('Failed to get AI salary prediction:', err);
  }

  // Feature: Candidate Reputation / Behavior Label
  let reputation_label = "Verified";
  let reputation_notes = "Standard candidate profile.";
  
  const metrics = {
    responseRate: Math.floor(Math.random() * 40) + 60, // Mock 60-100%
    interviewAttendance: Math.floor(Math.random() * 20) + 80, // Mock 80-100%
    profileFreshnessDays: Math.floor(Math.random() * 30) // Mock 0-30 days
  };

  let repPrompt = await AIPromptTemplate.getActivePrompt('reputation_evaluator');
  repPrompt = repPrompt.replace('{{RESPONSE_RATE}}', metrics.responseRate);
  repPrompt = repPrompt.replace('{{INTERVIEW_ATTENDANCE}}', metrics.interviewAttendance);
  repPrompt = repPrompt.replace('{{PROFILE_FRESHNESS}}', metrics.profileFreshnessDays);

  try {
    const repRes = await callOpenAI(repPrompt);
    if (repRes.used && repRes.output && repRes.output.reputation_label) {
      reputation_label = repRes.output.reputation_label;
      reputation_notes = repRes.output.notes;
    }
  } catch (err) {
    logger.error('Failed to get AI reputation prediction:', err);
  }

  return {
    hiringSuccessScore: {
      total: totalSuccessScore,
      skillMatch,
      joiningProb,
      responseProb,
      retentionProb
    },
    hiringRisk: {
      counterOfferRisk: skillMatch > 80 ? 'High' : 'Low',
      joiningDelayRisk: 'Medium',
      earlyExitRisk: retentionProb < 70 ? 'High' : 'Low'
    },
    teamFitPredictor: {
      collaborationIndex: Math.floor(Math.random() * 30) + 70,
      communicationFit: Math.floor(Math.random() * 30) + 70,
      teamCompatibilityScore: Math.floor(Math.random() * 30) + 70
    },
    salaryPrediction: {
      marketValue: marketValue,
      candidateAsking: candidateAsking
    },
    talentDemandScore: Math.floor(Math.random() * (99 - 80 + 1)) + 80,
    reputation: {
      metrics,
      label: reputation_label,
      notes: reputation_notes
    }
  };
};

/**
 * Feature: Similar Candidates (Recruiter Module)
 * Extracts core transferable skills and parameters from a candidate to find similar profiles.
 */
exports.generateSimilarCandidateCriteria = async (candidate) => {
  const profileSummary = `
Title: ${candidate.skills && candidate.skills.length > 0 ? candidate.skills[0] : 'Professional'}
Skills: ${candidate.skills ? candidate.skills.join(', ') : 'None'}
Experience: ${candidate.experience || 'Not specified'}
Location: ${candidate.city || 'India'}
  `;

  let aiPrompt = await AIPromptTemplate.getActivePrompt('similar_candidate_finder');
  aiPrompt = aiPrompt.replace('{{PROFILE_SUMMARY}}', profileSummary);

  try {
    const res = await callOpenAI(aiPrompt);
    if (res.used && res.output && res.output.similarity_criteria) {
      return res.output;
    }
  } catch (err) {
    logger.error('Failed to generate similar candidate criteria:', err);
  }
  return null;
};

/**
 * Feature: Hidden Talent / Expand Search (Recruiter Module)
 * Expands a strict search query into related roles and transferable skills.
 */
exports.generateExpandedSearchCriteria = async (originalSkills) => {
  let aiPrompt = await AIPromptTemplate.getActivePrompt('hidden_talent_expander');
  aiPrompt = aiPrompt.replace('{{ORIGINAL_SKILLS}}', originalSkills.join(', '));

  try {
    const res = await callOpenAI(aiPrompt);
    if (res.used && res.output && res.output.hidden_talent_search_queries) {
      return res.output;
    }
  } catch (err) {
    logger.error('Failed to generate expanded search criteria:', err);
  }
  return null;
};

exports.generateInterviewKit = async (candidate, options = {}) => {
  const { customInstructions = '' } = options;
  
  let aiPrompt = await AIPromptTemplate.getActivePrompt('interview_kit_generator');
  aiPrompt = aiPrompt.replace('{{SKILLS}}', candidate.skills && candidate.skills.length > 0 ? candidate.skills.join(', ') : 'General IT');
  aiPrompt = aiPrompt.replace('{{EXPERIENCE}}', candidate.experience || 'Not specified');
  aiPrompt = aiPrompt.replace('{{LOCATION}}', candidate.city || 'Not specified');
  aiPrompt = aiPrompt.replace('{{STATUS}}', candidate.jobSearchStatus || 'Open to opportunities');
  aiPrompt = aiPrompt.replace('{{CUSTOM_INSTRUCTIONS}}', customInstructions ? `\nCustom Instructions:\n- ${customInstructions}` : '');


  try {
    const res = await callOpenAI(aiPrompt);
    if (res.used && res.output && res.output.technicalQuestions) {
      return res.output;
    }
    throw new Error('Failed to extract interview kit from response');
  } catch (err) {
    console.error('Failed to generate Interview Kit via OpenAI:', err);
    throw new Error('Failed to generate Interview Kit');
  }
};
