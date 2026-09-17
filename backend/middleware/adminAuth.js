const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { withLegacyId } = require("../utils/prismaResponse");

const protectAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.adminId || decoded.id;
    
    if (!id) {
      console.warn("[ADMIN AUTH] No ID in token payload");
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }

    // Check User collection first (Unified flow)
    let admin = withLegacyId(await prisma.user.findUnique({
      where: { id: String(id) },
      select: {
        id: true,
        roles: true,
        activeRole: true,
        role: true,
        panelAccess: true,
        isBlocked: true,
        status: true,
        email: true,
        name: true,
        phone: true,
        whatsappNumber: true,
        authProvider: true,
        approvalStatus: true,
        roleIntent: true,
        activePanel: true,
        country: true,
        currency: true,
        locale: true,
        preferredLanguage: true,
        avatar: true,
        termsAccepted: true,
        profilePhoto: true,
        profilePhotoApproval: true,
        isActive: true,
      },
    }));
    
    // Fallback to legacy Admin collection
    if (!admin) {
      admin = withLegacyId(await prisma.admin.findUnique({
        where: { id: String(id) },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      }));
    }

    if (!admin) {
      console.warn(`[ADMIN AUTH] Admin/User not found for ID: ${id}`);
      return res.status(401).json({ message: "Admin not found" });
    }

    // Robust role check (support activeRole, roles array, and legacy role string)
    const roles = Array.isArray(admin.roles) ? admin.roles : [];
    const activeRole = admin.activeRole || admin.role;
    
    const isAdmin = roles.includes("admin") || activeRole === "admin";
    const isManager = roles.includes("manager") || activeRole === "manager";
    const isAdminLike = isAdmin || isManager;

    if (!isAdminLike) {
      console.warn(`[ADMIN AUTH] Access denied for user ${admin.email}. Roles: ${roles.join(",")}, ActiveRole: ${activeRole}`);
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    if (admin.isActive === false || admin.status === "blocked") {
      console.warn(`[ADMIN AUTH] Account disabled/blocked for user ${admin.email}`);
      return res.status(403).json({ message: "Admin account disabled or blocked" });
    }

    // Set both for compatibility across different controller versions
    req.admin = admin;
    req.user = admin; 
    next();
  } catch (error) {
    console.error("[ADMIN AUTH] JWT Verification Error:", error.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

const authorizeAdmin = () => (req, res, next) => {
  const admin = req.admin || req.user;
  if (!admin) {
    console.warn("[ADMIN AUTH] AuthorizeAdmin failed: No admin object in request");
    return res.status(403).json({ message: "Admin authorization required" });
  }

  const roles = Array.isArray(admin.roles) ? admin.roles : [];
  const activeRole = admin.activeRole || admin.role;
  const isAdminLike = roles.includes("admin") || roles.includes("manager") || activeRole === "admin" || activeRole === "manager";

  if (!isAdminLike) {
    console.warn(`[ADMIN AUTH] AuthorizeAdmin access denied for ${admin.email}`);
    return res.status(403).json({ message: "Admin role required" });
  }
  next();
};

module.exports = { protectAdmin, authorizeAdmin };
