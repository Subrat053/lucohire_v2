const prisma = require('../config/prisma');
const { withLegacyIds } = require('../utils/prismaResponse');

const getWalletSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch User details for referralWalletBalance and partner commissions
    const user = await prisma.user.findUnique({ where: { id: String(userId) }, select: {
      referralWalletBalance: true, totalReferralCommission: true, commissionBalance: true,
    } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Fetch ProviderWallet details for task earnings
    let providerWallet = await prisma.providerWallet.findUnique({ where: { userId: String(userId) } });
    if (!providerWallet) {
      providerWallet = {
        availableBalance: 0,
        totalEarnings: 0,
        pendingBalance: 0,
        withdrawnAmount: 0,
        commissionDeducted: 0
      };
    }

    // 3. Compute cashbackBalance: Sum of all completed signup_cashback transactions in WalletTransaction
    const cashbackTxns = await prisma.walletTransaction.findMany({ where: {
      userId: String(userId),
      type: 'signup_cashback',
      status: 'credited'
    } });
    const cashbackBalance = cashbackTxns.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // 4. Compute totalCommissionEarned: user.totalReferralCommission + partner total commission
    const partnerTxns = await prisma.commissionTransaction.findMany({
      where: { partnerId: String(userId), status: { not: 'cancelled' } },
    });
    const partnerCommissionEarned = partnerTxns.reduce((sum, tx) => sum + (tx.commissionAmount || 0), 0);
    const totalCommissionEarned = (user.totalReferralCommission || 0) + partnerCommissionEarned;

    // 5. Compute totalWithdrawn: provider withdrawnAmount + successful processed user WithdrawalRequests
    const processedWithdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: { userId: String(userId), status: 'processed' },
    });
    const userWithdrawnAmount = processedWithdrawalRequests.reduce((sum, rx) => sum + (rx.amount || 0), 0);
    const totalWithdrawn = (providerWallet.withdrawnAmount || 0) + userWithdrawnAmount;

    // 6. Compute pendingWithdrawal: provider pendingBalance + pending user WithdrawalRequests
    const pendingWithdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: { userId: String(userId), status: 'pending' },
    });
    const userPendingAmount = pendingWithdrawalRequests.reduce((sum, rx) => sum + (rx.amount || 0), 0);
    const pendingWithdrawal = (providerWallet.pendingBalance || 0) + userPendingAmount;

    res.json({
      success: true,
      data: {
        walletBalance: providerWallet.availableBalance || 0,
        referralWalletBalance: user.referralWalletBalance || 0,
        cashbackBalance,
        totalCommissionEarned,
        totalWithdrawn,
        pendingWithdrawal
      }
    });
  } catch (error) {
    console.error('[WalletController] getWalletSummary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch transactions from both sources
    const [userTxns, providerTxns] = await Promise.all([
      prisma.walletTransaction.findMany({ where: { userId: String(userId) } }).then(withLegacyIds),
      prisma.providerWalletTransaction.findMany({ where: { userId: String(userId) } }).then(withLegacyIds)
    ]);

    // Standardize user transactions
    const mappedUserTxns = userTxns.map(tx => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      direction: tx.direction || (tx.type === 'payout' || tx.type === 'withdrawal_request' ? 'debit' : 'credit'),
      description: tx.description || `${tx.type.replace(/_/g, ' ')}`,
      createdAt: tx.createdAt
    }));

    // Standardize provider transactions
    const mappedProviderTxns = providerTxns.map(tx => ({
      _id: tx._id,
      type: tx.type === 'earning' ? 'provider_task_earning' : (tx.type === 'withdrawal' ? 'withdrawal_request' : tx.type),
      amount: tx.amount,
      status: tx.status,
      direction: tx.type === 'withdrawal' ? 'debit' : 'credit',
      description: tx.description || `${tx.type.replace(/_/g, ' ')}`,
      createdAt: tx.createdAt
    }));

    // Merge and sort by createdAt descending
    const allTransactions = [...mappedUserTxns, ...mappedProviderTxns].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      data: allTransactions
    });
  } catch (error) {
    console.error('[WalletController] getWalletTransactions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getWalletSummary,
  getWalletTransactions
};
