const express = require("express");
const router = express.Router();
const path = require("path");
const { findProviderProfileByUserId } = require('../services/providerProfilePersistenceService');
const { findRecruiterProfileByUserId } = require('../services/recruiterCompanyPersistenceService');
const { createResumeAccessLog } = require('../services/auditPersistenceService');
const { protect } = require("../middleware/auth");
const { isRecruiterSubscribed } = require("../utils/subscriptionHelper");
const { generateSignedResumeUrl } = require("../services/r2Service");

// @desc    Generate signed temporary Cloudflare R2 resume URL for paid recruiters
// @route   POST /api/candidates/:candidateId/resume-url
// @access  Private (Recruiter only)
router.post("/:candidateId/resume-url", protect, async (req, res) => {
  try {
    const { candidateId } = req.params;

    // 1. Authenticate and check recruiter role
    if (req.user.activeRole !== "recruiter" && req.user.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters can request resume URLs" });
    }

    // 2. Check recruiter subscription
    const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);
    if (!isRecruiterSubscribed(recruiterProfile)) {
      return res.status(403).json({
        success: false,
        code: "PREMIUM_REQUIRED",
        message: "Premium subscription is required to unlock and download resumes.",
      });
    }

    // 3. Check candidate exists
    const candidateProfile = await findProviderProfileByUserId(candidateId);
    if (!candidateProfile) {
      return res.status(404).json({ message: "Candidate profile not found" });
    }

    const resumeUrl = candidateProfile.resumeUrl || candidateProfile.resumeApproval?.approvedUrl || candidateProfile.resumeApproval?.pendingUrl;
    if (!resumeUrl) {
      return res.status(404).json({ message: "Candidate has no resume uploaded" });
    }

    // 4. Extract R2 object key from URL path
    // e.g. "https://res.cloudinary.com/.../resumes/candidate_id/Soumya_MERN-17812" -> "Soumya_MERN-17812"
    let objectKey = path.basename(resumeUrl);
    if (objectKey.includes("?")) {
      objectKey = objectKey.split("?")[0];
    }

    // 5. Generate signed R2 URL (expires in 15 minutes / 900 seconds)
    const signedUrl = await generateSignedResumeUrl(objectKey);

    // 6. Log resume access
    await createResumeAccessLog({
      recruiterId: req.user._id,
      candidateId,
      resumeObjectKey: objectKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    res.json({
      success: true,
      resumeUrl: signedUrl,
      expiresInSeconds: 900,
    });

  } catch (error) {
    console.error("[R2 Resume URL Error] Failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
