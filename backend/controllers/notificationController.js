const {
  countNotifications,
  deleteNotificationRecord,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} = require('../services/communicationPersistenceService');

// @desc    Get my notifications
// @route   GET /api/notifications
const getMyNotifications = async (req, res) => {
  try {
    const result = await listNotifications({
      userId: req.user._id, page: req.query.page, limit: req.query.limit,
    });

    res.json({
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      pagination: { page: result.page, limit: result.limit, total: result.total, pages: Math.ceil(result.total / result.limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const notification = await markNotificationRead(req.params.id, req.user._id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    const unreadCount = await countNotifications({ userId: String(req.user._id), isRead: false });
    res.json({ notification, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await markAllNotificationsRead(req.user._id);
    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const deleted = await deleteNotificationRecord(req.params.id, req.user._id);

    if (!deleted) return res.status(404).json({ message: 'Notification not found' });

    const unreadCount = await countNotifications({ userId: String(req.user._id), isRead: false });
    res.json({ message: 'Notification deleted', unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };
