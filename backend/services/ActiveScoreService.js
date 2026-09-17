/**
 * ActiveScoreService
 * Handles the calculation of 'activeScore' and 'leadStatus' based on candidate flags.
 */

const calculateScoreAndStatus = (candidate) => {
  let score = 0;

  // 1. Resume Updated (Time-based decay)
  if (candidate.resumeUpdatedAt) {
    const now = new Date();
    const resumeDate = new Date(candidate.resumeUpdatedAt);
    const diffDays = Math.floor((now - resumeDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) score += 35;
    else if (diffDays <= 15) score += 30;
    else if (diffDays <= 30) score += 20;
  }

  // 2. Behavioral & Profile Signals
  if (candidate.openToWork) score += 30;
  if (candidate.recentlyActive) score += 25;
  if (candidate.noticePeriodAvailable) score += 20;
  if (candidate.preferredJobTypeAvailable) score += 15;
  if (candidate.resumeUploaded) score += 30;
  if (candidate.appliedToJob) score += 50;

  // 3. Verification & Consent Signals
  if (candidate.claimLinkClicked) score += 40;
  if (candidate.emailVerified) score += 30;
  if (candidate.phoneVerified) score += 30;
  if (candidate.consentAccepted) score += 50;
  if (candidate.profileCompleted) score += 100;

  // 4. Determine Lead Status
  let leadStatus = 'Raw Lead';
  
  if (score >= 100 && (candidate.consentAccepted || candidate.profileCompleted)) {
    leadStatus = 'Verified Active Candidate';
  } else if (score >= 31) {
    leadStatus = 'Active Signal Lead';
  }

  return { score, leadStatus };
};

/**
 * Utility function to update a StagingCandidate document's score in real-time
 * @param {Object} candidateDocument - The Mongoose document
 * @returns {Object} - Returns the updated fields (for logging/debugging)
 */
const updateCandidateScore = async (candidateDocument) => {
  const { score, leadStatus } = calculateScoreAndStatus(candidateDocument);
  
  candidateDocument.activeScore = score;
  candidateDocument.leadStatus = leadStatus;
  
  await candidateDocument.save();
  return { score, leadStatus };
};

module.exports = {
  calculateScoreAndStatus,
  updateCandidateScore
};
