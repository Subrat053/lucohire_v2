const crypto = require('crypto');
const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { findPlanById } = require('../services/billingPersistenceService');
const { maskAccountNumber } = require('../utils/maskBankAccount');
const { createProviderProfile } = require('../services/providerProfilePersistenceService');
const { createRecruiterProfile } = require('../services/recruiterCompanyPersistenceService');
const { createUser } = require('../services/authPersistenceService');
const { sendMail } = require('../services/mailService');

const DEFAULT_COMMISSION_RATE = 40;

const roundMoney = (value) => Math.max(0, Math.round((Number(value) || 0) * 100) / 100);

const getFrontendUrl = (req) => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-frontend-host'] || req.headers.host;
    return `${protocol}://${host}`;
  }
  return 'http://localhost:5173';
};

const buildReferralLink = (req, code) => `${getFrontendUrl(req)}/signup?ref=${encodeURIComponent(code)}`;

const buildPaymentLink = (req, userId, referralCode) =>
  `${getFrontendUrl(req)}/plans?userId=${encodeURIComponent(userId)}&ref=${encodeURIComponent(referralCode || '')}`;

const mapReferral = (row) => {
  if (!row) return row;
  const mapped = withLegacyId(row);
  if (row.referredUserIdRecord !== undefined) mapped.referredUserId = withLegacyId(row.referredUserIdRecord);
  if (row.selectedPlanIdRecord !== undefined) mapped.selectedPlanId = withLegacyId(row.selectedPlanIdRecord);
  delete mapped.referredUserIdRecord;
  delete mapped.selectedPlanIdRecord;
  return mapped;
};

const generateReferralCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `SH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const existing = await prisma.partnerProfile.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  return `SH-${Date.now()}`;
};

const resolveDefaultCommissionRate = async () => {
  const setting = await prisma.adminSetting.findUnique({ where: { key: 'default_partner_commission_rate' } });
  const value = Number(setting?.value);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_COMMISSION_RATE;
};

const ensurePartnerProfile = async (userId, req) => {
  let profile = withLegacyId(await prisma.partnerProfile.findUnique({ where: { userId: String(userId) } }));
  if (profile) return profile;

  const referralCode = await generateReferralCode();
  const commissionRate = await resolveDefaultCommissionRate();
  profile = withLegacyId(await prisma.partnerProfile.create({ data: {
    userId: String(userId),
    referralCode,
    referralLink: buildReferralLink(req, referralCode),
    commissionRate,
    createdBy: String(userId),
    createdByModel: 'User',
  } }));
  return profile;
};

const sendPaymentLinkEmail = async ({ email, name, link }) => {
  const safeName = name || 'there';
  const subject = 'Complete your ServiceHub subscription';
  const text = `Hi ${safeName},\n\nYour ServiceHub profile has been created. Please complete your first subscription using this payment link:\n${link}\n\nThanks,\nServiceHub Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <p>Hi ${safeName},</p>
      <p>Your ServiceHub profile has been created. Please complete your first subscription using this payment link:</p>
      <p><a href="${link}" style="color: #6D28D9; font-weight: 600;">Complete subscription</a></p>
      <p>If the button does not work, copy this link:</p>
      <p style="word-break: break-all;">${link}</p>
      <p>Thanks,<br/>ServiceHub Team</p>
    </div>
  `;
  await sendMail({ to: email, subject, text, html });
};

const getPartnerDashboard = async (req, res) => {
  try {
    const partnerProfile = await ensurePartnerProfile(req.user._id, req);
    if (!partnerProfile) {
      return res.status(404).json({ message: 'Partner profile not found' });
    }

    const [totalReferrals, activeReferrals, pendingReferrals, inactiveReferrals, latestReferrals] = await Promise.all([
      prisma.referral.count({ where: { referrerId: String(req.user._id) } }),
      prisma.referral.count({ where: { referrerId: String(req.user._id), status: 'active' } }),
      prisma.referral.count({ where: { referrerId: String(req.user._id), status: 'registered' } }),
      prisma.referral.count({ where: { referrerId: String(req.user._id), status: 'inactive' } }),
      prisma.referral.findMany({
        where: { referrerId: String(req.user._id) },
        include: {
          referredUserIdRecord: { select: { id: true, name: true, email: true, phone: true } },
          selectedPlanIdRecord: { select: { id: true, name: true, price: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }).then((rows) => rows.map(mapReferral)),
    ]);

    const tierTargets = {
      Bronze: 500,
      Silver: 2500,
      Gold: 7500,
      Platinum: 15000,
    };
    const currentTier = partnerProfile.tier || 'Gold';
    const nextTierTarget = tierTargets[currentTier] || 0;
    const progress = nextTierTarget > 0
      ? Math.min(100, Math.round((partnerProfile.totalRevenueCollected / nextTierTarget) * 100))
      : 100;

    res.json({
      success: true,
      data: {
        partner: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          referralCode: partnerProfile.referralCode,
          referralLink: buildReferralLink(req, partnerProfile.referralCode),
          commissionRate: partnerProfile.commissionRate,
          tier: partnerProfile.tier,
          level: partnerProfile.level,
        },
        stats: {
          totalRevenueCollected: partnerProfile.totalRevenueCollected,
          totalCommissionEarned: partnerProfile.totalCommissionEarned,
          availableCommission: partnerProfile.availableCommission,
          totalReferrals,
          activeReferrals,
          pendingReferrals,
          inactiveReferrals,
          referralCandidates: pendingReferrals,
        },
        tier: {
          name: currentTier,
          level: partnerProfile.level,
          progress,
          nextTierTarget,
          rank: currentTier,
          streak: 0,
          bonus: 0,
        },
        referrals: latestReferrals,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyReferralLink = async (req, res) => {
  try {
    const partnerProfile = await ensurePartnerProfile(req.user._id, req);
    res.json({
      referralCode: partnerProfile.referralCode,
      referralLink: buildReferralLink(req, partnerProfile.referralCode),
      commissionRate: partnerProfile.commissionRate,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyReferrals = async (req, res) => {
  try {
    const { status, role } = req.query || {};
    const filter = { referrerId: String(req.user._id) };
    if (status) filter.status = status;
    if (role) filter.referredRole = role;

    const referrals = (await prisma.referral.findMany({
      where: filter,
      include: {
        referredUserIdRecord: { select: { id: true, name: true, email: true, phone: true } },
        selectedPlanIdRecord: { select: { id: true, name: true, price: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    })).map(mapReferral);

    res.json({ referrals });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createReferredUser = async (req, res, role) => {
  const { name, email, selectedPlanId } = req.body || {};
  const countryCode = req.body.countryCode || '';
  const nationalNumber = req.body.nationalNumber || '';
  let phone = req.body.phone || '';

  if (!name || !email) {
    return res.status(400).json({ message: 'name and email are required' });
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

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existing) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const partnerProfile = await ensurePartnerProfile(req.user._id, req);
  if (partnerProfile.status !== 'active') {
    return res.status(403).json({ message: 'Partner account is not active' });
  }

  const password = crypto.randomBytes(6).toString('base64url');
  
  const { parsePhoneString } = require('../utils/phoneValidation');
  const parsedPhone = parsePhoneString(phone);

  const user = await createUser({
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
    referralCodeUsed: partnerProfile.referralCode,
    source: 'partner',
    referredByPartnerId: req.user._id,
    createdByPartnerId: req.user._id,
  });

  if (role === 'provider') {
    await createProviderProfile({ user: user._id, city: '', profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
  } else {
    await createRecruiterProfile({
      user: user._id,
      freeViewResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      freeUnlockResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      unlocksRemaining: 2,
      unlockPackSize: 2,
      profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  }

  let selectedPlan = null;
  if (selectedPlanId) {
    selectedPlan = await findPlanById(selectedPlanId);
  }

  const referral = withLegacyId(await prisma.referral.create({ data: {
    referrerId: String(req.user._id),
    referrerType: 'partner',
    partnerProfileId: String(partnerProfile._id),
    referredUserId: String(user._id),
    referredRole: role,
    referralCode: partnerProfile.referralCode,
    registrationSource: 'partner_dashboard',
    status: 'registered',
    selectedPlanId: selectedPlan?._id ? String(selectedPlan._id) : null,
    commissionRate: partnerProfile.commissionRate,
  } }));

  const paymentLink = buildPaymentLink(req, user._id, partnerProfile.referralCode);
  try {
    await sendPaymentLinkEmail({ email: normalizedEmail, name, link: paymentLink });
  } catch (emailError) {
    console.error('[partnerController] Failed to send payment link email:', emailError.message);
  }

  return res.status(201).json({
    message: 'Referral created successfully',
    user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.activeRole },
    referral,
    paymentLink,
    password,
  });
};

const createProviderByPartner = async (req, res) => {
  try {
    return await createReferredUser(req, res, 'provider');
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createRecruiterByPartner = async (req, res) => {
  try {
    return await createReferredUser(req, res, 'recruiter');
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const requestPayout = async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body || {};
    const numericAmount = Number(amount || 0);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const partnerProfile = await ensurePartnerProfile(req.user._id, req);
    if (partnerProfile.availableCommission < numericAmount) {
      return res.status(400).json({ message: 'Insufficient available commission' });
    }

    const bankAccount = withLegacyId(await prisma.partnerBankAccount.findUnique({ where: { partnerId: String(req.user._id) } }));

    if (!bankAccount) {
      return res.status(400).json({
        message: "Please add your bank account details before requesting withdrawal."
      });
    }

    if (bankAccount.verificationStatus !== "approved") {
      return res.status(400).json({
        message: `Your bank account verification is ${bankAccount.verificationStatus}. You can request withdrawal after approval.`
      });
    }

    partnerProfile.availableCommission = roundMoney(partnerProfile.availableCommission - numericAmount);
    partnerProfile.pendingPayout = roundMoney(partnerProfile.pendingPayout + numericAmount);
    await prisma.partnerProfile.update({ where: { id: partnerProfile._id }, data: {
      availableCommission: partnerProfile.availableCommission, pendingPayout: partnerProfile.pendingPayout,
    } });

    const payout = withLegacyId(await prisma.payoutRequest.create({ data: {
      partnerId: String(req.user._id),
      partnerProfileId: String(partnerProfile._id),
      amount: numericAmount,
      paymentMethod: 'Bank Transfer',
      paymentDetails: {
        bankAccountId: bankAccount._id,
        accountHolderName: bankAccount.accountHolderName,
        bankName: bankAccount.bankName,
        maskedAccountNumber: maskAccountNumber(bankAccount.accountNumber),
        ifscCode: bankAccount.ifscCode,
        upiId: bankAccount.upiId || ''
      },
      status: 'pending',
      requestedAt: new Date(),
    } }));

    res.status(201).json({ message: 'Payout request submitted', payout });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyPayouts = async (req, res) => {
  try {
    const payouts = withLegacyIds(await prisma.payoutRequest.findMany({
      where: { partnerId: String(req.user._id) }, orderBy: { createdAt: 'desc' },
    }));
    res.json({ payouts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getPartnerDashboard,
  getMyReferralLink,
  getMyReferrals,
  createProviderByPartner,
  createRecruiterByPartner,
  requestPayout,
  getMyPayouts,
};
