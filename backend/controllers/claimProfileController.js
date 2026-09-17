const StagingCandidate = require('../models/StagingCandidate');
const User = require('../models/User');
const {
  createProviderProfile,
  updateProviderProfile,
} = require('../services/providerProfilePersistenceService');
const generateToken = require('../utils/generateToken');
const { assignFreePlan } = require('./subscriptionController');
const { updateCandidateScore } = require('../services/ActiveScoreService');

/**
 * @desc Get staging candidate details via claim token
 * @route GET /api/claim-profile/:token
 * @access Public
 */
exports.getClaimProfileDetails = async (req, res) => {
  try {
    const { token } = req.params;

    let candidate = await StagingCandidate.findOne({ 
      claimToken: token,
      status: { $in: ['staged', 'outreach_sent'] }
    });

    let isGhostUser = false;
    if (!candidate) {
      candidate = await User.findOne({ claimToken: token, partnerStatus: 'pending' });
      if (candidate) isGhostUser = true;
    }

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Invalid or expired claim token. This profile may have already been claimed.' });
    }

    if (!isGhostUser && candidate.claimExpiresAt < new Date()) {
      candidate.status = 'expired';
      await candidate.save();
      return res.status(400).json({ success: false, message: 'This claim link has expired.' });
    }

    // Trigger Active Score Engine: +40 for clicking the claim link
    if (!candidate.claimLinkClicked) {
      candidate.claimLinkClicked = true;
      await updateCandidateScore(candidate);
    }

    // Mask the email/phone for public display
    const maskEmail = (email) => email.replace(/(.{2})(.*)(?=@)/,
      (gp1, gp2, gp3) => { 
        for(let i = 0; i < gp3.length; i++) { gp2 += "*"; } return gp2; 
      });

    res.json({
      success: true,
      data: {
        name: candidate.name,
        email: maskEmail(candidate.email || candidate.phone || ''),
        jobTitle: isGhostUser ? (candidate.roles.includes('recruiter') ? 'Recruiter' : 'Professional') : candidate.jobTitle,
        skills: isGhostUser ? [] : candidate.skills,
        location: isGhostUser ? '' : candidate.location
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Confirm claim and convert staging candidate into active User & Provider
 * @route POST /api/claim-profile/:token/confirm
 * @access Public
 */
exports.confirmClaimProfile = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'A secure password of at least 6 characters is required.' });
    }

    let candidate = await StagingCandidate.findOne({ 
      claimToken: token,
      status: { $in: ['staged', 'outreach_sent'] }
    });

    let ghostUser = null;
    if (!candidate) {
      ghostUser = await User.findOne({ claimToken: token, partnerStatus: 'pending' });
    }

    if (!candidate && !ghostUser) {
      return res.status(404).json({ success: false, message: 'Invalid or expired claim token.' });
    }

    if (ghostUser) {
      // 1. Ghost user already exists in User collection
      ghostUser.password = password;
      ghostUser.partnerStatus = 'active'; // activate them
      ghostUser.claimToken = undefined;
      await ghostUser.save();

      if (ghostUser.roles.includes('recruiter')) {
        await RecruiterProfile.findOneAndUpdate({ user: ghostUser._id }, { status: 'approved' });
      } else {
        await updateProviderProfile(ghostUser._id, { profileCompletion: 100, profileStatus: 'active' });
      }

      const authToken = generateToken(ghostUser._id, ghostUser.activeRole);
      return res.json({
        success: true,
        message: 'Profile claimed successfully! Welcome to Lucohire.',
        token: authToken
      });
    }

    // Check if a user with this email already exists
    let user = await User.findOne({ email: candidate.email });

    if (user) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists. Please login instead.' });
    }

    // 1. Create the Master User Record
    user = await User.create({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      password: password, // The model should hash this pre-save
      roles: ['provider'],
      activeRole: 'provider',
      firstRegisteredRole: 'provider',
      roleIntent: 'provider',
      isEmailVerified: true, // We trust it since Apify scraped it and Resend delivered to it
      country: candidate.location || 'India',
      locale: 'en',
      currency: 'INR'
    });

    // 2. Create the Provider Profile
    const profile = await createProviderProfile({
      user: user._id,
      designation: candidate.jobTitle,
      skills: Array.isArray(candidate.skills) ? candidate.skills.map(String) : [],
      city: candidate.location,
      profileStatus: 'pending',
    });

    // 3. Assign a free subscription plan
    await assignFreePlan(user._id, 'provider');

    // 4. Mark the StagingCandidate as claimed and update final active score
    candidate.consentAccepted = true;
    candidate.profileCompleted = true;
    candidate.emailVerified = true;
    candidate.status = 'claimed';
    await updateCandidateScore(candidate);

    // 5. Generate Auth Token
    const authToken = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Profile successfully claimed and account created!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        activeRole: user.activeRole
      },
      token: authToken
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
