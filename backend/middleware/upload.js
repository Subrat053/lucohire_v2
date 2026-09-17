const multer = require('multer');
const path = require('path');

// ─── Allowed MIME types and extensions ───────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/x-msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/csv',
  'text/x-csv',
  'application/x-csv',
  'text/comma-separated-values',
  'text/x-comma-separated-values',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf',
  '.doc', '.docx',
  '.csv'
]);

// ─── Filename sanitizer ───────────────────────────────────────────────────────
const sanitizeFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  // Strip any path traversal, spaces, or special chars from the base name
  const base = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 60); // max 60 chars
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
};

// ─── File filter: validate MIME + extension ───────────────────────────────────
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (mimeOk && extOk) {
    return cb(null, true);
  }

  return cb(
    new Error(
      `File rejected. Allowed types: JPEG, PNG, WEBP, GIF, PDF, DOC, DOCX, CSV. ` +
      `Received MIME: ${file.mimetype}, extension: ${ext || 'none'}`
    ),
    false
  );
};

// ─── Memory storage (for Cloudinary uploads) ─────────────────────────────────
const memoryStorage = multer.memoryStorage();

// ─── Disk storage (fallback when Cloudinary is not configured) ───────────────
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, sanitizeFilename(file.originalname));
  },
});

// ─── Default upload: memory storage for Cloudinary ───────────────────────────
const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,   // 10 MB hard cap
    files: 5,                      // max 5 files per request
  },
});

// ─── Disk upload: for local fallback ─────────────────────────────────────────
const uploadDisk = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

module.exports = upload;
module.exports.uploadDisk = uploadDisk;
// Trigger nodemon reload after freeing port 5000

