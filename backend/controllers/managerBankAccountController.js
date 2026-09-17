const asyncHandler = require("../utils/asyncHandler");
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { maskAccountNumber } = require("../utils/maskBankAccount");

// @desc    Get logged-in manager's bank account
// @route   GET /api/v1/manager/bank-account
// @access  Private/Manager
exports.getMyBankAccount = asyncHandler(async (req, res) => {
  const bankAccount = withLegacyId(await prisma.partnerBankAccount.findUnique({ where: { partnerId: String(req.user._id) } }));

  if (!bankAccount) {
    return res.status(200).json({
      success: true,
      message: "No bank account found",
      data: null
    });
  }

  // Clone and mask for standard view
  const responseData = { ...bankAccount };
  responseData.fullAccountNumber = responseData.accountNumber; // For edit form
  responseData.accountNumber = maskAccountNumber(responseData.accountNumber);

  res.status(200).json({
    success: true,
    data: responseData
  });
});

// @desc    Create bank account
// @route   POST /api/v1/manager/bank-account
// @access  Private/Manager
exports.createMyBankAccount = asyncHandler(async (req, res) => {
  const {
    accountHolderName,
    bankName,
    accountNumber,
    confirmAccountNumber,
    ifscCode,
    branchName,
    accountType,
    upiId
  } = req.body;

  // Basic validation
  if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
    return res.status(400).json({ success: false, message: "Please provide all required fields" });
  }

  if (accountNumber !== confirmAccountNumber) {
    return res.status(400).json({ success: false, message: "Account numbers do not match" });
  }

  // Regex validation
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(ifscCode)) {
    return res.status(400).json({ success: false, message: "Invalid IFSC code format" });
  }

  if (upiId) {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(upiId)) {
      return res.status(400).json({ success: false, message: "Invalid UPI ID format" });
    }
  }

  const existingAccount = await prisma.partnerBankAccount.findUnique({ where: { partnerId: String(req.user._id) }, select: { id: true } });
  if (existingAccount) {
    return res.status(400).json({ success: false, message: "Bank account already exists. Please update it instead." });
  }

  const bankAccount = withLegacyId(await prisma.partnerBankAccount.create({ data: {
    partnerId: String(req.user._id),
    accountHolderName,
    bankName,
    accountNumber,
    ifscCode,
    branchName,
    accountType,
    upiId,
    verificationStatus: "pending",
    isVerified: false
  } }));

  res.status(201).json({
    success: true,
    message: "Bank account details submitted for verification",
    data: bankAccount
  });
});

// @desc    Update bank account
// @route   PUT /api/v1/manager/bank-account
// @access  Private/Manager
exports.updateMyBankAccount = asyncHandler(async (req, res) => {
  const {
    accountHolderName,
    bankName,
    accountNumber,
    confirmAccountNumber,
    ifscCode,
    branchName,
    accountType,
    upiId
  } = req.body;

  let bankAccount = withLegacyId(await prisma.partnerBankAccount.findUnique({ where: { partnerId: String(req.user._id) } }));

  if (!bankAccount) {
    return res.status(404).json({ success: false, message: "Bank account not found" });
  }

  // Check if account number is being changed
  if (accountNumber && accountNumber !== bankAccount.accountNumber) {
    if (accountNumber !== confirmAccountNumber) {
      return res.status(400).json({ success: false, message: "Account numbers do not match" });
    }
    bankAccount.accountNumber = accountNumber;
  }

  if (ifscCode) {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode)) {
      return res.status(400).json({ success: false, message: "Invalid IFSC code format" });
    }
    bankAccount.ifscCode = ifscCode;
  }

  if (upiId) {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(upiId)) {
      return res.status(400).json({ success: false, message: "Invalid UPI ID format" });
    }
    bankAccount.upiId = upiId;
  }

  bankAccount.accountHolderName = accountHolderName || bankAccount.accountHolderName;
  bankAccount.bankName = bankName || bankAccount.bankName;
  bankAccount.branchName = branchName || bankAccount.branchName;
  bankAccount.accountType = accountType || bankAccount.accountType;

  // Reset verification status on update
  bankAccount.verificationStatus = "pending";
  bankAccount.isVerified = false;
  bankAccount.rejectionReason = "";

  bankAccount = withLegacyId(await prisma.partnerBankAccount.update({
    where: { id: bankAccount._id },
    data: {
      accountNumber: bankAccount.accountNumber,
      ifscCode: bankAccount.ifscCode,
      upiId: bankAccount.upiId,
      accountHolderName: bankAccount.accountHolderName,
      bankName: bankAccount.bankName,
      branchName: bankAccount.branchName,
      accountType: bankAccount.accountType,
      verificationStatus: bankAccount.verificationStatus,
      isVerified: bankAccount.isVerified,
      rejectionReason: bankAccount.rejectionReason,
    },
  }));

  res.status(200).json({
    success: true,
    message: "Bank account updated and resubmitted for verification",
    data: bankAccount
  });
});

