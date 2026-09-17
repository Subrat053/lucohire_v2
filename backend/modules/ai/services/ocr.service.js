const {
  detectText,
  detectDocumentText,
  detectLabels,
} = require('../../../services/googleVision.service');
const { AppError } = require('../../../utils/appError');

function ensureImageBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new AppError('A valid image buffer is required', 400, 'INVALID_IMAGE_BUFFER');
  }
}

function ensureVisionKey() {
  const apiKey = String(process.env.GOOGLE_VISION_API_KEY || '').trim();
  if (!apiKey) {
    throw new AppError('Missing GOOGLE_VISION_API_KEY in environment variables', 500, 'ENV_VALIDATION_ERROR');
  }
}

async function extractTextFromImage(buffer) {
  ensureVisionKey();
  ensureImageBuffer(buffer);

  const result = await detectText(buffer);
  return {
    fullText: result.fullText || '',
    annotations: Array.isArray(result.annotations) ? result.annotations : [],
  };
}

async function extractDocumentTextFromImage(buffer) {
  ensureVisionKey();
  ensureImageBuffer(buffer);

  const result = await detectDocumentText(buffer);
  return {
    fullText: result.fullText || '',
    pages: Array.isArray(result.pages) ? result.pages : [],
  };
}

async function detectLabelsFromImage(buffer) {
  ensureVisionKey();
  ensureImageBuffer(buffer);

  const result = await detectLabels(buffer);
  return {
    labels: Array.isArray(result.labels) ? result.labels : [],
  };
}

module.exports = {
  extractTextFromImage,
  extractDocumentTextFromImage,
  detectLabelsFromImage,
};
