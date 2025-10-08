// Notification routes for user notifications
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    cleanupOldNotifications
} = require('../services/notificationService');

// Get user notifications
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const userId = req.user.id;

        const result = await getUserNotifications(
            userId,
            parseInt(page),
            parseInt(limit),
            unreadOnly === 'true'
        );

        if (!result) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications'
            });
        }

        res.json({
            success: true,
            data: result.notifications,
            pagination: result.pagination,
            unreadCount: result.unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await getUserNotifications(userId, 1, 1, true);

        res.json({
            success: true,
            count: result ? result.unreadCount : 0
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count'
        });
    }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const notification = await markAsRead(id, userId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await markAllAsRead(userId);

        res.json({
            success: true,
            message: `${count} notifications marked as read`,
            count
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Admin: Cleanup old notifications
router.delete('/cleanup', auth, async (req, res) => {
    try {
        // Check if user is admin (you'll need to implement role checking)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const count = await cleanupOldNotifications();

        res.json({
            success: true,
            message: `${count} old notifications cleaned up`,
            count
        });
    } catch (error) {
        console.error('Cleanup notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup notifications'
        });
    }
});

module.exports = router;