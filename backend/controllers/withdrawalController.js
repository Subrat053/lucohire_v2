const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const mailService = require('../services/mailService');

const updatePaymentMethods = async (req, res) => {
  try {
    const userId = req.user._id;
    const { accountHolderName, accountNumber, upiId, qrCodeUrl } = req.body;

    const user = await prisma.user.findUnique({ where: { id: String(userId) }, select: { bankDetails: true } });
    const bankDetails = { ...(user?.bankDetails || {}) };
    if (accountHolderName !== undefined) bankDetails.accountHolderName = accountHolderName;
    if (accountNumber !== undefined) bankDetails.accountNumber = accountNumber;
    if (upiId !== undefined) bankDetails.upiId = upiId;
    if (qrCodeUrl) bankDetails.qrCodeUrl = qrCodeUrl;
    await prisma.user.updateMany({ where: { id: String(userId) }, data: { bankDetails } });

    res.status(200).json({ message: 'Payment methods updated successfully.' });
  } catch (err) {
    console.error('Update payment methods error:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, method } = req.body;

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0 || !Number.isInteger(amountNum)) {
      return res.status(400).json({ success: false, message: 'Withdrawal amount must be a positive integer.' });
    }

    if (amountNum < 500) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹500.' });
    }

    if (typeof method !== 'string' || !method.trim()) {
      return res.status(400).json({ success: false, message: 'Payment method is required.' });
    }
    const transactionResult = await prisma.$transaction(async (prisma) => {
    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return null;
    }

    // Using referralWalletBalance as per the ReferralManagement context
    if (amountNum > (user.referralWalletBalance || 0)) {
      res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
      return null;
    }

    // Deduct balance
    const deducted = await prisma.user.updateMany({
      where: { id: String(userId), referralWalletBalance: { gte: amountNum } },
      data: { referralWalletBalance: { decrement: amountNum } },
    });
    if (!deducted.count) {
      res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
      return null;
    }
    user.referralWalletBalance -= amountNum;

    // Create withdrawal request
    const withdrawal = withLegacyId(await prisma.withdrawalRequest.create({ data: {
      userId: String(userId),
      amount: amountNum,
      method,
      status: 'pending'
    } }));

    // Create ledger transaction
    await prisma.walletTransaction.create({ data: {
      userId: String(userId),
      type: 'withdrawal_request',
      amount: amountNum,
      direction: 'debit',
      description: `Withdrawal request of ₹${amountNum} initiated (${method.toUpperCase()})`,
      status: 'pending',
      balanceAfter: user.referralWalletBalance
    } });
    return { user, withdrawal };
    });
    if (!transactionResult) return;
    const { user, withdrawal } = transactionResult;

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@lucohire.com';
    const html = `
      <h3>New Withdrawal Request</h3>
      <p>Provider <strong>${user.name || 'Unknown'}</strong> (${user.email}, ${user.phone}) has requested a withdrawal.</p>
      <ul>
        <li><strong>Amount:</strong> ₹${amount}</li>
        <li><strong>Method:</strong> ${method}</li>
        <li><strong>Request ID:</strong> ${withdrawal._id}</li>
      </ul>
      <p>Please check the admin panel to process this payout.</p>
    `;

    try {
      await mailService.sendMail({
        to: adminEmail,
        subject: 'New Withdrawal Request',
        html,
      });
    } catch (emailErr) {
      console.error('Failed to send admin email:', emailErr);
    }

    res.status(201).json({ message: 'Withdrawal request submitted successfully.', request: withdrawal });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = {
  updatePaymentMethods,
  requestWithdrawal
};
