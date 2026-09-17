const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

const createEnquiry = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }

    const enquiry = withLegacyId(await prisma.enquiry.create({
      data: { name, email, phone, subject, message },
    }));

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully. We will get back to you soon.',
      data: enquiry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit enquiry. Please try again later.',
      error: error.message
    });
  }
};

const getEnquiries = async (req, res) => {
  try {
    const enquiries = (await prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' },
    })).map(withLegacyId);
    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createEnquiry,
  getEnquiries
};
