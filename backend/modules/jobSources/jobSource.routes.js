const express = require('express');
const router = express.Router();
const {
  getJobSources,
  createJobSource,
  updateJobSource,
  testJobSource,
  syncJobSource,
  pauseJobSource,
  resumeJobSource
} = require('./jobSource.controller');
const { protectAdmin, authorizeAdmin } = require('../../middleware/adminAuth');

router.use(protectAdmin, authorizeAdmin());

router.get('/', getJobSources);
router.post('/', createJobSource);
router.put('/:id', updateJobSource);
router.post('/:id/test', testJobSource);
router.post('/:id/sync', syncJobSource);
router.post('/:id/pause', pauseJobSource);
router.post('/:id/resume', resumeJobSource);

module.exports = router;
