const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { mapUserSubscription } = require('../services/billingPersistenceService');

/**
 * Get referral stats and history for the current user
 */
const getMyReferralStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await prisma.user.findUnique({ where: { id: String(userId) }, select: {
      referralCode: true, referralWalletBalance: true, totalReferralCommission: true, totalReferrals: true,
    } });

    const referrals = (await prisma.referral.findMany({
      where: { referrerId: String(userId) },
      include: {
        referredUserIdRecord: { select: { id: true, name: true, email: true, createdAt: true, avatar: true } },
        firstSubscriptionIdRecord: { include: { planIdRecord: { select: { id: true, name: true } } } },
      }, orderBy: { createdAt: 'desc' },
    })).map((row) => {
      const mapped = withLegacyId(row);
      mapped.referredUserId = withLegacyId(row.referredUserIdRecord);
      mapped.firstSubscriptionId = mapUserSubscription(row.firstSubscriptionIdRecord);
      delete mapped.referredUserIdRecord;
      delete mapped.firstSubscriptionIdRecord;
      return mapped;
    });

    const transactions = withLegacyIds(await prisma.walletTransaction.findMany({
      where: { userId: String(userId) }, orderBy: { createdAt: 'desc' }, take: 20,
    }));

    const commissionSetting = await prisma.adminSetting.findUnique({ where: { key: 'user_referral_commission_percentage' } });
    const currentCommissionRate = Number(commissionSetting?.value) || 40;

    const dynamicTotalCommission = referrals.reduce((sum, r) => {
      if (r.commissionStatus === 'paid' || r.commissionStatus === 'earned') {
        return sum + (r.commissionAmount || 0);
      }
      return sum;
    }, 0);

    const debitTotal = await prisma.walletTransaction.aggregate({
      where: { userId: String(userId), direction: 'debit' }, _sum: { amount: true },
    });
    const totalWithdrawn = Number(debitTotal._sum.amount || 0);
    const dynamicWalletBalance = Math.max(0, dynamicTotalCommission - totalWithdrawn);

    res.json({
      user: {
        referralCode: user.referralCode,
        referralWalletBalance: dynamicWalletBalance,
        totalReferralCommission: dynamicTotalCommission,
        totalReferrals: referrals.length,
        referralLink: `${process.env.FRONTEND_URL || 'https://www.lucohire.com'}/signup?ref=${user.referralCode}`,
      },
      commissionRate: currentCommissionRate,
      referrals,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const crypto = require('crypto');
const { createProviderProfile } = require('../services/providerProfilePersistenceService');
const { createRecruiterProfile } = require('../services/recruiterCompanyPersistenceService');
const { createUser } = require('../services/authPersistenceService');
const { sendMail } = require('../services/mailService');

//Manually invite and create a new user (provider or recruiter)
//and send them an email with an auto-login payment link.

const createUserReferral = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const countryCode = req.body.countryCode || '';
    const nationalNumber = req.body.nationalNumber || '';
    let phone = req.body.phone || '';

    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required' });
    }

    if (!['provider', 'recruiter'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (countryCode && nationalNumber) {
      const { isValidPhoneNumber } = require('../utils/phoneValidation');
      if (!isValidPhoneNumber(countryCode, nationalNumber)) {
        return res.status(400).json({ message: `Please enter a valid phone number for country code ${countryCode}.` });
      }
      phone = countryCode + nationalNumber;
    } else if (phone) {
      const { parsePhoneString, isValidPhoneNumber } = require('../utils/phoneValidation');
      const parsed = parsePhoneString(phone);
      if (parsed.countryCode && !isValidPhoneNumber(parsed.countryCode, parsed.nationalNumber)) {
        return res.status(400).json({ message: 'Please enter a valid phone number.' });
      }
      phone = parsed.fullPhone;
    }

    const referrer = withLegacyId(await prisma.user.findUnique({
      where: { id: String(req.user._id) },
      select: { id: true, name: true, referralCode: true },
    }));
    if (!referrer) return res.status(404).json({ message: 'Referrer not found' });
    
    // Generate secure random password
    const password = crypto.randomBytes(6).toString('base64url');

    const { parsePhoneString } = require('../utils/phoneValidation');
    const parsedPhone = parsePhoneString(phone);

    const newUser = await createUser({
      name,
      email: normalizedEmail,
      phone: parsedPhone.fullPhone || phone || '',
      countryCode: parsedPhone.countryCode || '',
      nationalNumber: parsedPhone.nationalNumber || '',
      fullPhone: parsedPhone.fullPhone || phone || '',
      password,
      roles: [role],
      activeRole: role,
      role,
      authProvider: 'email',
      isEmailVerified: true,
      termsAccepted: true,
      referralCodeUsed: referrer.referralCode,
      source: 'referral_link',
      referredBy: referrer._id,
    });

    if (role === 'provider') {
      await createProviderProfile({
        user: newUser._id, 
        city: '', 
        profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
      });
    } else {
      await createRecruiterProfile({
        user: newUser._id,
        freeViewResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        freeUnlockResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        unlocksRemaining: 2,
        unlockPackSize: 2,
        profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    }

    // Fetch dynamic commission rate or default to 40%
    const setting = await prisma.adminSetting.findUnique({ where: { key: 'user_referral_commission_percentage' } });
    const dynamicCommissionRate = Number(setting?.value) || 40;

    // Track the referral
    const referral = withLegacyId(await prisma.referral.create({ data: {
      referrerId: String(referrer._id),
      referrerType: 'user',
      referredUserId: String(newUser._id),
      referredRole: role,
      referralCode: referrer.referralCode,
      registrationSource: 'user_link',
      status: 'registered',
      commissionRate: dynamicCommissionRate, 
    } }));

    // Increment referrer's totalReferrals counter
    await prisma.user.update({
      where: { id: String(referrer._id) },
      data: { totalReferrals: { increment: 1 } },
    });

    // Build Login Link
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
    const loginLink = `${frontendUrl}/login`;

    // Send Email
    const subject = 'You have been invited to ServiceHub!';
    const html = `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #6D28D9;">Welcome to ServiceHub, ${name}!</h2>
        <p><strong>ServiceHub</strong> is a premium platform connecting top service providers with clients and recruiters seamlessly.</p>
        <p>You have been personally invited to join by <strong>${referrer.name || 'a member'}</strong>. Your profile has been automatically created!</p>
        
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="font-size: 16px; margin-top: 0;"><strong>Your Login Credentials:</strong></p>
          <p style="font-size: 15px; margin: 5px 0;">Email: <strong style="color: #6D28D9;">${normalizedEmail}</strong></p>
          <p style="font-size: 15px; margin: 5px 0;">Password: <strong style="color: #6D28D9;">${password}</strong></p>
          <p style="font-size: 12px; color: #666; margin-bottom: 0; margin-top: 10px;">Please change your password after logging in.</p>
        </div>

        <p>To activate your account and start getting hired, please log in and select a subscription plan:</p>
        <p style="margin: 30px 0; text-align: center;">
          <a href="${loginLink}" style="background-color: #6D28D9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Log In & View Plans
          </a>
        </p>
        <p style="font-size: 13px; color: #555;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 13px; word-break: break-all; color: #6D28D9;">${loginLink}</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #666; margin: 0;">Thanks,<br/><strong>ServiceHub Team</strong></p>
      </div>
    `;

    try {
      await sendMail({ to: normalizedEmail, subject, html });
    } catch (emailErr) {
      console.error('Failed to send invite email:', emailErr);
    }

    res.status(201).json({
      message: 'User invited successfully. An email has been sent.',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.activeRole,
      },
      referral
    });

  } catch (error) {
    console.error('createUserReferral error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getMyReferralStats,
  createUserReferral,
};
