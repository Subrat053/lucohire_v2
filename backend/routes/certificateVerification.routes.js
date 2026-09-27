const express = require('express');
const router = express.Router();
const { verifyCertificate } = require('../controllers/journeyVerification.controller');

// Public verification routes
router.get('/certificate/:verificationId', verifyCertificate);
router.get('/:verificationId', verifyCertificate);

module.exports = router;
