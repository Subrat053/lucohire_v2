const prisma = require('../config/prisma');
const { createVisitHistory } = require('../services/auditPersistenceService');
const { createNotification } = require('../services/notificationService');
const { sendMail } = require('../services/mailService');
const { consumeJobApplication } = require('../services/providerUsageService');
const {
  findProviderProfileByUserId,
  saveProviderProfile,
  updateProviderProfile,
} = require('../services/providerProfilePersistenceService');
const { saveRecruiterProfile } = require('../services/recruiterCompanyPersistenceService');
const { createMagicLinkToken, prepareUserData } = require('../services/authPersistenceService');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { findJobById, mapJobs } = require('../services/jobPersistenceService');
const {
  createApplication,
  findApplicationByJobAndProvider,
  findApplicationDetails,
  findSavedJob,
  listJobApplications,
  listProviderApplications,
  listSavedJobs,
  toggleSavedJob: toggleSavedJobRecord,
  updateApplicationForRecruiter,
  withdrawApplication: withdrawApplicationRecord,
} = require('../services/applicationPersistenceService');
const {
  consumeSubscriptionUnlockCredit,
  findActiveUserSubscription,
  findProfileUnlock,
  upsertProfileUnlock,
} = require('../services/billingPersistenceService');

const enabled = (name) => String(process.env[name] || '').toLowerCase() === 'true';

// ==========================================
// PROVIDER SIDE CONTROLLERS
// ==========================================

