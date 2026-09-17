const {
  evaluateProviderFraudSignals,
  runAiFraudClusterReview,
} = require('../../../services/fraudRulesService');

async function analyzeFraudSignals({ userId } = {}) {
  if (!userId) throw new Error('userId is required');
  return evaluateProviderFraudSignals(userId);
}

async function reviewFraudClusters() {
  return runAiFraudClusterReview();
}

module.exports = {
  analyzeFraudSignals,
  reviewFraudClusters,
};
