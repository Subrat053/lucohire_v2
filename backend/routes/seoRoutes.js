const express = require('express');
const router = express.Router();
const { isValidId } = require('../utils/id');
const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { renderSeoLandingPage, renderJobDetailPage } = require('../utils/seoTemplates');

// GET /jobs/:country -> Country listing page

const getCountryPage = async (req, res, next) => {
  try {
    const countrySlug = req.params.idOrSlug || req.params.country;
    const country = await prisma.countryConfig.findFirst({
      where: { slug: countrySlug.toLowerCase().trim(), isActive: true },
    });
    if (!country) return res.status(404).send('Country page not found');

    const seoPage = await prisma.seoPage.findFirst({ where: { slug: countrySlug, is_active: true } });
    const seoMeta = await prisma.seoMeta.findUnique({ where: { page_slug: `jobs/${countrySlug}` } });

    // Query combined jobs
    const internalJobsList = withLegacyIds(await prisma.jobPost.findMany({
      where: { countryCode: country.countryCode, status: 'active', isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }));
    
    const combined = internalJobsList.map(j => ({ 
      ...j, 
      skills: j.skillsTags && j.skillsTags.length > 0 ? j.skillsTags : (j.skill ? [j.skill] : []) 
    }));
    combined.sort((a, b) => b.createdAt - a.createdAt);

    const dummySeoPage = seoPage || { city: country.countryName, keyword: 'Jobs', slug: countrySlug };

    const html = renderSeoLandingPage(dummySeoPage, seoMeta, combined);
    res.header('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    next(err);
  }
};

// GET /jobs/:idOrSlug -> Individual Job Detail Page
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const requestedIdOrSlug = req.params.idOrSlug;
    
    // Check if it's a country page (e.g. /jobs/india)
    const isCountry = await prisma.countryConfig.findFirst({
      where: { slug: requestedIdOrSlug.toLowerCase().trim(), isActive: true },
      select: { id: true },
    });
    if (isCountry) {
      return getCountryPage(req, res, next);
    }

    let job = null;
    if (isValidId(requestedIdOrSlug)) {
      job = withLegacyId(await prisma.jobPost.findUnique({ where: { id: requestedIdOrSlug } }));
    }

    // Sitemap URLs preserve the legacy "title-id" shape. Support both old
    // 24-character ObjectId strings and Prisma-generated string ids.
    if (!job && requestedIdOrSlug.includes('-')) {
      const suffix = requestedIdOrSlug.split('-').at(-1);
      if (suffix.length >= 20 && isValidId(suffix)) {
        job = withLegacyId(await prisma.jobPost.findUnique({ where: { id: suffix } }));
      }
    }
    
    if (!job) {
      // Find in JobPost by slug if it's an external job
      job = withLegacyId(await prisma.jobPost.findFirst({
        where: { seoSlug: requestedIdOrSlug, isExternal: true },
      }));
    }

    if (!job || (job.isExternal ? !job.isActive : job.status !== 'active')) {
      return res.status(404).send('Job not found or no longer active');
    }

    // Normalize external job fields for compatibility
    if (job.isExternal) {
      job.skill = job.skillsTags ? job.skillsTags.join(', ') : 'Job vacancy';
      job.status = job.isActive ? 'active' : 'closed';
      job.cityName = job.city;
      job.pricingType = job.pricingType || job.salaryPeriod;
    }

    const html = renderJobDetailPage(job);
    res.header('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[SEO Router] Error in individual job route:', error);
    next(error);
  }
});

// GET /jobs/:country/:city -> SEO Location Landing Page
router.get('/:country/:city', async (req, res, next) => {
  try {
    const { country, city } = req.params;
    const countrySlug = country.toLowerCase().trim();
    const citySlug = city.toLowerCase().trim();
    const pageSlug = `${countrySlug}/${citySlug}`;

    const countryConfig = await prisma.countryConfig.findFirst({
      where: { slug: countrySlug, isActive: true },
    });
    if (!countryConfig) return res.status(404).send('Country not found');

    const seoPage = await prisma.seoPage.findFirst({ where: { slug: pageSlug, is_active: true } });
    if (!seoPage && !countryConfig.seoRules?.generateCityPages) {
      return res.status(404).send('City page not found');
    }

    const seoMeta = await prisma.seoMeta.findUnique({ where: { page_slug: `jobs/${pageSlug}` } });

    const internalJobsList = withLegacyIds(await prisma.jobPost.findMany({
      where: {
        countryCode: countryConfig.countryCode,
        city: { equals: seoPage?.city || city, mode: 'insensitive' },
        status: 'active',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }));

    const combined = internalJobsList.map(j => ({ 
      ...j, 
      skills: j.skillsTags && j.skillsTags.length > 0 ? j.skillsTags : (j.skill ? [j.skill] : []) 
    }));
    combined.sort((a, b) => b.createdAt - a.createdAt);

    const dummySeoPage = seoPage || { city: seoPage?.city || city, keyword: 'Jobs', slug: pageSlug };

    const html = renderSeoLandingPage(dummySeoPage, seoMeta, combined);
    res.header('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[SEO Router] Error in country/city landing page route:', error);
    next(error);
  }
});

// GET /jobs/:country/:city/:skill -> SEO Landing Page with Skill Filter
router.get('/:country/:city/:skill', async (req, res, next) => {
  try {
    const { country, city, skill } = req.params;
    const countrySlug = country.toLowerCase().trim();
    const citySlug = city.toLowerCase().trim();
    const skillSlug = skill.toLowerCase().trim();
    const pageSlug = `${countrySlug}/${citySlug}/${skillSlug}`;

    const countryConfig = await prisma.countryConfig.findFirst({
      where: { slug: countrySlug, isActive: true },
    });
    if (!countryConfig) return res.status(404).send('Country not found');

    const seoPage = await prisma.seoPage.findFirst({ where: { slug: pageSlug, is_active: true } });
    if (!seoPage) {
      return res.status(404).send('Landing page not found');
    }

    const seoMeta = await prisma.seoMeta.findUnique({ where: { page_slug: `jobs/${pageSlug}` } });

    const keyword = String(seoPage.keyword || '').toLowerCase();
    const matchingJobs = await prisma.jobPost.findMany({
      where: {
        status: 'active',
        isActive: true,
        countryCode: countryConfig.countryCode,
        city: { equals: seoPage.city, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    });
    const internalJobsList = withLegacyIds(matchingJobs.filter((job) => (
      String(job.skill || '').toLowerCase().includes(keyword)
      || String(job.title || '').toLowerCase().includes(keyword)
      || (job.skillsTags || []).some((tag) => String(tag).toLowerCase().includes(keyword))
    )));

    const combined = internalJobsList.map(j => ({ 
      ...j, 
      skills: j.skillsTags && j.skillsTags.length > 0 ? j.skillsTags : (j.skill ? [j.skill] : []) 
    }));
    combined.sort((a, b) => b.createdAt - a.createdAt);

    const html = renderSeoLandingPage(seoPage, seoMeta, combined);
    res.header('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[SEO Router] Error in country/city/skill landing page route:', error);
    next(error);
  }
});

module.exports = router;
