const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const refundController = require('../controllers/refundController');
const prisma = require('../config/prisma');

// Provider / User Routes
router.post('/request', protect, refundController.requestRefund);
router.get('/my', protect, refundController.getMyRefunds);

// Admin Routes
router.get('/admin', protect, authorize('admin', 'manager'), refundController.getAdminRefunds);
router.put('/admin/:id', protect, authorize('admin', 'manager'), refundController.processRefund);

// Temp route to fix DB
router.get('/fix-db', async (req, res) => {
  const requests = await prisma.refundRequest.findMany();
  for (const request of requests) {
    const sub = await prisma.providerSubscription.findUnique({ where: { id: request.subscriptionId } });
    if (sub) {
      const totalCredits = sub.maxJobApplications || sub.customLimits?.maxJobApplications || sub.planSnapshot?.maxJobApplications || 0;
      await prisma.refundRequest.update({ where: { id: request.id }, data: { totalCredits } });
    }
  }
  res.send('Fixed ' + requests.length + ' refunds');
});

module.exports = router;
