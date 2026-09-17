/**
 * Helper to mask an email address.
 * @param {String} email
 * @returns {String|null}
 */
function maskEmail(email) {
  if (!email) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const [name, domain] = parts;
  return `${name.slice(0, 2)}**@${domain}`;
}

/**
 * Helper to mask a phone number.
 * @param {String|Number} phone
 * @returns {String|null}
 */
function maskPhone(phone) {
  if (!phone) return null;
  const str = String(phone).replace(/\D/g, ''); // strip non digits
  // Format as +91 98765 ***** or similar depending on length
  if (str.length > 5) {
    const start = str.slice(0, 2);
    const mid = str.slice(2, 7);
    return `+${start} ${mid} *****`;
  }
  return `+${str.slice(0, 2)} *****`;
}

/**
 * Helper to mask a user's name.
 * @param {String} name
 * @returns {String}
 */
function maskName(name) {
  if (!name) return "Candidate";
  return name;
}

/**
 * Masks a candidate document if the recruiter is not subscribed.
 * @param {Object} candidate - User or profile object/document
 * @param {Boolean} isSubscribed - Whether the recruiter is subscribed
 * @returns {Object}
 */
function lockCandidate(candidate, isSubscribed) {
  if (!candidate) return null;
  
  // Extract plain object if mongoose document
  const obj = typeof candidate.toObject === "function" ? candidate.toObject() : { ...candidate };

  if (isSubscribed) return obj;

  // Mask sensitive fields
  const masked = { ...obj };

  if (masked.name) masked.name = maskName(masked.name);
  if (masked.fullName) masked.fullName = maskName(masked.fullName);
  if (masked.email) masked.email = maskEmail(masked.email);
  
  if (masked.phone) masked.phone = maskPhone(masked.phone);
  if (masked.whatsappNumber) masked.whatsappNumber = null;
  if (masked.fullPhone) masked.fullPhone = maskPhone(masked.fullPhone);
  if (masked.nationalNumber) masked.nationalNumber = null;

  if (masked.user && typeof masked.user === "object") {
    const u = { ...masked.user };
    if (u.name) u.name = maskName(u.name);
    if (u.fullName) u.fullName = maskName(u.fullName);
    if (u.email) u.email = maskEmail(u.email);
    if (u.phone) u.phone = maskPhone(u.phone);
    if (u.fullPhone) u.fullPhone = maskPhone(u.fullPhone);
    if (u.whatsappNumber) u.whatsappNumber = null;
    if (u.nationalNumber) u.nationalNumber = null;
    masked.user = u;
  }

  // Mask documents/resumes
  masked.resumeUrl = null;
  masked.cvUrl = null;
  masked.resumeText = undefined; // Don't expose parsed resume content
  if (masked.resumeApproval) {
    masked.resumeApproval.pendingUrl = null;
    masked.resumeApproval.approvedUrl = null;
  }
  if (masked.profilePhotoApproval) {
    masked.profilePhotoApproval.pendingUrl = null;
    masked.profilePhotoApproval.approvedUrl = null;
  }

  // Mask exact location details if present
  masked.exactAddress = null;
  if (masked.locationData) {
    masked.locationData = null;
  }
  if (masked.location) {
    masked.location = undefined;
  }
  masked.latitude = undefined;
  masked.longitude = undefined;

  // Mask other sensitive details
  masked.portfolioLinks = [];
  masked.bankDetails = null;

  return masked;
}

/**
 * Masks a list of candidate documents if the recruiter is not subscribed.
 * @param {Array} candidates - List of candidates
 * @param {Boolean} isSubscribed - Whether the recruiter is subscribed
 * @returns {Array}
 */
function lockCandidateList(candidates, isSubscribed) {
  if (!Array.isArray(candidates)) return [];
  return candidates.map((c) => lockCandidate(c, isSubscribed));
}

module.exports = {
  maskEmail,
  maskPhone,
  maskName,
  lockCandidate,
  lockCandidateList,
};
