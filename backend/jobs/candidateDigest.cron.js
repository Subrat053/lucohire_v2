const cron = require("node-cron");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const User = require("../models/User");
const { findCandidateDigestLog } = require("../services/communicationPersistenceService");
const { candidateDigestQueue } = require("../queues/candidateDigest.queue");
const { enabled } = require('../middleware/operationalFeatureGate');

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Hourly Cron Job: Runs at the start of every hour (e.g., 09:00, 10:00, etc.)
 * Checks all provider users and enqueues digest tasks if their local time is 9:00 AM.
 */
function startCandidateDigestCron() {
  const matchingEnabled = enabled('ENABLE_RECRUITER_MATCHING') || enabled('ENABLE_JOB_AI_MATCHING');
  if (!enabled('ENABLE_CRON') || !matchingEnabled || !enabled('ENABLE_COMMUNICATION_PROVIDERS')) {
    return null;
  }
  // Runs every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log(`[CRON - Candidate Digest] Starting hourly 9 AM local check at UTC: ${new Date().toISOString()}`);
    try {
      // Fetch all active provider users
      const candidates = await User.find({
        isActive: true,
        isBlocked: false,
        roles: "provider",
      });

      let enqueuedCount = 0;

      for (const candidate of candidates) {
        const tz = candidate.timezone || DEFAULT_TIMEZONE;
        
        let localTime;
        try {
          localTime = dayjs().tz(tz);
        } catch (e) {
          // If timezone name is invalid, fallback to DEFAULT_TIMEZONE
          localTime = dayjs().tz(DEFAULT_TIMEZONE);
        }

        const localHour = localTime.hour();
        const dateStr = localTime.format("YYYY-MM-DD");

        // Target exactly 9 AM local time
        if (localHour === 9) {
          // Check if already sent or logged for today
          const alreadyLogged = await findCandidateDigestLog({
            candidate: candidate._id,
            date: dateStr,
          });

          if (alreadyLogged) {
            continue;
          }

          if (!candidateDigestQueue) {
            // Fallback: Run inline for local development / disabled queues
            try {
              const { processCandidateDigestInline } = require("../workers/candidateDigest.worker");
              await processCandidateDigestInline(candidate._id.toString(), dateStr);
              enqueuedCount++;
            } catch (inlineErr) {
              console.error(`[CRON - Candidate Digest] Error running inline fallback for user ${candidate._id}:`, inlineErr.message);
            }
            continue;
          }

          // Deterministic jobId to prevent duplicates in BullMQ queue
          const jobId = `digest-${candidate._id}-${dateStr}`;

          try {
            await candidateDigestQueue.add(
              "send-candidate-digest",
              {
                userId: candidate._id.toString(),
                date: dateStr,
                timezone: tz,
              },
              {
                jobId,
                // Automatically remove on complete/fail to keep Redis clean
                removeOnComplete: true,
                removeOnFail: true,
              }
            );
            enqueuedCount++;
          } catch (queueErr) {
            console.error(`[CRON - Candidate Digest] Error enqueuing digest for user ${candidate._id}:`, queueErr.message);
          }
        }
      }

      console.log(`[CRON - Candidate Digest] Completed 9 AM local check. Enqueued ${enqueuedCount} digests.`);
    } catch (err) {
      console.error("[CRON - Candidate Digest] Error running hourly cron:", err);
    }
  });

  console.log("[CRON - Candidate Digest] Hourly 9 AM local digest cron scheduled.");
}

module.exports = {
  startCandidateDigestCron,
};
