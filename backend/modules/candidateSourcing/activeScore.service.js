const calculateActiveScore = (candidate) => {
  let score = 0;

  // Time-based resume update checks
  if (candidate.resumeUpdatedAt) {
    const daysSinceUpdate = (new Date() - new Date(candidate.resumeUpdatedAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= 7) score += 35;
    else if (daysSinceUpdate <= 15) score += 30;
    else if (daysSinceUpdate <= 30) score += 20;
  }

  // Boolean flags
  if (candidate.openToWork) score += 30;
  if (candidate.recentlyActive) score += 25;
  if (candidate.noticePeriodAvailable) score += 20;
  if (candidate.preferredJobTypeAvailable) score += 15;
  if (candidate.resumeUploaded) score += 30;
  if (candidate.appliedToJob) score += 50;
  if (candidate.claimLinkClicked) score += 40;
  if (candidate.emailVerified) score += 30;
  if (candidate.phoneVerified) score += 30;
  if (candidate.consentAccepted) score += 50;
  if (candidate.profileCompleted) score += 100;

  let leadStatus = 'Raw Lead';
  if (score > 100 && (candidate.consentAccepted || candidate.profileCompleted)) {
    leadStatus = 'Verified Active Candidate';
  } else if (score >= 31) {
    leadStatus = 'Active Signal Lead';
  }

  return { score, leadStatus };
};

module.exports = { calculateActiveScore };
