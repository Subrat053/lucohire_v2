const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const BLOCKED_EXTENSIONS = [
  '.exe', '.js', '.sh', '.bat', '.php', '.html', '.htm', '.xml', '.lnk', '.cmd', '.vbs', '.scr'
];

/**
 * Validates document and image uploads before sending to the server.
 * Returns { isValid: boolean, error?: string }
 */
export const validateUploadFile = (file, options = {}) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  const {
    maxSizeMB = 5,
    allowedMimes = ALLOWED_MIME_TYPES
  } = options;

  // 1. Enforce strict size check
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File is too large. Max size allowed is ${maxSizeMB} MB. Current file size: ${(file.size / (1024 * 1024)).toFixed(2)} MB.`
    };
  }

  // 2. Enforce file extension allowlist/blocklist
  const fileName = (file.name || '').toLowerCase();
  const fileExt = fileName.substring(fileName.lastIndexOf('.'));
  if (BLOCKED_EXTENSIONS.includes(fileExt)) {
    return {
      isValid: false,
      error: 'Unsafe file extension blocked for security reasons.'
    };
  }

  // 3. Enforce MIME type allowlist
  if (allowedMimes && allowedMimes.length > 0) {
    if (!allowedMimes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file format. Allowed formats: PDF, JPG, JPEG, PNG, WebP'
      };
    }
  }

  return { isValid: true };
};
