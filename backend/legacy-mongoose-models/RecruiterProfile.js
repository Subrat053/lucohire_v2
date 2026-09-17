const mongoose = require('mongoose');
const { approvalSectionSchema, activityLogSchema } = require('./ProfileSectionReview');

const recruiterProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  companyType: { type: String, enum: ['company', 'shop', 'home', 'individual', 'other'], default: 'individual' },
  industry: { type: String, default: '' },
  companySize: { type: String, default: '' },
  foundedYear: { type: String, default: '' },
  city: { type: String, default: '', trim: true },
  state: { type: String, default: '', trim: true },
  nearestLocation: { type: String, default: '', trim: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  location: {
    placeId: { type: String, default: '' },
    name: { type: String, default: '' },
    formattedAddress: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    source: { type: String, default: 'google_places' },
  },
  locationData: { type: Object, default: null },

  geoPoint: {
    type: {
      type: String,
      enum: ['Point'],
      default: undefined,
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },

  locationUpdatedAt: { type: Date, default: null },
  description: { type: String, default: '' },
  skillsNeeded: [{ type: String, trim: true }],   // skills the recruiter wants to hire for
  hiringPreferences: {
    preferredBudgetType: { type: String, default: '' },
    preferredUrgency: { type: String, default: '' },
    preferredShiftType: { type: String, default: '' },
    preferredTimeOfDay: { type: String, default: '' },
    preferredRadiusKm: { type: Number, default: null },
  },

  // Unlock pack
  currentPlan: { type: String, default: 'free' },
  planExpiresAt: { type: Date },
  unlocksRemaining: { type: Number, default: 0 },
  unlockPackSize: { type: Number, default: 0 },
  boostJobsRemaining: { type: Number, default: 0 },
  boostDaysRemaining: { type: Number, default: 0 },
  
  // Core AI & Action Limits
  jobPostLimitRemaining: { type: Number, default: 0 },
  outreachCampaignsRemaining: { type: Number, default: 0 },
  directMessagingRemaining: { type: Number, default: 0 },
  aiJdGeneratorRemaining: { type: Number, default: 0 },
  aiJdParsingRemaining: { type: Number, default: 0 },
  aiCopilotRemaining: { type: Number, default: 0 },
  interviewKitsRemaining: { type: Number, default: 0 },
  customReportsRemaining: { type: Number, default: 0 },

  // Free limit tracking
  freeProfileViews: { type: Number, default: 0 },
  freeViewResetAt: { type: Date },
  freeUnlockResetAt: { type: Date },

  profilePhoto: { type: String, default: "" },
  profileName: { type: String, default: "" }, // Separate display name for recruiter
  companyLogo: { type: String, default: "" },
  businessType: { type: String, default: "" },
  companyWebsite: { type: String, default: "" },
  countryCode: { type: String, default: "", trim: true, uppercase: true },
  timezone: { type: String, default: "", trim: true },
  hiringLocation: { type: String, default: "" },
  contactPersonName: { type: String, default: "" },
  designation: { type: String, default: "" },
  bio: { type: String, default: "" }, // user bio for recruiter
  
  careerPageSettings: {
    url: { type: String, default: "" },
    primaryColor: { type: String, default: "#4F46E5" },
    secondaryColor: { type: String, default: "#111827" },
    showCompanyLogo: { type: Boolean, default: true },
    showCultureSection: { type: Boolean, default: true },
    allowResumeDownload: { type: Boolean, default: true },
    anonymousApplications: { type: Boolean, default: false },
  },

  profilePhotoApproval: {
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    pendingUrl: { type: String, default: "" },
    approvedUrl: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },

  approvalSections: {
    type: [approvalSectionSchema],
    default: [],
  },
  activityLogs: {
    type: [activityLogSchema],
    default: [],
  },


  // Reputation
  avgRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },

  // Approval
  isApproved: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  approvalAction: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' },
  approvalNote: { type: String, default: '' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedByRole: { type: String, enum: ['admin', 'manager'], default: null },
  approvedAt: { type: Date, default: null },

  // WhatsApp
  whatsappAlerts: { type: Boolean, default: true },

  // Validity
  profileExpiresAt: { type: Date },
  renewalReminderSent: { type: Boolean, default: false },

  // Stats
  totalJobsPosted: { type: Number, default: 0 },
  totalUnlocks: { type: Number, default: 0 },
  totalHires: { type: Number, default: 0 },
}, { timestamps: true });

recruiterProfileSchema.pre('save', function normalizeGeoPoint(next) {
  const lat = Number(this.location?.latitude || this.locationData?.latitude);
  const lng = Number(this.location?.longitude || this.locationData?.longitude);

  const hasValidCoordinates = Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;

  if (hasValidCoordinates) {
    this.geoPoint = {
      type: 'Point',
      coordinates: [lng, lat],
    };
  } else {
    this.geoPoint = undefined;
  }

  next();
});

recruiterProfileSchema.index({ geoPoint: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('RecruiterProfile', recruiterProfileSchema);
