const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const prisma = require('../config/prisma');
const { findProviderProfileByUserId } = require('../services/providerProfilePersistenceService');
const { protect } = require("../middleware/auth");
const { lockCandidate } = require("../utils/maskCandidateData");

// @desc    Generate crypto-safe profile share token
// @route   POST /api/profile-share/:candidateId
// @access  Private (Candidate/Provider or Recruiter/Partner only)
router.post("/:candidateId", protect, async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { expiresDays = 7 } = req.body;

    // Validate permission: A user can share their own profile, or recruiters/partners can share if authorized
    const isOwner = String(req.user._id) === String(candidateId);
    const isRecruiterOrPartner = ["recruiter", "partner"].includes(req.user.role) || ["recruiter", "partner"].includes(req.user.activeRole);

    if (!isOwner && !isRecruiterOrPartner) {
      return res.status(403).json({ message: "You do not have permission to share this profile" });
    }

    // Check candidate profile exists
    const profile = await findProviderProfileByUserId(candidateId);
    if (!profile) {
      return res.status(404).json({ message: "Candidate profile not found" });
    }

    // Generate unique crypto-safe UUID token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

    const shareToken = await prisma.profileShareToken.create({ data: {
      token,
      candidateId: String(candidateId),
      createdByUserId: String(req.user._id),
      createdByRole: req.user.activeRole || req.user.role,
      expiresAt,
    } });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const shareUrl = `${frontendUrl}/profile/share/${token}`;

    res.status(201).json({
      success: true,
      token,
      shareUrl,
      expiresAt,
    });

  } catch (error) {
    console.error("[Profile Share Token Generation Error]:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Public route to fetch masked profile by token
// @route   GET /api/profile-share/view/:token
// @access  Public
router.get("/view/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const shareToken = await prisma.profileShareToken.findUnique({ where: { token } });
    if (!shareToken) {
      return res.status(404).json({ message: "Invalid share token" });
    }

    // Check if revoked or expired
    if (shareToken.isRevoked) {
      return res.status(410).json({ message: "This share link has been revoked" });
    }

    if (new Date(shareToken.expiresAt) < new Date()) {
      return res.status(410).json({ message: "This share link has expired" });
    }

    // Fetch candidate profile populated with user details
    const providerProfile = await findProviderProfileByUserId(shareToken.candidateId, {
      userSelect: { id: true, name: true, avatar: true, email: true, phone: true },
    });

    if (!providerProfile) {
      return res.status(404).json({ message: "Candidate profile not found" });
    }

    // Increment access stats
    await prisma.profileShareToken.update({
      where: { id: shareToken.id },
      data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
    });

    // Set search crawler restrictions via X-Robots-Tag HTTP Header
    res.set("X-Robots-Tag", "noindex, nofollow");

    // Always apply candidate data masking for public share links
    const maskedProfile = lockCandidate(providerProfile, false);

    res.json({
      success: true,
      profile: maskedProfile,
    });

  } catch (error) {
    console.error("[Public Profile Share View Error]:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
