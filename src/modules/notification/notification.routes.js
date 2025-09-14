const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');

// Import auth middleware
const auth = require('../../middleware/auth');

// All notification routes require authentication
router.use(auth);

// Get all notifications for authenticated user
router.get('/', notificationController.getUserNotifications);

// Get notification statistics
router.get('/stats', notificationController.getNotificationStats);

// Get single notification
router.get('/:id', notificationController.getNotification);

// Create notification (for self or admin)
router.post('/', notificationController.createNotification);

// Send bulk notifications (admin only - would need admin middleware)
router.post('/bulk', notificationController.sendBulkNotification);

// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Delete all read notifications
router.delete('/read/delete-all', notificationController.deleteReadNotifications);

module.exports = router;
