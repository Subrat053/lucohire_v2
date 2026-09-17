const mongoose = require('mongoose');

const stagingCandidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  skills: [{ type: String }],
  location: { type: String, default: '' },
  
  // Scoring & Status
  activeScore: { type: Number, default: 0 },
  leadStatus: { type: String, enum: ['Raw Lead', 'Active Signal Lead', 'Verified Active Candidate'], default: 'Raw Lead' },
  
  // Score Triggers (Dates & Booleans)
  resumeUpdatedAt: { type: Date, default: null },
  openToWork: { type: Boolean, default: false },
  recentlyActive: { type: Boolean, default: false },
  noticePeriodAvailable: { type: Boolean, default: false },
  preferredJobTypeAvailable: { type: Boolean, default: false },
  resumeUploaded: { type: Boolean, default: false },
  appliedToJob: { type: Boolean, default: false },
  claimLinkClicked: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  consentAccepted: { type: Boolean, default: false },
  profileCompleted: { type: Boolean, default: false },
  
  // Apify source tracking
  apifyRunId: { type: String, default: '' },
  sourceQuery: { type: String, default: '' },

  // Verification & Conversion Flow
  claimToken: { type: String, unique: true, required: true },
  claimExpiresAt: { type: Date, required: true },

  // Outreach Triggers Matrix (Admin Configurable)
  emailToggle: { type: Boolean, default: true },
  whatsappToggle: { type: Boolean, default: true },
  smsToggle: { type: Boolean, default: false },

  // Outreach Status Tracking
  emailSentAt: { type: Date, default: null },
  whatsappSentAt: { type: Date, default: null },
  smsSentAt: { type: Date, default: null },

  status: { type: String, enum: ['staged', 'outreach_sent', 'claimed', 'expired'], default: 'staged' },
  
  // Career Versioning
  careerHistory: [{
    jobTitle: String,
    skills: [String],
    location: String,
    importedAt: { type: Date, default: Date.now },
    sourceQuery: String
  }],
  lastImportedAt: { type: Date, default: Date.now },
  publicProfileUrl: { type: String, default: '' }
}, { timestamps: true });

// Auto-expire documents after 30 days if not claimed
stagingCandidateSchema.index({ claimExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('StagingCandidate', stagingCandidateSchema);
