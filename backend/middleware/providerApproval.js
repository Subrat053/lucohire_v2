const { ensureProviderProfile } = require('../services/providerProfilePersistenceService');

const ensureProviderApproved = async (req, res, next) => {
  try {
    await ensureProviderProfile(req.user._id, {
      isApproved: true,
      isVerified: true,
      approvalAction: 'approved',
      profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { ensureProviderApproved };









// ======================================================================================
// const ProviderProfile = require('../models/ProviderProfile');
// const User = require('../models/User');

// const ensureProviderApproved = async (req, res, next) => {
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

//     if (!user.panelAccess?.provider?.enabled) {
//       return res.status(403).json({
//         message: 'No active provider plan found. Please choose a plan to continue.',
//         planRequired: true,
//         panel: 'provider',
//       });
//     }

//     const profile = await ProviderProfile.findOne({ user: req.user._id }).select('isApproved');

//     if (!profile) {
//       return res.status(403).json({
//         message: 'Provider profile not found. Please complete profile setup first.',
//         profileRequired: true,
//       });
//     }

//     next();
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// module.exports = {
//   ensureProviderApproved,
// };
