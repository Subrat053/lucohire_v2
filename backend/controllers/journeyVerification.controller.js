const certificateService = require('../services/resumeJourney/certificate.service');

exports.verifyCertificate = async (req, res) => {
  try {
    const { verificationId } = req.params;
    const result = await certificateService.verifyPublicCertificate(verificationId);
    if (!result.valid) {
      return res.status(404).json({ success: false, data: result });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
