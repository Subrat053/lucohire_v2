const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { createNotification } = require('../services/notificationService');
const { getActiveSubscription } = require('../middleware/subscription');
const {
  findJobById,
  mapJobs,
  updateJob,
} = require('../services/jobPersistenceService');
const {
  createApplication,
  findApplicationByJobAndProvider,
  listJobApplications,
  listProviderApplications,
  updateApplicationForRecruiter,
} = require('../services/applicationPersistenceService');

let cachedExperienceStrings = null;
let lastCacheTime = 0;

const enabled = (name) => String(process.env[name] || '').toLowerCase() === 'true';

const getMatchingExperienceStrings = async (expStr) => {
  if (!expStr) return null;
  const trimmed = String(expStr).trim();
  const numMatch = trimmed.match(/\d+/);
  
  // If it's not a number, fallback to exact/regex match
  if (!numMatch) {
    return [new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')];
  }

  const targetNum = parseInt(numMatch[0]);

  if (!cachedExperienceStrings || Date.now() - lastCacheTime > 5 * 60 * 1000) {
    const internalRows = await prisma.jobPost.findMany({
      distinct: ['experienceRequired'],
      select: { experienceRequired: true },
    });
    const internalStrings = internalRows.map((row) => row.experienceRequired);
    const externalRows = await prisma.externalJob.findMany({
      distinct: ['experienceRequired'],
      select: { experienceRequired: true },
    });
    const externalStrings = externalRows.map((row) => row.experienceRequired);
    // Combine and deduplicate
    cachedExperienceStrings = [...new Set([...internalStrings, ...externalStrings])].filter(Boolean);
    lastCacheTime = Date.now();
  }

  const matched = cachedExperienceStrings.filter(exp => {
    if (!exp) return false;
    const rangeMatch = exp.match(/^(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
      return targetNum >= parseInt(rangeMatch[1]) && targetNum <= parseInt(rangeMatch[2]);
    }
    const plusMatch = exp.match(/^(\d+)\+/);
    if (plusMatch) {
      const min = parseInt(plusMatch[1]);
      if (min >= 10) return targetNum >= min;
      return targetNum >= min && targetNum <= min + 3;
    }
    // Handle exact number match (e.g. "5 Years" or just "5")
    const exactMatch = exp.match(/^(\d+)/);
    if (exactMatch && !exp.includes('-') && !exp.includes('+')) {
       return targetNum === parseInt(exactMatch[1]);
    }
    // Handle Fresher for 0 years
    if (targetNum === 0 && exp.toLowerCase().includes('fresher')) {
      return true;
    }
    return false;
  });
  
  // If we matched known strings, return them. If none matched, we can return the exact string to be safe.
  return matched.length > 0 ? matched : [trimmed];
};

const distanceKmBetween = (lat1, lng1, lat2, lng2) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

// @desc    Browse available jobs (for providers)
// @route   GET /api/jobs?skill=&city=&page=&limit=&origin=&country=
const getAvailableJobs = async (req, res) => {
  try {
    const { skill, city, lat, lng, radius, page = 1, limit = 20, origin = 'all', country, experienceRequired } = req.query;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skipNum = (pageNum - 1) * limitNum;

    let internalJobs = [];
    let externalJobs = [];
    let totalInternal = 0;
    let totalExternal = 0;

    // 1. Build the direct Prisma filter for internal jobs.
    const internalWhere = {
      status: 'active',
      isActive: true,
      AND: [{ OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }] }],
    };
    if (skill) {
      const term = skill.trim();
      internalWhere.AND.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { skill: { contains: term, mode: 'insensitive' } },
          { skillsTags: { has: term } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    if (country) {
      internalWhere.countryCode = { equals: country.trim(), mode: 'insensitive' };
    }
    let internalExperienceOr = null;
    if (experienceRequired) {
      if (experienceRequired.toLowerCase() === 'fresher') {
        internalExperienceOr = [
          { experienceRequired: { contains: 'fresher', mode: 'insensitive' } },
          { experienceRequired: { contains: 'entry', mode: 'insensitive' } },
          { experienceRequired: { contains: 'none', mode: 'insensitive' } },
          { experienceRequired: '' },
        ];
      } else {
        const matchedConditions = await getMatchingExperienceStrings(experienceRequired);
        if (matchedConditions && matchedConditions.length > 0) {
          internalExperienceOr = matchedConditions.map((condition) => ({
            experienceRequired: condition instanceof RegExp
              ? { contains: String(experienceRequired).trim(), mode: 'insensitive' }
              : condition,
          }));
        }
      }
      if (internalExperienceOr) internalWhere.AND.push({ OR: internalExperienceOr });
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radiusNum = Number(radius) || 50; // Default 50km
    const hasCoordinates = Number.isFinite(latNum) && Number.isFinite(lngNum);
    if (!hasCoordinates && city) {
      internalWhere.city = { contains: city.trim(), mode: 'insensitive' };
    }

    // 2. Build Filter for External Jobs (ExternalJob)
    const externalFilter = { isActive: true, AND: [] };
    if (skill) {
      externalFilter.AND.push({ OR: [
        { title: { contains: skill.trim(), mode: 'insensitive' } },
        { skillsTags: { has: skill.trim() } },
        { description: { contains: skill.trim(), mode: 'insensitive' } },
      ] });
    }
    if (country) {
      externalFilter.countryCode = { equals: country.trim(), mode: 'insensitive' };
    }
    if (city) {
      externalFilter.city = { contains: city.trim(), mode: 'insensitive' };
    }
    if (internalExperienceOr) {
      externalFilter.AND.push({ OR: internalExperienceOr });
    }

    // 3. Query Database according to "origin"
    const fetchInternal = (origin === 'all' || origin === 'internal');
    const fetchExternal = (origin === 'all' || origin === 'external');

    // We query with limit = skipNum + limitNum so that we can sort and paginate combined jobs in memory correctly.
    const queryLimit = skipNum + limitNum;

    const promises = [];
    if (fetchInternal) {
      promises.push(
        prisma.jobPost.findMany({
          where: internalWhere,
          include: { recruiterRecord: { select: { id: true, name: true } } },
          orderBy: [{ isBoosted: 'desc' }, { createdAt: 'desc' }],
          ...(!hasCoordinates ? { take: queryLimit } : {}),
        }).then((rows) => {
            let mappedRows = mapJobs(rows);
            if (hasCoordinates) {
              mappedRows = mappedRows.filter((job) => Number.isFinite(job.latitude)
                && Number.isFinite(job.longitude)
                && distanceKmBetween(latNum, lngNum, job.latitude, job.longitude) <= radiusNum);
              totalInternal = mappedRows.length;
              mappedRows = mappedRows.slice(0, queryLimit);
            }
            internalJobs = mappedRows.map(j => ({
              ...j,
              isExternal: false,
              job_origin: 'internal',
              apply_mode: 'internal_apply',
              skills: j.skill ? [j.skill] : []
            }));
          }),
        ...(!hasCoordinates
          ? [prisma.jobPost.count({ where: internalWhere }).then(c => { totalInternal = c; })]
          : []),
      );
    }
    if (fetchExternal) {
      promises.push(
        prisma.externalJob.findMany({
          where: externalFilter,
          orderBy: { createdAt: 'desc' },
          take: queryLimit,
        }).then((rows) => {
            externalJobs = withLegacyIds(rows).map(j => ({
              ...j,
              isExternal: true,
              job_origin: j.jobOrigin || 'ats',
              apply_mode: j.applyMode || 'external_redirect',
              apply_url: j.applyUrl,
              skills: j.skillsTags
            }));
          }),
        prisma.externalJob.count({ where: externalFilter }).then(c => { totalExternal = c; })
      );
    }

    await Promise.all(promises);

    // 4. Combine and Sort
    let combinedJobs = [...internalJobs, ...externalJobs];
    combinedJobs.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Slice for current page pagination
    const paginatedJobs = combinedJobs.slice(skipNum, skipNum + limitNum);
    const totalJobs = totalInternal + totalExternal;

    // 5. Check user applications (for internal jobs)
    if (req.user && paginatedJobs.length > 0) {
      const internalJobIds = paginatedJobs.filter(j => !j.isExternal).map(j => j._id);
      if (internalJobIds.length > 0) {
        const applications = await prisma.application.findMany({
          where: { provider: String(req.user._id), jobPost: { in: internalJobIds.map(String) } },
          select: { jobPost: true },
        });
        const appliedSet = new Set(applications.map(a => String(a.jobPost)));
        for (const job of paginatedJobs) {
          if (!job.isExternal) {
            job.hasApplied = appliedSet.has(job._id.toString());
          }
        }
      }
    }

    res.json({
      jobs: paginatedJobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalJobs,
        pages: Math.ceil(totalJobs / limitNum)
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Apply to a job (provider)
// @route   POST /api/jobs/:jobId/apply
const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;

    const job = await findJobById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.status !== 'active' || job.isActive === false
      || (job.expiresAt && new Date(job.expiresAt) <= new Date())) {
      return res.status(400).json({ message: 'This job is no longer active' });
    }

    // Check duplicate application
    const existing = await findApplicationByJobAndProvider(jobId, req.user._id);
    if (existing) return res.status(400).json({ message: 'You have already applied to this job' });

    const application = await createApplication({
      job,
      providerId: req.user._id,
      coverLetter: coverLetter || '',
    });

    // Create a lead for the recruiter
    await prisma.lead.upsert({
      where: {
        provider_recruiter_jobPost: {
          provider: String(req.user._id),
          recruiter: String(job.recruiter),
          jobPost: String(job.id),
        },
      },
      create: {
        provider: String(req.user._id),
        recruiter: String(job.recruiter),
        jobPost: String(job.id),
        type: 'job_match',
      },
      update: {},
    });

    // Notify the recruiter
    await createNotification({
      userId: job.recruiter,
      type: 'NEW_LEAD',
      title: 'New Lead',
      message: 'You have a new lead',
      data: { jobId: job._id, applicationId: application._id, providerId: req.user._id },
    });

    res.status(201).json({ message: 'Application submitted', application });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get my applications (provider)
// @route   GET /api/jobs/my-applications
const getMyApplications = async (req, res) => {
  try {
    const applications = await listProviderApplications(req.user._id);
    res.json({ applications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get applications for my job (recruiter)
// @route   GET /api/jobs/:jobId/applications
const getJobApplications = async (req, res) => {
  try {
    const job = await findJobById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const applications = await listJobApplications(req.params.jobId);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update application status (recruiter)
// @route   PUT /api/jobs/applications/:applicationId
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const result = await updateApplicationForRecruiter(
      req.params.applicationId,
      req.user._id,
      { status },
    );
    if (!result.application) return res.status(404).json({ message: 'Application not found' });

    if (!result.authorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const application = result.application;

    // Notify the provider about the status change
    await createNotification({
      userId: application.provider,
      type: 'ADMIN_ALERT',
      title: 'Application Update',
      message: `Your application for "${application.jobPost.title}" was ${status}`,
      data: { applicationId: application._id, status },
    });

    res.json({ message: 'Application updated', application });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get jobs nearby coordinates
// @route   GET /api/jobs/nearby
const getNearbyJobs = async (req, res) => {
  try {
    const { lat, lng, radius, page = 1, limit = 20, experienceRequired, skill, city } = req.query;

    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radiusNum = Number(radius) || 50; // Default 50km

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ message: "Invalid latitude or longitude coordinates." });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const baseQuery = {
      status: 'active',
      isActive: true,
      OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
    };
    if (skill) {
      baseQuery.skill = { contains: skill.trim(), mode: 'insensitive' };
    }
    if (city) {
      baseQuery.city = { contains: city.trim(), mode: 'insensitive' };
    }
    if (experienceRequired) {
      if (experienceRequired.toLowerCase() === 'fresher') {
        baseQuery.AND = [{ OR: [
          { experienceRequired: { contains: 'fresher', mode: 'insensitive' } },
          { experienceRequired: { contains: 'entry', mode: 'insensitive' } },
          { experienceRequired: { contains: 'none', mode: 'insensitive' } },
          { experienceRequired: '' },
        ] }];
      } else {
        const matchedConditions = await getMatchingExperienceStrings(experienceRequired);
        if (matchedConditions && matchedConditions.length > 0) {
          baseQuery.AND = [{ OR: matchedConditions.map((condition) => ({
            experienceRequired: condition instanceof RegExp
              ? { contains: String(experienceRequired).trim(), mode: 'insensitive' }
              : condition,
          })) }];
        }
      }
    }

    const rows = await prisma.jobPost.findMany({
      where: { ...baseQuery, latitude: { not: null }, longitude: { not: null } },
      include: { recruiterRecord: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const populatedJobs = mapJobs(rows)
      .map((job) => ({
        ...job,
        distance: distanceKmBetween(latNum, lngNum, job.latitude, job.longitude),
      }))
      .filter((job) => job.distance <= radiusNum)
      .slice(skip, skip + parseInt(limit));

    let appliedSet = new Set();
    if (req.user) {
      const jobIds = populatedJobs.map((j) => j._id);
      const applications = await prisma.application.findMany({
        where: { provider: String(req.user._id), jobPost: { in: jobIds.map(String) } },
        select: { jobPost: true },
      });
      appliedSet = new Set(applications.map((a) => a.jobPost.toString()));
    }

    const formattedJobs = populatedJobs.map((job) => {
      const distanceKm = job.distance ? Math.round(job.distance * 10) / 10 : 0;
      return {
        ...job,
        distance: distanceKm,
        hasApplied: req.user ? appliedSet.has(job._id.toString()) : false,
      };
    });

    res.json({
      success: true,
      jobs: formattedJobs,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getJobExpiryPrediction = async (req, res) => {
  try {
    if (!enabled('ENABLE_JOB_AI_EXPIRY')) {
      return res.status(503).json({
        success: false,
        message: 'Job expiry prediction is disabled',
        code: 'JOB_AI_EXPIRY_DISABLED',
      });
    }
    const aiDecisionEngine = require('../services/ai/aiDecisionEngine.service');
    const jobId = req.params.id;
    const job = await findJobById(jobId);
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Call the AI Decision Engine
    const predictionData = await aiDecisionEngine.predictOpportunityExpiry(job);

    res.json({
      success: true,
      data: predictionData
    });
  } catch (error) {
    console.error('Error predicting job expiry:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get recommended jobs for guests (based on skills string)
// @route   POST /api/jobs/guest-recommended
const getGuestRecommendedJobs = async (req, res) => {
  try {
    const { skills, mobileNumber } = req.body;
    
    // In a real scenario, you'd parse skills/CV and run a full match.
    const filter = {
      status: 'active',
      isActive: true,
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
    };

    if (skills && typeof skills === 'string') {
      const skillsArr = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillsArr.length > 0) {
        filter.AND.push({ OR: skillsArr.flatMap((term) => [
          { skill: { contains: term, mode: 'insensitive' } },
          { speciality: { contains: term, mode: 'insensitive' } },
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { skillsTags: { has: term } },
        ]) });
      }
    }

    const jobs = mapJobs(await prisma.jobPost.findMany({
      where: filter,
      include: { recruiterRecord: {
        select: {
          id: true,
          name: true,
          avatar: true,
          recruiterProfile_userLinks: { select: { companyName: true, profilePhoto: true }, take: 1 },
        },
      } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }));

    // Calculate a dummy match score for each
    const jobsWithScores = jobs.map(job => {
      const jobObj = { ...job };
      jobObj.matchScore = Math.floor(Math.random() * 20) + 75; // 75-95%
      return jobObj;
    });

    // Removed fallback logic to ensure we only return relevant jobs


    res.json({
      success: true,
      data: {
        score: Math.floor(Math.random() * 15) + 70, // 70-85%
        jobs: jobsWithScores
      }
    });
  } catch (error) {
    console.error('Error getting guest recommended jobs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Boost a job
// @route   POST /api/jobs/:jobId/boost
// @access  Private (Recruiter)
const boostJob = async (req, res) => {
  try {
    const { days } = req.body;
    const requestedDays = parseInt(days) || 7;
    
    const job = await findJobById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to boost this job' });
    }

    // Boost the job (subscription limits bypassed for local testing)
    const boostedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + requestedDays);
    const boostedJob = await updateJob(job.id, {
      isBoosted: true,
      boostedAt,
      boostExpiresAt: expiresAt,
    });

    res.status(200).json({ 
      message: `Job successfully boosted for ${requestedDays} days.`,
      job: boostedJob,
    });

  } catch (error) {
    console.error('Boost error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPublicJobById = async (req, res) => {
  try {
    const { isValidId } = require('../utils/id');
    if (!isValidId(req.params.jobId)) {
      return res.status(404).json({ message: 'Job not found' });
    }

    let job = await findJobById(req.params.jobId, {
      includeRecruiter: true,
      recruiterSelect: {
        id: true,
        name: true,
        avatar: true,
        recruiterProfile_userLinks: { select: { companyName: true, profilePhoto: true }, take: 1 },
      },
    });
    if (job && (job.status !== 'active' || job.isActive === false
      || (job.expiresAt && new Date(job.expiresAt) <= new Date()))) {
      job = null;
    }
    if (job) {
      job.isExternal = false;
      job.job_origin = 'internal';
      job.apply_mode = 'internal_apply';
      job.skills = job.skill ? [job.skill] : [];
    } else {
      job = withLegacyId(await prisma.externalJob.findUnique({
        where: { id: String(req.params.jobId) },
      }));
      if (job) {
        job.isExternal = true;
        job.job_origin = job.source || 'external';
        job.apply_mode = 'external_link';
      }
    }
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error fetching public job:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAvailableJobs,
  applyToJob,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  getNearbyJobs,
  getJobExpiryPrediction,
  getGuestRecommendedJobs,
  boostJob,
  getPublicJobById
};
