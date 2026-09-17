/**
 * cacheBuster.js
 *
 * Appends a cache-busting query parameter to a URL.
 * Used after profile photo uploads so the browser fetches the latest image
 * instead of serving a stale cached version.
 *
 * Usage:
 *   import { cacheBustedUrl } from '../utils/cacheBuster';
 *   const freshUrl = cacheBustedUrl(data.imageUrl);
 *   // → 'https://cdn.example.com/photo.jpg?v=1748592000000'
 */

/**
 * Appends a `?v=<timestamp>` to a URL for cache-busting.
 * @param {string} url - The asset URL
 * @returns {string} - URL with cache-busting query param
 */
export const cacheBustedUrl = (url) => {
  if (!url || typeof url !== 'string') return url || '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${Date.now()}`;
};

/**
 * Strips the cache-busting query parameter from a URL.
 * Useful when comparing URLs or storing to state/localStorage.
 * @param {string} url
 * @returns {string}
 */
export const stripCacheBuster = (url) => {
  if (!url || typeof url !== 'string') return url || '';
  try {
    const u = new URL(url);
    u.searchParams.delete('v');
    return u.toString();
  } catch {
    // Not an absolute URL — handle relative paths
    return url.replace(/([?&])v=\d+(&|$)/, '$2').replace(/[?&]$/, '');
  }
};

export default cacheBustedUrl;
