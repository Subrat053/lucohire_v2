const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { withLegacyId, withLegacyIds } = require('../utils/prismaResponse');

// Get all FAQs
router.get('/', async (req, res) => {
  try {
    const faqs = withLegacyIds(await prisma.faq.findMany({ where: { isActive: true } }));
    res.json(faqs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add FAQ
router.post('/', async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    const faq = withLegacyId(await prisma.faq.create({ data: { question, answer, category } }));
    res.status(201).json(faq);
  } catch (err) {
    res.status(400).json({ message: 'Error creating FAQ', error: err.message });
  }
});

// Update FAQ
router.put('/:id', async (req, res) => {
  try {
    const { question, answer, category, isActive } = req.body;
    const faq = withLegacyId(await prisma.faq.update({
      where: { id: String(req.params.id) }, data: { question, answer, category, isActive },
    }));
    res.json(faq);
  } catch (err) {
    res.status(400).json({ message: 'Error updating FAQ', error: err.message });
  }
});

// Delete FAQ
router.delete('/:id', async (req, res) => {
  try {
    await prisma.faq.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'FAQ deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting FAQ', error: err.message });
  }
});

module.exports = router;
