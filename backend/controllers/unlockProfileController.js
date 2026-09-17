const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { saveUser } = require('../services/authPersistenceService');
const { sendMail } = require('../services/mailService');
const { generateOTP } = require('../utils/messaging');
const generateToken = require('../utils/generateToken');

const toSafeUser = (record) => {
  if (!record) return null;
  const { password, ...safeRecord } = record;
  return withLegacyId(safeRecord);
};

// @desc    Get user's phone number to send Firebase OTP for profile unlock
// @route   POST /api/v1/unlock-profile/send-otp
// @access  Private (Admin, Manager, Partner)
exports.sendUnlockOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = toSafeUser(await prisma.user.findUnique({ where: { email: email.toLowerCase() } }));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.phone) {
      return res.status(400).json({ success: false, message: 'User does not have a registered phone number. Cannot unlock via mobile.' });
    }

    res.status(200).json({
      success: true,
      message: 'Phone number retrieved for Firebase OTP',
      phone: user.phone,
    });
  } catch (error) {
    console.error('[sendUnlockOtp Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve phone number' });
  }
};

// @desc    Verify OTP and unlock user's profile
// @route   POST /api/v1/unlock-profile/verify
// @access  Private (Admin, Manager, Partner)
exports.verifyUnlockOtp = async (req, res, next) => {
  try {
    const { email, firebaseToken } = req.body;
    if (!email || !firebaseToken) {
      return res.status(400).json({ success: false, message: 'Email and Firebase Token are required' });
    }

    const user = toSafeUser(await prisma.user.findUnique({ where: { email: email.toLowerCase() } }));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { verifyFirebaseIdToken } = require('./authController');
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(firebaseToken);
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid or expired Firebase token." });
    }

    const verifiedPhone = String(decodedToken.phoneNumber || "").replace(/\D/g, "");
    const userPhoneClean = String(user.phone || "").replace(/\D/g, "");

    if (verifiedPhone !== userPhoneClean && !userPhoneClean.endsWith(verifiedPhone) && !verifiedPhone.endsWith(userPhoneClean)) {
      return res.status(400).json({ success: false, message: "Verified phone number does not match the user's registered phone number." });
    }

    // Unlock profile
    user.isBlocked = false;
    user.status = 'active';
    user.approvalStatus = 'approved';
    
    await saveUser(user);

    // Generate auth token for impersonation
    const token = generateToken(user._id, user.activeRole);

    res.status(200).json({
      success: true,
      message: 'Profile unlocked successfully',
      data: user,
      token: token,
    });
  } catch (error) {
    console.error('[verifyUnlockOtp Error]', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
};

// @desc    Update unlocked user's profile details
// @route   PUT /api/v1/unlock-profile/user/:id
// @access  Private (Admin, Manager, Partner)
exports.updateUnlockedProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    const user = toSafeUser(await prisma.user.findUnique({ where: { id: String(id) } }));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await saveUser(user);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('[updateUnlockedProfile Error]', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// @desc    Directly unlock and view user's profile without OTP
// @route   POST /api/v1/unlock-profile/direct-unlock
// @access  Private (Admin, Manager, Partner)
exports.directUnlockProfile = async (req, res, next) => {
  try {
    const { email, userId } = req.body;
    if (!email && !userId) {
      return res.status(400).json({ success: false, message: 'Email or userId is required' });
    }

    const where = userId ? { id: String(userId) } : { email: String(email).toLowerCase() };
    const user = toSafeUser(await prisma.user.findUnique({ where }));

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Unlock profile
    user.isBlocked = false;
    user.status = 'active';
    user.approvalStatus = 'approved';
    await saveUser(user);

    // Generate auth token for impersonation
    const token = generateToken(user._id, user.activeRole);

    res.status(200).json({
      success: true,
      message: 'Profile unlocked successfully',
      data: user,
      token: token,
    });
  } catch (error) {
    console.error('[directUnlockProfile Error]', error);
    res.status(500).json({ success: false, message: 'Failed to access profile' });
  }
};
