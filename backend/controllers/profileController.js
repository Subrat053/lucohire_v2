const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');
const { prepareUserData } = require('../services/authPersistenceService');
const {
  createRecruiterProfile,
  findRecruiterProfileByUserId,
  saveRecruiterProfile,
} = require('../services/recruiterCompanyPersistenceService');
const {
  createProviderProfile,
  findProviderProfileByUserId,
  saveProviderProfile,
} = require('../services/providerProfilePersistenceService');
const { calculateReviewStats } = require('../services/reviewService');
const { getCoordinatesFromText, upsertLocationRecord } = require('../services/locationService');

const pickArray = (value) => (Array.isArray(value) ? value : undefined);
const toCoordinate = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
};
const resolveRole = (user, preferredRole) => {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (preferredRole && roles.includes(preferredRole)) return preferredRole;
  return user.activeRole || roles[0] || user.role || null;
};

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  roles: true,
  activeRole: true,
  role: true,
  avatar: true,
  profilePhoto: true,
};

const getProfileByUserId = async (req, res) => {
  try {
    const targetUser = req.targetUser;
    const actorId = req.user._id.toString();
    const isOwner = actorId === targetUser._id.toString();

    let profile = null;
    let profileType = resolveRole(targetUser, req.query.role);

    if (profileType === 'provider') {
      profile = await findProviderProfileByUserId(targetUser._id);
      if (!profile) return res.status(404).json({ message: 'Provider profile not found' });
    } else if (profileType === 'recruiter') {
      profile = await findRecruiterProfileByUserId(targetUser._id);
      if (!profile) return res.status(404).json({ message: 'Recruiter profile not found' });
    } else {
      profileType = 'admin';
      profile = {
        user: targetUser._id,
        city: '',
        description: '',
      };
    }

    const reviews = (await prisma.review.findMany({
      where: { revieweeId: String(targetUser._id) },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        reviewerIdRecord: {
          select: {
            id: true, name: true, roles: true, activeRole: true, role: true,
            avatar: true, profilePhoto: true,
          },
        },
      },
    })).map((record) => {
      const review = withLegacyId(record);
      review.reviewerId = withLegacyId(record.reviewerIdRecord);
      delete review.reviewerIdRecord;
      return review;
    });

    const ratingStats = await calculateReviewStats(targetUser._id);

    res.json({
      profileType,
      isOwner,
      canEdit: isOwner,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        roles: targetUser.roles || [],
        activeRole: targetUser.activeRole || targetUser.role || null,
        role: targetUser.activeRole || targetUser.role || null,
        avatar: targetUser.avatar || targetUser.profilePhoto || '',
      },
      profile: {
        ...profile,
        avgRating:
          profileType === 'provider'
            ? (profile.rating ?? ratingStats.avgRating)
            : (profile.avgRating ?? ratingStats.avgRating),
        totalReviews: profile.totalReviews ?? ratingStats.totalReviews,
      },
      reviews,
      ratingSummary: ratingStats,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const userUpdate = {};
    if (typeof req.body.name === 'string') userUpdate.name = req.body.name.trim();
    if (typeof req.body.avatar === 'string') userUpdate.avatar = req.body.avatar.trim();

    if (Object.keys(userUpdate).length) {
      await prisma.user.update({
        where: { id: String(userId) },
        data: await prepareUserData(userUpdate),
      });
    }

    const actorRole = req.user.activeRole || req.user.role;

    if (actorRole === 'provider') {
      let profile = await findProviderProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: 'Provider profile not found' });

      const nextSkills = pickArray(req.body.skills);
      const nextLanguages = pickArray(req.body.languages);
      const nextPortfolio = pickArray(req.body.portfolioLinks);

      if (nextSkills !== undefined) profile.skills = nextSkills;
      if (typeof req.body.experience === 'string') profile.experience = req.body.experience;
      if (typeof req.body.city === 'string') profile.city = req.body.city.trim();
      if (typeof req.body.state === 'string') profile.state = req.body.state.trim();
      if (typeof req.body.nearestLocation === 'string') profile.nearestLocation = req.body.nearestLocation.trim();
      const nextLat = toCoordinate(req.body.latitude, -90, 90);
      const nextLng = toCoordinate(req.body.longitude, -180, 180);
      if (nextLat !== null && nextLng !== null) {
        profile.latitude = nextLat;
        profile.longitude = nextLng;
        profile.locationUpdatedAt = new Date();
      }

      if (req.body.location && typeof req.body.location === 'object') {
        const loc = req.body.location;
        profile.location = {
          placeId: loc.placeId || '',
          name: loc.name || '',
          formattedAddress: loc.formattedAddress || '',
          city: loc.city || '',
          state: loc.state || '',
          country: loc.country || '',
          postalCode: loc.postalCode || '',
          latitude: Number.isFinite(Number(loc.latitude)) ? Number(loc.latitude) : null,
          longitude: Number.isFinite(Number(loc.longitude)) ? Number(loc.longitude) : null,
          source: loc.source || 'google_places',
        };
        profile.locationData = loc;
        profile.serviceLocationData = loc;
        if (profile.location.city) profile.city = profile.location.city;
        if (profile.location.state) profile.state = profile.location.state;
        if (profile.location.name) profile.nearestLocation = profile.location.name;
        if (profile.location.latitude !== null) profile.latitude = profile.location.latitude;
        if (profile.location.longitude !== null) profile.longitude = profile.location.longitude;
        profile.locationUpdatedAt = new Date();
      }

      if (nextLanguages !== undefined) profile.languages = nextLanguages;
      if (typeof req.body.description === 'string') profile.description = req.body.description;
      if (nextPortfolio !== undefined) profile.portfolioLinks = nextPortfolio;
      if (typeof req.body.pricing === 'string') profile.pricing = req.body.pricing;
      if (typeof req.body.pricingType === 'string') profile.pricingType = req.body.pricingType;


      profile = await saveProviderProfile(profile);
      if (profile.city) {
        let lat = profile.latitude;
        let lon = profile.longitude;

        if (lat === null || lon === null) {
          const geocoded = await getCoordinatesFromText([profile.city, profile.state].filter(Boolean).join(', '));
          if (geocoded) {
            lat = geocoded.lat;
            lon = geocoded.lon;
            profile.latitude = lat;
            profile.longitude = lon;
            profile.locationUpdatedAt = new Date();
            profile = await saveProviderProfile(profile);
          }
        }

        if (lat !== null && lon !== null) {
          await upsertLocationRecord({
            name: profile.nearestLocation || profile.city,
            latitude: lat,
            longitude: lon,
            type: 'provider',
          });
        }
      }
      const user = withLegacyId(await prisma.user.findUnique({
        where: { id: String(userId) },
        select: PUBLIC_USER_SELECT,
      }));
      return res.json({ message: 'Profile updated', profileType: 'provider', user, profile });
    }

    if (actorRole === 'recruiter') {
      let profile = await findRecruiterProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: 'Recruiter profile not found' });

      if (typeof req.body.companyName === 'string') profile.companyName = req.body.companyName;
      if (typeof req.body.companyType === 'string') profile.companyType = req.body.companyType;
      if (typeof req.body.city === 'string') profile.city = req.body.city.trim();
      if (typeof req.body.state === 'string') profile.state = req.body.state.trim();
      if (typeof req.body.nearestLocation === 'string') profile.nearestLocation = req.body.nearestLocation.trim();
      const nextLat = toCoordinate(req.body.latitude, -90, 90);
      const nextLng = toCoordinate(req.body.longitude, -180, 180);
      if (nextLat !== null && nextLng !== null) {
        profile.latitude = nextLat;
        profile.longitude = nextLng;
        profile.locationUpdatedAt = new Date();
      }


      if (req.body.location && typeof req.body.location === 'object') {
        const loc = req.body.location;
        profile.location = {
          placeId: loc.placeId || '',
          name: loc.name || '',
          formattedAddress: loc.formattedAddress || '',
          city: loc.city || '',
          state: loc.state || '',
          country: loc.country || '',
          postalCode: loc.postalCode || '',
          latitude: Number.isFinite(Number(loc.latitude)) ? Number(loc.latitude) : null,
          longitude: Number.isFinite(Number(loc.longitude)) ? Number(loc.longitude) : null,
          source: loc.source || 'google_places',
        };
        profile.locationData = loc;
        if (profile.location.city) profile.city = profile.location.city;
        if (profile.location.state) profile.state = profile.location.state;
        if (profile.location.name) profile.nearestLocation = profile.location.name;
        if (profile.location.latitude !== null) profile.latitude = profile.location.latitude;
        if (profile.location.longitude !== null) profile.longitude = profile.location.longitude;
        profile.locationUpdatedAt = new Date();
      }

      if (typeof req.body.description === 'string') profile.description = req.body.description;
      const nextSkillsNeeded = pickArray(req.body.skillsNeeded);
      if (nextSkillsNeeded !== undefined) profile.skillsNeeded = nextSkillsNeeded;

      profile = await saveRecruiterProfile(profile);
      if (profile.city) {
        let lat = profile.latitude;
        let lon = profile.longitude;

        if (lat === null || lon === null) {
          const geocoded = await getCoordinatesFromText([profile.city, profile.state].filter(Boolean).join(', '));
          if (geocoded) {
            lat = geocoded.lat;
            lon = geocoded.lon;
            profile.latitude = lat;
            profile.longitude = lon;
            profile.locationUpdatedAt = new Date();
            profile = await saveRecruiterProfile(profile);
          }
        }

        if (lat !== null && lon !== null) {
          await upsertLocationRecord({
            name: profile.nearestLocation || profile.city,
            latitude: lat,
            longitude: lon,
            type: 'recruiter',
          });
        }
      }
      const user = withLegacyId(await prisma.user.findUnique({
        where: { id: String(userId) },
        select: PUBLIC_USER_SELECT,
      }));
      return res.json({ message: 'Profile updated', profileType: 'recruiter', user, profile });
    }

    // Admin account fallback
    const user = withLegacyId(await prisma.user.findUnique({
      where: { id: String(userId) },
      select: PUBLIC_USER_SELECT,
    }));
    res.json({ message: 'Profile updated', profileType: 'admin', user, profile: null });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const { assignFreePlan } = require('./subscriptionController');

