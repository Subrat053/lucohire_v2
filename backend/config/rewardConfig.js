/**
 * Reward configuration for the partner/referral system.
 * These are default values — they can be overridden via AdminSetting
 * with keys prefixed with "reward_".
 */

const REWARD_DEFAULTS = {
  providerRegistrationReward: 0,       // Fixed reward when a provider registers via referral
  recruiterRegistrationReward: 0,      // Fixed reward when a recruiter registers via referral
  jobPostReward: 50,                   // Reward when a referred recruiter posts a job
  jobCompleteReward: 100,              // Reward when a referred provider completes a job
  planCommissionPercent: 40,           // Commission % on plan purchases by referred users
};

const getRewardConfig = async () => {
  try {
    const prisma = require('./prisma');
    const keys = Object.keys(REWARD_DEFAULTS).map((k) => `reward_${k}`);
    const settings = await prisma.adminSetting.findMany({ where: { key: { in: keys } } });

    const config = { ...REWARD_DEFAULTS };
    for (const setting of settings) {
      const configKey = setting.key.replace("reward_", "");
      if (configKey in config) {
        const value = Number(setting.value);
        if (Number.isFinite(value) && value >= 0) {
          config[configKey] = value;
        }
      }
    }
    return config;
  } catch {
    return { ...REWARD_DEFAULTS };
  }
};

module.exports = { REWARD_DEFAULTS, getRewardConfig };
