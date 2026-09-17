const prisma = require('../config/prisma');
const { clearCachedSitemap } = require('../utils/sitemapCache');

const seoAutomationEnabled = () => (
  String(process.env.ENABLE_SEO_AUTOMATION || '').toLowerCase() === 'true'
);

const slugify = (text) => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

async function generateSEOPages() {
  if (!seoAutomationEnabled()) {
    console.log('[SeoEngineService] SEO automation disabled; skipping generation.');
    return { skipped: true, reason: 'ENABLE_SEO_AUTOMATION is not true' };
  }

  console.log('[SeoEngineService] Generating SEO landing pages...');
  try {
    // 1. Group active jobs by city & title
    const titleGroups = await prisma.jobPost.groupBy({
      by: ['city', 'title'],
      where: { status: 'active', isActive: true },
      _count: { _all: true },
    });

    // 2. Group active jobs by city & skill
    const skillGroups = await prisma.jobPost.groupBy({
      by: ['city', 'skill'],
      where: { status: 'active', isActive: true },
      _count: { _all: true },
    });

    // 3. Combine both groups using a normalized map
    const pagesMap = new Map();

    const normalizedGroups = [
      ...titleGroups.map((group) => ({ city: group.city, role: group.title, count: group._count._all })),
      ...skillGroups.map((group) => ({ city: group.city, role: group.skill, count: group._count._all })),
    ];

    for (const group of normalizedGroups) {
      if (!group.city || !group.role) continue;
      
      const city = group.city.trim();
      const role = group.role.trim();
      
      // Ignore very short or empty values
      if (city.length < 2 || role.length < 2) continue;

      const slug = `${slugify(city)}/${slugify(role)}`;
      
      if (pagesMap.has(slug)) {
        const existing = pagesMap.get(slug);
        existing.job_count = Math.max(existing.job_count, group.count);
      } else {
        pagesMap.set(slug, {
          slug,
          city,
          keyword: role,
          job_count: group.count
        });
      }
    }

    // 4. Process all pages in the map
    let newActivePages = 0;
    let deactivatedPages = 0;

    for (const [slug, data] of pagesMap.entries()) {
      const is_active = data.job_count >= 10;

      // Upsert SeoPage
      await prisma.seoPage.upsert({
        where: { slug },
        create: {
          slug,
          city: data.city,
          keyword: data.keyword,
          job_count: data.job_count,
          is_active,
          last_updated: new Date()
        },
        update: {
          city: data.city,
          keyword: data.keyword,
          job_count: data.job_count,
          is_active,
          last_updated: new Date(),
        },
      });

      // Upsert SeoMeta only if active
      if (is_active) {
        newActivePages++;
        await prisma.seoMeta.upsert({
          where: { page_slug: `jobs/${slug}` },
          create: {
            page_slug: `jobs/${slug}`,
            title: `${data.keyword} Jobs in ${data.city} - Apply Now | Lucohire`,
            description: `Find the latest ${data.keyword} jobs in ${data.city}. Apply for top openings, view salaries, and connect with recruiters instantly on Lucohire.`,
            keywords: [
              `${data.keyword.toLowerCase()} jobs ${data.city.toLowerCase()}`,
              `${data.keyword.toLowerCase()} openings ${data.city.toLowerCase()}`,
              `hire ${data.keyword.toLowerCase()} in ${data.city.toLowerCase()}`
            ],
            schema_enabled: true,
          },
          update: {
            title: `${data.keyword} Jobs in ${data.city} - Apply Now | Lucohire`,
            description: `Find the latest ${data.keyword} jobs in ${data.city}. Apply for top openings, view salaries, and connect with recruiters instantly on Lucohire.`,
            keywords: [
              `${data.keyword.toLowerCase()} jobs ${data.city.toLowerCase()}`,
              `${data.keyword.toLowerCase()} openings ${data.city.toLowerCase()}`,
              `hire ${data.keyword.toLowerCase()} in ${data.city.toLowerCase()}`,
            ],
            schema_enabled: true,
          },
        });
      } else {
        deactivatedPages++;
        // If it exists, mark is_active as false
        await prisma.seoPage.update({ where: { slug }, data: { is_active: false } });
      }
    }

    console.log(`[SeoEngineService] SEO Generation complete. Active: ${newActivePages}, Inactive/Deactivated: ${deactivatedPages}`);

    // Invalidate sitemap cache since sitemap contains SEO pages
    try {
      clearCachedSitemap();
      console.log('[SeoEngineService] Sitemap cache invalidated.');
    } catch (cacheErr) {
      console.error('[SeoEngineService] Error invalidating sitemap cache:', cacheErr.message);
    }

  } catch (error) {
    console.error('[SeoEngineService] Error generating SEO pages:', error);
    throw error;
  }
}

module.exports = {
  generateSEOPages,
  slugify
};
