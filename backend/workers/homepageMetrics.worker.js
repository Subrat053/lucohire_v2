const { Worker } = require("bullmq");
const JobPost = require("../models/JobPost");
const ProviderProfile = require("../models/ProviderProfile");
const User = require("../models/User");
const { getRedisClient } = require("../modules/queue/redis.client");
const { QUEUE_NAME } = require("../queues/homepageMetrics.queue");
const { queueSupported } = require("../modules/queue/queue.factory");

let worker = null;

// In-memory fallback cache for dev when Redis is absent
let localCache = {
  stats: null,
  demandMap: null,
  topCompanies: null,
  topSkills: null,
  updatedAt: null
};

/**
 * Computes and caches landing page statistics and aggregations.
 */
async function computeAndCacheMetrics() {
  try {
    console.log("[Homepage Metrics Worker] Starting heavy aggregations...");

    // 1. General Stats
    const activeJobsCount = await JobPost.countDocuments({ status: "active", isActive: true });
    const activeCandidatesCount = await ProviderProfile.countDocuments({ isApproved: true });
    const totalRecruitersCount = await User.countDocuments({ roles: "recruiter", isActive: true });

    const stats = {
      activeJobsCount,
      activeCandidatesCount,
      totalRecruitersCount,
    };

    // 2. Demand Map (Geographical distribution of active jobs)
    const demandMap = await JobPost.aggregate([
      { $match: { status: "active", isActive: true } },
      {
        $group: {
          _id: {
            city: { $ifNull: ["$cityName", "$city"] },
            latitude: "$latitude",
            longitude: "$longitude"
          },
          jobCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          city: "$_id.city",
          latitude: "$_id.latitude",
          longitude: "$_id.longitude",
          jobCount: 1
        }
      }
    ]);

    // 3. Top Companies
    const topCompanies = await JobPost.aggregate([
      { $match: { status: "active", isActive: true, companyName: { $ne: "" } } },
      {
        $group: {
          _id: "$companyName",
          activeJobsCount: { $sum: 1 }
        }
      },
      { $sort: { activeJobsCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          companyName: "$_id",
          activeJobsCount: 1
        }
      }
    ]);

    // 4. Top Skills
    const topSkills = await JobPost.aggregate([
      { $match: { status: "active", isActive: true, skill: { $ne: "" } } },
      {
        $group: {
          _id: "$skill",
          activeJobsCount: { $sum: 1 }
        }
      },
      { $sort: { activeJobsCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          skill: "$_id",
          activeJobsCount: 1
        }
      }
    ]);

    const timestamp = new Date().toISOString();

    // Cache locally
    localCache = {
      stats,
      demandMap,
      topCompanies,
      topSkills,
      updatedAt: timestamp
    };

    // Store in Redis
    const redis = getRedisClient();
    if (redis) {
      try {
        if (redis.status === 'wait') {
          await redis.connect();
        }
        await redis.set("homepage:stats", JSON.stringify(stats));
        await redis.set("homepage:demand-map", JSON.stringify(demandMap));
        await redis.set("homepage:top-companies", JSON.stringify(topCompanies));
        await redis.set("homepage:top-skills", JSON.stringify(topSkills));
        await redis.set("homepage:updated-at", timestamp);
        console.log("[Homepage Metrics Worker] Metrics successfully cached in Redis.");
      } catch (redisError) {
        console.warn("[Homepage Metrics Worker] Failed to write to Redis, using in-memory fallback:", redisError.message);
      }
    } else {
      console.log("[Homepage Metrics Worker] Redis not configured. Cached in-memory only.");
    }

    return {
      success: true,
      stats,
      demandMap,
      topCompanies,
      topSkills,
      updatedAt: timestamp
    };
  } catch (error) {
    console.error("[Homepage Metrics Worker] Error performing aggregations:", error);
    throw error;
  }
}

/**
 * Gets the current cached metrics from Redis (with local memory fallback).
 */
async function getCachedMetrics() {
  const redis = getRedisClient();
  if (redis) {
    try {
      if (redis.status === 'wait') {
        await redis.connect();
      }
      const stats = await redis.get("homepage:stats");
      const demandMap = await redis.get("homepage:demand-map");
      const topCompanies = await redis.get("homepage:top-companies");
      const topSkills = await redis.get("homepage:top-skills");
      const updatedAt = await redis.get("homepage:updated-at");

      if (stats && demandMap && topCompanies && topSkills) {
        return {
          stats: JSON.parse(stats),
          demandMap: JSON.parse(demandMap),
          topCompanies: JSON.parse(topCompanies),
          topSkills: JSON.parse(topSkills),
          updatedAt: updatedAt || new Date().toISOString()
        };
      }
    } catch (redisError) {
      console.warn("[Homepage Metrics Worker] Failed to read from Redis, falling back to memory:", redisError.message);
    }
  }

  // Fallback to memory
  if (localCache.stats) {
    return localCache;
  }

  // Run on-demand for first launch if no cached data exists
  console.log("[Homepage Metrics Worker] Cache miss. Computing on demand...");
  return await computeAndCacheMetrics();
}

/**
 * Starts the BullMQ worker for homepage metrics.
 */
function startHomepageMetricsWorker() {
  if (!queueSupported()) {
    console.warn("[Worker - Homepage Metrics] BullMQ is disabled by environment variables. Worker not started.");
    return;
  }

  const redisConnection = getRedisClient();
  if (!redisConnection) {
    console.warn("[Worker - Homepage Metrics] Redis connection not available. Worker not started.");
    return;
  }

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      console.log(`[Worker - Homepage Metrics] Processing job ${job.id} of type ${job.name}`);
      await computeAndCacheMetrics();
    },
    {
      connection: redisConnection,
      concurrency: 1,
      settings: {
        stalledInterval: 300000,
        drainDelay: 60000
      },
      metrics: null
    }
  );

  worker.on("ready", () => {
    console.log("[Worker - Homepage Metrics] Worker is ready and listening on homepage-metrics-queue.");
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker - Homepage Metrics] Job ${job?.id || "unknown"} failed:`, err.message);
  });

  worker.on("error", (error) => {
    console.error("[Worker - Homepage Metrics] Queue worker error:", error.message);
  });
}

/**
 * Stops the BullMQ worker.
 */
function stopHomepageMetricsWorker() {
  if (worker) {
    worker.close();
    worker = null;
    console.log("[Worker - Homepage Metrics] Worker stopped.");
  }
}

module.exports = {
  startHomepageMetricsWorker,
  stopHomepageMetricsWorker,
  computeAndCacheMetrics,
  getCachedMetrics,
};
