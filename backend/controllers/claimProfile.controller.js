const StagingCandidate = require('../models/StagingCandidate');
const User = require('../models/User');
const { createCandidateActivityLog } = require('../services/auditPersistenceService');

const verifyClaimToken = async (req, res) => {
  try {
    const { token } = req.params;
    const candidate = await StagingCandidate.findOne({ claimToken: token, status: 'staged' });
    
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Invalid or expired claim token' });
    }

    if (new Date() > candidate.claimExpiresAt) {
      candidate.status = 'expired';
      await candidate.save();
      return res.status(400).json({ success: false, message: 'Claim token expired' });
    }

    res.status(200).json({ success: true, candidate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const claimProfile = async (req, res) => {
  try {
    const { token } = req.params;
    const { emailVerified, phoneVerified, consentAccepted, updatedData } = req.body;

    const candidate = await StagingCandidate.findOne({ claimToken: token, status: 'staged' });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Invalid or expired claim token' });
    }

    if (!consentAccepted) {
      return res.status(400).json({ success: false, message: 'Privacy consent is required to claim profile' });
    }

    // Update staging record
    candidate.emailVerified = emailVerified || candidate.emailVerified;
    candidate.phoneVerified = phoneVerified || candidate.phoneVerified;
    candidate.consentAccepted = true;
    candidate.status = 'claimed';
    candidate.activeScore += 100; // Boost score for claiming
    candidate.leadStatus = 'Verified Active Candidate';
    await candidate.save();

    // Move to User database
    const newUser = new User({
      name: updatedData.name || candidate.name,
      email: updatedData.email || candidate.email,
      phone: updatedData.phone || candidate.phone,
      roles: ['user'],
      // Map other relevant fields
    });
    await newUser.save();

    // Log Activity
    await createCandidateActivityLog({
      candidateId: candidate._id,
      eventType: 'profile_claimed',
      source: 'User Action'
    });

    res.status(200).json({ success: true, message: 'Profile successfully claimed', user: newUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  verifyClaimToken,
  claimProfile
};
