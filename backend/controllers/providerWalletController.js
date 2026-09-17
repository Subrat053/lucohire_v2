const { getPrismaClient, withPrismaTransaction } = require('../repositories/prismaContext');
const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { generateOTP, sendPhoneOTP } = require('../utils/messaging');
const { createNotification } = require('../services/notificationService');
const { verifyFirebaseIdToken } = require('./authController');
const { prepareUserData } = require('../services/authPersistenceService');

// Get wallet dashboard stats and payout methods
const getWallet = async (req, res) => {
  try {
    const wallet = withLegacyId(await prisma.providerWallet.upsert({
      where: { userId: String(req.user._id) },
      create: { userId: String(req.user._id) },
      update: {},
    }));

    // Fetch the User document to get referral wallet balance and bankDetails
    const user = await prisma.user.findUnique({
      where: { id: String(req.user._id) }, select: { referralWalletBalance: true, bankDetails: true, phone: true },
    });
    const referralWalletBalance = user ? user.referralWalletBalance : 0;
    const userBankDetails = user ? user.bankDetails : null;
    const userPhone = user ? user.phone : '';

    const payoutMethods = withLegacyIds(await prisma.payoutMethod.findMany({
      where: { userId: String(req.user._id) },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }));
    const transactions = withLegacyIds(await prisma.providerWalletTransaction.findMany({
      where: { userId: String(req.user._id) }, orderBy: { createdAt: 'desc' }, take: 30,
    }));

    const minSetting = await prisma.adminCommissionSetting.findUnique({ where: { key: 'min_withdrawal_amount' } });
    const minWithdrawalAmount = minSetting ? minSetting.value : 500;

    const feeSetting = await prisma.adminCommissionSetting.findUnique({ where: { key: 'fixed_withdrawal_fee' } });
    const fixedWithdrawalFee = feeSetting ? feeSetting.value : 0;

    res.json({
      wallet: {
        totalEarnings: wallet.totalEarnings,
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        withdrawnAmount: wallet.withdrawnAmount,
        commissionDeducted: wallet.commissionDeducted,
        referralBalance: referralWalletBalance
      },
      payoutMethods: payoutMethods.map(m => {
        // Mask bank account details for added security
        if (m.type === 'bank') {
          return {
            _id: m._id,
            type: m.type,
            isDefault: m.isDefault,
            bankDetails: {
              accountHolderName: m.bankDetails.accountHolderName,
              bankName: m.bankDetails.bankName,
              ifscCode: m.bankDetails.ifscCode,
              accountNumber: m.bankDetails.accountNumber ? `******${m.bankDetails.accountNumber.slice(-4)}` : ''
            }
          };
        }
        return m;
      }),
      transactions,
      config: {
        minWithdrawalAmount,
        fixedWithdrawalFee
      },
      user: {
        bankDetails: userBankDetails,
        phone: userPhone
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send OTP to phone for payout settings save
const sendOtpForPayout = async (req, res) => {
  try {
    const phone = req.user.phone || req.body.phone;
    if (!phone) {
      return res.status(400).json({ message: 'Mobile number is required. Please verify or add one in your Profile first.' });
    }

    const { generateAndSaveOtp } = require('../services/otpService');
    const { sendPhoneOTP } = require('../utils/messaging');

    const { otp, target } = await generateAndSaveOtp({
      userId: req.user._id,
      purpose: 'payment_verification',
      phone,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    await sendPhoneOTP(target, otp);
    res.json({ success: true, message: 'OTP sent successfully to your mobile number' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add or edit payout method
// Helper: verify phone via Firebase token or server-side OTP record
const verifyPhoneForPayout = async ({ firebaseToken, otp, otpPhone, user }) => {
  const normalizePhone = (num) => String(num || '').replace(/\D/g, '');
  if (firebaseToken) {
    const decodedToken = await require('./authController').verifyFirebaseIdToken(firebaseToken);
    const phone = normalizePhone(decodedToken.phoneNumber);
    if (!phone) throw new Error('Phone number not found in token');
    return phone;
  }

  // OTP-based verification (server-side stored OTP)
  if (!otp) throw new Error('OTP is required when Firebase token is not provided');
  const phoneToCheck = normalizePhone(otpPhone || user.phone || '');
  if (!phoneToCheck) throw new Error('Phone number is required for OTP verification');

  const { verifyOtp } = require('../services/otpService');
  const result = await verifyOtp({
    userId: user._id,
    purpose: 'payment_verification',
    target: phoneToCheck,
    otp: String(otp),
  });

  if (!result.success) throw new Error(result.message || 'Invalid or expired OTP');

  return phoneToCheck;
};

const savePayoutMethod = async (req, res) => {
  try {
    const { id, type, bankDetails, upiId, qrCodeImage, providerName, isDefault, firebaseToken, otp, otpPhone } = req.body;

    // Verify phone either via Firebase token or via server-side OTP record
    let phone;
    try {
      phone = await verifyPhoneForPayout({ firebaseToken, otp, otpPhone, user: req.user });
    } catch (tokenErr) {
      return res.status(400).json({ message: 'OTP verification failed: ' + tokenErr.message });
    }

    const normalizePhone = (num) => String(num || '').replace(/\D/g, '');
    const phoneClean = normalizePhone(phone);
    if (!phoneClean) return res.status(400).json({ message: 'Verified phone number is invalid' });

    // Ensure the verified phone matches the user's registered phone (if user has a phone on profile)
    const userPhoneClean = normalizePhone(req.user.phone || '');
    if (userPhoneClean && !(phoneClean.endsWith(userPhoneClean) || userPhoneClean.endsWith(phoneClean))) {
      return res.status(400).json({ message: 'Verified phone does not match registered phone number' });
    }

    // Validations
    if (type === 'upi') {
      if (!upiId) {
        return res.status(400).json({ message: 'UPI ID is required' });
      }
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiRegex.test(upiId)) {
        return res.status(400).json({ message: 'Invalid UPI ID format. E.g. name@bank' });
      }
    } else if (type === 'bank') {
      if (!bankDetails?.accountHolderName || !bankDetails?.bankName || !bankDetails?.accountNumber || !bankDetails?.ifscCode) {
        return res.status(400).json({ message: 'All bank account details are mandatory' });
      }
    } else if (type === 'qr') {
      if (!qrCodeImage) {
        return res.status(400).json({ message: 'QR Image is required' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid payout method type' });
    }

    let payoutMethod;
    const isFirstMethod = (await prisma.payoutMethod.count({ where: { userId: String(req.user._id) } })) === 0;
    const finalIsDefault = isFirstMethod ? true : (isDefault || false);

    if (id) {
      // Edit
      payoutMethod = withLegacyId(await prisma.payoutMethod.findFirst({
        where: { id: String(id), userId: String(req.user._id) },
      }));
      if (!payoutMethod) {
        return res.status(404).json({ message: 'Payout method not found or unauthorized' });
      }

      const updateData = { type };
      if (type === 'bank') {
        Object.assign(updateData, { bankDetails, upiId: '', qrCodeImage: '', providerName: '' });
      } else if (type === 'upi') {
        Object.assign(updateData, { upiId, bankDetails: { accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '' }, qrCodeImage: '', providerName: '' });
      } else if (type === 'qr') {
        Object.assign(updateData, { qrCodeImage, providerName: providerName || '', bankDetails: { accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '' }, upiId: '' });
      }
      
      if (finalIsDefault) {
        updateData.isDefault = true;
        await prisma.payoutMethod.updateMany({ where: { userId: String(req.user._id) }, data: { isDefault: false } });
      } else {
        updateData.isDefault = false;
      }
      payoutMethod = withLegacyId(await prisma.payoutMethod.update({ where: { id: String(id) }, data: updateData }));
    } else {
      // Create new
      if (finalIsDefault) {
        await prisma.payoutMethod.updateMany({ where: { userId: String(req.user._id) }, data: { isDefault: false } });
      }

      payoutMethod = withLegacyId(await prisma.payoutMethod.create({ data: {
        userId: String(req.user._id),
        type,
        bankDetails: type === 'bank' ? bankDetails : undefined,
        upiId: type === 'upi' ? upiId : undefined,
        qrCodeImage: type === 'qr' ? qrCodeImage : undefined,
        providerName: type === 'qr' ? providerName : undefined,
        isDefault: finalIsDefault
      } }));
    }

    const allMethods = withLegacyIds(await prisma.payoutMethod.findMany({
      where: { userId: String(req.user._id) }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }));
    res.json({
      success: true,
      message: 'Payout method saved successfully',
      payoutMethods: allMethods
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set default payout method
const setDefaultPayoutMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const method = withLegacyId(await prisma.payoutMethod.findFirst({
      where: { id: String(id), userId: String(req.user._id) },
    }));
    if (!method) {
      return res.status(404).json({ message: 'Payout method not found' });
    }

    await prisma.payoutMethod.updateMany({ where: { userId: String(req.user._id) }, data: { isDefault: false } });
    await prisma.payoutMethod.update({ where: { id: String(id) }, data: { isDefault: true } });

    const allMethods = withLegacyIds(await prisma.payoutMethod.findMany({
      where: { userId: String(req.user._id) }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }));
    res.json({
      success: true,
      message: 'Default payout method updated',
      payoutMethods: allMethods
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete payout method
const deletePayoutMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const method = withLegacyId(await prisma.payoutMethod.findFirst({
      where: { id: String(id), userId: String(req.user._id) },
    }));
    if (!method) {
      return res.status(404).json({ message: 'Payout method not found' });
    }

    const wasDefault = method.isDefault;
    await prisma.payoutMethod.delete({ where: { id: String(id) } });

    // If we deleted the default, set another one as default
    if (wasDefault) {
      const another = await prisma.payoutMethod.findFirst({ where: { userId: String(req.user._id) } });
      if (another) {
        await prisma.payoutMethod.update({ where: { id: another.id }, data: { isDefault: true } });
      }
    }

    const allMethods = withLegacyIds(await prisma.payoutMethod.findMany({
      where: { userId: String(req.user._id) }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }));
    res.json({
      success: true,
      message: 'Payout method deleted',
      payoutMethods: allMethods
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit Withdrawal Request
const requestWithdrawal = async (req, res) => {
  try {
    const transactionResult = await withPrismaTransaction(async () => {
    const prisma = getPrismaClient();
    const { amount, payoutMethodId, firebaseToken, otp, otpPhone } = req.body;

    // Verify phone via Firebase token or OTP record
    let verifiedPhone;
    try {
      verifiedPhone = await verifyPhoneForPayout({ firebaseToken, otp, otpPhone, user: req.user });
    } catch (tokenErr) {
      res.status(400).json({ message: 'OTP verification failed: ' + tokenErr.message });
      return null;
    }

    // Compare verified phone with authenticated user's registered phone
    const normalizePhone = (num) => String(num || '').replace(/\D/g, '');
    const verifiedPhoneClean = normalizePhone(verifiedPhone);
    const userPhoneClean = normalizePhone(req.user.phone || '');

    if (!userPhoneClean) {
      res.status(400).json({ message: 'No registered phone number found on your profile. Please add one first.' });
      return null;
    }

    const match = verifiedPhoneClean.endsWith(userPhoneClean) || userPhoneClean.endsWith(verifiedPhoneClean);
    if (!match) {
      res.status(400).json({ message: 'OTP verified phone number does not match your profile phone number.' });
      return null;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !Number.isInteger(numericAmount)) {
      res.status(400).json({ message: 'Withdrawal amount must be a positive integer' });
      return null;
    }

    // Minimum limit
    const minSetting = await prisma.adminCommissionSetting.findUnique({ where: { key: 'min_withdrawal_amount' } });
    const minAmount = minSetting ? minSetting.value : 500;
    if (numericAmount < minAmount) {
      res.status(400).json({ message: `Minimum withdrawal amount is ₹${minAmount}` });
      return null;
    }

    // Payout method lookup
    const payoutMethod = withLegacyId(await prisma.payoutMethod.findFirst({
      where: { id: String(payoutMethodId), userId: String(req.user._id) },
    }));
    if (!payoutMethod) {
      res.status(400).json({ message: 'Please select a valid payout method' });
      return null;
    }

    // Wallet balance lookup
    const wallet = withLegacyId(await prisma.providerWallet.findUnique({ where: { userId: String(req.user._id) } }));
    if (!wallet || wallet.availableBalance < numericAmount) {
      res.status(400).json({ message: 'Insufficient available balance' });
      return null;
    }

    // Prevent duplicate withdrawals in the last 15 seconds
    const recentRequest = await prisma.providerWithdrawal.findFirst({ where: {
      userId: String(req.user._id),
      amount: numericAmount,
      createdAt: { gt: new Date(Date.now() - 15000) }
    } });

    if (recentRequest) {
      res.status(429).json({ message: 'Duplicate withdrawal request detected. Please wait a moment.' });
      return null;
    }

    // Create payout method snapshot for billing record longevity
    const snapshot = {
      type: payoutMethod.type,
      upiId: payoutMethod.upiId,
      qrCodeImage: payoutMethod.qrCodeImage,
      providerName: payoutMethod.providerName,
      bankDetails: payoutMethod.bankDetails ? {
        accountHolderName: payoutMethod.bankDetails.accountHolderName,
        bankName: payoutMethod.bankDetails.bankName,
        accountNumber: payoutMethod.bankDetails.accountNumber,
        ifscCode: payoutMethod.bankDetails.ifscCode
      } : undefined
    };

    // Deduct from available, lock inside pendingBalance
    const walletUpdate = await prisma.providerWallet.updateMany({
      where: { id: wallet._id, availableBalance: { gte: numericAmount } },
      data: { availableBalance: { decrement: numericAmount }, pendingBalance: { increment: numericAmount } },
    });
    if (!walletUpdate.count) {
      res.status(400).json({ message: 'Insufficient available balance' });
      return null;
    }
    const updatedWallet = withLegacyId(await prisma.providerWallet.findUnique({ where: { id: wallet._id } }));

    // Create withdrawal request
    const withdrawal = withLegacyId(await prisma.providerWithdrawal.create({ data: {
      userId: String(req.user._id),
      amount: numericAmount,
      payoutMethodId: String(payoutMethodId),
      payoutMethodSnapshot: snapshot,
      status: 'pending'
    } }));

    // Create pending ledger transaction
    await prisma.providerWalletTransaction.create({ data: {
      walletId: updatedWallet._id,
      userId: String(req.user._id),
      type: 'withdrawal',
      amount: numericAmount,
      status: 'pending',
      referenceId: withdrawal._id,
      description: `Withdrawal request of ₹${numericAmount} initiated (${payoutMethod.type.toUpperCase()})`
    } });

    return { withdrawal, numericAmount };
    });

    if (!transactionResult) return;
    const { withdrawal, numericAmount } = transactionResult;

    // Send notifications to admins and user
    try {
      await createNotification({
        userId: req.user._id,
        type: 'WITHDRAWAL_REQUESTED',
        title: 'Withdrawal Requested',
        message: `Your withdrawal request of ₹${numericAmount} has been received and is pending admin approval.`
      });
    } catch (notifErr) {
      console.error('Failed to dispatch notification:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawal
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadQrCode = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { uploadToCloudinary } = require('../utils/cloudinary');
    let newUrl;
    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "servicehub/payouts/qrs",
        public_id: `qr_${req.user._id}_${Date.now()}`,
      });
      newUrl = result.secure_url;
    } catch (cloudErr) {
      return res.status(500).json({ message: "Cloudinary upload failed", error: cloudErr.message });
    }

    res.json({
      success: true,
      url: newUrl,
      message: "QR Code uploaded successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Two-step phone change verification
const initiatePhoneChange = async (req, res) => {
  try {
    const oldPhone = req.user.phone;
    const { newPhone } = req.body;

    if (!newPhone) {
      return res.status(400).json({ message: 'New phone number is required' });
    }

    const cleanNewPhone = String(newPhone).replace(/\D/g, '');
    if (cleanNewPhone.length < 10) {
      return res.status(400).json({ message: 'A valid 10-digit new phone number is required' });
    }

    const existing = await prisma.user.findFirst({
      where: { phone: cleanNewPhone },
      select: { id: true },
    });
    if (existing && String(existing.id) !== String(req.user._id)) {
      return res.status(400).json({ message: 'This phone number is already registered by another account.' });
    }

    const { generateAndSaveOtp } = require('../services/otpService');
    const { sendPhoneOTP } = require('../utils/messaging');

    if (oldPhone && oldPhone.replace(/\D/g, '') !== cleanNewPhone) {
      const { otp, target } = await generateAndSaveOtp({
        userId: req.user._id,
        purpose: 'change_phone',
        phone: oldPhone,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });

      await sendPhoneOTP(target, otp);

      return res.json({
        success: true,
        step: 'verify_old',
        message: 'OTP sent to your registered mobile number to verify your identity.'
      });
    } else {
      const { otp, target } = await generateAndSaveOtp({
        userId: req.user._id,
        purpose: 'change_phone',
        phone: cleanNewPhone,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });

      await sendPhoneOTP(target, otp);

      return res.json({
        success: true,
        step: 'verify_new',
        message: 'OTP sent to your new mobile number to verify and link it.'
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyOldPhoneOTP = async (req, res) => {
  try {
    const oldPhone = req.user.phone;
    const { otp, newPhone } = req.body;

    if (!oldPhone) {
      return res.status(400).json({ message: 'No registered old phone number found.' });
    }
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }
    if (!newPhone) {
      return res.status(400).json({ message: 'New phone number is required' });
    }

    const cleanNewPhone = String(newPhone).replace(/\D/g, '');

    const { verifyOtp, generateAndSaveOtp } = require('../services/otpService');
    const { sendPhoneOTP } = require('../utils/messaging');

    const result = await verifyOtp({
      userId: req.user._id,
      purpose: 'change_phone',
      target: oldPhone,
      otp: String(otp),
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message || 'Invalid or expired OTP code for your old phone number.' });
    }

    const { otp: nextOtp, target: nextTarget } = await generateAndSaveOtp({
      userId: req.user._id,
      purpose: 'change_phone',
      phone: cleanNewPhone,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    await sendPhoneOTP(nextTarget, nextOtp);

    res.json({
      success: true,
      step: 'verify_new',
      message: 'Identity verified. OTP sent to your new mobile number.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyNewPhoneOTP = async (req, res) => {
  try {
    const { otp, newPhone } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }
    if (!newPhone) {
      return res.status(400).json({ message: 'New phone number is required' });
    }

    const cleanNewPhone = String(newPhone).replace(/\D/g, '');

    const { verifyOtp } = require('../services/otpService');
    const result = await verifyOtp({
      userId: req.user._id,
      purpose: 'change_phone',
      target: cleanNewPhone,
      otp: String(otp),
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message || 'Invalid or expired OTP code for your new phone number.' });
    }

    await prisma.user.update({
      where: { id: String(req.user._id) },
      data: await prepareUserData({ phone: cleanNewPhone }),
    });

    res.json({
      success: true,
      message: 'Mobile number updated successfully!',
      phone: cleanNewPhone
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const raiseConcernLostPhone = async (req, res) => {
  try {
    const { message } = req.body;

    const ticket = withLegacyId(await prisma.enquiry.create({
      data: {
        name: req.user.name || 'Provider',
        email: req.user.email,
        phone: req.user.phone || '',
        subject: 'Lost Access to Mobile Number',
        message: message || 'Lost access to registered mobile number. Requesting manual admin review.',
        status: 'new',
      },
    }));

    res.json({
      success: true,
      message: 'Concern ticket logged successfully. ServiceHub admin will review your case.',
      ticketId: ticket._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getWallet,
  sendOtpForPayout,
  savePayoutMethod,
  setDefaultPayoutMethod,
  deletePayoutMethod,
  requestWithdrawal,
  uploadQrCode,
  initiatePhoneChange,
  verifyOldPhoneOTP,
  verifyNewPhoneOTP,
  raiseConcernLostPhone
};
