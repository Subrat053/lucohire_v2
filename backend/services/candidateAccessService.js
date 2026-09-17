/**
 * candidateAccessService.js
 * Server-side gate that controls what candidate data recruiters can see.
 *
 * Security principle:
 *   - If access is LOCKED: return only safe partial data (no phone/email/resume/portfolio)
 *   - If access is UNLOCKED: return full profile data
 *   - The frontend NEVER receives private data before unlock — no CSS blur bypass possible.
 */

const { findProfileUnlock } = require('./billingPersistenceService');
const { maskEmail, maskPhone, maskName } = require('../utils/maskCandidateData');

// ─── Config ───────────────────────────────────────────────────────────────────
const OTP_SESSION_MINUTES = parseInt(process.env.OTP_SESSION_MINUTES || '30', 10);

// ─── Main access check ────────────────────────────────────────────────────────

/**
 * Check if a recruiter has access to a provider's full profile.
 * @param {string} recruiterId  - ObjectId string
 * @param {string} providerId   - Provider User ObjectId string
 * @param {string} recruiterUserId - req.user._id
 * @returns access status object
 */
async function getCandidateViewAccess({ recruiterId, providerId, recruiterUser }) {
  const result = {
    access: 'locked',
    unlockRequired: {
      otpRequired: true,
      planRequired: false,
      limitExceeded: false,
    },
    unlockRecord: null,
  };

  // 1. Recruiter must not be suspended/blocked
  if (recruiterUser) {
    if (recruiterUser.isBlocked || recruiterUser.approvalStatus === 'suspended') {
      result.unlockRequired.reason = 'account_suspended';
      return result;
    }
  }

  // 2. Check active plan
  const { getActiveSubscription } = require('../middleware/subscription');
  const { subscription, plan } = await getActiveSubscription(recruiterId, 'recruiter');
  const hasPaidPlan = !!(plan && plan.price > 0 && plan.slug !== 'free');

  if (!hasPaidPlan) {
    result.unlockRequired.planRequired = true;
    result.unlockRequired.otpRequired = false;
    return result;
  }

  // 3. Check contact/unlock limit
  const contactLimit = Number(plan.contactLimit || 0);
  const usedContacts = Number(subscription?.usage?.contactsViewed || 0);
  if (contactLimit > 0 && usedContacts >= contactLimit) {
    result.unlockRequired.limitExceeded = true;
    result.unlockRequired.otpRequired = false;
    return result;
  }

  // 4. Check existing unlock record
  const unlockRecord = await findProfileUnlock(recruiterId, providerId);

  if (!unlockRecord) {
    // No unlock record — recruiter needs OTP first
    result.unlockRequired.otpRequired = true;
    return result;
  }

  // 5. Check OTP verified status (session-based: valid if within window)
  if (!unlockRecord.otpVerified) {
    result.unlockRequired.otpRequired = true;
    return result;
  }

  // 6. Check if unlock has expired
  if (unlockRecord.expiresAt && new Date() > new Date(unlockRecord.expiresAt)) {
    result.unlockRequired.otpRequired = true;
    return result;
  }

  // ✅ All checks passed — full access
  result.access = 'unlocked';
  result.unlockRequired = { otpRequired: false, planRequired: false, limitExceeded: false };
  result.unlockRecord = unlockRecord;
  return result;
}

// ─── Build locked response (safe partial data only) ───────────────────────────

/**
 * Returns masked/partial candidate data safe to expose to any recruiter.
 * NEVER includes: phone, email, whatsappNumber, resumeUrl, portfolioLinks, full address.
 */
function buildLockedResponse(providerProfile, providerUser) {
  const name = providerUser?.name || providerProfile?.profileName || 'Candidate';
  const maskedName = maskName(name);

  const maskedEmail = maskEmail(providerUser?.email);
  const maskedPhone = maskPhone(providerUser?.phone || providerUser?.whatsappNumber);
  const hasResume = !!(providerProfile?.resumeUrl || providerProfile?.cvUrl);

  const skills = Array.isArray(providerProfile?.skills) ? providerProfile.skills.slice(0, 5) : [];
  const city = providerProfile?.city || providerProfile?.location?.city || '';
  const state = providerProfile?.state || providerProfile?.location?.state || '';

  // Build experience summary without leaking company names
  const expYears = providerProfile?.experience || '';
  const tier = providerProfile?.tier || providerProfile?.skillLevel || '';

  // Pricing range (not exact pricing)
  const pricingRange = buildPricingRange(providerProfile);

  // Short summary preview (first 120 chars of description)
  const summaryPreview = providerProfile?.description
    ? String(providerProfile.description).slice(0, 120) + '...'
    : null;

  return {
    id: providerProfile?._id,
    name: maskedName,
    skills,
    city,
    state,
    experienceYears: expYears,
    tier,
    profilePhotoBlur: true,
    pricingRange,
    summaryPreview,
    rating: providerProfile?.rating || 0,
    totalReviews: providerProfile?.totalReviews || 0,
    isVerified: providerProfile?.isVerified || false,
    email: maskedEmail,
    phone: maskedPhone,
    hasResume: hasResume,
    // Explicitly NOT included: real phone, real email, whatsappNumber, resumeUrl, portfolioLinks, documents
  };
}

function buildPricingRange(profile) {
  if (!profile) return null;
  const entries = Array.isArray(profile.pricingEntries) ? profile.pricingEntries : [];
  if (entries.length === 0 && profile.pricing) {
    return `${profile.currency || '₹'}${profile.pricing}/${profile.pricingType || 'hour'}`;
  }
  if (entries.length === 0) return null;

  const amounts = entries.map((e) => e.perHour || e.perDay || 0).filter(Boolean);
  if (amounts.length === 0) return null;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const currency = entries[0]?.currency || 'INR';
  const symbol = currency === 'INR' ? '₹' : currency;
  return min === max ? `${symbol}${min}` : `${symbol}${min} - ${symbol}${max}`;
}

// ─── Build unlocked response (full data) ──────────────────────────────────────

/**
 * Returns the full candidate profile — only called after access is confirmed.
 */
function buildUnlockedResponse(providerProfile, providerUser) {
  return {
    fullName: providerUser?.name || providerProfile?.profileName || '',
    phone: providerUser?.phone || '',
    email: providerUser?.email || '',
    whatsappNumber: providerUser?.whatsappNumber || '',
    profilePhoto: providerProfile?.profilePhoto || providerProfile?.photo || '',
    resumeUrl: providerProfile?.resumeApproval?.approvedUrl || providerProfile?.resumeUrl || '',
    portfolioLinks: (providerProfile?.portfolioLinks || []).filter((l) => l.status === 'approved' || !l.status),
    skills: providerProfile?.skills || [],
    experience: providerProfile?.experience || '',
    tier: providerProfile?.tier || '',
    city: providerProfile?.city || '',
    state: providerProfile?.state || '',
    description: providerProfile?.description || '',
    pricing: providerProfile?.pricing || '',
    pricingType: providerProfile?.pricingType || '',
    pricingEntries: providerProfile?.pricingEntries || [],
    languages: providerProfile?.languages || [],
    rating: providerProfile?.rating || 0,
    totalReviews: providerProfile?.totalReviews || 0,
    isVerified: providerProfile?.isVerified || false,
    isApproved: providerProfile?.isApproved || false,
    profileId: providerProfile?._id,
    userId: providerUser?._id,
  };
}

module.exports = {
  getCandidateViewAccess,
  buildLockedResponse,
  buildUnlockedResponse,
};
