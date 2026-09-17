const { isValidId } = require('../utils/id');
const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

const NON_ADMIN_ROLES = new Set(['provider', 'recruiter']);
const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const buildRolePair = (reviewer, reviewee) => {
  if (!reviewer || !reviewee) return null;
  if (!NON_ADMIN_ROLES.has(reviewer.role) || !NON_ADMIN_ROLES.has(reviewee.role)) return null;
  if (reviewer.role === reviewee.role) return null;

  const providerId = reviewer.role === 'provider' ? reviewer._id : reviewee._id;
  const recruiterId = reviewer.role === 'recruiter' ? reviewer._id : reviewee._id;
  return { providerId, recruiterId };
};

const resolveLeadInteraction = async ({ providerId, recruiterId, leadId }) => {
  const where = {
    provider: providerId,
    recruiter: recruiterId,
    OR: [
      { isUnlocked: true },
      { status: { in: ['contacted', 'hired', 'rejected'] } },
      { type: { in: ['contact_unlock', 'direct_contact'] } },
    ],
  };

  if (leadId) {
    if (!isValidId(leadId)) return null;
    where.id = String(leadId);
  }

  return withLegacyId(await prisma.lead.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
  }));
};

const calculateReviewStats = async (revieweeId) => {
  const stats = await prisma.review.aggregate({
    where: { revieweeId: String(revieweeId) },
    _avg: { rating: true },
    _count: { _all: true },
  });

  if (!stats._count._all) return { avgRating: 0, totalReviews: 0 };
  return {
    avgRating: Number((stats._avg.rating || 0).toFixed(1)),
    totalReviews: stats._count._all,
  };
};

const syncProfileRating = async (revieweeUser) => {
  const { avgRating, totalReviews } = await calculateReviewStats(revieweeUser._id);

  if (revieweeUser.role === 'provider') {
    await prisma.providerProfile.updateMany({
      where: { user: String(revieweeUser._id) },
      data: { rating: avgRating, totalReviews },
    });
  } else if (revieweeUser.role === 'recruiter') {
    await prisma.recruiterProfile.updateMany({
      where: { user: String(revieweeUser._id) },
      data: { avgRating, totalReviews },
    });
  }

  return { avgRating, totalReviews };
};

const createReviewForUsers = async ({ reviewer, reviewee, rating, comment, leadId }) => {
  if (!reviewer || !reviewee) {
    return { ok: false, status: 400, message: 'Reviewer and reviewee are required' };
  }
  if (reviewer._id.toString() === reviewee._id.toString()) {
    return { ok: false, status: 400, message: 'You cannot review yourself' };
  }
  if (reviewer.role === 'admin') {
    return { ok: false, status: 403, message: 'Admin users cannot submit reviews' };
  }

  const pair = buildRolePair(reviewer, reviewee);
  if (!pair) {
    return { ok: false, status: 403, message: 'Reviews are only allowed between provider and recruiter' };
  }

  const normalizedRating = Number(rating);
  if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return { ok: false, status: 400, message: 'Rating must be between 1 and 5' };
  }

  const interaction = await resolveLeadInteraction({
    providerId: pair.providerId,
    recruiterId: pair.recruiterId,
    leadId,
  });
  if (!interaction) {
    return { ok: false, status: 403, message: 'Review requires a valid prior interaction' };
  }

  const duplicate = await prisma.review.findFirst({
    where: {
      reviewerId: String(reviewer._id),
      revieweeId: String(reviewee._id),
      leadId: String(interaction._id),
    },
  });
  if (duplicate) {
    return { ok: false, status: 409, message: 'You have already reviewed this interaction' };
  }

  const review = withLegacyId(await prisma.review.create({
    data: {
      reviewerId: String(reviewer._id),
      revieweeId: String(reviewee._id),
      provider: String(pair.providerId),
      recruiter: String(pair.recruiterId),
      leadId: String(interaction._id),
      jobPost: interaction.jobPost ? String(interaction.jobPost) : null,
      rating: normalizedRating,
      comment: typeof comment === 'string' ? comment.trim() : '',
    },
  }));

  const stats = await syncProfileRating(reviewee);
  return { ok: true, review, stats, interaction };
};

