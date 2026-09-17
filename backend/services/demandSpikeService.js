const JobSearchIntent = require('../models/JobSearchIntent');
const ProviderProfile = require('../models/ProviderProfile');
const DemandSnapshot = require('../models/DemandSnapshot');
const BoostSuggestion = require('../models/BoostSuggestion');
const { createNotification } = require('./notificationService');
const { generateBoostMessage } = require('./aiAssistService');

async function runDailyDemandSpikeAnalysis() {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const demandAgg = await JobSearchIntent.aggregate([
    {
      $match: {
        createdAt: { $gte: start },
        extractedSkill: { $ne: '' },
        extractedCity: { $ne: '' },
      },
    },
    {
      $group: {
        _id: {
          skill: '$extractedSkill',
          city: '$extractedCity',
        },
        demandCount: { $sum: 1 },
      },
    },
    { $sort: { demandCount: -1 } },
    { $limit: 100 },
  ]);

  const snapshots = [];

  for (const row of demandAgg) {
    const skill = String(row._id.skill || '').trim();
    const city = String(row._id.city || '').trim();
    if (!skill || !city) continue;

    // eslint-disable-next-line no-await-in-loop
    const supplyCount = await ProviderProfile.countDocuments({
      isApproved: true,
      city: { $regex: '^' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      skills: { $regex: skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    });

    const demandCount = Number(row.demandCount || 0);
    const unmetDemandScore = Math.max(0, demandCount - supplyCount);

    // eslint-disable-next-line no-await-in-loop
    const snapshot = await DemandSnapshot.findOneAndUpdate(
      {
        skill,
        city,
        snapshotDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      },
      {
        $set: {
          demandCount,
          supplyCount,
          unmetDemandScore,
          confidence: demandCount >= 5 ? 0.8 : 0.5,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    snapshots.push(snapshot);

    if (unmetDemandScore < Math.max(3, Number(process.env.DEMAND_SPIKE_MIN_SCORE || 3))) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const candidateProviders = await ProviderProfile.find({
      isApproved: true,
      city: { $regex: '^' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      skills: { $regex: skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    })
      .sort({ rating: -1, boostWeight: -1 })
      .limit(20)
      .lean();

    for (const provider of candidateProviders) {
      // eslint-disable-next-line no-await-in-loop
      const ai = await generateBoostMessage({
        skill,
        city,
        unmetDemandScore,
      }, {
        userId: provider.user,
        role: 'provider',
      });

      // eslint-disable-next-line no-await-in-loop
      const suggestion = await BoostSuggestion.create({
        providerId: provider.user,
        skill,
        city,
        message: ai.output.message,
        status: 'queued',
      });

      // eslint-disable-next-line no-await-in-loop
      await createNotification({
        userId: provider.user,
        type: 'BOOST_SUGGESTION',
        title: 'Demand spike detected',
        message: ai.output.message,
        data: {
          suggestionId: suggestion._id,
          skill,
          city,
          unmetDemandScore,
        },
      });

      suggestion.status = 'sent';
      suggestion.sentAt = new Date();
      // eslint-disable-next-line no-await-in-loop
      await suggestion.save();
    }
  }

  return {
    processed: snapshots.length,
    snapshotIds: snapshots.map((item) => item._id),
  };
}

module.exports = {
  runDailyDemandSpikeAnalysis,
};
