const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getWallet,
  sendOtpForPayout,
  savePayoutMethod,
  setDefaultPayoutMethod,
  deletePayoutMethod,
  requestWithdrawal,
  uploadQrCode,
  initiatePhoneChange,
  verifyOldPhoneOTP,
  verifyNewPhoneOTP,
  raiseConcernLostPhone
} = require('../controllers/providerWalletController');

// All routes here are restricted to service providers
router.use(protect);
router.use(authorize('provider'));

router.get('/', getWallet);
router.post('/payout-methods/send-otp', sendOtpForPayout);
router.post('/payout-methods', savePayoutMethod);
router.post('/payout-methods/upload-qr', upload.single('qrCode'), uploadQrCode);
router.put('/payout-methods/:id/default', setDefaultPayoutMethod);
router.delete('/payout-methods/:id', deletePayoutMethod);
router.post('/withdraw', requestWithdrawal);

// Phone change two-step verification routes
router.post('/phone-change/initiate', initiatePhoneChange);
router.post('/phone-change/verify-old', verifyOldPhoneOTP);
router.post('/phone-change/verify-new', verifyNewPhoneOTP);
router.post('/phone-change/raise-concern', raiseConcernLostPhone);

module.exports = router;
