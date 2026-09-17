const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const withoutApi = apiUrl.replace(/\/api$/, '');
  const trimmed = withoutApi.replace(/\/$/, '');
  return trimmed || '';
};

export const toAbsoluteMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
};

const isCloudinaryUrl = (url) =>
  typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/');

const withCloudinaryTransforms = (url, transforms = []) => {
  if (!isCloudinaryUrl(url)) return url;
  if (transforms.length === 0) return url;

  const [prefix, suffix] = url.split('/upload/');
  if (!suffix) return url;

  const nextTransform = transforms.join(',');
  const alreadyTransformed = suffix.startsWith('f_auto') || suffix.startsWith('q_auto') || suffix.includes('f_auto') || suffix.includes('q_auto');
  if (alreadyTransformed) return url;

  return `${prefix}/upload/${nextTransform}/${suffix}`;
};

export const toOptimizedMediaUrl = (url, options = {}) => {
  const baseUrl = toAbsoluteMediaUrl(url);
  if (!isCloudinaryUrl(baseUrl)) return baseUrl;

  const transforms = ['f_auto', 'q_auto'];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  if (options.dpr) transforms.push(`dpr_${options.dpr}`);

  return withCloudinaryTransforms(baseUrl, transforms);
};

export { getBackendBaseUrl };
