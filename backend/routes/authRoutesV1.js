const express = require("express");
const router = express.Router();
const {
  googleLoginV1,
  phoneLoginV1,
  registerEmailV1,
  verifyEmailOtpV1,
  loginEmailV1,
  getMeV1,
  logFirebaseOtpAttempt,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/google-login", googleLoginV1);
router.post("/phone-login", phoneLoginV1);
router.post("/register-email", registerEmailV1);
router.post("/verify-email-otp", verifyEmailOtpV1);
router.post("/login-email", loginEmailV1);
router.post("/login", loginEmailV1);
router.post("/log-firebase-otp", logFirebaseOtpAttempt);
router.get("/me", protect, getMeV1);

module.exports = router;
