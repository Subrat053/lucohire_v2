/**
 * Referral Tracking Service
 * Handles job and plan events for referred users — updates Referral stats
 * and creates PartnerReward entries when eligible.
 */

const prisma = require("../config/prisma");
const { getRewardConfig } = require("../config/rewardConfig");

const currentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

/**
 * Called when a referred user creates a job.
 */
const onJobCreated = async (userId) => {
  try {
    const referral = await prisma.referral.findFirst({ where: { referredUserId: String(userId) } });
    if (!referral) return;

    await prisma.referral.update({
      where: { id: referral.id },
      data: { jobsCreated: { increment: 1 } },
    });

    const config = await getRewardConfig();
    if (config.jobPostReward > 0) {
      const { month, year } = currentMonthYear();
      await prisma.partnerReward.create({ data: {
        partner: String(referral.referrerId),
        referral: referral.id,
        referredUser: String(userId),
        sourceType: "job_posted",
        amount: config.jobPostReward,
        status: "pending",
        month,
        year,
      } });
    }
  } catch (error) {
    console.error("[ReferralTracking] onJobCreated error:", error.message);
  }
};

/**
 * Called when a referred user completes a job.
 */
const onJobCompleted = async (userId) => {
  try {
    const referral = await prisma.referral.findFirst({ where: { referredUserId: String(userId) } });
    if (!referral) return;

    await prisma.referral.update({
      where: { id: referral.id },
      data: { jobsCompleted: { increment: 1 }, rewardEligible: true },
    });

    const config = await getRewardConfig();
    if (config.jobCompleteReward > 0) {
      const { month, year } = currentMonthYear();
      await prisma.partnerReward.create({ data: {
        partner: String(referral.referrerId),
        referral: referral.id,
        referredUser: String(userId),
        sourceType: "job_completed",
        amount: config.jobCompleteReward,
        status: "pending",
        month,
        year,
      } });
    }
  } catch (error) {
    console.error("[ReferralTracking] onJobCompleted error:", error.message);
  }
};

/**
 * Called when a referred user purchases a plan.
 */
const onPlanPurchased = async (userId, planAmount) => {
  try {
    const referral = await prisma.referral.findFirst({ where: { referredUserId: String(userId) } });
    if (!referral) return;

    const config = await getRewardConfig();
    const commissionPercent = referral.commissionRate || config.planCommissionPercent;
    const commissionAmount = Math.round((planAmount * commissionPercent) / 100 * 100) / 100;

    if (commissionAmount > 0) {
      const { month, year } = currentMonthYear();
      await prisma.partnerReward.create({ data: {
        partner: String(referral.referrerId),
        referral: referral.id,
        referredUser: String(userId),
        sourceType: "plan_purchase",
        amount: commissionAmount,
        status: "pending",
        month,
        year,
      } });
    }
  } catch (error) {
    console.error("[ReferralTracking] onPlanPurchased error:", error.message);
  }
};

/**
 * Called during registration when a referral code is used.
 * Returns the partner user if valid, null otherwise.
 */
const processRegistrationReferral = async ({
  referralCode,
  referredBy,
  newUserId,
  role,
}) => {
  try {
    let partnerProfile = null;
    let referrerUser = null;
    let referrerType = "partner";

    // Find referrer by referral code
    if (referralCode) {
      console.log(`[ReferralTracking] Processing code: ${referralCode}`);
      // 1. Try PartnerProfile first (existing logic)
      partnerProfile = await prisma.partnerProfile.findUnique({
        where: { referralCode: String(referralCode).trim().toUpperCase() },
      });

      if (partnerProfile) {
        referrerUser = await prisma.user.findUnique({ where: { id: partnerProfile.userId } });
        referrerType = "partner";
        console.log(`[ReferralTracking] Found partner referrer: ${referrerUser?.email}`);
      } else {
        // 2. Try User referral code (new logic)
        referrerUser = await prisma.user.findUnique({
          where: { referralCode: String(referralCode).trim().toUpperCase() },
        });
        referrerType = "user";
        if (referrerUser) console.log(`[ReferralTracking] Found user referrer: ${referrerUser.email}`);
      }
    }

    // Or find referrer by user ID
    if (!referrerUser && referredBy) {
      // Try Partner first
      partnerProfile = await prisma.partnerProfile.findUnique({ where: { userId: String(referredBy) } });
      if (partnerProfile) {
        referrerUser = await prisma.user.findUnique({ where: { id: partnerProfile.userId } });
        referrerType = "partner";
      } else {
        // Try User
        referrerUser = await prisma.user.findUnique({ where: { id: String(referredBy) } });
        referrerType = "user";
      }
    }

    if (!referrerUser) return null;

    // Prevent self-referral
    if (String(referrerUser.id) === String(newUserId)) return null;

    // Check referrer status
    if (referrerType === "partner" && partnerProfile) {
      if (partnerProfile.status !== "active") return null;
    }

    if (
      referrerUser.isBlocked ||
      referrerUser.partnerStatus === "suspended" ||
      referrerUser.partnerStatus === "blocked"
    ) {
      return null;
    }

    // Create referral record
    const newReferral = await prisma.referral.create({ data: {
      referrerId: referrerUser.id,
      referrerType,
      partnerProfileId: partnerProfile ? partnerProfile.id : null,
      referredUserId: String(newUserId),
      referredRole: role,
      referralCode: referralCode || (referrerUser.referralCode || ""),
      registrationSource: referrerType === "user" ? "user_link" : "referral_link",
      status: "registered",
      commissionRate: partnerProfile ? partnerProfile.commissionRate : 0,
    } });

    console.log(`[ReferralTracking] Referral record created: ${newReferral.id} for user ${newUserId}`);

    // Increment referrer's referral count
    await prisma.user.update({
      where: { id: referrerUser.id },
      data: { totalReferrals: { increment: 1 }, referredUsersCount: { increment: 1 } },
    });

    // Create registration reward only for PARTNERS if configured
    if (referrerType === "partner" && partnerProfile) {
      const config = await getRewardConfig();
      const regReward =
        role === "provider"
          ? config.providerRegistrationReward
          : config.recruiterRegistrationReward;

      if (regReward > 0) {
        const { month, year } = currentMonthYear();
        await prisma.partnerReward.create({ data: {
          partner: referrerUser.id,
          referredUser: String(newUserId),
          sourceType: "registration",
          amount: regReward,
          status: "pending",
          month,
          year,
        } });
      }
    }

    return {
      referrerId: referrerUser.id,
      partnerId: referrerType === "partner" ? referrerUser.id : null,
      referrerType,
      referralCode: referralCode || referrerUser.referralCode,
    };
  } catch (error) {
    console.error(
      "[ReferralTracking] processRegistrationReferral error:",
      error.message
    );
    return null;
  }
};

module.exports = {
  onJobCreated,
  onJobCompleted,
  onPlanPurchased,
  processRegistrationReferral,
};
