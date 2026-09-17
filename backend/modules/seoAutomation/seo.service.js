const CountryConfig = require('../../models/CountryConfig');
const SeoPage = require('../../models/SeoPage');
const SeoMeta = require('../../models/SeoMeta');
const JobPost = require('../../models/JobPost');

/**
 * Automates generation of SEO pages based on active jobs count and per-country configuration rules
 */
const generateCountrySeoPages = async () => {
  console.log('[SEO Service] Initiating country-controlled SEO page generation...');
  const activeCountries = await CountryConfig.find({ isActive: true, isSeoEnabled: true });

  for (const country of activeCountries) {
    const code = country.countryCode;
    const minJobs = country.seoRules?.minimumJobsForSeoPage || 10;

    // 1. Generate Country Page (e.g. /jobs/india)
    const countryJobsCount = await getActiveJobsCount({ countryCode: code });
    const countrySlug = country.slug || country.countryName.toLowerCase().trim();
    
    if (countryJobsCount > 0) {
      await upsertSeoPage(countrySlug, 'country_listing', country.countryName, '', countryJobsCount);
      await upsertSeoMeta(`jobs/${countrySlug}`, `Find jobs in ${country.countryName} - LucoHire`, `Browse recruiter-posted and synced jobs in ${country.countryName}. Apply now.`);
    }

    // 2. Discover Cities having active jobs in this country
    const cities = await getDistinctCitiesForCountry(code);
    
    for (const city of cities) {
      const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const cityJobsCount = await getActiveJobsCount({ countryCode: code, city });

      // Check if City Pages are enabled and have enough jobs
      if (country.seoRules?.generateCityPages && cityJobsCount > 0) {
        const pathSlug = `${countrySlug}/${citySlug}`;
        await upsertSeoPage(pathSlug, 'city_listing', city, '', cityJobsCount);
        await upsertSeoMeta(`jobs/${pathSlug}`, `Jobs in ${city}, ${country.countryName} - LucoHire`, `Browse the latest job openings in ${city}, ${country.countryName}. Find remote and onsite roles.`);
      }

      // 3. Generate City + Skill Pages (e.g. /jobs/india/bangalore/react-developer)
      if (country.seoRules?.generateSkillPages) {
        const skillsList = country.skills.length > 0 ? country.skills : ['developer'];
        for (const skill of skillsList) {
          const skillSlug = skill.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const skillJobsCount = await getActiveJobsCount({ countryCode: code, city, skill });

          const pathSlug = `${countrySlug}/${citySlug}/${skillSlug}`;

          if (skillJobsCount >= minJobs) {
            await upsertSeoPage(pathSlug, 'skill_listing', city, skill, skillJobsCount);
            await upsertSeoMeta(`jobs/${pathSlug}`, `${skill} Jobs in ${city}, ${country.countryName} - LucoHire`, `Apply to ${skill} vacancies in ${city}, ${country.countryName}. Top job opportunities available now.`);
          } else {
            // Deactivate page if job count falls below minimum limit
            await SeoPage.findOneAndUpdate({ slug: pathSlug }, { is_active: false });
          }
        }
      }
    }
  }
  console.log('[SEO Service] Country-controlled SEO page generation complete.');
};

/**
 * Helper to count active jobs (internal and external combined)
 */
const getActiveJobsCount = async ({ countryCode, city, skill }) => {
  const filter = {
    $or: [{ status: 'active' }, { status: { $exists: false } }],
    isActive: true,
  };

  if (countryCode) {
    filter.countryCode = { $regex: `^${countryCode}$`, $options: 'i' };
  }
  if (city) {
    filter.city = { $regex: `^${city}$`, $options: 'i' };
  }
  if (skill) {
    filter.$or = [
      ...(filter.$or || []),
      { skill: { $regex: skill, $options: 'i' } },
      { title: { $regex: skill, $options: 'i' } },
      { skillsTags: { $regex: skill, $options: 'i' } }
    ];
  }

  return await JobPost.countDocuments(filter);
};

/**
 * Helper to fetch unique cities having jobs in the country
 */
const getDistinctCitiesForCountry = async (countryCode) => {
  const cities = await JobPost.distinct('city', { countryCode, isActive: true });
  return cities.filter(Boolean);
};

/**
 * Helper to upsert SeoPage collection records
 */
const upsertSeoPage = async (slug, type, city, keyword, jobCount) => {
  await SeoPage.findOneAndUpdate(
    { slug },
    {
      slug,
      type,
      city: city || 'Global',
      keyword: keyword || 'Jobs',
      job_count: jobCount,
      is_active: true,
      last_updated: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/**
 * Helper to upsert SeoMeta collection records
 */
const upsertSeoMeta = async (pageSlug, title, description) => {
  if (!SeoMeta) return;
  await SeoMeta.findOneAndUpdate(
    { page_slug: pageSlug },
    {
      page_slug: pageSlug,
      meta_title: title,
      meta_description: description,
      canonical_url: `${process.env.FRONTEND_URL || 'https://www.lucohire.com'}/${pageSlug}`,
      last_updated: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = {
  generateCountrySeoPages,
  getActiveJobsCount
};
