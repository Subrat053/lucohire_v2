const prisma = require('../config/prisma');
const { findActiveUserSubscription } = require('./billingPersistenceService');

/**
 * Determine the badge text for a user based on their active subscription plan.
 * Returns empty string if the plan does not have badgeEnabled.
 */
function getBadgeText(plan, role) {
  if (!plan || !plan.badgeEnabled) return '';
  const roleName = role === 'recruiter' ? 'Recruiter' : 'Provider';
  return `⭐ ${plan.name} ${roleName}`;
}

/**
 * Update a user's subscriptionBadge based on their active subscription.
 */
async function updateUserBadge(userId) {
  const user = await prisma.user.findUnique({ where: { id: String(userId) } });
  if (!user) return;

  const role = user.activeRole || user.role || (Array.isArray(user.roles) ? user.roles[0] : null);
  const sub = await findActiveUserSubscription(userId, role, true);

  const badge = sub ? getBadgeText(sub.planId, role) : '';
  if (user.subscriptionBadge !== badge) {
    await prisma.user.update({ where: { id: String(userId) }, data: { subscriptionBadge: badge } });
  }
  return badge;
}

/**
 * Clear the badge when plan expires or is cancelled.
 */
async function clearUserBadge(userId) {
  await prisma.user.updateMany({ where: { id: String(userId) }, data: { subscriptionBadge: '' } });
}

module.exports = { getBadgeText, updateUserBadge, clearUserBadge };
