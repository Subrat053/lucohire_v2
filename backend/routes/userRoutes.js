const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { updateLanguagePreference, eraseAccountData } = require('../controllers/authController');

router.put('/language', protect, updateLanguagePreference);
router.delete('/profile/erase', protect, eraseAccountData);

module.exports = router;
