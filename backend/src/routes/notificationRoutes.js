const express = require('express');
const { authenticate } = require('../middlewares/auth');
const {
  listMyNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/me', authenticate, listMyNotificationsController);
router.patch('/me/read-all', authenticate, markAllNotificationsReadController);
router.patch('/me/:id/read', authenticate, markNotificationReadController);

module.exports = router;