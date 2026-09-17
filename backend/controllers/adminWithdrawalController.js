const { getPrismaClient, withPrismaTransaction } = require('../repositories/prismaContext');
const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { getActiveBillingRule } = require('../utils/billingRuleUtils');
const { createNotification } = require('../services/notificationService');

// Get all withdrawals with filters (status, date, search by name/email)
const getAllWithdrawals = async (req, res) => {
  try {
    const { status, startDate, endDate, search } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.gte = new Date(startDate);
      if (endDate) query.createdAt.lte = new Date(endDate);
    }

    if (search) query.userIdRecord = { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ] };
    const withdrawals = withLegacyIds(await prisma.providerWithdrawal.findMany({
      where: query,
      include: { userIdRecord: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    })).map((row) => {
      row.userId = withLegacyId(row.userIdRecord);
      delete row.userIdRecord;
      return row;
    });

    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Withdrawal status (pending -> approved -> paid OR pending -> rejected)
const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId, adminNotes } = req.body;
    const transactionResult = await withPrismaTransaction(async () => {
    const tx = getPrismaClient();

    if (!['approved', 'rejected', 'paid'].includes(status)) {
      res.status(400).json({ message: 'Invalid target status' });
      return null;
    }

    let withdrawal = withLegacyId(await tx.providerWithdrawal.findUnique({ where: { id: String(id) } }));
    if (!withdrawal) {
      res.status(404).json({ message: 'Withdrawal request not found' });
      return null;
    }

    if (withdrawal.status === 'paid' || withdrawal.status === 'rejected') {
      res.status(400).json({ message: `Cannot modify a request that is already ${withdrawal.status}` });
      return null;
    }

    // Status logic validation
    if (status === 'approved' && withdrawal.status !== 'pending') {
      res.status(400).json({ message: 'Only pending requests can be approved' });
      return null;
    }
    if (status === 'paid' && withdrawal.status !== 'approved') {
      res.status(400).json({ message: 'Only approved requests can be marked as paid' });
      return null;
    }
    if (status === 'paid' && !transactionId) {
      res.status(400).json({ message: 'Transaction ID is mandatory when marking as paid' });
      return null;
    }

    // Get provider wallet
    const wallet = await tx.providerWallet.findUnique({ where: { userId: withdrawal.userId } });
    if (!wallet) {
      res.status(404).json({ message: 'Provider wallet not found' });
      return null;
    }

    const amount = withdrawal.amount;

    if (status === 'approved') {
      withdrawal = withLegacyId(await tx.providerWithdrawal.update({ where: { id: withdrawal._id }, data: {
        status: 'approved', adminNotes: adminNotes || withdrawal.adminNotes,
        processedAt: new Date(), processedBy: String(req.user._id),
      } }));

      // Update transactions
      await tx.providerWalletTransaction.updateMany({
        where: { referenceId: withdrawal._id, type: 'withdrawal' },
        data: { status: 'pending', description: 'Withdrawal request approved (Pending manual payout mark)' },
      });

    } else if (status === 'paid') {
      // Deduct from pendingBalance, increment withdrawnAmount
      await tx.providerWallet.update({ where: { id: wallet.id }, data: {
        pendingBalance: Math.max(0, Math.round((wallet.pendingBalance - amount) * 100) / 100),
        withdrawnAmount: Math.round((wallet.withdrawnAmount + amount) * 100) / 100,
      } });

      withdrawal = withLegacyId(await tx.providerWithdrawal.update({ where: { id: withdrawal._id }, data: {
        status: 'paid', transactionId, adminNotes: adminNotes || withdrawal.adminNotes,
        processedAt: new Date(), processedBy: String(req.user._id),
      } }));

      // Mark transaction ledger as debited
      await tx.providerWalletTransaction.updateMany({
        where: { referenceId: withdrawal._id, type: 'withdrawal' },
        data: { status: 'debited', description: `Withdrawal completed. Paid via ${withdrawal.payoutMethodSnapshot?.type?.toUpperCase()}. Txn ID: ${transactionId}` },
      });

    } else if (status === 'rejected') {
      // Revert pending balance back to available balance
      await tx.providerWallet.update({ where: { id: wallet.id }, data: {
        pendingBalance: Math.max(0, Math.round((wallet.pendingBalance - amount) * 100) / 100),
        availableBalance: Math.round((wallet.availableBalance + amount) * 100) / 100,
      } });

      withdrawal = withLegacyId(await tx.providerWithdrawal.update({ where: { id: withdrawal._id }, data: {
        status: 'rejected', adminNotes: adminNotes || withdrawal.adminNotes,
        processedAt: new Date(), processedBy: String(req.user._id),
      } }));

      // Mark transaction ledger as failed/cancelled
      await tx.providerWalletTransaction.updateMany({
        where: { referenceId: withdrawal._id, type: 'withdrawal' },
        data: { status: 'failed', description: `Withdrawal request rejected by Admin. Reason: ${adminNotes || 'None'}` },
      });
    }

    return { withdrawal, amount };
    });

    if (!transactionResult) return;
    const { withdrawal, amount } = transactionResult;

    // Send status notification to provider
    try {
      let notifTitle = 'Withdrawal Status Update';
      let notifMsg = `Your withdrawal request of ₹${amount} is now ${status}.`;
      if (status === 'paid') {
        notifTitle = 'Withdrawal Successful';
        notifMsg = `Your withdrawal request of ₹${amount} has been successfully paid. Txn ID: ${transactionId}`;
      } else if (status === 'rejected') {
        notifTitle = 'Withdrawal Rejected';
        notifMsg = `Your withdrawal request of ₹${amount} has been rejected. Reason: ${adminNotes || 'Contact Support'}`;
      } else if (status === 'approved') {
        notifTitle = 'Withdrawal Approved';
        notifMsg = `Your withdrawal request of ₹${amount} has been approved. Payment will be processed shortly.`;
      }

      await createNotification({
        userId: withdrawal.userId,
        type: `WITHDRAWAL_${status.toUpperCase()}`,
        title: notifTitle,
        message: notifMsg
      });
    } catch (notifErr) {
      console.error('Failed to send status update notification:', notifErr.message);
    }

    res.json({
      success: true,
      message: `Withdrawal status successfully updated to ${status}`,
      withdrawal
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get platform commission & withdrawal configs
const getCommissionSettings = async (req, res) => {
  try {
    const activeRule = await getActiveBillingRule();
    res.json({
      platformCommissionPercentage: activeRule.platformCommissionPercentage,
      minWithdrawalAmount: activeRule.minPayoutThreshold,
      fixedWithdrawalFee: activeRule.fixedWithdrawalFee,
      userReferralCommissionPercentage: activeRule.legacyUserReferralCommissionPercentage ?? (activeRule.referralEnabled ? activeRule.referralCommissionValue : 0),
      countryGst: activeRule.countryGst || [],
      activeRule
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update platform commission & withdrawal configs
const updateCommissionSettings = async (req, res) => {
  try {
    const newRule = await withPrismaTransaction(async () => {
    const {
      platformCommissionPercentage,
      referralEnabled,
      referralCommissionType,
      referralCommissionValue,
      referralMaxCap,
      cashbackEnabled,
      cashbackType,
      cashbackValue,
      cashbackMaxCap,
      cashbackMinTransactionAmount,
      minPayoutThreshold,
      fixedWithdrawalFee,
      changeReason,
      countryGst
    } = req.body;

    const tx = getPrismaClient();
    const currentRule = await tx.billingRule.findFirst({ where: { isActive: true }, orderBy: { version: 'desc' } });
    let nextVersion = 1;

    if (currentRule) {
      nextVersion = currentRule.version + 1;
      await tx.billingRule.update({ where: { id: currentRule.id }, data: { isActive: false } });
    }

    const newPlatformComm = platformCommissionPercentage !== undefined ? Number(platformCommissionPercentage) : (currentRule?.platformCommissionPercentage ?? 30);
    const newMinPayout = minPayoutThreshold !== undefined ? Number(minPayoutThreshold) : (currentRule?.minPayoutThreshold ?? 500);
    const newFixedFee = fixedWithdrawalFee !== undefined ? Number(fixedWithdrawalFee) : (currentRule?.fixedWithdrawalFee ?? 0);
    
    const refEnabled = referralEnabled !== undefined ? Boolean(referralEnabled) : (currentRule?.referralEnabled ?? false);
    const refVal = referralCommissionValue !== undefined ? Number(referralCommissionValue) : (currentRule?.referralCommissionValue ?? 0);
    const refType = referralCommissionType !== undefined ? referralCommissionType : (currentRule?.referralCommissionType ?? 'percentage');
    const newLegacyReferral = (refEnabled && refType === 'percentage') ? refVal : 0;

    const newCountryGst = countryGst !== undefined ? countryGst : (currentRule?.countryGst || []);
    let validatedCountryGst = [];
    if (Array.isArray(newCountryGst)) {
      const seenCountries = new Set();
      validatedCountryGst = newCountryGst
        .map(item => ({
          country: String(item.country || '').trim().toUpperCase(),
          gstPercent: Number(item.gstPercent)
        }))
        .filter(item => {
          if (!item.country || isNaN(item.gstPercent) || item.gstPercent < 0 || item.gstPercent > 100) return false;
          if (seenCountries.has(item.country)) return false;
          seenCountries.add(item.country);
          return true;
        });
    }

    const rule = await tx.billingRule.create({ data: {
      platformCommissionPercentage: newPlatformComm,
      referralEnabled: refEnabled,
      referralCommissionType: refType,
      referralCommissionValue: refVal,
      referralMaxCap: referralMaxCap !== undefined ? Number(referralMaxCap) : (currentRule?.referralMaxCap ?? 0),
      cashbackEnabled: cashbackEnabled !== undefined ? Boolean(cashbackEnabled) : (currentRule?.cashbackEnabled ?? false),
      cashbackType: cashbackType !== undefined ? cashbackType : (currentRule?.cashbackType ?? 'percentage'),
      cashbackValue: cashbackValue !== undefined ? Number(cashbackValue) : (currentRule?.cashbackValue ?? 0),
      cashbackMaxCap: cashbackMaxCap !== undefined ? Number(cashbackMaxCap) : (currentRule?.cashbackMaxCap ?? 0),
      cashbackMinTransactionAmount: cashbackMinTransactionAmount !== undefined ? Number(cashbackMinTransactionAmount) : (currentRule?.cashbackMinTransactionAmount ?? 0),
      minPayoutThreshold: newMinPayout,
      fixedWithdrawalFee: newFixedFee,
      countryGst: validatedCountryGst,
      version: nextVersion,
      isActive: true,
      updatedBy: req.user?._id ? String(req.user._id) : null,
      changeReason: changeReason || '',
      legacyUserReferralCommissionPercentage: newLegacyReferral
    } });

    // Sync legacy settings
    for (const [key, value] of [
      ['platform_commission_percentage', newPlatformComm],
      ['min_withdrawal_amount', newMinPayout],
      ['fixed_withdrawal_fee', newFixedFee],
    ]) {
      await tx.adminCommissionSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    await tx.adminSetting.upsert({
      where: { key: 'user_referral_commission_percentage' },
      create: { key: 'user_referral_commission_percentage', value: newLegacyReferral, description: 'User referral commission percentage on plan purchases', category: 'referral' },
      update: { value: newLegacyReferral },
    });

    // Audit Event log
    await tx.auditEvent.create({ data: {
      eventType: 'billing_rule_updated',
      actorId: req.user?._id || null,
      actorRole: req.user?.role || 'admin',
      entityType: 'BillingRule',
      entityId: rule.id,
      payload: {
        version: rule.version,
        changeReason: rule.changeReason,
        previousRuleId: currentRule?.id || null
      },
      piiSafe: true
    } });

    return withLegacyId(rule);
    });

    res.json({
      success: true,
      message: 'Billing settings updated successfully',
      rule: newRule
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get version history of billing rules
const getBillingRuleHistory = async (req, res) => {
  try {
    const history = await prisma.billingRule.findMany({
      include: { updatedByRecord: { select: { id: true, name: true, email: true } } },
      orderBy: { version: 'desc' }, take: 20,
    });
    res.json(withLegacyIds(history).map((row) => {
      row.updatedBy = withLegacyId(row.updatedByRecord);
      delete row.updatedByRecord;
      return row;
    }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllWithdrawals,
  updateWithdrawalStatus,
  getCommissionSettings,
  updateCommissionSettings,
  getBillingRuleHistory
};
