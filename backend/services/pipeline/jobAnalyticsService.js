const JobAnalyticsEvent = require('../../models/pipeline/JobAnalyticsEvent');
const JobAnalyticsMetric = require('../../models/pipeline/JobAnalyticsMetric');

/**
 * Service to calculate unique-value analytics.
 */

const trackJobEvent = async (jobId, eventType, userId = null, sessionId = null, country = null, city = null, device = null) => {
  await JobAnalyticsEvent.create({
    jobId,
    eventType,
    userId,
    sessionId,
    country,
    city,
    device
  });

  // Simple increment, can be optimized with batch processing later
  const updateQuery = {};
  if (eventType === 'impression') updateQuery.impressions = 1;
  if (eventType === 'view') updateQuery.views = 1;
  if (eventType === 'apply_click') updateQuery.applyClicks = 1;

  if (Object.keys(updateQuery).length > 0) {
    await JobAnalyticsMetric.findOneAndUpdate(
      { jobId },
      { $inc: updateQuery },
      { upsert: true, new: true }
    );
  }
};

const calculateTrendingScore = async () => {
  // Simple heuristic: views + applyClicks * 3 in the last week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // In reality, you'd aggregate from JobAnalyticsEvent for time-bound accuracy.
  // For simplicity, we just calculate a basic score based on lifetime metrics.
  
  const metrics = await JobAnalyticsMetric.find();
  for (const m of metrics) {
    const score = m.views + (m.applyClicks * 3);
    m.trendingScore = score;
    m.calculatedAt = new Date();
    await m.save();
  }
};

const shouldShowAnalyticsBadge = (metric, threshold = 100) => {
  if (!metric) return false;
  return metric.impressions >= threshold;
};

module.exports = {
  trackJobEvent,
  calculateTrendingScore,
  shouldShowAnalyticsBadge
};
