const { findProviderProfileByUserId } = require('../services/providerProfilePersistenceService');
const { findRecruiterProfileByUserId } = require('../services/recruiterCompanyPersistenceService');

/**
 * Checks if a candidate/provider has an active paid subscription.
 * @param {Object} profile - ProviderProfile object
 * @returns {Boolean}
 */
function isProviderSubscribed(profile) {
  if (!profile) return false;
  
  const plan = profile.currentPlan || "free";
  const isPaid = plan !== "free" && plan !== "provider-free-default";
  
  if (!isPaid) return false;

  // Check if expired
  if (profile.planExpiresAt && new Date(profile.planExpiresAt) < new Date()) {
    return false;
  }

  return true;
}

/**
 * Checks if a recruiter has an active paid subscription.
 * @param {Object} profile - RecruiterProfile object
 * @returns {Boolean}
 */
function isRecruiterSubscribed(profile) {
  if (!profile) return false;
  
  const plan = profile.currentPlan || "free";
  const isPaid = plan !== "free";
  
  if (!isPaid) return false;

  // Check if expired
  if (profile.planExpiresAt && new Date(profile.planExpiresAt) < new Date()) {
    return false;
  }

  return true;
}

/**
 * Helper to check subscription by userId.
 * @param {String} userId
 * @param {String} role - "provider" or "recruiter"
 * @returns {Promise<Boolean>}
 */
async function checkUserSubscription(userId, role) {
  try {
    if (role === "provider") {
      const profile = await findProviderProfileByUserId(userId);
      return isProviderSubscribed(profile);
    } else if (role === "recruiter") {
      const profile = await findRecruiterProfileByUserId(userId);
      return isRecruiterSubscribed(profile);
    }
    return false;
  } catch (err) {
    console.error("[Subscription Helper] Error checking subscription:", err);
    return false;
  }
}

module.exports = {
  isProviderSubscribed,
  isRecruiterSubscribed,
  checkUserSubscription,
};
