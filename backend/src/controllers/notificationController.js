const { asyncHandler } = require('../utils/asyncHandler');
const { listUserNotifications, markAllNotificationsRead, markNotificationRead } = require('../services/notificationService');

const listMyNotificationsController = asyncHandler(async (req, res) => {
  const result = await listUserNotifications(req.user.id, req.query);
  res.json(result);
});

const markNotificationReadController = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(req.user.id, Number(req.params.id));
  res.json({ notification, message: 'Notification marquée comme lue.' });
});

const markAllNotificationsReadController = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsRead(req.user.id);
  res.json({ ...result, message: 'Notifications marquées comme lues.' });
});

module.exports = {
  listMyNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController
};