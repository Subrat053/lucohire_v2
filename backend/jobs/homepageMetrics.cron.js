const cron = require("node-cron");
const { homepageMetricsQueue } = require("../queues/homepageMetrics.queue");
const { computeAndCacheMetrics } = require("../workers/homepageMetrics.worker");

/**
 * Hourly Cron Job: Runs at the start of every hour (0 * * * *)
 * Enqueues a refresh job to calculate and cache landing page statistics.
 */
function startHomepageMetricsCron() {
  cron.schedule("0 * * * *", async () => {
    console.log(`[CRON - Homepage Metrics] Starting hourly metrics refresh at UTC: ${new Date().toISOString()}`);
    try {
      if (!homepageMetricsQueue) {
        console.log("[CRON - Homepage Metrics] BullMQ queue not configured. Running inline refresh...");
        await computeAndCacheMetrics();
        return;
      }

      const jobId = `homepage-metrics-refresh-${Date.now()}`;
      await homepageMetricsQueue.add(
        "refresh-homepage-metrics",
        {},
        {
          jobId,
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      console.log(`[CRON - Homepage Metrics] Enqueued job 'refresh-homepage-metrics' with jobId: ${jobId}`);
    } catch (err) {
      console.error("[CRON - Homepage Metrics] Error triggering metrics refresh cron:", err.message);
    }
  });

  console.log("[CRON - Homepage Metrics] Hourly metrics refresh cron scheduled.");
}

module.exports = {
  startHomepageMetricsCron,
};
