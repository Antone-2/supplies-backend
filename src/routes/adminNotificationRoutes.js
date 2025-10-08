const express = require('express');
const router = express.Router();
const adminNotificationController = require('../controllers/adminNotificationController');

router.get('/', adminNotificationController.getNotifications);
router.post('/', adminNotificationController.createNotification);
router.put('/:id/read', adminNotificationController.markAsRead);
router.delete('/:id', adminNotificationController.deleteNotification);

module.exports = router;