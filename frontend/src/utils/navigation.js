export const safeReturnPath = (path, fallback = '/provider/dashboard') => {
  const candidate = String(path || '').trim();

  if (!candidate) {
    return fallback;
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  if (/^[a-z]+:\/\//i.test(candidate)) {
    return fallback;
  }

  return candidate;
};