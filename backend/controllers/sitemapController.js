const prisma = require('../config/prisma');
const { withLegacyIds } = require('../utils/prismaResponse');
const { getCachedSitemap, setCachedSitemap } = require('../utils/sitemapCache');

const SITE_URL = (process.env.FRONTEND_URL || 'https://www.lucohire.com').replace(/\/$/, '');

// Utility to escape XML special characters
const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Safe slug generation fallback helper
const slugify = (text) => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const getSitemap = async (req, res, next) => {
  try {
    // 1. Check in-memory cache first
    const cachedXml = getCachedSitemap();
    if (cachedXml) {
      res.header('Content-Type', 'application/xml');
      return res.status(200).send(cachedXml);
    }

    console.log('[Sitemap Controller] Generating sitemap dynamically...');

    // 2. Define static URLs
    // loc, priority, changefreq, lastmod
    const staticUrls = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/search`, priority: '0.9', changefreq: 'hourly' },
      { loc: `${SITE_URL}/faq`, priority: '0.6', changefreq: 'monthly' },
      { loc: `${SITE_URL}/terms`, priority: '0.4', changefreq: 'yearly' },
      { loc: `${SITE_URL}/privacy`, priority: '0.4', changefreq: 'yearly' },
      { loc: `${SITE_URL}/refund-policy`, priority: '0.4', changefreq: 'yearly' },
      { loc: `${SITE_URL}/renewal-policy`, priority: '0.4', changefreq: 'yearly' },
      { loc: `${SITE_URL}/contact`, priority: '0.5', changefreq: 'monthly' }
    ];

    // 3. Query dynamic records

    // a. Active Jobs
    const jobs = withLegacyIds(await prisma.jobPost.findMany({
      where: { status: 'active', isActive: true },
      select: { id: true, title: true, skill: true, city: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }));

    // b. Approved Providers (Must be approved on user level and profile level, and active/not blocked)
    const activeProviders = withLegacyIds(await prisma.providerProfile.findMany({
      where: {
        OR: [{ isApproved: true }, { approvalAction: 'approved' }],
        userRecord: {
          is: { approvalStatus: 'approved', isBlocked: false, isActive: true },
        },
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }));

    // c. Approved Recruiters
    const activeRecruiters = withLegacyIds(await prisma.recruiterProfile.findMany({
      where: {
        OR: [{ isApproved: true }, { approvalAction: 'approved' }],
        userRecord: {
          is: { approvalStatus: 'approved', isBlocked: false, isActive: true },
        },
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }));

    // d. Active Service Categories
    const categories = await prisma.skillCategory.findMany({
      where: { isActive: true },
      select: { slug: true, name: true, updatedAt: true },
      orderBy: { sortOrder: 'asc' },
    });

    // e. Active SEO landing pages
    const seoPages = await prisma.seoPage.findMany({
      where: { is_active: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    // 4. Build sitemap array
    const sitemapEntries = [];

    // Add static pages
    for (const page of staticUrls) {
      sitemapEntries.push({
        loc: page.loc,
        priority: page.priority,
        changefreq: page.changefreq,
        lastmod: new Date().toISOString().split('T')[0]
      });
    }

    // Add active jobs
    for (const job of jobs) {
      const jobSlug = slugify(job.title || job.skill);
      // Clean dynamic route fallback: use existing ID path first or slug if supported
      const cleanUrl = jobSlug 
        ? `${SITE_URL}/jobs/${jobSlug}-${job._id}` 
        : `${SITE_URL}/jobs/${job._id}`;

      sitemapEntries.push({
        loc: cleanUrl,
        priority: '0.9',
        changefreq: 'daily',
        lastmod: (job.updatedAt || new Date()).toISOString().split('T')[0]
      });
    }

    // Add approved provider detail pages (ID-based matching existing React routes)
    for (const provider of activeProviders) {
      const cleanUrl = `${SITE_URL}/provider/${provider._id}`;
      sitemapEntries.push({
        loc: cleanUrl,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: (provider.updatedAt || new Date()).toISOString().split('T')[0]
      });
    }

    // Add recruiters detail pages
    for (const recruiter of activeRecruiters) {
      const cleanUrl = `${SITE_URL}/recruiter/${recruiter._id}`;
      sitemapEntries.push({
        loc: cleanUrl,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: (recruiter.updatedAt || new Date()).toISOString().split('T')[0]
      });
    }

    // Add active categories
    for (const cat of categories) {
      if (cat.slug) {
        const cleanUrl = `${SITE_URL}/search?category=${cat.slug}`;
        sitemapEntries.push({
          loc: cleanUrl,
          priority: '0.8',
          changefreq: 'daily',
          lastmod: (cat.updatedAt || new Date()).toISOString().split('T')[0]
        });
      }
    }

    // Add active SEO landing pages
    for (const seoPage of seoPages) {
      if (seoPage.slug) {
        const cleanUrl = `${SITE_URL}/jobs/${seoPage.slug}`;
        sitemapEntries.push({
          loc: cleanUrl,
          priority: '0.8',
          changefreq: 'daily',
          lastmod: (seoPage.updatedAt || new Date()).toISOString().split('T')[0]
        });
      }
    }

    // 5. Generate XML Output
    // If entries exceed 50,000, we split them into a sitemap index (Safety Requirement 5)
    let xmlContent = '';
    const LIMIT = 50000;

    if (sitemapEntries.length > LIMIT) {
      // Return Sitemap Index
      xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmlContent += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      const chunkCount = Math.ceil(sitemapEntries.length / LIMIT);
      for (let i = 0; i < chunkCount; i++) {
        xmlContent += '  <sitemap>\n';
        xmlContent += `    <loc>${escapeXml(`${SITE_URL}/sitemap-${i + 1}.xml`)}</loc>\n`;
        xmlContent += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
        xmlContent += '  </sitemap>\n';
      }
      xmlContent += '</sitemapindex>';
    } else {
      // Standard Sitemap
      xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmlContent += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      for (const entry of sitemapEntries) {
        xmlContent += '  <url>\n';
        xmlContent += `    <loc>${escapeXml(entry.loc)}</loc>\n`;
        if (entry.lastmod) {
          xmlContent += `    <lastmod>${entry.lastmod}</lastmod>\n`;
        }
        if (entry.changefreq) {
          xmlContent += `    <changefreq>${entry.changefreq}</changefreq>\n`;
        }
        if (entry.priority) {
          xmlContent += `    <priority>${entry.priority}</priority>\n`;
        }
        xmlContent += '  </url>\n';
      }
      
      xmlContent += '</urlset>';
    }

    // 6. Cache response
    setCachedSitemap(xmlContent);

    // 7. Send Response
    res.header('Content-Type', 'application/xml');
    return res.status(200).send(xmlContent);

  } catch (error) {
    console.error('[Sitemap Error]', error);
    next(error);
  }
};

module.exports = {
  getSitemap,
};
