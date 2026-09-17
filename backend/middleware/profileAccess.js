const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

const normalizeRoles = (user) => {
  const roles = Array.isArray(user.roles) ? [...new Set(user.roles)] : [];
  if (user.role && !roles.includes(user.role)) roles.push(user.role);
  if (user.activeRole && !roles.includes(user.activeRole)) roles.push(user.activeRole);
  return roles;
};

const loadTargetUser = async (req, res, next) => {
  try {
    const targetUser = withLegacyId(await prisma.user.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true,
        role: true,
        roles: true,
        activeRole: true,
        name: true,
        email: true,
        avatar: true,
        profilePhoto: true,
      },
    }));
    if (!targetUser) return res.status(404).json({ message: 'Profile user not found' });

    req.targetUser = targetUser;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const enforceProfileViewAccess = (req, res, next) => {
  const actor = req.user;
  const target = req.targetUser;

  if (!actor || !target) {
    return res.status(500).json({ message: 'Access context missing' });
  }

  if (actor._id.toString() === target._id.toString()) return next();

  const actorRoles = normalizeRoles(actor);
  const targetRoles = normalizeRoles(target);
  const actorActiveRole = actor.activeRole || actor.role;

  if (actorRoles.includes('admin') || actorActiveRole === 'admin') return next();

  // Resolve target profile type being requested
  const reqRole = req.query.role;
  const targetProfileType = (reqRole && targetRoles.includes(reqRole))
    ? reqRole
    : (target.activeRole || target.role || targetRoles[0]);

  // If target profile is a provider profile (private candidate profile)
  if (targetProfileType === 'provider') {
    // Block provider-to-provider same-role view
    if (actorActiveRole === 'provider') {
      return res.status(403).json({ message: 'Access denied for same-role profile view' });
    }
    // Allow recruiter-to-provider cross-role view
    if (actorActiveRole === 'recruiter') {
      return next();
    }
  }

  // If target profile is a recruiter profile (public company profile)
  if (targetProfileType === 'recruiter') {
    // Any authenticated user (provider or recruiter) can view a recruiter profile
    return next();
  }

  return res.status(403).json({ message: 'Access denied' });
};

module.exports = {
  loadTargetUser,
  enforceProfileViewAccess,
};
