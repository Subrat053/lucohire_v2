const multer = require('multer');
const { AppError } = require('../utils/appError');

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const visionUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.VISION_UPLOAD_MAX_BYTES || (10 * 1024 * 1024)),
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return cb(null, true);
    }

    return cb(
      new AppError(
        'Unsupported file type. Allowed types: image/jpeg, image/jpg, image/png, image/webp.',
        400,
        'UNSUPPORTED_FILE_TYPE',
        { mimeType: file.mimetype }
      )
    );
  },
});

module.exports = {
  visionUpload,
};
