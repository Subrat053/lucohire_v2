const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const generateAdminToken = require("../utils/generateAdminToken");
const { withLegacyId } = require("../utils/prismaResponse");

const buildAdminAuthResponse = (admin) => {
  const token = generateAdminToken(admin._id);
  return {
    success: true,
    data: {
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      },
    },
  };
};

// @desc    Admin login
// @route   POST /api/v1/admin/login
const loginAdmin = async (req, res) => {
  try {
    console.log("[ADMIN LOGIN]", req.body?.email);
    const { email, password } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }

    let admin = withLegacyId(await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    }));
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (admin.isActive === false) {
      return res
        .status(403)
        .json({ success: false, message: "Admin account disabled" });
    }

    const isMatch = Boolean(admin.password) && await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    admin = withLegacyId(await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    }));

    return res.json(buildAdminAuthResponse(admin));
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

// @desc    Admin session
// @route   GET /api/v1/admin/me
const getAdminMe = async (req, res) => {
  if (!req.admin) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  return res.json({
    success: true,
    data: {
      admin: {
        _id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: "admin",
      },
    },
  });
};

module.exports = { loginAdmin, getAdminMe };
