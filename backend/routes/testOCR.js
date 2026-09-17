const express = require('express');
const router = express.Router();
const { extractAadhaarFields } = require('../services/ai/documentVerificationService');

router.post('/test-ocr', async (req, res) => {
  try {
    const { documentUrl } = req.body;

    const result = await extractAadhaarFields({ documentUrl });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;