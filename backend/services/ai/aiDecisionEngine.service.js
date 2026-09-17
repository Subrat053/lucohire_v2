const { callOpenAI } = require('./llmService');
const logger = require('../../utils/logger');

/**
 * Recruiter Reputation Score
 * Summarizes recruiter trust and hiring quality from metrics.
 */
exports.evaluateRecruiterReputation = async (recruiterData, mockMetrics = null) => {
  // Use real data from recruiter profile if available, else fallback to mock/defaults
  const metrics = mockMetrics || {
    accountAgeDays: recruiterData.createdAt ? Math.floor((Date.now() - new Date(recruiterData.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 30,
    totalJobsPosted: recruiterData.jobsPosted?.length || 0,
    recentActivityScore: recruiterData.lastLogin ? 85 : 40,
    simulatedResponseRate: Math.floor(Math.random() * 30) + 70, // 70-100%
    simulatedOfferClosure: Math.floor(Math.random() * 40) + 50, // 50-90%
  };

  const prompt = `
You are LucoHire AI Decision Engine. Task: summarize recruiter trust and hiring quality from metrics. 
Use only provided data. Do not assume missing facts. Return compact valid JSON only. Max 5 items per array. No explanation outside JSON.
Input: ${JSON.stringify(metrics)}

Output schema: 
{
  "recruiter_reputation_score": number (0-100),
  "average_response_time": "string (e.g. '24 hours', '2 days')",
  "offer_closure_score": number (0-100),
  "candidate_satisfaction_score": number (0-100),
  "ghosting_risk_score": number (0-100),
  "recruiter_label": "string (e.g. 'Highly Reliable', 'Slow Responder')",
  "notes": "string (brief summary of reputation)"
}
`;

  try {
    const aiResponse = await callOpenAI([{ role: 'user', content: prompt }]);
    if (!aiResponse) throw new Error("AI returned null");
    return JSON.parse(aiResponse);
  } catch (error) {
    logger.error('Error evaluating recruiter reputation:', error);
    return {
      recruiter_reputation_score: 75,
      average_response_time: "48 hours",
      offer_closure_score: 60,
      candidate_satisfaction_score: 80,
      ghosting_risk_score: 20,
      recruiter_label: "Average Responder",
      notes: "Default metric due to AI failure or insufficient data."
    };
  }
};

/**
 * Opportunity Expiry Predictor
 * Predicts opportunity expiry or urgency from posting date, application count, and recruiter activity.
 */
exports.predictOpportunityExpiry = async (jobData, mockMetrics = null) => {
  // Calculate real job age
  const daysSincePosted = jobData.createdAt ? Math.floor((Date.now() - new Date(jobData.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 5;
  
  const metrics = mockMetrics || {
    daysSincePosted,
    applicationCount: jobData.applications?.length || Math.floor(Math.random() * 50),
    isUrgentFlag: jobData.isUrgent || false,
    recruiterLastActive: "Recent" // Assuming active recruiter
  };

  const prompt = `
You are LucoHire AI Decision Engine. Task: predict opportunity expiry or urgency. 
Use only provided data. Do not assume missing facts. Return compact valid JSON only. Max 5 items per array. No explanation outside JSON.
Input: ${JSON.stringify(metrics)}

Output schema: 
{
  "opportunity_expiry_risk": "string (e.g. 'High', 'Medium', 'Low')",
  "estimated_active_days_left": number,
  "urgency_score": number (0-100),
  "candidate_message": "string (e.g. 'Apply now, filling fast!')",
  "recommended_action": "string (e.g. 'Apply immediately', 'Wait for response')"
}
`;

  try {
    const aiResponse = await callOpenAI([{ role: 'user', content: prompt }]);
    if (!aiResponse) throw new Error("AI returned null");
    return JSON.parse(aiResponse);
  } catch (error) {
    logger.error('Error predicting opportunity expiry:', error);
    return {
      opportunity_expiry_risk: "Medium",
      estimated_active_days_left: 14,
      urgency_score: 50,
      candidate_message: "Active opportunity",
      recommended_action: "Apply at your convenience"
    };
  }
};
