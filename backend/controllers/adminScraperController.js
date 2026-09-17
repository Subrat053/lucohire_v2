const StagingCandidate = require('../models/StagingCandidate');

exports.getStagingCandidates = async (req, res) => {
  try {
    const { status, leadStatus, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (leadStatus) query.leadStatus = leadStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const candidates = await StagingCandidate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StagingCandidate.countDocuments(query);

    res.json({
      success: true,
      data: candidates,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStagingCandidateToggle = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value } = req.body; // type: 'email' | 'whatsapp', value: boolean

    const updateFields = {};
    if (type === 'email') updateFields.emailToggle = value;
    if (type === 'whatsapp') updateFields.whatsappToggle = value;

    const candidate = await StagingCandidate.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
