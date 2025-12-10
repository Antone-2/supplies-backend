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


router.use(jwtAuthMiddleware);
router.use(admin);


router.get('/', getNotifications);


router.get('/count', getNotificationCount);


router.post('/', createNotification);


router.put('/:id/read', markAsRead);


router.put('/read-multiple', markMultipleAsRead);


router.put('/read-all', markAllAsRead);


router.delete('/:id', deleteNotification);


router.delete('/', deleteMultipleNotifications);

export default router;