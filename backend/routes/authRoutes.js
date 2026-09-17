const express = require("express");
const router = express.Router();
const {
  sendRegistrationOtpHandler,
  verifyRegistrationOtpHandler,
  registerFreelancerProfile,
  registerEmail,
  sendRegistrationEmailOtp,
  confirmRegistrationEmailOtp,
  loginUser,
  googleAuth,
  whatsappSendOtp,
  whatsappVerifyOtp,
  sendEmailVerification,
  confirmEmailVerification,
  updateEmail,
  getMe,
  updateWhatsappNumber,
  updateLocale,
  toggleWhatsappAlerts,
  changePassword,
  forgotPassword,
  resetPassword,
  requestMagicLink,
  verifyMagicLink,
  firebaseOtpLogin,
  updateTimezone,
  switchRole,
  switchPanel,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/switch-role", protect, switchRole);
router.patch("/switch-panel", protect, switchPanel);

// Unified Freelancer Registration & OTP routes
router.post("/register/send-otp", sendRegistrationOtpHandler);
router.post("/register/verify-otp", verifyRegistrationOtpHandler);
router.post("/register/freelancer", registerFreelancerProfile);

router.post("/register", registerEmail);
router.post("/register/email-otp-legacy", sendRegistrationEmailOtp);
router.post("/register/verify-email-otp-legacy", confirmRegistrationEmailOtp);
router.post("/login", loginUser);
router.post("/google", googleAuth);
router.post("/whatsapp/send-otp", whatsappSendOtp);
router.post("/whatsapp/verify-otp", whatsappVerifyOtp);
router.post("/verify-email/send", protect, sendEmailVerification);
router.post("/verify-email/confirm", protect, confirmEmailVerification);
router.put("/update-email", protect, updateEmail);
router.get("/me", protect, getMe);
router.put("/whatsapp-number", protect, updateWhatsappNumber);
router.put("/locale", protect, updateLocale);
router.put("/whatsapp-alerts", protect, toggleWhatsappAlerts);
router.post("/otp-login", firebaseOtpLogin);

// Password & Magic Link Management
router.patch("/change-password", protect, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.post("/magic-link/request", requestMagicLink);
router.post("/magic-link/verify", verifyMagicLink);
router.post("/update-timezone", protect, updateTimezone);

module.exports = router;