const getProfileStatus = async (req, res) => {
  try {
    const user = withLegacyId(await prisma.user.findUnique({
      where: { id: String(req.user._id) },
    }));
    const providerProfile = await findProviderProfileByUserId(req.user._id);
    const recruiterProfile = await findRecruiterProfileByUserId(req.user._id);

    res.json({
      hasProviderProfile: !!providerProfile,
      hasRecruiterProfile: !!recruiterProfile,
      roles: user.roles || [],
      activeRole: user.activeRole,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const completeRoleProfile = async (req, res) => {
  try {
    const { role, profileData } = req.body;
    if (!['provider', 'recruiter'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const userId = req.user._id;
    let user = withLegacyId(await prisma.user.findUnique({
      where: { id: String(userId) },
    }));

    let profile;
    if (role === 'provider') {
      profile = await findProviderProfileByUserId(userId);
      if (!profile) {
        profile = await createProviderProfile({
          user: userId,
          ...profileData,
          profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
        user.providerProfileId = profile._id;
        if (!user.roles.includes('provider')) user.roles.push('provider');
        await assignFreePlan(userId, 'provider');
      }
    } else {
      profile = await findRecruiterProfileByUserId(userId);
      if (!profile) {
        profile = await createRecruiterProfile({
          user: userId,
          ...profileData,
          profileExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
        user.recruiterProfileId = profile._id;
        if (!user.roles.includes('recruiter')) user.roles.push('recruiter');
        await assignFreePlan(userId, 'recruiter');
      }
    }

    const generateToken = require('../utils/generateToken');
    user.activeRole = role;
    user.activePanel = role;
    user.panelAccess = user.panelAccess || {
      provider: { enabled: true, source: 'none' },
      recruiter: { enabled: true, source: 'none' },
    };
    if (role === 'provider') user.panelAccess.provider.enabled = true;
    if (role === 'recruiter') user.panelAccess.recruiter.enabled = true;

    user = withLegacyId(await prisma.user.update({
      where: { id: String(userId) },
      data: await prepareUserData(user),
    }));

    res.json({
      success: true,
      message: `${role} profile completed`,
      user: {
        _id: user._id,
        roles: user.roles,
        activeRole: user.activeRole,
      },
      token: generateToken(user._id, role),
      redirectPath: role === 'provider' ? '/provider/dashboard' : '/recruiter/dashboard',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getProfileByUserId,
  updateMyProfile,
  getProfileStatus,
  completeRoleProfile,
};
