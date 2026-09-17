const prisma = require('../config/prisma');

const creditSignupCashback = async (userId) => {
  try {
    const enabledSetting = await prisma.adminSetting.findUnique({ where: { key: 'signup_cashback_enabled' } });
    const enabled = enabledSetting?.value;
    const isEnabled = enabled == null || Number(enabled) === 1 || enabled === true || String(enabled).toLowerCase() === 'true';
    if (!isEnabled) {
      console.log('[CashbackService] Signup cashback is disabled by admin setting.');
      return;
    }

    const amountSetting = await prisma.adminSetting.findUnique({ where: { key: 'signup_cashback_amount' } });
    const amount = amountSetting?.value ?? 100;
    const numericAmount = Number(amount) || 0;

    if (numericAmount <= 0) {
      console.log('[CashbackService] Cashback amount is 0 or negative. Skipping credit.');
      return;
    }

    await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: String(userId) } });
    if (!user) {
      console.log('[CashbackService] User not found:', userId);
      return;
    }

    if (user.signupCashbackCredited) {
      console.log('[CashbackService] Signup cashback already credited for user:', userId);
      return;
    }

    // Idempotency: verify no duplicate transaction exists in WalletTransaction
    const existingTx = await tx.walletTransaction.findFirst({
      where: { userId: String(userId), type: 'signup_cashback' },
    });

    if (existingTx) {
      console.log('[CashbackService] Signup cashback transaction already exists in ledger for user:', userId);
      await tx.user.update({ where: { id: user.id }, data: {
        signupCashbackCredited: true, signupCashbackCreditedAt: existingTx.createdAt,
      } });
      return;
    }

    // Update user balances
    const claimed = await tx.user.updateMany({
      where: { id: user.id, signupCashbackCredited: false },
      data: {
        referralWalletBalance: { increment: numericAmount },
        totalReferralCommission: { increment: numericAmount },
        signupCashbackCredited: true, signupCashbackCreditedAt: new Date(),
      },
    });
    if (!claimed.count) return;
    const creditedUser = await tx.user.findUnique({ where: { id: user.id } });

    // Create WalletTransaction
    await tx.walletTransaction.create({ data: {
      userId: String(userId),
      type: 'signup_cashback',
      amount: numericAmount,
      direction: 'credit',
      description: 'Signup cashback credited',
      status: 'credited',
      balanceAfter: creditedUser.referralWalletBalance
    } });

    console.log(`[CashbackService] Successfully credited ₹${numericAmount} signup cashback to user:`, userId);
    });
  } catch (error) {
    console.error('[CashbackService] Error crediting signup cashback:', error);
  }
};

module.exports = {
  creditSignupCashback
};
