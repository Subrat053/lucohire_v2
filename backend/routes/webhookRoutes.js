const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { requireOperationalFlags } = require('../middleware/operationalFeatureGate');

router.use(requireOperationalFlags('ENABLE_WEBHOOKS'));

/**
 * DELETE PROFILE WEBHOOK
 * Triggered by users clicking the "delete_link" in bulk outreach emails/messages.
 */
router.get('/delete-profile', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Invalid or missing token.');

    const user = await prisma.user.findFirst({ where: { claimToken: String(token) } });
    if (!user) return res.status(404).send('Profile not found or already deleted.');

    await prisma.recruiterProfile.deleteMany({ where: { user: user.id } });
    await prisma.providerProfile.deleteMany({ where: { user: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Your profile has been completely erased from our system.</h2>
          <p>We respect your privacy. You will not receive any further communications from us.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
