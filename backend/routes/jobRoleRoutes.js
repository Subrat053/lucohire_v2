const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { withMetadataId, withMetadataIds } = require('../services/jobPersistenceService');
const { protectAdmin } = require('../middleware/adminAuth');

// @route   GET /api/job-roles
// @desc    Get all active job roles
// @access  Public
router.get('/', async (req, res) => {
  try {
    const roles = await prisma.jobRole.findMany({
      where: { isActive: true },
      orderBy: { roleName: 'asc' },
    });
    res.json(withMetadataIds(roles));
  } catch (error) {
    console.error('Error fetching job roles:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/job-roles/all
// @desc    Get all job roles (including inactive)
// @access  Admin
router.get('/all', protectAdmin, async (req, res) => {
  try {
    const roles = await prisma.jobRole.findMany({ orderBy: { roleName: 'asc' } });
    res.json(withMetadataIds(roles));
  } catch (error) {
    console.error('Error fetching all job roles:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/job-roles
// @desc    Create a new job role
// @access  Admin
router.post('/', protectAdmin, async (req, res) => {
  try {
    const { roleName } = req.body;
    
    if (!roleName) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const normalizedRoleName = String(roleName).trim();
    const roleExists = await prisma.jobRole.findFirst({
      where: { roleName: { equals: normalizedRoleName, mode: 'insensitive' } },
    });
    if (roleExists) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const newRole = await prisma.jobRole.create({ data: { roleName: normalizedRoleName } });
    res.status(201).json(withMetadataId(newRole));
  } catch (error) {
    console.error('Error creating job role:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   DELETE /api/job-roles/:id
// @desc    Delete a job role
// @access  Admin
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const role = await prisma.jobRole.findUnique({ where: { id: String(req.params.id) } });
    if (!role) {
      return res.status(404).json({ message: 'Job role not found' });
    }
    
    await prisma.jobRole.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Job role removed' });
  } catch (error) {
    console.error('Error deleting job role:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
