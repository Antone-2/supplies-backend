import express from 'express';
import jwtAuthMiddleware from '../middleware/jwtAuthMiddleware.js';
import admin from '../middleware/admin.js';
import {
    getNotifications,
    getNotificationCount,
    createNotification,
    markAsRead,
    markMultipleAsRead,
    deleteNotification,
    deleteMultipleNotifications,
    markAllAsRead
} from '../modules/notification/notification.controller.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(jwtAuthMiddleware);
router.use(admin);

// Get notifications with pagination and filtering
router.get('/', getNotifications);

// Get notification count for header
router.get('/count', getNotificationCount);

// Create new notification
router.post('/', createNotification);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Mark multiple notifications as read
router.put('/read-multiple', markMultipleAsRead);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

// Delete multiple notifications
router.delete('/', deleteMultipleNotifications);

export default router;
