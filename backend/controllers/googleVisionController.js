const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/appError');
const {
  detectText,
  detectDocumentText,
  detectLabels,
  detectFaces,
  detectLogos,
} = require('../services/googleVision.service');

function ensureUpload(req) {
  if (!req.file || !req.file.buffer) {
    throw new AppError('No image file uploaded. Use form-data with field name "image".', 400, 'FILE_REQUIRED');
  }
}

const ocrTextFromUpload = asyncHandler(async (req, res) => {
  ensureUpload(req);
  const data = await detectText(req.file.buffer);

  res.status(200).json({
    success: true,
    message: 'OCR completed successfully',
    data,
  });
});

const ocrDocumentFromUpload = asyncHandler(async (req, res) => {
  ensureUpload(req);
  const data = await detectDocumentText(req.file.buffer);

  res.status(200).json({
    success: true,
    message: 'Document OCR completed successfully',
    data,
  });
});

const detectLabelsFromUpload = asyncHandler(async (req, res) => {
  ensureUpload(req);
  const data = await detectLabels(req.file.buffer);

  res.status(200).json({
    success: true,
    message: 'Label detection completed successfully',
    data,
  });
});

const detectFacesFromUpload = asyncHandler(async (req, res) => {
  ensureUpload(req);
  const data = await detectFaces(req.file.buffer);

  res.status(200).json({
    success: true,
    message: 'Face detection completed successfully',
    data,
  });
});

const detectLogosFromUpload = asyncHandler(async (req, res) => {
  ensureUpload(req);
  const data = await detectLogos(req.file.buffer);

  res.status(200).json({
    success: true,
    message: 'Logo detection completed successfully',
    data,
  });
});

module.exports = {
  ocrTextFromUpload,
  ocrDocumentFromUpload,
  detectLabelsFromUpload,
  detectFacesFromUpload,
  detectLogosFromUpload,
};
