const jwt = require("jsonwebtoken");

const generateAdminToken = (adminId) => {
  return jwt.sign({ adminId, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

module.exports = generateAdminToken;
