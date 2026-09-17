const express = require('express');
const router = express.Router();
const {
  searchExternalJobs,
  getExternalJobDetails,
  adminGetExternalJobs,
  adminUpdateExternalJob,
  adminDeleteExternalJob,
  adminRefreshExternalJob,
  adminExportCompaniesCsv
} = require('./externalJob.controller');
const { protectAdmin, authorizeAdmin } = require('../../middleware/adminAuth');

// Public External Job Routes
router.get('/', searchExternalJobs);
router.get('/:id', getExternalJobDetails);

// Admin Protected External Job Routes
router.get('/admin/list', protectAdmin, authorizeAdmin(), adminGetExternalJobs);
router.get('/admin/companies/csv', protectAdmin, authorizeAdmin(), adminExportCompaniesCsv);
router.put('/admin/:id', protectAdmin, authorizeAdmin(), adminUpdateExternalJob);
router.delete('/admin/:id', protectAdmin, authorizeAdmin(), adminDeleteExternalJob);
router.post('/admin/:id/refresh', protectAdmin, authorizeAdmin(), adminRefreshExternalJob);

module.exports = router;
