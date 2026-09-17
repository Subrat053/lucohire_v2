const {
  ensureProviderProfile,
  findProviderProfileByUserId,
  saveProviderProfile,
  updateProviderProfile,
} = require('../services/providerProfilePersistenceService');
const FreelancerContactConsentRequest = require('../models/pipeline/FreelancerContactConsentRequest');
const PipelineAuditLog = require('../models/pipeline/PipelineAuditLog');

// ─── Freelancer Profile Core ────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const profile = await findProviderProfileByUserId(req.user._id);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    let profile = await ensureProviderProfile(req.user._id);
    Object.assign(profile, req.body || {});
    profile = await saveProviderProfile(profile);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateVisibility = async (req, res) => {
  try {
    const { visibility } = req.body;
    const existing = await findProviderProfileByUserId(req.user._id);
    const profile = existing
      ? await updateProviderProfile(req.user._id, { visibility })
      : null;
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Contact Consent Flow ───────────────────────────────────────────────────
exports.requestContact = async (req, res) => {
  try {
    const { freelancerId, requestMessage } = req.body;
    const requesterId = req.user._id;

    // Check if already requested
    const existing = await FreelancerContactConsentRequest.findOne({ freelancerId, requesterId, status: 'pending' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Request already pending' });
    }

    const consent = await FreelancerContactConsentRequest.create({
      freelancerId,
      requesterId,
      requestMessage
    });

    const audit = await PipelineAuditLog.create({
      actionType: 'freelancer_contact_request',
      entityType: 'consent',
      entityId: consent._id,
      triggerSource: 'system_automatic', // or user explicit
      metadata: { freelancerId, requesterId }
    });

    consent.auditLogId = audit._id;
    await consent.save();

    res.json({ success: true, message: 'Contact request sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveContactRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await FreelancerContactConsentRequest.findOne({ _id: id, freelancerId: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = 'approved';
    request.respondedAt = new Date();
    await request.save();

    await PipelineAuditLog.create({
      actionType: 'freelancer_contact_approve',
      entityType: 'consent',
      entityId: request._id,
      triggerSource: 'admin_manual', // or user explicit
      adminUserId: req.user._id
    });

    res.json({ success: true, message: 'Request approved. They can now contact you on WhatsApp.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectContactRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await FreelancerContactConsentRequest.findOne({ _id: id, freelancerId: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = 'rejected';
    request.respondedAt = new Date();
    await request.save();

    await PipelineAuditLog.create({
      actionType: 'freelancer_contact_reject',
      entityType: 'consent',
      entityId: request._id,
      triggerSource: 'admin_manual',
      adminUserId: req.user._id
    });

    res.json({ success: true, message: 'Request rejected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
