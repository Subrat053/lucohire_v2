const User = require('../../models/User');
const ProviderProfile = require('../../models/ProviderProfile');
const JobPost = require('../../models/JobPost');
const CandidateJobMatch = require('../../models/CandidateJobMatch');
const CountryConfig = require('../../models/CountryConfig');

/**
 * Triggers batch matching for all active candidates and active jobs
 */
const runSyncMatching = async () => {
  console.log('[AI Matching] Running job matching scorer...');
  
  // 1. Fetch active providers
  const providers = await ProviderProfile.find({ isApproved: true }).populate('user');
  if (providers.length === 0) return;

  // 2. Fetch latest active external and internal jobs (last 2 days to restrict computation size)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 2);

  const allJobsList = await JobPost.find({ 
    $or: [
      { status: 'active' },
      { status: { $exists: false } }
    ],
    isActive: true, // covers external
    createdAt: { $gte: cutoffDate } 
  }).lean();

  const allJobs = allJobsList.map(j => ({
    ...j,
    _id: j._id,
    jobCollection: 'JobPost',
    skills: j.skillsTags && j.skillsTags.length > 0 ? j.skillsTags : (j.skill ? [j.skill] : []),
    salaryMin: j.budgetMin || j.salaryMin || 0,
    salaryMax: j.budgetMax || j.salaryMax || 0,
    jobType: j.jobType || j.scheduleType || 'full_time'
  }));

  let matchesCreated = 0;

  for (const provider of providers) {
    const user = provider.user;
    if (!user || user.isBlocked) continue;

    // Check preferred countries, do not match if country is inactive
    const userCountryCode = user.country || 'US';
    const countryConfig = await CountryConfig.findOne({ countryCode: userCountryCode.toUpperCase() });
    if (countryConfig && !countryConfig.isActive) {
      continue; // Skip matching for inactive country
    }

    const providerSkills = (provider.skills || []).map(s => String(s).toLowerCase().trim());
    if (providerSkills.length === 0) continue;

    for (const job of allJobs) {
      // Skip if country mismatch
      if (job.countryCode && job.countryCode !== userCountryCode) {
        continue;
      }

      // Calculate Scores
      // 1. Skill Score (40%)
      let skillScore = 0;
      const jobSkills = (job.skillsTags || []).map(s => String(s).toLowerCase().trim());
      const intersection = providerSkills.filter(s => jobSkills.includes(s) || job.title.toLowerCase().includes(s));
      if (intersection.length > 0) {
        skillScore = 100;
      } else {
        // Substring fallback
        const titleWords = job.title.toLowerCase().split(/\s+/);
        const matchedWords = providerSkills.filter(s => titleWords.some(w => w.includes(s) || s.includes(w)));
        skillScore = matchedWords.length > 0 ? 50 : 0;
      }

      // 2. Title Score (15%)
      let titleScore = 0;
      const desiredTitle = String(provider.title || '').toLowerCase();
      if (desiredTitle && job.title.toLowerCase().includes(desiredTitle)) {
        titleScore = 100;
      } else {
        titleScore = skillScore * 0.7; // partial weight from skills
      }

      // 3. Experience Score (15%)
      let experienceScore = 80; // Default reasonable starting score
      const providerExp = Number(provider.experienceYears) || 0;
      if (job.description.toLowerCase().includes('senior') && providerExp < 5) {
        experienceScore = 40;
      } else if (job.description.toLowerCase().includes('lead') && providerExp < 7) {
        experienceScore = 30;
      } else if (providerExp >= 2) {
        experienceScore = 100;
      }

      // 4. Location Score (15%)
      let locationScore = 0;
      const jobCity = String(job.city || '').toLowerCase().trim();
      const providerCity = String(provider.city || '').toLowerCase().trim();
      if (jobCity && providerCity && jobCity === providerCity) {
        locationScore = 100;
      } else if (job.jobType === 'remote' || String(job.title).toLowerCase().includes('remote')) {
        locationScore = 100; // Remote matches any location
      } else {
        locationScore = 30; // same country code fallback
      }

      // 5. Job Type Score (10%)
      let jobTypeScore = 70; // baseline
      const desiredJobType = String(provider.jobType || 'full_time').toLowerCase();
      const jobTypeStr = String(job.jobType || 'full_time').toLowerCase();
      if (desiredJobType === jobTypeStr || jobTypeStr.includes(desiredJobType)) {
        jobTypeScore = 100;
      }

      // 6. Salary Score (5%)
      let salaryScore = 100; // default if not specified
      const expectedSalary = Number(provider.expectedSalary) || 0;
      if (expectedSalary > 0 && job.salaryMax > 0 && expectedSalary > job.salaryMax) {
        const gapRatio = (expectedSalary - job.salaryMax) / job.salaryMax;
        salaryScore = Math.max(0, 100 - (gapRatio * 100));
      }

      // Calculate Weighted Total Score
      const matchScore = Math.round(
        (skillScore * 0.40) +
        (titleScore * 0.15) +
        (experienceScore * 0.15) +
        (locationScore * 0.15) +
        (jobTypeScore * 0.10) +
        (salaryScore * 0.05)
      );

      // Only save matches with a minimum quality threshold
      if (matchScore >= 60) {
        try {
          await CandidateJobMatch.findOneAndUpdate(
            { userId: user._id, jobId: job._id },
            {
              userId: user._id,
              jobId: job._id,
              jobCollection: job.jobCollection,
              matchScore,
              skillScore,
              locationScore,
              experienceScore,
              salaryScore,
              jobTypeScore,
              reason: `Matched based on skill set (${skillScore}%) and geographic location (${locationScore}%)`,
              isNotified: false
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          matchesCreated++;
        } catch (err) {
          // ignore duplicate writes
        }
      }
    }
  }

  console.log(`[AI Matching] Scoring complete. Created/Updated ${matchesCreated} matches.`);
};

module.exports = {
  runSyncMatching
};