// @desc    Delete bank account
// @route   DELETE /api/v1/manager/bank-account
// @access  Private/Manager
exports.deleteMyBankAccount = asyncHandler(async (req, res) => {
  const bankAccount = withLegacyId(await prisma.partnerBankAccount.findUnique({ where: { partnerId: String(req.user._id) } }));

  if (!bankAccount) {
    return res.status(404).json({ success: false, message: "Bank account not found" });
  }

  // Check for pending payout requests
  const pendingPayout = await prisma.payoutRequest.findFirst({
    where: { partnerId: String(req.user._id), status: 'pending' },
  });

  if (pendingPayout) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete bank account while a payout request is pending."
    });
  }

  await prisma.partnerBankAccount.delete({ where: { id: bankAccount._id } });

  res.status(200).json({
    success: true,
    message: "Bank account deleted successfully"
  });
});

// ADMIN CONTROLLERS

// @desc    Get all manager bank accounts
// @route   GET /api/v1/admin/manager-bank-accounts
// @access  Private/Admin
exports.getAllManagerBankAccounts = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};

  if (status) {
    filter.verificationStatus = status;
  }

  const bankAccounts = (await prisma.partnerBankAccount.findMany({
    where: filter,
    include: { partnerIdRecord: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  })).map((row) => {
    const mapped = withLegacyId(row);
    mapped.partnerId = withLegacyId(row.partnerIdRecord);
    delete mapped.partnerIdRecord;
    return mapped;
  });

  let results = bankAccounts;
  if (search) {
    const regex = new RegExp(search, "i");
    results = bankAccounts.filter(acc => 
      regex.test(acc.partnerId?.name) || 
      regex.test(acc.partnerId?.email) ||
      regex.test(acc.accountHolderName)
    );
  }

  const maskedResults = results.map(acc => {
    const obj = { ...acc };
    obj.accountNumber = maskAccountNumber(obj.accountNumber);
    return obj;
  });

  res.status(200).json({
    success: true,
    count: maskedResults.length,
    data: maskedResults
  });
});

// @desc    Get bank account by ID
// @route   GET /api/v1/admin/manager-bank-accounts/:id
// @access  Private/Admin
exports.getManagerBankAccountById = asyncHandler(async (req, res) => {
  const row = await prisma.partnerBankAccount.findUnique({
    where: { id: String(req.params.id) },
    include: { partnerIdRecord: { select: { id: true, name: true, email: true, phone: true } } },
  });
  const bankAccount = row ? (() => {
    const mapped = withLegacyId(row);
    mapped.partnerId = withLegacyId(row.partnerIdRecord);
    delete mapped.partnerIdRecord;
    return mapped;
  })() : null;

  if (!bankAccount) {
    return res.status(404).json({ success: false, message: "Bank account not found" });
  }

  res.status(200).json({
    success: true,
    data: bankAccount
  });
});

// @desc    Verify bank account
// @route   PATCH /api/v1/admin/manager-bank-accounts/:id/verify
// @access  Private/Admin
exports.verifyManagerBankAccount = asyncHandler(async (req, res) => {
  const { verificationStatus, rejectionReason } = req.body;

  if (!["approved", "rejected"].includes(verificationStatus)) {
    return res.status(400).json({ success: false, message: "Invalid verification status" });
  }

  if (verificationStatus === "rejected" && !rejectionReason) {
    return res.status(400).json({ success: false, message: "Rejection reason is required" });
  }

  let bankAccount = withLegacyId(await prisma.partnerBankAccount.findUnique({ where: { id: String(req.params.id) } }));

  if (!bankAccount) {
    return res.status(404).json({ success: false, message: "Bank account not found" });
  }

  bankAccount = withLegacyId(await prisma.partnerBankAccount.update({ where: { id: bankAccount._id }, data: {
    verificationStatus,
    isVerified: verificationStatus === "approved",
    rejectionReason: verificationStatus === "rejected" ? rejectionReason : "",
    verifiedAt: new Date(),
    verifiedBy: String(req.user._id),
  } }));

  res.status(200).json({
    success: true,
    message: `Bank account ${verificationStatus} successfully`,
    data: bankAccount
  });
});
