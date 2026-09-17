const { ensureRecruiterProfile } = require('../services/recruiterCompanyPersistenceService');

const ensureRecruiterApproved = async (req, res, next) => {
  try {
    await ensureRecruiterProfile(req.user._id, {
      isApproved: true,
      isVerified: true,
      approvalAction: 'approved',
      freeViewResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      freeUnlockResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      unlocksRemaining: 2,
      unlockPackSize: 2,
    });

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { ensureRecruiterApproved };









// ==============================================================================
// const RecruiterProfile = require('../models/RecruiterProfile');
// const User = require('../models/User');

// const ensureRecruiterApproved = async (req, res, next) => {
//   try {
//     const user = req.user?._id ? req.user : await User.findById(req.user?._id || null);
//     if (!user) {
//       return res.status(401).json({ message: 'Unauthorized', approvalRequired: true });
//     }

//     if (user.approvalStatus !== 'approved') {
//       return res.status(403).json({
//         message: 'Your account is pending admin approval.',
//         approvalRequired: true,
//         approvalStatus: user.approvalStatus || 'pending',
//       });
//     }

//     if (!user.panelAccess?.recruiter?.enabled) {
//       return res.status(403).json({
//         message: 'No active recruiter plan found. Please choose a plan to continue.',
//         planRequired: true,
//         panel: 'recruiter',
//       });
//     }

//     const profile = await RecruiterProfile.findOne({ user: req.user._id }).select('isApproved');

//     if (!profile) {
//       return res.status(403).json({
//         message: 'Recruiter profile not found. Please complete profile setup first.',
//         profileRequired: true,
//       });
//     }

//     next();
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// module.exports = {
//   ensureRecruiterApproved,
// };
