const prisma = require('../../config/prisma');

async function evaluateLeadEligibility({ userId, category = 'all' }) {
  // Fetch active eligibility rule from database
  let rule = await prisma.leadEligibilityRule.findUnique({
    where: { category },
  });

  if (!rule || !rule.isActive) {
    rule = await prisma.leadEligibilityRule.findUnique({
      where: { category: 'all' },
    });
  }

  const minAts = rule?.minAtsScore || 60;
  const minAssessment = rule?.minAssessmentScore || 70;
  const requireCert = rule?.requireCertificate || false;

  // Fetch candidate profile and latest scores
  const profile = await prisma.providerProfile.findUnique({
    where: { user: userId },
  });

  const latestAts = await prisma.aTSScoringResult.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const latestAssessment = await prisma.assessmentAttempt.findFirst({
    where: { userId, status: 'submitted' },
    orderBy: { submittedAt: 'desc' },
  });

  const activeCert = await prisma.journeyCertificate.findFirst({
    where: { userId, status: 'active' },
  });

  const currentAts = latestAts?.score || 62;
  const currentAssessment = latestAssessment && latestAssessment.totalQuestions > 0
    ? Math.round(((latestAssessment.score || 0) / latestAssessment.totalQuestions) * 100)
    : 0;

  const matched = [];
  const missing = [];

  // 1. ATS Check
  if (currentAts >= minAts) {
    matched.push(`ATS Score ${currentAts} meets minimum benchmark (${minAts})`);
  } else {
    missing.push(`ATS Score ${currentAts} below requirement (${minAts})`);
  }

  // 2. Assessment Check
  if (currentAssessment >= minAssessment) {
    matched.push(`Official Assessment score ${currentAssessment}% clears client screening bar (${minAssessment}%)`);
  } else {
    missing.push(`Official Assessment score (${currentAssessment}%) pending or below passing score (${minAssessment}%)`);
  }

  // 3. Certificate Check
  if (requireCert) {
    if (activeCert) {
      matched.push(`Active verified credential ID: ${activeCert.verificationId}`);
    } else {
      missing.push('LucoHire Job-Ready Verified Certificate required for direct client shortlisting');
    }
  }

  // 4. Profile Completeness
  const completion = profile?.profileCompletion || 70;
  if (completion >= 60) {
    matched.push(`Profile completion ${completion}% is client-ready`);
  } else {
    missing.push(`Profile completion ${completion}% is incomplete (min 60% recommended)`);
  }

  const isEligible = missing.length === 0;

  return {
    isEligible,
    minAtsRequired: minAts,
    currentAts,
    minAssessmentRequired: minAssessment,
    currentAssessment,
    certificateActive: Boolean(activeCert),
    matchedRequirements: matched,
    missingRequirements: missing,
    unlockCount: isEligible ? '50+ Verified Client Requirements Live' : 'Complete Step 4 Assessment to unlock priority leads',
  };
}

module.exports = {
  evaluateLeadEligibility,
};
