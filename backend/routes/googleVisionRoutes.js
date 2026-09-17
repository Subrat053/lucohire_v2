const express = require('express');
const {
  ocrTextFromUpload,
  ocrDocumentFromUpload,
  detectLabelsFromUpload,
  detectFacesFromUpload,
  detectLogosFromUpload,
} = require('../controllers/googleVisionController');
const { visionUpload } = require('../middleware/uploadVision');

const router = express.Router();

router.post('/ocr-text', visionUpload.single('image'), ocrTextFromUpload);
router.post('/ocr-document', visionUpload.single('image'), ocrDocumentFromUpload);
router.post('/labels', visionUpload.single('image'), detectLabelsFromUpload);
router.post('/faces', visionUpload.single('image'), detectFacesFromUpload);
router.post('/logos', visionUpload.single('image'), detectLogosFromUpload);

module.exports = router;