const canUserReview = async ({ reviewer, revieweeId, leadId }) => {
  if (!reviewer || reviewer.role === 'admin') {
    return { canReview: false, reason: 'Admins cannot review' };
  }

  if (!isValidId(revieweeId)) {
    return { canReview: false, reason: 'Invalid reviewee id' };
  }

  const reviewee = withLegacyId(await prisma.user.findUnique({
    where: { id: String(revieweeId) },
    select: { id: true, role: true },
  }));
  if (!reviewee) return { canReview: false, reason: 'User not found' };

  const pair = buildRolePair(reviewer, reviewee);
  if (!pair) return { canReview: false, reason: 'Cross-role reviews only' };

  const interaction = await resolveLeadInteraction({
    providerId: pair.providerId,
    recruiterId: pair.recruiterId,
    leadId,
  });

  if (!interaction) return { canReview: false, reason: 'No eligible interaction found' };

  const existing = await prisma.review.findFirst({
    where: {
      reviewerId: String(reviewer._id),
      revieweeId: String(reviewee._id),
      leadId: String(interaction._id),
    },
    select: { id: true },
  });

  return {
    canReview: !existing,
    reason: existing ? 'Review already exists for this interaction' : '',
    leadId: interaction._id,
  };
};

const canMutateReview = (review) => {
  const ageMs = Date.now() - new Date(review.createdAt).getTime();
  return ageMs <= REVIEW_EDIT_WINDOW_MS;
};

const updateReviewByOwner = async ({ reviewId, reviewer, rating, comment }) => {
  let review = withLegacyId(await prisma.review.findFirst({
    where: { id: String(reviewId), reviewerId: String(reviewer._id) },
  }));
  if (!review) {
    return { ok: false, status: 404, message: 'Review not found or not owned by you' };
  }

  if (!canMutateReview(review)) {
    return { ok: false, status: 403, message: 'Review can only be edited within 24 hours' };
  }

  const updates = {};
  if (rating !== undefined) {
    const normalizedRating = Number(rating);
    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return { ok: false, status: 400, message: 'Rating must be between 1 and 5' };
    }
    updates.rating = normalizedRating;
  }

  if (comment !== undefined) {
    updates.comment = typeof comment === 'string' ? comment.trim() : '';
  }

  if (!Object.keys(updates).length) {
    return { ok: false, status: 400, message: 'No valid fields to update' };
  }

  review = withLegacyId(await prisma.review.update({
    where: { id: String(review._id) },
    data: updates,
  }));

  const reviewee = withLegacyId(await prisma.user.findUnique({
    where: { id: String(review.revieweeId) },
    select: { id: true, role: true },
  }));
  const stats = reviewee ? await syncProfileRating(reviewee) : { avgRating: 0, totalReviews: 0 };

  return { ok: true, review, stats };
};

const deleteReviewByOwner = async ({ reviewId, reviewer }) => {
  const review = withLegacyId(await prisma.review.findFirst({
    where: { id: String(reviewId), reviewerId: String(reviewer._id) },
  }));
  if (!review) {
    return { ok: false, status: 404, message: 'Review not found or not owned by you' };
  }

  if (!canMutateReview(review)) {
    return { ok: false, status: 403, message: 'Review can only be deleted within 24 hours' };
  }

  const reviewee = withLegacyId(await prisma.user.findUnique({
    where: { id: String(review.revieweeId) },
    select: { id: true, role: true },
  }));
  await prisma.review.delete({ where: { id: String(review._id) } });
  const stats = reviewee ? await syncProfileRating(reviewee) : { avgRating: 0, totalReviews: 0 };

  return { ok: true, stats };
};

module.exports = {
  buildRolePair,
  calculateReviewStats,
  syncProfileRating,
  createReviewForUsers,
  canUserReview,
  updateReviewByOwner,
  deleteReviewByOwner,
};
