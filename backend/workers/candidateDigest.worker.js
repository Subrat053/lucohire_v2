const { Worker } = require("bullmq");
const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const JobPost = require("../models/JobPost");
const { createCandidateDigestLog } = require("../services/communicationPersistenceService");
const { getRedisClient } = require("../modules/queue/redis.client");
const { QUEUE_NAME } = require("../queues/candidateDigest.queue");
const { sendMail } = require("../services/mailService");
const { sendWhatsAppMessage } = require("../utils/messaging");
const { queueSupported } = require("../modules/queue/queue.factory");
const { enabled } = require('../middleware/operationalFeatureGate');

const escapeRegex = (str) => String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let worker = null;

/**
 * Core function to generate and send a candidate's daily job matches digest.
 * Can be run in the background (via BullMQ worker) or inline (for local development/fallback).
 */
async function generateAndSendDigest(userId, date) {
  const matchingEnabled = enabled('ENABLE_RECRUITER_MATCHING') || enabled('ENABLE_JOB_AI_MATCHING');
  if (!enabled('ENABLE_WORKERS') || !matchingEnabled || !enabled('ENABLE_COMMUNICATION_PROVIDERS')) {
    throw new Error('Candidate digest execution is disabled');
  }
  // 1. Fetch user and profile
  const candidate = await User.findById(userId);
  if (!candidate || !candidate.isActive || candidate.isBlocked) {
    console.log(`[Digest Generation] User ${userId} is not active or blocked. Skipping.`);
    return;
  }

  const providerProfile = await ProviderProfile.findOne({ user: userId });
  if (!providerProfile) {
    console.log(`[Digest Generation] User ${userId} has no provider profile. Skipping.`);
    return;
  }

  // Country Config checks
  const CountryConfig = require("../models/CountryConfig");
  const userCountryCode = candidate.country || "US";
  const countryConfig = await CountryConfig.findOne({ countryCode: userCountryCode.toUpperCase() });
  
  if (countryConfig) {
    if (!countryConfig.isActive) {
      console.log(`[Digest Generation] User ${userId}'s country ${userCountryCode} is inactive. Skipping.`);
      return;
    }
    if (!countryConfig.notificationRules?.dailyDigestEnabled) {
      console.log(`[Digest Generation] Daily digests disabled for country ${userCountryCode}. Skipping.`);
      return;
    }
  }

  const CandidateJobMatch = require("../models/CandidateJobMatch");

  // 2. Fetch matches from CandidateJobMatch
  const matches = await CandidateJobMatch.find({
    userId,
    matchScore: { $gte: 70 }
  }).sort({ matchScore: -1 }).limit(5).lean();

  let matchedJobs = [];
  
  if (matches.length > 0) {
    for (const match of matches) {
      const jobDetails = await JobPost.findById(match.jobId).lean();
      if (jobDetails && (jobDetails.status === 'active' || jobDetails.isActive)) {
        matchedJobs.push({
          ...jobDetails,
          matchScore: match.matchScore
        });
      }
    }
  }

  // Fallback to old skills/location direct query if no CandidateJobMatch matches exist
  if (matchedJobs.length === 0) {
    const jobsQuery = {
      $or: [{ status: "active" }, { status: { $exists: false } }],
      isActive: true,
    };

    if (providerProfile.skills && providerProfile.skills.length > 0) {
      jobsQuery.skill = {
        $in: providerProfile.skills.map((s) => new RegExp("^" + escapeRegex(s.trim()) + "$", "i")),
      };
    } else {
      console.log(`[Digest Generation] User ${userId} has no skills listed. Skipping.`);
      return;
    }

    let hasCoords =
      candidate.latitude !== undefined &&
      candidate.longitude !== undefined &&
      candidate.latitude !== null &&
      candidate.longitude !== null;

    if (hasCoords) {
      try {
        matchedJobs = await JobPost.find({
          ...jobsQuery,
          geoPoint: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [Number(candidate.longitude), Number(candidate.latitude)],
              },
              $maxDistance: 50000,
            },
          },
        }).limit(5).lean();
      } catch (geoError) {
        console.error(`[Digest Generation] Geo-spatial query failed for user ${userId}:`, geoError.message);
        hasCoords = false;
      }
    }

    if (!hasCoords) {
      const city = candidate.cityName || providerProfile.city;
      if (city) {
        jobsQuery.cityName = { $regex: new RegExp("^" + escapeRegex(city.trim()) + "$", "i") };
        matchedJobs = await JobPost.find(jobsQuery).limit(5).lean();
      }
    }
  }

  if (matchedJobs.length === 0) {
    console.log(`[Digest Generation] No jobs matched for candidate ${userId} on date ${date}.`);
    try {
      await createCandidateDigestLog({
        candidate: userId,
        date,
        jobsMatched: [],
        channels: [],
        emailStatus: "none",
        whatsappStatus: "none",
      });
    } catch (err) {
      if (err.code !== 'P2002') throw err;
    }
    return;
  }

  const matchedJobIds = matchedJobs.map((j) => j._id);
  const channels = [];
  let emailStatus = "none";
  let whatsappStatus = "none";
  let errorMsg = "";

  // 3. Deliver Email Alert
  if (candidate.email) {
    channels.push("email");
    try {
      const appName = process.env.EMAIL_FROM_NAME || "ServiceHub";
      const subject = `[ServiceHub] Your Daily Job Match Digest - ${date}`;

      let jobsHtml = "";
      for (const jobItem of matchedJobs) {
        const budgetStr = jobItem.minBudget && jobItem.maxBudget 
          ? `₹${jobItem.minBudget} - ₹${jobItem.maxBudget}` 
          : (jobItem.salaryMin && jobItem.salaryMax ? `${jobItem.currency || 'USD'} ${jobItem.salaryMin} - ${jobItem.salaryMax}` : "Negotiable");
        
        const jobUrl = jobItem.isExternal 
          ? jobItem.applyUrl 
          : `${process.env.FRONTEND_URL || "http://localhost:5173"}/jobs/${jobItem._id}`;

        const detailsStr = jobItem.isExternal
          ? `<p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Company:</strong> ${jobItem.companyName || 'External Company'}</p>
             <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Location:</strong> ${jobItem.city || jobItem.locationText || "Remote"}</p>`
          : `<p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Skill Needed:</strong> ${jobItem.skill}</p>
             <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Location:</strong> ${jobItem.locality || ""}, ${jobItem.city}</p>`;

        jobsHtml += `
          <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb; margin-bottom: 12px;">
            <h3 style="margin: 0 0 6px 0; color: #4f46e5; font-size: 16px;">${jobItem.title} ${jobItem.isExternal ? '<span style="font-size: 11px; padding: 2px 6px; background-color: #e0e7ff; color: #4338ca; border-radius: 4px; margin-left: 6px;">External</span>' : ''}</h3>
            ${detailsStr}
            <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Salary/Budget:</strong> ${budgetStr}</p>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #4b5563;">${jobItem.description ? jobItem.description.slice(0, 120) : ""}...</p>
            <p style="margin: 8px 0 0 0;"><a href="${jobUrl}" target="_blank" style="color: #4f46e5; font-weight: bold; text-decoration: none;">View & Apply &rarr;</a></p>
          </div>
        `;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 550px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">Your Daily Job Digest</h2>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">Here are your local matching jobs for today, ${date}:</p>
          ${jobsHtml}
          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/provider/jobs" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View All Matches</a>
          </div>
          <p style="margin-top: 32px; font-size: 12px; color: #9ca3af; text-align: center;">– The ${appName} Team</p>
        </div>
      `;

      await sendMail({
        to: candidate.email,
        subject,
        html,
      });

      emailStatus = "sent";
    } catch (mailErr) {
      console.error(`[Digest Generation] Email delivery failed for ${candidate.email}:`, mailErr.message);
      emailStatus = "failed";
      errorMsg += `Email error: ${mailErr.message}. `;
    }
  }

  // 4. Deliver WhatsApp Alert
  const phone = candidate.isWhatsappSameAsMobile ? candidate.phone : (candidate.whatsappNumber || candidate.phone);
  if (candidate.whatsappAlerts !== false && phone) {
    channels.push("whatsapp");
    try {
      // Template arguments for daily digest: e.g. user name and number of jobs matched
      await sendWhatsAppMessage(phone, "daily_job_digest", {
        name: candidate.name || "Provider",
        count: String(matchedJobs.length),
      });
      whatsappStatus = "sent";
    } catch (waErr) {
      console.error(`[Digest Generation] WhatsApp delivery failed for phone ${phone}:`, waErr.message);
      whatsappStatus = "failed";
      errorMsg += `WhatsApp error: ${waErr.message}. `;
    }
  }

  // 5. Log Digest Result
  try {
    await createCandidateDigestLog({
      candidate: userId,
      date,
      jobsMatched: matchedJobIds,
      channels,
      emailStatus,
      whatsappStatus,
      error: errorMsg.trim(),
    });
  } catch (err) {
    if (err.code !== 'P2002') throw err;
  }

  console.log(`[Digest Generation] Digest processing completed for user ${userId}. Email: ${emailStatus}, WhatsApp: ${whatsappStatus}`);
}

/**
 * Initializes and starts the Candidate Digest Worker.
 */
function startCandidateDigestWorker() {
  const matchingEnabled = enabled('ENABLE_RECRUITER_MATCHING') || enabled('ENABLE_JOB_AI_MATCHING');
  if (!enabled('ENABLE_WORKERS') || !matchingEnabled || !enabled('ENABLE_COMMUNICATION_PROVIDERS')) {
    return null;
  }
  if (!queueSupported()) {
    console.warn("[Worker - Candidate Digest] BullMQ is disabled by environment variables. Worker not started.");
    return;
  }

  const redisConnection = getRedisClient();
  if (!redisConnection) {
    console.warn("[Worker - Candidate Digest] Redis connection not available. Worker not started.");
    return;
  }

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { userId, date } = job.data;
      console.log(`[Worker - Candidate Digest] Processing digest job ${job.id} for user ${userId} on date ${date}`);
      await generateAndSendDigest(userId, date);
    },
    {
      connection: redisConnection,
      concurrency: Math.max(1, Number(process.env.WORKER_CONCURRENCY || 5)),
      settings: {
        stalledInterval: 300000,
        drainDelay: 60000
      },
      metrics: null
    }
  );

  worker.on("ready", () => {
    console.log("[Worker - Candidate Digest] Worker is ready and listening on candidate-digest-queue.");
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker - Candidate Digest] Job ${job?.id || "unknown"} failed:`, err.message);
  });

  worker.on("error", (error) => {
    console.error("[Worker - Candidate Digest] Queue worker error:", error.message);
  });
}

function stopCandidateDigestWorker() {
  if (worker) {
    worker.close();
    worker = null;
    console.log("[Worker - Candidate Digest] Worker stopped.");
  }
}

module.exports = {
  startCandidateDigestWorker,
  stopCandidateDigestWorker,
  processCandidateDigestInline: generateAndSendDigest,
};