// @desc    Get active jobs for provider panel with basic recruiter company preview
// @route   GET /api/provider/jobs
const getProviderJobs = async (req, res) => {
  try {
    const { skill, city, budgetType, scheduleType, workMode, experienceRequired, origin = 'all', source, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skipVal = (pageNum - 1) * limitNum;

    // Load provider country context — prefer ProviderProfile.countryCode, fallback to user.country
    let providerCountry = 'US';
    let providerCity = null;
    let providerDesignation = null;
    let hasProviderCoordinates = false;
    let providerSkills = [];
    if (req.user) {
      const provider = await findProviderProfileByUserId(req.user._id);
      if (provider) {
        providerCity = provider.city;
        providerDesignation = provider.designation;
        const rawCountry = provider.countryCode || provider.country || req.user?.country;
        if (rawCountry) {
          if (rawCountry.trim().length === 2) {
            providerCountry = rawCountry.trim().toUpperCase();
          } else {
            const match = await prisma.countryConfig.findFirst({
              where: { OR: [
                { countryName: { equals: rawCountry.trim(), mode: 'insensitive' } },
                { countryCode: { equals: rawCountry.trim(), mode: 'insensitive' } },
              ] },
            });
            if (match && match.countryCode) {
              providerCountry = match.countryCode.toUpperCase();
            }
          }
        }
        providerSkills = (provider.roles && provider.roles.length > 0) ? provider.roles : (provider.skills || []);
        let expandedSkills = provider.expandedSkills || [];

        // AI Skill Expansion
        if (enabled('ENABLE_JOB_AI_MATCHING')
          && providerSkills.length > 0 && expandedSkills.length === 0) {
          try {
            const { expandSkillsWithAI } = require('../services/ai/llmService');
            expandedSkills = await expandSkillsWithAI(providerSkills);
            if (expandedSkills.length > 0) {
              provider.expandedSkills = expandedSkills;
              await updateProviderProfile(req.user._id, { expandedSkills });
            }
          } catch (err) {
            console.error('Failed to expand skills with AI:', err);
          }
        }

        const allSearchSkills = [...new Set([...providerSkills, ...expandedSkills])];
        if (providerDesignation) allSearchSkills.push(providerDesignation);
        providerSkills = allSearchSkills.filter(s => s && typeof s === 'string' && s.trim().length > 0); // Overwrite providerSkills so the rest of the logic uses both

        const tier = provider.tier || provider.skillLevel || 'unskilled';
        if (['unskilled', 'semi-skilled'].includes(tier.toLowerCase())) {
          let coords = null;
          if (provider.geoPoint && provider.geoPoint.coordinates) {
            coords = provider.geoPoint.coordinates; // [lng, lat]
          } else if (provider.city && enabled('ENABLE_EXTERNAL_LOCATION_LOOKUPS')) {
            const { handelFetchStandardizedLocation } = require('../services/location/googlePlacesService');
            const geoMatches = await handelFetchStandardizedLocation(provider.city);
            if (geoMatches && geoMatches.length > 0 && geoMatches[0].latitude && geoMatches[0].longitude) {
              coords = [geoMatches[0].longitude, geoMatches[0].latitude];
            }
          }

          if (coords && (coords[0] !== 0 || coords[1] !== 0)) {
            hasProviderCoordinates = true;
          }
        }
      }
    }

    let expRegex = null;
    if (experienceRequired) {
      const trimmed = String(experienceRequired).trim();
      const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)/);
      const plusMatch = trimmed.match(/^(\d+)\+/);
      if (rangeMatch) {
        expRegex = new RegExp(`${rangeMatch[1]}\\s*(?:-|to)\\s*${rangeMatch[2]}`, 'i');
      } else if (plusMatch) {
        expRegex = new RegExp(`${plusMatch[1]}\\s*(?:\\+|plus|or more)`, 'i');
      } else {
        expRegex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
    }

    const internalWhere = {
      status: 'active',
      isActive: true,
      AND: [{ OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }] }],
    };
    if (source) internalWhere.source = String(source).toLowerCase();
    const searchTerms = skill
      ? [String(skill).trim()]
      : providerSkills.map((value) => String(value).trim()).filter(Boolean);
    if (searchTerms.length) {
      internalWhere.AND.push({ OR: searchTerms.flatMap((term) => [
        { title: { contains: term, mode: 'insensitive' } },
        { skill: { contains: term, mode: 'insensitive' } },
        { skillsTags: { has: term } },
        { description: { contains: term, mode: 'insensitive' } },
      ]) });
    }
    const locationTerm = city || (!hasProviderCoordinates && providerCity) || '';
    if (locationTerm) {
      const normalizedLocation = String(locationTerm).trim();
      internalWhere.AND.push(normalizedLocation.toLowerCase() === 'remote'
        ? { OR: [
          { city: { contains: 'remote', mode: 'insensitive' } },
          { locationText: { contains: 'remote', mode: 'insensitive' } },
          { workMode: 'remote' },
          { jobType: 'remote' },
          { sourceType: 'remote' },
        ] }
        : { OR: [
          { city: { contains: normalizedLocation, mode: 'insensitive' } },
          { locationText: { contains: normalizedLocation, mode: 'insensitive' } },
        ] });
    }
    if (budgetType) internalWhere.budgetType = budgetType;
    if (scheduleType) internalWhere.scheduleType = scheduleType;
    if (workMode) internalWhere.workMode = workMode;

    const externalQuery = { isActive: true, AND: [] };
    if (source) externalQuery.source = String(source).toLowerCase();
    if (searchTerms.length) {
      externalQuery.AND.push({ OR: searchTerms.flatMap((term) => [
        { title: { contains: term, mode: 'insensitive' } },
        { skillsTags: { has: term } },
        { description: { contains: term, mode: 'insensitive' } },
      ]) });
    }
    if (locationTerm) {
      const normalizedLocation = String(locationTerm).trim();
      externalQuery.AND.push(normalizedLocation.toLowerCase() === 'remote'
        ? { OR: [
          { city: { contains: 'remote', mode: 'insensitive' } },
          { locationText: { contains: 'remote', mode: 'insensitive' } },
          { sourceType: 'remote' },
        ] }
        : { OR: [
          { city: { contains: normalizedLocation, mode: 'insensitive' } },
          { locationText: { contains: normalizedLocation, mode: 'insensitive' } },
        ] });
    }

    if (expRegex) {
      externalQuery.AND.push({
        experienceRequired: { contains: String(experienceRequired).trim(), mode: 'insensitive' },
      });
      internalWhere.AND.push({
        experienceRequired: { contains: String(experienceRequired).trim(), mode: 'insensitive' },
      });
    }

    let internalTotal = 0;
    let externalTotal = 0;
    let internalJobsList = [];
    let externalJobsList = [];

    if (origin === 'internal' || origin === 'all') {
      internalTotal = await prisma.jobPost.count({ where: internalWhere });
    }
    if (origin === 'external' || origin === 'all') {
      externalTotal = await prisma.externalJob.count({ where: externalQuery });
    }

    const totalJobs = internalTotal + externalTotal;
    const queryLimit = limitNum;

    console.log(`[getProviderJobs] User: ${req.user?._id}, origin: ${origin}, totalJobs: ${totalJobs}, providerSkills:`, providerSkills);

    if (origin === 'internal' || origin === 'all') {
      if (internalJobsList.length === 0 && skipVal < internalTotal) {
        internalJobsList = mapJobs(await prisma.jobPost.findMany({
          where: internalWhere,
          include: { recruiterRecord: { select: { id: true, name: true, email: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          skip: skipVal,
          take: queryLimit,
        }));
      }
    }

    if (origin === 'external' || origin === 'all') {
      const remainingLimit = queryLimit - internalJobsList.length;
      if (remainingLimit > 0) {
        let externalSkip = 0;
        if (skipVal >= internalTotal) {
          externalSkip = skipVal - internalTotal;
        }
        externalJobsList = withLegacyIds(await prisma.externalJob.findMany({
          where: externalQuery,
          orderBy: { createdAt: 'desc' },
          skip: externalSkip,
          take: remainingLimit,
        }));
      }
    }

    // Tag jobs before merging
    const internalMapped = internalJobsList.map(j => ({ ...j, _trueExternal: false }));
    const externalMapped = externalJobsList.map(j => ({ ...j, _trueExternal: true }));

    const jobsList = [...internalMapped, ...externalMapped];

    // Format jobs for the frontend
    const jobs = jobsList.map(j => {
      if (!j._trueExternal) {
        return {
          ...j,
          isExternal: false,
          job_origin: 'internal',
          apply_mode: 'internal_apply',
          skills: j.skill ? [j.skill] : []
        };
      } else {
        return {
          ...j,
          isExternal: true,
          job_origin: j.jobOrigin || (j.source === 'jsearch' ? 'jsearch' : 'ats'),
          apply_mode: j.applyMode || 'external_redirect',
          externalUrl: j.applyUrl || j.externalUrl || j.url || '',
          apply_url: j.applyUrl || j.externalUrl || j.url || '',
          skills: j.skillsTags || [],
          skill: j.skillsTags?.[0] || (j.source === 'jsearch' ? 'JSearch Job' : 'Ingested vacancy'),
          budgetMin: j.budgetMin || j.salaryMin || 0,
          budgetMax: j.budgetMax || j.salaryMax || 0,
          budgetType: j.budgetType || (j.salaryPeriod === 'hourly' ? 'hourly' : j.salaryPeriod === 'yearly' ? 'yearly' : 'monthly')
        };
      }
    });

    console.log(`[getProviderJobs] Found ${jobs.length} unified jobs for origin=${origin}`);
    const total = totalJobs;

    // Check application status if logged in
    if (req.user) {
      const internalJobIds = jobs.filter(j => !j.isExternal).map(j => j._id);
      const applications = await prisma.application.findMany({
        where: { provider: String(req.user._id), jobPost: { in: internalJobIds.map(String) } },
        select: { jobPost: true, status: true },
      });

      const appliedMap = new Map(applications.map(a => [a.jobPost.toString(), a.status]));
      for (const job of jobs) {
        if (!job.isExternal) {
          job.hasApplied = appliedMap.has(job._id.toString());
          job.applicationStatus = appliedMap.get(job._id.toString()) || null;
        } else {
          // Check if candidate tracked click/apply in CandidateJobMatch
          const matchedState = await prisma.candidateJobMatch.findUnique({
            where: { userId_jobId: { userId: String(req.user._id), jobId: String(job._id) } },
          });
          job.hasApplied = !!(matchedState?.appliedAt);
        }
      }

      // Check Saved Jobs
      const savedJobs = await prisma.savedJob.findMany({
        where: { provider: String(req.user._id) },
      });
      const savedJobIds = new Set(
        savedJobs.map(sj => sj.isExternal ? sj.externalJob?.toString() : sj.jobPost?.toString())
      );
      for (const job of jobs) {
        job.isSaved = savedJobIds.has(job._id.toString());
      }
    }

    const cappedTotal = total;
    const finalPages = Math.ceil(cappedTotal / limitNum);

    res.json({
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: cappedTotal,
        pages: finalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get details of a specific job with recruiter visibility limits applied
// @route   GET /api/provider/jobs/:jobId
const getProviderJobById = async (req, res) => {
  try {
    const { jobId } = req.params;
    let job = await findJobById(jobId, {
      includeRecruiter: true,
      recruiterSelect: { id: true, name: true, email: true, avatar: true },
    });
    if (job && (job.status !== 'active' || job.isActive === false
      || (job.expiresAt && new Date(job.expiresAt) <= new Date()))) {
      job = null;
    }
    let isExternal = false;
    
    if (!job) {
      job = withLegacyId(await prisma.externalJob.findUnique({ where: { id: String(jobId) } }));
      if (job) {
        isExternal = true;
      }
    }

    if (!job) return res.status(404).json({ message: 'Job not found' });

    let hasApplied = false;
    let applicationStatus = null;
    let isSaved = false;

    if (req.user) {
      if (!isExternal) {
        const application = await findApplicationByJobAndProvider(job._id, req.user._id);
        if (application) {
          hasApplied = true;
          applicationStatus = application.status;
        }
      }

      const savedJobDoc = await findSavedJob(req.user._id, job._id, isExternal);
      if (savedJobDoc) {
        isSaved = true;
      }
    }

    res.json({
      job,
      hasApplied,
      applicationStatus,
      isSaved,
      isExternal
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Apply to a job post as a provider candidate
// @route   POST /api/provider/jobs/:jobId/apply
const applyToJobFromProvider = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { applicationMessage, coverLetter } = req.body;

    const job = await findJobById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.status !== 'active' || job.isActive === false
      || (job.expiresAt && new Date(job.expiresAt) <= new Date())) {
      return res.status(400).json({ message: 'This job is no longer active' });
    }

    // Validate that user is applying as a provider (must have or create provider profile)
    const providerProfile = await findProviderProfileByUserId(req.user._id);
    if (!providerProfile) {
      return res.status(400).json({
        message: 'A complete provider profile is required to apply to jobs. Please set up your profile.',
        profileRequired: true,
      });
    }

    // Prevent duplicate application
    const existing = await findApplicationByJobAndProvider(jobId, req.user._id);
    if (existing) return res.status(400).json({ message: 'You have already applied to this job' });

    // Track job application usage (non-blocking, for analytics only)
    consumeJobApplication(req.user._id, 1).catch(err =>
      console.error('Error tracking job application credit:', err.message)
    );

    const application = await createApplication({
      job,
      providerId: req.user._id,
      status: 'pending',
      coverLetter: applicationMessage || coverLetter || '',
    });

    // Create a matching lead for the recruiter
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

    // Send in-app notification
    await createNotification({
      userId: job.recruiter,
      type: 'NEW_LEAD',
      title: 'New Job Application',
      message: `A candidate has applied to your job posting: "${job.title}"`,
      data: { jobId: job._id, applicationId: application._id, providerId: req.user._id },
    });

    // Send email with magic link
    if (enabled('ENABLE_COMMUNICATION_PROVIDERS')) try {
      const recruiterUser = await prisma.user.findUnique({ where: { id: String(job.recruiter) } });
      if (recruiterUser && recruiterUser.email) {
        const magicLink = createMagicLinkToken();
        await prisma.user.update({
          where: { id: recruiterUser.id },
          data: prepareUserData(magicLink),
        });
        
        const redirectPath = `/recruiter/applications/${application._id}`;
        const magicUrl = `${process.env.FRONTEND_URL || req.get("origin")}/auth/magic?token=${magicLink.token}&redirect=${encodeURIComponent(redirectPath)}`;
        
        const subject = `New applicant for your job: ${job.title}`;
        const html = `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="margin:0 0 10px;color:#1f2937;">New Application!</h2>
            <p style="margin:0 0 14px;">A candidate has applied to your job posting: "${job.title}". Click the button below to instantly log in and view their profile:</p>
            <a href="${magicUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View Applicant</a>
            <p style="margin:14px 0 0;">This magic link will expire in 15 minutes.</p>
          </div>
        `;
        await sendMail({ to: recruiterUser.email, subject, text: `New applicant for: ${job.title}`, html });
      }
    } catch (err) {
      console.error('Failed to send magic link email to recruiter', err);
    }

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all applications submitted by the provider candidate
// @route   GET /api/provider/applications
const getProviderApplications = async (req, res) => {
  try {
    const applications = await listProviderApplications(req.user._id);

    res.json({ applications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// ==========================================
// RECRUITER SIDE CONTROLLERS
// ==========================================

// @desc    Get recruiter's own posted jobs with application counts
// @route   GET /api/recruiter/jobs
const getRecruiterJobs = async (req, res) => {
  try {
    const jobs = mapJobs(await prisma.jobPost.findMany({
      where: { recruiter: String(req.user._id), status: { not: 'deleted' } },
      include: { _count: { select: { application_jobPostLinks: true } } },
      orderBy: { createdAt: 'desc' },
    }));

    // Attach application count to each job post
    for (const job of jobs) {
      job.applicationCount = job._count?.application_jobPostLinks || 0;
      delete job._count;
    }

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get candidates who applied to a specific job post, respecting profile unlocks
// @route   GET /api/recruiter/jobs/:jobId/applications
const getRecruiterJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await findJobById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view applications for this job' });
    }

    const applications = await listJobApplications(jobId);

    const responseApplications = [];
    for (const app of applications) {
      if (!app.provider) continue;

      const providerProfile = await findProviderProfileByUserId(app.provider._id);

      let aiEval = null;
      if (enabled('ENABLE_JOB_AI_MATCHING')) {
        const candidateId = providerProfile?.id || providerProfile?._id;
        if (candidateId) {
          aiEval = withLegacyId(await prisma.aiEvaluation.findUnique({
            where: {
              jobId_candidateId: {
                jobId: String(jobId),
                candidateId: String(candidateId),
              },
            },
          }));
        }
      }

      // Check unlock status
      const isUnlocked = await findProfileUnlock(req.user._id, app.provider._id);

      const isUnlockedLegacy = await prisma.lead.findFirst({
        where: {
          recruiter: String(req.user._id),
          provider: String(app.provider._id),
          type: 'contact_unlock',
          isUnlocked: true,
        },
        select: { id: true },
      });

      const unlocked = !!(isUnlocked || isUnlockedLegacy);

      // Construct safe candidate preview
      const providerData = {
        _id: app.provider._id,
        name: app.provider.name,
        avatar: app.provider.avatar,
        skills: providerProfile?.skills || [],
        experience: providerProfile?.experience || '',
        location: providerProfile?.location || null,
        city: providerProfile?.city || '',
        pricing: providerProfile?.pricing || '',
        pricingType: providerProfile?.pricingType || '',
        description: providerProfile?.description || '',
        resumeUrl: providerProfile?.resumeUrl || '',
        portfolioLinks: providerProfile?.portfolioLinks || [],
        designation: providerProfile?.designation || '',
        company: providerProfile?.company || '',
        isUnlocked: unlocked,
      };

      providerData.email = app.provider.email;
      providerData.phone = app.provider.phone;

      responseApplications.push({
        _id: app._id,
        jobPost: app.jobPost,
        provider: providerData,
        status: app.status,
        coverLetter: app.coverLetter,
        aiMatch: aiEval ? aiEval.score : null,
        appliedAt: app.appliedAt,
        createdAt: app.createdAt,
      });
    }

    res.json(responseApplications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get detailed job application parameters by ID
// @route   GET /api/recruiter/applications/:applicationId
const getRecruiterApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await findApplicationDetails(applicationId);

    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.jobPost.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this application' });
    }

    const providerProfile = await findProviderProfileByUserId(application.provider._id);

    // Check unlock status
    const isUnlocked = await findProfileUnlock(req.user._id, application.provider._id);

    const isUnlockedLegacy = await prisma.lead.findFirst({
      where: {
        recruiter: String(req.user._id),
        provider: String(application.provider._id),
        type: 'contact_unlock',
        isUnlocked: true,
      },
      select: { id: true },
    });

    const unlocked = !!(isUnlocked || isUnlockedLegacy);

    const providerData = {
      _id: application.provider._id,
      name: application.provider.name,
      avatar: application.provider.avatar,
      skills: providerProfile?.skills || [],
      experience: providerProfile?.experience || '',
      location: providerProfile?.location || null,
      city: providerProfile?.city || '',
      pricing: providerProfile?.pricing || '',
      pricingType: providerProfile?.pricingType || '',
      description: providerProfile?.description || '',
      resumeUrl: providerProfile?.resumeUrl || '',
      portfolioLinks: providerProfile?.portfolioLinks || [],
      designation: providerProfile?.designation || '',
      company: providerProfile?.company || '',
      isUnlocked: unlocked,
    };

    providerData.email = application.provider.email;
    providerData.phone = application.provider.phone;

    res.json({
      _id: application._id,
      jobPost: application.jobPost,
      provider: providerData,
      status: application.status,
      coverLetter: application.coverLetter,
      appliedAt: application.appliedAt,
      createdAt: application.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Unlock a provider profile by deducting exactly 1 subscription credit
// @route   POST /api/recruiter/provider/:providerId/unlock
const unlockProviderProfile = async (req, res) => {
  try {
    const recruiterId = req.user._id;
    const { providerId } = req.params;
    const { jobId } = req.body;

    const providerUser = withLegacyId(await prisma.user.findUnique({
      where: { id: String(providerId) },
    }));
    if (!providerUser) return res.status(404).json({ message: 'Provider not found' });

    const providerProfile = await findProviderProfileByUserId(providerId);
    if (!providerProfile) return res.status(404).json({ message: 'Provider profile not found' });

    // Check if already unlocked
    const alreadyUnlocked = await findProfileUnlock(recruiterId, providerId);
    if (alreadyUnlocked) {
      return res.json({ message: 'Profile already unlocked', unlock: alreadyUnlocked });
    }

    // Check active, valid subscription
    const subscription = await findActiveUserSubscription(recruiterId, 'recruiter', false);

    let sourcePlanId = null;
    let subscriptionId = null;

    if (subscription) {
      if (subscription.unlockCreditsRemaining <= 0) {
        return res.status(403).json({
          message: 'No profile unlock credits remaining in your current subscription. Please upgrade or purchase credits.',
          noCredits: true,
        });
      }

      // Deduct exactly 1 credit
      const consumedSubscription = await consumeSubscriptionUnlockCredit(subscription._id);
      if (!consumedSubscription) {
        return res.status(403).json({
          message: 'No profile unlock credits remaining in your current subscription. Please upgrade or purchase credits.',
          noCredits: true,
        });
      }

      // Sync recruiter profile unlocksRemaining
      const recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { user: String(recruiterId) },
      });
      if (recruiterProfile) {
        await saveRecruiterProfile({
          ...recruiterProfile,
          unlocksRemaining: Math.max(0, Number(recruiterProfile.unlocksRemaining || 0) - 1),
          totalUnlocks: Number(recruiterProfile.totalUnlocks || 0) + 1,
        });
      }
      sourcePlanId = subscription.planId;
      subscriptionId = subscription._id;
    } else {
      // Free User logic (Module 5)
      // Check how many unique candidates this recruiter has unlocked
      const viewedCount = await prisma.recruiterLeadTracker.count({
        where: { recruiterId: String(recruiterId) },
      });
      
      if (viewedCount < 3) {
        // Allow free unlock and record it (using upsert/catch in case of duplicate click)
        try {
          await prisma.recruiterLeadTracker.create({ data: {
            recruiterId: String(recruiterId),
            candidateId: String(providerProfile.id || providerProfile._id),
          } });
        } catch (err) {
          // Ignore duplicate key error if they somehow click quickly twice
        }
      } else {
        return res.status(403).json({
          message: 'Unlock Premium Subscription to View More Candidates',
          needsSubscription: true,
        });
      }
    }

    // Save unlocked profile relation permanently
    const unlock = await upsertProfileUnlock({
      recruiterId,
      providerId,
      jobId: jobId || null,
      sourcePlanId,
      subscriptionId,
    });

    // Create legacy contact unlock record to keep existing dashboards/views fully functional
    await prisma.lead.create({ data: {
      provider: String(providerId),
      recruiter: String(recruiterId),
      jobPost: null,
      type: 'contact_unlock',
      isUnlocked: true,
    } });

    // Increment provider metrics
    providerProfile.contactsUnlocked = Number(providerProfile.contactsUnlocked || 0) + 1;
    providerProfile.leadsReceived = Number(providerProfile.leadsReceived || 0) + 1;
    await saveProviderProfile(providerProfile);

    // Log history
    await createVisitHistory({
      user: recruiterId,
      visitedUser: providerId,
      visitedProfile: providerProfile._id,
      type: 'contact_unlock',
    });

    // Notify provider
    await createNotification({
      userId: providerId,
      type: 'ADMIN_ALERT',
      title: 'Profile Unlocked!',
      message: 'A recruiter has unlocked your profile contact details.',
      data: { recruiterId },
    });

    // Send email with magic link
    if (enabled('ENABLE_COMMUNICATION_PROVIDERS')) try {
      if (providerUser && providerUser.email) {
        const magicLink = createMagicLinkToken();
        await prisma.user.update({
          where: { id: providerUser.id },
          data: prepareUserData(magicLink),
        });
        
        const redirectPath = `/provider/dashboard`;
        const magicUrl = `${process.env.FRONTEND_URL || req.get("origin")}/auth/magic?token=${magicLink.token}&redirect=${encodeURIComponent(redirectPath)}`;
        
        const subject = `Your profile was unlocked by a recruiter!`;
        const html = `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="margin:0 0 10px;color:#1f2937;">Profile Unlocked!</h2>
            <p style="margin:0 0 14px;">A recruiter has unlocked your profile! Click the button below to instantly log in and view your dashboard:</p>
            <a href="${magicUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View Dashboard</a>
            <p style="margin:14px 0 0;">This magic link will expire in 15 minutes.</p>
          </div>
        `;
        await sendMail({ to: providerUser.email, subject, text: `Your profile was unlocked by a recruiter!`, html });
      }
    } catch (err) {
      console.error('Failed to send magic link email to provider', err);
    }

    res.status(201).json({ message: 'Profile unlocked successfully', unlock });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get recruiter-focused provider profile, with masked fields if locked
// @route   GET /api/recruiter/provider/:providerId/profile
const getRecruiterProviderProfile = async (req, res) => {
  try {
    const { providerId } = req.params;
    const providerUser = withLegacyId(await prisma.user.findUnique({
      where: { id: String(providerId) },
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    }));
    if (!providerUser) return res.status(404).json({ message: 'Provider not found' });

    const providerProfile = await findProviderProfileByUserId(providerId);
    if (!providerProfile) return res.status(404).json({ message: 'Provider profile not found' });

    // Check unlock status
    const isUnlocked = await findProfileUnlock(req.user._id, providerId);

    const isUnlockedLegacy = await prisma.lead.findFirst({
      where: {
        recruiter: String(req.user._id),
        provider: String(providerId),
        type: 'contact_unlock',
        isUnlocked: true,
      },
      select: { id: true },
    });

    const unlocked = !!(isUnlocked || isUnlockedLegacy);

    const { getActiveSubscription } = require('../middleware/subscription');
    const { plan } = await getActiveSubscription(req.user._id, 'recruiter');
    const isAdmin = req.user && (req.user.activeRole === 'admin' || req.user.role === 'admin');
    const hasPaidPlan = (plan && plan.price > 0 && plan.slug !== 'free') || isAdmin;

    const resumeUrlValue = providerProfile.resumeUrl || providerProfile.resumeApproval?.approvedUrl || "";
    const hasResume = Boolean(resumeUrlValue);

    const profileData = {
      ...providerProfile,
      user: {
        _id: providerUser._id,
        name: providerUser.name,
        avatar: providerUser.avatar,
      },
      isUnlocked: unlocked,
      hasResume: hasResume,
    };

    if (!hasPaidPlan) {
      profileData.resumeUrl = "";
      if (profileData.resumeApproval) {
        profileData.resumeApproval = {
          ...profileData.resumeApproval,
          status: "none",
          pendingUrl: "",
          approvedUrl: "",
        };
      }
    } else {
      profileData.resumeUrl = resumeUrlValue;
    }

    if (unlocked) {
      profileData.user.email = providerUser.email;
      profileData.user.phone = providerUser.phone;
    } else {
      profileData.user.email = '***@***.***';
      profileData.user.phone = '******' + (providerUser.phone ? providerUser.phone.slice(-4) : 'xxxx');
    }

    res.json({ profile: profileData, isUnlocked: unlocked });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a specific application's status (e.g. Shortlist, Reject, Hire)
// @route   PATCH /api/recruiter/applications/:applicationId/status
const patchApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    if (!['pending', 'applied', 'reviewed', 'contacted', 'shortlisted', 'rejected', 'hired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const result = await updateApplicationForRecruiter(
      applicationId,
      req.user._id,
      { status: status === 'applied' ? 'pending' : status },
    );
    if (!result.application) return res.status(404).json({ message: 'Application not found' });

    if (!result.authorized) {
      return res.status(403).json({ message: 'Not authorized to manage this application' });
    }
    const application = result.application;

    // Send status alert notification to candidate
    await createNotification({
      userId: application.provider,
      type: 'ADMIN_ALERT',
      title: 'Application Update',
      message: `Your application status for "${application.jobPost.title}" was updated to: ${status}`,
      data: { applicationId: application._id, status },
    });

    res.json({ message: 'Application status updated successfully', application });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Toggle a job as saved/unsaved for a provider
// @route   POST /api/provider/jobs/:jobId/save
const toggleSavedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { isExternal } = req.body;
    const providerId = req.user._id;

    const result = await toggleSavedJobRecord(providerId, jobId, isExternal);

    if (result.notFound) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (!result.isSaved) {
      return res.json({ message: 'Job removed from saved jobs', isSaved: false });
    } else {
      return res.status(201).json({ message: 'Job saved successfully', isSaved: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all saved jobs for a provider
// @route   GET /api/provider/saved-jobs
const getSavedJobs = async (req, res) => {
  try {
    const savedJobs = await listSavedJobs(req.user._id);

    const formattedJobs = savedJobs.map(sj => {
      let jobData;
      if (sj.isExternal && sj.externalJob) {
        jobData = {
          ...sj.externalJob,
          isExternal: true,
          job_origin: sj.externalJob.jobOrigin || 'ats',
          apply_mode: sj.externalJob.applyMode || 'external_redirect',
          externalUrl: sj.externalJob.applyUrl || sj.externalJob.url,
          apply_url: sj.externalJob.applyUrl,
          skills: sj.externalJob.skillsTags,
          skill: sj.externalJob.skillsTags?.[0] || 'Ingested vacancy',
          budgetMin: sj.externalJob.salaryMin || 0,
          budgetMax: sj.externalJob.salaryMax || 0,
          budgetType: sj.externalJob.salaryPeriod === 'hourly' ? 'hourly' : sj.externalJob.salaryPeriod === 'yearly' ? 'yearly' : 'monthly'
        };
      } else if (!sj.isExternal && sj.jobPost) {
        jobData = {
          ...sj.jobPost,
          isExternal: false,
          job_origin: 'internal',
          apply_mode: 'internal_apply',
          skills: sj.jobPost.skill ? [sj.jobPost.skill] : []
        };
      }
      
      if (jobData) {
        jobData.isSaved = true;
        jobData.savedAt = sj.createdAt;
      }
      return jobData;
    }).filter(Boolean); // Remove nulls if job was deleted

    res.json({ jobs: formattedJobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const withdrawApplication = async (req, res) => {
  try {
    const { jobId } = req.params;
    const app = await withdrawApplicationRecord(jobId, req.user._id);
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getProviderJobs,
  getProviderJobById,
  applyToJobFromProvider,
  withdrawApplication,
  getProviderApplications,
  getRecruiterJobs,
  getRecruiterJobApplications,
  getRecruiterApplicationDetails,
  unlockProviderProfile,
  getRecruiterProviderProfile,
  patchApplicationStatus,
  toggleSavedJob,
  getSavedJobs,
};
