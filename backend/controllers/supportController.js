const prisma = require('../config/prisma');
const { withLegacyId } = require('../utils/prismaResponse');

const mapTicket = (row) => {
  if (!row) return row;
  const mapped = withLegacyId(row);
  if (row.userRecord !== undefined) mapped.user = withLegacyId(row.userRecord);
  delete mapped.userRecord;
  return mapped;
};

// @desc    Create a new support ticket
// @route   POST /api/v1/support
// @access  Private
exports.createTicket = async (req, res) => {
  try {
    const { type, message } = req.body;
    
    if (!type || !message) {
      return res.status(400).json({ success: false, message: 'Type and message are required' });
    }

    const ticket = withLegacyId(await prisma.supportTicket.create({ data: {
      user: String(req.user.id || req.user._id),
      type,
      message
    } }));

    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get support tickets for Manager (profile and job types)
// @route   GET /api/v1/support/manager
// @access  Private/Manager
exports.getManagerTickets = async (req, res) => {
  try {
    const tickets = (await prisma.supportTicket.findMany({
      where: { type: { in: ['profile', 'job'] } },
      include: { userRecord: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    })).map(mapTicket);

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get support tickets for Admin (payment type)
// @route   GET /api/v1/support/admin
// @access  Private/Admin
exports.getAdminTickets = async (req, res) => {
  try {
    const tickets = (await prisma.supportTicket.findMany({
      where: { type: 'payment' },
      include: { userRecord: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    })).map(mapTicket);

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resolve a support ticket
// @route   PUT /api/v1/support/:id/resolve
// @access  Private/(Manager or Admin)
exports.resolveTicket = async (req, res) => {
  try {
    let ticket = withLegacyId(await prisma.supportTicket.findUnique({ where: { id: String(req.params.id) } }));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Role check logic
    if (req.user.role === 'admin' && ticket.type !== 'payment') {
      return res.status(403).json({ success: false, message: 'Not authorized to resolve this ticket type' });
    }
    if ((req.user.role === 'manager' || req.user.role === 'partner') && (ticket.type !== 'profile' && ticket.type !== 'job')) {
      return res.status(403).json({ success: false, message: 'Not authorized to resolve this ticket type' });
    }

    ticket = withLegacyId(await prisma.supportTicket.update({
      where: { id: ticket._id }, data: { status: 'resolved' },
    }));

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
