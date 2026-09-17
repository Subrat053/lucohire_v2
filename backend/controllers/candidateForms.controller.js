const { processCandidateData } = require('../modules/candidateSourcing/smartRun.service');
const SourceConnector = require('../models/SourceConnector');

// Handles inputs from native forms (LucoHire Candidate Registration, Referral, Resume Review)
const submitNativeForm = async (req, res) => {
  try {
    const { sourceName, candidateData } = req.body;

    let source = await SourceConnector.findOne({ sourceName });
    if (!source) {
      // Fallback: create a system source on the fly if not exists
      source = new SourceConnector({
        sourceName: sourceName || 'Native Form',
        sourceType: 'Internal LucoHire Form',
        status: 'Free / Ready'
      });
      await source.save();
    }

    // Create a mock run log ID for single-record inserts
    const result = await processCandidateData([candidateData], null, source);

    res.status(200).json({ success: true, message: 'Candidate submitted successfully', result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  submitNativeForm
};
