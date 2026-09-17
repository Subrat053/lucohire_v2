const express = require("express");
const router = express.Router();
const { loginAdmin, getAdminMe } = require("../controllers/adminAuthController");
const { protectAdmin } = require("../middleware/adminAuth");

router.post("/login", loginAdmin);
router.get("/me", protectAdmin, getAdminMe);

module.exports = router;
