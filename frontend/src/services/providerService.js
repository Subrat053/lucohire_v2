import { providerAPI, searchAPI } from './api';
import { extractProvidersList, normalizeProviderData, normalizeProvidersList } from '../utils/providerData';

const searchCache = new Map();
const CACHE_TTL_MS = 60000;
const providerCache = new Map();
const PROVIDER_CACHE_TTL_MS = 120000;

const buildCacheKey = (params = {}) => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));

  return entries.map(([key, value]) => `${key}:${String(value)}`).join('|');
};

const getCachedSearch = (key) => {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return cached.data;
};

const setCachedSearch = (key, data) => {
  searchCache.set(key, { timestamp: Date.now(), data });
};

const getCachedProvider = (key) => {
  const cached = providerCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > PROVIDER_CACHE_TTL_MS) {
    providerCache.delete(key);
    return null;
  }
  return cached.data;
};

const setCachedProvider = (key, data) => {
  providerCache.set(key, { timestamp: Date.now(), data });
};

const normalizeSearchResponse = (responseData = {}) => {
  const providers = extractProvidersList(responseData);
  const featured = Array.isArray(responseData?.featured) ? responseData.featured : [];
  const rotation = Array.isArray(responseData?.rotation) ? responseData.rotation : [];
  const normalProviders = Array.isArray(providers) ? providers : [];

  return {
    providers: normalizeProvidersList(normalProviders),
    featured: normalizeProvidersList(featured),
    rotation: normalizeProvidersList(rotation),
    pagination: responseData?.pagination || {},
    summary: responseData?.summary || {},
    intent: responseData?.intent || null,
    searchMeta: responseData?.searchMeta || responseData?.meta || {},
  };
};

export const getProviders = async (params = {}) => {
  const hasActiveFilters = params.tier || params.rating || params.experience || params.verified;

  if (!hasActiveFilters) {
    const cacheKey = buildCacheKey(params);
    const cached = cacheKey ? getCachedSearch(cacheKey) : null;
    if (cached) return cached;

    const { data } = await searchAPI.providers(params);
    const normalized = normalizeSearchResponse(data || {});
    if (cacheKey) setCachedSearch(cacheKey, normalized);
    return normalized;
  }

  // Bypass cache completely if any filter is active
  const { data } = await searchAPI.providers(params);
  return normalizeSearchResponse(data || {});
};

export const searchProviders = async (filters = {}) => {
  return getProviders(filters);
};

export const getFeaturedProviders = async (params = {}) => {
  const pageSize = params.limit || 8;
  return getProviders({
    ...params,
    sortBy: params.sortBy || 'rating',
    limit: pageSize,
  });
};

export const getProviderById = async (id) => {
  const cacheKey = id ? `provider:${id}` : '';
  const cached = cacheKey ? getCachedProvider(cacheKey) : null;
  if (cached) return cached;

  const { data } = await providerAPI.getPublicProfile(id);
  const profile = data?.profile || data?.data?.profile || data?.provider || null;
  const reviews = data?.reviews || data?.data?.reviews || [];

  const normalized = {
    profile: profile ? normalizeProviderData(profile, 0, { isDummy: Boolean(profile?.isDummy) }) : null,
    reviews,
    raw: data || {},
  };

  if (cacheKey) setCachedProvider(cacheKey, normalized);
  return normalized;
};

export const normalizeProviderCardData = (provider, index = 0) => normalizeProviderData(provider, index);
