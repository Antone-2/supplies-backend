import express from 'express';
import { getNotifications, markAsRead, createNotification, deleteNotification } from '../controllers/adminNotificationController.js';

const router = express.Router();

router.get('/', getNotifications);
router.post('/', createNotification);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
