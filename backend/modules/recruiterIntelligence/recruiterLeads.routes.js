const express = require('express');
const router = express.Router();
const {
  getRecruiterLeads,
  getManualOutreachLeads,
  updateRecruiterLead,
  deleteRecruiterLead,
  exportRecruiterLeads,
  uploadRecruiterLeadsCsv,
  scrapeManualLeads
} = require('./recruiterLeads.controller');
const { protectAdmin, authorizeAdmin } = require('../../middleware/adminAuth');
const upload = require('../../middleware/upload');

router.use(protectAdmin, authorizeAdmin());

router.get('/', getRecruiterLeads);
router.post('/scrape-manual', scrapeManualLeads);
router.post('/upload-csv', upload.single('file'), uploadRecruiterLeadsCsv);
router.get('/manual', getManualOutreachLeads);
router.put('/:id', updateRecruiterLead);
router.delete('/:id', deleteRecruiterLead);
router.get('/export/csv', exportRecruiterLeads);

module.exports = router;
