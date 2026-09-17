const express = require('express');
const router = express.Router();
const {
  createTicket,
  getManagerTickets,
  getAdminTickets,
  resolveTicket
} = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/auth');

// User routes
router.post('/', protect, createTicket);

// Manager / Partner routes
router.get('/manager', protect, authorize('partner', 'manager', 'admin'), getManagerTickets);
router.put('/manager/:id/resolve', protect, authorize('partner', 'manager', 'admin'), resolveTicket);

// Admin routes
router.get('/admin', protect, authorize('admin'), getAdminTickets);
router.put('/admin/:id/resolve', protect, authorize('admin'), resolveTicket);

module.exports = router;
