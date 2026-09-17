/**
 * profileReviewController.js
 * Complete Profile Review System for Admin Panel
 *
 * Features:
 *  - Smart global search (name, email, phone, city, state, country, skills, portfolio, etc.)
 *  - Server-side pagination, sorting, and filtering
 *  - Cascading location dropdowns (country → state → city)
 *  - Per-section approve / reject with remark history
 *  - Bulk approve / reject for multiple profiles
 *  - Activity timeline per profile
 *  - Email notifications on reject / correction request
 */

'use strict';

const { isValidId } = require('../utils/id');
const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');
const { sendMail } = require('../services/mailService');

// ─── Helpers ────────────────────────────────────────────────────────────────

const toInt = (v, def = 1) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

const getProfileDelegate = (role) => {
  if (role === 'recruiter') return prisma.recruiterProfile;
  if (role === 'partner') return prisma.partnerProfile;
  return prisma.providerProfile;
};

const getProfileUserField = (role) => (role === 'partner' ? 'userId' : 'user');
const getProfileWhere = (role, userId) => ({ [getProfileUserField(role)]: String(userId) });

const findProfile = async (role, userId, options = {}) => {
  const profile = await getProfileDelegate(role).findUnique({
    where: getProfileWhere(role, userId),
    ...options,
  });
  return withLegacyId(profile);
};

const updateProfile = async (role, profileId, data) => withLegacyId(
  await getProfileDelegate(role).update({
    where: { id: String(profileId) },
    data,
  })
);

