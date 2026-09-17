const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

const getCommissionsQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch Withdrawal Requests
    const [rows, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where: query, include: { userIdRecord: { select: { id: true, name: true, email: true, phone: true, bankDetails: true } } }, orderBy: { createdAt: 'desc' },
        skip, take: parseInt(limit),
      }),
      prisma.withdrawalRequest.count({ where: query }),
    ]);
    const withdrawals = rows.map((row) => {
      const result = withLegacyId(row);
      result.userId = withLegacyId(result.userIdRecord);
      delete result.userIdRecord;
      return result;
    });

    // Fetch Recent Referrals for context
    const recentReferrals = (await prisma.referral.findMany({
      where: { commissionStatus: { in: ['pending', 'earned'] } },
      include: { referrerIdRecord: { select: { id: true, name: true, email: true } }, referredUserIdRecord: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    })).map((row) => {
      const mapped = withLegacyId(row);
      mapped.referrerId = withLegacyId(row.referrerIdRecord);
      mapped.referredUserId = withLegacyId(row.referredUserIdRecord);
      delete mapped.referrerIdRecord;
      delete mapped.referredUserIdRecord;
      return mapped;
    });

    res.json({
      withdrawals,
      recentReferrals,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    let withdrawal = withLegacyId(await prisma.withdrawalRequest.findUnique({ where: { id: String(id) } }));
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    // If rejected, refund the balance
    if (status === 'rejected') {
      await prisma.user.update({
        where: { id: String(withdrawal.userId) },
        data: { referralWalletBalance: { increment: withdrawal.amount } },
      }).catch(() => null);
    }

    withdrawal = withLegacyId(await prisma.withdrawalRequest.update({
      where: { id: String(id) }, data: { status },
    }));
    if (adminNotes) withdrawal.adminNotes = adminNotes;
    res.json({ message: 'Status updated successfully', withdrawal });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getCommissionsQueue,
  updateWithdrawalStatus
};
