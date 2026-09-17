const prisma = require('../config/prisma');
const { findJobById, mapJobs } = require('../services/jobPersistenceService');
const ExternalJob = require('../models/ExternalJob');
const ProviderProfile = require('../models/ProviderProfile');
const { runJobScraper } = require('../workers/jobScraper');
const { expandSkillsWithAI } = require('../services/ai/llmService');

// @desc    Get top 15 matching jobs for a provider (Internal & External)
// @route   GET /api/provider/matches
const getProviderMatches = async (req, res) => {
  try {
    const providerProfile = await ProviderProfile.findOne({ user: req.user._id });
    if (!providerProfile) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    const providerSkills = (providerProfile.roles && providerProfile.roles.length > 0) ? providerProfile.roles : (providerProfile.skills || []);
    let expandedSkills = providerProfile.expandedSkills || [];

    // AI Skill Expansion
    if (providerSkills.length > 0 && expandedSkills.length === 0) {
      try {
        expandedSkills = await expandSkillsWithAI(providerSkills);
        if (expandedSkills.length > 0) {
          providerProfile.expandedSkills = expandedSkills;
          await providerProfile.save();
        }
      } catch (err) {
        console.error('Failed to expand skills with AI:', err);
      }
    }

    let allSearchSkills = [...new Set([...providerSkills, ...expandedSkills])];
    allSearchSkills = allSearchSkills.filter(s => s && typeof s === 'string' && s.trim().length > 0);
    const providerTier = providerProfile.skillLevel || 'semi-skilled';
    const providerLocation = providerProfile.location;

    // Resolve raw country (e.g. "India", "IN") to 2-letter country code
    let providerCountry = 'US';
    const rawCountry = providerProfile.countryCode || providerProfile.country || req.user?.country;
    if (rawCountry) {
      if (rawCountry.trim().length === 2) {
        providerCountry = rawCountry.trim().toUpperCase();
      } else {
        const CountryConfig = require('../models/CountryConfig');
        const match = await CountryConfig.findOne({ 
          $or: [
            { countryName: { $regex: `^${rawCountry.trim()}$`, $options: 'i' } },
            { countryCode: { $regex: `^${rawCountry.trim()}$`, $options: 'i' } }
          ]
        }).lean();
        if (match && match.countryCode) {
          providerCountry = match.countryCode.toUpperCase();
        }
      }
    }

    // 1. Fetch matching internal jobs (isExternal !== true)
    if (allSearchSkills.length === 0) {
      // Do not return unfiltered jobs if profile has no skills/roles
      return res.json({ success: true, data: [], totalCount: 0 });
    }

    const internalWhere = {
      status: 'active',
      isActive: true,
      isExternal: false,
      OR: allSearchSkills.flatMap((term) => [
        { skill: { contains: String(term).trim(), mode: 'insensitive' } },
        { title: { contains: String(term).trim(), mode: 'insensitive' } },
        { skillsTags: { has: String(term).trim() } },
      ]),
    };

    const internalJobs = mapJobs(await prisma.jobPost.findMany({
      where: internalWhere,
      take: 15,
      orderBy: { createdAt: 'desc' },
    }));

    const formattedInternal = internalJobs.map(j => ({
      ...j,
      isExternal: false,
      job_origin: 'internal',
      apply_mode: 'internal_apply',
      skills: j.skill ? [j.skill] : []
    }));

    // 2. Fetch matching external jobs (from ExternalJob collection)
    let externalQuery = {
      isActive: true
    };

    if (allSearchSkills.length > 0) {
      const skillRegexes = allSearchSkills.map(s => {
        const escaped = s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:[^a-zA-Z0-9_]|$)`, 'i');
      });
      externalQuery.$or = [
        { title: { $in: skillRegexes } },
        { skillsTags: { $in: skillRegexes } }
      ];
    }

    // Removed strict unskilled city restriction for external jobs to improve match volume

    const externalJobs = await ExternalJob.find(externalQuery)
      .limit(15)
      .sort({ createdAt: -1 })
      .lean();

    const formattedExternal = externalJobs.map(j => ({
      ...j,
      isExternal: true,
      job_origin: j.jobOrigin || 'ats',
      apply_mode: j.applyMode || 'external_redirect',
      externalUrl: j.applyUrl || j.url,
      apply_url: j.applyUrl,
      skills: j.skillsTags,
      skill: j.skillsTags?.[0] || 'Ingested vacancy',
      budgetMin: j.salaryMin || 0,
      budgetMax: j.salaryMax || 0,
      budgetType: j.salaryPeriod === 'hourly' ? 'hourly' : j.salaryPeriod === 'yearly' ? 'yearly' : 'monthly'
    }));

    // Merge them, interleaving them
    let matchedJobs = [];
    let i = 0, j = 0;
    while (i < formattedInternal.length || j < formattedExternal.length) {
      if (i < formattedInternal.length) matchedJobs.push(formattedInternal[i++]);
      if (j < formattedExternal.length) matchedJobs.push(formattedExternal[j++]);
    }
    matchedJobs = matchedJobs.slice(0, 15);

    // If logged in, check application and save status
    if (req.user && matchedJobs.length > 0) {
      const internalJobIds = matchedJobs.filter(j => !j.isExternal).map(j => j._id);
      
      const [applications, savedJobs] = await Promise.all([
        prisma.application.findMany({
          where: { provider: String(req.user._id), jobPost: { in: internalJobIds.map(String) } },
          select: { jobPost: true, status: true },
        }),
        prisma.savedJob.findMany({ where: { provider: String(req.user._id) } }),
      ]);

      const appliedMap = new Map(applications.map(a => [a.jobPost.toString(), a.status]));
      const savedJobIds = new Set(
        savedJobs.map(sj => sj.isExternal ? sj.externalJob?.toString() : sj.jobPost?.toString())
      );

      for (const job of matchedJobs) {
        job.isSaved = savedJobIds.has(job._id.toString());
        
        if (!job.isExternal) {
          job.hasApplied = appliedMap.has(job._id.toString());
          job.applicationStatus = appliedMap.get(job._id.toString()) || null;
        } else {
          const CandidateJobMatch = require('../models/CandidateJobMatch');
          const matchedState = await CandidateJobMatch.findOne({ userId: req.user._id, jobId: job._id }).lean();
          job.hasApplied = !!(matchedState?.appliedAt);
        }
      }
    }

    const [internalCount, externalCount] = await Promise.all([
      prisma.jobPost.count({ where: internalWhere }),
      ExternalJob.countDocuments(externalQuery)
    ]);

    return res.json({
      success: true,
      count: matchedJobs.length,
      totalCount: internalCount + externalCount,
      data: matchedJobs
    });

  } catch (error) {
    console.error('Error in getProviderMatches:', error);
    return res.status(500).json({ success: false, message: 'Server Error during matchmaking' });
  }
};

// @desc    On-demand force scrape then get matching jobs
// @route   GET /api/provider/scrape-matches
const scrapeAndGetMatches = async (req, res) => {
  try {
    const providerProfile = await ProviderProfile.findOne({ user: req.user._id });
    if (!providerProfile) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    const providerSkills = providerProfile.skills || [];
    const providerTier = providerProfile.skillLevel || providerProfile.tier || 'unskilled';
    
    if (providerSkills.length > 0) {
      const targetSkills = providerSkills.slice(0, 2);
      let targetCity = null;
      
      // If restricted, force the scraper to only search in their local city
      if (['unskilled', 'semi-skilled'].includes(providerTier.toLowerCase())) {
        targetCity = providerProfile.city || providerProfile.location?.city || null;
      }

      console.log(`On-demand scraping triggered for user skills: ${targetSkills}, city: ${targetCity || 'Global'}`);
      // Pass the targetCity to the scraper if we have one
      await runJobScraper(targetSkills, targetCity).catch(err => console.error('On-demand scrape error:', err));
    }

    // Reuse getProviderMatches logic essentially by calling it manually via req, res
    return await getProviderMatches(req, res);

  } catch (error) {
    console.error('Error in scrapeAndGetMatches:', error);
    return res.status(500).json({ success: false, message: 'Server Error during scraping' });
  }
};

// @desc    Get top 15 matching candidates for a recruiter's job
// @route   GET /api/recruiter/jobs/:jobId/matches
const getRecruiterJobMatches = async (req, res) => {
  try {
    const { jobId } = req.params;

    // 1. Get the job details
    const job = await findJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Ensure the recruiter owns this job
    if (job.recruiter && job.recruiter.toString() !== req.user._id.toString()) {
       return res.status(403).json({ success: false, message: 'Not authorized to view matches for this job' });
    }

    // 2. Build the matchmaking query for providers
    let matchQuery = { status: 'active' };
    
    if (job.skill) {
      matchQuery.skills = { $regex: new RegExp(job.skill, 'i') };
    }

    // Module 3 geo-fencing: if job requires unskilled/semi-skilled, find candidates within 50km
    const jobLat = job.location?.latitude || job.locationData?.latitude;
    const jobLng = job.location?.longitude || job.locationData?.longitude;

    if ((job.requiredSkillLevel === 'unskilled' || job.requiredSkillLevel === 'semi-skilled') && jobLat && jobLng) {
       matchQuery.geoPoint = {
         $near: {
           $geometry: {
             type: 'Point',
             coordinates: [jobLng, jobLat]
           },
           $maxDistance: 50000 // 50 KM
         }
       };
    }

    // 3. Execute query and fetch Top 15
    const matchedProviders = await ProviderProfile.find(matchQuery)
      .limit(15)
      .populate('user', 'name email phone avatar')
      .lean();

    return res.json({
      success: true,
      count: matchedProviders.length,
      data: matchedProviders
    });

  } catch (error) {
    console.error('Error in getRecruiterJobMatches:', error);
    return res.status(500).json({ success: false, message: 'Server Error during matchmaking' });
  }
};

module.exports = {
  getProviderMatches,
  scrapeAndGetMatches,
  getRecruiterJobMatches,
};

