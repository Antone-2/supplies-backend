import express from 'express';
import { getNotifications, markAsRead, createNotification, deleteNotification, seedNotifications, markAllAsRead } from '../controllers/adminNotificationController.js';

const router = express.Router();

router.get('/', getNotifications);
router.post('/', createNotification);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.post('/seed', seedNotifications);

export default router;