const saveProfileReview = async (role, profile, data, userId, userData = null) => {
  const writes = [getProfileDelegate(role).update({
    where: { id: String(profile.id) },
    data,
  })];
  if (userData && Object.keys(userData).length > 0) {
    writes.push(prisma.user.update({ where: { id: String(userId) }, data: userData }));
  }
  const [savedProfile] = await prisma.$transaction(writes);
  return withLegacyId(savedProfile);
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const toJson = (value) => JSON.parse(JSON.stringify(value));
const includesText = (value, search) => String(value || '').toLowerCase().includes(String(search || '').toLowerCase());

const nestedValues = (value, key) => {
  if (Array.isArray(value)) return value.flatMap((item) => nestedValues(item, key));
  if (!value || typeof value !== 'object') return [];
  return [value[key], ...Object.values(value).flatMap((item) => nestedValues(item, key))].filter(Boolean);
};

const profileLocationValues = (profile, field) => [
  profile?.[field],
  ...nestedValues(profile?.location, field),
  ...nestedValues(profile?.serviceLocations, field),
  ...(field === 'country' ? [profile?.hiringLocation] : []),
].filter(Boolean);

const profileMatchesLocation = (profile, country, state, city) => {
  const matches = (field, search) => !search || [
    ...profileLocationValues(profile, field),
    ...asArray(profile?.locations),
    ...(field === 'city' || field === 'state' ? [profile?.nearestLocation] : []),
  ].some((value) => includesText(value, search));
  if (!matches('country', country)) return false;
  if (!matches('state', state)) return false;
  if (!matches('city', city)) return false;
  return true;
};

const profileMatchesSearch = (profile, search) => {
  if (!search) return true;
  const searchable = [
    profile?.city,
    profile?.state,
    profile?.country,
    profile?.companyName,
    profile?.hiringLocation,
    profile?.resumeUrl,
    ...asArray(profile?.skills),
    ...nestedValues(profile?.specialities, 'name'),
    ...nestedValues(profile?.portfolioLinks, 'url'),
    ...profileLocationValues(profile, 'city'),
    ...profileLocationValues(profile, 'state'),
    ...profileLocationValues(profile, 'country'),
  ];
  return searchable.some((value) => includesText(value, search));
};

const profileMatchesStatus = (profile, status, role) => {
  if (!status || status === 'all') return true;
  const photoStatus = profile?.profilePhotoApproval?.status;
  const resumeStatus = role === 'provider' ? profile?.resumeApproval?.status : undefined;
  const sectionStatuses = asArray(profile?.approvalSections).map((section) => section?.status);
  if (status === 'approved') return role === 'partner'
    ? sectionStatuses.includes('approved')
    : profile?.isApproved === true || photoStatus === 'approved';
  if (status === 'rejected') return role === 'partner'
    ? sectionStatuses.includes('rejected')
    : profile?.approvalAction === 'rejected' || photoStatus === 'rejected' || resumeStatus === 'rejected';
  if (status === 'pending') return role === 'partner'
    ? sectionStatuses.includes('pending') || sectionStatuses.length === 0
    : photoStatus === 'pending' || resumeStatus === 'pending' || profile?.isApproved === false;
  return true;
};

const SECTION_ROLE_MAP = {
  resume: 'provider',
  portfolio: 'provider',
  documents: 'provider',
  skills: 'provider',
  serviceAreas: 'provider',
  businessDetails: 'provider',
  
  companyLogo: 'recruiter',
  companyDetails: 'recruiter',
  companyWebsite: 'recruiter',
  
  businessInfo: 'partner',
};

const getRoleForSection = (sectionKey, userRoles) => {
  const targetRole = SECTION_ROLE_MAP[sectionKey];
  if (targetRole) return userRoles.includes(targetRole) ? targetRole : null;
  return userRoles.includes('provider') ? 'provider'
    : userRoles.includes('recruiter') ? 'recruiter'
    : userRoles.includes('partner') ? 'partner'
    : 'provider';
};

/** Build the approvalSections array for a profile based on its role */
const buildSectionsTemplate = (role) => {
  const common = [
    { key: 'profilePhoto', label: role === 'recruiter' ? 'Company Logo / Profile Photo' : 'Profile Photo' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'email', label: 'Email Address' },
  ];

  if (role === 'provider') {
    return [
      ...common,
      { key: 'businessDetails', label: 'Bio & Professional Details' },
      { key: 'resume', label: 'Resume / CV' },
      { key: 'portfolio', label: 'Portfolio Links' },
      { key: 'documents', label: 'Verification Documents' },
      { key: 'skills', label: 'Skills & Specialities' },
      { key: 'serviceAreas', label: 'Service Areas' },
    ];
  }
  if (role === 'recruiter') {
    return [
      ...common,
      { key: 'companyDetails', label: 'Company Details' },
      { key: 'companyWebsite', label: 'Website' },
    ];
  }
  // partner
  return [
    ...common,
    { key: 'businessInfo', label: 'Business Info' },
  ];
};

// ─── Stats ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/profile-reviews/stats
 */
const getProfileReviewStats = async (req, res) => {
  try {
    const [
      totalProfiles,
      pendingPhotoProvider,
      pendingPhotoRecruiter,
      approvedProvider,
      approvedRecruiter,
      rejectedProvider,
      rejectedRecruiter,
      pendingResume,
      approvedResume,
      rejectedResume,
    ] = await Promise.all([
      prisma.user.count({ where: { NOT: { roles: { hasSome: ['admin', 'manager'] } } } }),
      prisma.providerProfile.count({ where: { profilePhotoApproval: { path: ['status'], equals: 'pending' } } }),
      prisma.recruiterProfile.count({ where: { profilePhotoApproval: { path: ['status'], equals: 'pending' } } }),
      prisma.providerProfile.count({ where: { isApproved: true } }),
      prisma.recruiterProfile.count({ where: { isApproved: true } }),
      prisma.providerProfile.count({ where: { isApproved: false, approvalAction: 'rejected' } }),
      prisma.recruiterProfile.count({ where: { isApproved: false, approvalAction: 'rejected' } }),
      prisma.providerProfile.count({ where: { resumeApproval: { path: ['status'], equals: 'pending' } } }),
      prisma.providerProfile.count({ where: { resumeApproval: { path: ['status'], equals: 'approved' } } }),
      prisma.providerProfile.count({ where: { resumeApproval: { path: ['status'], equals: 'rejected' } } }),
    ]);

    const pendingDocs = pendingPhotoProvider + pendingPhotoRecruiter + pendingResume;
    const approvedDocs = approvedResume;
    const rejectedDocs = rejectedResume;

    return res.json({
      totalProfiles,
      pending: pendingPhotoProvider + pendingPhotoRecruiter,
      approved: approvedProvider + approvedRecruiter,
      rejected: rejectedProvider + rejectedRecruiter,
      underReview: pendingPhotoProvider + pendingPhotoRecruiter + pendingResume,
      correctionRequested: rejectedProvider + rejectedRecruiter + rejectedResume,
      pendingDocs,
      approvedDocs,
      rejectedDocs,
    });
  } catch (err) {
    console.error('[ProfileReviewStats]', err.message);
    return res.status(500).json({ message: 'Failed to load stats', error: err.message });
  }
};

// ─── Distinct Locations ───────────────────────────────────────────────────────

const INDIAN_STATES_CITIES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Kakinada", "Tirupati", "Rajahmundry", "Kadapa", "Anantapur"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Raigarh", "Jagdalpur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Panchkula"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi", "Solan", "Bilaspur", "Kullu", "Hamirpur"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh", "Deoghar"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Belagavi", "Mangaluru", "Davanagere", "Ballari", "Kalaburagi", "Shivamogga"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Kalyan-Dombivli", "Vasai-Virar", "Aurangabad", "Solapur", "Amravati", "Navi Mumbai"],
  "Manipur": ["Imphal", "Churachandpur", "Thoubal"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Sikar"],
  "Sikkim": ["Gangtok", "Namchi", "Geyzing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Tirunelveli"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Prayagraj", "Noida", "Bareilly", "Aligarh", "Gorakhpur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rishikesh", "Nainital"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Central Delhi"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  "Ladakh": ["Leh", "Kargil"],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry", "Karaikal"]
};

/**
 * GET /api/v1/admin/profile-reviews/distinct-locations
 * query: { country?, state? }
 */
const getDistinctLocations = async (req, res) => {
  try {
    const { country, state } = req.query;

    const [providerProfiles, recruiterProfiles, users] = await Promise.all([
      prisma.providerProfile.findMany({
        select: { city: true, state: true, location: true, serviceLocations: true, locations: true, nearestLocation: true },
      }),
      prisma.recruiterProfile.findMany({
        select: { city: true, state: true, countryCode: true, location: true, hiringLocation: true, nearestLocation: true },
      }),
      prisma.user.findMany({ where: { country: { not: '' } }, select: { country: true } }),
    ]);

    const profiles = [...providerProfiles, ...recruiterProfiles];

    const isIndia = !country || /india|in/i.test(String(country).trim());

    const countries = [...new Set([
      "India",
      ...users.map((user) => user.country),
      ...profiles.flatMap((profile) => profileLocationValues(profile, 'country')),
      ...recruiterProfiles.map((profile) => profile.countryCode),
    ])].filter(Boolean).map(c => String(c).trim()).filter(c => c.length > 0).sort();

    const standardIndianStates = Object.keys(INDIAN_STATES_CITIES);
    let states = [...new Set([
      ...(isIndia ? standardIndianStates : []),
      ...profiles.flatMap((profile) => profileLocationValues(profile, 'state')),
    ])].filter(Boolean).map(s => String(s).trim()).filter(s => s.length > 0).sort();

    let standardCities = [];
    if (state) {
      const matchedKey = Object.keys(INDIAN_STATES_CITIES).find(
        k => k.toLowerCase() === String(state).trim().toLowerCase()
      );
      if (matchedKey) {
        standardCities = INDIAN_STATES_CITIES[matchedKey];
      }
    } else if (isIndia) {
      standardCities = Object.values(INDIAN_STATES_CITIES).flat();
    }

    let cities = [...new Set([
      ...standardCities,
      ...profiles.flatMap((profile) => profileLocationValues(profile, 'city')),
    ])].filter(Boolean).map(c => String(c).trim()).filter(c => c.length > 0).sort();

    if (country && !isIndia) {
      const countryProfiles = profiles.filter((profile) => profileMatchesLocation(profile, country));
      const filteredStates = [...new Set(countryProfiles.flatMap((profile) => profileLocationValues(profile, 'state')))]
        .filter(Boolean).map(s => String(s).trim()).filter(s => s.length > 0).sort();
      if (filteredStates.length > 0) states = filteredStates;
      cities = [...new Set(countryProfiles.flatMap((profile) => profileLocationValues(profile, 'city')))]
        .filter(Boolean).map(c => String(c).trim()).filter(c => c.length > 0).sort();
    }

    return res.json({ countries, states, cities });
  } catch (err) {
    console.error('[DistinctLocations]', err.message);
    return res.status(500).json({ message: 'Failed to load locations', error: err.message });
  }
};

// ─── List Profiles ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/profile-reviews
 * query: { page, limit, search, role, status, country, state, city, sortBy }
 */
const getProfileReviews = async (req, res) => {
  try {
    const page = Math.max(toInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(toInt(req.query.limit, 15), 1), 100);
    const skip = (page - 1) * limit;
    const { search, role, status, country, state, city, sortBy = 'newest' } = req.query;

    if (role && role !== 'all' && !['provider', 'recruiter', 'partner'].includes(role)) {
      return res.status(400).json({ message: 'role must be provider, recruiter, partner, or all' });
    }
    const queryRoles = role && role !== 'all' ? [role] : ['provider', 'recruiter', 'partner'];
    const userWhere = {
      NOT: { roles: { hasSome: ['admin', 'manager'] } },
      ...(role && role !== 'all' ? { roles: { has: role } } : {}),
    };
    const andFilters = [];
    const needsProfileScan = Boolean(country || state || city || (status && status !== 'all') || (search && search.trim()));
    let scannedProfiles = [];

    if (needsProfileScan) {
      const profileGroups = await Promise.all(queryRoles.map(async (profileRole) => {
        const rows = await getProfileDelegate(profileRole).findMany();
        return rows.map((profile) => ({ role: profileRole, profile }));
      }));
      scannedProfiles = profileGroups.flat();
    }

    if (country || state || city || (status && status !== 'all')) {
      const matchingProfileUserIds = scannedProfiles
        .filter(({ role: profileRole, profile }) => (
          profileMatchesLocation(profile, country, state, city)
          && profileMatchesStatus(profile, status, profileRole)
        ))
        .map(({ role: profileRole, profile }) => String(profile[getProfileUserField(profileRole)]));
      andFilters.push({ id: { in: [...new Set(matchingProfileUserIds)] } });
    }

    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const profileSearchUserIds = scannedProfiles
        .filter(({ profile }) => profileMatchesSearch(profile, trimmedSearch))
        .map(({ role: profileRole, profile }) => String(profile[getProfileUserField(profileRole)]));
      andFilters.push({
        OR: [
          { name: { contains: trimmedSearch, mode: 'insensitive' } },
          { email: { contains: trimmedSearch, mode: 'insensitive' } },
          { phone: { contains: trimmedSearch, mode: 'insensitive' } },
          { country: { contains: trimmedSearch, mode: 'insensitive' } },
          { id: { in: [...new Set(profileSearchUserIds)] } },
        ],
      });
    }

    if (andFilters.length > 0) userWhere.AND = andFilters;

    // ── Sort ──────────────────────────────────────────────────────────────
    const sortMap = {
      newest: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      name: { name: 'asc' },
    };
    const userSort = sortMap[sortBy] || sortMap.newest;

    // ── Fetch users ────────────────────────────────────────────────────────
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true, name: true, email: true, phone: true, country: true, roles: true,
          activeRole: true, profilePhoto: true, profilePhotoApproval: true, avatar: true,
          createdAt: true, approvalStatus: true, isBlocked: true,
        },
        orderBy: userSort,
        skip,
        take: limit,
      }).then(withLegacyIds),
      prisma.user.count({ where: userWhere }),
    ]);

    if (users.length === 0) {
      return res.json({
        users: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    // ── Attach profile data ────────────────────────────────────────────────
    const userIds = users.map(u => u.id);

    const [providerProfiles, recruiterProfiles, partnerProfiles] = await Promise.all([
      prisma.providerProfile.findMany({ where: { user: { in: userIds } } }).then(withLegacyIds),
      prisma.recruiterProfile.findMany({ where: { user: { in: userIds } } }).then(withLegacyIds),
      prisma.partnerProfile.findMany({ where: { userId: { in: userIds } } }).then(withLegacyIds),
    ]);

    const providerMap = new Map(providerProfiles.map(p => [String(p.user), p]));
    const recruiterMap = new Map(recruiterProfiles.map(p => [String(p.user), p]));
    const partnerMap = new Map(partnerProfiles.map(p => [String(p.userId), p]));

    const enriched = users.map(u => {
      const uid = String(u._id);
      const roles = Array.isArray(u.roles) ? u.roles : [];
      const primaryRole = roles.includes('partner') ? 'partner'
        : roles.includes('recruiter') ? 'recruiter'
        : roles.includes('provider') ? 'provider'
        : roles[0] || 'user';

      const providerProfile = providerMap.get(uid);
      const recruiterProfile = recruiterMap.get(uid);
      const partnerProfile = partnerMap.get(uid);

      const profile = primaryRole === 'partner' ? (partnerProfile || recruiterProfile || providerProfile)
        : primaryRole === 'recruiter' ? (recruiterProfile || providerProfile || partnerProfile)
        : (providerProfile || recruiterProfile || partnerProfile);

      const photo = (providerProfile?.profilePhotoApproval?.status === 'pending' && providerProfile?.profilePhotoApproval?.pendingUrl) ||
                    (recruiterProfile?.profilePhotoApproval?.status === 'pending' && recruiterProfile?.profilePhotoApproval?.pendingUrl) ||
                    (u.profilePhotoApproval?.status === 'pending' && u.profilePhotoApproval?.pendingUrl) ||
                    providerProfile?.profilePhoto ||
                    recruiterProfile?.profilePhoto ||
                    u.profilePhoto ||
                    u.avatar ||
                    '';
      
      const photoStatus = (providerProfile?.profilePhotoApproval?.status === 'pending' || recruiterProfile?.profilePhotoApproval?.status === 'pending' || u.profilePhotoApproval?.status === 'pending')
        ? 'pending'
        : (providerProfile?.profilePhotoApproval?.status || recruiterProfile?.profilePhotoApproval?.status || u.profilePhotoApproval?.status || 'none');
        
      const resumeStatus = providerProfile?.resumeApproval?.status || 'none';
      const portfolioCount = Array.isArray(providerProfile?.portfolioLinks) ? providerProfile.portfolioLinks.length : 0;
      let linksStatus = 'none';
      if (portfolioCount > 0) {
        if (providerProfile.portfolioLinks.some(l => l.status === 'pending')) linksStatus = 'pending';
        else if (providerProfile.portfolioLinks.some(l => l.status === 'rejected')) linksStatus = 'rejected';
        else linksStatus = 'approved';
      }

      const locationCity = profile?.location?.city || profile?.city || '';
      const locationState = profile?.location?.state || profile?.state || '';
      const locationCountry = profile?.location?.country || u.country || '';

      return {
        _id: u._id,
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        country: locationCountry,
        state: locationState,
        city: locationCity,
        roles,
        primaryRole,
        profilePhoto: photo,
        profileCompletion: profile?.profileCompletion || 0,
        isApproved: primaryRole === 'partner' ? u.approvalStatus === 'approved' : profile?.isApproved || false,
        approvalAction: primaryRole === 'partner' ? u.approvalStatus || 'pending' : profile?.approvalAction || 'pending',
        approvalStatus: u.approvalStatus || 'approved',
        isBlocked: u.isBlocked || false,
        photoStatus,
        resumeStatus,
        linksStatus,
        portfolioCount,
        skills: Array.isArray(profile?.skills) ? profile.skills.slice(0, 3) : [],
        companyName: profile?.companyName || '',
        createdAt: u.createdAt,
        hasProfileData: !!profile,
      };
    });

    return res.json({
      users: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[getProfileReviews]', err.message);
    return res.status(500).json({ message: 'Failed to load profiles', error: err.message });
  }
};

// ─── Get Single Profile Detail ─────────────────────────────────────────────

/**
 * GET /api/v1/admin/profile-reviews/:userId
 */
const getProfileReviewDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = withLegacyId(await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true, name: true, email: true, phone: true, phoneHistory: true, country: true,
        roles: true, profilePhoto: true, profilePhotoApproval: true, avatar: true,
        approvalStatus: true, isBlocked: true, createdAt: true,
      },
    }));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const primaryRole = roles.includes('partner') ? 'partner'
      : roles.includes('recruiter') ? 'recruiter'
      : 'provider';

    // Fetch all profiles the user has
    const providerProfile = roles.includes('provider')
      ? await findProfile('provider', userId)
      : null;
    const recruiterProfile = roles.includes('recruiter')
      ? await findProfile('recruiter', userId)
      : null;
    const partnerProfile = roles.includes('partner')
      ? await findProfile('partner', userId)
      : null;

    // Use primary profile for legacy fields and general fallback
    const profile = primaryRole === 'partner' ? (partnerProfile || recruiterProfile || providerProfile)
      : primaryRole === 'recruiter' ? (recruiterProfile || providerProfile || partnerProfile)
      : (providerProfile || recruiterProfile || partnerProfile);

    // Build unique templates for all user roles
    const templates = [];
    const common = [
      { key: 'profilePhoto', label: roles.includes('recruiter') ? 'Company Logo / Profile Photo' : 'Profile Photo' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'email', label: 'Email Address' },
    ];
    templates.push(...common);

    if (roles.includes('provider')) {
      templates.push(
        { key: 'businessDetails', label: 'Bio & Professional Details' },
        { key: 'resume', label: 'Resume / CV' },
        { key: 'portfolio', label: 'Portfolio Links' },
        { key: 'documents', label: 'Verification Documents' },
        { key: 'skills', label: 'Skills & Specialities' },
        { key: 'serviceAreas', label: 'Service Areas' }
      );
    }
    if (roles.includes('recruiter')) {
      templates.push(
        { key: 'companyDetails', label: 'Company Details' },
        { key: 'companyWebsite', label: 'Website' }
      );
    }
    if (roles.includes('partner')) {
      templates.push(
        { key: 'businessInfo', label: 'Business Info' }
      );
    }

    // Merge approvalSections from all user profiles
    const existingSections = [
      ...(providerProfile?.approvalSections || []),
      ...(recruiterProfile?.approvalSections || []),
      ...(partnerProfile?.approvalSections || []),
    ];
    const existingMap = new Map();
    existingSections.forEach(s => {
      if (existingMap.has(s.key)) {
        if (s.status === 'approved' || s.status === 'rejected') {
          existingMap.set(s.key, s);
        }
      } else {
        existingMap.set(s.key, s);
      }
    });

    const sections = templates.map(t => {
      const existing = existingMap.get(t.key) || {};
      return {
        key: t.key,
        label: t.label,
        status: existing.status || 'not_submitted',
        url: existing.url || '',
        remarks: Array.isArray(existing.remarks) ? existing.remarks : [],
        reviewedBy: existing.reviewedBy || null,
        reviewedAt: existing.reviewedAt || null,
      };
    });

    // Inject data from appropriate profile
    sections.forEach(s => {
      if (s.key === 'profilePhoto') {
        s.url = (providerProfile?.profilePhotoApproval?.pendingUrl) ||
                (recruiterProfile?.profilePhotoApproval?.pendingUrl) ||
                (user.profilePhotoApproval?.pendingUrl) ||
                (providerProfile?.profilePhoto) ||
                (recruiterProfile?.profilePhoto) ||
                (user.profilePhoto) ||
                (user.avatar) ||
                '';
        s.status = providerProfile?.profilePhotoApproval?.status || recruiterProfile?.profilePhotoApproval?.status || user.profilePhotoApproval?.status || s.status;
        if (s.status === 'none') {
          s.status = s.url ? 'pending' : 'not_submitted';
        }
        const rejReason = providerProfile?.profilePhotoApproval?.rejectionReason || recruiterProfile?.profilePhotoApproval?.rejectionReason || user.profilePhotoApproval?.rejectionReason;
        s.remarks = rejReason ? [{ text: rejReason, source: 'legacy' }] : s.remarks;
      }
      if (s.key === 'resume') {
        if (providerProfile) {
          s.url = providerProfile.resumeApproval?.pendingUrl || providerProfile.resumeUrl || '';
          s.status = providerProfile.resumeApproval?.status || s.status;
          if (s.status === 'none') {
            s.status = s.url ? 'pending' : 'not_submitted';
          }
          s.remarks = providerProfile.resumeApproval?.rejectionReason
            ? [{ text: providerProfile.resumeApproval.rejectionReason, source: 'legacy' }]
            : s.remarks;
        } else {
          s.status = 'not_submitted';
        }
      }
      if (s.key === 'portfolio') {
        if (providerProfile) {
          s.items = Array.isArray(providerProfile.portfolioLinks) ? providerProfile.portfolioLinks : [];
          s.status = s.items.length > 0 ? (s.items.some(l => l.status === 'pending') ? 'pending' : 'approved') : 'not_submitted';
        } else {
          s.status = 'not_submitted';
        }
      }
      if (s.key === 'documents') {
        if (providerProfile) {
          s.items = Array.isArray(providerProfile.documents) ? providerProfile.documents : [];
          s.status = s.items.length > 0 ? (providerProfile.approvalSections?.find(sec => sec.key === 'documents')?.status || 'pending') : 'not_submitted';
        } else {
          s.status = 'not_submitted';
        }
      }
      if (s.key === 'email') {
        s.value = user.email || '';
        s.status = user.email ? 'approved' : 'not_submitted';
      }
      if (s.key === 'phone') {
        s.value = user.phone || '';
        s.status = user.phone ? 'approved' : 'not_submitted';
      }
      if (s.key === 'skills') {
        if (providerProfile) {
          s.items = Array.isArray(providerProfile.skills) ? providerProfile.skills : [];
          s.status = s.items.length > 0 ? 'approved' : 'not_submitted';
        } else {
          s.status = 'not_submitted';
        }
      }
      if (s.key === 'serviceAreas') {
        if (providerProfile) {
          // Deduplicate location parts to avoid repeating the same address components
          const parts = [];
          if (providerProfile.nearestLocation) parts.push(providerProfile.nearestLocation.trim());
          
          const cityStr = providerProfile.city ? providerProfile.city.trim() : '';
          if (cityStr && !parts.some(p => p.toLowerCase().includes(cityStr.toLowerCase()))) {
            parts.push(cityStr);
          }
          
          const stateStr = providerProfile.state ? providerProfile.state.trim() : '';
          if (stateStr && !parts.some(p => p.toLowerCase().includes(stateStr.toLowerCase()))) {
            parts.push(stateStr);
          }
          
          const countryStr = providerProfile.country ? providerProfile.country.trim() : '';
          if (countryStr && !parts.some(p => p.toLowerCase().includes(countryStr.toLowerCase()))) {
            parts.push(countryStr);
          }
          
          let val = parts.filter(Boolean).join(', ');
          if (!val && providerProfile.location?.formattedAddress) {
            val = providerProfile.location.formattedAddress;
          }
          s.value = val;
          s.items = Array.isArray(providerProfile.locations) ? providerProfile.locations : [];
          s.status = (s.value || s.items.length > 0) ? 'approved' : 'not_submitted';
        } else {
          s.status = 'not_submitted';
        }
      }
      if (s.key === 'companyDetails') {
        if (recruiterProfile) {
          s.value = recruiterProfile.companyName || '';
          s.status = s.value ? 'approved' : 'not_submitted';
        } else {
          s.status = 'not_submitted';
        }
      }
      if (s.key === 'businessDetails') {
        if (providerProfile) {
          const specialityNames = Array.isArray(providerProfile.specialities)
            ? providerProfile.specialities.map(sp => sp.name).filter(Boolean).join(', ')
            : '';
          s.value = providerProfile.description || '';
          s.extraFields = {
            experience: providerProfile.experience || '',
            tier: providerProfile.tier || '',
            specialities: specialityNames,
            workMode: providerProfile.workMode || '',
          };
          s.status = (s.value || specialityNames) ? 'approved' : 'not_submitted';
        } else {
          s.status = 'not_submitted';
        }
      }
      if (s.key === 'companyLogo') {
        if (recruiterProfile) {
          s.url = recruiterProfile.companyLogo || '';
          s.status = recruiterProfile.companyLogo ? 'approved' : 'not_submitted';
        } else {
          s.status = 'not_submitted';
        }
      }
      if (s.key === 'companyWebsite') {
        if (recruiterProfile) {
          s.value = recruiterProfile.companyWebsite || '';
          s.status = recruiterProfile.companyWebsite ? 'approved' : 'not_submitted';
        } else {
          s.status = 'not_submitted';
        }
      }
      if (s.key === 'businessInfo') {
        if (partnerProfile) {
          s.value = partnerProfile.businessName || '';
          s.status = partnerProfile.businessName ? 'approved' : 'not_submitted';
        } else {
          s.status = 'not_submitted';
        }
      }
    });

    // Merge activity logs from all profiles
    const activityLogs = [
      ...(providerProfile?.activityLogs || []),
      ...(recruiterProfile?.activityLogs || []),
      ...(partnerProfile?.activityLogs || []),
    ].sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneHistory: user.phoneHistory || [],
        country: user.country,
        roles,
        primaryRole,
        profilePhoto: (providerProfile?.profilePhotoApproval?.status === 'pending' && providerProfile?.profilePhotoApproval?.pendingUrl) ||
                      (recruiterProfile?.profilePhotoApproval?.status === 'pending' && recruiterProfile?.profilePhotoApproval?.pendingUrl) ||
                      (user.profilePhotoApproval?.status === 'pending' && user.profilePhotoApproval?.pendingUrl) ||
                      providerProfile?.profilePhoto ||
                      recruiterProfile?.profilePhoto ||
                      user.profilePhoto ||
                      user.avatar ||
                      '',
        approvalStatus: user.approvalStatus,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
      },
      profile: profile ? {
        _id: profile._id,
        city: profile.location?.city || profile.city || '',
        state: profile.location?.state || profile.state || '',
        country: profile.location?.country || '',
        profileCompletion: profile.profileCompletion || 0,
        isApproved: primaryRole === 'partner' ? user.approvalStatus === 'approved' : profile.isApproved,
        approvalAction: primaryRole === 'partner' ? user.approvalStatus || 'pending' : profile.approvalAction || 'pending',
        tier: profile.tier || '',
        companyName: recruiterProfile?.companyName || profile.companyName || '',
        skills: Array.isArray(providerProfile?.skills) ? providerProfile.skills : [],
        specialities: Array.isArray(providerProfile?.specialities) ? providerProfile.specialities : [],
      } : null,
      sections,
      activityLogs,
    });
  } catch (err) {
    console.error('[getProfileReviewDetail]', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── Section Approve ─────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/admin/profile-reviews/:userId/sections/:sectionKey/approve
 */
const approveSection = async (req, res) => {
  try {
    const { userId, sectionKey } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const adminId = req.user?._id;
    const adminName = req.user?.name || 'Admin';

    const user = withLegacyId(await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { id: true, name: true, email: true, phone: true, roles: true, profilePhoto: true, profilePhotoApproval: true },
    }));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const targetRole = getRoleForSection(sectionKey, roles);
    if (!targetRole) return res.status(400).json({ message: 'Section is not available for this user role' });
    const profile = await findProfile(targetRole, userId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const now = new Date();

    const profileData = {};
    let userData = null;

    // Handle built-in photo/resume fields. Partner photo fields live on User;
    // PartnerProfile intentionally has no photo columns in the Prisma schema.
    if (sectionKey === 'profilePhoto') {
      const currentApproval = targetRole === 'partner'
        ? (user.profilePhotoApproval || {})
        : (profile.profilePhotoApproval || {});
      const nextPhoto = currentApproval.pendingUrl || (targetRole === 'partner' ? user.profilePhoto : profile.profilePhoto) || '';
      const nextApproval = {
        ...currentApproval,
        approvedUrl: currentApproval.pendingUrl || currentApproval.approvedUrl || nextPhoto,
        pendingUrl: '',
        status: 'approved',
        rejectionReason: '',
        reviewedBy: adminId || null,
        reviewedAt: now.toISOString(),
      };
      userData = {
        profilePhoto: nextPhoto,
        profilePhotoApproval: toJson(nextApproval),
      };
      if (targetRole !== 'partner') {
        profileData.profilePhoto = nextPhoto;
        profileData.profilePhotoApproval = toJson(nextApproval);
      }
    } else if (sectionKey === 'resume') {
      const currentApproval = profile.resumeApproval || {};
      const nextResume = currentApproval.pendingUrl || profile.resumeUrl || '';
      profileData.resumeUrl = nextResume;
      profileData.resumeApproval = toJson({
        ...currentApproval,
        approvedUrl: currentApproval.pendingUrl || currentApproval.approvedUrl || nextResume,
        pendingUrl: '',
        status: 'approved',
        rejectionReason: '',
        reviewedBy: adminId || null,
        reviewedAt: now.toISOString(),
      });
    }

    // Update approvalSections array (upsert the key)
    const approvalSections = [...asArray(profile.approvalSections)];
    const idx = approvalSections.findIndex(s => s.key === sectionKey);
    const template = buildSectionsTemplate(targetRole).find(t => t.key === sectionKey);
    const sectionEntry = {
      key: sectionKey,
      label: template?.label || sectionKey,
      status: 'approved',
      reviewedBy: adminId || null,
      reviewedAt: now.toISOString(),
      remarks: idx >= 0 ? (approvalSections[idx].remarks || []) : [],
      url: idx >= 0 ? (approvalSections[idx].url || '') : '',
    };
    if (idx >= 0) approvalSections[idx] = sectionEntry;
    else approvalSections.push(sectionEntry);

    // Activity log
    const activityLogs = [...asArray(profile.activityLogs), {
      action: 'approved',
      section: sectionKey,
      sectionLabel: template?.label || sectionKey,
      adminId: adminId || null,
      adminName,
      timestamp: now.toISOString(),
    }];
    profileData.approvalSections = toJson(approvalSections);
    profileData.activityLogs = toJson(activityLogs);
    await saveProfileReview(targetRole, profile, profileData, userId, userData);

    return res.json({ message: `${sectionKey} approved successfully` });
  } catch (err) {
    console.error('[approveSection]', err.message);
    return res.status(500).json({ message: 'Failed to approve section', error: err.message });
  }
};

// ─── Section Reject ───────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/admin/profile-reviews/:userId/sections/:sectionKey/reject
 * body: { reason }
 */
const rejectSection = async (req, res) => {
  try {
    const { userId, sectionKey } = req.params;
    const { reason = '' } = req.body;
    if (sectionKey === 'phone' || sectionKey === 'email') {
      return res.status(400).json({ message: 'This section cannot be rejected' });
    }
    if (!isValidId(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const adminId = req.user?._id;
    const adminName = req.user?.name || 'Admin';

    const user = withLegacyId(await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { id: true, name: true, email: true, phone: true, roles: true, profilePhotoApproval: true },
    }));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const targetRole = getRoleForSection(sectionKey, roles);
    if (!targetRole) return res.status(400).json({ message: 'Section is not available for this user role' });
    const profile = await findProfile(targetRole, userId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const now = new Date();

    const profileData = {};
    let userData = null;

    // Handle built-in fields
    if (sectionKey === 'profilePhoto') {
      const currentApproval = targetRole === 'partner'
        ? (user.profilePhotoApproval || {})
        : (profile.profilePhotoApproval || {});
      const nextApproval = {
        ...currentApproval,
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: adminId || null,
        reviewedAt: now.toISOString(),
      };
      userData = { profilePhotoApproval: toJson(nextApproval) };
      if (targetRole !== 'partner') profileData.profilePhotoApproval = toJson(nextApproval);
    } else if (sectionKey === 'resume') {
      profileData.resumeApproval = toJson({
        ...profile.resumeApproval,
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: adminId || null,
        reviewedAt: now.toISOString(),
      });
    }

    // Update approvalSections
    const approvalSections = [...asArray(profile.approvalSections)];
    const idx = approvalSections.findIndex(s => s.key === sectionKey);
    const template = buildSectionsTemplate(targetRole).find(t => t.key === sectionKey);
    const remarkEntry = reason ? {
      text: reason,
      adminId: adminId || null,
      adminName,
      createdAt: now.toISOString(),
    } : null;

    const existingSection = idx >= 0 ? approvalSections[idx] : {};
    const newRemarks = [...(existingSection.remarks || [])];
    if (remarkEntry) newRemarks.push(remarkEntry);

    const sectionEntry = {
      key: sectionKey,
      label: template?.label || sectionKey,
      status: 'rejected',
      reviewedBy: adminId || null,
      reviewedAt: now.toISOString(),
      remarks: newRemarks,
      url: existingSection.url || '',
    };

    if (idx >= 0) approvalSections[idx] = sectionEntry;
    else approvalSections.push(sectionEntry);

    // Activity log
    const activityLogs = [...asArray(profile.activityLogs), {
      action: 'rejected',
      section: sectionKey,
      sectionLabel: template?.label || sectionKey,
      remark: reason,
      adminId: adminId || null,
      adminName,
      timestamp: now.toISOString(),
    }];
    profileData.approvalSections = toJson(approvalSections);
    profileData.activityLogs = toJson(activityLogs);
    await saveProfileReview(targetRole, profile, profileData, userId, userData);

    // NOTE: Email is NOT sent here. Email is sent only when admin explicitly
    // clicks "Send Correction Email" — which collects ALL rejected sections.

    return res.json({ message: `${sectionKey} marked for correction` });
  } catch (err) {
    console.error('[rejectSection]', err.message);
    return res.status(500).json({ message: 'Failed to reject section', error: err.message });
  }
};

// ─── Add Remark ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/profile-reviews/:userId/sections/:sectionKey/remark
 * body: { remark }
 */
const addSectionRemark = async (req, res) => {
  try {
    const { userId, sectionKey } = req.params;
    const { remark = '' } = req.body;
    if (sectionKey === 'phone' || sectionKey === 'email') {
      return res.status(400).json({ message: 'Phone and Email sections cannot have remarks' });
    }
    if (!remark.trim()) return res.status(400).json({ message: 'Remark text is required' });
    if (!isValidId(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const adminId = req.user?._id;
    const adminName = req.user?.name || 'Admin';
    const now = new Date();

    const user = await prisma.user.findUnique({ where: { id: String(userId) }, select: { roles: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const targetRole = getRoleForSection(sectionKey, roles);
    if (!targetRole) return res.status(400).json({ message: 'Section is not available for this user role' });
    const profile = await findProfile(targetRole, userId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const approvalSections = [...asArray(profile.approvalSections)];
    let idx = approvalSections.findIndex(s => s.key === sectionKey);
    if (idx < 0) {
      const template = buildSectionsTemplate(targetRole).find(t => t.key === sectionKey);
      approvalSections.push({
        key: sectionKey,
        label: template?.label || sectionKey,
        status: 'pending',
        remarks: [],
        reviewedBy: null,
        reviewedAt: null,
        url: '',
      });
      idx = approvalSections.length - 1;
    }
    const remarks = [...asArray(approvalSections[idx].remarks), {
      text: remark, adminId: adminId || null, adminName, createdAt: now.toISOString(),
    }];
    approvalSections[idx] = { ...approvalSections[idx], remarks };

    const activityLogs = [...asArray(profile.activityLogs), {
      action: 'remark_added',
      section: sectionKey,
      remark,
      adminId: adminId || null,
      adminName,
      timestamp: now.toISOString(),
    }];
    await updateProfile(targetRole, profile.id, {
      approvalSections: toJson(approvalSections),
      activityLogs: toJson(activityLogs),
    });

    return res.json({ message: 'Remark added' });
  } catch (err) {
    console.error('[addSectionRemark]', err.message);
    return res.status(500).json({ message: 'Failed to add remark', error: err.message });
  }
};

// ─── Send Correction Email ─────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/profile-reviews/:userId/notify
 * body: { sections: [{ key, label, reason }], message? }
 */
const sendCorrectionEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { sections = [], message = '' } = req.body;
    if (!isValidId(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { name: true, email: true, roles: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const rejectedSections = sections.filter(s => s.status === 'rejected' || s.reason);
    const html = buildRejectionEmail(user.name, rejectedSections, message);

    let emailSent = false;
    if (user.email) {
      try {
        await sendMail({
          to: user.email,
          subject: 'Action Required: Please Update Your Profile',
          html,
        });
        emailSent = true;
        console.log(`[sendCorrectionEmail] Email sent to ${user.email}`);
      } catch (mailErr) {
        console.warn(`[sendCorrectionEmail] Email dispatch failed/skipped (${mailErr.message}) - proceeding with system decision log`);
      }
    }

    // Log the notification in profile activity
    const roleList = Array.isArray(user.roles) ? user.roles : [];
    const primaryRole = roleList.includes('recruiter') ? 'recruiter'
      : roleList.includes('partner') ? 'partner' : 'provider';
    const profile = await findProfile(primaryRole, userId);
    if (profile) {
      const activityLogs = [...asArray(profile.activityLogs), {
        action: 'correction_email_sent',
        section: 'all',
        remark: `Review decision sent for: ${sections.map(s => `${s.label || s.key} (${s.status || 'pending'})`).join(', ')}`,
        adminId: req.user?._id || null,
        adminName: req.user?.name || 'Admin',
        timestamp: new Date().toISOString(),
      }];
      await updateProfile(primaryRole, profile.id, { activityLogs: toJson(activityLogs) });
    }

    return res.json({
      message: emailSent ? 'Correction email sent successfully' : 'Review decision saved in candidate profile (SMTP email skipped)',
      emailSent,
    });
  } catch (err) {
    console.error('[sendCorrectionEmail]', err.message);
    return res.status(500).json({ message: 'Failed to process correction email', error: err.message });
  }
};

// ─── Bulk Action ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/profile-reviews/bulk
 * body: { userIds[], action: "approve" | "reject", sectionKey, reason? }
 */
const bulkProfileAction = async (req, res) => {
  try {
    const { userIds = [], action, sectionKey = 'profilePhoto', reason = '' } = req.body;
    if (action === 'reject' && (sectionKey === 'phone' || sectionKey === 'email')) {
      return res.status(400).json({ message: 'Phone and Email sections cannot be rejected' });
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'No users selected' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    const adminId = req.user?._id;
    const adminName = req.user?.name || 'Admin';
    const now = new Date();

    let processed = 0;
    const errors = [];

    for (const uid of userIds) {
      try {
        if (!isValidId(uid)) continue;
        const user = await prisma.user.findUnique({
          where: { id: String(uid) },
          select: { id: true, name: true, email: true, roles: true, profilePhoto: true, profilePhotoApproval: true },
        });
        if (!user) continue;

        const roles = Array.isArray(user.roles) ? user.roles : [];
        const primaryRole = getRoleForSection(sectionKey, roles);
        if (!primaryRole) throw new Error('Section is not available for this user role');
        const profile = await findProfile(primaryRole, uid);
        if (!profile) continue;

        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const template = buildSectionsTemplate(primaryRole).find(t => t.key === sectionKey);
        const profileData = {};
        let userData = null;

        // Update built-in fields
        if (sectionKey === 'profilePhoto') {
          const currentApproval = primaryRole === 'partner'
            ? (user.profilePhotoApproval || {})
            : (profile.profilePhotoApproval || {});
          const nextPhoto = action === 'approve' && currentApproval.pendingUrl
            ? currentApproval.pendingUrl
            : (primaryRole === 'partner' ? user.profilePhoto : profile.profilePhoto) || '';
          const nextApproval = {
            ...currentApproval,
            status: newStatus,
            rejectionReason: action === 'reject' ? reason : '',
            reviewedBy: adminId || null,
            reviewedAt: now.toISOString(),
          };
          userData = { profilePhoto: nextPhoto, profilePhotoApproval: toJson(nextApproval) };
          if (primaryRole !== 'partner') {
            profileData.profilePhoto = nextPhoto;
            profileData.profilePhotoApproval = toJson(nextApproval);
          }
        } else if (sectionKey === 'resume') {
          const currentApproval = profile.resumeApproval || {};
          if (action === 'approve' && currentApproval.pendingUrl) {
            profileData.resumeUrl = currentApproval.pendingUrl;
          }
          profileData.resumeApproval = toJson({
            ...(profile.resumeApproval || {}),
            status: newStatus,
            rejectionReason: action === 'reject' ? reason : '',
            reviewedBy: adminId || null,
            reviewedAt: now.toISOString(),
          });
        }

        // Update sections array
        const approvalSections = [...asArray(profile.approvalSections)];
        const idx = approvalSections.findIndex(s => s.key === sectionKey);
        const existingSection = idx >= 0 ? approvalSections[idx] : {};
        const newRemarks = [...(existingSection.remarks || [])];
        if (action === 'reject' && reason) {
          newRemarks.push({ text: reason, adminId: adminId || null, adminName, createdAt: now.toISOString() });
        }
        const entry = {
          key: sectionKey,
          label: template?.label || sectionKey,
          status: newStatus,
          reviewedBy: adminId || null,
          reviewedAt: now.toISOString(),
          remarks: newRemarks,
          url: existingSection.url || '',
        };
        if (idx >= 0) approvalSections[idx] = entry;
        else approvalSections.push(entry);

        const activityLogs = [...asArray(profile.activityLogs), {
          action: newStatus,
          section: sectionKey,
          sectionLabel: template?.label || sectionKey,
          remark: reason || '',
          adminId: adminId || null,
          adminName,
          timestamp: now.toISOString(),
        }];
        profileData.approvalSections = toJson(approvalSections);
        profileData.activityLogs = toJson(activityLogs);
        await saveProfileReview(primaryRole, profile, profileData, uid, userData);
        processed++;

        // Email on rejection
        if (action === 'reject' && user.email && reason) {
          sendMail({
            to: user.email,
            subject: 'Action Required: Profile Section Needs Update',
            html: buildRejectionEmail(user.name, [{ label: template?.label || sectionKey, reason }]),
          }).catch(() => {});
        }
      } catch (e) {
        errors.push({ userId: uid, error: e.message });
      }
    }

    return res.json({
      message: `Bulk ${action} complete`,
      processed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[bulkProfileAction]', err.message);
    return res.status(500).json({ message: 'Bulk action failed', error: err.message });
  }
};

// ─── Email Template ───────────────────────────────────────────────────────────

const buildRejectionEmail = (name, sections = [], extraMessage = '') => {
  const appName = process.env.APP_NAME || 'ServiceHub';
  const rows = sections.map(s => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
        <strong style="color:#dc2626;">✗ ${s.label || s.key}</strong>
        ${s.reason ? `<br/><span style="color:#6b7280;font-size:13px;">${s.reason}</span>` : ''}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">${appName}</h1>
          <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">Profile Review Notification</p>
        </div>
        <div style="padding:32px 24px;">
          <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hello <strong>${name || 'there'}</strong>,</p>
          <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
            Our team has reviewed your profile and found that the following sections require your attention:
          </p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:8px;overflow:hidden;">
            ${rows}
          </table>
          ${extraMessage ? `<p style="color:#374151;font-size:14px;margin:20px 0 0;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;">${extraMessage}</p>` : ''}
          <p style="color:#6b7280;font-size:14px;margin:24px 0 0;">
            Please log in and update the flagged sections. Once updated, our team will review them again.
          </p>
          <div style="margin-top:28px;">
            <a href="${process.env.FRONTEND_URL || '#'}/profile"
               style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
              Update My Profile →
            </a>
          </div>
        </div>
        <div style="padding:20px 24px;background:#f8fafc;border-top:1px solid #f1f5f9;">
          <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
            © ${new Date().getFullYear()} ${appName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ─── Request Follow-Back Clarification ─────────────────────────────────────────

/**
 * POST /api/v1/admin/profile-reviews/:userId/follow-back
 * body: { question: string, sectionKey?: string }
 */
const requestFollowBack = async (req, res) => {
  try {
    const { userId } = req.params;
    const { question, sectionKey = 'general' } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Question/Clarification text is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { name: true, email: true, roles: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const primaryRole = roles.includes('recruiter') ? 'recruiter'
      : roles.includes('partner') ? 'partner' : 'provider';
    const profile = await findProfile(primaryRole, userId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const adminId = req.user?._id;
    const adminName = req.user?.name || 'Admin';
    const now = new Date();

    const activityLogs = [...asArray(profile.activityLogs), {
      action: 'follow_back_requested',
      section: sectionKey,
      remark: `Follow-back requested by ${adminName}: "${question}"`,
      adminId: adminId || null,
      adminName,
      timestamp: now.toISOString(),
    }];

    const followBackRequest = {
      status: 'pending',
      question,
      sectionKey,
      requestedAt: now.toISOString(),
      requestedBy: adminName,
    };

    const updateData = { activityLogs: toJson(activityLogs) };
    if (primaryRole === 'provider') updateData.followBackRequest = toJson(followBackRequest);
    await updateProfile(primaryRole, profile.id, updateData);

    if (user.email) {
      sendMail({
        to: user.email,
        subject: 'Follow-up Clarification Required for Your Profile Review',
        html: `
          <div style="font-family:sans-serif;padding:24px;background:#f9fafb;border-radius:12px;">
            <h2 style="color:#4f46e5;margin-top:0;">Profile Review Clarification Requested</h2>
            <p>Hello <strong>${user.name || 'Candidate'}</strong>,</p>
            <p>Our review team has a follow-up question regarding your profile section (<strong>${sectionKey}</strong>):</p>
            <blockquote style="background:#eef2ff;padding:14px 18px;border-left:4px solid #6366f1;border-radius:6px;font-weight:bold;color:#312e81;margin:16px 0;">
              "${question}"
            </blockquote>
            <p>Please log in to your profile dashboard to submit your clarification.</p>
          </div>
        `
      }).catch(() => {});
    }

    return res.json({ message: 'Follow-back clarification request sent to candidate', followBackRequest });
  } catch (err) {
    console.error('[requestFollowBack]', err.message);
    return res.status(500).json({ message: 'Failed to request follow-back', error: err.message });
  }
};

/**
 * POST /api/v1/provider/profile/follow-back/respond
 * body: { answer: string, attachmentUrl?: string }
 */
const respondToFollowBack = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { answer, attachmentUrl = '' } = req.body;
    if (!answer || !answer.trim()) return res.status(400).json({ message: 'Answer text is required' });

    const profile = await findProfile('provider', userId);
    if (!profile) return res.status(404).json({ message: 'Provider profile not found' });

    const now = new Date();
    const followBackRequest = {
      ...(profile.followBackRequest || {}),
      status: 'responded',
      answer,
      attachmentUrl,
      respondedAt: now.toISOString(),
    };

    const activityLogs = [...asArray(profile.activityLogs), {
      action: 'follow_back_responded',
      section: followBackRequest.sectionKey || 'general',
      remark: `Candidate responded to follow-back query: "${answer}"`,
      timestamp: now.toISOString(),
    }];

    await updateProfile('provider', profile.id, {
      activityLogs: toJson(activityLogs),
      followBackRequest: toJson(followBackRequest),
    });

    return res.json({ message: 'Response submitted successfully! Admin has been notified.', followBackRequest });
  } catch (err) {
    console.error('[respondToFollowBack]', err.message);
    return res.status(500).json({ message: 'Failed to respond to follow-back query', error: err.message });
  }
};

/**
 * POST /api/v1/provider/profile/resubmit
 * Resubmit profile for admin re-review after fixing rejected sections
 */
const resubmitProfileForReview = async (req, res) => {
  try {
    const userId = req.user?._id;
    const profile = await findProfile('provider', userId);
    if (!profile) return res.status(404).json({ message: 'Provider profile not found' });

    const now = new Date();
    
    const approvalSections = toJson(asArray(profile.approvalSections));
    if (approvalSections.length > 0) {
      approvalSections.forEach(sec => {
        if (sec.status === 'rejected') {
          sec.status = 'pending';
          sec.reviewedAt = null;
        }
      });
    }

    const activityLogs = [...asArray(profile.activityLogs), {
      action: 'candidate_resubmitted',
      section: 'all',
      remark: 'Candidate updated rejected sections and resubmitted profile for re-verification',
      timestamp: now.toISOString(),
    }];

    await updateProfile('provider', profile.id, {
      isApproved: false,
      approvalSections: toJson(approvalSections),
      activityLogs: toJson(activityLogs),
    });

    return res.json({ message: 'Profile resubmitted for verification successfully!' });
  } catch (err) {
    console.error('[resubmitProfileForReview]', err.message);
    return res.status(500).json({ message: 'Failed to resubmit profile', error: err.message });
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getProfileReviewStats,
  getDistinctLocations,
  getProfileReviews,
  getProfileReviewDetail,
  approveSection,
  rejectSection,
  addSectionRemark,
  sendCorrectionEmail,
  bulkProfileAction,
  requestFollowBack,
  respondToFollowBack,
  resubmitProfileForReview,
};
