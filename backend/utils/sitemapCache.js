let sitemapCache = null;
let sitemapCacheTime = null;

const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

const getCachedSitemap = () => {
  if (sitemapCache && sitemapCacheTime && (Date.now() - sitemapCacheTime < CACHE_DURATION)) {
    return sitemapCache;
  }
  return null;
};

const setCachedSitemap = (xml) => {
  sitemapCache = xml;
  sitemapCacheTime = Date.now();
};

const clearCachedSitemap = () => {
  sitemapCache = null;
  sitemapCacheTime = null;
  console.log('[Sitemap Cache] In-memory cache cleared successfully.');
};

module.exports = {
  getCachedSitemap,
  setCachedSitemap,
  clearCachedSitemap,
};
